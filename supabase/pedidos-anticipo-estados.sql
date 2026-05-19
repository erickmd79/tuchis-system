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

alter table public.pedidos enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pedidos'
      and policyname = 'pedidos_public_select'
  ) then
    create policy pedidos_public_select
      on public.pedidos
      for select
      to anon, authenticated
      using (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pedidos'
      and policyname = 'pedidos_public_insert'
  ) then
    create policy pedidos_public_insert
      on public.pedidos
      for insert
      to anon, authenticated
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pedidos'
      and policyname = 'pedidos_public_update'
  ) then
    create policy pedidos_public_update
      on public.pedidos
      for update
      to anon, authenticated
      using (true)
      with check (true);
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'pedidos'
      and policyname = 'pedidos_public_delete'
  ) then
    create policy pedidos_public_delete
      on public.pedidos
      for delete
      to anon, authenticated
      using (true);
  end if;
end $$;

select pg_notify('pgrst', 'reload schema');
