#!/usr/bin/env node
/**
 * Dual-Agent MCP Server
 * Provides collaboration tools for Claude Code (Architect) and Devin Cascade (Execution Engine).
 * Tools: post_task, get_tasks, update_task, post_note, get_notes, set_status, get_status,
 *        repo.read_file, repo.write_file, repo.diff, ci.run_tests, ci.get_logs,
 *        devin.run_task, git.create_branch, git.commit, git.push
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATE_FILE = path.join(__dirname, "teammate-state.json");
const REPO_ROOT = path.join(__dirname, "..");
const ARTIFACTS_DIR = path.join(__dirname, "..", "agent-artifacts");

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return { tasks: [], notes: [], status: {} };
  }
  return JSON.parse(fs.readFileSync(STATE_FILE, "utf8"));
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

function timestamp() {
  return new Date().toISOString();
}

const server = new McpServer({
  name: "teammate",
  version: "1.0.0",
});

// --- TASKS ---

server.tool(
  "post_task",
  "Post a task for your teammate (Claude Code or Cline) to pick up.",
  {
    title: z.string().describe("Short task title"),
    description: z.string().describe("Full task description"),
    assignee: z.enum(["claude", "cline", "any"]).default("any").describe("Who should handle this"),
    priority: z.enum(["low", "medium", "high"]).default("medium"),
    from: z.string().describe("Who is posting this task (e.g. 'claude', 'cline')"),
  },
  ({ title, description, assignee, priority, from }) => {
    const state = loadState();
    const task = {
      id: Date.now().toString(),
      title,
      description,
      assignee,
      priority,
      from,
      status: "pending",
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };
    state.tasks.push(task);
    saveState(state);
    return { content: [{ type: "text", text: `Task created: [${task.id}] ${title} → assigned to ${assignee}` }] };
  }
);

server.tool(
  "get_tasks",
  "Get all tasks, optionally filtered by assignee or status.",
  {
    assignee: z.enum(["claude", "cline", "any", "all"]).default("all").describe("Filter by assignee ('all' = no filter)"),
    status: z.enum(["pending", "in_progress", "done", "all"]).default("all"),
  },
  ({ assignee, status }) => {
    const state = loadState();
    let tasks = state.tasks;
    if (assignee !== "all") tasks = tasks.filter(t => t.assignee === assignee || t.assignee === "any");
    if (status !== "all") tasks = tasks.filter(t => t.status === status);
    const text = tasks.length === 0
      ? "No tasks found."
      : tasks.map(t => `[${t.id}] (${t.priority}/${t.status}) ${t.title}\n  From: ${t.from} → ${t.assignee}\n  ${t.description}`).join("\n\n");
    return { content: [{ type: "text", text }] };
  }
);

server.tool(
  "update_task",
  "Update a task's status or add a result/comment.",
  {
    id: z.string().describe("Task ID"),
    status: z.enum(["pending", "in_progress", "done"]).optional(),
    result: z.string().optional().describe("Result or comment to attach"),
  },
  ({ id, status, result }) => {
    const state = loadState();
    const task = state.tasks.find(t => t.id === id);
    if (!task) return { content: [{ type: "text", text: `Task ${id} not found.` }] };
    if (status) task.status = status;
    if (result) task.result = result;
    task.updatedAt = timestamp();
    saveState(state);
    return { content: [{ type: "text", text: `Task [${id}] updated → ${task.status}` }] };
  }
);

// --- NOTES ---

server.tool(
  "post_note",
  "Post a shared note or observation for your teammate to read.",
  {
    content: z.string().describe("Note content"),
    from: z.string().describe("Who is posting (e.g. 'claude', 'cline')"),
    tag: z.string().optional().describe("Optional tag to categorize the note (e.g. 'architecture', 'bug', 'decision')"),
  },
  ({ content, from, tag }) => {
    const state = loadState();
    const note = { id: Date.now().toString(), content, from, tag: tag || null, createdAt: timestamp() };
    state.notes.push(note);
    saveState(state);
    return { content: [{ type: "text", text: `Note posted [${note.id}]${tag ? ` #${tag}` : ""}` }] };
  }
);

server.tool(
  "get_notes",
  "Get shared notes, optionally filtered by tag.",
  {
    tag: z.string().optional().describe("Filter by tag"),
    limit: z.number().default(20).describe("Max notes to return"),
  },
  ({ tag, limit }) => {
    const state = loadState();
    let notes = state.notes;
    if (tag) notes = notes.filter(n => n.tag === tag);
    notes = notes.slice(-limit);
    const text = notes.length === 0
      ? "No notes found."
      : notes.map(n => `[${n.createdAt}] (${n.from})${n.tag ? ` #${n.tag}` : ""}\n${n.content}`).join("\n\n---\n\n");
    return { content: [{ type: "text", text }] };
  }
);

// --- STATUS ---

server.tool(
  "set_status",
  "Set a named status key so your teammate knows what you're working on.",
  {
    key: z.string().describe("Status key (e.g. 'claude', 'cline', 'current_focus')"),
    value: z.string().describe("Status value"),
    from: z.string().describe("Who is setting this"),
  },
  ({ key, value, from }) => {
    const state = loadState();
    state.status[key] = { value, from, updatedAt: timestamp() };
    saveState(state);
    return { content: [{ type: "text", text: `Status [${key}] = "${value}"` }] };
  }
);

server.tool(
  "get_status",
  "Get all current status entries to see what your teammate is doing.",
  {},
  () => {
    const state = loadState();
    const entries = Object.entries(state.status);
    if (entries.length === 0) return { content: [{ type: "text", text: "No status set." }] };
    const text = entries.map(([k, v]) => `[${k}] "${v.value}" — set by ${v.from} at ${v.updatedAt}`).join("\n");
    return { content: [{ type: "text", text }] };
  }
);

// --- REPO TOOLS ---

server.tool(
  "repo.read_file",
  "Read a file from the repository.",
  {
    path: z.string().describe("Relative path from repo root"),
  },
  ({ path: filePath }) => {
    const fullPath = path.join(REPO_ROOT, filePath);
    if (!fs.existsSync(fullPath)) {
      return { content: [{ type: "text", text: `Error: File not found: ${filePath}` }] };
    }
    const content = fs.readFileSync(fullPath, "utf8");
    return { content: [{ type: "text", text: content }] };
  }
);

server.tool(
  "repo.write_file",
  "Write content to a file in the repository.",
  {
    path: z.string().describe("Relative path from repo root"),
    content: z.string().describe("File content"),
  },
  ({ path: filePath, content }) => {
    const fullPath = path.join(REPO_ROOT, filePath);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(fullPath, content, "utf8");
    return { content: [{ type: "text", text: `File written: ${filePath}` }] };
  }
);

server.tool(
  "repo.diff",
  "Get git diff for a file or the entire repo.",
  {
    path: z.string().optional().describe("Optional relative path (if omitted, diff entire repo)"),
  },
  ({ path }) => {
    try {
      const cmd = path ? `git diff ${path}` : "git diff";
      const diff = execSync(cmd, { cwd: REPO_ROOT, encoding: "utf8" });
      return { content: [{ type: "text", text: diff || "No changes." }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    }
  }
);

// --- CI TOOLS ---

server.tool(
  "ci.run_tests",
  "Run CI tests and save output to artifacts.",
  {
    command: z.string().default("npm test").describe("Test command to run"),
  },
  ({ command }) => {
    try {
      const output = execSync(command, { cwd: REPO_ROOT, encoding: "utf8", stdio: "pipe" });
      const logPath = path.join(ARTIFACTS_DIR, "test-output.log");
      fs.writeFileSync(logPath, output, "utf8");
      return { content: [{ type: "text", text: `Tests completed. Output saved to ${logPath}\n\n${output}` }] };
    } catch (err) {
      const logPath = path.join(ARTIFACTS_DIR, "test-output.log");
      const errorOutput = err.stdout || err.stderr || err.message;
      fs.writeFileSync(logPath, errorOutput, "utf8");
      return { content: [{ type: "text", text: `Tests failed. Output saved to ${logPath}\n\n${errorOutput}` }] };
    }
  }
);

server.tool(
  "ci.get_logs",
  "Retrieve CI test logs from artifacts.",
  {},
  () => {
    const logPath = path.join(ARTIFACTS_DIR, "test-output.log");
    if (!fs.existsSync(logPath)) {
      return { content: [{ type: "text", text: "No test logs found." }] };
    }
    const logs = fs.readFileSync(logPath, "utf8");
    return { content: [{ type: "text", text: logs }] };
  }
);

// --- DEVIN CASCADE TOOL ---

server.tool(
  "devin.run_task",
  "Execute a task in CASCADE mode (iterative debugging loop).",
  {
    instruction: z.string().describe("Task instruction for Devin"),
    cascade_mode: z.boolean().default(true).describe("Enable cascade mode for iterative fixing"),
  },
  ({ instruction, cascade_mode }) => {
    const state = loadState();
    const taskId = Date.now().toString();
    const task = {
      id: taskId,
      title: "CASCADE Task",
      description: instruction,
      assignee: "devin",
      priority: "high",
      from: "claude",
      status: "in_progress",
      cascade_mode,
      createdAt: timestamp(),
      updatedAt: timestamp(),
    };
    state.tasks.push(task);
    saveState(state);
    
    const modeText = cascade_mode ? "CASCADE mode enabled" : "CASCADE mode disabled";
    return { 
      content: [{ 
        type: "text", 
        text: `Task queued for Devin [${taskId}]\n${modeText}\n\nInstruction: ${instruction}\n\nDevin will execute this task and return results via teammate MCP.` 
      }] 
    };
  }
);

// --- GIT TOOLS ---

server.tool(
  "git.create_branch",
  "Create a new git branch.",
  {
    branch_name: z.string().describe("Branch name"),
  },
  ({ branch_name }) => {
    try {
      execSync(`git checkout -b ${branch_name}`, { cwd: REPO_ROOT, encoding: "utf8" });
      return { content: [{ type: "text", text: `Branch created: ${branch_name}` }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    }
  }
);

server.tool(
  "git.commit",
  "Commit changes with a message.",
  {
    message: z.string().describe("Commit message"),
  },
  ({ message }) => {
    try {
      execSync(`git add -A && git commit -m "${message}"`, { cwd: REPO_ROOT, encoding: "utf8" });
      return { content: [{ type: "text", text: `Changes committed: ${message}` }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    }
  }
);

server.tool(
  "git.push",
  "Push current branch to remote.",
  {
    remote: z.string().default("origin").describe("Remote name"),
    branch: z.string().optional().describe("Branch name (if omitted, uses current branch)"),
  },
  ({ remote, branch }) => {
    try {
      const branchSpec = branch ? `${branch}` : "";
      execSync(`git push ${remote} ${branchSpec}`, { cwd: REPO_ROOT, encoding: "utf8" });
      return { content: [{ type: "text", text: `Pushed to ${remote}${branch ? `/${branch}` : ""}` }] };
    } catch (err) {
      return { content: [{ type: "text", text: `Error: ${err.message}` }] };
    }
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
