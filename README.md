# PARA — Mobile-Based Tricycle Booking System

**PARA** is a pure React Native (bare workflow, no Expo) and Supabase-powered mobile tricycle booking system designed for **Makilala, North Cotabato, Philippines** (and adaptable across Philippine regional transport corridors). It modernizes informal roadside and terminal tricycle operations with real-time ride matching, live geolocation tracking, automated fare calculations, driver dispatch audio alerts, and municipal administrative oversight.

---

## 📱 Comprehensive System Features by Role

### 🙋 1. Passenger App
- **Live Interactive Map**: View real-time available tricycles nearby with live status indicators and seat capacities.
- **Multi-Modal Location Picker**:
  - **12+ Philippine Regions Support**: Nationwide Nominatim geocoding scoped to regions across Mindanao (Region XII SOCCSKSARGEN, Region XI Davao, Region X NorMin, Region IX, BARMM, Caraga), Visayas, and Luzon.
  - **Interactive Leaflet/OSM Pin Drop**: Drag-and-drop map pin with automatic reverse geocoding to exact street coordinates.
  - **Saved Places**: Quickly save and select **Home (🏠)**, **Work (💼)**, **School (🎓)**, or custom favorite locations (persisted offline via AsyncStorage).
  - **Pre-Configured Regional Landmarks**: One-tap selection of key hubs (Makilala Municipal Hall, Public Market & Terminal, Malasila Crossing, Bulakanon, Kisante, etc.).
- **Smart Fare & Capacity Engine**:
  - Select passenger count (1–7 seats) strictly validated against tricycle seating constraints.
  - Live transparent fare breakdown: Base fare + distance rate + extra passenger surcharges shown before confirmation.
  - Custom pickup landmark notes (e.g., *"In front of 7-Eleven"*, *"Near yellow gate"*).
  - Regional 30 km boundary validation for local tricycle operations.
- **Live Ride Tracking**:
  - Real-time driver GPS tracking on the map with smooth marker animation and ETA calculations.
  - Direct in-app communication shortcuts (**Call Driver** & **SMS Driver** via native device dialer).
  - Trip lifecycle progression: `pending` → `accepted` → `en_route_to_pickup` → `in_progress` → `completed`.
- **Cancellation with Reason Logging**: Cancel active booking before driver arrives with optional cancellation reason prompt.
- **Star Rating & Feedback Review**: Rate drivers 1–5 stars with written comments upon trip completion, updating driver aggregate metrics in real-time.
- **Trip History & Digital Receipts**: Search and inspect past completed rides with itemized fare breakdowns, timestamps, and route details.
- **Profile & Preferences**: Manage personal contact information, view total rides taken, and configure saved addresses.

---

### 🛺 2. Driver App (Tricycle Operator)
- **Online / Offline Availability Toggle**: Instant status synchronization to Supabase with real-time broadcast to passengers.
- **High-Frequency GPS Broadcasting**: Continuous background location broadcasting (1-second intervals during active trips, distance-filtered updates during idle).
- **Synthesizer Audio Dispatch Alert**: Built-in sound notifier that sounds an audible repeating chime on incoming booking requests (`DispatchSoundNotifier`).
- **Animated Ride Alert Modal**: Real-time incoming booking popups with passenger name, pickup landmark, drop-off destination, passenger count, total fare, and an animated countdown timer.
- **Atomic Database RPC Acceptance**: Row-locked PostgreSQL RPC (`accept_ride`) prevents race conditions when multiple drivers attempt to claim the same ride.
- **Step-by-Step Active Trip Management**:
  - **Stage 1**: Navigate to pickup → Tap **"Arrived at Pickup"** (`en_route_to_pickup`).
  - **Stage 2**: Board passengers → Tap **"Start Trip"** (`in_progress`).
  - **Stage 3**: Deliver passengers → Tap **"Complete Trip & Collect Cash"** (`completed`).
- **Direct Passenger Communication**: One-tap native phone calling and SMS buttons on active trip cards.
- **Passenger Cancellation Handling**: Instant push alert if a passenger cancels an active booking with automatic state reset back to the driver dashboard.
- **Live Shift & Earnings Dashboard**:
  - Real-time tracking of today's earnings, weekly earnings, and total cash fare volume.
  - Completed trip counters and acceptance statistics.
- **Service Area & Staging Hub Selector**: Set and adjust active operational hubs/terminals.
- **Driver Profile & Vehicle Specs**: Display tricycle plate number, driver license, vehicle model, seat capacity, and current star rating.

---

### 📊 3. Admin Console (MTDA Municipal Oversight)
- **Municipal Overview Dashboard**: High-level real-time cards showing Total Registered Users (Passengers & Drivers), Active Online Drivers, Total Completed Trips, Gross Municipal Fare Volume, and Average Driver Rating.
- **Dynamic Fare Configuration**:
  - Adjust **Base Fare (₱)**, **Base Distance (km)**, **Rate per KM (₱)**, **Extra Passenger Surcharge (₱)**, **Driver Matching Radius (km)**, and **Request Timeout (seconds)**.
  - Changes instantly propagate to all active passenger fare estimations and driver dispatch calculations.
- **User Verification & Account Moderation**:
  - Searchable passenger and driver registries.
  - Inspect driver documentation (Tricycle Plate, Driver's License number, vehicle capacity).
  - Verify driver credentials or suspend/reactivate accounts.
- **Reference Locations & Terminal Management**:
  - Create, update, or remove municipal landmarks, public terminals, and barangay crossing points.
  - Configure GPS coordinates and hub descriptions.
- **Audit Reports & Financial Analytics**:
  - Filter ride logs by status (`completed`, `cancelled`, `in_progress`, `pending`) and custom date ranges.
  - Export municipal transport summary metrics and revenue tallies.

---

### 🎨 4. Cross-Cutting & Design System Features
- **Dark Mode & Light Mode Theme Engine**: Full system-wide theme switching (`useThemeStore`) with custom **Teal & Amber Tricycle** palette tokens.
- **Slide-Out Sidebar Drawer**: Universal drawer component accessible across all roles with profile details, driver online quick-toggle, dark mode switch, and app version badge.
- **Role-Aware Security & Navigation**: Strict role separation (Passenger, Driver, Admin) enforced both in React Navigation stacks and Supabase Row Level Security (RLS).
- **Graceful Error & Empty States**: Polished error banners, loading overlays, network error handling, and empty state placeholders across all views.
- **Production Release Android Build**: Pre-configured Gradle signing, ProGuard minification, offline JS bundling, and standalone APK generation (`./gradlew assembleRelease`).

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| Mobile Client | **React Native CLI (Bare, 0.76.7, No Expo)** + **TypeScript** |
| Navigation | `@react-navigation/native` + Native Stack + Bottom Tabs |
| Backend & Database | **Supabase** (PostgreSQL 15+, Row Level Security, Realtime CDC, Edge Functions) |
| State Management | `zustand` (Auth, Rides, Drivers, Theme) |
| Local Storage | `@react-native-async-storage/async-storage` (Auth session & Saved Places) |
| Maps & Geolocation | `react-native-maps` + `@react-native-community/geolocation` + `react-native-webview` (Leaflet OSM fallback) |
| Forms & Validation | `react-hook-form` + `zod` |
| Audio Dispatch | Web Audio Synthesizer Notifier |
| Theme & Design | Custom Design System (Teal, Amber, Slate Dark/Light Modes) |
| Native Tooling | Android Studio, JDK 17, ProGuard, React Native Config |

---

## 🏗️ System Architecture & Dispatch Flow

```text
[ PASSENGER ]                          [ SUPABASE / EDGE FUNCTIONS ]                         [ DRIVER ]
     |                                               |                                           |
     |--- 1. Select Pickup/Dropoff & Seats --------->|                                           |
     |--- 2. Calculate Fare Estimate --------------->| (Dynamic Fare Engine)                     |
     |--- 3. Request Ride (request-ride) ----------->|                                           |
     |                                               |--- 4. Realtime Broadcast Pending Ride --->| (Audio Alert Chimes!)
     |                                               |                                           |--- 5. Review & Accept Ride
     |                                               |<-- 6. Atomic RPC Lock (accept_ride) ------|
     |<-- 7. Realtime Ride Status: 'accepted' -------|------------------------------------------>|
     |<-- 8. High-Frequency Driver GPS (1000ms) -----|<-- 9. Background GPS Broadcast -----------|
     |                                               |                                           |
     |                                               |<-- 10. Status: 'en_route_to_pickup' ------|
     |                                               |<-- 11. Status: 'in_progress' -------------|
     |<-- 12. Status: 'completed' -------------------|<-- 13. Collect Cash & Complete Trip ------|
     |--- 14. Submit 5-Star Rating & Review -------->|                                           |
```

---

## 🗄️ Database Architecture

The backend runs on PostgreSQL via Supabase with full **Row Level Security (RLS)**:

- `profiles`: Common user data (`id`, `email`, `full_name`, `phone_number`, `role`, `status`).
- `passengers`: Passenger profile data (`passenger_id`, `default_pickup_address`).
- `drivers`: Driver licensing, tricycle specs, live coordinates (`driver_id`, `license_number`, `plate_number`, `seating_capacity`, `status`, `current_latitude`, `current_longitude`, `rating_average`).
- `rides`: Core booking state machine (`id`, `passenger_id`, `driver_id`, `pickup_latitude`, `pickup_longitude`, `pickup_address`, `pickup_landmark`, `dropoff_latitude`, `dropoff_longitude`, `dropoff_address`, `passenger_count`, `fare_amount`, `distance_km`, `status`, `cancel_reason`, `rating`, `rating_comment`).
- `fare_settings`: Municipal fare parameters editable by MTDA Admins.
- `reference_locations`: Makilala landmarks, public terminals, and barangay waypoints.
- `saved_places`: Passenger favorite locations (Home, Work, School, Custom).

---

## 🚀 Getting Started

### 1. Prerequisites
- **Node.js**: `>= 18.x`
- **JDK**: Java Development Kit 17
- **Android Studio**: Android SDK Build-Tools 34+, Android Emulator or Physical Device
- **Xcode & CocoaPods**: (For iOS development on macOS)
- **Supabase Account & CLI**: `npm install -g supabase`

### 2. Environment Configuration
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Populate your environment variables:
```ini
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
GOOGLE_MAPS_API_KEY=your-google-maps-api-key-here
DEFAULT_LATITUDE=6.9604
DEFAULT_LONGITUDE=125.0886
```

### 3. Database Migrations & Edge Functions
Apply the database migrations in `supabase/migrations/`:
```bash
supabase db push
# or run migrations 01 through 05 in the Supabase SQL Editor:
# 20260818000001_initial_schema.sql
# 20260818000002_row_level_security.sql
# 20260818000003_rpc_functions.sql
# 20260818000004_realtime_setup.sql
# 20260818000005_seed_data.sql
```

Deploy Edge Functions (optional if direct RPC client calls are enabled):
```bash
supabase functions deploy request-ride
supabase functions deploy accept-ride
supabase functions deploy decline-ride
supabase functions deploy calculate-fare
supabase functions deploy expire-ride
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Running in Development
- **Start Metro Bundler**:
  ```bash
  npm start
  ```
- **Run on Android**:
  ```bash
  npm run android
  ```
- **Run on iOS** (macOS only):
  ```bash
  cd ios && pod install && cd ..
  npm run ios
  ```

### 6. Building Production Release (Android APK)
To assemble a signed production APK:
```bash
npm run build:release
# or from the android folder:
# cd android && ./gradlew assembleRelease
```
The output standalone APK will be generated at:
`android/app/build/outputs/apk/release/app-release.apk`

---

## 🗂️ Project Structure

```
para-app/
├── android/                     # Android native project, Gradle build configs, ProGuard rules
├── ios/                         # iOS native project & Podfile
├── scripts/                     # Version bump & postinstall utility scripts
├── src/
│   ├── api/                     # Supabase client & API domain services (auth, rides, drivers, admin)
│   ├── assets/                  # App branding, vehicle icons, marker pins
│   ├── components/
│   │   ├── common/              # Button, Input, Card, Header, Badge, SidebarDrawer, RatingModal, etc.
│   │   ├── driver/              # IncomingRequestModal, DispatchSoundNotifier
│   │   ├── map/                 # MapViewContainer, DriverMarker, LocationPickerModal (Leaflet & OSM)
│   │   └── ride/                # RideStatusCard, FareBreakdownCard
│   ├── hooks/                   # useAuth, useRealtimeRide, useDriverLocation, useFareSettings, useTheme
│   ├── navigation/              # RootNavigator, AuthNavigator, PassengerNavigator, DriverNavigator, AdminNavigator
│   ├── screens/
│   │   ├── auth/                # LoginScreen, RegisterScreen, RoleSelectScreen
│   │   ├── passenger/           # HomeScreen, BookRideScreen, TrackRideScreen, RideHistoryScreen, PassengerProfileScreen
│   │   ├── driver/              # DriverDashboardScreen, ActiveTripScreen, DriverEarningsScreen, DriverProfileScreen
│   │   └── admin/               # AdminDashboardScreen, ManageUsersScreen, ManageFaresScreen, ManageLocationsScreen, ReportsScreen
│   ├── store/                   # Zustand stores (authStore, rideStore, driverStore, themeStore)
│   ├── theme/                   # Colors, typography, spacing tokens, dark/light palette definitions
│   ├── types/                   # TypeScript interfaces (Database, Rides, Users, Navigation)
│   └── utils/                   # Fare calculator, distance formulas, regions, savedLocations, validators
├── supabase/
│   ├── migrations/              # PostgreSQL schema, RLS policies, RPC functions, Realtime replication
│   └── functions/               # Supabase Edge Functions (request, accept, decline, expire, calculate)
├── package.json
└── README.md
```

---

## 🧪 Step-by-Step Multi-Role Testing Guide

1. **Passenger Flow**:
   - Register or log in with role **Passenger**.
   - Tap **"Book Ride"** on the home map.
   - Pick Pickup (*Makilala Public Market*) and Destination (*Malasila Crossing*) using landmark selector or the interactive pin-drop map.
   - Adjust passenger count (e.g., 3 seats) and review the fare breakdown.
   - Tap **"Confirm Booking"** → The app transitions to live ride tracking mode.
2. **Driver Flow (Simultaneous Device or Emulator)**:
   - Log in with role **Driver** (e.g. Plate `MKL-7890`).
   - Toggle **Online** on the Driver Dashboard.
   - When the passenger books, the driver receives an animated alert modal with audio chime dispatch notifier.
   - Tap **"Accept Ride"** before the countdown timer expires.
   - Tap **"Arrived at Pickup"** → Tap **"Start Trip"** → Tap **"Complete Trip & Collect Cash"**.
3. **Passenger Feedback Flow**:
   - Once completed, the passenger receives the completion summary card and 5-star rating modal.
   - Submit a 5-star rating with feedback → Driver's rating average updates immediately.
4. **Admin Flow**:
   - Log in with role **Admin**.
   - Navigate to **"Manage Fares"** to tune municipal rates (Base Fare, Surcharge, Per-KM rate).
   - Navigate to **"Manage Users"** to verify newly registered drivers.
   - Navigate to **"Manage Locations"** to add new barangay terminals or landmarks.
   - Navigate to **"Reports"** to view real-time trip logs, status filters, and revenue summaries.
