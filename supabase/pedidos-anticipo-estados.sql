alter table pedidos
add column if not exists anticipo numeric default 0;

alter table pedidos
add column if not exists estado_pago text default 'anticipo';

update pedidos
set
  estado_pago = 'pagado',
  estado = 'pendiente'
where estado = 'pagado';

update pedidos
set anticipo = 0
where anticipo is null;

update pedidos
set estado = 'pendiente'
where estado is null or estado = '';

update pedidos
set estado_pago = 'anticipo'
where estado_pago is null or estado_pago = '';
