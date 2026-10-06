-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 09: Enable Supabase Realtime for All Public Tables (Idempotent)
-- ==============================================================================

do $$
declare
  tbl text;
  tables text[] := array[
    'users',
    'passengers',
    'drivers',
    'locations',
    'fare_settings',
    'rides',
    'payments',
    'ratings'
  ];
begin
  foreach tbl in array tables
  loop
    -- Add to publication if not already present
    if not exists (
      select 1 
      from pg_publication_tables 
      where pubname = 'supabase_realtime' 
        and schemaname = 'public' 
        and tablename = tbl
    ) then
      execute format('alter publication supabase_realtime add table public.%I', tbl);
      raise notice 'Added public.% to supabase_realtime publication', tbl;
    else
      raise notice 'public.% is already in supabase_realtime publication', tbl;
    end if;

    -- Enable REPLICA IDENTITY FULL so UPDATE/DELETE events emit full record payloads
    execute format('alter table public.%I replica identity full', tbl);
    raise notice 'Set REPLICA IDENTITY FULL on public.%', tbl;
  end loop;
end $$;
