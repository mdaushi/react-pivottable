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
#   - GitHub auth: gh CLI (gh auth login) OR token will be prompted
#   - clean git tree     (no uncommitted changes)
#
set -euo pipefail

RED='\033[0;31m'; GRN='\033[0;32m'; YLW='\033[0;33m'; CYN='\033[0;36m'; NC='\033[0m'
info() { echo -e "${CYN}[INFO]${NC}  $*"; }
ok()   { echo -e "${GRN}[OK]${NC}    $*"; }
warn() { echo -e "${YLW}[WARN]${NC}  $*"; }
fail() { echo -e "${RED}[FAIL]${NC}  $*"; exit 1; }

# ── Security cleanup on exit ────────────────────────────────────────────────
GITHUB_TOKEN=""
CURL_CONFIG=""
CRED_FILE=""
cleanup() {
  # Clear token from shell variable
  GITHUB_TOKEN=""
  # Remove temp files securely
  [[ -n "$CURL_CONFIG" && -f "$CURL_CONFIG" ]] && shred -u "$CURL_CONFIG" 2>/dev/null || rm -f "$CURL_CONFIG"
  [[ -n "$CRED_FILE" && -f "$CRED_FILE" ]]     && shred -u "$CRED_FILE" 2>/dev/null   || rm -f "$CRED_FILE"
  # Remove examples git dir if left over from failed pages deploy
  [[ -d examples/.git ]] && rm -rf examples/.git
  [[ -f examples/bundle.js ]] && rm -f examples/bundle.js
}
trap cleanup EXIT

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
GITHUB_TOKEN=""
if command -v gh &>/dev/null && gh auth status &>/dev/null; then
  USE_GH=true; ok "gh CLI ready"
else
  warn "gh CLI not available. You will need a GitHub token."
  echo "    Create one at: https://github.com/settings/tokens (repo scope)"
  echo -n "    Enter GitHub token (input hidden): "
  read -rs GITHUB_TOKEN
  echo ""
  [[ -n "$GITHUB_TOKEN" ]] || fail "No token entered. Aborting."

  # Verify token via curl config file (not visible in ps)
  CURL_CONFIG=$(mktemp)
  chmod 600 "$CURL_CONFIG"
  printf 'header = "Authorization: token %s"\n' "$GITHUB_TOKEN" > "$CURL_CONFIG"
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -K "$CURL_CONFIG" \
    "https://api.github.com/user")
  shred -u "$CURL_CONFIG" 2>/dev/null || rm -f "$CURL_CONFIG"
  CURL_CONFIG=""

  [[ "$HTTP" == "200" ]] || fail "Token validation failed (HTTP ${HTTP}). Check your token."
  ok "GitHub token validated"
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

# Build JSON body safely using node (escapes quotes, newlines, backslashes)
JSON_BODY=$(node -e "process.stdout.write(JSON.stringify({tag_name:'v${NEW}',name:'v${NEW}',body:process.argv[1]}))" "$NOTES")

if $USE_GH; then
  gh release create "v${NEW}" --title "v${NEW}" --notes "$NOTES"
else
  REPO=$(git remote get-url origin | sed 's|https://github.com/||;s|.git$||')
  # Pass token via curl config file — not visible in process list
  CURL_CONFIG=$(mktemp)
  chmod 600 "$CURL_CONFIG"
  printf 'header = "Authorization: token %s"\n' "$GITHUB_TOKEN" > "$CURL_CONFIG"
  printf 'header = "Content-Type: application/json"\n' >> "$CURL_CONFIG"
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -K "$CURL_CONFIG" \
    -X POST -d "$JSON_BODY" \
    "https://api.github.com/repos/${REPO}/releases")
  shred -u "$CURL_CONFIG" 2>/dev/null || rm -f "$CURL_CONFIG"
  CURL_CONFIG=""
  [[ "$HTTP" -ge 200 && "$HTTP" -lt 300 ]] || fail "GitHub release failed (HTTP ${HTTP})"
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
  # Use git credential store with temp file — token never in URL or ps
  CRED_FILE=$(mktemp)
  chmod 600 "$CRED_FILE"
  printf 'protocol=https\nhost=github.com\nusername=x-access-token\npassword=%s\n' "$GITHUB_TOKEN" > "$CRED_FILE"
  git -c credential.helper="store --file=${CRED_FILE}" push -f "$REMOTE" gh-pages:gh-pages
  shred -u "$CRED_FILE" 2>/dev/null || rm -f "$CRED_FILE"
  CRED_FILE=""
fi
cd ..
rm -rf examples/.git examples/bundle.js
ok "Deployed to GitHub Pages"
echo ""
ok "Done! v${NEW} published + released + deployed"
