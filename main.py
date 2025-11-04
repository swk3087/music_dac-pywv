"""
Music Streaming DAC - pywebview Application
"""

from __future__ import annotations

import json
import platform
import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional

import webview

import config
from ai_manager import AIManager
from spotify_manager import SpotifyManager

WEB_ROOT = Path(__file__).parent / "web"


@dataclass
class Screen:
    name: str
    url: str


class MusicDACApp:
    """애플리케이션의 백엔드 컨트롤러"""

    def __init__(self) -> None:
        self.spotify = SpotifyManager()
        self.ai = AIManager()
        self.window: Optional[webview.Window] = None
        self.screens: Dict[str, Screen] = self._discover_screens()
        self.api = MusicDACApi(self)

    def run(self) -> None:
        """pywebview 애플리케이션 실행"""
        if not self.screens:
            raise RuntimeError("No screens were discovered under the web directory.")

        self._ensure_gui_backend()

        home_screen = self.screens.get("home")
        if not home_screen:
            home_screen = next(iter(self.screens.values()))

        width = config.SCREEN_WIDTH or 800
        height = config.SCREEN_HEIGHT or 480

        self.window = webview.create_window(
            "Music Streaming DAC",
            url=home_screen.url,
            width=width,
            height=height,
            js_api=self.api,
            background_color="#101218",
            resizable=True,
        )

        print("\nApplication is running!")
        print("Press Ctrl+C to quit\n")

        try:
            webview.start(http_server=True, debug=config.DEBUG_MODE, gui=self._default_gui())
        except webview.errors.WebViewException as exc:
            print(
                "\n⚠️  Unable to initialise a GUI backend for pywebview.\n"
                "    On Linux/ARM64 install GTK bindings with:\n"
                "      sudo apt install python3-gi gir1.2-gtk-3.0 gir1.2-webkit2-4.0\n"
                "    Then re-run the application.\n"
            )
            raise

    def load_screen(self, screen_name: str) -> bool:
        """요청된 화면으로 전환"""
        if not self.window:
            return False

        screen = self.screens.get(screen_name.lower())
        if screen:
            self.window.load_url(screen.url)
            return True

        print(f"⚠️  Screen '{screen_name}' not found.")
        return False

    def _discover_screens(self) -> Dict[str, Screen]:
        """web 디렉터리에서 화면 경로 수집"""
        screens: Dict[str, Screen] = {}
        if not WEB_ROOT.exists():
            return screens

        for path in WEB_ROOT.iterdir():
            if not path.is_dir():
                continue

            html_dir = path / "html"
            index_file = html_dir / "index.html"
            if index_file.exists():
                relative_url = str(Path("web") / path.name / "html" / "index.html")
                screens[path.name.lower()] = Screen(name=path.name, url=relative_url)

        return screens

    @staticmethod
    def _default_gui() -> Optional[str]:
        if platform.system() == "Linux":
            return "gtk"
        return None

    @staticmethod
    def _ensure_gui_backend() -> None:
        if platform.system() != "Linux":
            return

        try:
            import gi  # type: ignore
            gi.require_version("Gtk", "3.0")
            gi.require_version("WebKit2", "4.0")
            from gi.repository import Gtk, WebKit2  # noqa: F401
        except ValueError:
            # Try newer WebKit2 ABI (Ubuntu 24.04+)
            try:
                import gi  # type: ignore
                gi.require_version("Gtk", "3.0")
                gi.require_version("WebKit2", "4.1")
                from gi.repository import Gtk, WebKit2  # noqa: F401
            except Exception as exc:  # pragma: no cover - env specific
                raise RuntimeError(
                    "GTK/WebKit2 bindings for Python are required. Install them with:\n"
                    "  sudo apt update && sudo apt install python3-gi gir1.2-gtk-3.0 "
                    "libwebkit2gtk-4.1-0 gir1.2-webkit2-4.1\n"
                    "If 4.1 packages are unavailable, use the 4.0 variants instead."
                ) from exc
        except ModuleNotFoundError as exc:
            raise RuntimeError(
                "GTK bindings for Python are required. Install them with:\n"
                "  sudo apt update && sudo apt install python3-gi gir1.2-gtk-3.0 "
                "libwebkit2gtk-4.1-0 gir1.2-webkit2-4.1\n"
                "If 4.1 packages are unavailable, use the 4.0 variants instead."
            ) from exc


class MusicDACApi:
    """JavaScript에서 호출 가능한 API"""

    def __init__(self, app: MusicDACApp) -> None:
        self.app = app

    # Navigation -------------------------------------------------------------
    def list_screens(self) -> List[Dict[str, Any]]:
        return [
            {"name": screen.name, "id": screen_id, "url": screen.url}
            for screen_id, screen in self.app.screens.items()
        ]

    def navigate(self, screen: str) -> Dict[str, Any]:
        success = self.app.load_screen(screen)
        return {"success": success, "screen": screen}

    # Spotify ----------------------------------------------------------------
    def search_tracks(self, query: str) -> Dict[str, Any]:
        results = self.app.spotify.search(query, search_type="track", limit=config.MAX_SEARCH_RESULTS)
        tracks: List[Dict[str, Any]] = []

        if results and results.get("tracks"):
            for item in results["tracks"].get("items", []):
                serialized = self._serialize_track(item)
                if serialized:
                    tracks.append(serialized)

        return {"query": query, "tracks": tracks}

    def play_track(self, uri: str) -> Dict[str, Any]:
        success = self.app.spotify.play_track(uri)
        return {"success": success}

    def play_tracks(self, uris: List[str]) -> Dict[str, Any]:
        success = self.app.spotify.play_tracks(uris)
        return {"success": success, "count": len(uris)}

    def pause(self) -> Dict[str, Any]:
        return {"success": self.app.spotify.pause()}

    def resume(self) -> Dict[str, Any]:
        return {"success": self.app.spotify.resume()}

    def next_track(self) -> Dict[str, Any]:
        return {"success": self.app.spotify.next_track()}

    def previous_track(self) -> Dict[str, Any]:
        return {"success": self.app.spotify.previous_track()}

    def seek(self, position_ms: int) -> Dict[str, Any]:
        return {"success": self.app.spotify.seek_to_position(position_ms)}

    def set_volume(self, volume: int) -> Dict[str, Any]:
        return {"success": self.app.spotify.set_volume(volume), "volume": volume}

    def get_playback(self) -> Dict[str, Any]:
        playback = self.app.spotify.get_current_playback() or {}
        return {"playback": playback}

    def get_playlists(self) -> Dict[str, Any]:
        items = [self._serialize_playlist(item) for item in self.app.spotify.get_user_playlists(limit=config.MAX_PLAYLISTS)]
        return {"playlists": items}

    def get_playlist_tracks(self, playlist_id: str) -> Dict[str, Any]:
        items = self.app.spotify.get_playlist_tracks(playlist_id)
        tracks = [self._serialize_track(item.get("track")) for item in items if item.get("track")]
        return {"tracks": [t for t in tracks if t]}

    def get_saved_albums(self) -> Dict[str, Any]:
        albums = []
        for item in self.app.spotify.get_saved_albums(limit=config.MAX_TRACKS):
            album = item.get("album")
            if album:
                albums.append(self._serialize_album(album))
        return {"albums": albums}

    def get_album_tracks(self, album_id: str) -> Dict[str, Any]:
        tracks = [
            self._serialize_track(track)
            for track in self.app.spotify.get_album_tracks(album_id)
        ]
        return {"tracks": [t for t in tracks if t]}

    def get_followed_artists(self) -> Dict[str, Any]:
        artists = [
            self._serialize_artist(artist)
            for artist in self.app.spotify.get_followed_artists(limit=config.MAX_TRACKS)
        ]
        return {"artists": [a for a in artists if a]}

    def get_artist_top_tracks(self, artist_id: str) -> Dict[str, Any]:
        tracks = [
            self._serialize_track(track)
            for track in self.app.spotify.get_artist_top_tracks(artist_id)
        ]
        return {"tracks": [t for t in tracks if t]}

    # AI ---------------------------------------------------------------------
    def ai_suggestions(self, query: str) -> Dict[str, Any]:
        suggestions = self.app.ai.generate_music_suggestions(query)
        return {"query": query, "suggestions": suggestions}

    def ai_playlist_description(self, name: str, tracks_json: str) -> Dict[str, Any]:
        try:
            tracks = json.loads(tracks_json)
        except json.JSONDecodeError:
            tracks = []
        description = self.app.ai.generate_playlist_description(name, tracks)
        return {"playlist": name, "description": description}

    def ai_analyze_mood(self, track_name: str, artist_name: str) -> Dict[str, Any]:
        result = self.app.ai.analyze_mood(track_name, artist_name)
        return {"analysis": result}

    # Helpers ----------------------------------------------------------------
    @staticmethod
    def _serialize_track(track: Optional[Dict[str, Any]]) -> Optional[Dict[str, Any]]:
        if not track:
            return None

        artists = ", ".join(artist.get("name", "Unknown") for artist in track.get("artists", []))
        duration_ms = track.get("duration_ms", 0)
        return {
            "id": track.get("id"),
            "name": track.get("name"),
            "uri": track.get("uri"),
            "artists": artists,
            "album": (track.get("album") or {}).get("name"),
            "duration_ms": duration_ms,
            "duration": MusicDACApi._format_duration(duration_ms),
            "image": MusicDACApi._select_image((track.get("album") or {}).get("images")),
        }

    @staticmethod
    def _serialize_playlist(item: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": item.get("id"),
            "name": item.get("name"),
            "description": item.get("description"),
            "tracks_total": item.get("tracks", {}).get("total"),
            "image": MusicDACApi._select_image(item.get("images")),
        }

    @staticmethod
    def _serialize_album(album: Dict[str, Any]) -> Dict[str, Any]:
        artists = ", ".join(artist.get("name", "Unknown") for artist in album.get("artists", []))
        return {
            "id": album.get("id"),
            "name": album.get("name"),
            "artists": artists,
            "release_date": album.get("release_date"),
            "image": MusicDACApi._select_image(album.get("images")),
        }

    @staticmethod
    def _serialize_artist(artist: Dict[str, Any]) -> Dict[str, Any]:
        return {
            "id": artist.get("id"),
            "name": artist.get("name"),
            "genres": artist.get("genres", []),
            "followers": artist.get("followers", {}).get("total"),
            "image": MusicDACApi._select_image(artist.get("images")),
        }

    @staticmethod
    def _select_image(images: Optional[List[Dict[str, Any]]]) -> Optional[str]:
        if not images:
            return None
        best = sorted(images, key=lambda i: i.get("width", 0))[-1]
        return best.get("url")

    @staticmethod
    def _format_duration(duration_ms: int) -> str:
        minutes = duration_ms // 60000
        seconds = (duration_ms % 60000) // 1000
        return f"{minutes}:{seconds:02d}"


def main() -> None:
    print("=" * 50)
    print("Music Streaming DAC")
    print("=" * 50)

    if not config.validate_config():
        print("Continuing with limited functionality (no API keys).")

    try:
        app = MusicDACApp()
        app.run()
    except KeyboardInterrupt:
        print("\nShutting down...")
    except Exception as exc:
        print(f"\nError starting application: {exc}")
        import traceback

        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    main()
