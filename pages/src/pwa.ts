const serviceWorkerUrl = `${import.meta.env.BASE_URL}sw.js`;

export const registerPwa = () => {
  if (!("serviceWorker" in navigator)) return;

  window.addEventListener("load", () => {
    void navigator.serviceWorker.register(serviceWorkerUrl, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: "none",
    }).then((registration) => {
      const checkForUpdate = () => void registration.update();
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") checkForUpdate();
      });
    }).catch(() => {
      // Offline support is optional; the app must keep working if registration fails.
    });
  }, { once: true });
};
