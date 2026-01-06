export type Theme = "light" | "dark";

const STORAGE_KEY = "taskchi:theme";

function preferredTheme(): Theme {
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function getTheme(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

export function applyTheme(theme: Theme) {
  const isDark = theme === "dark";
  document.documentElement.classList.toggle("dark", isDark);
  // align native UI (scrollbars/forms) with theme
  document.documentElement.style.colorScheme = isDark ? "dark" : "light";
  localStorage.setItem(STORAGE_KEY, theme);
}

export function initTheme(): Theme {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "light" || saved === "dark") {
    applyTheme(saved);
    return saved;
  }

  const pref = preferredTheme();
  applyTheme(pref);
  return pref;
}

export function toggleTheme(): Theme {
  const next: Theme = getTheme() === "dark" ? "light" : "dark";
  applyTheme(next);
  return next;
}
