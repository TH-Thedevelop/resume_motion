export const duration = { fast: 0.2, base: 0.4, slow: 0.8 } as const;

export const ease = {
  out: [0.22, 1, 0.36, 1], // entrances
  inOut: [0.65, 0, 0.35, 1], // things moving across the screen
} as const;

export const spring = {
  snappy: { type: "spring", bounce: 0.25, duration: 0.5 },
  bouncy: { type: "spring", bounce: 0.4, duration: 0.6 }, // buildings, CTA
} as const;
