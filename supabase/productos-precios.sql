alter table public.productos
  add column if not exists precio_menudeo numeric,
  add column if not exists precio_mayoreo numeric,
  add column if not exists minimo_mayoreo integer;

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

alter table public.productos
  alter column precio_menudeo set default 0,
  alter column precio_mayoreo set default 0,
  alter column minimo_mayoreo set default 0;
