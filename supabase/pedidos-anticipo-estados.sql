alter table public.pedidos
add column if not exists anticipo numeric default 0;

alter table public.pedidos
add column if not exists estado_pago text default 'pendiente';

update public.pedidos
set
  estado_pago = 'pagado',
  estado = 'pendiente'
where estado = 'pagado';

update public.pedidos
set anticipo = 0
where anticipo is null;

update public.pedidos
set estado = 'pendiente'
where estado is null or estado = '';

update public.pedidos
set estado_pago = 'pendiente'
where estado_pago is null or estado_pago = '';

update public.pedidos
set estado_pago = 'pendiente'
where coalesce(anticipo, 0) = 0
  and estado_pago <> 'pagado';

update public.pedidos
set estado_pago = 'anticipo'
where coalesce(anticipo, 0) > 0
  and estado_pago <> 'pagado';

select pg_notify('pgrst', 'reload schema');
