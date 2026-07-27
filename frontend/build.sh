#!/usr/bin/env sh
set -eu

FRONTEND_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
cd "$FRONTEND_DIR"

rm -rf dist
mkdir -p dist/src dist/brand dist/screens
cp index.html dist/index.html
cp -R src/. dist/src/
cp public/brand/* dist/brand/
cp public/screens/* dist/screens/
cp node_modules/@carbon/styles/css/styles.css dist/carbon.css
echo "Frontend built at frontend/dist"
