// Shared palette for all Dimsam Monopoly artwork. Every SVG should take its
// colours from here so the 40 tiles and the mascot read as one world.
export const P = {
  cream: "#fff6e5",
  cream2: "#fdebc8",
  fur: "#fbe9cf",      // Dimsam's body fur (light cream)
  furShade: "#f3d3a3", // fur shading
  furDeep: "#e4b77e",  // ear tips / deep shading
  peach: "#f7c59f",
  caramel: "#e0a458",
  cocoa: "#6b4a2b",
  cocoa2: "#4a3119",
  ink: "#2f2118",      // outlines, eyes, nose
  sky: "#9ed8f5",
  skyDeep: "#5fb5e6",
  grass: "#a8d672",
  grassDeep: "#6fae4b",
  sand: "#f2d69b",
  blush: "#f7a1c4",
  berry: "#d9487e",
  tongue: "#f08aa8",
  sun: "#ffd66b",
  water: "#7ec8e3",
  waterDeep: "#3b8fc2",
  stone: "#c9c0b3",
  night: "#2c2f6b",
  purple: "#b48be6",
  white: "#ffffff",
  // property group colours (must match convex/defaults.ts groups)
  groups: {
    purple: "#a26be0",
    blue: "#4fa7e8",
    pink: "#f06aa8",
    orange: "#f08a2b",
    red: "#e2443c",
    yellow: "#f5c518",
    green: "#5cb85c",
    deepblue: "#2d5bd1",
  },
} as const;
