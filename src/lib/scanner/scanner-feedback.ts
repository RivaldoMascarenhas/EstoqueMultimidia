/**
 * Feedback Sensorial para Leitores de Código de Barras / QR Code
 * Integração de Áudio Sintético (Web Audio API) e Vibração Tátil Háptica (navigator.vibrate).
 * Zero dependências de arquivos de mídia externos e latência ultra-baixa (<5ms).
 */

class ScannerFeedbackManager {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    try {
      if (!this.audioCtx) {
        const AudioCtxClass =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtxClass) {
          this.audioCtx = new AudioCtxClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === "suspended") {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Bip de sucesso moderno de alta fidelidade (tom duplo ascendente estilo leitor de supermercado/hospital)
   */
  public playSuccessSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      // Chime duplo rápido: 1400Hz por 40ms -> 2100Hz por 60ms
      osc.frequency.setValueAtTime(1400, now);
      osc.frequency.setValueAtTime(2100, now + 0.04);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.28, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.13);
    } catch {}
  }

  /**
   * Bip de atenção / item já escaneado / erro
   */
  public playErrorSound(): void {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.setValueAtTime(240, now + 0.08);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.22, now + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch {}
  }

  /**
   * Vibração háptica física no dispositivo (apenas mobile/Android e navegadores compatíveis)
   */
  public vibrate(pattern: number | number[] = 35): void {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    try {
      if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
        navigator.vibrate(pattern);
      }
    } catch {}
  }

  /**
   * Dispara feedback completo de captura bem-sucedida (Som + Vibração)
   */
  public triggerSuccess(options?: { sound?: boolean; vibration?: boolean }): void {
    if (options?.sound !== false) {
      this.playSuccessSound();
    }
    if (options?.vibration !== false) {
      this.vibrate(40);
    }
  }

  /**
   * Dispara feedback de erro / atenção (Som grave + vibração dupla)
   */
  public triggerError(options?: { sound?: boolean; vibration?: boolean }): void {
    if (options?.sound !== false) {
      this.playErrorSound();
    }
    if (options?.vibration !== false) {
      this.vibrate([60, 50, 60]);
    }
  }
}

export const scannerFeedback = new ScannerFeedbackManager();
