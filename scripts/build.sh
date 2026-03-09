#!/bin/bash
set -e

ROOT_PATH=${1:-/}

npx esbuild src/app.js src/app.css \
    --loader:.png=file \
    --public-path="${ROOT_PATH}dist/" \
    --bundle \
    --outdir=www/dist \
    --minify

COMMIT_HASH=$(git rev-parse HEAD)
SHORT_COMMIT_HASH=$(git rev-parse --short HEAD)

sed -i \
    -e "s/REPLACE_WITH_SHORT_COMMIT_HASH/${SHORT_COMMIT_HASH}/g" \
    -e "s/REPLACE_WITH_COMMIT_HASH/${COMMIT_HASH}/g" \
    www/dist/app.js
