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
let spotifyPlayer = null;
let deviceId = null;
let currentToken = null;

// ====================================================
// Spotify Web Playback SDK 초기화
// ====================================================
window.onSpotifyWebPlaybackSDKReady = () => {
  initializeSpotifyPlayer();
};

async function initializeSpotifyPlayer() {
  try {
    const api = getApi();
    if (!api?.get_playback_token) {
      statusText.textContent = "Bridge not ready. Refreshing…";
      setTimeout(initializeSpotifyPlayer, 2000);
      return;
    }

    // 백엔드에서 토큰 발급
    const tokenResponse = await api.get_playback_token();
    if (!tokenResponse?.success || !tokenResponse?.token) {
      statusText.textContent = "Failed to get Spotify token.";
      console.error("Token response:", tokenResponse);
      return;
    }

    currentToken = tokenResponse.token;

    // Spotify Player 생성
    spotifyPlayer = new Spotify.Player({
      name: "Music DAC Web Player",
      getOAuthToken: (cb) => {
        cb(currentToken);
      },
      volume: 0.5,
    });

    // 플레이어 리스너 등록
    spotifyPlayer.addListener("ready", ({ device_id }) => {
      deviceId = device_id;
      console.log("✅ Web Playback SDK Ready with Device ID:", device_id);
      statusText.textContent = "Web Player Ready.";
      updatePlayback(); // 초기 상태 업데이트
    });

    spotifyPlayer.addListener("player_state_changed", (state) => {
      if (state) {
        console.log("🎵 Playback state changed:", state);
        updateUi(state);
      }
    });

    spotifyPlayer.addListener("initialization_error", ({ message }) => {
      console.error("❌ Initialization Error:", message);
      statusText.textContent = `Error: ${message}`;
    });

    spotifyPlayer.addListener("authentication_error", ({ message }) => {
      console.error("❌ Authentication Error:", message);
      statusText.textContent = "Authentication failed. Refresh required.";
    });

    spotifyPlayer.addListener("account_error", ({ message }) => {
      console.error("❌ Account Error:", message);
      statusText.textContent = `Account Error: ${message}`;
    });

    spotifyPlayer.addListener("playback_error", ({ message }) => {
      console.error("❌ Playback Error:", message);
      statusText.textContent = `Playback Error: ${message}`;
    });

    // 플레이어 연결
    const connected = await spotifyPlayer.connect();
    if (connected) {
      console.log("✅ Spotify Web Player connected!");
    } else {
      console.error("❌ Failed to connect Spotify Web Player");
      statusText.textContent = "Failed to connect player.";
    }
  } catch (error) {
    console.error("❌ Player initialization error:", error);
    statusText.textContent = "Player initialization error.";
  }
}

// ====================================================
// UI 업데이트
// ====================================================
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

function updateUi(state) {
  if (!state || !state.track_window || !state.track_window.current_track) {
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

  const track = state.track_window.current_track;
  trackTitle.textContent = track.name ?? "Unknown track";
  trackArtist.textContent = (track.artists || [])
    .map((artist) => artist.name)
    .join(", ") || "Unknown artist";
  trackAlbum.textContent = track.album?.name ?? "Unknown album";

  const image = track.album?.images?.[0]?.url;
  if (image) {
    artwork.style.backgroundImage = `url(${image})`;
  } else {
    artwork.style.backgroundImage = "linear-gradient(135deg, #1db954, #121a27)";
  }

  const position = state.position ?? 0;
  const duration = track.duration_ms ?? 0;
  positionLabel.textContent = formatDuration(position);
  durationLabel.textContent = formatDuration(duration);
  const progressPercent = duration ? Math.min(100, (position / duration) * 100) : 0;
  if (progressBar) progressBar.style.width = `${progressPercent}%`;

  isPlaying = !state.paused;
  playPauseBtn.textContent = isPlaying ? "⏸" : "▶";
  statusText.textContent = isPlaying ? "Playing…" : "Paused.";
}

async function updatePlayback() {
  const api = getApi();
  if (!api?.get_playback) {
    statusText.textContent = "Waiting for playback bridge…";
    return;
  }
  try {
    const response = await api.get_playback();
    if (response?.playback) {
      // Web API 재생 상태도 함께 표시 (Web Playback SDK 상태가 우선)
      if (!spotifyPlayer) {
        updateUiFromWebApi(response.playback);
      }
    }
  } catch (error) {
    console.error("Failed to refresh playback state", error);
  }
}

// Web API 기반 UI 업데이트 (fallback)
function updateUiFromWebApi(playback) {
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

// ====================================================
// 재생 제어 (Web Playback SDK 우선)
// ====================================================
async function togglePlayPause() {
  // Web Playback SDK 사용
  if (spotifyPlayer) {
    try {
      await spotifyPlayer.togglePlay();
      return;
    } catch (error) {
      console.error("Web Playback togglePlay error:", error);
    }
  }

  // Fallback: Web API 사용
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
  // Web Playback SDK 사용
  if (spotifyPlayer) {
    try {
      await spotifyPlayer.previousTrack();
      return;
    } catch (error) {
      console.error("Web Playback previousTrack error:", error);
    }
  }

  // Fallback: Web API 사용
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
  // Web Playback SDK 사용
  if (spotifyPlayer) {
    try {
      await spotifyPlayer.nextTrack();
      return;
    } catch (error) {
      console.error("Web Playback nextTrack error:", error);
    }
  }

  // Fallback: Web API 사용
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
  // Web Playback SDK 사용
  if (spotifyPlayer) {
    const volume = Number(value) / 100;
    if (volumeDebounce) {
      clearTimeout(volumeDebounce);
    }
    volumeDebounce = setTimeout(async () => {
      try {
        await spotifyPlayer.setVolume(volume);
      } catch (error) {
        console.error("Failed to set volume via Web Playback:", error);
      }
    }, 200);
    return;
  }

  // Fallback: Web API 사용
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

// ====================================================
// 이벤트 리스너
// ====================================================
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

// 초기화
updatePlayback();
playbackPoll = setInterval(updatePlayback, 3000);

window.addEventListener("beforeunload", () => {
  if (playbackPoll) {
    clearInterval(playbackPoll);
  }
  if (spotifyPlayer) {
    spotifyPlayer.disconnect();
  }
});

function getApi() {
  return window.pywebview?.api ?? null;
}

if (!getApi()) {
  window.addEventListener("pywebviewready", () => {
    statusText.textContent = "Initializing Web Playback SDK…";
  });
}