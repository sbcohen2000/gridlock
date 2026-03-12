#!/bin/bash

ROOT_PATH=${1:-/}

npm run build --workspace gridlock-lib
$(cd packages/gridlock-web-client && scripts/build.sh $ROOT_PATH)
