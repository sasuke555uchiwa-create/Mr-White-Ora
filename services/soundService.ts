import { getSettings } from './storageService';

export type SoundType =
  | 'click'
  | 'reveal'
  | 'dramatic'
  | 'win'
  | 'vote'
  | 'pop'
  | 'mystery'
  | 'trumpets_sad'
  | 'cardFlip'
  | 'passPhone'
  | 'tick'
  | 'timeUp'
  | 'shield'
  | 'boomerang'
  | 'eliminate'
  | 'mrWhiteCaught'
  | 'mrWhiteWin'
  | 'startGame'
  | 'error'
  | 'dossierOpen'
  | 'accessGranted'
  | 'roleReveal'
  | 'handoff'
  | 'voteConfirm'
  | 'voteClose'
  | 'abilityActivate'
  | 'guessPhase'
  | 'verdict';

export interface SoundEffectMeta {
  id: SoundType;
  labels: { ar: string; en: string; fr: string };
}

export const SOUND_EFFECT_LIST: SoundEffectMeta[] = [
  { id: 'click', labels: { ar: 'نقرة', en: 'Click', fr: 'Clic' } },
  { id: 'cardFlip', labels: { ar: 'قلب البطاقة', en: 'Card Flip', fr: 'Carte' } },
  { id: 'reveal', labels: { ar: 'كشف الكلمة', en: 'Reveal', fr: 'Révéler' } },
  { id: 'passPhone', labels: { ar: 'تمرير الهاتف', en: 'Pass Phone', fr: 'Passer' } },
  { id: 'tick', labels: { ar: 'تكة المؤقت', en: 'Timer Tick', fr: 'Tic-Tac' } },
  { id: 'timeUp', labels: { ar: 'انتهاء الوقت', en: 'Time Up', fr: 'Fin Temps' } },
  { id: 'vote', labels: { ar: 'ختم التصويت', en: 'Vote Stamp', fr: 'Vote' } },
  { id: 'shield', labels: { ar: 'درع Mr. Shield', en: 'Mr. Shield', fr: 'Bouclier' } },
  { id: 'boomerang', labels: { ar: 'ارتداد Boomerang', en: 'Boomerang', fr: 'Boomerang' } },
  { id: 'eliminate', labels: { ar: 'إقصاء', en: 'Eliminate', fr: 'Éliminer' } },
  { id: 'mrWhiteCaught', labels: { ar: 'كشف Mr. White', en: 'Mr. White', fr: 'Mr. White' } },
  { id: 'mrWhiteWin', labels: { ar: 'سرقة الفوز', en: 'Heist Win', fr: 'Victoire MW' } },
  { id: 'win', labels: { ar: 'فوز', en: 'Victory', fr: 'Victoire' } },
  { id: 'trumpets_sad', labels: { ar: 'خسارة ساخرة', en: 'Sad Brass', fr: 'Trompette' } },
  { id: 'startGame', labels: { ar: 'بدء الجولة', en: 'Game Start', fr: 'Départ' } },
  { id: 'dossierOpen', labels: { ar: 'فتح ملف سري', en: 'Open Dossier', fr: 'Dossier' } },
  { id: 'accessGranted', labels: { ar: 'منح الصلاحية', en: 'Access Granted', fr: 'Accès' } },
  { id: 'roleReveal', labels: { ar: 'كشف الهوية', en: 'Role Reveal', fr: 'Identité' } },
  { id: 'handoff', labels: { ar: 'تمرير مشفّر', en: 'Secure Handoff', fr: 'Relais' } },
  { id: 'voteConfirm', labels: { ar: 'تأكيد التصويت', en: 'Vote Confirm', fr: 'Confirmation' } },
  { id: 'voteClose', labels: { ar: 'إغلاق الصندوق', en: 'Ballot Sealed', fr: 'Urne scellée' } },
  { id: 'abilityActivate', labels: { ar: 'تفعيل قدرة', en: 'Ability Trigger', fr: 'Pouvoir' } },
  { id: 'guessPhase', labels: { ar: 'طور التخمين', en: 'Guess Override', fr: 'Intrusion' } },
  { id: 'verdict', labels: { ar: 'الحكم النهائي', en: 'Final Verdict', fr: 'Verdict' } },
];

let audioContext: AudioContext | null = null;
let masterBus: { compressor: DynamicsCompressorNode; gain: GainNode } | null = null;
let cachedWhiteNoise: AudioBuffer | null = null;
let unlockBound = false;

const getContext = (): AudioContext | null => {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }

  if (audioContext && !unlockBound) {
    unlockBound = true;
    const unlock = () => {
      if (audioContext && audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
      }
    };
    window.addEventListener('pointerdown', unlock, { passive: true, once: true });
    window.addEventListener('touchstart', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
  }

  return audioContext;
};

const getMasterDestination = (ctx: AudioContext, volume: number): GainNode => {
  if (!masterBus || masterBus.gain.context !== ctx) {
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-14, ctx.currentTime);
    compressor.knee.setValueAtTime(18, ctx.currentTime);
    compressor.ratio.setValueAtTime(6, ctx.currentTime);
    compressor.attack.setValueAtTime(0.002, ctx.currentTime);
    compressor.release.setValueAtTime(0.15, ctx.currentTime);

    const gain = ctx.createGain();
    compressor.connect(gain);
    gain.connect(ctx.destination);
    masterBus = { compressor, gain };
  }

  const eventGain = ctx.createGain();
  eventGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), ctx.currentTime);
  eventGain.connect(masterBus.compressor);
  return eventGain;
};

const getNoiseBuffer = (ctx: AudioContext): AudioBuffer => {
  if (cachedWhiteNoise && cachedWhiteNoise.sampleRate === ctx.sampleRate) {
    return cachedWhiteNoise;
  }
  const length = ctx.sampleRate; // 1 second buffer
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  cachedWhiteNoise = buffer;
  return buffer;
};

const playTone = (
  ctx: AudioContext,
  dest: AudioNode,
  opts: {
    type?: OscillatorType;
    freq: number;
    endFreq?: number;
    startTime: number;
    duration: number;
    attack?: number;
    peakGain: number;
    filterFreq?: number;
    filterEndFreq?: number;
    filterType?: BiquadFilterType;
    filterQ?: number;
    detune?: number;
  }
) => {
  const {
    type = 'sine',
    freq,
    endFreq,
    startTime,
    duration,
    attack = 0.008,
    peakGain,
    filterFreq,
    filterEndFreq,
    filterType = 'lowpass',
    filterQ = 1,
    detune = 0,
  } = opts;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(Math.max(20, freq), startTime);
  if (detune) osc.detune.setValueAtTime(detune, startTime);
  if (endFreq !== undefined) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), startTime + duration);
  }

  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(Math.max(0.0002, peakGain), startTime + Math.min(attack, duration * 0.45));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  if (filterFreq) {
    const filter = ctx.createBiquadFilter();
    filter.type = filterType;
    filter.Q.setValueAtTime(filterQ, startTime);
    filter.frequency.setValueAtTime(filterFreq, startTime);
    if (filterEndFreq) {
      filter.frequency.exponentialRampToValueAtTime(Math.max(30, filterEndFreq), startTime + duration);
    }
    osc.connect(filter);
    filter.connect(gain);
  } else {
    osc.connect(gain);
  }

  gain.connect(dest);
  osc.start(startTime);
  osc.stop(startTime + duration + 0.02);
};

const playNoiseBurst = (
  ctx: AudioContext,
  dest: AudioNode,
  opts: {
    startTime: number;
    duration: number;
    attack?: number;
    peakGain: number;
    filterType: BiquadFilterType;
    filterFreq: number;
    filterEndFreq?: number;
    filterQ?: number;
  }
) => {
  const {
    startTime,
    duration,
    attack = 0.005,
    peakGain,
    filterType,
    filterFreq,
    filterEndFreq,
    filterQ = 1.2,
  } = opts;

  const src = ctx.createBufferSource();
  src.buffer = getNoiseBuffer(ctx);

  const filter = ctx.createBiquadFilter();
  filter.type = filterType;
  filter.Q.setValueAtTime(filterQ, startTime);
  filter.frequency.setValueAtTime(filterFreq, startTime);
  if (filterEndFreq) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(40, filterEndFreq), startTime + duration);
  }

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.linearRampToValueAtTime(Math.max(0.0002, peakGain), startTime + Math.min(attack, duration * 0.4));
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

  src.connect(filter);
  filter.connect(gain);
  gain.connect(dest);

  src.start(startTime);
  src.stop(startTime + duration + 0.02);
};

export const playSound = (type: SoundType) => {
  const settings = getSettings();
  const volume = settings.soundVolume;

  // Tactile Haptics
  if (settings.hapticEnabled && typeof navigator !== 'undefined' && navigator.vibrate) {
    switch (type) {
      case 'click':
      case 'tick':
        navigator.vibrate(8);
        break;
      case 'pop':
      case 'cardFlip':
      case 'passPhone':
      case 'dossierOpen':
      case 'handoff':
        navigator.vibrate(14);
        break;
      case 'vote':
      case 'reveal':
      case 'startGame':
      case 'accessGranted':
      case 'roleReveal':
      case 'voteConfirm':
        navigator.vibrate(22);
        break;
      case 'shield':
      case 'boomerang':
      case 'abilityActivate':
      case 'voteClose':
      case 'error':
        navigator.vibrate([25, 25, 35]);
        break;
      case 'dramatic':
      case 'eliminate':
      case 'timeUp':
      case 'trumpets_sad':
        navigator.vibrate([45, 30, 55]);
        break;
      case 'mrWhiteCaught':
      case 'guessPhase':
      case 'mystery':
        navigator.vibrate([35, 30, 60]);
        break;
      case 'win':
      case 'mrWhiteWin':
      case 'verdict':
        navigator.vibrate([60, 40, 80, 40, 120]);
        break;
    }
  }

  if (volume <= 0) return;

  const ctx = getContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume().catch(() => {});
  }

  const now = ctx.currentTime + 0.005;
  const masterGain = getMasterDestination(ctx, volume);

  switch (type) {
    case 'click': {
      // Crisp mechanical woodblock micro-tap
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.02,
        attack: 0.002,
        peakGain: 0.16,
        filterType: 'bandpass',
        filterFreq: 2400,
        filterQ: 2.2,
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 920,
        endFreq: 260,
        startTime: now,
        duration: 0.05,
        attack: 0.003,
        peakGain: 0.24,
      });
      break;
    }

    case 'pop': {
      // Bouncy studio bubble pop
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(380, now);
      osc.frequency.exponentialRampToValueAtTime(920, now + 0.025);
      osc.frequency.exponentialRampToValueAtTime(280, now + 0.095);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.28, now + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.11);

      playTone(ctx, masterGain, {
        type: 'triangle',
        freq: 760,
        endFreq: 1140,
        startTime: now,
        duration: 0.06,
        attack: 0.005,
        peakGain: 0.09,
      });
      break;
    }

    case 'cardFlip': {
      // Crisp playing-card slide & snap foley
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.095,
        attack: 0.006,
        peakGain: 0.28,
        filterType: 'bandpass',
        filterFreq: 1400,
        filterEndFreq: 3800,
        filterQ: 1.6,
      });
      playTone(ctx, masterGain, {
        type: 'triangle',
        freq: 320,
        endFreq: 130,
        startTime: now + 0.02,
        duration: 0.065,
        attack: 0.003,
        peakGain: 0.22,
      });
      break;
    }

    case 'passPhone': {
      // Smooth warm two-note device handoff chime
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 587.33, // D5
        startTime: now,
        duration: 0.18,
        attack: 0.01,
        peakGain: 0.18,
      });
      playTone(ctx, masterGain, {
        type: 'triangle',
        freq: 880, // A5
        startTime: now + 0.08,
        duration: 0.28,
        attack: 0.012,
        peakGain: 0.16,
      });
      break;
    }

    case 'tick': {
      // Crisp mechanical stopwatch escapement tick
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.016,
        attack: 0.001,
        peakGain: 0.18,
        filterType: 'highpass',
        filterFreq: 3200,
        filterQ: 1.8,
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 1450,
        endFreq: 800,
        startTime: now,
        duration: 0.024,
        attack: 0.002,
        peakGain: 0.12,
      });
      break;
    }

    case 'timeUp': {
      // Clear double game-show gong/alert chime
      [0, 0.18].forEach((offset, idx) => {
        const base = idx === 0 ? 523.25 : 392.0; // C5 -> G4
        playTone(ctx, masterGain, {
          type: 'triangle',
          freq: base,
          startTime: now + offset,
          duration: 0.35,
          attack: 0.008,
          peakGain: 0.22,
        });
        playTone(ctx, masterGain, {
          type: 'sine',
          freq: base * 2,
          startTime: now + offset,
          duration: 0.28,
          attack: 0.008,
          peakGain: 0.1,
        });
      });
      break;
    }

    case 'vote': {
      // Heavy ballot stamp / courtroom gavel impact
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.045,
        attack: 0.002,
        peakGain: 0.24,
        filterType: 'bandpass',
        filterFreq: 950,
        filterQ: 1.4,
      });
      playTone(ctx, masterGain, {
        type: 'triangle',
        freq: 220,
        endFreq: 52,
        startTime: now,
        duration: 0.16,
        attack: 0.004,
        peakGain: 0.42,
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 110,
        endFreq: 42,
        startTime: now,
        duration: 0.18,
        attack: 0.004,
        peakGain: 0.35,
      });
      break;
    }

    case 'reveal': {
      // Airy card-whoosh + crystalline major shimmer
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.24,
        attack: 0.06,
        peakGain: 0.18,
        filterType: 'bandpass',
        filterFreq: 700,
        filterEndFreq: 3200,
        filterQ: 1.8,
      });
      [523.25, 659.25, 783.99, 1046.5].forEach((freq, i) => {
        playTone(ctx, masterGain, {
          type: i % 2 === 0 ? 'sine' : 'triangle',
          freq,
          startTime: now + 0.06 + i * 0.045,
          duration: 0.42,
          attack: 0.015,
          peakGain: 0.11,
        });
      });
      break;
    }

    case 'shield': {
      // Metallic crystalline barrier deflection
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 190,
        endFreq: 75,
        startTime: now,
        duration: 0.18,
        attack: 0.004,
        peakGain: 0.3,
      });
      [587.33, 880, 1174.66, 1760].forEach((freq, i) => {
        playTone(ctx, masterGain, {
          type: i === 0 ? 'triangle' : 'sine',
          freq,
          startTime: now + i * 0.02,
          duration: 0.65 - i * 0.08,
          attack: 0.006,
          peakGain: 0.14 - i * 0.02,
        });
      });
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.12,
        attack: 0.003,
        peakGain: 0.15,
        filterType: 'highpass',
        filterFreq: 2600,
        filterEndFreq: 5500,
      });
      break;
    }

    case 'boomerang': {
      // Swirling pitch-glide bounce deflection
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.34,
        attack: 0.05,
        peakGain: 0.2,
        filterType: 'bandpass',
        filterFreq: 600,
        filterEndFreq: 2800,
        filterQ: 2.8,
      });
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(980, now + 0.16);
      osc.frequency.exponentialRampToValueAtTime(320, now + 0.36);

      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(0.24, now + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);

      osc.connect(g);
      g.connect(masterGain);
      osc.start(now);
      osc.stop(now + 0.4);

      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 1320,
        endFreq: 660,
        startTime: now + 0.15,
        duration: 0.22,
        attack: 0.01,
        peakGain: 0.12,
      });
      break;
    }

    case 'eliminate': {
      // Dark elimination verdict thud + low minor chord
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.16,
        attack: 0.005,
        peakGain: 0.22,
        filterType: 'lowpass',
        filterFreq: 900,
        filterEndFreq: 180,
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 115,
        endFreq: 36,
        startTime: now,
        duration: 0.65,
        attack: 0.006,
        peakGain: 0.42,
      });
      [146.83, 174.61, 220].forEach((freq) => {
        playTone(ctx, masterGain, {
          type: 'sawtooth',
          freq,
          startTime: now + 0.04,
          duration: 0.85,
          attack: 0.03,
          peakGain: 0.09,
          filterType: 'lowpass',
          filterFreq: 750,
          filterEndFreq: 220,
        });
      });
      break;
    }

    case 'dramatic': {
      // Deep cinematic trailer impact & tension sweep
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.8,
        attack: 0.01,
        peakGain: 0.24,
        filterType: 'lowpass',
        filterFreq: 1600,
        filterEndFreq: 110,
      });
      playTone(ctx, masterGain, {
        type: 'sawtooth',
        freq: 98,
        endFreq: 32,
        startTime: now,
        duration: 1.4,
        attack: 0.01,
        peakGain: 0.3,
        filterType: 'lowpass',
        filterFreq: 680,
        filterEndFreq: 60,
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 55,
        endFreq: 34,
        startTime: now,
        duration: 1.3,
        attack: 0.008,
        peakGain: 0.45,
      });
      break;
    }

    case 'mystery': {
      // Noir spy vibraphone chord arpeggio (A minor 9th feel)
      const notes = [440, 523.25, 659.25, 987.77]; // A4, C5, E5, B5
      notes.forEach((freq, i) => {
        const start = now + i * 0.09;
        playTone(ctx, masterGain, {
          type: 'sine',
          freq,
          startTime: start,
          duration: 0.55,
          attack: 0.015,
          peakGain: 0.14,
        });
        playTone(ctx, masterGain, {
          type: 'triangle',
          freq: freq * 2,
          startTime: start,
          duration: 0.25,
          attack: 0.01,
          peakGain: 0.04,
        });
      });
      break;
    }

    case 'mrWhiteCaught': {
      // Tense spy spotlight sting
      [277.18, 392.0, 523.25].forEach((freq) => {
        playTone(ctx, masterGain, {
          type: 'triangle',
          freq,
          startTime: now,
          duration: 0.55,
          attack: 0.01,
          peakGain: 0.15,
          filterType: 'lowpass',
          filterFreq: 1800,
        });
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 880,
        endFreq: 1318.5,
        startTime: now + 0.06,
        duration: 0.35,
        attack: 0.02,
        peakGain: 0.12,
      });
      break;
    }

    case 'mrWhiteWin': {
      // Sneaky triumphant spy heist fanfare
      const phrase = [
        { freq: 392.0, offset: 0, dur: 0.12 },     // G4
        { freq: 415.3, offset: 0.09, dur: 0.12 },  // G#4
        { freq: 440.0, offset: 0.18, dur: 0.12 },  // A4
        { freq: 587.33, offset: 0.28, dur: 0.5 },  // D5
        { freq: 739.99, offset: 0.36, dur: 0.7 },  // F#5
        { freq: 880.0, offset: 0.44, dur: 0.85 },  // A5
      ];
      phrase.forEach((n) => {
        playTone(ctx, masterGain, {
          type: 'triangle',
          freq: n.freq,
          startTime: now + n.offset,
          duration: n.dur,
          attack: 0.01,
          peakGain: 0.16,
        });
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 146.83, // D3 bass
        startTime: now + 0.28,
        duration: 0.9,
        attack: 0.015,
        peakGain: 0.26,
      });
      break;
    }

    case 'win': {
      // Rich celebratory major-9th fanfare + sub root + shimmer
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 130.81, // C3 bass
        startTime: now,
        duration: 1.2,
        attack: 0.02,
        peakGain: 0.26,
      });
      const chord = [523.25, 659.25, 783.99, 987.77, 1174.66, 1567.98]; // Cmaj9 + G6
      chord.forEach((freq, i) => {
        const start = now + i * 0.055;
        playTone(ctx, masterGain, {
          type: i < 4 ? 'triangle' : 'sine',
          freq,
          startTime: start,
          duration: 1.15 - i * 0.07,
          attack: 0.015,
          peakGain: 0.13,
        });
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 2093.0, // C7 sparkle
        startTime: now + 0.34,
        duration: 0.65,
        attack: 0.02,
        peakGain: 0.07,
      });
      break;
    }

    case 'trumpets_sad': {
      // Warm muted brass "wah-wah-wah-waaaah" with expressive vibrato & LPF
      const steps = [
        { freq: 311.13, offset: 0, dur: 0.28 },    // Eb4
        { freq: 293.66, offset: 0.3, dur: 0.28 },  // D4
        { freq: 277.18, offset: 0.6, dur: 0.28 },  // Db4
        { freq: 261.63, offset: 0.9, dur: 0.85 },  // C4
      ];
      steps.forEach((s, idx) => {
        const start = now + s.offset;
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(s.freq, start);
        if (idx === 3) {
          osc.frequency.linearRampToValueAtTime(s.freq * 0.94, start + s.dur);
          // Subtle vibrato on final held note
          const lfo = ctx.createOscillator();
          const lfoGain = ctx.createGain();
          lfo.frequency.setValueAtTime(5.5, start);
          lfoGain.gain.setValueAtTime(4.5, start);
          lfo.connect(lfoGain);
          lfoGain.connect(osc.frequency);
          lfo.start(start);
          lfo.stop(start + s.dur + 0.02);
        }

        filter.type = 'lowpass';
        filter.Q.setValueAtTime(2.5, start);
        filter.frequency.setValueAtTime(1100, start);
        filter.frequency.exponentialRampToValueAtTime(380, start + s.dur);

        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(0.16, start + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + s.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(masterGain);
        osc.start(start);
        osc.stop(start + s.dur + 0.03);
      });
      break;
    }

    case 'startGame': {
      // Energetic 4-note rising game launch stinger
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, i) => {
        playTone(ctx, masterGain, {
          type: i === 3 ? 'triangle' : 'sine',
          freq,
          startTime: now + i * 0.065,
          duration: i === 3 ? 0.45 : 0.18,
          attack: 0.008,
          peakGain: 0.16,
        });
      });
      break;
    }

    case 'error': {
      // Soft low double-buzz UI feedback
      [0, 0.11].forEach((offset) => {
        playTone(ctx, masterGain, {
          type: 'triangle',
          freq: 185,
          endFreq: 135,
          startTime: now + offset,
          duration: 0.09,
          attack: 0.005,
          peakGain: 0.22,
          filterType: 'lowpass',
          filterFreq: 650,
        });
      });
      break;
    }

    case 'dossierOpen': {
      // Crisp classified folder unseal: dry paper friction + subtle low-mid lock click
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.08,
        attack: 0.004,
        peakGain: 0.2,
        filterType: 'bandpass',
        filterFreq: 1650,
        filterEndFreq: 2900,
        filterQ: 1.5,
      });
      playTone(ctx, masterGain, {
        type: 'triangle',
        freq: 310,
        endFreq: 465,
        startTime: now + 0.02,
        duration: 0.11,
        attack: 0.004,
        peakGain: 0.16,
      });
      break;
    }

    case 'accessGranted': {
      // Restrained encrypted clearance ping: clean dual harmonic lock-in
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 523.25, // C5
        startTime: now,
        duration: 0.11,
        attack: 0.004,
        peakGain: 0.14,
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 783.99, // G5
        startTime: now + 0.065,
        duration: 0.22,
        attack: 0.006,
        peakGain: 0.16,
      });
      break;
    }

    case 'roleReveal': {
      // Confidential noir dossier reveal: muted sub warmth + restrained brass/sine resolve
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.16,
        attack: 0.03,
        peakGain: 0.12,
        filterType: 'bandpass',
        filterFreq: 850,
        filterEndFreq: 2200,
        filterQ: 1.4,
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 146.83, // D3
        startTime: now,
        duration: 0.42,
        attack: 0.012,
        peakGain: 0.24,
      });
      [440, 554.37, 659.25].forEach((freq, i) => {
        playTone(ctx, masterGain, {
          type: i === 0 ? 'triangle' : 'sine',
          freq,
          startTime: now + 0.04 + i * 0.05,
          duration: 0.36,
          attack: 0.01,
          peakGain: 0.1,
        });
      });
      break;
    }

    case 'handoff': {
      // Confidential lock-screen chime: calm descending-then-resolving privacy tone
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 659.25, // E5
        startTime: now,
        duration: 0.14,
        attack: 0.008,
        peakGain: 0.14,
      });
      playTone(ctx, masterGain, {
        type: 'triangle',
        freq: 493.88, // B4
        startTime: now + 0.075,
        duration: 0.24,
        attack: 0.01,
        peakGain: 0.13,
      });
      break;
    }

    case 'voteConfirm': {
      // Tactical steel ballot stamp: tight thud + clean mechanical latch
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.035,
        attack: 0.002,
        peakGain: 0.2,
        filterType: 'bandpass',
        filterFreq: 1200,
        filterQ: 1.6,
      });
      playTone(ctx, masterGain, {
        type: 'triangle',
        freq: 240,
        endFreq: 78,
        startTime: now,
        duration: 0.13,
        attack: 0.004,
        peakGain: 0.34,
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 620,
        startTime: now + 0.03,
        duration: 0.07,
        attack: 0.003,
        peakGain: 0.1,
      });
      break;
    }

    case 'voteClose': {
      // Ballot box sealed & tally initiated: double resonant vault latch
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.06,
        attack: 0.003,
        peakGain: 0.18,
        filterType: 'lowpass',
        filterFreq: 1100,
        filterEndFreq: 280,
      });
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 165,
        endFreq: 58,
        startTime: now,
        duration: 0.24,
        attack: 0.005,
        peakGain: 0.36,
      });
      playTone(ctx, masterGain, {
        type: 'triangle',
        freq: 392,
        startTime: now + 0.09,
        duration: 0.26,
        attack: 0.008,
        peakGain: 0.15,
      });
      break;
    }

    case 'abilityActivate': {
      // Intelligence special ability trigger: crisp metallic sweep + harmonic pulse
      playNoiseBurst(ctx, masterGain, {
        startTime: now,
        duration: 0.11,
        attack: 0.006,
        peakGain: 0.15,
        filterType: 'highpass',
        filterFreq: 2100,
        filterEndFreq: 4800,
      });
      [493.88, 739.99, 987.77].forEach((freq, i) => {
        playTone(ctx, masterGain, {
          type: i === 0 ? 'triangle' : 'sine',
          freq,
          startTime: now + i * 0.035,
          duration: 0.38 - i * 0.05,
          attack: 0.006,
          peakGain: 0.14 - i * 0.02,
        });
      });
      break;
    }

    case 'guessPhase': {
      // Priority-override tension sting for Mr. White guess phase
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 92.5, // F#2
        startTime: now,
        duration: 0.75,
        attack: 0.015,
        peakGain: 0.3,
      });
      [277.18, 415.3, 554.37].forEach((freq, i) => {
        playTone(ctx, masterGain, {
          type: 'triangle',
          freq,
          startTime: now + i * 0.045,
          duration: 0.55,
          attack: 0.01,
          peakGain: 0.13,
          filterType: 'lowpass',
          filterFreq: 1600,
        });
      });
      break;
    }

    case 'verdict': {
      // Authoritative blacksited verdict chord: warm sub + muted gold fifth/ninth
      playTone(ctx, masterGain, {
        type: 'sine',
        freq: 110, // A2
        startTime: now,
        duration: 0.95,
        attack: 0.015,
        peakGain: 0.3,
      });
      [440, 554.37, 659.25, 987.77].forEach((freq, i) => {
        playTone(ctx, masterGain, {
          type: i < 2 ? 'triangle' : 'sine',
          freq,
          startTime: now + i * 0.05,
          duration: 0.82 - i * 0.08,
          attack: 0.012,
          peakGain: 0.12,
        });
      });
      break;
    }
  }
};