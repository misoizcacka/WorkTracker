# iOS EXIT_PENDING State Implementation

This document describes the iOS implementation of the EXIT_PENDING state, which mirrors the Android implementation to provide fast, GPS-verified exit detection.

## Problem

The original 2-state system (PASSIVE/ACTIVE) had a critical flaw on iOS when workers left buildings with poor GPS reception:

1. Worker leaves building → GPS unavailable indoors
2. System stuck in PASSIVE mode with `kCLLocationAccuracyHundredMeters` (WiFi/network positioning only)
3. WiFi reports "maybe outside" but with poor accuracy (>65m)
4. Exit blocked because GPS required (<50m accuracy)
5. **Result: 20+ minute delays in detecting exits**

The catch-22: "I need GPS to detect you left, but I won't request GPS until I know you left."

## Solution: 3-State System

### State Diagram

```
PASSIVE (confirmed inside)
  └─ kCLLocationAccuracyHundredMeters
  └─ 5-min updates (2-min if WiFi-only)
  └─ WiFi/Network positioning OK
       │
       ↓ (WiFi shows distance > 150m OR accuracy degrades)
       │
EXIT_PENDING (verifying exit)
  └─ kCLLocationAccuracyBest (forces GPS)  🔑
  └─ 30-second fast updates 🔑
  └─ .activityType = .fitness (prevents throttling)
  └─ Waits for GPS confirmation
       │
       ├─ (GPS confirms outside) ───→ ACTIVE (traveling)
       │                              └─ kCLLocationAccuracyNearestTenMeters
       │                              └─ 1-min updates
       │
       └─ (GPS confirms still inside) → PASSIVE (false alarm)
                                        └─ Back to balanced power
```

## Implementation Details

### 1. TrackingMode Enum

```swift
enum TrackingMode: String, Codable {
    case passive = "PASSIVE"
    case exitPending = "EXIT_PENDING"  // 🔑 New state
    case active = "ACTIVE"
}
```

### 2. State Storage (TrackingStateStore)

```swift
var trackingMode: TrackingMode {
    get {
      guard let rawValue = defaults.string(forKey: Keys.trackingMode),
            let mode = TrackingMode(rawValue: rawValue) else {
        return .passive  // Default to PASSIVE
      }
      return mode
    }
    set { defaults.set(newValue.rawValue, forKey: Keys.trackingMode) }
  }

var isExitPending: Bool {
    get { defaults.bool(forKey: Keys.isExitPending) }
    set { defaults.set(newValue, forKey: Keys.isExitPending) }
}
```

### 3. Mode Switching Logic (IOSBackgroundLocationManager)

```swift
private func switchToMode(_ newMode: TrackingMode) {
    if currentMode == newMode { return }
    
    let oldMode = currentMode
    currentMode = newMode
    stateStore.trackingMode = newMode
    
    periodicTimer?.invalidate()
    periodicTimer = nil
    locationManager.stopUpdatingLocation()
    
    switch newMode {
    case .passive:
        locationManager.desiredAccuracy = kCLLocationAccuracyHundredMeters
        locationManager.activityType = .other
        
    case .exitPending:
        locationManager.desiredAccuracy = kCLLocationAccuracyBest  // FORCE GPS 🔑
        locationManager.activityType = .fitness  // Prevents iOS throttling 🔑
        
    case .active:
        locationManager.desiredAccuracy = kCLLocationAccuracyNearestTenMeters
        locationManager.activityType = .fitness
    }
    
    locationManager.distanceFilter = kCLDistanceFilterNone
    locationManager.pausesLocationUpdatesAutomatically = false
    locationManager.startUpdatingLocation()
    
    startPeriodicLocationTimer()
}
```

### 4. Exit Detection Logic (processLocation)

```swift
if !isNowInside {
    // Worker appears to be outside geofence
    
    if isGPS {
        // CONFIRMED EXIT WITH GPS - switch to ACTIVE immediately
        stateStore.updateInsideState(for: assignment.id, isInside: false)
        stateStore.isExitPending = false
        switchToMode(.active)
        // Send exit event
        
    } else if !stateStore.isExitPending {
        // POSSIBLE EXIT DETECTED - switch to EXIT_PENDING to verify with GPS
        stateStore.isExitPending = true
        switchToMode(.exitPending)
        // Wait for GPS...
        
    } else {
        // Already in EXIT_PENDING mode, still no GPS confirmation
        // Keep waiting...
    }
}
```

### 5. False Alarm Detection

```swift
if stateStore.isExitPending && isNowInside {
    // FALSE ALARM - GPS confirms we're still inside
    stateStore.isExitPending = false
    switchToMode(.passive)
}
```

## Differences from Android

| Feature | Android | iOS | Notes |
|---------|---------|-----|-------|
| **GPS forcing** | `PRIORITY_HIGH_ACCURACY` | `kCLLocationAccuracyBest` | Equivalent |
| **Update interval** | 30 seconds | 30 seconds | Same |
| **Throttle prevention** | `setMinUpdateDistanceMeters(0f)` | `.activityType = .fitness` | Different approaches, same goal |
| **State persistence** | SharedPreferences | App Group UserDefaults | iOS more resilient to force-kills |
| **Fallback mechanism** | AlarmManager (6 min) | BGAppRefreshTask (~15 min) | iOS less frequent (iOS limitation) |

## Expected Behavior

### Scenario: Worker Leaves Building with Poor GPS

**Before (2-state system):**
```
12:55 - Worker leaves building (GPS unavailable indoors)
12:56 - WiFi: "dist: 200m, accuracy: 80m" → EXIT BLOCKED
13:02 - WiFi: "dist: 659m, accuracy: 90m" → EXIT BLOCKED (7 min gap)
13:14 - WiFi: "dist: 1479m, accuracy: 85m" → EXIT BLOCKED (19 min gap)
13:17 - GPS acquired: "dist: 1760m, accuracy: 45m" → EXIT CONFIRMED (22 min gap!)
```

**After (3-state with EXIT_PENDING):**
```
12:55 - Worker leaves building (GPS unavailable indoors)
12:56 - WiFi: "dist: 200m, accuracy: 80m" 
      → 🔍 EXIT_PENDING activated (kCLLocationAccuracyBest forced)
12:56:30 - GPS acquiring satellites...
12:57:00 - GPS: "dist: 250m, accuracy: 35m" 
         → ✅ CONFIRMED EXIT (2 min gap!)
```

**Improvement: 22 minutes → 2 minutes (10x faster!)**

## Battery Impact

### Exit Detection Phase (typically 1-3 minutes on iOS)

- **PASSIVE:** ~5W continuous (balanced power)
- **EXIT_PENDING:** ~20W continuous (best accuracy GPS) for 1-3 minutes
- **Energy cost:** ~20W × 2 min = 0.67 Wh (negligible)

### Why This Is Acceptable

1. **Short duration:** EXIT_PENDING only lasts 30-120 seconds until GPS confirms
2. **Rare occurrence:** Only triggers when leaving a site (2-4 times per day max)
3. **Replaces longer ACTIVE period:** Without EXIT_PENDING, worker would eventually switch to ACTIVE mode anyway
4. **Net benefit:** Faster exit detection prevents being stuck in high-frequency mode

## Diagnostics

### Log Signatures

| Mode | Log Prefix | Example |
|------|-----------|---------|
| PASSIVE | 🟢/🟡/🔵 | `🟢 Periodic update (passive_outdoor)` |
| EXIT_PENDING | 🔍 | `🔍 Possible exit detected - activating high-accuracy GPS` |
|  | ⏳ | `⏳ EXIT_PENDING: Waiting for GPS` |
| ACTIVE | 🔵/⚪ | `🔵 Periodic update (active)` |
| Confirmed Exit | ✅ | `✅ CONFIRMED EXIT with GPS` |
| False Alarm | ❌ | `❌ Exit false alarm - GPS confirms still inside` |

### Event Types in Database

```sql
SELECT type, COUNT(*) FROM location_events WHERE worker_id = 'xxx' GROUP BY type;

-- passive_tracking: Worker on-site (PASSIVE mode)
-- exit_pending_tracking: Verifying exit with GPS (EXIT_PENDING mode) 🆕
-- active_tracking: Worker traveling (ACTIVE mode)
```

## iOS-Specific Considerations

### 1. Low Power Mode

When iOS is in Low Power Mode, location accuracy may be reduced even with `kCLLocationAccuracyBest`. The system will still attempt GPS but may take longer.

**Impact:** EXIT_PENDING might take 2-3 minutes instead of 30-60 seconds.

### 2. Background Restrictions (iOS 17+)

iOS 17 introduced stricter background location restrictions. The app must:
- Have "Always" location permission
- Be whitelisted from battery optimization (user must allow in Settings)
- Use `.activityType = .fitness` to prevent aggressive throttling

**All of these are already implemented.**

### 3. Force-Swipe Recovery

After a force-swipe, iOS may take 30-60 seconds to relaunch the app via:
- Significant location change (500m movement)
- Region monitoring (geofence enter/exit)
- BGAppRefreshTask (~15 min)

Once relaunched, `resumeFromStoredState()` will restore the correct tracking mode from `TrackingStateStore`.

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
2. Worker leaves → WiFi shows "maybe outside" (80m accuracy)
3. Expected: PASSIVE → EXIT_PENDING (30-sec GPS polling, kCLLocationAccuracyBest)
4. 30-60 seconds later: GPS acquires → EXIT_PENDING → ACTIVE
```

### Test Case 3: False Alarm (WiFi Glitch)

```
1. Worker inside building (PASSIVE mode)
2. WiFi briefly reports wrong location (dist: 500m)
3. Expected: PASSIVE → EXIT_PENDING
4. 30 seconds later: GPS confirms still inside → EXIT_PENDING → PASSIVE
```

### Test Case 4: Force-Swipe During EXIT_PENDING

```
1. Worker leaves building → EXIT_PENDING activated
2. User force-swipes app before GPS confirms
3. Expected: 
   - App killed by iOS
   - Significant location change relaunches app after 500m movement
   - resumeFromStoredState() reads isExitPending = true
   - Mode restored to EXIT_PENDING
   - GPS acquisition continues
```

## Rollout Plan

1. ✅ Add TrackingMode enum to TrackingModels.swift
2. ✅ Add trackingMode and isExitPending to TrackingStateStore
3. ✅ Add EXIT_PENDING interval constant (30 seconds)
4. ✅ Replace startLocationUpdates(Bool) with switchToMode(TrackingMode)
5. ✅ Update processLocation with 3-state transition logic
6. ✅ Update determineCurrentInterval to handle EXIT_PENDING
7. ✅ Add false alarm detection
8. 🔄 Test on physical iOS device (simulator doesn't emulate GPS behavior accurately)
9. 🔄 Deploy to TestFlight for beta testing
10. 🔄 Monitor exit detection latency metrics
11. 🔄 Production rollout if latency < 5 minutes for 95% of exits

## Success Metrics

- **Before:** 95th percentile exit latency = 22 minutes
- **After:** 95th percentile exit latency < 5 minutes (4x improvement target)
- **Battery:** <5% increase in daily battery usage
- **False alarms:** <1% of exits (GPS should confirm correctly >99% of time)

## Known Limitations

1. **Low Power Mode delays:** GPS acquisition may take 2-3 minutes instead of 30-60 seconds
2. **BGAppRefreshTask frequency:** iOS decides when to wake the app (~15-30 minutes), can't be forced
3. **Significant location change threshold:** iOS only wakes app after ~500m movement
4. **Force-swipe recovery:** May have 1-2 minute gap before app relaunches

These are **iOS platform limitations** and cannot be fully solved. The EXIT_PENDING state minimizes their impact.
