-- Municipio: from where the customer is visiting
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS municipio TEXT;

-- Abono: second payment registered in admin edit view
ALTER TABLE public.pedidos
  ADD COLUMN IF NOT EXISTS abono NUMERIC(10,2) NOT NULL DEFAULT 0;
