#!/usr/bin/env bash
# Copies the design skills (and the reviewer agent) from this repo into YOUR user-level Claude Code
# folder, so they are available in every project on this machine, not only in learn-math:
#   bash scripts/install-user-skills.sh
# Inside learn-math itself they are already loaded from .claude/ — this is for your other projects.
set -euo pipefail
here="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
dest="${CLAUDE_HOME:-$HOME/.claude}"
mkdir -p "$dest/skills" "$dest/agents"
for skill in app-design-system motion-feedback-rewards ui-ux-polish; do
  rm -rf "$dest/skills/$skill"
  cp -R "$here/.claude/skills/$skill" "$dest/skills/$skill"
  echo "installed skill: $skill"
done
cp "$here/.claude/agents/ux-ui-reviewer.md" "$dest/agents/ux-ui-reviewer.md"
echo "installed agent: ux-ui-reviewer"
echo "Start a new Claude Code session to load them."
