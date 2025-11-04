const backButton = document.querySelector(".back-button");
const form = document.getElementById("ai-form");
const input = document.getElementById("ai-input");
const hint = document.getElementById("ai-hint");
const suggestionsContainer = document.getElementById("suggestions");
const resultsList = document.getElementById("results-list");

function setHint(message, tone = "info") {
  if (!hint) return;
  hint.textContent = message;
  if (tone === "error") {
    hint.style.color = "#ff9090";
  } else if (tone === "success") {
    hint.style.color = "#8df2b2";
  } else {
    hint.style.color = "rgba(255,255,255,0.7)";
  }
}

async function navigate(screen) {
  const api = getApi();
  if (!api?.navigate) {
    setHint("Bridge not ready. Please try again shortly.", "error");
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
    setHint("Playback bridge not ready yet.", "error");
    return;
  }
  try {
    const result = await api.play_track(uri);
    if (!result?.success) {
      throw new Error("Playback failed");
    }
    await api.navigate("player");
  } catch (error) {
    console.error(error);
    setHint("Unable to start playback.", "error");
  }
}

function renderResults(tracks) {
  resultsList.innerHTML = "";
  if (!tracks?.length) {
    setHint("No tracks found for that suggestion.", "error");
    return;
  }

  setHint(`Showing ${tracks.length} track(s).`, "success");

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

async function runSearch(query) {
  if (!query) return;
  setHint(`Searching Spotify for "${query}"…`);
  resultsList.innerHTML = "";

  try {
    const api = getApi();
    if (!api?.search_tracks) {
      setHint("Bridge not ready. Please wait a moment.", "error");
      return;
    }
    const response = await api.search_tracks(query);
    renderResults(response?.tracks ?? []);
  } catch (error) {
    console.error(error);
    setHint("Search failed. Check console for details.", "error");
  }
}

function renderSuggestions(suggestions) {
  suggestionsContainer.innerHTML = "";
  if (!suggestions?.length) {
    const placeholder = document.createElement("p");
    placeholder.textContent = "No suggestions generated. Try another prompt.";
    suggestionsContainer.appendChild(placeholder);
    return;
  }

  suggestions.forEach((text) => {
    const chip = document.createElement("button");
    chip.className = "suggestion-chip";
    chip.textContent = text;
    chip.addEventListener("click", () => runSearch(text));
    suggestionsContainer.appendChild(chip);
  });
}

async function requestSuggestions(event) {
  event.preventDefault();
  const query = input.value.trim();
  if (!query) {
    setHint("Please describe the music you want.", "error");
    return;
  }

  setHint("Asking Gemini for ideas…");
  suggestionsContainer.innerHTML = "";
  resultsList.innerHTML = "";

  try {
    const api = getApi();
    if (!api?.ai_suggestions) {
      setHint("Bridge not ready yet. Try again in a moment.", "error");
      return;
    }
    const response = await api.ai_suggestions(query);
    renderSuggestions(response?.suggestions ?? []);
    setHint("Tap a suggestion to search Spotify.", "success");
  } catch (error) {
    console.error(error);
    setHint("AI suggestion failed. Check console for details.", "error");
  }
}

if (backButton) {
  backButton.addEventListener("click", () => navigate("home"));
}

if (form) {
  form.addEventListener("submit", requestSuggestions);
}

setHint("Ask for a vibe or scenario to get started.");

function getApi() {
  return window.pywebview?.api ?? null;
}

if (!getApi()) {
  window.addEventListener("pywebviewready", () => setHint("Bridge ready. Ask for a vibe to begin.", "info"));
}
