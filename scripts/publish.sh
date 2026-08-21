#!/usr/bin/env bash
#
# publish.sh — Publish to npm, create GitHub release, deploy to GitHub Pages.
#
# Usage:
#   ./scripts/publish.sh              # interactive version bump
#   ./scripts/publish.sh patch        # 0.12.0 -> 0.12.1
#   ./scripts/publish.sh minor        # 0.12.0 -> 0.13.0
#   ./scripts/publish.sh major        # 0.12.0 -> 1.0.0
#   ./scripts/publish.sh 1.2.3        # specific version
#   ./scripts/publish.sh --skip-pages # skip GitHub Pages deploy
#
# Prerequisites:
#   - npm login          (npm whoami must succeed)
#   - GITHUB_TOKEN env   OR  gh CLI installed & authenticated
#   - clean git tree     (no uncommitted changes)
#
set -euo pipefail

RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[0;33m'; CYN='\033[0;36m'; NC='\033[0m'
info() { echo -e "${CYN}[INFO]${NC}  $*"; }
ok()   { echo -e "${GRN}[OK]${NC}    $*"; }
warn() { echo -e "${YLW}[WARN]${NC}  $*"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

BUMP="${1:-}"
SKIP_PAGES=false
[[ "$BUMP" == "--skip-pages" ]] && { SKIP_PAGES=true; BUMP=""; }

cd "$(dirname "$0")/.."

# ── Prerequisites ───────────────────────────────────────────────────────────
info "Checking prerequisites..."
npm whoami &>/dev/null || fail "Not logged in to npm. Run: npm login"
ok "npm: $(npm whoami)"
[[ -z "$(git status --porcelain)" ]] || fail "Git tree not clean. Commit first."
ok "Git clean"

USE_GH=false
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  USE_GH=true; ok "gh CLI ready"
elif [[ -z "${GITHUB_TOKEN:-}" ]]; then
  fail "Need GITHUB_TOKEN env var or gh CLI. See: https://github.com/settings/tokens"
else
  ok "GITHUB_TOKEN set"
fi

# ── Version bump ────────────────────────────────────────────────────────────
CURR=$(node -p "require('./package.json').version")
info "Current: ${CURR}"
if [[ -z "$BUMP" ]]; then
  echo "  1) patch  2) minor  3) major  4) custom"
  read -rp "Select [1-4]: " c
  case "$c" in 1) BUMP=patch;; 2) BUMP=minor;; 3) BUMP=major;; 4) read -rp "Version: " BUMP;; *) fail "Invalid";; esac
fi
NEW=$(npm version "$BUMP" --no-git-tag-version | sed 's/v//')
ok "New version: ${NEW}"

# ── Test ────────────────────────────────────────────────────────────────────
info "Running tests..."
npm test
ok "Tests passed"

# ── Build & publish ─────────────────────────────────────────────────────────
info "Building..."
npm run build
info "Publishing to npm..."
npm publish --access public
ok "Published @mdaushi/react-pivottable@${NEW}"
npm run clean

# ── Git commit + tag + push ─────────────────────────────────────────────────
info "Committing + tagging v${NEW}..."
git add package.json
git commit -m "v${NEW}"
git tag "v${NEW}"
git push origin master
git push origin "v${NEW}"
ok "Pushed v${NEW}"

# ── GitHub Release ──────────────────────────────────────────────────────────
info "Creating GitHub release..."
PREV=$(git describe --tags --abbrev=0 HEAD^ 2>/dev/null || echo "")
if [[ -n "$PREV" ]]; then
  NOTES=$(git log "${PREV}..HEAD" --pretty=format:"- %s" --no-merges)
else
  NOTES="Release v${NEW}"
fi

if $USE_GH; then
  gh release create "v${NEW}" --title "v${NEW}" --notes "$NOTES"
else
  REPO=$(git remote get-url origin | sed 's|https://github.com/||;s|.git$||')
  BODY=$(echo "$NOTES" | sed 's/\\/\\\\/g;:a;N;$!ba;s/\n/\\n/g')
  curl -sf -X POST -H "Authorization: token ${GITHUB_TOKEN}" \
    -H "Content-Type: application/json" \
    -d "{\"tag_name\":\"v${NEW}\",\"name\":\"v${NEW}\",\"body\":\"${BODY}\"}" \
    "https://api.github.com/repos/${REPO}/releases"
fi
ok "GitHub release v${NEW} created"

# ── GitHub Pages deploy ─────────────────────────────────────────────────────
if $SKIP_PAGES; then warn "Skipped Pages deploy"; exit 0; fi

info "Building demo..."
npx webpack -p 2>&1 | tail -3
mv bundle.js examples/

info "Deploying to gh-pages..."
cd examples
git init -q
git checkout -q -b gh-pages 2>/dev/null || git checkout -q gh-pages
git add -A
git commit -q -m "Deploy v${NEW}"
REMOTE=$(git -C .. remote get-url origin)
if $USE_GH; then
  git push -f "$REMOTE" gh-pages:gh-pages
else
  AUTH_URL=$(echo "$REMOTE" | sed "s|https://|https://${GITHUB_TOKEN}@|")
  git push -f "$AUTH_URL" gh-pages:gh-pages
fi
cd ..
rm -rf examples/.git examples/bundle.js
ok "Deployed to GitHub Pages"
echo ""
ok "Done! v${NEW} published + released + deployed"
