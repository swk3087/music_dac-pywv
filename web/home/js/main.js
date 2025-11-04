const api = window.pywebview ? window.pywebview.api : null;
const statusText = document.getElementById("status-text");

function setStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

async function navigate(screen) {
  setStatus(`Opening ${screen}…`);
  try {
    if (api && api.navigate) {
      const result = await api.navigate(screen);
      if (!result?.success) {
        throw new Error("navigation failed");
      }
    } else {
      console.info("pywebview API unavailable; navigation is disabled.");
    }
  } catch (error) {
    console.error(error);
    setStatus("Unable to switch screens. Check console for details.");
    return;
  }
  setStatus(`Switched to ${screen}.`);
}

document.querySelectorAll(".nav-button").forEach((button) => {
  button.addEventListener("click", () => {
    const screen = button.dataset.screen;
    navigate(screen);
  });
});

setStatus("Ready.");
