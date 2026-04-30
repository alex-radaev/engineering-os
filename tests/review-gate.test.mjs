import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { execFile as execFileCb } from "node:child_process";
import { promisify } from "node:util";
import { assertReviewGate } from "../scripts/lib/artifacts.mjs";

const execFile = promisify(execFileCb);
const cliPath = fileURLToPath(new URL("../scripts/crew.mjs", import.meta.url));

function fakeReader(lines) {
  return async () => lines.map((l) => JSON.stringify(l)).join("\n");
}

test("assertReviewGate allows when review event is newer than implementation event", async () => {
  await assertReviewGate({
    eventLog: "/fake",
    terminalStatus: "done",
    deps: {
      readEventLog: fakeReader([
        { ts: "2026-04-30T10:00:00.000Z", event: "started", phase: "implementation" },
        { ts: "2026-04-30T11:00:00.000Z", event: "progress", phase: "implementation" },
        { ts: "2026-04-30T12:00:00.000Z", event: "gate", phase: "review", summary: "approved" }
      ])
    }
  });
});

test("assertReviewGate refuses when no review gate event is present", async () => {
  await assert.rejects(
    () =>
      assertReviewGate({
        eventLog: "/fake/log.jsonl",
        terminalStatus: "done",
        deps: {
          readEventLog: fakeReader([
            { ts: "2026-04-30T10:00:00.000Z", event: "started", phase: "implementation" },
            { ts: "2026-04-30T11:00:00.000Z", event: "progress", phase: "implementation" }
          ])
        }
      }),
    (err) => {
      assert.equal(err.exitCode, 2);
      assert.equal(err.code, "RULE_9_VIOLATION");
      assert.match(err.message, /rule #9 violated/);
      assert.match(err.message, /\/fake\/log\.jsonl/);
      return true;
    }
  );
});

test("assertReviewGate refuses when an implementation event is newer than review", async () => {
  await assert.rejects(
    () =>
      assertReviewGate({
        eventLog: "/fake",
        terminalStatus: "partial",
        deps: {
          readEventLog: fakeReader([
            { ts: "2026-04-30T10:00:00.000Z", event: "gate", phase: "review", summary: "approved" },
            { ts: "2026-04-30T11:00:00.000Z", event: "progress", phase: "implementation" }
          ])
        }
      }),
    (err) => {
      assert.equal(err.exitCode, 2);
      return true;
    }
  );
});

test("assertReviewGate bypasses for terminal status abandoned, needs_user, blocked", async () => {
  const failingReader = fakeReader([]);
  for (const status of ["abandoned", "needs_user", "blocked"]) {
    await assertReviewGate({
      eventLog: "/fake",
      terminalStatus: status,
      deps: { readEventLog: failingReader }
    });
  }
});

test("assertReviewGate refuses on missing event log (ENOENT-equivalent)", async () => {
  await assert.rejects(
    () =>
      assertReviewGate({
        eventLog: "/nonexistent/log.jsonl",
        terminalStatus: "done",
        deps: { readEventLog: async () => "" }
      }),
    /rule #9 violated/
  );
});

test("CLI write-final-synthesis exits 2 with rule #9 message when no review event", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "crew-gate-cli-"));
  const repoPath = path.join(root, "app");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);
  const statusFile = path.join(repoPath, ".claude", "state", "crew", "status.json");
  const eventLog = path.join(repoPath, ".claude", "state", "crew", "events.jsonl");

  await assert.rejects(
    execFile("node", [
      cliPath,
      "write-final-synthesis",
      "--repo",
      repoPath,
      "--title",
      "no-review",
      "--summary",
      "Should be refused",
      "--external-deltas",
      "none",
      "--mission-terminal-status",
      "done",
      "--mission-id",
      "M-GATE-1",
      "--status-file",
      statusFile,
      "--event-log",
      eventLog
    ]),
    (err) => {
      assert.equal(err.code, 2);
      assert.match(err.stderr, /rule #9 violated/);
      assert.match(err.stderr, /Spawn a reviewer subagent/);
      return true;
    }
  );
});

test("CLI write-final-synthesis exits 0 when review gate event was emitted", async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "crew-gate-cli-ok-"));
  const repoPath = path.join(root, "app");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);
  const statusFile = path.join(repoPath, ".claude", "state", "crew", "status.json");
  const eventLog = path.join(repoPath, ".claude", "state", "crew", "events.jsonl");

  await execFile("node", [
    cliPath,
    "append-mission-event",
    "--mission-id",
    "M-GATE-2",
    "--event-log",
    eventLog,
    "--event",
    "gate",
    "--phase",
    "review",
    "--summary",
    "approved"
  ]);

  const { stdout } = await execFile("node", [
    cliPath,
    "write-final-synthesis",
    "--repo",
    repoPath,
    "--title",
    "with-review",
    "--summary",
    "Allowed",
    "--external-deltas",
    "none",
    "--mission-terminal-status",
    "done",
    "--mission-id",
    "M-GATE-2",
    "--status-file",
    statusFile,
    "--event-log",
    eventLog
  ]);
  const parsed = JSON.parse(stdout);
  assert.equal(parsed.mission.status.status, "done");
});
