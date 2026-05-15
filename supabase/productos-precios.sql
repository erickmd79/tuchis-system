alter table public.productos
  add column if not exists precio_menudeo numeric,
  add column if not exists precio_mayoreo numeric,
  add column if not exists minimo_mayoreo integer,
  add column if not exists precio_blanca_menudeo numeric,
  add column if not exists precio_blanca_mayoreo numeric,
  add column if not exists precio_pintada_menudeo numeric,
  add column if not exists precio_pintada_mayoreo numeric,
  add column if not exists precio_kit_menudeo numeric,
  add column if not exists precio_kit_mayoreo numeric;

update public.productos
set precio_menudeo = precio
where precio_menudeo is null
  and precio is not null;

update public.productos
set precio_mayoreo = precio
where precio_mayoreo is null
  and precio is not null;

update public.productos
set minimo_mayoreo = 0
where minimo_mayoreo is null;

update public.productos
set
  precio_blanca_menudeo = coalesce(precio_blanca_menudeo, precio_menudeo, precio, 0),
  precio_blanca_mayoreo = coalesce(precio_blanca_mayoreo, precio_mayoreo, precio_menudeo, precio, 0),
  precio_pintada_menudeo = coalesce(precio_pintada_menudeo, precio_menudeo, precio, 0),
  precio_pintada_mayoreo = coalesce(precio_pintada_mayoreo, precio_mayoreo, precio_menudeo, precio, 0),
  precio_kit_menudeo = coalesce(precio_kit_menudeo, precio_menudeo, precio, 0),
  precio_kit_mayoreo = coalesce(precio_kit_mayoreo, precio_mayoreo, precio_menudeo, precio, 0);

alter table public.productos
  alter column precio_menudeo set default 0,
  alter column precio_mayoreo set default 0,
  alter column minimo_mayoreo set default 0,
  alter column precio_blanca_menudeo set default 0,
  alter column precio_blanca_mayoreo set default 0,
  alter column precio_pintada_menudeo set default 0,
  alter column precio_pintada_mayoreo set default 0,
  alter column precio_kit_menudeo set default 0,
  alter column precio_kit_mayoreo set default 0;

select pg_notify('pgrst', 'reload schema');
