# Ride-Hailing Booking & Driver Dispatch Algorithm

## 1. SYSTEM PURPOSE

Build a real-time ride-hailing system where passengers can request rides and the system automatically finds, ranks, offers, and assigns the best available driver.

The system must support:

* Passenger booking
* Driver availability
* GPS tracking
* Nearby driver discovery
* Driver ranking
* Ride offers
* Driver acceptance/rejection
* Atomic driver assignment
* Real-time booking updates
* Trip lifecycle
* Fare calculation
* Payment
* Rating
* Cancellation
* Driver state management
* Recovery from network/app disconnection

The database/backend is the source of truth.

---

# 2. CORE SYSTEM

```text
PASSENGER
    |
    | Create Ride
    v
BOOKING ENGINE
    |
    v
DISPATCH ENGINE
    |
    +--> DRIVER DISCOVERY
    |
    +--> DRIVER FILTERING
    |
    +--> DRIVER RANKING
    |
    +--> RIDE OFFER
    |
    +--> DRIVER ACCEPT/REJECT
    |
    v
ATOMIC ASSIGNMENT
    |
    v
TRIP ENGINE
    |
    +--> DRIVER ARRIVING
    |
    +--> DRIVER ARRIVED
    |
    +--> TRIP STARTED
    |
    +--> LIVE GPS
    |
    +--> TRIP COMPLETED
    |
    v
PAYMENT ENGINE
    |
    v
RATING ENGINE
    |
    v
DRIVER AVAILABLE AGAIN
```

---

# 3. MAIN ACTORS

## Passenger

```text
Passenger
    |
    +-- Login
    +-- Set pickup
    +-- Set destination
    +-- Select service
    +-- Request ride
    +-- Cancel ride
    +-- Track driver
    +-- Track trip
    +-- Pay
    +-- Rate driver
    +-- View history
```

## Driver

```text
Driver
    |
    +-- Login
    +-- Online/Offline
    +-- Available/Busy
    +-- Receive offer
    +-- Accept/Reject
    +-- Navigate to pickup
    +-- Arrived
    +-- Start trip
    +-- Complete trip
    +-- View earnings
    +-- Rate passenger
```

---

# 4. BOOKING STATE MACHINE

```text
REQUESTED
    |
    v
SEARCHING
    |
    v
OFFERED
    |
    v
ACCEPTED
    |
    v
DRIVER_ARRIVING
    |
    v
DRIVER_ARRIVED
    |
    v
TRIP_STARTED
    |
    v
TRIP_COMPLETED
    |
    v
PAYMENT_COMPLETED
    |
    v
RATED
```

Cancellation states:

```text
REQUESTED
    |
    +----> CANCELLED_BY_PASSENGER

SEARCHING
    |
    +----> CANCELLED_BY_PASSENGER

ACCEPTED
    |
    +----> CANCELLED_BY_PASSENGER
    |
    +----> CANCELLED_BY_DRIVER

DRIVER_ARRIVING
    |
    +----> CANCELLED_BY_PASSENGER
    |
    +----> CANCELLED_BY_DRIVER
```

No driver:

```text
SEARCHING
    |
    v
NO_DRIVER_FOUND
```

---

# 5. DRIVER STATE MACHINE

Driver state is separate from booking state.

```text
OFFLINE
   |
   v
ONLINE
   |
   v
AVAILABLE
   |
   v
BUSY
   |
   v
AVAILABLE
   |
   v
OFFLINE
```

Rules:

```text
OFFLINE:
    is_online = false
    is_available = false

ONLINE:
    is_online = true

AVAILABLE:
    is_online = true
    is_available = true

BUSY:
    is_online = true
    is_available = false
```

A driver cannot receive a ride when:

```text
is_online = false
```

or:

```text
is_available = false
```

---

# 6. PASSENGER BOOKING ALGORITHM

```text
CREATE_BOOKING(passenger, pickup, destination, service_type)

START

1. Authenticate passenger.

2. Verify passenger is allowed to book.

3. Validate pickup coordinates.

4. Validate destination coordinates.

5. Verify service_type exists.

6. Calculate route.

7. Calculate estimated distance.

8. Calculate estimated duration.

9. Calculate estimated fare.

10. Create booking.

11. Set:
       status = REQUESTED

12. Immediately change:
       status = SEARCHING

13. Start dispatch engine.

END
```

---

# 7. FARE ESTIMATION

Use configurable fare values.

Example:

```text
base_fare = 50
per_km = 15
per_minute = 2
minimum_fare = 50
```

Formula:

```text
distance_fare = distance_km * per_km

time_fare = duration_minutes * per_minute

estimated_fare =
    base_fare
    + distance_fare
    + time_fare
```

Final fare may include:

```text
base_fare
distance_fare
time_fare
surge_fee
discount
minimum_fare
```

Never trust fare values sent from the mobile application.

The backend must calculate the final fare.

---

# 8. DRIVER LOCATION SYSTEM

Maintain a current location for every online driver.

```text
driver_locations

driver_id
latitude
longitude
heading
speed
accuracy
updated_at
```

Use geographic coordinates.

Prefer PostGIS for spatial queries.

The driver app sends:

```text
latitude
longitude
heading
speed
accuracy
timestamp
```

while online.

During an active trip, increase tracking frequency.

Example:

```text
ONLINE:
    update every 5–10 seconds

ACTIVE TRIP:
    update every 2–5 seconds
```

Actual frequency should consider battery, GPS accuracy, and network usage.

---

# 9. DRIVER DISCOVERY

Initial radius:

```text
INITIAL_RADIUS = 2 km
```

Maximum radius:

```text
MAX_RADIUS = 10 km
```

Increment:

```text
RADIUS_INCREMENT = 2 km
```

Search:

```text
2 km
    |
    +-- drivers found?
          |
          +-- YES → rank drivers
          |
          +-- NO
                |
                v
              4 km
                |
                v
              6 km
                |
                v
              8 km
                |
                v
             10 km
                |
                v
         NO_DRIVER_FOUND
```

---

# 10. ELIGIBLE DRIVER FILTER

A driver is eligible only if:

```text
driver.status = APPROVED

AND

driver.is_online = true

AND

driver.is_available = true

AND

vehicle.status = ACTIVE

AND

vehicle.service_type matches requested service

AND

driver has valid current GPS

AND

driver is within dispatch radius
```

Exclude:

```text
offline drivers
busy drivers
suspended drivers
inactive vehicles
wrong vehicle type
invalid GPS
stale GPS
drivers outside radius
```

---

# 11. STALE GPS RULE

A driver's location must not be considered reliable forever.

Example:

```text
LOCATION_MAX_AGE = 30 seconds
```

If:

```text
NOW - updated_at > 30 seconds
```

then:

```text
driver = temporarily unavailable for dispatch
```

Do not send new bookings to drivers with stale location data.

---

# 12. DRIVER DISTANCE

Calculate geographic distance between:

```text
Passenger pickup
```

and:

```text
Driver current location
```

Prefer:

```text
PostGIS ST_Distance
```

for server-side calculation.

Do not load every driver into React Native and calculate all distances on the client.

---

# 13. DRIVER ETA

Distance alone should not determine the winner.

A driver 500 meters away may have a 10-minute ETA because of traffic or road restrictions.

Therefore prioritize:

```text
ETA
```

when possible.

Driver ranking should use:

```text
ETA
Distance
Rating
Acceptance reliability
Cancellation reliability
```

---

# 14. DRIVER MATCHING SCORE

Example:

```text
MATCH_SCORE =
    ETA_SCORE * 0.40
    +
    DISTANCE_SCORE * 0.30
    +
    RATING_SCORE * 0.15
    +
    RELIABILITY_SCORE * 0.15
```

Normalize each component to:

```text
0–100
```

Example:

```text
Driver A

ETA score = 96
Distance score = 90
Rating score = 98
Reliability score = 92

Final:

96 * .40
+ 90 * .30
+ 98 * .15
+ 92 * .15

= 94.7
```

Sort:

```text
highest score → lowest score
```

---

# 15. DISPATCH ENGINE

```text
DISPATCH_RIDE(booking)

START

1. Set radius = INITIAL_RADIUS.

2. While radius <= MAX_RADIUS:

    a. Find eligible drivers.

    b. If no drivers:
           increase radius
           continue

    c. Rank drivers.

    d. Create ride offers.

    e. Wait for driver responses.

    f. If one driver accepts:
           perform atomic assignment
           return SUCCESS

    g. If all offers fail:
           increase radius
           continue

3. Set:
       booking.status = NO_DRIVER_FOUND

4. Notify passenger.

END
```

---

# 16. RIDE OFFER SYSTEM

Each driver request must create a separate offer.

```text
booking_offers

id
booking_id
driver_id
status
offered_at
expires_at
responded_at
```

Offer statuses:

```text
PENDING
ACCEPTED
REJECTED
EXPIRED
CANCELLED
```

Default offer timeout:

```text
10 seconds
```

Example:

```text
Driver A
    |
    +-- OFFER
    |
    +-- 10 seconds
          |
          +-- ACCEPT
          |
          +-- REJECT
          |
          +-- EXPIRE
```

---

# 17. SEQUENTIAL DISPATCH

Recommended default algorithm:

```text
Rank:

1. Driver A
2. Driver B
3. Driver C
4. Driver D
```

Offer:

```text
Driver A
```

If:

```text
ACCEPT
```

stop.

If:

```text
REJECT
```

send to Driver B.

If:

```text
EXPIRED
```

send to Driver B.

Continue until:

```text
accepted
```

or:

```text
no drivers remain
```

---

# 18. OPTIONAL BATCH DISPATCH

Optional configuration:

```text
OFFER_BATCH_SIZE = 3
```

Send simultaneously:

```text
Driver A
Driver B
Driver C
```

The first valid acceptance wins.

After assignment:

```text
A = CANCELLED
B = ACCEPTED
C = CANCELLED
```

if B wins.

---

# 19. ATOMIC ASSIGNMENT

This is mandatory.

Never allow the mobile app to directly assign the driver.

Use:

```text
accept_ride_offer(offer_id)
```

PostgreSQL RPC.

Algorithm:

```text
ACCEPT_RIDE_OFFER(offer_id)

BEGIN TRANSACTION

1. Authenticate current user.

2. Find offer.

3. Verify offer belongs to current driver.

4. Lock booking.

5. Verify booking.status = SEARCHING
   or valid assignable state.

6. Verify offer.status = PENDING.

7. Verify offer has not expired.

8. Verify driver.is_online = true.

9. Verify driver.is_available = true.

10. Assign driver:

       booking.driver_id = driver_id

11. Set:

       booking.status = ACCEPTED

12. Set:

       driver.is_available = false

13. Set:

       offer.status = ACCEPTED

14. Cancel all other pending offers.

15. Commit transaction.

RETURN SUCCESS

END
```

If another driver already accepted:

```text
RETURN ALREADY_ASSIGNED
```

No second driver can win.

---

# 20. RACE CONDITION EXAMPLE

Suppose:

```text
Passenger → Booking #1001
```

and:

```text
Driver A → Accept
Driver B → Accept
```

at the same time.

Database:

```text
Driver A
    |
    v
LOCK BOOKING
    |
    v
Assign A
    |
    v
COMMIT
```

Then Driver B:

```text
LOCK BOOKING
    |
    v
booking.status != SEARCHING
    |
    v
REJECT
```

Result:

```text
Booking #1001 → Driver A
```

Never:

```text
Booking #1001 → Driver A + Driver B
```

---

# 21. PASSENGER REALTIME

Subscribe passenger to:

```text
booking:{booking_id}
```

Listen for:

```text
status changes
driver assignment
driver arrival
trip start
trip completion
cancellation
payment
```

Passenger UI updates immediately.

---

# 22. DRIVER REALTIME

Driver subscribes to their active offers.

When an offer is created:

```text
NEW_RIDE_OFFER
```

Display:

```text
Pickup
Destination
Distance
Estimated fare
Estimated duration
Countdown
```

---

# 23. DRIVER ACCEPTED

After successful atomic assignment:

```text
booking.status = ACCEPTED
```

Then:

```text
driver.is_available = false
```

Passenger receives:

```text
Driver found
```

Display:

```text
Driver name
Driver photo
Vehicle
Plate number
Rating
ETA
Live location
```

---

# 24. DRIVER ARRIVING

Set:

```text
booking.status = DRIVER_ARRIVING
```

Start active navigation/location tracking.

Passenger sees:

```text
Driver moving toward pickup
```

---

# 25. DRIVER ARRIVED

Driver presses:

```text
ARRIVED
```

Backend verifies:

```text
assigned driver
valid booking
driver near pickup
```

Then:

```text
booking.status = DRIVER_ARRIVED
```

Notify passenger.

---

# 26. START TRIP

Driver presses:

```text
START TRIP
```

Backend verifies:

```text
booking.status = DRIVER_ARRIVED
```

Then:

```text
booking.status = TRIP_STARTED
trip.started_at = NOW()
```

Begin active-trip GPS tracking.

---

# 27. ACTIVE TRIP

During:

```text
TRIP_STARTED
```

continuously provide:

```text
driver latitude
driver longitude
heading
speed
ETA
route
distance remaining
```

Passenger sees the driver moving on the map.

---

# 28. TRIP COMPLETION

Driver presses:

```text
COMPLETE TRIP
```

Backend:

```text
1. Verify assigned driver.

2. Verify booking is TRIP_STARTED.

3. Calculate actual trip duration.

4. Calculate actual distance.

5. Calculate final fare.

6. Set:
       booking.status = TRIP_COMPLETED

7. Store:
       completed_at
```

---

# 29. FINAL FARE

Calculate server-side:

```text
FINAL_FARE =
    BASE_FARE
    + DISTANCE_FARE
    + TIME_FARE
    + SURGE
    - DISCOUNT
```

Apply:

```text
minimum fare
```

if necessary.

Never accept:

```text
final_fare
```

directly from the client.

---

# 30. PAYMENT

Payment states:

```text
PENDING
PAID
FAILED
REFUNDED
```

Cash:

```text
TRIP_COMPLETED
      |
      v
DRIVER CONFIRMS CASH
      |
      v
PAYMENT_COMPLETED
```

Digital:

```text
TRIP_COMPLETED
      |
      v
PAYMENT GATEWAY
      |
      v
SERVER VERIFICATION
      |
      v
PAYMENT_COMPLETED
```

Do not trust only client-side payment success.

---

# 31. DRIVER RESET

After payment:

```text
driver.is_available = true
```

if:

```text
driver.is_online = true
```

Otherwise:

```text
driver.is_available = false
```

Driver can now receive another booking.

---

# 32. RATING

After payment:

```text
Passenger → Driver
Driver → Passenger
```

Rating:

```text
1–5
```

Store:

```text
booking_id
from_user_id
to_user_id
rating
comment
created_at
```

Only allow rating after:

```text
PAYMENT_COMPLETED
```

or the configured final booking state.

---

# 33. CANCELLATION

Passenger cancellation:

```text
Passenger
    |
    v
CANCEL
    |
    v
Backend validates state
    |
    v
booking.status = CANCELLED_BY_PASSENGER
```

Driver cancellation:

```text
Driver
    |
    v
CANCEL
    |
    v
Select reason
    |
    v
Backend validates
    |
    v
booking.status = CANCELLED_BY_DRIVER
```

Store:

```text
cancelled_by
cancellation_reason
cancelled_at
```

Never delete the booking.

---

# 34. DRIVER CANCEL AFTER ACCEPTANCE

If driver cancels after assignment:

```text
ACCEPTED
    |
    v
DRIVER CANCEL
    |
    v
CANCELLED_BY_DRIVER
```

Then:

```text
driver.is_available = true
```

Optionally restart dispatch:

```text
RE-DISPATCH
```

if passenger still wants the ride.

---

# 35. PASSENGER CANCEL DURING SEARCH

If passenger cancels:

```text
SEARCHING
    |
    v
CANCELLED_BY_PASSENGER
```

Immediately cancel:

```text
all pending booking offers
```

Drivers should no longer see the request.

---

# 36. NO DRIVER FOUND

If:

```text
radius > MAX_RADIUS
```

and no driver accepted:

```text
booking.status = NO_DRIVER_FOUND
```

Notify passenger:

```text
No available driver found nearby.
```

The passenger may:

```text
Try Again
```

or:

```text
Cancel
```

---

# 37. GPS RECONNECTION

If driver loses internet:

```text
GPS updates stop
```

Do not immediately cancel the trip.

When connection returns:

```text
1. Reconnect Supabase.
2. Fetch current booking.
3. Fetch current driver state.
4. Fetch latest location.
5. Resume realtime subscription.
6. Resume GPS updates.
```

Database remains the source of truth.

---

# 38. PASSENGER RECONNECTION

If passenger closes application during active booking:

```text
APP CLOSED
    |
    v
APP REOPENED
    |
    v
AUTHENTICATE
    |
    v
GET ACTIVE BOOKING
    |
    v
GET DRIVER
    |
    v
SUBSCRIBE REALTIME
    |
    v
RESTORE MAP
```

Do not rely on local state to determine whether a ride is active.

---

# 39. DRIVER RECONNECTION

Driver app:

```text
APP REOPENED
    |
    v
AUTHENTICATE
    |
    v
GET DRIVER STATE
    |
    v
GET ACTIVE BOOKING
    |
    v
GET PENDING OFFERS
    |
    v
RESTORE REALTIME
```

---

# 40. DATABASE STRUCTURE

Recommended tables:

```text
profiles
drivers
vehicles
driver_locations
bookings
booking_offers
payments
ratings
fare_configs
```

Relationships:

```text
profiles
   |
   +---- drivers
            |
            +---- vehicles
            |
            +---- driver_locations

profiles
   |
   +---- bookings
            |
            +---- booking_offers
            |
            +---- payments
            |
            +---- ratings
```

---

# 41. BOOKING TABLE

```text
bookings

id
booking_number
passenger_id
driver_id
service_type
pickup_location
destination_location
pickup_address
destination_address
status
estimated_distance
estimated_duration
estimated_fare
actual_distance
actual_duration
final_fare
started_at
completed_at
cancelled_at
created_at
updated_at
```

---

# 42. BOOKING OFFERS

```text
booking_offers

id
booking_id
driver_id
status
offered_at
expires_at
responded_at
created_at
```

---

# 43. DRIVER LOCATION

```text
driver_locations

driver_id
latitude
longitude
location
heading
speed
accuracy
updated_at
```

Use:

```text
PostGIS geography(Point, 4326)
```

if available.

---

# 44. REQUIRED DATABASE INDEXES

Create indexes for:

```text
drivers(is_online, is_available)

bookings(passenger_id)

bookings(driver_id)

bookings(status)

booking_offers(booking_id)

booking_offers(driver_id)

booking_offers(status)

driver_locations(driver_id)
```

Create spatial indexes for:

```text
driver_locations.location
```

when using PostGIS.

---

# 45. SECURITY

Use Supabase Row Level Security.

Passenger:

```text
Can view own bookings.
Can create own bookings.
Can view assigned driver information.
Can view own payments.
Can create own ratings.
```

Driver:

```text
Can view own offers.
Can view assigned bookings.
Can update own location.
Can update own online status.
Can accept own offer only through RPC.
```

Admin:

```text
Can monitor all system records according to role permissions.
```

Never expose privileged database keys inside React Native.

---

# 46. IMPORTANT SERVER-SIDE OPERATIONS

The following must be backend-controlled:

```text
fare calculation
final fare
driver assignment
offer expiration
booking state transition
payment verification
driver availability
cancellation validation
rating validation
```

The mobile app should request operations, not directly control critical database state.

---

# 47. CORE RPC FUNCTIONS

Implement PostgreSQL functions similar to:

```text
create_booking()
estimate_fare()
find_nearby_drivers()
create_ride_offer()
accept_ride_offer()
reject_ride_offer()
expire_ride_offer()
mark_driver_arrived()
start_trip()
complete_trip()
cancel_booking()
process_payment()
submit_rating()
```

The most important function is:

```text
accept_ride_offer()
```

because it prevents race conditions.

---

# 48. MASTER DISPATCH PSEUDOCODE

```text
FUNCTION dispatchRide(booking):

    radius = INITIAL_RADIUS

    WHILE radius <= MAX_RADIUS:

        eligibleDrivers =
            findEligibleDrivers(
                booking.pickup,
                booking.service_type,
                radius
            )

        IF eligibleDrivers is empty:

            radius += RADIUS_INCREMENT

            CONTINUE


        rankedDrivers =
            rankDrivers(eligibleDrivers)


        FOR each driver IN rankedDrivers:

            offer =
                createOffer(
                    booking,
                    driver
                )


            notifyDriver(driver, offer)


            WAIT for:

                ACCEPT
                REJECT
                EXPIRE


            IF ACCEPT:

                result =
                    atomicAssign(offer)


                IF result == SUCCESS:

                    notifyPassenger()

                    RETURN SUCCESS


                ELSE:

                    CONTINUE


        radius += RADIUS_INCREMENT


    booking.status = NO_DRIVER_FOUND

    notifyPassenger()

    RETURN NO_DRIVER_FOUND
```

---

# 49. MASTER PASSENGER FLOW

```text
LOGIN
  |
  v
HOME
  |
  v
SELECT PICKUP
  |
  v
SELECT DESTINATION
  |
  v
CALCULATE FARE
  |
  v
CONFIRM RIDE
  |
  v
SEARCHING
  |
  v
DRIVER FOUND
  |
  v
DRIVER ARRIVING
  |
  v
DRIVER ARRIVED
  |
  v
TRIP STARTED
  |
  v
LIVE TRACKING
  |
  v
TRIP COMPLETED
  |
  v
PAYMENT
  |
  v
RATING
  |
  v
RIDE HISTORY
```

---

# 50. MASTER DRIVER FLOW

```text
LOGIN
  |
  v
DRIVER HOME
  |
  v
GO ONLINE
  |
  v
AVAILABLE
  |
  v
RECEIVE OFFER
  |
  +---- REJECT ----> NEXT OFFER
  |
  v
ACCEPT
  |
  v
BUSY
  |
  v
DRIVER ARRIVING
  |
  v
DRIVER ARRIVED
  |
  v
START TRIP
  |
  v
ACTIVE TRIP
  |
  v
COMPLETE TRIP
  |
  v
PAYMENT
  |
  v
AVAILABLE
```

---

# 51. MASTER SYSTEM FLOW

```text
                    PASSENGER
                       |
                       v
                CREATE BOOKING
                       |
                       v
                 FARE ENGINE
                       |
                       v
                   SEARCHING
                       |
                       v
               DISPATCH ENGINE
                       |
              +--------+--------+
              |                 |
              v                 v
       DRIVER DISCOVERY    RADIUS EXPANSION
              |
              v
       DRIVER FILTERING
              |
              v
       DRIVER RANKING
              |
              v
        OFFER ENGINE
              |
       +------+------+
       |             |
       v             v
    REJECT         ACCEPT
       |             |
       v             v
 NEXT DRIVER    ATOMIC LOCK
                     |
                     v
                ASSIGN DRIVER
                     |
                     v
                DRIVER BUSY
                     |
                     v
              DRIVER ARRIVING
                     |
                     v
              DRIVER ARRIVED
                     |
                     v
                TRIP START
                     |
                     v
               LIVE GPS
                     |
                     v
              TRIP COMPLETE
                     |
                     v
              FINAL FARE
                     |
                     v
                  PAYMENT
                     |
                     v
                  RATING
                     |
                     v
             DRIVER AVAILABLE
```

---

# 52. CRITICAL RULES

The implementation must NEVER allow:

```text
One booking → multiple drivers
One driver → multiple active rides
Expired offer → accepted
Cancelled booking → accepted
Completed booking → restarted
Offline driver → new booking
Busy driver → new booking
Stale GPS driver → new booking
Client-controlled final fare
Client-controlled driver assignment
```

The implementation MUST use:

```text
PostgreSQL transactions
Row-level locking
RLS
RPC functions
Realtime subscriptions
Geospatial queries
Server-side validation
State-machine validation
```

---

# 53. FINAL SUCCESS SCENARIO

The complete system must successfully execute:

```text
Passenger logs in
        ↓
Selects pickup
        ↓
Selects destination
        ↓
System calculates distance
        ↓
System calculates ETA
        ↓
System calculates fare
        ↓
Passenger confirms
        ↓
Booking = SEARCHING
        ↓
Find nearby drivers
        ↓
Filter drivers
        ↓
Rank drivers
        ↓
Create offer
        ↓
Notify driver
        ↓
Driver accepts
        ↓
Atomic assignment
        ↓
Other offers cancelled
        ↓
Driver = BUSY
        ↓
Passenger notified
        ↓
Live driver GPS
        ↓
Driver arrives
        ↓
Driver starts trip
        ↓
Live trip tracking
        ↓
Driver completes trip
        ↓
Final fare calculated
        ↓
Payment processed
        ↓
Driver = AVAILABLE
        ↓
Passenger rates driver
        ↓
Driver rates passenger
        ↓
Booking stored in history
```

# 54. PRIMARY IMPLEMENTATION PRINCIPLE

The most important architecture is:

```text
              DATABASE
                 |
          SOURCE OF TRUTH
                 |
       +---------+---------+
       |                   |
       v                   v
 PASSENGER APP         DRIVER APP
       |                   |
       +---------+---------+
                 |
                 v
        REALTIME EVENTS
```

React Native should **display and request changes**.

Supabase/PostgreSQL should **validate and control critical changes**.

The dispatch engine should **find and rank drivers**.

The atomic assignment function should **decide who actually gets the ride**.

The booking state machine should **control the lifecycle**.

The driver state machine should **control availability**.

This structure should be implemented first before building UI details, because the correctness of the dispatch and assignment algorithms is the foundation of the entire ride-hailing system.
