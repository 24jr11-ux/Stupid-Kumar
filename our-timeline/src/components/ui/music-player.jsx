"use client";

// Adapted from Componentry's MusicPlayer: https://componentry.dev/r/music-player.json
// Keeps the circular record and swinging tonearm; uses confirmed YouTube events.
import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Heart, Loader2, Pause, Play, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import { youtubeVideoId, youtubeCoverUrls } from "@/lib/player";
import { loadYoutubeApi } from "@/lib/youtube";
import { cropImageStyle } from "@/lib/imageCrop";
import { applyPlayerVolume, createHeartStream, resetPlayerPlayback, uprightRewindFrames } from "@/lib/recordPlayer";

export function MusicPlayer({ src, coverArt, coverPosition, coverZoom, title = "song", className, onCoverChange, artworkControls, children }) {
  const id = youtubeVideoId(src);
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const volumeRef = useRef(65);
  const rewindRef = useRef(null);
  const spinAnimationRef = useRef(null);
  const rewindAnimationRef = useRef(null);
  const rewindGenerationRef = useRef(0);
  const heartStreamRef = useRef(null);
  const heartNumberRef = useRef(0);
  const [ready, setReady] = useState(false);
  const [state, setState] = useState(-1);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [artwork, setArtwork] = useState(null);
  const [volume, setVolume] = useState(65);
  const [rewinding, setRewinding] = useState(false);
  const [greenFlash, setGreenFlash] = useState(0);
  const [greenFlashing, setGreenFlashing] = useState(false);
  const [knobTurn, setKnobTurn] = useState(0);
  const [hearts, setHearts] = useState([]);
  const reducedMotion = useReducedMotion();
  const isPlaying = state === 1;
  const coverUrls = id ? [...new Set([coverArt, ...youtubeCoverUrls(id)].filter(Boolean))] : [];
  const coverIndex = artwork?.source === coverArt ? artwork.index : 0;
  const cover = coverUrls[coverIndex];

  useEffect(() => {
    const record = rewindRef.current;
    if (!record || reducedMotion) return;
    const spin = record.animate([{ transform: "rotate(0deg)" }, { transform: "rotate(360deg)" }], {
      duration: 4000, iterations: Infinity,
    });
    spin.pause();
    spinAnimationRef.current = spin;
    return () => { spin.cancel(); spinAnimationRef.current = null; };
  }, [reducedMotion]);

  useEffect(() => {
    const spin = spinAnimationRef.current;
    if (!spin) return;
    if (isPlaying && !rewinding) spin.play();
    else spin.pause();
  }, [isPlaying, rewinding, reducedMotion]);

  useEffect(() => () => {
    heartStreamRef.current?.dispose();
    rewindGenerationRef.current += 1;
    rewindAnimationRef.current?.cancel();
  }, []);

  useEffect(() => {
    if (!id) return;
    let disposed = false;
    let player;
    let readyTimeout;
    const container = hostRef.current;
    loadYoutubeApi().then((YT) => {
      if (disposed) return;
      const mount = document.createElement("div");
      container.appendChild(mount);
      readyTimeout = window.setTimeout(() => {
        if (!disposed) setError("YouTube is taking too long to load. Try again.");
      }, 20000);
      player = new YT.Player(mount, {
        width: 200,
        height: 200,
        videoId: id,
        playerVars: { playsinline: 1, controls: 0, origin: window.location.origin },
        events: {
          onReady: (event) => {
            if (disposed) return;
            window.clearTimeout(readyTimeout);
            const iframe = event.target.getIframe();
            iframe.title = "YouTube song playback";
            iframe.tabIndex = -1;
            iframe.setAttribute("aria-hidden", "true");
            iframe.referrerPolicy = "strict-origin-when-cross-origin";
            applyPlayerVolume(event.target, volumeRef.current);
            setReady(true);
          },
          onStateChange: (event) => {
            if (disposed) return;
            setState(event.data);
            if (event.data === 1) setError("");
          },
          onError: (event) => {
            if (disposed) return;
            window.clearTimeout(readyTimeout);
            setState(-1);
            setError([100, 101, 150].includes(event.data)
              ? "This video is unavailable or does not allow playback here. Choose another YouTube link."
              : "YouTube could not play this song. Try again or choose another link.");
          },
          onAutoplayBlocked: () => {
            if (!disposed) {
              setState(2);
              setError("Playback was blocked by your browser. Click play again.");
            }
          },
        },
      });
      playerRef.current = player;
    }).catch((err) => {
      if (!disposed) setError(err.message);
    });
    return () => {
      disposed = true;
      window.clearTimeout(readyTimeout);
      playerRef.current = null;
      player?.destroy();
      container.replaceChildren();
    };
  }, [id, attempt]);

  function togglePlay() {
    const player = playerRef.current;
    if (!ready || !player) return;
    rewindGenerationRef.current += 1;
    rewindAnimationRef.current?.cancel();
    setRewinding(false);
    if (isPlaying || state === 3) player.pauseVideo();
    else {
      if (state === 0) player.seekTo(0, true);
      applyPlayerVolume(player, volumeRef.current);
      player.playVideo();
    }
  }

  function restart() {
    const player = playerRef.current;
    if (!ready || !player) return;
    const generation = ++rewindGenerationRef.current;
    setKnobTurn((count) => count + 1);
    player.pauseVideo();
    setState(2);
    const frames = uprightRewindFrames(rewindRef.current ? getComputedStyle(rewindRef.current).transform : "none");
    rewindAnimationRef.current?.cancel();
    spinAnimationRef.current?.pause();
    if (spinAnimationRef.current) spinAnimationRef.current.currentTime = 0;
    const replay = () => {
      if (generation !== rewindGenerationRef.current || player !== playerRef.current) return;
      rewindAnimationRef.current?.cancel();
      rewindAnimationRef.current = null;
      setRewinding(false);
      resetPlayerPlayback(player);
      setState(2);
    };
    if (reducedMotion || !rewindRef.current) { replay(); return; }
    setRewinding(true);
    const animation = rewindRef.current.animate(frames, {
      duration: 420, easing: "cubic-bezier(0.2, 0.65, 0.3, 1)", fill: "forwards",
    });
    rewindAnimationRef.current = animation;
    animation.finished.then(replay, () => {});
  }

  function changeVolume(value) {
    const next = Math.max(0, Math.min(100, Number(value)));
    volumeRef.current = next;
    setVolume(next);
    if (ready && playerRef.current) applyPlayerVolume(playerRef.current, next);
  }

  function flashGatsbyLight() {
    setGreenFlashing(true);
    setGreenFlash((count) => count + 1);
  }

  function sendHearts() {
    if (!heartStreamRef.current) {
      heartStreamRef.current = createHeartStream({ emit: () => {
        const number = ++heartNumberRef.current;
        const now = performance.now();
        setHearts((previous) => [...previous.filter((heart) => now - heart.born < 1200), {
          id: number, born: now, drift: [-18, 12, -8, 22, 3, -24][number % 6],
          tilt: [-18, 12, -9, 17][number % 4],
        }]);
      } });
    }
    heartStreamRef.current.press();
  }

  return (
    <div className={cn("record-player", className)}>
      <div ref={hostRef} className="pointer-events-none absolute h-px w-px overflow-hidden opacity-0" aria-hidden="true" />
      <span className="console-power">
        <span key={greenFlash} className={`console-led ${isPlaying ? "console-led--on" : ""} ${greenFlashing ? "console-led--gatsby" : ""}`}
          onAnimationEnd={() => setGreenFlashing(false)} aria-hidden="true" />
        <span className="sr-only">{greenFlashing ? "Signal light flashing green" : isPlaying ? "Signal light pulsing red" : "Signal light off"}</span>
      </span>
      <div className="console-copy">
      <label className="console-volume">
        <input type="range" min="0" max="100" step="1" value={volume}
          onChange={(event) => changeVolume(event.target.value)} aria-label={`Volume for ${title}`}
          aria-orientation="vertical"
          aria-valuetext={volume === 0 ? "Muted" : `${volume} percent`} />
      </label>
      {children}
      </div>
      <div className="console-switches">
      <button type="button" onClick={sendHearts} className="console-love console-round-button"
        aria-label="Send a stream of hearts">
        <span aria-hidden="true" className="console-hearts">
          {hearts.map((heart) => <Heart key={heart.id} size={12} fill="currentColor" className="console-floating-heart"
            style={{ "--heart-drift": `${heart.drift}px`, "--heart-tilt": `${heart.tilt}deg` }}
            onAnimationEnd={() => setHearts((previous) => previous.filter((item) => item.id !== heart.id))} />)}
        </span>
      </button>
      <button type="button" onClick={flashGatsbyLight} aria-label="Flash the signal light green"
        className="console-gatsby console-round-button" />
      <span className="console-speaker" aria-hidden="true" />
      </div>
      <div className="memory-vinyl relative shrink-0">
      <div className="console-transport">
        <button type="button" onClick={restart} disabled={!ready} aria-label={`Restart ${title}`} title="Replay" className="console-replay console-round-button">
          <span key={knobTurn} aria-hidden="true" className={`console-replay-knob ${knobTurn ? "console-replay-knob--turn" : ""}`} />
          <RotateCcw size={13} aria-hidden="true" />
        </button>
      </div>
      <button
        type="button"
        onClick={togglePlay}
        disabled={!ready || !id}
        aria-label={`${isPlaying || state === 3 ? "Pause" : "Play"} ${title}`}
        aria-pressed={isPlaying}
        className="vinyl-platter group relative block aspect-square w-full rounded-full outline-none focus-visible:ring-2 focus-visible:ring-[#76513E] focus-visible:ring-offset-4 focus-visible:ring-offset-black disabled:cursor-wait"
      >
        <div
          ref={rewindRef}
          className="relative h-full w-full overflow-hidden rounded-full border-[5px] border-[#202020] bg-[#252525] shadow-[0_4px_18px_rgba(0,0,0,0.5)]"
        >
          {cover && (
            // Raw image allows thumbnail resolution fallback without introducing image-host config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={cover}
              src={cover}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-85"
              style={cropImageStyle(coverPosition, coverZoom)}
              onLoad={(event) => {
                // Missing max-resolution thumbnails can return a 120px placeholder with HTTP 200.
                if (event.currentTarget.naturalWidth <= 120 && coverIndex < coverUrls.length - 1) {
                  setArtwork({ source: coverArt, index: coverIndex + 1 });
                } else onCoverChange?.(cover);
              }}
              onError={() => setArtwork({ source: coverArt, index: coverIndex + 1 })}
            />
          )}
          <div className="absolute inset-0 rounded-full" style={{ background: "repeating-radial-gradient(circle,transparent 0 8%,rgba(0,0,0,.35) 9%,transparent 10%)" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(135deg,rgba(255,255,255,.25),transparent 40%,transparent 60%,rgba(255,255,255,.15))" }} />
          <div className="absolute left-1/2 top-1/2 flex h-1/4 w-1/4 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[#74544B] bg-[#2D1E1A]">
            <span className="h-2 w-2 rounded-full bg-[#D4C8BA]" />
          </div>
        </div>
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute right-0 top-0 z-10 h-3 w-[58%] origin-right"
          initial={false}
          animate={{ rotate: isPlaying ? -24 : -5 }}
          transition={{ duration: reducedMotion ? 0 : 0.45 }}
        >
          <div className="absolute right-0 top-0 h-4 w-4 rounded-full border-2 border-[#D4C8BA] bg-[#74544B] shadow-md" />
          <div className="absolute right-2 top-1 h-1.5 w-[90%] origin-right -rotate-12 rounded-full bg-[#D4C8BA] shadow-md">
            <span className="absolute -left-1 -top-0.5 h-2.5 w-3 rounded-sm bg-[#76513E]" />
          </div>
        </motion.div>
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/15 transition group-hover:bg-black/30">
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-[#D4C8BA]/40 bg-[#2D1E1A]/90 text-[#FAF7F2]">
            {!ready && !error || state === 3 ? <Loader2 size={14} className="animate-spin" /> : isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </span>
        </span>
      </button>
      {artworkControls}
      </div>
      {error && (
        <div className="console-error mt-2 text-xs text-[#8D422B]" role="status">
          {error}
          <button type="button" className="mt-1 block underline" onClick={() => { setReady(false); setState(-1); setError(""); setAttempt((n) => n + 1); }}>Try again</button>
        </div>
      )}
    </div>
  );
}
