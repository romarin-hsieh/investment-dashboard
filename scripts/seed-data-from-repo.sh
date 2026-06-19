#!/usr/bin/env bash
#
# Seed public/data from the separate data repo (ADR-0008).
#
# public/data is no longer committed in this repo — the data lives in
# romarin-hsieh/investment-dashboard-data. This script populates a local
# public/data/ for development AND is run at the START of each nightly data
# workflow so generation builds on the full current dataset and the subsequent
# mirror push does not drop subtrees this workflow does not regenerate.
#
# The data repo is PUBLIC, so this is a read-only anonymous clone — no token
# needed (only the mirror push, scripts/mirror-data-to-repo.sh, needs DATA_REPO_TOKEN).
set -euo pipefail

DATA_REPO="${DATA_REPO:-romarin-hsieh/investment-dashboard-data}"
WORK="${RUNNER_TEMP:-/tmp}/data-repo-seed"

rm -rf "$WORK"
echo "⬇️  Cloning ${DATA_REPO} (shallow) to seed public/data ..."
git clone --depth 1 "https://github.com/${DATA_REPO}.git" "$WORK"

rm -rf public/data
mkdir -p public/data
if [ -d "$WORK/data" ]; then
  cp -r "$WORK/data/." public/data/
fi
rm -rf "$WORK"

echo "✅ Seeded public/data from ${DATA_REPO} ($(find public/data -type f | wc -l) files)"
