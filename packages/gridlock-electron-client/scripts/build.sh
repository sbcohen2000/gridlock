#!/bin/bash
set -e

# Main process (Node/Electron)
npx esbuild src/main.ts \
    --bundle \
    --platform=node \
    --format=cjs \
    --external:electron \
    --outdir=dist

# Preload script (Node/Electron)
npx esbuild src/preload.ts \
    --bundle \
    --platform=node \
    --format=cjs \
    --external:electron \
    --outdir=dist

# Renderer (browser)
npx esbuild src/renderer.ts \
    --loader:.png=file \
    --public-path="./dist/" \
    --bundle \
    --platform=browser \
    --format=iife \
    --outdir=dist
