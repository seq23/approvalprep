#!/usr/bin/env bash
set -euo pipefail

REMOTE="${GIT_REMOTE:-origin}"
BRANCH="${TARGET_BRANCH:-main}"

git fetch --prune "$REMOTE" "$BRANCH"
git checkout -B "$BRANCH" "$REMOTE/$BRANCH"

echo "[main-writer] synchronized $BRANCH to $REMOTE/$BRANCH at $(git rev-parse --short HEAD)"
