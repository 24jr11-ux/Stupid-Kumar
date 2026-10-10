export function resetPlayerPlayback(player) {
  player.pauseVideo();
  player.seekTo(0, true);
  // Seeking a finished YouTube video can change its playback state.
  player.pauseVideo();
}

export function applyPlayerVolume(player, value) {
  const volume = Math.max(0, Math.min(100, Number(value) || 0));
  player.setVolume(volume);
  if (volume === 0) player.mute();
  else player.unMute();
  return volume;
}

export function uprightRewindFrames(transform) {
  // Reading the displayed matrix also handles replay pressed during a rewind.
  const values = transform?.match(/^matrix(?:3d)?\(([^)]+)\)$/)?.[1].split(",").map(Number);
  const angle = values ? (Math.atan2(values[1], values[0]) * 180 / Math.PI + 360) % 360 : 0;
  return [
    { transform: `rotate(${angle}deg)` },
    { transform: "rotate(-375deg)", offset: 0.75 },
    { transform: "rotate(-360deg)", offset: 0.9 },
    { transform: "rotate(-360deg)" },
  ];
}

// Sixteen hearts per two-second press. Keeping a count, rather than a timeout,
// means rapid presses add their entire streams without losing emissions.
export function createHeartStream({ emit, schedule = setInterval, cancel = clearInterval }) {
  let remaining = 0;
  let interval = null;
  const tick = () => {
    if (remaining === 0) {
      cancel(interval);
      interval = null;
      return;
    }
    remaining -= 1;
    emit();
  };
  return {
    press() {
      remaining += 16;
      if (interval === null) {
        interval = schedule(tick, 125);
        tick();
      }
    },
    dispose() {
      if (interval !== null) cancel(interval);
      interval = null;
      remaining = 0;
    },
  };
}
