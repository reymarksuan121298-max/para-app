-- ==============================================================================
-- PARA: Mobile-Based Tricycle Booking System for Makilala, North Cotabato
-- Migration 04: Supabase Realtime Setup
-- ==============================================================================

-- Enable Realtime publication for tables that require live sync
begin;
  -- Drop publication if exists or alter publication
  alter publication supabase_realtime add table public.rides;
  alter publication supabase_realtime add table public.drivers;
  alter publication supabase_realtime add table public.fare_settings;
commit;

-- Enable REPLICA IDENTITY FULL so UPDATE/DELETE events contain complete record data
alter table public.rides replica identity full;
alter table public.drivers replica identity full;
alter table public.fare_settings replica identity full;
