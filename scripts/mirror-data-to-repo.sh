#!/usr/bin/env bash
#
# Mirror this checkout's public/data -> the separate data repo
# (romarin-hsieh/investment-dashboard-data), which is served via GitHub Pages
# and read by the dashboard at runtime (Stream 3 data-repo split).
#
# Transition model (dual-push): the dashboard repo stays the working source of
# truth; this mirrors the COMPLETE public/data wholesale to the data repo so the
# data repo always matches. Because the whole data/ subtree is replaced, file
# deletions (e.g. technical-indicator retention) propagate correctly.
#
# Requires DATA_REPO_TOKEN (fine-grained PAT, Contents: Read and write on the
# data repo) in the environment.
set -euo pipefail

: "${DATA_REPO_TOKEN:?DATA_REPO_TOKEN is required}"
DATA_REPO="${DATA_REPO:-romarin-hsieh/investment-dashboard-data}"
WORK="${RUNNER_TEMP:-/tmp}/data-repo-mirror"

if [ ! -d public/data ]; then
  echo "❌ public/data not found — nothing to mirror"
  exit 1
fi

rm -rf "$WORK"
git clone --depth 1 "https://x-access-token:${DATA_REPO_TOKEN}@github.com/${DATA_REPO}.git" "$WORK"

# Replace the data/ subtree wholesale so deletions propagate; leave the data
# repo's own README and .nojekyll in place (re-asserted below).
rm -rf "$WORK/data"
mkdir -p "$WORK/data"
cp -r public/data/. "$WORK/data/"
touch "$WORK/.nojekyll"

cd "$WORK"
git config user.email "action@github.com"
git config user.name "GitHub Action (data mirror)"
git add -A
if git diff --staged --quiet; then
  echo "ℹ️ No data changes to mirror"
else
  git commit -m "🤖 Data mirror $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  git push origin HEAD:main
  echo "✅ Mirrored public/data → ${DATA_REPO}"
fi
