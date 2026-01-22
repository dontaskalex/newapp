---
name: split
description: "Split a task into 3 parallel subtasks and assign them to coder1, coder2, and coder3 agents simultaneously. Use this when you want to parallelize coding work across three specialized coders for maximum throughput."
user_invocable: true
---

# Split Workflow

The user wants to split a coding task across 3 parallel coding agents (coder1, coder2, coder3) for faster execution.

## Your Process

### Step 1: Analyze the Task
Look at the task provided and determine how to split it into 3 **independent** subtasks that can be worked on simultaneously without conflicts.

Good splits:
- Different files or components
- Different features or functions
- Different layers (e.g., UI component, logic, tests)
- Different sections of a larger feature
- Different API endpoints or routes

Bad splits (avoid):
- Tasks that modify the same file
- Tasks where one depends on another's output
- Tasks that would cause merge conflicts

### Step 2: Plan the Split
Create a clear plan showing:
- **coder1**: [description] - Files: [files it will touch]
- **coder2**: [description] - Files: [files it will touch]
- **coder3**: [description] - Files: [files it will touch]

Show this plan to the user briefly, then proceed immediately.

### Step 3: Launch All 3 Coders in Parallel
Use the Task tool to launch exactly 3 agents **in parallel** (all in the same message with 3 Task tool calls):

1. **coder1** (subagent_type: `coder1`)
2. **coder2** (subagent_type: `coder2`)
3. **coder3** (subagent_type: `coder3`)

Each agent gets:
- Clear description of their specific subtask
- List of files they should work with
- Context about the overall goal
- Explicit instruction to only touch their assigned files

Example prompt structure for each agent:
```
You are working on part of a larger task that has been split across 3 coders.

**Overall Goal**: [main task description]

**Your Assignment**: [specific subtask]

**Files You Should Work With**:
- [file1]
- [file2]

**Important**: Only modify the files listed above. Other coders are working on other parts of this task.

Please implement this now.
```

### Step 4: Collect and Summarize Results
Once all 3 agents complete:
1. Summarize what each coder accomplished
2. List all files that were created or modified
3. Note any integration points that may need attention
4. Suggest follow-up tasks if needed (like running tests or builds)

## Important Rules

- **Always split into exactly 3 subtasks** - find a way to divide the work
- **Ensure no file conflicts** - each coder should touch different files
- **Launch all 3 in parallel** - use a single message with 3 Task tool calls
- **Use the correct subagent_type for each**:
  - First subtask: `coder1`
  - Second subtask: `coder2`
  - Third subtask: `coder3`
- If the task is too small to split 3 ways, tell the user and offer to just do it directly

## Example Usage

User: "/split Build a dashboard with user stats, activity feed, and settings panel"

Split plan:
- **coder1**: User stats component with charts (dashboard/UserStats.tsx, lib/statsApi.ts)
- **coder2**: Activity feed with real-time updates (dashboard/ActivityFeed.tsx, lib/activityApi.ts)
- **coder3**: Settings panel with form validation (dashboard/SettingsPanel.tsx, lib/settingsApi.ts)

Then launch all 3 coders in parallel with their assignments.

## Another Example

User: "/split Add CRUD operations for products - list, create, edit, delete"

Split plan:
- **coder1**: List products page + GET endpoint (pages/products/index.tsx, api/products/index.ts)
- **coder2**: Create product form + POST endpoint (pages/products/new.tsx, api/products/create.ts)
- **coder3**: Edit/Delete functionality + PUT/DELETE endpoints (pages/products/[id].tsx, api/products/[id].ts)
