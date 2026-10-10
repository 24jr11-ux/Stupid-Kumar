export function applyPlayerVolume(player, value) {
  const volume = Math.max(0, Math.min(100, Number(value) || 0));
  player.setVolume(volume);
  if (volume === 0) player.mute();
  else player.unMute();
  return volume;
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
