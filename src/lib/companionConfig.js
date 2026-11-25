/**
 * FaultLine Cloud Companion Configuration & Physics Utilities
 *
 * Provides shared constants, physics formulas, and quote pools for the
 * globally persistent FaultLine Cloud AI Companion.
 */

export const COMPANION_CONSTANTS = {
  MAX_RADIUS_X: 5.5,
  MAX_RADIUS_Y: 4.0,
  MAX_BODY_TILT: 4.5,
  PROXIMITY_RADIUS: 260,
  MAX_MAGNETIC_SHIFT: 4.5,
  VIEWPORT_MARGIN: 16,
  PET_WIDTH: 104,
  PET_HEIGHT: 88,
  DEFAULT_Z_INDEX: 40,
};

export const DEFAULT_GREETING = "How can I help you?";

export const ALTERNATIVE_GREETINGS = [
  "How can I help you?",
  "I'm here to help.",
  "Need help investigating?",
  "Ask FaultLine Chatbot.",
  "Let's investigate.",
];

export const CONTEXT_GREETINGS = {
  landing: "How can I help you?",
  library: "Need help exploring scenarios?",
  'legal-library': "Researching jurisdictional statutes?",
  regulations: "Researching jurisdictional statutes?",
  workspace: "Investigating evidence contradictions?",
  scenario: "Need help reviewing this case?",
  intelligence: "How can I help you with your claim?",
  chat: "How can I help you with your claim?",
};

export const POKE_QUOTES = [
  "Hi! I'm your FaultLine Chatbot!",
  "Looking for where the stories don't line up?",
  "I'm cross-referencing the telematics now!",
  "That tickles! Hehe~",
  "Every contradiction has a story.",
  "Evidence verified, quote by quote!",
  "Need help examining an exhibit?",
  "Drag me anywhere you'd like!",
];

export const THINKING_QUOTES = [
  "Analyzing statement discrepancies...",
  "Cross-examining exhibits...",
  "Checking corroboration matrices...",
  "Querying legal statutes...",
  "Reconstructing incident timeline...",
];

export const DONE_QUOTES = [
  "Analysis ready! Check it out!",
  "Findings verified!",
  "Here is what I uncovered!",
];

export const CONTEXT_QUOTES = {
  landing: "Ready to cross-examine claims across 266 scenarios!",
  library: "266 verified motor claims across 20 countries indexed.",
  'legal-library': "Legal statutes & accident codes for 20 jurisdictions ready.",
  regulations: "Legal statutes & accident codes for 20 jurisdictions ready.",
  scenario: "Examining scenario evidence & telematics records.",
  workspace: "Cross-examination canvas active. Click to consult FaultLine Chatbot.",
  intelligence: "I'm listening! Ask me anything about motor claims or evidence.",
  chat: "I'm listening! Ask me anything about motor claims or evidence.",
};

/**
 * Calculates clamped eye pupil offsets based on relative cursor position.
 */
export function calculateEyeOffset(dx, dy) {
  const dist = Math.hypot(dx, dy);
  if (dist < 1) return { x: 0, y: 0, intensity: 0, angle: 0 };

  const angle = Math.atan2(dy, dx);
  const intensity = Math.min(1.0, dist / 320);

  const targetX = Math.cos(angle) * COMPANION_CONSTANTS.MAX_RADIUS_X * intensity;
  const targetY = Math.sin(angle) * COMPANION_CONSTANTS.MAX_RADIUS_Y * intensity;

  return {
    x: Math.round(targetX * 100) / 100,
    y: Math.round(targetY * 100) / 100,
    intensity,
    angle,
  };
}

/**
 * Calculates natural body tilt angle (clamped within 4.5 degrees).
 */
export function calculateBodyTilt(angle, intensity = 1.0) {
  const tilt = Math.cos(angle) * Math.min(1.0, intensity) * COMPANION_CONSTANTS.MAX_BODY_TILT;
  return Math.round(tilt * 100) / 100;
}

/**
 * Calculates magnetic translation toward cursor within proximity zone.
 */
export function calculateMagneticAttraction(dist, angle) {
  const PROX = COMPANION_CONSTANTS.PROXIMITY_RADIUS;
  const prox = Math.max(0, Math.min(1.0, 1.0 - (dist - 50) / (PROX - 50)));

  if (prox <= 0.1) return { x: 0, y: 0, ratio: 0 };

  const magStrength = Math.pow(prox, 1.2) * COMPANION_CONSTANTS.MAX_MAGNETIC_SHIFT;
  return {
    x: Math.round(Math.cos(angle) * magStrength * 100) / 100,
    y: Math.round(Math.sin(angle) * magStrength * 100) / 100,
    ratio: Math.round(prox * 100) / 100,
  };
}

/**
 * Clamps coordinates safely inside visible viewport bounds.
 */
export function clampViewportPosition(
  x,
  y,
  windowWidth = 1200,
  windowHeight = 800,
  margin = COMPANION_CONSTANTS.VIEWPORT_MARGIN,
  petW = COMPANION_CONSTANTS.PET_WIDTH,
  petH = COMPANION_CONSTANTS.PET_HEIGHT
) {
  const maxX = windowWidth - petW - margin;
  const maxY = windowHeight - petH - margin;

  return {
    x: Math.max(margin, Math.min(maxX, Math.round(x))),
    y: Math.max(margin, Math.min(maxY, Math.round(y))),
  };
}
