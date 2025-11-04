const backButton = document.querySelector(".back-button");
const artwork = document.getElementById("artwork");
const trackTitle = document.getElementById("track-title");
const trackArtist = document.getElementById("track-artist");
const trackAlbum = document.getElementById("track-album");
const positionLabel = document.getElementById("position-label");
const durationLabel = document.getElementById("duration-label");
const progressBar = document.getElementById("progress-bar");
const statusText = document.getElementById("player-status");
const prevBtn = document.getElementById("prev-btn");
const playPauseBtn = document.getElementById("play-pause-btn");
const nextBtn = document.getElementById("next-btn");
const volumeSlider = document.getElementById("volume-slider");
const volumeValue = document.getElementById("volume-value");

let isPlaying = false;
let playbackPoll = null;
let volumeDebounce = null;

async function navigate(screen) {
  const api = getApi();
  if (!api?.navigate) {
    statusText.textContent = "Bridge not ready yet. Try again shortly.";
    return;
  }
  try {
    await api.navigate(screen);
  } catch (error) {
    console.error("Navigation failed", error);
  }
}

function formatDuration(ms) {
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.floor((ms % 60000) / 1000);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function updateUi(playback) {
  if (!playback || !playback.item) {
    trackTitle.textContent = "Nothing playing";
    trackArtist.textContent = "Select a track to begin playback.";
    trackAlbum.textContent = "";
    positionLabel.textContent = "0:00";
    durationLabel.textContent = "0:00";
    if (progressBar) progressBar.style.width = "0%";
    if (artwork) artwork.style.backgroundImage = "linear-gradient(135deg, #1db954, #121a27)";
    isPlaying = false;
    playPauseBtn.textContent = "▶";
    statusText.textContent = "Playback idle.";
    return;
  }

  const track = playback.item;
  trackTitle.textContent = track.name ?? "Unknown track";
  trackArtist.textContent = (track.artists || []).map((artist) => artist.name).join(", ") || "Unknown artist";
  trackAlbum.textContent = track.album?.name ?? "Unknown album";

  const image = track.album?.images?.[0]?.url;
  if (image) {
    artwork.style.backgroundImage = `url(${image})`;
  } else {
    artwork.style.backgroundImage = "linear-gradient(135deg, #1db954, #121a27)";
  }

  const position = playback.progress_ms ?? 0;
  const duration = track.duration_ms ?? 0;
  positionLabel.textContent = formatDuration(position);
  durationLabel.textContent = formatDuration(duration);
  const progressPercent = duration ? Math.min(100, (position / duration) * 100) : 0;
  if (progressBar) progressBar.style.width = `${progressPercent}%`;

  isPlaying = Boolean(playback.is_playing);
  playPauseBtn.textContent = isPlaying ? "⏸" : "▶";
  statusText.textContent = isPlaying ? "Playing…" : "Paused.";

  if (typeof playback.device?.volume_percent === "number") {
    const volume = playback.device.volume_percent;
    volumeSlider.value = volume;
    volumeValue.textContent = `${volume}%`;
  }
}

async function updatePlayback() {
  const api = getApi();
  if (!api?.get_playback) {
    statusText.textContent = "Waiting for playback bridge…";
    return;
  }
  try {
    const response = await api.get_playback();
    updateUi(response?.playback ?? null);
  } catch (error) {
    console.error("Failed to refresh playback state", error);
  }
}

async function togglePlayPause() {
  const api = getApi();
  if (!api) {
    statusText.textContent = "Playback bridge not ready.";
    return;
  }
  try {
    if (isPlaying) {
      const result = await api.pause();
      if (result?.success) {
        isPlaying = false;
        playPauseBtn.textContent = "▶";
        statusText.textContent = "Paused.";
      }
    } else {
      const result = await api.resume();
      if (result?.success) {
        isPlaying = true;
        playPauseBtn.textContent = "⏸";
        statusText.textContent = "Playing…";
      }
    }
  } catch (error) {
    console.error("Failed to toggle playback", error);
  }
}

async function previousTrack() {
  const api = getApi();
  if (!api?.previous_track) {
    statusText.textContent = "Bridge not ready.";
    return;
  }
  try {
    await api.previous_track();
    statusText.textContent = "Skipping to previous track…";
    await updatePlayback();
  } catch (error) {
    console.error("Failed to go to previous track", error);
  }
}

async function nextTrack() {
  const api = getApi();
  if (!api?.next_track) {
    statusText.textContent = "Bridge not ready.";
    return;
  }
  try {
    await api.next_track();
    statusText.textContent = "Skipping to next track…";
    await updatePlayback();
  } catch (error) {
    console.error("Failed to go to next track", error);
  }
}

function updateVolumeLabel(value) {
  if (volumeValue) {
    volumeValue.textContent = `${value}%`;
  }
}

function scheduleVolumeUpdate(value) {
  const api = getApi();
  if (!api?.set_volume) return;
  if (volumeDebounce) {
    clearTimeout(volumeDebounce);
  }
  volumeDebounce = setTimeout(async () => {
    try {
      await api.set_volume(Number(value));
    } catch (error) {
      console.error("Failed to set volume", error);
    }
  }, 200);
}

if (backButton) {
  backButton.addEventListener("click", () => navigate("home"));
}

if (playPauseBtn) {
  playPauseBtn.addEventListener("click", togglePlayPause);
}

if (prevBtn) {
  prevBtn.addEventListener("click", previousTrack);
}

if (nextBtn) {
  nextBtn.addEventListener("click", nextTrack);
}

if (volumeSlider) {
  volumeSlider.addEventListener("input", (event) => {
    const value = event.target.value;
    updateVolumeLabel(value);
    scheduleVolumeUpdate(value);
  });
}

updatePlayback();
playbackPoll = setInterval(updatePlayback, 3000);

window.addEventListener("beforeunload", () => {
  if (playbackPoll) {
    clearInterval(playbackPoll);
  }
});

function getApi() {
  return window.pywebview?.api ?? null;
}

if (!getApi()) {
  window.addEventListener("pywebviewready", updatePlayback);
}
