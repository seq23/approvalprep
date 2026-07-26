#!/usr/bin/env bash
set -euo pipefail

REMOTE="${GIT_REMOTE:-origin}"
BRANCH="${TARGET_BRANCH:-main}"
MAX_ATTEMPTS="${PUSH_RETRIES:-3}"
SLEEP_SECONDS="${PUSH_RETRY_DELAY_SECONDS:-2}"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "[safe-push] not inside a Git repository" >&2
  exit 2
fi

for attempt in $(seq 1 "$MAX_ATTEMPTS"); do
  git fetch --prune "$REMOTE" "$BRANCH"

  ahead="$(git rev-list --count "$REMOTE/$BRANCH..HEAD")"
  if [ "$ahead" -eq 0 ]; then
    echo "[safe-push] no local commits to publish"
    exit 0
  fi

  if ! git merge-base --is-ancestor "$REMOTE/$BRANCH" HEAD; then
    echo "[safe-push] remote advanced; rebasing local commits (attempt $attempt/$MAX_ATTEMPTS)"
    if ! git rebase "$REMOTE/$BRANCH"; then
      git rebase --abort >/dev/null 2>&1 || true
      echo "[safe-push] rebase conflict; remote history was not overwritten" >&2
      exit 42
    fi
  fi

  if git push "$REMOTE" "HEAD:$BRANCH"; then
    echo "[safe-push] published $(git rev-parse --short HEAD) to $REMOTE/$BRANCH"
    exit 0
  fi

  if [ "$attempt" -lt "$MAX_ATTEMPTS" ]; then
    echo "[safe-push] push raced with another writer; retrying"
    sleep "$SLEEP_SECONDS"
  fi
done

echo "[safe-push] failed after $MAX_ATTEMPTS attempts; no force push was used" >&2
exit 1
