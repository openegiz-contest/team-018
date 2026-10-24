/**
 * Procedural Quarry Audio Engine using Web Audio API.
 * Real-time synthesis of:
 * - BelAZ 75131 heavy diesel rumble + 1200V DC traction inverter whine
 * - Pneumatic hydraulic ore dump hiss
 * - Primary gyratory crusher (KKD-1500) & SAG mill (MPSI-90) low-frequency hum
 * - Canyon wind ambient atmosphere
 */
export class QuarryAudioEngine {
  private ctx: AudioContext | null = null;
  public isMuted: boolean = true;
  private masterGain: GainNode | null = null;

  // Engine sound nodes
  private engineOsc1: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private engineGain: GainNode | null = null;

  // Electric traction inverter whine (when on Trolley 1200V)
  private trolleyOsc: OscillatorNode | null = null;
  private trolleyGain: GainNode | null = null;

  // Crusher industrial drone
  private crusherNoise: AudioBufferSourceNode | null = null;
  private crusherGain: GainNode | null = null;
  private crusherFilter: BiquadFilterNode | null = null;

  // Ambient wind
  private windGain: GainNode | null = null;

  // State
  private lastHissTime: number = 0;

  constructor() {
    // Lazy initialized on user interaction to obey browser autoplay policies
  }

  private init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      // Master output
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.45;
      this.masterGain.connect(this.ctx.destination);

      // --- 1. BelAZ Diesel Engine Rumble ---
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0.35;

      this.engineFilter = this.ctx.createBiquadFilter();
      this.engineFilter.type = 'lowpass';
      this.engineFilter.frequency.value = 180;
      this.engineFilter.Q.value = 3.5;

      this.engineOsc1 = this.ctx.createOscillator();
      this.engineOsc1.type = 'sawtooth';
      this.engineOsc1.frequency.value = 38; // Idle rumble ~38Hz

      this.engineOsc2 = this.ctx.createOscillator();
      this.engineOsc2.type = 'sine';
      this.engineOsc2.frequency.value = 76; // 2nd harmonic

      this.engineOsc1.connect(this.engineFilter);
      this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain);
      this.engineGain.connect(this.masterGain);

      this.engineOsc1.start();
      this.engineOsc2.start();

      // --- 2. 1200V DC Traction Inverter Whine ---
      this.trolleyGain = this.ctx.createGain();
      this.trolleyGain.gain.value = 0; // Off until voltage present

      this.trolleyOsc = this.ctx.createOscillator();
      this.trolleyOsc.type = 'sine';
      this.trolleyOsc.frequency.value = 650; // Inverter PWM whine

      const trolleyFilter = this.ctx.createBiquadFilter();
      trolleyFilter.type = 'bandpass';
      trolleyFilter.frequency.value = 850;
      trolleyFilter.Q.value = 5.0;

      this.trolleyOsc.connect(trolleyFilter);
      trolleyFilter.connect(this.trolleyGain);
      this.trolleyGain.connect(this.masterGain);

      this.trolleyOsc.start();

      // --- 3. Crusher Low-Frequency Drone ---
      this.crusherGain = this.ctx.createGain();
      this.crusherGain.gain.value = 0.12;

      this.crusherFilter = this.ctx.createBiquadFilter();
      this.crusherFilter.type = 'lowpass';
      this.crusherFilter.frequency.value = 120;

      // Pink noise buffer for industrial rumble
      const bufferSize = this.ctx.sampleRate * 2;
      const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        b3 = 0.86650 * b3 + white * 0.3104856;
        b4 = 0.55000 * b4 + white * 0.5329522;
        b5 = -0.7616 * b5 - white * 0.0168980;
        output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
        b6 = white * 0.115926;
      }

      this.crusherNoise = this.ctx.createBufferSource();
      this.crusherNoise.buffer = noiseBuffer;
      this.crusherNoise.loop = true;
      this.crusherNoise.connect(this.crusherFilter);
      this.crusherFilter.connect(this.crusherGain);
      this.crusherGain.connect(this.masterGain);
      this.crusherNoise.start();

      // --- 4. Ambient Canyon Wind Atmosphere ---
      this.windGain = this.ctx.createGain();
      this.windGain.gain.value = 0.06;

      const windFilter = this.ctx.createBiquadFilter();
      windFilter.type = 'bandpass';
      windFilter.frequency.value = 240;
      windFilter.Q.value = 1.2;

      const windSource = this.ctx.createBufferSource();
      windSource.buffer = noiseBuffer;
      windSource.loop = true;
      windSource.connect(windFilter);
      windFilter.connect(this.windGain);
      this.windGain.connect(this.masterGain);
      windSource.start();

    } catch (e) {
      console.warn('Web Audio procedural synthesis error:', e);
    }
  }

  public toggleMute(): boolean {
    this.init();
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      if (this.ctx.state === 'suspended') {
        void this.ctx.resume();
      }
      const targetGain = this.isMuted ? 0 : 0.45;
      this.masterGain.gain.setTargetAtTime(targetGain, this.ctx.currentTime, 0.05);
    }
    return !this.isMuted;
  }

  public setSpeedRpm(speedKmh: number, isTrolley: boolean) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Diesel engine pitch & filter modulation: 35 Hz (idle) up to 95 Hz (full throttle 35 km/h)
    const normSpeed = Math.min(1.0, Math.max(0, speedKmh / 35.0));
    const targetFreq = 35 + normSpeed * 58;
    const targetCutoff = 160 + normSpeed * 220;

    if (this.engineOsc1) {
      this.engineOsc1.frequency.setTargetAtTime(targetFreq, now, 0.1);
    }
    if (this.engineOsc2) {
      this.engineOsc2.frequency.setTargetAtTime(targetFreq * 2.0, now, 0.1);
    }
    if (this.engineFilter) {
      this.engineFilter.frequency.setTargetAtTime(targetCutoff, now, 0.15);
    }

    // Trolley inverter whine: 650 Hz to 1250 Hz when connected to 1200V DC
    if (this.trolleyGain && this.trolleyOsc) {
      const targetTrolleyGain = isTrolley ? 0.18 : 0.0;
      const targetTrolleyFreq = 600 + normSpeed * 650;
      this.trolleyGain.gain.setTargetAtTime(targetTrolleyGain, now, 0.1);
      this.trolleyOsc.frequency.setTargetAtTime(targetTrolleyFreq, now, 0.08);
    }
  }

  public triggerDumpHiss() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    if (now - this.lastHissTime < 4.0) return; // Prevent repetitive spamming
    this.lastHissTime = now;

    try {
      // Noise burst for pneumatic / hydraulic cylinder release
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, now);
      filter.frequency.exponentialRampToValueAtTime(350, now + 1.4);
      filter.Q.value = 2.0;

      const hissGain = this.ctx.createGain();
      hissGain.gain.setValueAtTime(0.01, now);
      hissGain.gain.linearRampToValueAtTime(0.35, now + 0.1);
      hissGain.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      noise.connect(filter);
      filter.connect(hissGain);
      if (this.masterGain) {
        hissGain.connect(this.masterGain);
      }

      noise.start(now);
      noise.stop(now + 1.5);
    } catch (e) {
      console.warn('Dump hiss error:', e);
    }
  }

  public setCrusherActive(active: boolean) {
    if (!this.ctx || this.isMuted || !this.crusherGain) return;
    const now = this.ctx.currentTime;
    const target = active ? 0.28 : 0.08;
    this.crusherGain.gain.setTargetAtTime(target, now, 0.3);
  }

  public updateCameraListener(
    cx: number, cy: number, cz: number,
    _tx: number, _ty: number, _tz: number
  ) {
    if (!this.ctx || !this.ctx.listener) return;
    try {
      if (this.ctx.listener.positionX) {
        this.ctx.listener.positionX.value = cx;
        this.ctx.listener.positionY.value = cy;
        this.ctx.listener.positionZ.value = cz;
      }
    } catch {}
  }
}

export const quarryAudio = new QuarryAudioEngine();
