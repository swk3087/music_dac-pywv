const backButton = document.querySelector(".back-button");
const form = document.getElementById("search-form");
const input = document.getElementById("search-input");
const resultsList = document.getElementById("results-list");
const hint = document.getElementById("search-hint");

function setHint(message, tone = "info") {
  if (!hint) return;
  hint.textContent = message;
  if (tone === "error") {
    hint.style.color = "#ff8080";
  } else if (tone === "success") {
    hint.style.color = "#8df2b2";
  } else {
    hint.style.color = "rgba(255,255,255,0.7)";
  }
}

async function navigate(screen) {
  const api = getApi();
  if (!api?.navigate) {
    setHint("Bridge not ready. Please try again in a moment.", "error");
    return;
  }
  try {
    await api.navigate(screen);
  } catch (error) {
    console.error("Navigation failed", error);
  }
}

async function playTrack(uri) {
  const api = getApi();
  if (!api?.play_track) {
    setHint("Playback bridge not ready.", "error");
    return;
  }
  try {
    const result = await api.play_track(uri);
    if (!result?.success) {
      throw new Error("Playback failed");
    }
    setHint("Playing track…", "success");
    await api.navigate("player");
  } catch (error) {
    console.error(error);
    setHint("Unable to start playback.", "error");
  }
}

function renderResults(tracks) {
  resultsList.innerHTML = "";
  if (!tracks?.length) {
    setHint("No results found. Try a different keyword.", "error");
    return;
  }

  setHint(`Found ${tracks.length} track(s).`, "success");

  tracks.forEach((track) => {
    const item = document.createElement("li");
    item.className = "result-item";

    const meta = document.createElement("div");
    meta.className = "result-meta";

    const title = document.createElement("h3");
    title.className = "result-title";
    title.textContent = track.name ?? "Unknown track";

    const subtitle = document.createElement("p");
    subtitle.className = "result-subtitle";
    subtitle.textContent = `${track.artists ?? "Unknown"} · ${track.album ?? "Unknown album"} · ${track.duration}`;

    meta.appendChild(title);
    meta.appendChild(subtitle);

    const actions = document.createElement("div");
    actions.className = "result-actions";
    const playBtn = document.createElement("button");
    playBtn.textContent = "Play";
    playBtn.addEventListener("click", () => playTrack(track.uri));
    actions.appendChild(playBtn);

    item.appendChild(meta);
    item.appendChild(actions);
    resultsList.appendChild(item);
  });
}

async function performSearch(event) {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) {
    setHint("Please enter a search query.", "error");
    return;
  }

  setHint("Searching…");
  resultsList.innerHTML = "";

  try {
    const api = getApi();
    if (!api?.search_tracks) {
      setHint("Bridge not ready yet. Please retry shortly.", "error");
      return;
    }
    const response = await api.search_tracks(query);
    renderResults(response?.tracks ?? []);
  } catch (error) {
    console.error(error);
    setHint("Search failed. Check console for details.", "error");
  }
}

if (backButton) {
  backButton.addEventListener("click", () => navigate("home"));
}

if (form) {
  form.addEventListener("submit", performSearch);
}

setHint("Enter a keyword to begin.");

function getApi() {
  return window.pywebview?.api ?? null;
}

if (!getApi()) {
  window.addEventListener("pywebviewready", () => setHint("Bridge ready. Enter a keyword to begin."));
}
