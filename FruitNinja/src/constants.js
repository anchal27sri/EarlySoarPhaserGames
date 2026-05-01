// =========================================================
//  CONSTANTS — All tunable game parameters in one place
// =========================================================

// ── Canvas dimensions ───────────────────────────────────
export const GAME_W = 540;
export const GAME_H = 960;

// ── Alphabet data ───────────────────────────────────────
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const TOTAL_LETTERS = 26;

export const LETTER_COLORS = [
    '#FF6B6B', '#FF8E53', '#FFCD56', '#4BC0C0', '#36A2EB',
    '#9966FF', '#FF6384', '#C9CBCF', '#FF9F40', '#4DC9F6',
    '#F67019', '#F53794', '#ACC236', '#166A8F', '#00A950',
    '#58595B', '#8549BA', '#E8C3B9', '#1C7EF5', '#C45850',
    '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF5', '#FFD700'
];

// ── Letter physics ──────────────────────────────────────
export const LETTER_VELOCITY_X = { min: -80, max: 80 };
export const LETTER_VELOCITY_Y = { min: -750, max: -600 };
export const LETTER_GRAVITY_Y  = 400;
export const LETTER_ANGULAR_VEL = { min: -120, max: 120 };

// ── Timing ──────────────────────────────────────────────
export const LAUNCH_INTERVAL    = 2000;
export const FIRST_LAUNCH_DELAY = 500;

// ── Knife trail ─────────────────────────────────────────
export const TRAIL_LIFETIME_MS = 200;
export const TRAIL_MAX_POINTS  = 20;
