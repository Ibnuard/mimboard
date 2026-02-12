// ======================
// Board / Grid
// ======================
export const GRID_SIZE = 1000; // Total board size in pixels
export const GRID_STEP = 10; // Grid cell size (snap unit)

// ======================
// Zoom & Pan
// ======================
export const MAX_ZOOM = 10; // Maximum zoom in scale
export const ZOOM_SPEED = 1.08; // Scroll zoom multiplier
export const DRAG_VISIBLE_RATIO = 0.3; // Minimum visible board ratio when dragging (30%)

// ======================
// Pricing
// ======================
export const PRICE_PER_PIXEL = 0.25; // Rp per pixel (base)
export const OVERRIDE_PRICE_PER_PIXEL = 0.5; // Rp per pixel (overlap surcharge)

// ======================
// Upload
// ======================
export const ACCEPTED_IMAGE_TYPES =
  "image/png, image/jpeg, image/gif, image/webp";
export const ACCEPTED_IMAGE_LABEL = "JPG, PNG, GIF, WebP";
export const SCALE_OPTIONS = [0.25, 0.5, 1, 2, 4];

// ======================
// Onboarding
// ======================
export const ONBOARDING_STORAGE_KEY = "papanmeme_onboarded";
export const ONBOARDING_DELAY_MS = 600; // Delay before showing onboarding

export const ONBOARDING_STEPS = [
  {
    icon: "🔍",
    title: "Zoom",
    desc: "Scroll atau pinch untuk zoom in & out",
  },
  {
    icon: "✋",
    title: "Pan",
    desc: "Drag untuk menjelajahi papan",
  },
  {
    icon: "👆",
    title: "Pilih Pixel",
    desc: "Klik pixel untuk memilih lokasi",
  },
  {
    icon: "🖼️",
    title: "Unggah Meme",
    desc: "Klik tombol upload dan taruh meme-mu!",
  },
];

// ======================
// UI Text
// ======================
export const APP_NAME = "PapanMeme";
export const APP_TAGLINE = "1 juta pixel. 1 meme kamu.";
