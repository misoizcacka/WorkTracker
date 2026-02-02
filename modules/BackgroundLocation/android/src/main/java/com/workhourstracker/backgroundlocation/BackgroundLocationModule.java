package com.workhourstracker.backgroundlocation;

import android.util.Log;

import com.facebook.react.bridge.ReactApplicationContext;
import com.facebook.react.bridge.ReactContextBaseJavaModule;
import com.facebook.react.bridge.ReactMethod;

public class BackgroundLocationModule extends ReactContextBaseJavaModule {
    private static final String MODULE_NAME = "BackgroundLocation";

    public BackgroundLocationModule(ReactApplicationContext reactContext) {
        super(reactContext);
    }

    @Override
    public String getName() {
        return MODULE_NAME;
    }

    @ReactMethod
    public void start() {
        Log.d(MODULE_NAME, "Native 'start' method called.");
        // We will add Foreground Service logic here later
    }

    @ReactMethod
    public void stop() {
        Log.d(MODULE_NAME, "Native 'stop' method called.");
        // We will add service stopping logic here later
    }

    // Required for rn built in EventEmitter Calls.
    @ReactMethod
    public void addListener(String eventName) {

    }

    @ReactMethod
    public void removeListeners(Integer count) {

    }
}
