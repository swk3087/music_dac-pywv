const statusText = document.getElementById("status-text");

function setStatus(message) {
  if (statusText) {
    statusText.textContent = message;
  }
}

async function navigate(screen) {
  setStatus(`Opening ${screen}…`);
  try {
    const api = getApi();
    if (!api?.navigate) {
      setStatus("Bridge not ready yet. Please wait a second and try again.");
      return;
    }

    const result = await api.navigate(screen);
    if (!result?.success) {
      throw new Error("navigation failed");
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

function getApi() {
  return window.pywebview?.api ?? null;
}

if (!getApi()) {
  window.addEventListener("pywebviewready", () => setStatus("Ready."));
}
