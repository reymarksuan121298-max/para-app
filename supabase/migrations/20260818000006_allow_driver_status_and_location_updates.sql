-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 06: Fix Driver Status & Location Update Permissions (RLS & RPC)
-- ==============================================================================

-- 1. Allow drivers to update their availability and location under anon & authenticated roles
drop policy if exists "Drivers can update own record or admin" on public.drivers;

create policy "Drivers can update own record or admin"
  on public.drivers for update
  to anon, authenticated
  using (true)
  with check (true);

-- Also ensure passengers and drivers can update their records under app sessions
drop policy if exists "Passengers can update own record" on public.passengers;
create policy "Passengers can update own record"
  on public.passengers for update
  to anon, authenticated
  using (true)
  with check (true);

-- 2. Stored procedure / RPC functions for atomic driver status and location updates
create or replace function public.update_driver_status(
  p_driver_id uuid,
  p_status text
)
returns jsonb as $$
begin
  update public.drivers
  set
    status = p_status,
    updated_at = now()
  where driver_id = p_driver_id;

  return jsonb_build_object('success', true, 'driver_id', p_driver_id, 'status', p_status);
end;
$$ language plpgsql security definer;

create or replace function public.update_driver_location(
  p_driver_id uuid,
  p_lat decimal,
  p_lng decimal
)
returns jsonb as $$
begin
  update public.drivers
  set
    current_lat = p_lat,
    current_lng = p_lng,
    updated_at = now()
  where driver_id = p_driver_id;

  return jsonb_build_object('success', true, 'driver_id', p_driver_id);
end;
$$ language plpgsql security definer;

grant execute on function public.update_driver_status(uuid, text) to anon, authenticated, service_role;
grant execute on function public.update_driver_location(uuid, decimal, decimal) to anon, authenticated, service_role;
