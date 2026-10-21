-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 12: Verify accounts with EmailJS only (auto-confirm Supabase Auth)
-- ------------------------------------------------------------------------------
-- Registration proof-of-ownership is the EmailJS OTP. Supabase Auth must not
-- add a second, unclickable confirmation step: accounts stuck in
-- "Waiting for verification" are rejected by signInWithPassword() with
-- "Email not confirmed", which users experience as "login does not work".
--
-- This migration:
--   1. Confirms every auth user that still has no confirmation timestamp.
--   2. Forces confirmation on all future auth.users inserts, so a build that
--      runs against a project with "Confirm email" enabled still produces
--      immediately usable accounts.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Confirm existing accounts
-- ------------------------------------------------------------------------------
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now()),
    updated_at = now()
where email_confirmed_at is null;

-- ------------------------------------------------------------------------------
-- 2. Force confirmation on new accounts
--    Runs before GoTrue persists the row, so the account is verified even when
--    the project setting still requires a confirmation email.
-- ------------------------------------------------------------------------------
create or replace function public.force_confirm_new_auth_user()
returns trigger as $$
begin
  if new.email_confirmed_at is null then
    new.email_confirmed_at := now();
  end if;

  return new;
end;
$$ language plpgsql security definer;

do $$
begin
  if exists (
    select 1 from pg_tables where schemaname = 'auth' and tablename = 'users'
  ) then
    drop trigger if exists force_confirm_new_auth_user on auth.users;
    create trigger force_confirm_new_auth_user
      before insert on auth.users
      for each row execute function public.force_confirm_new_auth_user();
  end if;
exception
  when others then
    -- Ignore if running without direct privileges on the auth schema.
    null;
end;
$$;
