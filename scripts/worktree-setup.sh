#!/usr/bin/env bash
# Prepare an agent's git worktree and start its dev server.
#
#   scripts/worktree-setup.sh 5175
#
# node_modules becomes a real directory of per-package links to the main
# checkout's packages. A single symlink to the whole directory shares Vite's
# dependency cache (node_modules/.vite) with every other dev server, and two
# servers rewriting one cache serve blank pages and 504 "Outdated Optimize Dep".
set -euo pipefail
PORT="${1:?usage: scripts/worktree-setup.sh <port>}"
MAIN="$(git worktree list --porcelain | awk '/^worktree /{print $2; exit}')"

if [ "$(pwd -P)" != "$(cd "$MAIN" && pwd -P)" ]; then
  [ -L node_modules ] && rm node_modules
  if [ ! -d node_modules ]; then
    mkdir node_modules
    for p in "$MAIN"/node_modules/* "$MAIN"/node_modules/.bin; do ln -s "$p" node_modules/; done
  fi
fi

if curl -s -o /dev/null -m 2 "http://localhost:$PORT/"; then
  echo "dev server already running on :$PORT"
else
  nohup npx vite --port "$PORT" --strictPort > node_modules/.dev-server-$PORT.log 2>&1 &
  for _ in $(seq 1 60); do
    curl -s -o /dev/null -m 1 "http://localhost:$PORT/" && break
    sleep 0.5
  done
  echo "dev server on :$PORT (log: node_modules/.dev-server-$PORT.log)"
fi
