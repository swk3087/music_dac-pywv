const statusText = document.getElementById("status-text");
const navButtons = Array.from(document.querySelectorAll(".nav-button"));
let focusedIndex = 0;

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

navButtons.forEach((button, index) => {
  button.addEventListener("click", () => {
    const screen = button.dataset.screen;
    navigate(screen);
  });

  button.addEventListener("focus", () => {
    focusedIndex = index;
    updateFocusedState();
  });
});

function updateFocusedState() {
  navButtons.forEach((button, index) => {
    button.classList.toggle("is-focused", index === focusedIndex);
  });
}

function focusButton(index) {
  if (!navButtons.length) return;
  focusedIndex = (index + navButtons.length) % navButtons.length;
  navButtons[focusedIndex].focus({ preventScroll: true });
  updateFocusedState();
}

function handleKeyNavigation(event) {
  switch (event.key) {
    case "ArrowDown":
    case "ArrowRight":
      event.preventDefault();
      focusButton(focusedIndex + 1);
      break;
    case "ArrowUp":
    case "ArrowLeft":
      event.preventDefault();
      focusButton(focusedIndex - 1);
      break;
    case "Enter":
    case " ":
      event.preventDefault();
      navButtons[focusedIndex]?.click();
      break;
    default:
      break;
  }
}

if (navButtons.length) {
  focusButton(focusedIndex);
  document.addEventListener("keydown", handleKeyNavigation);
}

setStatus("Ready.");

function getApi() {
  return window.pywebview?.api ?? null;
}

if (!getApi()) {
  window.addEventListener("pywebviewready", () => setStatus("Ready."));
}
