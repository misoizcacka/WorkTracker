#!/bin/bash
# Local Android build script
# Removes generated android/ directory so EAS treats this as managed workflow
# and runs expo prebuild automatically.

PROFILE=${1:-development}

echo "Cleaning android/ directory..."
rm -rf android/

echo "Starting local EAS build (profile: $PROFILE)..."
eas build --platform android --profile "$PROFILE" --local
