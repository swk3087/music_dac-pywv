const backButton = document.querySelector(".back-button");
const playlistList = document.getElementById("playlist-list");
const trackList = document.getElementById("track-list");
const detailTitle = document.getElementById("detail-title");
const detailSubtitle = document.getElementById("detail-subtitle");
const detailStats = document.getElementById("detail-stats");
const playAllButton = document.getElementById("play-all");
const openDetailButton = document.getElementById("open-detail");

let currentPlaylist = null;
let currentTracks = [];

async function navigate(screen) {
  const api = getApi();
  if (!api?.navigate) {
    showStatus("Navigation bridge not ready. Try again shortly.");
    return;
  }
  try {
    await api.navigate(screen);
  } catch (error) {
    console.error("Navigation failed", error);
  }
}

function setDetail(playlist) {
  if (!playlist) {
    detailTitle.textContent = "Choose a playlist";
    detailSubtitle.textContent = "Tracks will appear here.";
    detailStats.textContent = "";
    playAllButton.disabled = true;
    openDetailButton.disabled = true;
    return;
  }

  detailTitle.textContent = playlist.name ?? "Untitled playlist";
  detailSubtitle.textContent = playlist.description || "Personal mix";
  detailStats.textContent = `${playlist.tracks_total ?? 0} tracks`;
  detailStats.classList.remove("muted");
  playAllButton.disabled = false;
  openDetailButton.disabled = false;
}

function renderPlaylists(playlists) {
  playlistList.innerHTML = "";
  if (!playlists?.length) {
    const placeholder = document.createElement("li");
    placeholder.textContent = "No playlists available.";
    playlistList.appendChild(placeholder);
    return;
  }

  playlists.forEach((playlist) => {
    const item = document.createElement("li");
    item.className = "item-card";
    item.innerHTML = `
      <p class="item-title">${playlist.name ?? "Untitled playlist"}</p>
      <p class="item-subtitle">${playlist.tracks_total ?? 0} tracks</p>
    `;

    item.addEventListener("click", () => selectPlaylist(playlist, item));

    playlistList.appendChild(item);
  });
}

function renderTracks(tracks) {
  trackList.innerHTML = "";

  if (!tracks?.length) {
    const placeholder = document.createElement("li");
    placeholder.textContent = "No tracks to display.";
    trackList.appendChild(placeholder);
    return;
  }

  tracks.forEach((track) => {
    const item = document.createElement("li");
    item.className = "track-item";

    const meta = document.createElement("div");
    meta.className = "track-meta";

    const title = document.createElement("p");
    title.className = "track-title";
    title.textContent = track.name ?? "Unknown track";

    const subtitle = document.createElement("p");
    subtitle.className = "track-subtitle";
    subtitle.textContent = `${track.artists ?? "Unknown"} · ${track.duration}`;

    meta.appendChild(title);
    meta.appendChild(subtitle);

    const actions = document.createElement("div");
    actions.className = "track-actions";
    const playBtn = document.createElement("button");
    playBtn.textContent = "Play";
    playBtn.addEventListener("click", () => playTrack(track.uri));
    actions.appendChild(playBtn);

    item.appendChild(meta);
    item.appendChild(actions);
    trackList.appendChild(item);
  });
}

async function playTrack(uri) {
  if (!uri) return;
  const api = getApi();
  if (!api?.play_track) {
    showStatus("Playback bridge not ready yet.");
    return;
  }
  try {
    const result = await api.play_track(uri);
    if (result?.success) {
      await api.navigate("player");
    }
  } catch (error) {
    console.error("Failed to start playback", error);
  }
}

async function selectPlaylist(playlist, element) {
  currentPlaylist = playlist;
  currentTracks = [];

  document.querySelectorAll(".item-card").forEach((item) => {
    item.classList.toggle("active", item === element);
  });

  setDetail(playlist);
  trackList.innerHTML = "<li>Loading tracks…</li>";

  try {
    const api = getApi();
    if (!api?.get_playlist_tracks) {
      trackList.innerHTML = "<li>Bridge not ready. Please retry.</li>";
      return;
    }
    const response = await api.get_playlist_tracks(playlist.id);
    const tracks = response?.tracks ?? [];
    currentTracks = tracks.filter((track) => track?.uri);
    renderTracks(tracks);
  } catch (error) {
    console.error("Failed to load tracks", error);
    trackList.innerHTML = "<li>Unable to load tracks.</li>";
  }
}

async function playAll() {
  if (!currentTracks.length) return;
  const api = getApi();
  if (!api?.play_tracks) {
    showStatus("Playback bridge not ready.");
    return;
  }
  const uris = currentTracks.map((track) => track.uri).filter(Boolean);
  if (!uris.length) return;

  try {
    const result = await api.play_tracks(uris);
    if (result?.success) {
      await api.navigate("player");
    }
  } catch (error) {
    console.error("Failed to queue tracks", error);
  }
}

function openDetail() {
  if (!currentPlaylist) return;

  const payload = {
    type: "playlist",
    id: currentPlaylist.id,
    title: currentPlaylist.name,
    subtitle: currentPlaylist.description,
    stats: `${currentPlaylist.tracks_total ?? 0} tracks`,
  };

  sessionStorage.setItem("detailPayload", JSON.stringify(payload));
  navigate("detail");
}

async function loadPlaylists() {
  playlistList.innerHTML = "<li>Loading playlists…</li>";
  try {
    const api = getApi();
    if (!api?.get_playlists) {
      playlistList.innerHTML = "<li>Bridge not ready. Please retry shortly.</li>";
      return;
    }
    const response = await api.get_playlists();
    renderPlaylists(response?.playlists ?? []);
  } catch (error) {
    console.error("Failed to fetch playlists", error);
    playlistList.innerHTML = "<li>Unable to load playlists.</li>";
  }
}

if (backButton) {
  backButton.addEventListener("click", () => navigate("home"));
}

if (playAllButton) {
  playAllButton.addEventListener("click", playAll);
}

if (openDetailButton) {
  openDetailButton.addEventListener("click", openDetail);
}

loadPlaylists();

function showStatus(message) {
  detailStats.textContent = message;
  detailStats.classList.add("muted");
}

function getApi() {
  return window.pywebview?.api ?? null;
}

if (!getApi()) {
  window.addEventListener("pywebviewready", loadPlaylists);
}
