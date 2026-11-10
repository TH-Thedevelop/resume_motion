// Everything the street is drawn from: screen size, colors, sprites, and letters.

// Technique 1: the whole world is drawn on this tiny grid, then enlarged.
export const WIDTH = 256;
export const HEIGHT = 144;

// Technique 5: every color in the scene comes from this list, plus each
// project's own palette in content/projects.ts. No transparency, no new shades.
export const COLORS = {
  night: "#0B1020",
  street: "#191F31",
  edge: "#39425E",
  sign: "#111727",
  pink: "#FF5C9E",
  teal: "#45E3D2",
  amber: "#FFC24B",
  paper: "#F4F1EA",
  sub: "#A9B2C4",
  skin: "#E0A878",
} as const;

// Technique 4: a character is a grid written as text, one letter per color.
// "." is see-through. Each frame is 8 wide and 12 tall.
export const SPRITE_COLORS: Record<string, string> = {
  H: COLORS.edge, // hair
  S: COLORS.skin,
  D: COLORS.night, // eyes
  T: COLORS.teal, // shirt
  W: COLORS.paper, // apron
  P: COLORS.sign, // pants
  B: COLORS.night, // shoes
};

export const WALK_A = [
  "..HHHH..",
  ".HHHHHH.",
  ".HSSSSH.",
  "..SDSD..",
  "..SSSS..",
  ".TTWWTT.",
  ".TTWWTT.",
  "S.TWWT.S",
  "..TWWT..",
  "..PPPP..",
  "..P..P..",
  ".BB..BB.",
];

export const WALK_B = [
  "..HHHH..",
  ".HHHHHH.",
  ".HSSSSH.",
  "..SDSD..",
  "..SSSS..",
  ".TTWWTT.",
  "STTWWTTS",
  "..TWWT..",
  "..TWWT..",
  "..PPPP..",
  "...PP...",
  "...BB...",
];

// A 3 x 5 pixel alphabet. Each number is one row, read as 3 bits.
// Add a character here if a project sign needs one.
const FONT: Record<string, number[]> = {
  A: [2, 5, 7, 5, 5],
  B: [6, 5, 6, 5, 6],
  C: [3, 4, 4, 4, 3],
  D: [6, 5, 5, 5, 6],
  E: [7, 4, 6, 4, 7],
  F: [7, 4, 6, 4, 4],
  G: [3, 4, 5, 5, 3],
  H: [5, 5, 7, 5, 5],
  I: [7, 2, 2, 2, 7],
  J: [1, 1, 1, 5, 2],
  K: [5, 5, 6, 5, 5],
  L: [4, 4, 4, 4, 7],
  M: [5, 7, 7, 5, 5],
  O: [2, 5, 5, 5, 2],
  P: [6, 5, 6, 4, 4],
  Q: [2, 5, 5, 6, 3],
  R: [6, 5, 6, 5, 5],
  S: [3, 4, 2, 1, 6],
  T: [7, 2, 2, 2, 2],
  U: [5, 5, 5, 5, 7],
  V: [5, 5, 5, 5, 2],
  W: [5, 5, 7, 7, 5],
  X: [5, 5, 2, 5, 5],
  Y: [5, 5, 2, 2, 2],
  Z: [7, 1, 2, 4, 7],
  "0": [7, 5, 5, 5, 7],
  "1": [2, 6, 2, 2, 7],
  "2": [6, 1, 2, 4, 7],
  "3": [6, 1, 2, 1, 6],
  "4": [5, 5, 7, 1, 1],
  "5": [7, 4, 6, 1, 6],
  "6": [3, 4, 7, 5, 7],
  "7": [7, 1, 2, 2, 2],
  "8": [7, 5, 7, 5, 7],
  "9": [7, 5, 7, 1, 6],
  ">": [4, 2, 1, 2, 4],
  "-": [0, 0, 7, 0, 0],
  ".": [0, 0, 0, 0, 2],
};

// A diagonal doesn't fit in 3 columns, so these letters are 4 wide.
const WIDE_FONT: Record<string, number[]> = {
  N: [9, 13, 11, 9, 9],
};

export function glyph(char: string): { rows: number[]; width: number } | undefined {
  const letter = char.toUpperCase();
  if (WIDE_FONT[letter]) return { rows: WIDE_FONT[letter], width: 4 };
  if (FONT[letter]) return { rows: FONT[letter], width: 3 };
  return undefined;
}

export function charWidth(char: string): number {
  return glyph(char)?.width ?? 3;
}

export function textWidth(text: string): number {
  if (text.length === 0) return 0;
  return text.split("").reduce((sum, char) => sum + charWidth(char) + 1, -1);
}
