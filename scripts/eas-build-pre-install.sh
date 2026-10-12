#!/bin/bash
# EAS Build pre-install hook — runs BEFORE npm install and prebuild.
#
# Patches AGP 8.11.0 → 8.10.1 in react-native's version catalog.
# AGP 8.11.0 (shipped with RN 0.81.5) introduced AgpVersionAttr which
# causes "No variants exist" for all community React Native packages.

TOML="node_modules/react-native/gradle/libs.versions.toml"

if [ -f "$TOML" ]; then
  echo "[eas-hook] Patching AGP version: 8.11.0 → 8.10.1 in $TOML"
  sed -i 's/^agp = "8\.11\.0"/agp = "8.10.1"/' "$TOML"
  echo "[eas-hook] AGP version is now: $(grep '^agp' $TOML)"
else
  echo "[eas-hook] WARNING: $TOML not found, skipping AGP patch"
fi
