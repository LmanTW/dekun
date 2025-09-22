#!/bin/bash

cleanup() {
  if [ ! -z "$BACKEND" ]; then
    kill $BACKEND 2> /dev/null
  fi

  if [ ! -z "$FRONTEND" ]; then
    kill $FRONTEND 2> /dev/null
  fi 

  exit 0
}

trap cleanup SIGINT SIGTERM

uv run dekun editor 3000 "$@" &
BACKEND=$!

cd $(dirname "${BASH_SOURCE[0]}")

bun run vite --config ./vite.config.ts &
FRONTEND=$!

wait -n $BACKEND $FRONTEND

cleanup
