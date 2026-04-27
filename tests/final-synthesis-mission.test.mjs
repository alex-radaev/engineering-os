import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";

const execFile = promisify(execFileCb);
const cliPath = fileURLToPath(new URL("../scripts/crew.mjs", import.meta.url));

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

async function initRepo(prefix) {
  const root = await makeTempDir(prefix);
  const repoPath = path.join(root, "app");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);
  return repoPath;
}

async function recordMission(repoPath, { missionId = "M-TEST-1", taskId = "T-TEST-1" } = {}) {
  const statusFile = path.join(repoPath, ".claude", "state", "crew", "status.json");
  const eventLog = path.join(repoPath, ".claude", "state", "crew", "events.jsonl");
  const handoffFile = path.join(repoPath, ".claude", "state", "crew", "handoff.md");
  const envelope = {
    mission_id: missionId,
    task_id: taskId,
    repo: "engineering-os",
    objective: "Test synthesis terminal wiring",
    reporting: {
      status_file: statusFile,
      event_log: eventLog,
      handoff_file: handoffFile
    }
  };
  await execFile("node", [
    cliPath,
    "record-mission",
    "--repo",
    repoPath,
    "--envelope-json",
    JSON.stringify(envelope)
  ]);
  return { statusFile, eventLog, handoffFile, missionId, taskId };
}

test("write-final-synthesis with envelope + terminal-status writes status, event, handoff copy", async () => {
  const repoPath = await initRepo("crew-fs-mission-");
  const { statusFile, eventLog, handoffFile, missionId } = await recordMission(repoPath);

  const { stdout } = await execFile("node", [
    cliPath,
    "write-final-synthesis",
    "--repo",
    repoPath,
    "--title",
    "Terminal synthesis test",
    "--summary",
    "Feature shipped behind flag",
    "--external-deltas",
    "none",
    "--mission-terminal-status",
    "done",
    "--proposed-task-status",
    "needs_review",
    "--next-action",
    "open PR and request review"
  ]);
  const result = JSON.parse(stdout);

  // Synthesis md still written under runs/
  const synthesisBody = await fs.readFile(result.path, "utf8");
  assert.match(result.path, /\.claude\/artifacts\/crew\/runs\//);
  assert.match(synthesisBody, /# Final Synthesis: Terminal synthesis test/);

  // Status JSON has terminal status + proposed_task_status
  const status = JSON.parse(await fs.readFile(statusFile, "utf8"));
  assert.equal(status.status, "done");
  assert.equal(status.proposed_task_status, "needs_review");
  assert.equal(status.phase, "implementation");
  assert.equal(status.mission_id, missionId);
  assert.equal(status.next_action, "open PR and request review");

  // Event log gained a terminal line
  const events = (await fs.readFile(eventLog, "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
  const terminalEvents = events.filter((e) => e.event === "done");
  assert.equal(terminalEvents.length, 1);
  assert.equal(terminalEvents[0].mission_id, missionId);
  assert.equal(terminalEvents[0].phase, "implementation");

  // Handoff copy exists and matches synthesis body
  const handoffBody = await fs.readFile(handoffFile, "utf8");
  assert.equal(handoffBody, synthesisBody);

  // Result payload exposes mission block
  assert.ok(result.mission, "expected mission block in result");
  assert.equal(result.mission.mission_id, missionId);
  assert.equal(result.mission.handoff_file, handoffFile);
});

test("write-final-synthesis without envelope and without terminal flags behaves as before", async () => {
  const repoPath = await initRepo("crew-fs-vanilla-");

  const { stdout } = await execFile("node", [
    cliPath,
    "write-final-synthesis",
    "--repo",
    repoPath,
    "--title",
    "Vanilla synthesis",
    "--summary",
    "No mission here",
    "--external-deltas",
    "none"
  ]);
  const result = JSON.parse(stdout);

  const body = await fs.readFile(result.path, "utf8");
  assert.match(body, /# Final Synthesis: Vanilla synthesis/);

  // No current-mission file, no status.json, no handoff.md
  const stateDir = path.join(repoPath, ".claude", "state", "crew");
  const existsStatus = await fs
    .access(path.join(stateDir, "status.json"))
    .then(() => true)
    .catch(() => false);
  const existsHandoff = await fs
    .access(path.join(stateDir, "handoff.md"))
    .then(() => true)
    .catch(() => false);
  const existsCurrent = await fs
    .access(path.join(stateDir, "current-mission.json"))
    .then(() => true)
    .catch(() => false);
  assert.equal(existsStatus, false);
  assert.equal(existsHandoff, false);
  assert.equal(existsCurrent, false);

  // Mission block is null
  assert.equal(result.mission, null);
});

test("write-final-synthesis with terminal-status but no envelope errors clearly", async () => {
  const repoPath = await initRepo("crew-fs-no-env-");

  await assert.rejects(
    execFile("node", [
      cliPath,
      "write-final-synthesis",
      "--repo",
      repoPath,
      "--title",
      "Orphan terminal",
      "--summary",
      "Should fail",
      "--external-deltas",
      "none",
      "--mission-terminal-status",
      "done"
    ]),
    /no active mission envelope/
  );
});

test("write-final-synthesis rejects invalid --mission-terminal-status enum", async () => {
  const repoPath = await initRepo("crew-fs-bad-enum-");
  await recordMission(repoPath);

  await assert.rejects(
    execFile("node", [
      cliPath,
      "write-final-synthesis",
      "--repo",
      repoPath,
      "--title",
      "Bad enum",
      "--summary",
      "Oops",
      "--external-deltas",
      "none",
      "--mission-terminal-status",
      "shipped"
    ]),
    /invalid --mission-terminal-status/
  );
});

test("write-final-synthesis rejects invalid --proposed-task-status enum", async () => {
  const repoPath = await initRepo("crew-fs-bad-task-status-");
  await recordMission(repoPath);

  await assert.rejects(
    execFile("node", [
      cliPath,
      "write-final-synthesis",
      "--repo",
      repoPath,
      "--title",
      "Bad enum",
      "--summary",
      "Oops",
      "--external-deltas",
      "none",
      "--mission-terminal-status",
      "done",
      "--proposed-task-status",
      "nope"
    ]),
    /invalid --proposed-task-status/
  );
});

test("write-final-synthesis with envelope but no terminal-status is a no-op on mission state", async () => {
  const repoPath = await initRepo("crew-fs-envelope-noterm-");
  const { statusFile, eventLog } = await recordMission(repoPath);

  await execFile("node", [
    cliPath,
    "write-final-synthesis",
    "--repo",
    repoPath,
    "--title",
    "Mid-run synthesis",
    "--summary",
    "Just writing markdown",
    "--external-deltas",
    "none"
  ]);

  const existsStatus = await fs
    .access(statusFile)
    .then(() => true)
    .catch(() => false);
  const existsEvents = await fs
    .access(eventLog)
    .then(() => true)
    .catch(() => false);
  assert.equal(existsStatus, false, "status.json should not be written without terminal-status");
  assert.equal(existsEvents, false, "events.jsonl should not gain entries without terminal-status");
});

test("write-final-synthesis with --handoff-out overrides envelope handoff path", async () => {
  const repoPath = await initRepo("crew-fs-handoff-out-");
  const { handoffFile: defaultHandoff } = await recordMission(repoPath);
  const customHandoff = path.join(repoPath, "custom", "custom-handoff.md");

  const { stdout } = await execFile("node", [
    cliPath,
    "write-final-synthesis",
    "--repo",
    repoPath,
    "--title",
    "Custom handoff test",
    "--summary",
    "Override path",
    "--external-deltas",
    "none",
    "--mission-terminal-status",
    "done",
    "--handoff-out",
    customHandoff
  ]);
  const result = JSON.parse(stdout);
  assert.equal(result.mission.handoff_file, customHandoff);

  const existsCustom = await fs
    .access(customHandoff)
    .then(() => true)
    .catch(() => false);
  assert.equal(existsCustom, true);

  // Default envelope path should not have received the copy since we overrode
  const existsDefault = await fs
    .access(defaultHandoff)
    .then(() => true)
    .catch(() => false);
  assert.equal(existsDefault, false);
});
