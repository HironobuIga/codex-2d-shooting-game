import type { AudioBus } from "./types";

const BGM_BPM = 124;
const BGM_STEPS_PER_BAR = 16;
const BGM_STEP_SECONDS = 60 / BGM_BPM / 4;
const BGM_LOOKAHEAD_SECONDS = 0.045;
const BGM_MASTER_GAIN = 0.22;

interface BgmBar {
  bassRoot: number;
  chord: [number, number, number];
  arp: [number, number, number, number];
}

const BGM_PROGRESSION: BgmBar[] = [
  { bassRoot: 45, chord: [57, 60, 64], arp: [69, 72, 76, 72] },
  { bassRoot: 41, chord: [53, 57, 60], arp: [65, 69, 72, 69] },
  { bassRoot: 43, chord: [55, 59, 62], arp: [67, 71, 74, 71] },
  { bassRoot: 40, chord: [52, 55, 59], arp: [64, 67, 71, 67] }
];

function getAudioContextCtor():
  | (new () => AudioContext)
  | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  const webkitContext = (window as unknown as { webkitAudioContext?: new () => AudioContext })
    .webkitAudioContext;
  return window.AudioContext ?? webkitContext;
}

class BrowserAudioBus implements AudioBus {
  private context: AudioContext | null = null;
  private bgmMaster: GainNode | null = null;
  private bgmCompressor: DynamicsCompressorNode | null = null;
  private bgmIntervalId: number | null = null;
  private bgmBarIndex = 0;
  private bgmStepIndex = 0;
  private noiseBuffer: AudioBuffer | null = null;
  private unlocked = false;

  private midiToFrequency(midi: number): number {
    return 440 * 2 ** ((midi - 69) / 12);
  }

  private ensureContext(): AudioContext | null {
    if (this.context) {
      return this.context;
    }
    const AudioContextCtor = getAudioContextCtor();
    if (!AudioContextCtor) {
      return null;
    }
    this.context = new AudioContextCtor();
    return this.context;
  }

  private getNoiseBuffer(context: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === context.sampleRate) {
      return this.noiseBuffer;
    }
    const durationSeconds = 0.3;
    const frameCount = Math.floor(context.sampleRate * durationSeconds);
    const buffer = context.createBuffer(1, frameCount, context.sampleRate);
    const channel = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i += 1) {
      channel[i] = (Math.random() * 2 - 1) * 0.9;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private playSynthNote(
    when: number,
    frequency: number,
    durationSeconds: number,
    type: OscillatorType,
    gainLevel: number,
    destination: AudioNode,
    detuneCents = 0
  ): void {
    const context = this.ensureContext();
    if (!context) {
      return;
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, when);
    oscillator.detune.setValueAtTime(detuneCents, when);

    const attackEnd = when + 0.008;
    const releaseStart = when + durationSeconds * 0.25;
    const endTime = when + durationSeconds;

    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, gainLevel), attackEnd);
    gain.gain.setValueAtTime(Math.max(0.0001, gainLevel), releaseStart);
    gain.gain.exponentialRampToValueAtTime(0.0001, endTime);

    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(when);
    oscillator.stop(endTime + 0.01);
  }

  private playKick(when: number, destination: AudioNode): void {
    const context = this.ensureContext();
    if (!context) {
      return;
    }
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(148, when);
    oscillator.frequency.exponentialRampToValueAtTime(46, when + 0.18);
    gain.gain.setValueAtTime(0.24, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.2);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(when);
    oscillator.stop(when + 0.21);
  }

  private playNoiseHit(
    when: number,
    durationSeconds: number,
    gainLevel: number,
    highPassHz: number,
    destination: AudioNode
  ): void {
    const context = this.ensureContext();
    if (!context) {
      return;
    }
    const source = context.createBufferSource();
    source.buffer = this.getNoiseBuffer(context);

    const filter = context.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(highPassHz, when);

    const gain = context.createGain();
    gain.gain.setValueAtTime(gainLevel, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + durationSeconds);

    source.connect(filter);
    filter.connect(gain);
    gain.connect(destination);
    source.start(when);
    source.stop(when + durationSeconds + 0.02);
  }

  private scheduleBgmStep(when: number): void {
    if (!this.bgmMaster) {
      return;
    }

    const bar = BGM_PROGRESSION[this.bgmBarIndex % BGM_PROGRESSION.length];
    const step = this.bgmStepIndex % BGM_STEPS_PER_BAR;

    if (step % 4 === 0) {
      const octaveLift = step === 12 ? 12 : 0;
      const bassFrequency = this.midiToFrequency(bar.bassRoot + octaveLift);
      this.playSynthNote(
        when,
        bassFrequency,
        BGM_STEP_SECONDS * 0.95,
        "sawtooth",
        0.09,
        this.bgmMaster
      );
      this.playSynthNote(
        when + 0.006,
        bassFrequency * 2,
        BGM_STEP_SECONDS * 0.76,
        "triangle",
        0.035,
        this.bgmMaster
      );
    }

    if (step === 0 || step === 8) {
      for (let i = 0; i < bar.chord.length; i += 1) {
        this.playSynthNote(
          when + i * 0.004,
          this.midiToFrequency(bar.chord[i]),
          BGM_STEP_SECONDS * 7.3,
          "triangle",
          0.028,
          this.bgmMaster,
          i * 4 - 4
        );
      }
    }

    const arpIndex = step % bar.arp.length;
    const lift = step % 8 === 7 ? 12 : 0;
    this.playSynthNote(
      when,
      this.midiToFrequency(bar.arp[arpIndex] + lift),
      BGM_STEP_SECONDS * 0.86,
      "square",
      0.026,
      this.bgmMaster,
      step % 2 === 0 ? -5 : 5
    );

    if (step % 4 === 0) {
      this.playKick(when, this.bgmMaster);
    }
    if (step === 4 || step === 12) {
      this.playNoiseHit(when, 0.11, 0.08, 1800, this.bgmMaster);
    }
    if (step % 2 === 1) {
      this.playNoiseHit(when + 0.01, 0.05, 0.023, 5200, this.bgmMaster);
    }

    this.bgmStepIndex = (this.bgmStepIndex + 1) % BGM_STEPS_PER_BAR;
    if (this.bgmStepIndex === 0) {
      this.bgmBarIndex = (this.bgmBarIndex + 1) % BGM_PROGRESSION.length;
    }
  }

  unlock(): void {
    const context = this.ensureContext();
    if (!context) {
      return;
    }
    if (context.state === "suspended") {
      void context.resume();
    }
    this.unlocked = true;
  }

  startBgm(): void {
    const context = this.ensureContext();
    if (!context || this.bgmIntervalId !== null) {
      return;
    }
    this.unlock();
    if (!this.unlocked) {
      return;
    }

    const master = context.createGain();
    master.gain.value = BGM_MASTER_GAIN;
    const compressor = context.createDynamicsCompressor();
    compressor.threshold.value = -22;
    compressor.knee.value = 10;
    compressor.ratio.value = 2.5;
    compressor.attack.value = 0.004;
    compressor.release.value = 0.18;

    master.connect(compressor);
    compressor.connect(context.destination);

    this.bgmMaster = master;
    this.bgmCompressor = compressor;
    this.bgmBarIndex = 0;
    this.bgmStepIndex = 0;

    const tick = (): void => {
      if (!this.bgmMaster || !this.context) {
        return;
      }
      this.scheduleBgmStep(this.context.currentTime + BGM_LOOKAHEAD_SECONDS);
    };

    tick();
    this.bgmIntervalId = window.setInterval(tick, BGM_STEP_SECONDS * 1000);
  }

  stopBgm(): void {
    if (this.bgmIntervalId !== null) {
      clearInterval(this.bgmIntervalId);
      this.bgmIntervalId = null;
    }
    if (this.bgmMaster && this.context) {
      this.bgmMaster.gain.cancelScheduledValues(this.context.currentTime);
      this.bgmMaster.gain.setValueAtTime(
        Math.max(0.001, this.bgmMaster.gain.value),
        this.context.currentTime
      );
      this.bgmMaster.gain.exponentialRampToValueAtTime(
        0.0001,
        this.context.currentTime + 0.08
      );
      const oldMaster = this.bgmMaster;
      const oldCompressor = this.bgmCompressor;
      window.setTimeout(() => {
        oldMaster.disconnect();
        oldCompressor?.disconnect();
      }, 110);
    }
    this.bgmMaster = null;
    this.bgmCompressor = null;
    this.bgmBarIndex = 0;
    this.bgmStepIndex = 0;
  }

  private tone(
    frequency: number,
    durationMs: number,
    type: OscillatorType,
    gainLevel: number,
    endFrequency = frequency
  ): void {
    const context = this.ensureContext();
    if (!context) {
      return;
    }
    this.unlock();
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, context.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(1, endFrequency),
      context.currentTime + durationMs / 1000
    );
    gain.gain.setValueAtTime(gainLevel, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      context.currentTime + durationMs / 1000
    );

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + durationMs / 1000 + 0.01);
  }

  playShot(): void {
    this.tone(820, 80, "square", 0.048, 560);
  }

  playHit(): void {
    this.tone(200, 120, "sawtooth", 0.04, 120);
  }

  playEnemyDown(): void {
    this.tone(440, 110, "triangle", 0.05, 180);
    this.tone(220, 160, "triangle", 0.03, 120);
  }

  playPickup(): void {
    this.tone(560, 140, "sine", 0.048, 920);
  }

  playGameOver(): void {
    this.tone(280, 280, "sawtooth", 0.06, 90);
  }
}

export function createAudioBus(): AudioBus {
  return new BrowserAudioBus();
}
