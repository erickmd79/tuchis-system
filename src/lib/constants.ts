// ─── Admin WhatsApp ────────────────────────────────────────────────────────
// To change the number: set NEXT_PUBLIC_ADMIN_WHATSAPP in .env.local
// Format: digits only, with country code, no "+" (e.g. "5212721342701")
export const ADMIN_WHATSAPP =
  process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "5212721342701"

// localStorage key for the in-progress reorder draft.
export const DRAFT_KEY = "tuchis_reorder_draft"
