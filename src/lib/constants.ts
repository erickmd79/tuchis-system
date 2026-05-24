// Admin WhatsApp number (digits only, with country code, no "+").
// To change it: update NEXT_PUBLIC_ADMIN_WHATSAPP in .env.local
// (or in the Vercel dashboard under Settings → Environment Variables).
export const ADMIN_WHATSAPP =
  process.env.NEXT_PUBLIC_ADMIN_WHATSAPP ?? "5212721112430"

// localStorage key for the in-progress reorder draft.
export const DRAFT_KEY = "tuchis_reorder_draft"
