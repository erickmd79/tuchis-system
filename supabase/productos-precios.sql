alter table public.productos
  add column if not exists precio_menudeo numeric,
  add column if not exists precio_mayoreo numeric;

update public.productos
set precio_menudeo = precio
where precio_menudeo is null
  and precio is not null;

update public.productos
set precio_mayoreo = precio
where precio_mayoreo is null
  and precio is not null;

alter table public.productos
  alter column precio_menudeo set default 0,
  alter column precio_mayoreo set default 0;
