// =========================================================
//  CONSTANTS — All tunable game parameters in one place
// =========================================================

// ── Canvas dimensions ───────────────────────────────────
// The game uses a 9:16 portrait aspect ratio (540 × 960).
// Phaser's Scale.FIT mode scales this virtual resolution to
// fill any screen while preserving the aspect ratio, so all
// position math can use these fixed coordinates.
const GAME_W = 540;
const GAME_H = 960;

// ── Alphabet data ───────────────────────────────────────
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const TOTAL_LETTERS = 26;

// One unique colour per letter (indices 0–25 map to A–Z).
// Used for letter orb gradients, particle tints, and the
// win-screen letter grid.
const LETTER_COLORS = [
    '#FF6B6B', '#FF8E53', '#FFCD56', '#4BC0C0', '#36A2EB',  // A–E
    '#9966FF', '#FF6384', '#C9CBCF', '#FF9F40', '#4DC9F6',  // F–J
    '#F67019', '#F53794', '#ACC236', '#166A8F', '#00A950',  // K–O
    '#58595B', '#8549BA', '#E8C3B9', '#1C7EF5', '#C45850',  // P–T
    '#FF5733', '#33FF57', '#3357FF', '#F333FF', '#33FFF5', '#FFD700'  // U–Z
];

// ── Letter physics ──────────────────────────────────────
// Letters are launched from below the screen with upward velocity.
//
// Projectile math (Arcade physics does this per-frame):
//   x(t) = x₀ + Vx·t
//   y(t) = y₀ + Vy·t + ½·g·t²
//
// With Vy ≈ −675 px/s (midpoint) and g = 400 px/s², the letter
// reaches its apex at  t_peak = |Vy| / g ≈ 1.69 s  and climbs
//   Δy = Vy² / (2·g) ≈ 569 px  above its start.
// Since it starts 80 px below the screen (y = 1040), its peak
// is around y ≈ 1040 − 569 = 471 px — roughly mid-screen.
// It then falls back below the canvas after ≈ 3.4 s total.
const LETTER_VELOCITY_X = { min: -80, max: 80 };   // slight horizontal drift (px/s)
const LETTER_VELOCITY_Y = { min: -750, max: -600 }; // upward launch speed (px/s, negative = up)
const LETTER_GRAVITY_Y  = 400;                       // pull-back acceleration (px/s²)
const LETTER_ANGULAR_VEL = { min: -120, max: 120 };  // spin while airborne (deg/s)

// ── Timing ──────────────────────────────────────────────
const LAUNCH_INTERVAL    = 2000;  // ms between launch attempts
const FIRST_LAUNCH_DELAY = 500;   // ms before the very first letter

// ── Knife trail ─────────────────────────────────────────
// The trail is a polyline of the last N pointer positions.
// Points older than TRAIL_LIFETIME_MS are discarded each frame.
const TRAIL_LIFETIME_MS = 200;   // how long each point lives (ms)
const TRAIL_MAX_POINTS  = 20;    // max stored points (ring buffer)
