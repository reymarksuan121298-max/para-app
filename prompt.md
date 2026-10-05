# Development Prompt: PARA — Mobile-Based Tricycle Booking System

> Use this as a single, self-contained prompt for an AI coding assistant (e.g., Claude Code) to scaffold and build the full PARA application. It is derived from the capstone documentation "PARA: A Mobile-Based Tricycle Booking System for Efficient Transport in Makilala, North Cotabato" and adapted to a modern, production-style stack: **pure React Native (bare workflow, no Expo) + Supabase**.

---

## 1. Project Summary

Build **PARA**, a mobile tricycle-booking platform for Makilala, North Cotabato, Philippines, that digitizes an informal roadside/terminal tricycle system. The platform has **three roles**: **Passenger**, **Driver**, and **Admin**, and must support ride booking, real-time driver matching, live location tracking, fare estimation, and administrative oversight — all built on a single Supabase Postgres backend.

Deliverables:
1. A **React Native CLI** app (`react-native init`, **not Expo**) supporting Android and iOS, with role-aware navigation (Passenger app, Driver app, and an Admin surface — either a third mode in the same app gated by role, or a separate lightweight admin screen set within the same codebase).
2. A **Supabase** backend: Postgres schema, Row Level Security (RLS) policies, Auth, Realtime channels, Edge Functions, and Storage.
3. Supporting docs: `.env.example`, database migration SQL, and a `README.md` with setup/run instructions.

---

## 2. Tech Stack (explicit — do not substitute Expo tooling)

| Layer | Choice |
|---|---|
| Mobile framework | **React Native CLI (bare)** — `npx @react-native-community/cli init` |
| Language | TypeScript |
| Navigation | `@react-navigation/native` + native-stack + bottom-tabs |
| Backend / DB / Auth / Realtime | **Supabase** (Postgres, Supabase Auth, Supabase Realtime, Supabase Storage, Edge Functions) |
| Supabase client | `@supabase/supabase-js` v2 with `react-native-url-polyfill` and `AsyncStorage` session persistence |
| Maps & geolocation | `react-native-maps` (Google provider) + `@react-native-community/geolocation` or `react-native-geolocation-service`; Google Maps Directions/Distance Matrix API (or a Postgres/PostGIS-based straight-line + road-factor estimate if no external API key is available) |
| Push/local notifications | `@notifee/react-native` and/or `@react-native-firebase/messaging` (FCM) — bare RN Firebase setup, not Expo notifications |
| State management | `zustand` or `@tanstack/react-query` + React Context for auth/session |
| Forms | `react-hook-form` + `zod` |
| Storage (secure) | `react-native-keychain` for tokens if needed beyond Supabase's own storage adapter |
| Env config | `react-native-config` (`.env` files, no `app.json`/Expo config) |
| Icons | `react-native-vector-icons` |
| Styling | `StyleSheet` / `nativewind` (Tailwind for RN) — pick one and be consistent |

**Explicitly forbidden:** `expo`, `expo-cli`, `expo-router`, `expo-location`, `expo-notifications`, or any `app.json`/`app.config.js` Expo config. All native modules must be linked via CocoaPods/Gradle autolinking for bare RN.

---

## 3. Roles & Core User Flows

### 3.1 Passenger
- Register/login (email+password or phone OTP via Supabase Auth).
- Set pickup and destination (map pin drop or address search).
- Enter **number of passengers** (system enforces tricycle capacity of 5–7 seats depending on vehicle).
- View fare estimate before confirming.
- Submit booking → system finds nearby **online/available** drivers within radius.
- Track driver's live location once a driver accepts.
- Ride states: `pending → accepted → en_route_to_pickup → in_progress → completed → cancelled`.
- Auto-cancel unclaimed requests after **5 minutes** with no driver response.
- Rate/give feedback after ride completion.
- View ride history and receipts.

### 3.2 Driver
- Register/login; profile includes license number, vehicle number, and seating capacity (5–7).
- Toggle **online/offline** availability status.
- Receive incoming ride requests in real time (only requests within capacity and radius).
- Accept or decline within the 5-minute window.
- Navigate to passenger, start trip, complete trip, view fare collected.
- View daily/weekly earnings and completed trip history.

### 3.3 Admin (MTDA — Makilala Tricycle Drivers Association, conceptually)
- Login with elevated role.
- Manage users (passengers & drivers): view, verify, suspend/unsuspend.
- Manage fare rates/base fare configuration (per km / per passenger rules).
- Manage pickup/drop-off reference locations.
- View booking and payment/fare reports (filter by date, driver, status).
- Basic system configuration (e.g., matching radius, request timeout duration).

---

## 4. Supabase Database Schema

Design the schema in Postgres (via Supabase SQL editor / migrations). Use `uuid` primary keys (`gen_random_uuid()`), enable `pgcrypto`/`pgjwt` extensions as needed, and enable **PostGIS** if precise geo queries are wanted (optional — lat/lng columns are acceptable per the capstone's simpler scope).

```sql
-- USERS (extends Supabase auth.users via a public profile table)
create table public.users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  name varchar(100) not null,
  email varchar(100) unique not null,
  phone varchar(20),
  role text not null check (role in ('passenger','driver','admin')),
  created_at timestamptz not null default now()
);

-- PASSENGERS
create table public.passengers (
  passenger_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade
);

-- DRIVERS
create table public.drivers (
  driver_id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(user_id) on delete cascade,
  license_number varchar(50) not null,
  vehicle_number varchar(50) not null,
  seat_capacity int not null check (seat_capacity between 5 and 7),
  status text not null default 'offline' check (status in ('online','offline','on_trip')),
  current_lat decimal(10,8),
  current_lng decimal(11,8),
  updated_at timestamptz not null default now()
);

-- LOCATIONS (pickup / dropoff reference points, optional reusable table)
create table public.locations (
  location_id uuid primary key default gen_random_uuid(),
  latitude decimal(10,8) not null,
  longitude decimal(11,8) not null,
  address varchar(255)
);

-- RIDES
create table public.rides (
  ride_id uuid primary key default gen_random_uuid(),
  passenger_id uuid not null references public.passengers(passenger_id),
  driver_id uuid references public.drivers(driver_id),
  pickup_location_id uuid not null references public.locations(location_id),
  dropoff_location_id uuid not null references public.locations(location_id),
  passenger_count int not null check (passenger_count between 1 and 7),
  status text not null default 'pending'
    check (status in ('pending','accepted','en_route_to_pickup','in_progress','completed','cancelled','expired')),
  fare decimal(10,2),
  requested_at timestamptz not null default now(),
  accepted_at timestamptz,
  started_at timestamptz,
  completed_at timestamptz,
  cancel_reason text
);

-- PAYMENTS
create table public.payments (
  payment_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(ride_id) on delete cascade,
  amount decimal(10,2) not null,
  payment_status text not null default 'unpaid' check (payment_status in ('paid','unpaid')),
  payment_date timestamptz
);

-- RATINGS / FEEDBACK
create table public.ratings (
  rating_id uuid primary key default gen_random_uuid(),
  ride_id uuid not null references public.rides(ride_id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);

-- FARE CONFIG (admin-managed)
create table public.fare_settings (
  id int primary key default 1,
  base_fare decimal(10,2) not null default 15.00,
  rate_per_km decimal(10,2) not null default 8.00,
  rate_per_extra_passenger decimal(10,2) not null default 5.00,
  match_radius_km decimal(5,2) not null default 3.00,
  request_timeout_seconds int not null default 300
);
```

**Row Level Security (RLS):** Enable RLS on every table. Example policies:
- Passengers can `select`/`insert` only their own `rides`; drivers can `select`/`update` rides assigned to them or currently `pending` within radius (handled via an Edge Function/RPC rather than open policy, to avoid leaking all pending rides to all drivers).
- Admin role (checked via `public.users.role = 'admin'`) bypasses via a `is_admin()` helper function used in policies.
- `drivers.current_lat/current_lng` should be updatable only by the driver who owns the row.

**Realtime:** Enable Supabase Realtime on `rides` (for status changes) and `drivers` (for location updates) so passenger/driver apps subscribe to live channels instead of polling.

**Edge Functions** (Deno, deployed via Supabase CLI):
- `request-ride`: validates passenger capacity vs. nearby driver capacities, creates the ride, and dispatches to eligible online drivers within `match_radius_km`.
- `expire-ride`: scheduled (pg_cron or Supabase Scheduled Function) to auto-cancel `pending` rides older than `request_timeout_seconds`.
- `calculate-fare`: computes fare from `fare_settings` + distance (haversine or PostGIS) + passenger count.
- `accept-ride` / `decline-ride`: atomic transitions with row locking to avoid double-acceptance by two drivers.

---

## 5. App Architecture & Folder Structure

```
para-app/
├── android/                     # bare RN native project
├── ios/                         # bare RN native project
├── .env.example
├── src/
│   ├── api/
│   │   ├── supabaseClient.ts
│   │   ├── auth.ts
│   │   ├── rides.ts
│   │   ├── drivers.ts
│   │   └── admin.ts
│   ├── navigation/
│   │   ├── RootNavigator.tsx    # role-based switch: Passenger | Driver | Admin
│   │   ├── PassengerNavigator.tsx
│   │   ├── DriverNavigator.tsx
│   │   └── AdminNavigator.tsx
│   ├── screens/
│   │   ├── auth/ (Login, Register, RoleSelect)
│   │   ├── passenger/ (Home/Map, BookRide, FareEstimate, TrackRide, RideHistory, Profile, RateRide)
│   │   ├── driver/ (Dashboard, IncomingRequest, ActiveTrip, Earnings, Profile)
│   │   └── admin/ (Dashboard, ManageUsers, ManageFares, ManageLocations, Reports)
│   ├── components/
│   ├── hooks/ (useAuth, useRealtimeRide, useDriverLocation)
│   ├── store/ (zustand stores: authStore, rideStore)
│   ├── types/ (TypeScript types mirroring the DB schema)
│   └── utils/ (fareCalculator, distance, validators)
├── supabase/
│   ├── migrations/
│   └── functions/
├── package.json
└── README.md
```

---

## 6. Functional Requirements Checklist (build against these)

1. Secure registration/login for passengers, drivers, and admin (Supabase Auth).
2. Passenger can book a ride specifying pickup, destination, and passenger count.
3. System shows available drivers based on passenger location and radius.
4. Booking requests are pushed to nearby drivers in real time (Realtime channel + push notification).
5. Drivers can accept or decline requests.
6. Unanswered requests auto-cancel after 5 minutes.
7. Real-time driver location tracking visible to the matched passenger.
8. Fare estimate shown before booking confirmation.
9. Drivers can only accept rides within their vehicle's seat capacity.
10. All user, booking, and transaction data stored securely (RLS + encrypted-at-rest by Supabase).
11. Admin can manage users, fares, and locations.
12. Notifications for booking status, ride confirmation, and ride updates.

## 7. Non-Functional Requirements
- **Performance:** UI actions and Realtime updates should reflect within a couple of seconds.
- **Usability:** Simple, large-tap-target UI suited for varied literacy/tech-comfort levels.
- **Reliability:** Graceful handling of poor/no connectivity (common in Makilala's semi-urban/rural areas) — offline-tolerant UI states, retry queues for location pings.
- **Security:** Supabase Auth (JWT), RLS on all tables, encrypted transport (HTTPS/WSS).
- **Scalability:** Realtime channels scoped per-ride/per-driver to avoid broadcast overload.
- **Compatibility:** Primary target Android (per capstone scope); keep iOS buildable since this is bare RN.
- **Maintainability:** Typed API layer, migrations checked into `supabase/migrations`, clear module boundaries.

---

## 8. Build Instructions for the AI Assistant

1. Scaffold the project with React Native CLI (TypeScript template), confirm it builds on Android before adding features.
2. Set up Supabase: create the SQL migration files exactly matching Section 4, apply RLS policies, and write the Edge Functions listed.
3. Implement `supabaseClient.ts` with `AsyncStorage` + `react-native-url-polyfill` per Supabase's React Native guide (do not use `expo-secure-store`).
4. Build auth flow → role-based root navigator → passenger flow → driver flow → admin flow, in that order, so each layer is testable before the next.
5. Implement real-time ride matching using Supabase Realtime `postgres_changes` subscriptions on `rides` and `drivers`.
6. Implement fare calculation client-side (mirrors) but treat the Edge Function as the source of truth.
7. Add push notifications via Firebase Cloud Messaging (bare RN setup: `google-services.json`, Gradle plugin) — no Expo push service.
8. Write a `README.md` covering: prerequisites, `.env` variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `GOOGLE_MAPS_API_KEY`, Firebase config), local run steps for Android/iOS, and how to apply Supabase migrations/functions.

---

## 9. Out of Scope (per capstone delimitations — do not build these)
- Online/in-app payments (fare is tracked but not processed through a payment gateway).
- High-precision GPS/turn-by-turn navigation beyond basic map tracking.
- Integration with government transportation systems.
- Support for transport modes other than tricycles.

---

*Source: adapted from the capstone documentation "PARA: A Mobile-Based Tricycle Booking System for Efficient Transport in Makilala, North Cotabato" (Chapters I–III: Introduction, Review of Related Literature, Methodology/System Design). The original documentation specifies React Native + Expo CLI + Node.js/Express + MongoDB; this prompt intentionally substitutes **bare React Native (no Expo) + Supabase** as the requested implementation stack while preserving the functional scope, roles, ERD, and requirements.*