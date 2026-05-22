-- Pricing System Redesign: Escalas table and productos.tamano_id column
-- Execute these statements in Supabase to enable the new scale-based pricing

-- Create escalas table for flexible price scales by tamano + modalidad + quantity range
CREATE TABLE IF NOT EXISTS public.escalas (
  id           BIGSERIAL PRIMARY KEY,
  tamano_id    BIGINT NOT NULL REFERENCES public.tamanos(id) ON DELETE CASCADE,
  modalidad    TEXT   NOT NULL,
  cantidad_min INTEGER NOT NULL DEFAULT 1,
  cantidad_max INTEGER,
  precio       NUMERIC(10,2) NOT NULL,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient lookups during price calculation
CREATE INDEX IF NOT EXISTS idx_escalas_lookup
  ON public.escalas(tamano_id, modalidad, cantidad_min);

-- Add tamano_id column to productos table for linking products to specific sizes
ALTER TABLE public.productos
  ADD COLUMN IF NOT EXISTS tamano_id BIGINT REFERENCES public.tamanos(id);
