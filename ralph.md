# Ralph Setup Guide

A comprehensive guide for setting up Ralph - the autonomous AI agent loop - for any new repository. Ralph runs Claude Code (or other AI coding assistants) in a loop until all user stories are complete.

## What is Ralph?

Ralph is based on [Geoffrey Huntley's Ralph pattern](https://ghuntley.com/ralph/) and the [snarktank/ralph](https://github.com/snarktank/ralph) implementation. At its core, Ralph is:

```bash
while :; do cat PROMPT.md | claude-code ; done
```

The key insight: each iteration gets a **fresh context**, but memory persists through:
- Git commits (completed work)
- `progress.txt` (learnings and patterns)
- `prd.json` (task status tracking)

## Quick Start

### 1. Create Directory Structure

```bash
mkdir -p scripts/ralph
```

### 2. Copy Core Files

You need these files in `scripts/ralph/`:
- `ralph.sh` - The bash loop
- `prompt.md` - Instructions for each iteration
- `prd.json` - Your user stories
- `progress.txt` - Will be created automatically

### 3. Create AGENTS.md

Create `AGENTS.md` at your project root with:
- Project overview
- Directory structure
- Key commands
- Coding patterns and conventions

### 4. Run Ralph

```bash
cd scripts/ralph
./ralph.sh [max_iterations]  # Default: 10
```

---

## File Templates

### ralph.sh (for Claude Code)

```bash
#!/bin/bash
# Ralph - Autonomous AI Agent Loop for Claude Code
set -e

MAX_ITERATIONS=${1:-10}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
PRD_FILE="$SCRIPT_DIR/prd.json"
PROGRESS_FILE="$SCRIPT_DIR/progress.txt"

# Check for required tools
if ! command -v claude &> /dev/null; then
    echo "Error: Claude Code CLI not found"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo "Error: jq not found. Install with: brew install jq"
    exit 1
fi

# Initialize progress file
if [ ! -f "$PROGRESS_FILE" ]; then
    echo "# Ralph Progress Log" > "$PROGRESS_FILE"
    echo "Started: $(date)" >> "$PROGRESS_FILE"
    echo "---" >> "$PROGRESS_FILE"
fi

echo "Starting Ralph - Max iterations: $MAX_ITERATIONS"

for i in $(seq 1 $MAX_ITERATIONS); do
    echo ""
    echo "═══════════════════════════════════════════════════════"
    echo "  Ralph Iteration $i of $MAX_ITERATIONS"
    echo "═══════════════════════════════════════════════════════"

    cd "$PROJECT_ROOT"
    OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | claude --dangerously-skip-permissions 2>&1 | tee /dev/stderr) || true

    if echo "$OUTPUT" | grep -q "<promise>COMPLETE</promise>"; then
        echo "Ralph completed all tasks!"
        exit 0
    fi

    REMAINING=$(jq '[.userStories[] | select(.passes == false)] | length' "$PRD_FILE")
    if [ "$REMAINING" -eq 0 ]; then
        echo "All stories complete!"
        exit 0
    fi

    sleep 2
done

echo "Reached max iterations without completing all tasks."
exit 1
```

### prompt.md

```markdown
# Ralph Agent Instructions

You are an autonomous coding agent. Each iteration is fresh - you have no memory of previous runs except what's in git, progress.txt, and prd.json.

## Your Task

1. Read `scripts/ralph/prd.json` for user stories
2. Read `scripts/ralph/progress.txt` - check **Codebase Patterns** section FIRST
3. Read `AGENTS.md` for project conventions
4. Pick the highest priority story where `passes: false`
5. Implement that ONE story completely
6. Run quality checks (typecheck, test, lint)
7. If checks pass, commit with: `feat: [Story ID] - [Story Title]`
8. Update prd.json to set `passes: true`
9. Append progress to progress.txt

## Progress Report Format

APPEND to progress.txt:
\`\`\`
## [Date/Time] - [Story ID]: [Title]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
---
\`\`\`

## Stop Condition

If ALL stories have `passes: true`, reply with:
\`\`\`
<promise>COMPLETE</promise>
\`\`\`

## Rules

- Work on ONE story per iteration
- Keep commits small and focused
- Never skip acceptance criteria
- Read Codebase Patterns before starting
```

### prd.json Structure

```json
{
  "project": "ProjectName",
  "branchName": "ralph/feature-name",
  "description": "Brief description of what we're building",
  "userStories": [
    {
      "id": "US-001",
      "title": "Short descriptive title",
      "description": "As a [user], I want [feature] so that [benefit]",
      "acceptanceCriteria": [
        "Specific verifiable criterion",
        "Another criterion",
        "yarn type-check passes"
      ],
      "priority": 1,
      "passes": false,
      "notes": "Dependencies or context"
    }
  ]
}
```

### AGENTS.md Template

```markdown
# AGENTS.md - [Project Name]

## Project Overview
[What does this project do?]

## Repository Structure
\`\`\`
project/
├── src/
├── tests/
└── ...
\`\`\`

## Tech Stack
- [Framework]
- [Database]
- [etc.]

## Key Commands
\`\`\`bash
yarn install
yarn dev
yarn test
yarn type-check
\`\`\`

## Coding Patterns
[Document your conventions]

## Common Gotchas
[Things that aren't obvious]

## When to Update This File
Add patterns when you discover conventions, gotchas, or dependencies.
```

---

## Story Sizing (CRITICAL)

**Each story must be completable in ONE iteration.**

### Right-sized stories:
- Add a database column and migration
- Create a single UI component
- Add validation to a form
- Write tests for a function

### Too big (split these):
- "Build the dashboard" → Split into: header, sidebar, main content, data fetching
- "Add authentication" → Split into: signup form, login form, password reset, session management
- "Create API" → Split into: one story per endpoint

**Rule of thumb:** If you can't describe the change in 2-3 sentences, it's too big.

---

## Story Ordering

Stories execute by priority (1 = first). Order by dependencies:

1. **Schema/types first** - Data models, type definitions
2. **Backend next** - API endpoints, server actions
3. **UI last** - Components that consume the backend
4. **Integration final** - Connecting pieces together

**Wrong order example:**
```
1. Create dashboard UI (needs API)
2. Create API (needs schema)
3. Create schema
```

**Correct order:**
```
1. Create schema
2. Create API
3. Create dashboard UI
```

---

## Acceptance Criteria Rules

Every criterion must be **verifiable**:

### Good criteria:
- "Add `status` column to users table with default 'active'"
- "Form shows error when email is empty"
- "API returns 404 for non-existent resources"
- "yarn type-check passes"
- "yarn test passes"

### Bad criteria:
- "Works correctly"
- "Good UX"
- "Handles edge cases"
- "Is performant"

### Always include:
```
"yarn type-check passes"
```

For UI stories, also include:
```
"Component renders without console errors"
```

---

## Converting GitHub Issues to prd.json

You can convert existing GitHub issues to Ralph format:

```bash
# Fetch issues
gh issue list --repo owner/repo --state open --json number,title,body

# Then manually or programmatically convert to prd.json format
```

Add a `githubIssue` field to link back:
```json
{
  "id": "US-001",
  "githubIssue": 42,
  "title": "...",
  ...
}
```

---

## Debugging Ralph

### View story status:
```bash
cat scripts/ralph/prd.json | jq '.userStories[] | {id, title, passes}'
```

### Check remaining stories:
```bash
cat scripts/ralph/prd.json | jq '[.userStories[] | select(.passes == false)] | length'
```

### View learnings:
```bash
cat scripts/ralph/progress.txt
```

### View recent git history:
```bash
git log --oneline -10
```

---

## Archiving Runs

When starting a new feature, archive the previous run:

```bash
mkdir -p scripts/ralph/archive/$(date +%Y-%m-%d)-previous-feature
cp scripts/ralph/prd.json scripts/ralph/progress.txt scripts/ralph/archive/$(date +%Y-%m-%d)-previous-feature/
```

Then create a fresh prd.json for the new feature.

---

## Tips for Success

### 1. Small Stories Win
The #1 cause of Ralph failures is stories that are too big. When in doubt, split.

### 2. Feedback Loops Matter
Ensure your project has working:
- Type checking (`yarn type-check`)
- Tests (`yarn test`)
- Linting (`yarn lint`)

Ralph uses these to verify work before moving on.

### 3. Amplify Deployment Monitoring

For Amplify-based projects, failed deployments are a common point of failure. Add deployment monitoring to the Ralph loop:

**Add Amplify config to prd.json:**
```json
{
  "project": "MyProject",
  "amplify": {
    "region": "us-east-1",
    "frontendAppId": "d2z5ddqhlc1q5",
    "backendAppId": "d3jl0ykn4qgj9r"
  },
  "userStories": [...]
}
```

**Add to prompt.md:**
- Step to check Amplify build status before starting a story
- If build failed, prioritize fixing it over new work
- Use AWS CLI: `aws amplify list-jobs --app-id <appId> --branch-name main --max-items 1`

This ensures Ralph catches deployment failures and fixes them before moving on to new stories.

### 3. Document Learnings
The progress.txt Codebase Patterns section is gold. Add patterns as you discover them - future iterations read this first.

### 4. Update AGENTS.md
When you discover something non-obvious about the codebase, add it to AGENTS.md so future iterations (and human developers) benefit.

### 5. Trust the Loop
Ralph works through "eventual consistency" - problems in early iterations get fixed in later ones. Don't panic if one iteration produces imperfect code.

---

## Customizing for Your Project

### Different AI Tools

For **Amp** instead of Claude Code:
```bash
OUTPUT=$(cat "$SCRIPT_DIR/prompt.md" | amp --dangerously-allow-all 2>&1 | tee /dev/stderr) || true
```

For **Cursor/Aider/etc**, adjust the command accordingly.

### Project-Specific Checks

Edit prompt.md to specify your project's quality checks:
```markdown
## Quality Checks
- `npm run build` - Build must succeed
- `npm run test` - All tests must pass
- `npm run lint` - No lint errors
- `npm run typecheck` - No type errors
```

### Custom Completion Signals

If your project needs different completion criteria, modify the stop condition in prompt.md.

---

## Reference Links

- Original Ralph: https://ghuntley.com/ralph/
- Ralph Implementation: https://github.com/snarktank/ralph
- Ryan Carson's Thread: https://x.com/ryancarson/status/2008548371712135632

---

## Checklist: Setting Up Ralph for a New Repo

- [ ] Create `scripts/ralph/` directory
- [ ] Copy/create `ralph.sh` and make executable (`chmod +x`)
- [ ] Create `prompt.md` with project-specific instructions
- [ ] Create `prd.json` with user stories (small, ordered by dependency)
- [ ] Create `AGENTS.md` at project root
- [ ] Ensure quality checks work (`type-check`, `test`, `lint`)
- [ ] Run `./ralph.sh` and iterate!
