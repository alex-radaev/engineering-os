import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFile = promisify(execFileCallback);
const repoRoot = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const cliPath = path.join(repoRoot, "scripts", "engineering-os.mjs");

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("CLI init creates a harnessed repo", async () => {
  const rootPath = await makeTempDir("engineering-os-cli-init-");
  const repoPath = path.join(rootPath, "app");
  const { stdout } = await execFile("node", [cliPath, "init", "--repo", repoPath]);
  const result = JSON.parse(stdout);

  assert.equal(result.mode, "init");
  assert.equal(result.audit.hasHarnessLayer, true);

  const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");
  assert.match(claudeMd, /engineering-os:start/);
});

test("CLI bootstrap preserves existing CLAUDE.md content", async () => {
  const repoPath = await makeTempDir("engineering-os-cli-bootstrap-");
  await fs.writeFile(path.join(repoPath, "CLAUDE.md"), "# Existing\n");

  const { stdout } = await execFile("node", [cliPath, "bootstrap", "--repo", repoPath]);
  const result = JSON.parse(stdout);
  const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");

  assert.equal(result.mode, "bootstrap");
  assert.match(claudeMd, /# Existing/);
  assert.match(claudeMd, /engineering-os:start/);
});

test("CLI claim and release manage repo-local claims", async () => {
  const repoPath = await makeTempDir("engineering-os-cli-claims-");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);

  const claimOutput = await execFile("node", [
    cliPath,
    "claim",
    "--repo",
    repoPath,
    "--owner",
    "builder",
    "src/example.ts"
  ]);
  const claimResult = JSON.parse(claimOutput.stdout);
  assert.deepEqual(claimResult.claimed, ["src/example.ts"]);

  const conflictsOutput = await execFile("node", [
    cliPath,
    "show-conflicts",
    "--repo",
    repoPath,
    "--owner",
    "lead-session",
    "src/example.ts"
  ]);
  const conflictsResult = JSON.parse(conflictsOutput.stdout);
  assert.equal(conflictsResult.conflicts.length, 1);
  assert.equal(conflictsResult.conflicts[0].owner, "builder");
  assert.equal(conflictsResult.owned.length, 0);
  assert.equal(conflictsResult.available.length, 0);

  const ownedOutput = await execFile("node", [
    cliPath,
    "show-conflicts",
    "--repo",
    repoPath,
    "--owner",
    "builder",
    "src/example.ts",
    "src/free.ts"
  ]);
  const ownedResult = JSON.parse(ownedOutput.stdout);
  assert.equal(ownedResult.owned.length, 1);
  assert.equal(ownedResult.owned[0].path, "src/example.ts");
  assert.equal(ownedResult.conflicts.length, 0);
  assert.deepEqual(ownedResult.available, [{ path: "src/free.ts" }]);

  const releaseOutput = await execFile("node", [
    cliPath,
    "release",
    "--repo",
    repoPath,
    "src/example.ts"
  ]);
  const releaseResult = JSON.parse(releaseOutput.stdout);
  assert.deepEqual(releaseResult.released, ["src/example.ts"]);
});

test("CLI approval requests can be listed and resolved", async () => {
  const repoPath = await makeTempDir("engineering-os-cli-approvals-");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);

  const requestOutput = await execFile("node", [
    cliPath,
    "request-approval",
    "--repo",
    repoPath,
    "--kind",
    "destructive_action",
    "--summary",
    "Delete legacy generated assets",
    "--requester",
    "builder"
  ]);
  const requestResult = JSON.parse(requestOutput.stdout);
  assert.equal(requestResult.status, "open");
  assert.equal(requestResult.approver, "user");

  const openOutput = await execFile("node", [
    cliPath,
    "show-approvals",
    "--repo",
    repoPath
  ]);
  const openResult = JSON.parse(openOutput.stdout);
  assert.equal(openResult.approvals.length, 1);
  assert.equal(openResult.approvals[0].id, requestResult.id);

  const resolveOutput = await execFile("node", [
    cliPath,
    "resolve-approval",
    "--repo",
    repoPath,
    "--id",
    requestResult.id,
    "--decision",
    "approved",
    "--resolver",
    "user"
  ]);
  const resolveResult = JSON.parse(resolveOutput.stdout);
  assert.equal(resolveResult.status, "approved");

  const resolvedOutput = await execFile("node", [
    cliPath,
    "show-approvals",
    "--repo",
    repoPath,
    "--status",
    "resolved"
  ]);
  const resolvedResult = JSON.parse(resolvedOutput.stdout);
  assert.equal(resolvedResult.approvals.length, 1);
  assert.equal(resolvedResult.approvals[0].status, "approved");
});

test("CLI artifact writers create markdown artifacts", async () => {
  const repoPath = await makeTempDir("engineering-os-cli-artifacts-");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);

  const runBriefOutput = await execFile("node", [
    cliPath,
    "write-run-brief",
    "--repo",
    repoPath,
    "--title",
    "Platform guidance feature",
    "--goal",
    "Add platform guidance to the create page",
    "--mode",
    "single-session",
    "--pace",
    "medium",
    "--files",
    "app/templates/create.html,static/js/create.js"
  ]);
  const runBriefResult = JSON.parse(runBriefOutput.stdout);
  const runBriefBody = await fs.readFile(runBriefResult.path, "utf8");
  assert.match(runBriefBody, /# Run Brief: Platform guidance feature/);
  assert.match(runBriefBody, /single-session/);

  const reviewOutput = await execFile("node", [
    cliPath,
    "write-review-result",
    "--repo",
    repoPath,
    "--title",
    "Platform guidance review",
    "--decision",
    "approved",
    "--reviewer",
    "reviewer",
    "--files",
    "app/templates/create.html"
  ]);
  const reviewResult = JSON.parse(reviewOutput.stdout);
  const reviewBody = await fs.readFile(reviewResult.path, "utf8");
  assert.match(reviewBody, /# Review Result: Platform guidance review/);
  assert.match(reviewBody, /approved/);

  const reviewAliasOutput = await execFile("node", [
    cliPath,
    "write-review-result",
    "--repo",
    repoPath,
    "--title",
    "Platform guidance alias review",
    "--verdict",
    "approved_with_notes"
  ]);
  const reviewAliasResult = JSON.parse(reviewAliasOutput.stdout);
  const reviewAliasBody = await fs.readFile(reviewAliasResult.path, "utf8");
  assert.match(reviewAliasBody, /approved_with_notes/);
});

test("CLI wake-up brief summarizes repo memory and state", async () => {
  const repoPath = await makeTempDir("engineering-os-cli-wakeup-");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);

  await execFile("node", [
    cliPath,
    "write-run-brief",
    "--repo",
    repoPath,
    "--title",
    "Wake-up test run",
    "--goal",
    "Verify repo recovery",
    "--mode",
    "assisted single-session",
    "--pace",
    "medium"
  ]);

  await execFile("node", [
    cliPath,
    "claim",
    "--repo",
    repoPath,
    "--owner",
    "builder",
    "src/example.ts"
  ]);

  await execFile("node", [
    cliPath,
    "request-approval",
    "--repo",
    repoPath,
    "--summary",
    "Expand scope for wake-up test"
  ]);

  const wakeUpOutput = await execFile("node", [
    cliPath,
    "wake-up",
    "--repo",
    repoPath
  ]);
  const wakeUpResult = JSON.parse(wakeUpOutput.stdout);

  assert.equal(wakeUpResult.summary.memoryPolicy, "bounded-v1");
  assert.equal(wakeUpResult.summary.activeClaims, 1);
  assert.equal(wakeUpResult.summary.openApprovals, 1);
  assert.equal(wakeUpResult.summary.hasRecentRunMemory, true);
  assert.match(wakeUpResult.latestArtifacts.runBrief.title, /Wake-up test run/);
  assert.match(wakeUpResult.memory.hot.latestArtifacts.runBrief.title, /Wake-up test run/);
  assert.equal(wakeUpResult.memory.hot.claims.length, 1);
  assert.equal(wakeUpResult.memory.hot.openApprovals.length, 1);
  assert.ok(wakeUpResult.memory.cold.archiveCounts.runs >= 1);
  assert.deepEqual(wakeUpResult.memory.cold.omittedByDefault, [
    "older_artifacts",
    "resolved_approvals",
    "full_event_log",
    "full_history_log"
  ]);
});

test("CLI subcommand help works without error", async () => {
  const helpOutput = await execFile("node", [
    cliPath,
    "write-review-result",
    "--help"
  ]);

  assert.match(helpOutput.stdout, /write-review-result/);
  assert.match(helpOutput.stdout, /--verdict/);
});

test("CLI install-global writes managed global memory into HOME", async () => {
  const homePath = await makeTempDir("engineering-os-cli-global-home-");
  const installOutput = await execFile("node", [cliPath, "install-global"], {
    env: { ...process.env, HOME: homePath }
  });
  const result = JSON.parse(installOutput.stdout);

  assert.equal(result.mode, "install-global");
  assert.equal(result.global.hasGlobalMemory, true);
  assert.equal(result.global.globalMemoryStale, false);
  assert.deepEqual(result.writes, [
    "~/.claude/engineering-os/constitution.md",
    "~/.claude/engineering-os/workflow.md",
    "~/.claude/engineering-os/metadata.json",
    "~/.claude/CLAUDE.md"
  ]);

  const repeatOutput = await execFile("node", [cliPath, "install-global"], {
    env: { ...process.env, HOME: homePath }
  });
  const repeatResult = JSON.parse(repeatOutput.stdout);
  assert.deepEqual(repeatResult.writes, []);
});
