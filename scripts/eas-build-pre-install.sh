#!/bin/bash
# Remove stale generated android files with old package name (app.koord)
# expo prebuild regenerates the entire android/ directory from app.json.
# EAS caching can leave old files that cause native crashes.

# Delete the entire generated android directory so prebuild starts fresh
if [ -d "android" ]; then
  echo "[eas-hook] Removing stale android/ directory for clean prebuild"
  rm -rf android/
  echo "[eas-hook] Done. expo prebuild will regenerate it."
else
  echo "[eas-hook] No android/ directory found, nothing to clean"
fi
