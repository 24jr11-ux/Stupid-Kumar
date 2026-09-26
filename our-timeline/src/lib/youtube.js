let apiPromise;

export function loadYoutubeApi() {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;
  apiPromise = new Promise((resolve, reject) => {
    let script = document.querySelector('script[data-timeline-youtube]');
    const previousReady = window.onYouTubeIframeAPIReady;
    const timeout = window.setTimeout(() => fail(), 15000);
    function fail() {
      window.clearTimeout(timeout);
      window.onYouTubeIframeAPIReady = previousReady;
      script?.remove();
      apiPromise = undefined;
      reject(new Error("YouTube could not load. Check your connection and try again."));
    }
    window.onYouTubeIframeAPIReady = () => {
      window.clearTimeout(timeout);
      window.onYouTubeIframeAPIReady = previousReady;
      resolve(window.YT);
      previousReady?.();
    };
    if (!script) {
      script = document.createElement("script");
      script.src = "https://www.youtube.com/iframe_api";
      script.async = true;
      script.dataset.timelineYoutube = "true";
      script.addEventListener("error", fail, { once: true });
      document.head.appendChild(script);
    }
  });
  return apiPromise;
}
