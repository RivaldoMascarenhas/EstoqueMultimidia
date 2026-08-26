"use client";

import confetti from "canvas-confetti";

export function fireInstitutionalConfetti() {
  if (typeof window === "undefined") return;

  try {
    // Single-pass high-performance burst (zero main thread lag)
    confetti({
      particleCount: 90,
      spread: 80,
      origin: { y: 0.65 },
      colors: ["#EAA023", "#002B49", "#0080C8", "#FFFFFF", "#FDB913"],
      disableForReducedMotion: true,
      zIndex: 9999,
      scalar: 1.1,
      gravity: 1.1,
      ticks: 200,
    });

    // Gentle delayed golden shower
    setTimeout(() => {
      confetti({
        particleCount: 40,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.7 },
        colors: ["#EAA023", "#FDB913", "#FFFFFF"],
        zIndex: 9999,
        scalar: 0.9,
      });
      confetti({
        particleCount: 40,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.7 },
        colors: ["#EAA023", "#002B49", "#0080C8"],
        zIndex: 9999,
        scalar: 0.9,
      });
    }, 250);
  } catch {
    // Confetti canvas graceful fallback
  }
}
