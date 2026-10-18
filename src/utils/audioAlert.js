let audioCtx = null;

const getAudioContext = () => {
  if (!audioCtx && typeof window !== 'undefined') {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
};

/**
 * Play a clear 4-note melodic chime (C5 -> E5 -> G5 -> C6) when a customer places an order
 */
export const playNewOrderChime = () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const notes = [
      { freq: 523.25, time: 0.0, duration: 0.12 }, // C5
      { freq: 659.25, time: 0.12, duration: 0.12 }, // E5
      { freq: 783.99, time: 0.24, duration: 0.14 }, // G5
      { freq: 1046.5, time: 0.38, duration: 0.35 }, // C6
    ];

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.3, ctx.currentTime);
    masterGain.connect(ctx.destination);

    notes.forEach(({ freq, time, duration }) => {
      const startTime = ctx.currentTime + time;
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      noteGain.gain.setValueAtTime(0.001, startTime);
      noteGain.gain.linearRampToValueAtTime(0.4, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc.connect(noteGain);
      noteGain.connect(masterGain);

      osc.start(startTime);
      osc.stop(startTime + duration + 0.05);
    });
  } catch (err) {
    console.warn('[AudioAlert] Web Audio playback failed:', err);
  }
};

/**
 * Show a browser desktop notification
 */
export const showDesktopNotification = (order) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      const title = `🔔 New Order Placed: ৳${order.totalAmount}`;
      const options = {
        body: `Invoice #${order.invoiceNumber} by ${order.customerDetails?.name || 'Customer'}\nItems: ${order.items?.length || 1} item(s)`,
        icon: '/favicon.ico',
        tag: `order-${order.invoiceNumber}`,
      };
      new Notification(title, options);
    } catch {
      // ignore
    }
  }
};

