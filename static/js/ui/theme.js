// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

const LOCAL_STORAGE_THEME_KEY = "theme";
const CSS_CLASS_LIGHT_MODE = "light-mode";
const THEME_STATE_LIGHT = "light";
const THEME_STATE_DARK = "dark";

// =========================================================================
// THEME INITIALIZATION
// =========================================================================

/**
 * Initializes the theme system by loading saved preferences from localStorage
 * and attaching toggle listeners to the theme switch button.
 */
function initializeTheme() {
  // Apply saved theme state on initial page load
  if (localStorage.getItem(LOCAL_STORAGE_THEME_KEY) === THEME_STATE_LIGHT) {
    document.body.classList.add(CSS_CLASS_LIGHT_MODE);
  }

  // Cache DOM element to prevent redundant queries
  const themeToggleButton = document.getElementById("theme-toggle");

  if (themeToggleButton) {
    themeToggleButton.addEventListener("click", () => {
      // classList.toggle returns true if added, false if removed
      const isLightMode = document.body.classList.toggle(CSS_CLASS_LIGHT_MODE);

      localStorage.setItem(
        LOCAL_STORAGE_THEME_KEY,
        isLightMode ? THEME_STATE_LIGHT : THEME_STATE_DARK,
      );
    });
  } else {
    console.warn(
      "[WARN] Theme toggle button (#theme-toggle) not found in DOM.",
    );
  }
}

// Execute initialization immediately on module import
initializeTheme();
