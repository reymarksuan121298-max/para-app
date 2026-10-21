-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 11: Admin Auth Repair + Role Escalation Guards
-- ------------------------------------------------------------------------------
-- Why: administrator profiles were seeded (and created from the Admin console)
-- in public.users only. public.users.user_id is a foreign key to auth.users(id),
-- and Supabase Auth can only verify a password when an auth.users row exists.
-- Without one, signInWithPassword() always failed with "invalid login
-- credentials", so admins could never sign in regardless of the password used.
--
-- This migration:
--   1. Provisions the auth identity for the seeded administrator.
--   2. Provisions auth identities for every existing admin profile that has none.
--   3. Stops client-supplied signup metadata from granting the admin role.
--   4. Blocks self-service role escalation / status changes / email swaps.
--
-- Default password for repaired accounts: Admin@12345
-- Change it after the first sign-in (Supabase Dashboard > Authentication > Users).
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Seeded administrator identity
-- ------------------------------------------------------------------------------
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
)
select
  '00000000-0000-0000-0000-000000000000',
  'a0000000-0000-0000-0000-000000000001',
  'authenticated',
  'authenticated',
  'admin@para.com',
  crypt('Admin@12345', gen_salt('bf')),
  now(),
  now(),
  '{"provider":"email","providers":["email"]}'::jsonb,
  '{"role":"admin","name":"System Administrator"}'::jsonb,
  now(),
  now(),
  '',
  '',
  '',
  ''
where not exists (
  select 1 from auth.users where lower(email) = 'admin@para.com'
);

-- Keep the matching profile row in sync with the auth identity.
update public.users
set role = 'admin', status = 'active', updated_at = now()
where lower(email) = 'admin@para.com';

insert into public.users (user_id, name, email, phone, role, status)
select a.id, 'System Administrator', 'admin@para.com', '09123456789', 'admin', 'active'
from auth.users a
where lower(a.email) = 'admin@para.com'
  and not exists (
    select 1 from public.users u where lower(u.email) = 'admin@para.com'
  );

-- ------------------------------------------------------------------------------
-- 2. Repair every admin profile that has no auth identity
--    (accounts created through the Admin console before this fix)
-- ------------------------------------------------------------------------------
do $$
declare
  v_admin record;
  v_default_password text := 'Admin@12345';
begin
  for v_admin in
    select u.user_id, lower(u.email) as email
    from public.users u
    where u.role = 'admin'
      and u.email is not null
      and not exists (
        select 1 from auth.users a where a.id = u.user_id
      )
      and not exists (
        select 1 from auth.users a where lower(a.email) = lower(u.email)
      )
  loop
    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      v_admin.user_id,
      'authenticated',
      'authenticated',
      v_admin.email,
      crypt(v_default_password, gen_salt('bf')),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"role":"admin"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    );
  end loop;
end;
$$;

-- ------------------------------------------------------------------------------
-- 3. Ensure email identities exist for the repaired admin accounts
--    (the auth schema differs between Supabase versions, so this is guarded)
-- ------------------------------------------------------------------------------
do $$
declare
  v_has_provider_id boolean;
  v_id_type text;
  v_id_expr text;
  v_cols text;
  v_vals text;
begin
  if to_regclass('auth.identities') is null then
    return;
  end if;

  select exists (
    select 1
    from information_schema.columns
    where table_schema = 'auth'
      and table_name = 'identities'
      and column_name = 'provider_id'
  ) into v_has_provider_id;

  select data_type
  from information_schema.columns
  where table_schema = 'auth'
    and table_name = 'identities'
    and column_name = 'id'
  into v_id_type;

  v_id_expr := case
    when v_id_type = 'uuid' then 'gen_random_uuid()'
    else 'gen_random_uuid()::text'
  end;

  if v_has_provider_id then
    v_cols := 'id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at';
    v_vals := v_id_expr || ', u.id, '
      || 'jsonb_build_object(''sub'', u.id::text, ''email'', u.email, ''email_verified'', true), '
      || '''email'', u.email, now(), now(), now()';
  else
    v_cols := 'id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at';
    v_vals := v_id_expr || ', u.id, '
      || 'jsonb_build_object(''sub'', u.id::text, ''email'', u.email, ''email_verified'', true), '
      || '''email'', now(), now(), now()';
  end if;

  execute 'insert into auth.identities (' || v_cols || ') select ' || v_vals
    || ' from auth.users u'
    || ' join public.users p on p.user_id = u.id and p.role = ''admin'''
    || ' where not exists ('
    || '   select 1 from auth.identities i'
    || '   where i.user_id = u.id and i.provider = ''email'''
    || ' )';
end;
$$;

-- ------------------------------------------------------------------------------
-- 4. Signup metadata can no longer grant the admin role
--    Previously raw_user_meta_data->>'role' was trusted, so anyone calling
--    supabase.auth.signUp({ data: { role: 'admin' } }) became an administrator.
--    Admins are now only assignable by an existing admin (RLS + guard trigger).
-- ------------------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger as $$
declare
  v_role text;
  v_name text;
  v_phone text;
begin
  v_role := case
    when new.raw_user_meta_data->>'role' in ('passenger', 'driver')
      then new.raw_user_meta_data->>'role'
    else 'passenger'
  end;
  v_name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  v_phone := new.raw_user_meta_data->>'phone';

  insert into public.users (user_id, email, name, phone, role, status)
  values (new.id, new.email, v_name, v_phone, v_role, 'active')
  on conflict (user_id) do update
  set
    -- never downgrade an administrator promoted by another admin
    role = case
      when public.users.role = 'admin' then 'admin'
      else excluded.role
    end,
    name = coalesce(excluded.name, public.users.name),
    phone = coalesce(excluded.phone, public.users.phone),
    updated_at = now();

  return new;
end;
$$ language plpgsql security definer;

-- ------------------------------------------------------------------------------
-- 5. Guard against privilege escalation from the client
--    RLS on public.users stays open for onboarding (anon signup upserts), so the
--    sensitive columns are protected here instead. Runs as the caller so
--    auth.uid() / current_user reflect the request; migrations and server-side
--    services are trusted.
-- ------------------------------------------------------------------------------
create or replace function public.guard_user_privilege_changes()
returns trigger as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if new.role = 'admin' and old.role is distinct from 'admin' and not public.is_admin() then
    raise exception 'Only an administrator can grant administrator access';
  end if;

  if new.status is distinct from old.status and not public.is_admin() then
    raise exception 'Only an administrator can change account status';
  end if;

  if new.email is distinct from old.email and not public.is_admin() then
    raise exception 'Only an administrator can change the account email';
  end if;

  return new;
end;
$$ language plpgsql;

drop trigger if exists guard_user_privilege_changes on public.users;
create trigger guard_user_privilege_changes
  before update on public.users
  for each row execute function public.guard_user_privilege_changes();
