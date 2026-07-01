---
description: Dual-Agent Cascade Execution Flow
---

# Dual-Agent Cascade Execution Workflow

This workflow defines the structured collaboration between Claude Code (Architect) and Devin Cascade (Execution Engine).

## Roles

**CLAUDE CODE (Primary Architect)**
- Designs system architecture
- Writes and refactors code
- Simplifies implementations
- Ensures code readability and maintainability
- Produces clean final output

**DEVIN CASCADE (Execution + Repair Engine)**
- Runs in iterative cascade loops
- Focuses ONLY on correctness and CI stability
- MUST NOT redesign architecture

## Available MCP Tools

### Repository Tools
- `repo.read_file` - Read a file from the repository
- `repo.write_file` - Write content to a file in the repository
- `repo.diff` - Get git diff for a file or the entire repo

### CI Tools
- `ci.run_tests` - Run CI tests and save output to artifacts
- `ci.get_logs` - Retrieve CI test logs from artifacts

### Devin Tools
- `devin.run_task` - Execute a task in CASCADE mode (iterative debugging loop)

### Git Tools
- `git.create_branch` - Create a new git branch
- `git.commit` - Commit changes with a message
- `git.push` - Push current branch to remote

### Collaboration Tools
- `post_task` - Post a task for your teammate to pick up
- `get_tasks` - Get all tasks, optionally filtered by assignee or status
- `update_task` - Update a task's status or add a result/comment
- `post_note` - Post a shared note or observation for your teammate
- `get_notes` - Get shared notes, optionally filtered by tag
- `set_status` - Set a named status key so your teammate knows what you're working on
- `get_status` - Get all current status entries

## Execution Flow

### STEP 1 — CLAUDE BUILD PHASE
1. Implement feature using `repo.write_file`
2. Keep design clean and modular
3. Save plan to `/agent-artifacts/plan.md`

### STEP 2 — TEST PHASE
1. Execute `ci.run_tests`
2. Store output in `/agent-artifacts/test-output.log`

**IF PASS → STEP 4**
**IF FAIL → STEP 3**

### STEP 3 — DEVIN CASCADE FIX PHASE
1. Call `devin.run_task` with:
   - Test logs from `ci.get_logs`
   - Failing files from `repo.diff`
   - Cascade mode enabled

Instruction template:
```
Fix all issues using cascade execution until tests pass.
Do not change architecture.
Return only final stable patch.
```

Devin must NOT return intermediate steps unless failure persists after 3 iterations.

### STEP 4 — CLAUDE SIMPLIFICATION PHASE
1. Refactor for:
   - Simplicity
   - Readability
   - Reduced complexity
2. Do NOT change behavior

### STEP 5 — DEVIN CASCADE REVIEW PHASE
1. Call `devin.run_task` in CASCADE mode with instruction:
```
Perform security + edge-case review using cascade validation loop.
Return only actionable issues or patches.
```

### STEP 6 — CLAUDE FINALIZATION PHASE
1. Apply review feedback
2. Clean codebase
3. Ensure production readiness

### STEP 7 — GIT FINALIZATION
1. `git.create_branch`
2. `git.commit`
3. `git.push`

## Hard Constraints

- Claude = architecture only
- Devin Cascade = debugging + iterative fixing only
- No direct shell access (use MCP tools)
- No concurrent file modification by both agents
- Always validate via tests after Devin completion
- Always enforce minimal diff principle

## Output Artifacts

All artifacts are stored in `/agent-artifacts/`:
- `plan.md` - Implementation plan from Claude
- `test-output.log` - CI test results
- `issues.md` - Issues found during review
- `final.diff` - Final stable patch

## Cascade Mode Instructions

When calling `devin.run_task`, ALWAYS include cascade instruction:

```
Run in CASCADE mode:
1. Analyze failure or task
2. Apply minimal fix
3. Run validation tests
4. If failing, iterate internally until passing
5. Return final stable diff only
```

Devin must NOT return intermediate steps unless failure persists after 3 iterations.
