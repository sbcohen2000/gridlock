#!/bin/bash
set -e

ROOT_PATH=${1:-/}

npx esbuild src/app.js src/app.css \
    --loader:.png=file \
    --public-path="${ROOT_PATH}dist/" \
    --bundle \
    --outdir=www/dist \
    --minify
