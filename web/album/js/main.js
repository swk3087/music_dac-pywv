const api = window.pywebview ? window.pywebview.api : null;
const backButton = document.querySelector(".back-button");
const albumList = document.getElementById("album-list");
const trackList = document.getElementById("track-list");
const detailTitle = document.getElementById("detail-title");
const detailSubtitle = document.getElementById("detail-subtitle");
const detailStats = document.getElementById("detail-stats");
const playAllButton = document.getElementById("play-all");
const openDetailButton = document.getElementById("open-detail");

let currentAlbum = null;
let currentTracks = [];

async function navigate(screen) {
  if (!api?.navigate) return;
  try {
    await api.navigate(screen);
  } catch (error) {
    console.error("Navigation failed", error);
  }
}

function setDetail(album) {
  if (!album) {
    detailTitle.textContent = "Choose an album";
    detailSubtitle.textContent = "Tracks will appear here.";
    detailStats.textContent = "";
    playAllButton.disabled = true;
    openDetailButton.disabled = true;
    return;
  }

  detailTitle.textContent = album.name ?? "Untitled album";
  detailSubtitle.textContent = album.artists ?? "Various artists";
  detailStats.textContent = album.release_date ? `Released ${album.release_date}` : "";
  playAllButton.disabled = false;
  openDetailButton.disabled = false;
}

function renderAlbums(albums) {
  albumList.innerHTML = "";
  if (!albums?.length) {
    const placeholder = document.createElement("li");
    placeholder.textContent = "No albums available.";
    albumList.appendChild(placeholder);
    return;
  }

  albums.forEach((album) => {
    const item = document.createElement("li");
    item.className = "item-card";
    item.innerHTML = `
      <p class="item-title">${album.name ?? "Untitled album"}</p>
      <p class="item-subtitle">${album.artists ?? "Unknown artist"}</p>
    `;

    item.addEventListener("click", () => selectAlbum(album, item));
    albumList.appendChild(item);
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

  tracks.forEach((track, index) => {
    const item = document.createElement("li");
    item.className = "track-item";

    const meta = document.createElement("div");
    meta.className = "track-meta";

    const title = document.createElement("p");
    title.className = "track-title";
    title.textContent = `${index + 1}. ${track.name ?? "Unknown track"}`;

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
  if (!uri || !api?.play_track) return;
  try {
    const result = await api.play_track(uri);
    if (result?.success) {
      await api.navigate("player");
    }
  } catch (error) {
    console.error("Failed to start playback", error);
  }
}

async function selectAlbum(album, element) {
  currentAlbum = album;
  currentTracks = [];

  document.querySelectorAll(".item-card").forEach((item) => {
    item.classList.toggle("active", item === element);
  });

  setDetail(album);
  trackList.innerHTML = "<li>Loading tracks…</li>";

  try {
    const response = await api?.get_album_tracks(album.id);
    const tracks = response?.tracks ?? [];
    currentTracks = tracks.filter((track) => track?.uri);
    renderTracks(tracks);
  } catch (error) {
    console.error("Failed to load tracks", error);
    trackList.innerHTML = "<li>Unable to load tracks.</li>";
  }
}

async function playAll() {
  if (!currentTracks.length || !api?.play_tracks) return;
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
  if (!currentAlbum) return;

  const payload = {
    type: "album",
    id: currentAlbum.id,
    title: currentAlbum.name,
    subtitle: currentAlbum.artists,
    stats: currentAlbum.release_date ? `Released ${currentAlbum.release_date}` : "",
  };

  sessionStorage.setItem("detailPayload", JSON.stringify(payload));
  navigate("detail");
}

async function loadAlbums() {
  albumList.innerHTML = "<li>Loading albums…</li>";
  try {
    const response = await api?.get_saved_albums();
    renderAlbums(response?.albums ?? []);
  } catch (error) {
    console.error("Failed to fetch albums", error);
    albumList.innerHTML = "<li>Unable to load albums.</li>";
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

loadAlbums();
