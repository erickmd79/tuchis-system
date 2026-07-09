-- Add fecha_pedido column to store the order creation date in Mexico City local time (YYYY-MM-DD).
-- Supabase created_at is UTC; this column captures the calendar day as seen in Mexico City.
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS fecha_pedido date;
