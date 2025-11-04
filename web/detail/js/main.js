const backButton = document.getElementById("back-button");
const titleEl = document.getElementById("detail-title");
const subtitleEl = document.getElementById("detail-subtitle");
const statsEl = document.getElementById("detail-stats");
const statusEl = document.getElementById("detail-status");
const playAllButton = document.getElementById("play-all");
const trackList = document.getElementById("track-list");

const payloadRaw = sessionStorage.getItem("detailPayload");
const payload = payloadRaw ? safeJsonParse(payloadRaw) : null;
const backTargets = { playlist: "playlist", album: "album", artist: "artist" };
const backTarget = payload ? backTargets[payload.type] || "home" : "home";

let currentTracks = [];

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch (error) {
    console.error("Failed to parse payload", error);
    return null;
  }
}

async function navigate(screen) {
  const api = getApi();
  if (!api?.navigate) {
    statusEl.textContent = "Bridge not ready. Try again shortly.";
    return;
  }
  try {
    await api.navigate(screen);
  } catch (error) {
    console.error("Navigation failed", error);
  }
}

function initialiseHeader() {
  if (!payload) {
    titleEl.textContent = "No content selected";
    subtitleEl.textContent = "";
    statsEl.textContent = "";
    playAllButton.disabled = true;
    statusEl.textContent = "Return to the previous screen and choose an item.";
    trackList.innerHTML = "";
    return;
  }

  titleEl.textContent = payload.title ?? "Detail view";
  subtitleEl.textContent = payload.subtitle || "";
  statsEl.textContent = payload.stats || "";
  playAllButton.disabled = false;
  statusEl.textContent = "Loading tracks…";
}

function renderTracks(tracks) {
  trackList.innerHTML = "";
  currentTracks = tracks.filter((track) => track?.uri);

  if (!tracks?.length) {
    statusEl.textContent = "No tracks available for this item.";
    const placeholder = document.createElement("li");
    placeholder.textContent = "No tracks to show.";
    trackList.appendChild(placeholder);
    playAllButton.disabled = true;
    return;
  }

  statusEl.textContent = `Loaded ${tracks.length} track(s).`;
  playAllButton.disabled = currentTracks.length === 0;

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
    const arts = track.artists ?? "Unknown artist";
    subtitle.textContent = `${arts} · ${track.duration ?? ""}`;

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
    statusEl.textContent = "Playback bridge not ready.";
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

async function playAll() {
  if (!currentTracks.length) return;
  const api = getApi();
  if (!api?.play_tracks) {
    statusEl.textContent = "Playback bridge not ready.";
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

async function fetchTracks() {
  if (!payload) return;

  try {
    const api = getApi();
    if (!api) {
      statusEl.textContent = "Bridge not ready yet. Please retry.";
      return;
    }

    let response = null;
    if (payload.type === "playlist") {
      response = await api.get_playlist_tracks(payload.id);
      renderTracks(response?.tracks ?? []);
    } else if (payload.type === "album") {
      response = await api.get_album_tracks(payload.id);
      renderTracks(response?.tracks ?? []);
    } else if (payload.type === "artist") {
      response = await api.get_artist_top_tracks(payload.id);
      renderTracks(response?.tracks ?? []);
    } else {
      statusEl.textContent = "Unsupported detail type.";
      trackList.innerHTML = "";
    }
  } catch (error) {
    console.error("Failed to fetch tracks", error);
    statusEl.textContent = "Unable to load tracks.";
  }
}

if (backButton) {
  backButton.addEventListener("click", () => navigate(backTarget));
}

if (playAllButton) {
  playAllButton.addEventListener("click", playAll);
}

initialiseHeader();
fetchTracks();

function getApi() {
  return window.pywebview?.api ?? null;
}

if (!getApi()) {
  window.addEventListener("pywebviewready", fetchTracks);
}
