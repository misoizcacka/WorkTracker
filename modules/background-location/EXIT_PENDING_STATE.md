# EXIT_PENDING State - Fast Exit Detection with GPS Verification

## Problem Statement

The original 2-state system (PASSIVE/ACTIVE) had a critical flaw when workers left a building with poor GPS reception:

1. Worker leaves building → GPS unavailable indoors
2. System stuck in PASSIVE mode with BALANCED power (WiFi/network positioning only)
3. WiFi reports "maybe outside" but with low trust (40%)
4. Exit blocked because GPS required (60%+ trust)
5. **Result: 20+ minute delays in detecting exits**

The catch-22: "I need GPS to detect you left, but I won't request GPS until I know you left."

## Solution: 3-State System with EXIT_PENDING

### State Diagram

```
PASSIVE (confirmed inside)
  └─ Balanced Power Priority
  └─ 5-min updates (2-min if WiFi-only)
  └─ WiFi/Network positioning OK
       │
       ↓ (WiFi shows distance > 150m OR quality degrades)
       │
EXIT_PENDING (verifying exit)
  └─ HIGH ACCURACY Priority (forces GPS)  🔑
  └─ 30-second fast updates 🔑
  └─ Waits for GPS confirmation
       │
       ├─ (GPS confirms outside) ───→ ACTIVE (traveling)
       │                              └─ High Accuracy
       │                              └─ 1-min updates
       │
       └─ (GPS confirms still inside) → PASSIVE (false alarm)
                                        └─ Back to balanced power
```

### Key Innovation

**EXIT_PENDING forces HIGH_ACCURACY GPS** even though the worker hasn't been confirmed outside yet. This breaks the catch-22:

- **Before:** Balanced power → no GPS → can't confirm exit → stuck in Balanced power
- **After:** Possible exit → HIGH ACCURACY → GPS acquired → exit confirmed in 30-60 seconds

## State Transitions

### 1. PASSIVE → EXIT_PENDING

**Trigger:** WiFi/network positioning suggests worker might be outside

**Conditions:**
- Distance > 150m from geofence center (any quality signal)
- OR location quality degrades (suggests leaving building)
- AND not currently in EXIT_PENDING state

**Action:**
```kotlin
sharedPrefs.edit()
    .putBoolean(Constants.SHARED_PREFS_KEY_IS_EXIT_PENDING, true)
    .apply()
switchToMode(TrackingMode.EXIT_PENDING)
```

**Location Request:**
- Priority: `PRIORITY_HIGH_ACCURACY` (forces GPS satellites)
- Interval: 30 seconds
- Min update interval: 15 seconds
- Min distance: 0m (capture every update)

**Log:**
```
🔍 POSSIBLE EXIT detected - switching to EXIT_PENDING mode to verify with GPS
```

### 2. EXIT_PENDING → ACTIVE (Confirmed Exit)

**Trigger:** GPS confirms worker is outside geofence

**Conditions:**
- GPS quality (GPS_HIGH_QUALITY or GPS_MEDIUM_QUALITY)
- Distance > 150m from geofence center

**Action:**
```kotlin
sharedPrefs.edit()
    .putBoolean("manual_inside_${geofenceId}", false)
    .putBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, false)
    .putBoolean(Constants.SHARED_PREFS_KEY_IS_EXIT_PENDING, false)
    .apply()
sendGeofenceTransitionEvent(geofenceId, "exit_geofence", ...)
switchToMode(TrackingMode.ACTIVE)
```

**Location Request:**
- Priority: `PRIORITY_HIGH_ACCURACY` (keep GPS active)
- Interval: 1 minute
- Min distance: 20m (only update when moving)

**Log:**
```
✅ CONFIRMED EXIT with GPS (source: gps_medium)
🔵 EXIT geofence 006414eb (dist: 659m, source: gps_medium, trust: 75%)
```

### 3. EXIT_PENDING → PASSIVE (False Alarm)

**Trigger:** GPS confirms worker is still inside geofence

**Conditions:**
- GPS quality (GPS_HIGH_QUALITY or GPS_MEDIUM_QUALITY)
- Distance ≤ 150m from geofence center

**Action:**
```kotlin
sharedPrefs.edit()
    .putBoolean(Constants.SHARED_PREFS_KEY_IS_EXIT_PENDING, false)
    .apply()
switchToMode(TrackingMode.PASSIVE)
```

**Location Request:**
- Priority: `PRIORITY_BALANCED_POWER_ACCURACY` (back to WiFi/network)
- Interval: 5 minutes (2 minutes if indoors)

**Log:**
```
❌ FALSE ALARM: GPS confirms still inside - switching back to PASSIVE
```

### 4. ACTIVE → PASSIVE (Enter Geofence)

**Trigger:** Worker enters a geofence

**Conditions:**
- GPS or high-quality WiFi (trust ≥60%, accuracy <60m)
- Distance ≤ 150m from geofence center

**Action:**
```kotlin
sharedPrefs.edit()
    .putBoolean("manual_inside_${geofenceId}", true)
    .putBoolean(Constants.SHARED_PREFS_KEY_IS_INSIDE_GEOFENCE, true)
    .putBoolean(Constants.SHARED_PREFS_KEY_IS_EXIT_PENDING, false)
    .apply()
sendGeofenceTransitionEvent(geofenceId, "enter_geofence", ...)
switchToMode(TrackingMode.PASSIVE)
```

**Log:**
```
✅ CONFIRMED ENTER (source: gps_medium)
🟡 ENTER geofence a0f48e7f (dist: 163m, source: gps_medium, trust: 75%)
```

## Implementation Details

### Constants

```kotlin
const val PASSIVE_TRACKING_INTERVAL_MS = 5 * 60 * 1000L   // 5 min
const val EXIT_PENDING_INTERVAL_MS = 30 * 1000L           // 30 sec 🔑
const val ACTIVE_TRACKING_INTERVAL_MS = 1 * 60 * 1000L    // 1 min

const val SHARED_PREFS_KEY_IS_EXIT_PENDING = "is_exit_pending"
```

### TrackingMode Enum

```kotlin
enum class TrackingMode {
    PASSIVE,        // Inside - balanced power, slow updates
    EXIT_PENDING,   // Verifying exit - HIGH ACCURACY, fast updates 🔑
    ACTIVE          // Outside - high accuracy, regular updates
}
```

### Mode Switching Logic

```kotlin
private fun switchToMode(newMode: TrackingMode) {
    if (currentMode == newMode) return
    
    fusedLocationClient.removeLocationUpdates(locationCallback)
    
    val (interval, priority, minUpdateInterval, maxUpdateDelay, minDistance) = when (newMode) {
        TrackingMode.PASSIVE -> Tuple5(
            5 * 60 * 1000L,
            Priority.PRIORITY_BALANCED_POWER_ACCURACY,
            5 * 60 * 1000L,
            6 * 60 * 1000L,
            0f
        )
        TrackingMode.EXIT_PENDING -> Tuple5(
            30 * 1000L,                              // 30 sec 🔑
            Priority.PRIORITY_HIGH_ACCURACY,         // Force GPS 🔑
            15 * 1000L,                              // Allow faster
            30 * 1000L,                              // No batching
            0f                                       // Capture everything
        )
        TrackingMode.ACTIVE -> Tuple5(
            1 * 60 * 1000L,
            Priority.PRIORITY_HIGH_ACCURACY,
            30 * 1000L,
            1 * 60 * 1000L,
            20f
        )
    }
    
    val request = LocationRequest.Builder(priority, interval)
        .setMinUpdateIntervalMillis(minUpdateInterval)
        .setMaxUpdateDelayMillis(maxUpdateDelay)
        .setWaitForAccurateLocation(false)
        .apply { if (minDistance > 0f) setMinUpdateDistanceMeters(minDistance) }
        .build()
    
    fusedLocationClient.requestLocationUpdates(request, locationCallback, Looper.getMainLooper())
}
```

## Expected Behavior with EXIT_PENDING

### Scenario: Worker Leaves Building with Poor GPS

**Before (2-state system):**
```
12:55 - Worker leaves building (GPS unavailable indoors)
12:56 - WiFi: "dist: 200m, trust: 40%" → EXIT BLOCKED
13:02 - WiFi: "dist: 659m, trust: 40%" → EXIT BLOCKED (7 min gap)
13:14 - WiFi: "dist: 1479m, trust: 40%" → EXIT BLOCKED (19 min gap)
13:17 - WiFi: "dist: 1760m, trust: 60%" → EXIT CONFIRMED (22 min gap!)
```

**After (3-state with EXIT_PENDING):**
```
12:55 - Worker leaves building (GPS unavailable indoors)
12:56 - WiFi: "dist: 200m, trust: 40%" 
      → 🔍 EXIT_PENDING activated (HIGH ACCURACY GPS forced)
12:56:30 - GPS acquiring satellites...
12:57:00 - GPS: "dist: 250m, trust: 75%" 
         → ✅ CONFIRMED EXIT (2 min gap!)
```

**Improvement: 22 minutes → 2 minutes (10x faster!)**

## Battery Impact

### Exit Detection Phase (typically 1-3 minutes)

- **PASSIVE:** 5W continuous (balanced power)
- **EXIT_PENDING:** 15W continuous (high-accuracy GPS) for 1-3 minutes
- **Energy cost:** ~15W × 2 min = 0.5 Wh (negligible)

### Why This Is Acceptable

1. **Short duration:** EXIT_PENDING only lasts 30-120 seconds until GPS confirms
2. **Rare occurrence:** Only triggers when leaving a site (2-4 times per day max)
3. **Replaces longer ACTIVE period:** Without EXIT_PENDING, worker would eventually switch to ACTIVE mode anyway (1-min high-accuracy GPS for 15-45 min commute)
4. **Net benefit:** Faster exit detection prevents being stuck in high-frequency mode

## Diagnostics

### Log Signatures

| Mode | Log Prefix | Example |
|------|-----------|---------|
| PASSIVE | 🟢/🟡/🔵 | `🟢 Periodic update (passive_tracking)` |
| EXIT_PENDING | 🔍 | `🔍 POSSIBLE EXIT detected` |
|  | ⏳ | `⏳ EXIT_PENDING: Waiting for GPS` |
| ACTIVE | 🔵/⚪ | `🔵 Periodic update (active_tracking)` |
| Confirmed Exit | ✅ | `✅ CONFIRMED EXIT with GPS` |
| False Alarm | ❌ | `❌ FALSE ALARM: GPS confirms still inside` |

### Event Types in Database

```sql
SELECT type, COUNT(*) FROM location_events GROUP BY type;

-- passive_tracking: Worker on-site (PASSIVE mode)
-- exit_pending_tracking: Verifying exit with GPS (EXIT_PENDING mode) 🆕
-- active_tracking: Worker traveling (ACTIVE mode)
```

## Testing

### Test Case 1: Normal Exit (Outdoor with Good GPS)

```
1. Worker inside building with GPS (PASSIVE mode)
2. Worker walks outside → GPS immediately shows outside
3. Expected: PASSIVE → ACTIVE (direct, no EXIT_PENDING)
```

### Test Case 2: Indoor Exit (No GPS Available)

```
1. Worker inside building without GPS (PASSIVE mode, WiFi-only)
2. Worker leaves → WiFi shows "maybe outside" (40% trust)
3. Expected: PASSIVE → EXIT_PENDING (30-sec GPS polling)
4. 30-60 seconds later: GPS acquires → EXIT_PENDING → ACTIVE
```

### Test Case 3: False Alarm (WiFi Glitch)

```
1. Worker inside building (PASSIVE mode)
2. WiFi briefly reports wrong location (dist: 500m)
3. Expected: PASSIVE → EXIT_PENDING
4. 30 seconds later: GPS confirms still inside → EXIT_PENDING → PASSIVE
```

## Rollout Plan

1. ✅ Add EXIT_PENDING_INTERVAL_MS constant (30 seconds)
2. ✅ Add IS_EXIT_PENDING SharedPreferences flag
3. ✅ Create TrackingMode enum
4. ✅ Replace startLocationUpdates(boolean) with switchToMode(TrackingMode)
5. ✅ Update geofence detection logic to use 3-state transitions
6. 🔄 Test on development device (monitor logs for 1 week)
7. 🔄 Deploy to beta testers (5-10 workers)
8. 🔄 Monitor exit detection latency metrics
9. 🔄 Production rollout if latency < 5 minutes for 95% of exits

## Success Metrics

- **Before:** 95th percentile exit latency = 22 minutes
- **After:** 95th percentile exit latency < 5 minutes (4x improvement target)
- **Battery:** <5% increase in daily battery usage
- **False alarms:** <1% of exits (GPS should confirm correctly >99% of time)
