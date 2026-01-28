"""
Spotify API Manager
Spotify API ��리 및 음악 재생 제어
"""

from __future__ import annotations

from typing import Any, Dict, List, Optional

import spotipy
from spotipy.oauth2 import SpotifyOAuth

import config


class SpotifyManager:
    """Spotify API 관리 클래스 (UI 프레임워크에 독립적)"""

    def __init__(self) -> None:
        self.sp: Optional[spotipy.Spotify] = None
        self.current_playback: Optional[Dict[str, Any]] = None
        self.auth_manager: Optional[SpotifyOAuth] = None
        self.authenticate()

    # ==============================================
    # Authentication
    # ==============================================
    def authenticate(self) -> None:
        """Spotify 인증"""
        try:
            self.auth_manager = SpotifyOAuth(
                client_id=config.SPOTIFY_CLIENT_ID,
                client_secret=config.SPOTIFY_CLIENT_SECRET,
                redirect_uri=config.SPOTIFY_REDIRECT_URI,
                scope=config.SPOTIFY_SCOPE,
                open_browser=True,
            )

            self.sp = spotipy.Spotify(auth_manager=self.auth_manager)

            # Test connection
            user = self.sp.current_user()
            print(f"✅ Spotify authenticated as: {user['display_name']}")

        except Exception as exc:  # pragma: no cover - network/auth failure
            self.sp = None
            print(f"❌ Spotify authentication failed: {exc}")

    def _client(self) -> spotipy.Spotify:
        if not self.sp:
            raise RuntimeError("Spotify client is not authenticated")
        return self.sp

    # ==============================================
    # Web Playback SDK Token Management
    # ==============================================
    def get_access_token(self) -> Optional[str]:
        """
        Web Playback SDK용 액세스 토큰 발급
        JavaScript에서 플레이어를 생성할 때 필요
        """
        if not self.auth_manager:
            print("❌ Auth manager not initialized")
            return None
        
        try:
            token_info = self.auth_manager.get_cached_token()
            if token_info and not self.auth_manager.is_token_expired(token_info):
                return token_info.get("access_token")
            
            # 토큰이 만료되었거나 없으면 새로 발급
            token_info = self.auth_manager.refresh_access_token(
                self.auth_manager.get_cached_token().get("refresh_token")
                if self.auth_manager.get_cached_token()
                else None
            )
            return token_info.get("access_token") if token_info else None
        except Exception as exc:
            print(f"❌ Failed to get access token: {exc}")
            return None

    # ==============================================
    # Search Functions
    # ==============================================
    def search(self, query: str, search_type: str = "track", limit: int = 20) -> Optional[Dict[str, Any]]:
        """검색 수행"""
        if not query or not query.strip():
            return None

        try:
            client = self._client()
            return client.search(q=query, type=search_type, limit=limit, market="KR")
        except Exception as exc:
            print(f"❌ Search failed: {exc}")
            return None

    # ==============================================
    # Library Functions
    # ==============================================
    def get_user_playlists(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            client = self._client()
            playlists = client.current_user_playlists(limit=limit)
            return playlists.get("items", [])
        except Exception as exc:
            print(f"❌ Failed to get playlists: {exc}")
            return []

    def get_playlist_tracks(self, playlist_id: str) -> List[Dict[str, Any]]:
        try:
            client = self._client()
            results = client.playlist_tracks(playlist_id)
            return results.get("items", [])
        except Exception as exc:
            print(f"❌ Failed to get playlist tracks: {exc}")
            return []

    def get_saved_albums(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            client = self._client()
            albums = client.current_user_saved_albums(limit=limit)
            return albums.get("items", [])
        except Exception as exc:
            print(f"❌ Failed to get albums: {exc}")
            return []

    def get_album_tracks(self, album_id: str) -> List[Dict[str, Any]]:
        try:
            client = self._client()
            results = client.album_tracks(album_id)
            return results.get("items", [])
        except Exception as exc:
            print(f"❌ Failed to get album tracks: {exc}")
            return []

    def get_followed_artists(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            client = self._client()
            artists = client.current_user_followed_artists(limit=limit)
            return artists.get("artists", {}).get("items", [])
        except Exception as exc:
            print(f"❌ Failed to get artists: {exc}")
            return []

    def get_artist_top_tracks(self, artist_id: str) -> List[Dict[str, Any]]:
        try:
            client = self._client()
            results = client.artist_top_tracks(artist_id, country="KR")
            return results.get("tracks", [])
        except Exception as exc:
            print(f"❌ Failed to get artist top tracks: {exc}")
            return []

    # ==============================================
    # Playback Control Functions
    # ==============================================
    def play_track(self, uri: str) -> bool:
        if not uri or not uri.startswith("spotify:"):
            print(f"❌ Invalid URI: {uri}")
            return False

        try:
            client = self._client()
            client.start_playback(uris=[uri])
            print(f"▶️  Playing: {uri}")
            return True
        except Exception as exc:
            print(f"❌ Playback failed: {exc}")
            return False

    def play_tracks(self, uris: List[str]) -> bool:
        if not uris:
            return False

        try:
            client = self._client()
            client.start_playback(uris=uris)
            print(f"▶️  Playing {len(uris)} tracks")
            return True
        except Exception as exc:
            print(f"❌ Playback failed: {exc}")
            return False

    def pause(self) -> bool:
        try:
            client = self._client()
            client.pause_playback()
            print("⏸️  Paused")
            return True
        except Exception as exc:
            print(f"❌ Pause failed: {exc}")
            return False

    def resume(self) -> bool:
        try:
            client = self._client()
            client.start_playback()
            print("▶️  Resumed")
            return True
        except Exception as exc:
            print(f"❌ Resume failed: {exc}")
            return False

    def next_track(self) -> bool:
        try:
            client = self._client()
            client.next_track()
            print("⏭️  Next track")
            return True
        except Exception as exc:
            print(f"��� Next track failed: {exc}")
            return False

    def previous_track(self) -> bool:
        try:
            client = self._client()
            client.previous_track()
            print("⏮️  Previous track")
            return True
        except Exception as exc:
            print(f"❌ Previous track failed: {exc}")
            return False

    def seek_to_position(self, position_ms: int) -> bool:
        try:
            client = self._client()
            client.seek_track(position_ms)
            print(f"⏩ Seek to {position_ms}ms")
            return True
        except Exception as exc:
            print(f"❌ Seek failed: {exc}")
            return False

    def set_volume(self, volume_percent: int) -> bool:
        value = max(0, min(100, volume_percent))
        try:
            client = self._client()
            client.volume(value)
            print(f"🔊 Volume set to {value}%")
            return True
        except Exception as exc:
            print(f"❌ Volume change failed: {exc}")
            return False

    # ==============================================
    # Playback State Functions
    # ==============================================
    def get_current_playback(self) -> Optional[Dict[str, Any]]:
        try:
            client = self._client()
            playback = client.current_playback()
            if playback:
                self.current_playback = playback
            return playback
        except Exception as exc:
            if config.DEBUG_MODE:
                print(f"❌ Failed to get playback: {exc}")
            return None

    def is_playing(self) -> bool:
        playback = self.get_current_playback()
        return bool(playback and playback.get("is_playing", False))

    def get_current_track(self) -> Optional[Dict[str, Any]]:
        playback = self.get_current_playback()
        if playback:
            return playback.get("item")
        return None

    # ==============================================
    # Device Functions
    # ==============================================
    def get_available_devices(self) -> List[Dict[str, Any]]:
        try:
            client = self._client()
            devices = client.devices()
            return devices.get("devices", [])
        except Exception as exc:
            print(f"❌ Failed to get devices: {exc}")
            return []

    def transfer_playback(self, device_id: str) -> bool:
        try:
            client = self._client()
            client.transfer_playback(device_id)
            print(f"📱 Playback transferred to device: {device_id}")
            return True
        except Exception as exc:
            print(f"❌ Transfer failed: {exc}")
            return False