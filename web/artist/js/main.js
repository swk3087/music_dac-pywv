const backButton = document.querySelector(".back-button");
const artistList = document.getElementById("artist-list");
const trackList = document.getElementById("track-list");
const detailTitle = document.getElementById("detail-title");
const detailSubtitle = document.getElementById("detail-subtitle");
const detailStats = document.getElementById("detail-stats");
const playAllButton = document.getElementById("play-all");
const openDetailButton = document.getElementById("open-detail");

let currentArtist = null;
let currentTracks = [];

async function navigate(screen) {
  const api = getApi();
  if (!api?.navigate) {
    setDetailMessage("Bridge not ready. Try again shortly.");
    return;
  }
  try {
    await api.navigate(screen);
  } catch (error) {
    console.error("Navigation failed", error);
  }
}

function setDetail(artist) {
  if (!artist) {
    detailTitle.textContent = "Choose an artist";
    detailSubtitle.textContent = "Top tracks will appear here.";
    detailStats.textContent = "";
    playAllButton.disabled = true;
    openDetailButton.disabled = true;
    return;
  }

  detailTitle.textContent = artist.name ?? "Unknown artist";
  detailSubtitle.textContent = artist.genres?.length ? artist.genres.join(", ") : "No genres listed";
  detailStats.textContent = artist.followers ? `${artist.followers.toLocaleString()} followers` : "";
  detailStats.classList.remove("muted");
  playAllButton.disabled = false;
  openDetailButton.disabled = false;
}

function renderArtists(artists) {
  artistList.innerHTML = "";
  if (!artists?.length) {
    const placeholder = document.createElement("li");
    placeholder.textContent = "No followed artists available.";
    artistList.appendChild(placeholder);
    return;
  }

  artists.forEach((artist) => {
    const item = document.createElement("li");
    item.className = "item-card";
    const subtitleText = artist.genres?.slice(0, 3).join(", ") || "No genres listed";
    item.innerHTML = `
      <p class="item-title">${artist.name ?? "Unknown artist"}</p>
      <p class="item-subtitle">${subtitleText}</p>
    `;

    item.addEventListener("click", () => selectArtist(artist, item));
    artistList.appendChild(item);
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
    subtitle.textContent = `${track.album ?? "Unknown album"} · ${track.duration}`;

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
    setDetailMessage("Playback bridge not ready.");
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

async function selectArtist(artist, element) {
  currentArtist = artist;
  currentTracks = [];

  document.querySelectorAll(".item-card").forEach((item) => {
    item.classList.toggle("active", item === element);
  });

  setDetail(artist);
  trackList.innerHTML = "<li>Loading top tracks…</li>";

  try {
    const api = getApi();
    if (!api?.get_artist_top_tracks) {
      trackList.innerHTML = "<li>Bridge not ready. Please retry.</li>";
      return;
    }
    const response = await api.get_artist_top_tracks(artist.id);
    const tracks = response?.tracks ?? [];
    currentTracks = tracks.filter((track) => track?.uri);
    renderTracks(tracks);
  } catch (error) {
    console.error("Failed to load tracks", error);
    trackList.innerHTML = "<li>Unable to load top tracks.</li>";
  }
}

async function playAll() {
  if (!currentTracks.length) return;
  const api = getApi();
  if (!api?.play_tracks) {
    setDetailMessage("Playback bridge not ready yet.");
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
  if (!currentArtist) return;

  const payload = {
    type: "artist",
    id: currentArtist.id,
    title: currentArtist.name,
    subtitle: currentArtist.genres?.slice(0, 3).join(", "),
    stats: currentArtist.followers ? `${currentArtist.followers.toLocaleString()} followers` : "",
  };

  sessionStorage.setItem("detailPayload", JSON.stringify(payload));
  navigate("detail");
}

async function loadArtists() {
  artistList.innerHTML = "<li>Loading artists…</li>";
  try {
    const api = getApi();
    if (!api?.get_followed_artists) {
      artistList.innerHTML = "<li>Bridge not ready. Please retry shortly.</li>";
      return;
    }
    const response = await api.get_followed_artists();
    renderArtists(response?.artists ?? []);
  } catch (error) {
    console.error("Failed to fetch artists", error);
    artistList.innerHTML = "<li>Unable to load artists.</li>";
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

loadArtists();

function setDetailMessage(message) {
  detailStats.textContent = message;
  detailStats.classList.add("muted");
}

function getApi() {
  return window.pywebview?.api ?? null;
}

if (!getApi()) {
  window.addEventListener("pywebviewready", loadArtists);
}
