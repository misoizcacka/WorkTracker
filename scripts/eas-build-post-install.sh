#!/bin/bash
# EAS Build post-install hook — runs AFTER npm install and prebuild.
#
# Ensures newArchEnabled=true in the generated gradle.properties.
# react-native-reanimated 4.x requires New Architecture, but a stale
# EAS-cached gradle.properties may have newArchEnabled=false from
# a previous build where we temporarily disabled it.

GRADLE_PROPS="android/gradle.properties"

if [ -f "$GRADLE_PROPS" ]; then
  echo "[eas-hook] Ensuring newArchEnabled=true in $GRADLE_PROPS"
  sed -i 's/^newArchEnabled=false/newArchEnabled=true/' "$GRADLE_PROPS"
  echo "[eas-hook] newArchEnabled is now: $(grep '^newArchEnabled' $GRADLE_PROPS)"
else
  echo "[eas-hook] WARNING: $GRADLE_PROPS not found"
fi
