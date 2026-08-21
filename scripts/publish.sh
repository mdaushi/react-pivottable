#!/usr/bin/env bash
#
# publish.sh — Bump version, commit, push tag.
#              GitHub Actions handles npm publish, release, and pages deploy.
#
# Usage:
#   ./scripts/publish.sh              # interactive version bump
#   ./scripts/publish.sh patch        # 0.12.1 -> 0.12.2
#   ./scripts/publish.sh minor        # 0.12.1 -> 0.13.0
#   ./scripts/publish.sh major        # 0.12.1 -> 1.0.0
#   ./scripts/publish.sh 1.2.3        # specific version
#
# Pre-release (dist-tag, tidak jadi latest):
#   ./scripts/publish.sh dev          # 0.12.1 -> 0.12.2-dev.0  (tag: dev)
#   ./scripts/publish.sh beta         # 0.12.1 -> 0.12.2-beta.0 (tag: beta)
#   ./scripts/publish.sh rc           # 0.12.1 -> 0.12.2-rc.0   (tag: rc)
#
# Prerequisites:
#   - npm login          (npm whoami must succeed)
#   - clean git tree     (no uncommitted changes)
#   - NPM_TOKEN secret   set in GitHub repo (for Actions)
#
set -euo pipefail

RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[0;33m'; CYN='\033[0;36m'; NC='\033[0m'
info() { echo -e "${CYN}[INFO]${NC}  $*"; }
ok()   { echo -e "${GRN}[OK]${NC}    $*"; }
warn() { echo -e "${YLW}[WARN]${NC}  $*"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

BUMP="${1:-}"

# Pre-release types: dev, beta, rc
PRERELEASE_TYPES="dev beta rc"
IS_PRERELEASE=0

cd "$(dirname "$0")/.."

# ── Prerequisites ───────────────────────────────────────────────────────────
info "Checking prerequisites..."
npm whoami &>/dev/null || fail "Not logged in to npm. Run: npm login"
ok "npm: $(npm whoami)"
[[ -z "$(git status --porcelain)" ]] || fail "Git tree not clean. Commit first."
ok "Git clean"

# ── Version bump ────────────────────────────────────────────────────────────
CURR=$(node -p "require('./package.json').version")
info "Current: ${CURR}"

# Check if BUMP is a pre-release type
if echo "$PRERELEASE_TYPES" | grep -qw "$BUMP"; then
  IS_PRERELEASE=1
  NEW=$(npm version prerelease --preid="$BUMP" --no-git-tag-version | sed 's/v//')
  ok "New version: ${NEW} (pre-release, dist-tag: ${BUMP})"
elif [[ -z "$BUMP" ]]; then
  echo "  1) patch  2) minor  3) major  4) dev  5) beta  6) rc  7) custom"
  read -rp "Select [1-7]: " c
  case "$c" in
    1) BUMP=patch;;
    2) BUMP=minor;;
    3) BUMP=major;;
    4) BUMP=dev;  IS_PRERELEASE=1;;
    5) BUMP=beta; IS_PRERELEASE=1;;
    6) BUMP=rc;   IS_PRERELEASE=1;;
    7) read -rp "Version: " BUMP;;
    *) fail "Invalid";;
  esac
  if [[ "$IS_PRERELEASE" -eq 1 ]]; then
    NEW=$(npm version prerelease --preid="$BUMP" --no-git-tag-version | sed 's/v//')
    ok "New version: ${NEW} (pre-release, dist-tag: ${BUMP})"
  else
    NEW=$(npm version "$BUMP" --no-git-tag-version | sed 's/v//')
    ok "New version: ${NEW}"
  fi
else
  NEW=$(npm version "$BUMP" --no-git-tag-version | sed 's/v//')
  ok "New version: ${NEW}"
fi

# ── Test ────────────────────────────────────────────────────────────────────
info "Running tests..."
npm test
ok "Tests passed"

# ── Git commit + tag + push ─────────────────────────────────────────────────
info "Committing + tagging v${NEW}..."
git add package.json
git commit -m "v${NEW}"
git tag "v${NEW}"
git push origin master
git push origin "v${NEW}"
ok "Pushed v${NEW}"

echo ""
ok "Done! Tag v${NEW} pushed."
echo ""
if [[ "$IS_PRERELEASE" -eq 1 ]]; then
  info "GitHub Actions will now:"
  echo "  1. Publish @mdaushi/react-pivottable@${BUMP} (v${NEW})"
  echo "  2. Create GitHub Release v${NEW} (marked as pre-release)"
  echo "  3. Deploy demo to GitHub Pages"
  echo ""
  info "Users can install:"
  echo "  npm install @mdaushi/react-pivottable@${BUMP}"
else
  info "GitHub Actions will now:"
  echo "  1. Publish @mdaushi/react-pivottable@${NEW} to npm (latest)"
  echo "  2. Create GitHub Release v${NEW}"
  echo "  3. Deploy demo to GitHub Pages"
  echo ""
  info "Users can install:"
  echo "  npm install @mdaushi/react-pivottable"
fi
echo ""
info "Watch progress: https://github.com/mdaushi/react-pivottable/actions"
