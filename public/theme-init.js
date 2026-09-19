// Classic head script: apply the root contract before the body or React can paint.
(() => {
  const key = "rt.profile.preferences";
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const listeners = new Set();

  function normalize(value) {
    const object = value && typeof value === "object" && !Array.isArray(value) ? value : {};
    return {
      ...object,
      theme: ["light", "dark", "system"].includes(object.theme) ? object.theme : "system",
      density: object.density === "comfortable" ? "comfortable" : "compact",
      emailNotifications: typeof object.emailNotifications === "boolean" ? object.emailNotifications : true,
    };
  }

  function read(fallback) {
    try {
      return normalize(JSON.parse(window.localStorage.getItem(key)));
    } catch {
      return fallback ?? normalize(null);
    }
  }

  function snapshot(preferences, persistenceError = null) {
    return {
      preferences,
      preferenceTheme: preferences.theme,
      effectiveTheme: preferences.theme === "system" ? (media.matches ? "dark" : "light") : preferences.theme,
      persistenceError,
    };
  }

  let state = snapshot(read());
  function apply() {
    document.documentElement.dataset.theme = state.effectiveTheme;
    document.documentElement.style.colorScheme = state.effectiveTheme;
  }
  function publish(preferences, error = null) {
    state = snapshot(preferences, error);
    apply();
    listeners.forEach(listener => listener());
  }
  function onMedia() {
    if (state.preferenceTheme === "system") publish(state.preferences, state.persistenceError);
  }
  function onStorage(event) {
    if (event.key === key || event.key === null) publish(read());
  }
  function updatePreferences(patch) {
    const current = state.persistenceError ? state.preferences : read(state.preferences);
    const next = normalize({ ...current, ...patch });
    let error = null;
    try {
      window.localStorage.setItem(key, JSON.stringify(next));
    } catch {
      error = "Preferences could not be saved in this browser. Changes apply for this session only.";
    }
    publish(next, error);
    return error === null;
  }

  apply();
  window.rtTheme = {
    getSnapshot: () => state,
    updatePreferences,
    setPreference: theme => updatePreferences({ theme }),
    subscribe(listener) {
      if (listeners.size === 0) {
        media.addEventListener("change", onMedia);
        window.addEventListener("storage", onStorage);
        // Reconcile changes between head initialization and React mounting.
        state = snapshot(state.persistenceError ? state.preferences : read(), state.persistenceError);
        apply();
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        if (listeners.size === 0) {
          media.removeEventListener("change", onMedia);
          window.removeEventListener("storage", onStorage);
        }
      };
    },
  };
})();
