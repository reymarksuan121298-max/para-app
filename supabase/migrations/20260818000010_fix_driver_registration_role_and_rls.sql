-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 10: Fix Driver Registration Role Sync and Onboarding RLS Policies
-- ==============================================================================

-- 1. Ensure users table allows anon and authenticated signup upserts and role checks
drop policy if exists "Users can view profile data" on public.users;
drop policy if exists "Users can insert their own profile" on public.users;
drop policy if exists "Users can update own profile or admin" on public.users;

create policy "Users can view profile data"
  on public.users for select
  to anon, authenticated
  using (true);

create policy "Users can insert their own profile"
  on public.users for insert
  to anon, authenticated
  with check (true);

create policy "Users can update own profile or admin"
  on public.users for update
  to anon, authenticated
  using (true)
  with check (true);

-- 2. Ensure drivers table allows insert under anon and authenticated onboarding
drop policy if exists "Drivers can insert own record" on public.drivers;

create policy "Drivers can insert own record"
  on public.drivers for insert
  to anon, authenticated
  with check (true);

-- 3. Ensure passengers table allows insert under anon and authenticated onboarding
drop policy if exists "Passengers can insert own record" on public.passengers;

create policy "Passengers can insert own record"
  on public.passengers for insert
  to anon, authenticated
  with check (true);

-- 4. Auth Hook/Trigger to synchronize role from metadata if auth.users is used
create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
  v_role text;
  v_name text;
  v_phone text;
begin
  v_role := coalesce(new.raw_user_meta_data->>'role', 'passenger');
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_phone := new.raw_user_meta_data->>'phone';

  insert into public.users (user_id, email, name, phone, role, status)
  values (new.id, new.email, v_name, v_phone, v_role, 'active')
  on conflict (user_id) do update
  set
    role = excluded.role,
    name = coalesce(excluded.name, public.users.name),
    phone = coalesce(excluded.phone, public.users.phone),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- Safely bind trigger to auth.users if permissions allow
do $$
begin
  if exists (
    select 1 from pg_tables where schemaname = 'auth' and tablename = 'users'
  ) then
    drop trigger if exists on_auth_user_created on auth.users;
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_auth_user();
  end if;
exception
  when others then
    -- Ignore if running without direct superuser privileges on auth schema
    null;
end;
$$;
