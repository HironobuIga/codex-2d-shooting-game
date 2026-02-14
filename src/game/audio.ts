import type { AudioBus } from "./types";

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
  private bgmNodes: OscillatorNode[] = [];
  private bgmGain: GainNode | null = null;
  private unlocked = false;

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
    if (!context || this.bgmNodes.length > 0) {
      return;
    }
    this.unlock();
    if (!this.unlocked) {
      return;
    }

    const gain = context.createGain();
    gain.gain.value = 0.045;
    gain.connect(context.destination);

    const oscA = context.createOscillator();
    const oscB = context.createOscillator();
    oscA.type = "sawtooth";
    oscB.type = "triangle";
    oscA.frequency.value = 86;
    oscB.frequency.value = 129;
    oscA.connect(gain);
    oscB.connect(gain);
    oscA.start();
    oscB.start();

    this.bgmGain = gain;
    this.bgmNodes = [oscA, oscB];
  }

  stopBgm(): void {
    for (const oscillator of this.bgmNodes) {
      try {
        oscillator.stop();
      } catch {
        // Ignore repeated stop attempts when restarting quickly.
      }
      oscillator.disconnect();
    }
    this.bgmNodes = [];
    if (this.bgmGain) {
      this.bgmGain.disconnect();
      this.bgmGain = null;
    }
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
    this.tone(780, 90, "square", 0.05, 520);
  }

  playHit(): void {
    this.tone(200, 120, "sawtooth", 0.04, 120);
  }

  playEnemyDown(): void {
    this.tone(440, 110, "triangle", 0.05, 180);
    this.tone(220, 160, "triangle", 0.03, 120);
  }

  playPickup(): void {
    this.tone(530, 120, "sine", 0.05, 840);
  }

  playGameOver(): void {
    this.tone(280, 280, "sawtooth", 0.06, 90);
  }
}

export function createAudioBus(): AudioBus {
  return new BrowserAudioBus();
}
