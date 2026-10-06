-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 07: Seed Administrator Account
-- ==============================================================================

-- Seed default administrator account if not exists
insert into public.users (
  user_id,
  name,
  email,
  phone,
  role,
  status
)
values (
  'a0000000-0000-0000-0000-000000000001',
  'System Administrator',
  'admin@para.com',
  '09123456789',
  'admin',
  'active'
)
on conflict (user_id) do update
set
  role = 'admin',
  status = 'active';
