/**
 * Web Audio API High-Performance Procedural Sound Synthesizer for UniFAP Sorteios
 * Studio-quality sound synthesis with Master Dynamics Compressor and 0ms Audio Graph Latency.
 */

type SoundEvent = "DRAW_START" | "DRAW_TICK" | "DRAW_SLOWDOWN" | "DRAW_RESULT" | "WINNER";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private isEnabled: boolean = true;
  private volume: number = 0.85;

  private initContext() {
    if (typeof window === "undefined") return null;
    try {
      if (!this.ctx) {
        const AudioCtx =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          this.ctx = new AudioCtx({ latencyHint: "interactive" });

          // Dynamics Compressor prevents audio clipping & crackling in large auditorium speakers
          this.compressor = this.ctx.createDynamicsCompressor();
          this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
          this.compressor.knee.setValueAtTime(30, this.ctx.currentTime);
          this.compressor.ratio.setValueAtTime(12, this.ctx.currentTime);
          this.compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
          this.compressor.release.setValueAtTime(0.25, this.ctx.currentTime);

          // Master Gain Node
          this.masterGain = this.ctx.createGain();
          this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);

          this.masterGain.connect(this.compressor);
          this.compressor.connect(this.ctx.destination);
        }
      }
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
      return this.ctx;
    } catch {
      return null;
    }
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
  }

  public getEnabled(): boolean {
    return this.isEnabled;
  }

  public setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.ctx && this.masterGain) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public play(event: SoundEvent) {
    if (!this.isEnabled) return;
    const ctx = this.initContext();
    if (!ctx || !this.masterGain) return;

    try {
      switch (event) {
        case "DRAW_START":
          this.playDrawStart(ctx);
          break;
        case "DRAW_TICK":
          this.playTick(ctx);
          break;
        case "DRAW_SLOWDOWN":
          this.playSlowdownTick(ctx);
          break;
        case "DRAW_RESULT":
          this.playResultStrike(ctx);
          break;
        case "WINNER":
          this.playWinnerFanfare(ctx);
          break;
      }
    } catch {
      // Graceful audio failover
    }
  }

  private playTick(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(920, now);
    osc.frequency.exponentialRampToValueAtTime(460, now + 0.035);

    gain.gain.setValueAtTime(0.2, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.035);
  }

  private playSlowdownTick(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(680, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.07);

    gain.gain.setValueAtTime(0.35, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.07);
  }

  private playDrawStart(ctx: AudioContext) {
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(659.25, now + 0.5); // E5 crescendo

    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.4, now + 0.25);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

    osc.connect(gain);
    gain.connect(this.masterGain!);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  private playResultStrike(ctx: AudioContext) {
    const now = ctx.currentTime;

    // Sub punch
    const oscLow = ctx.createOscillator();
    const gainLow = ctx.createGain();
    oscLow.type = "triangle";
    oscLow.frequency.setValueAtTime(146.83, now); // D3
    oscLow.frequency.exponentialRampToValueAtTime(73.41, now + 0.35);
    gainLow.gain.setValueAtTime(0.65, now);
    gainLow.gain.exponentialRampToValueAtTime(0.001, now + 0.4);
    oscLow.connect(gainLow);
    gainLow.connect(this.masterGain!);
    oscLow.start(now);
    oscLow.stop(now + 0.4);

    // High golden chime
    const oscHigh = ctx.createOscillator();
    const gainHigh = ctx.createGain();
    oscHigh.type = "sine";
    oscHigh.frequency.setValueAtTime(1174.66, now); // D6
    gainHigh.gain.setValueAtTime(0.4, now);
    gainHigh.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    oscHigh.connect(gainHigh);
    gainHigh.connect(this.masterGain!);
    oscHigh.start(now);
    oscHigh.stop(now + 0.5);
  }

  private playWinnerFanfare(ctx: AudioContext) {
    const now = ctx.currentTime;
    const notes = [
      { freq: 523.25, time: 0.0, dur: 0.14 }, // C5
      { freq: 659.25, time: 0.14, dur: 0.14 }, // E5
      { freq: 783.99, time: 0.28, dur: 0.16 }, // G5
      { freq: 1046.5, time: 0.44, dur: 0.65 }, // C6 (grand climax)
    ];

    notes.forEach(({ freq, time, dur }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(freq, now + time);

      gain.gain.setValueAtTime(0, now + time);
      gain.gain.linearRampToValueAtTime(0.45, now + time + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, now + time + dur);

      osc.connect(gain);
      gain.connect(this.masterGain!);

      osc.start(now + time);
      osc.stop(now + time + dur);
    });
  }
}

export const soundEngine = new SoundEngine();
