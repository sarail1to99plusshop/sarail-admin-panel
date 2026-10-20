let audioCtx = null;

// Initialize or return existing AudioContext
export const getAudioContext = () => {
  if (typeof window === 'undefined') return null;

  if (!audioCtx) {
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

// Auto-unlock AudioContext on first user interaction anywhere on the page
if (typeof window !== 'undefined') {
  const unlockAudioContext = () => {
    try {
      const ctx = getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }
    } catch {
      // ignore
    }
  };

  ['click', 'keydown', 'touchstart'].forEach((eventType) => {
    window.addEventListener(eventType, unlockAudioContext, {
      capture: true,
      passive: true,
      once: false,
    });
  });
}

/**
 * Play a loud, crisp, pleasant melodic store chime (E5 -> G#5 -> B5 -> E6)
 * Uses harmonic dual-oscillators (sine + triangle) for high audibility.
 */
export const playNewOrderChime = async () => {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      await ctx.resume().catch(() => {});
    }

    // Melodic progression: E5, G#5, B5, E6 (Major Chord Arpeggio)
    const notes = [
      { freq: 659.25, time: 0.0, duration: 0.12 }, // E5
      { freq: 830.61, time: 0.11, duration: 0.12 }, // G#5
      { freq: 987.77, time: 0.22, duration: 0.14 }, // B5
      { freq: 1318.51, time: 0.35, duration: 0.4 },  // E6 (ringing bell tone)
    ];

    const masterGain = ctx.createGain();
    // High audibility master volume
    masterGain.gain.setValueAtTime(0.7, ctx.currentTime);
    masterGain.connect(ctx.destination);

    notes.forEach(({ freq, time, duration }) => {
      const startTime = ctx.currentTime + time;

      // Primary sine oscillator for smooth fundamental tone
      const osc1 = ctx.createOscillator();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(freq, startTime);

      // Secondary triangle oscillator for pleasant bell overtone
      const osc2 = ctx.createOscillator();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(freq * 2, startTime);

      const noteGain = ctx.createGain();
      noteGain.gain.setValueAtTime(0.001, startTime);
      noteGain.gain.linearRampToValueAtTime(0.65, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

      osc1.connect(noteGain);
      osc2.connect(noteGain);
      noteGain.connect(masterGain);

      osc1.start(startTime);
      osc1.stop(startTime + duration + 0.05);
      osc2.start(startTime);
      osc2.stop(startTime + duration + 0.05);
    });
  } catch (err) {
    console.warn('[AudioAlert] Web Audio playback failed:', err);
  }
};

/**
 * Show a browser desktop notification
 * Supports both raw order objects and structured { title, body, tag } objects
 */
export const showDesktopNotification = (input) => {
  if (typeof window === 'undefined' || !('Notification' in window)) return;

  if (Notification.permission === 'granted') {
    try {
      let title = '🔔 New Order Placed!';
      let body = 'A new customer order has arrived.';
      let tag = 'sarail-new-order';

      if (input && typeof input === 'object') {
        if (input.title) {
          title = input.title;
          body = input.body || body;
          tag = input.tag || tag;
        } else {
          title = `🔔 New Order: ৳${input.totalAmount || ''}`;
          body = `Invoice #${input.invoiceNumber || ''} by ${input.customerDetails?.name || 'Customer'}\nItems: ${input.items?.length || 1}`;
          tag = `order-${input.invoiceNumber || Date.now()}`;
        }
      }

      const notif = new Notification(title, {
        body,
        icon: '/favicon.ico',
        tag,
      });

      notif.onclick = () => {
        try {
          window.focus();
        } catch {
          // ignore
        }
      };
    } catch {
      // ignore
    }
  }
};


