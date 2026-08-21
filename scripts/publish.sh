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
info "GitHub Actions will now:"
echo "  1. Publish @mdaushi/react-pivottable@${NEW} to npm"
echo "  2. Create GitHub Release v${NEW}"
echo "  3. Deploy demo to GitHub Pages"
echo ""
info "Watch progress: https://github.com/mdaushi/react-pivottable/actions"
