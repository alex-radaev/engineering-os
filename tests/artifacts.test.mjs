import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import assert from "node:assert/strict";
import { execFile as execFileCallback } from "node:child_process";
import { promisify } from "node:util";

import { validateArtifactFields, writeArtifact } from "../scripts/lib/artifacts.mjs";

const execFile = promisify(execFileCallback);
const cliPath = fileURLToPath(new URL("../scripts/crew.mjs", import.meta.url));

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("validateArtifactFields: handoff rejects missing summary and files", () => {
  const { errors } = validateArtifactFields("handoff", { title: "Something" });
  assert.ok(errors.some((e) => /--summary/.test(e)), "expected summary error");
  assert.ok(errors.some((e) => /--files/.test(e)), "expected files error");
});

test("validateArtifactFields: handoff accepts complete inputs", () => {
  const { errors } = validateArtifactFields("handoff", {
    title: "Task",
    summary: "Did the thing.",
    files: "src/a.ts,src/b.ts"
  });
  assert.deepEqual(errors, []);
});

test("validateArtifactFields: handoff warns on missing from/to", () => {
  const { errors, warnings } = validateArtifactFields("handoff", {
    title: "Task",
    summary: "Did the thing.",
    files: "src/a.ts"
  });
  assert.deepEqual(errors, []);
  assert.ok(warnings.some((w) => /--from/.test(w)));
  assert.ok(warnings.some((w) => /--to/.test(w)));
});

test("validateArtifactFields: handoff rejects --size light", () => {
  const { errors } = validateArtifactFields("handoff", {
    title: "Task",
    summary: "Did the thing.",
    files: "src/a.ts",
    size: "light"
  });
  assert.ok(errors.some((e) => /light/.test(e)));
});

test("validateArtifactFields: handoff --force bypasses validation", () => {
  const { errors } = validateArtifactFields("handoff", {
    title: "Task",
    force: true
  });
  assert.deepEqual(errors, []);
});

test("validateArtifactFields: review rejects missing decision and evidence", () => {
  const { errors } = validateArtifactFields("review-result", { title: "R" });
  assert.ok(errors.some((e) => /--decision/.test(e)));
  assert.ok(errors.some((e) => /--evidence/.test(e)));
});

test("validateArtifactFields: review accepts complete inputs", () => {
  const { errors } = validateArtifactFields("review-result", {
    title: "R",
    decision: "approved",
    evidence: "files checked,tests run"
  });
  assert.deepEqual(errors, []);
});

test("validateArtifactFields: review warns when test-summary missing", () => {
  const { warnings } = validateArtifactFields("review-result", {
    title: "R",
    decision: "approved",
    evidence: "files checked"
  });
  assert.ok(warnings.some((w) => /--test-summary/.test(w)));
});

test("writeArtifact throws when handoff fields are sparse", async () => {
  const repoPath = await makeTempDir("crew-artifact-sparse-");
  await assert.rejects(
    () => writeArtifact(repoPath, "handoff", { title: "Bad" }),
    /Artifact validation failed for handoff/
  );
});

test("writeArtifact succeeds when handoff fields are complete", async () => {
  const repoPath = await makeTempDir("crew-artifact-complete-");
  const result = await writeArtifact(repoPath, "handoff", {
    title: "Good",
    summary: "All done.",
    files: "src/a.ts"
  });
  assert.match(result.path, /handoffs\//);
  const body = await fs.readFile(result.path, "utf8");
  assert.match(body, /# Task Handoff: Good/);
});

test("CLI write-handoff exits non-zero on sparse input", async () => {
  const repoPath = await makeTempDir("crew-cli-handoff-sparse-");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);

  await assert.rejects(
    () =>
      execFile("node", [
        cliPath,
        "write-handoff",
        "--repo",
        repoPath,
        "--title",
        "Sparse"
      ]),
    (err) => {
      assert.ok(err.code !== 0, "expected non-zero exit");
      assert.match(err.stderr, /Artifact validation failed for handoff/);
      assert.match(err.stderr, /--summary/);
      assert.match(err.stderr, /--files/);
      return true;
    }
  );
});

test("CLI write-handoff accepts complete input", async () => {
  const repoPath = await makeTempDir("crew-cli-handoff-ok-");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);

  const { stdout } = await execFile("node", [
    cliPath,
    "write-handoff",
    "--repo",
    repoPath,
    "--title",
    "Complete handoff",
    "--summary",
    "Finished the work cleanly.",
    "--files",
    "src/a.ts,src/b.ts",
    "--from",
    "builder",
    "--to",
    "reviewer"
  ]);
  const result = JSON.parse(stdout);
  const body = await fs.readFile(result.path, "utf8");
  assert.match(body, /# Task Handoff: Complete handoff/);
  assert.match(body, /From: builder/);
});

test("CLI write-handoff rejects --size light", async () => {
  const repoPath = await makeTempDir("crew-cli-handoff-light-");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);

  await assert.rejects(
    () =>
      execFile("node", [
        cliPath,
        "write-handoff",
        "--repo",
        repoPath,
        "--title",
        "Light task",
        "--summary",
        "trivial",
        "--files",
        "x",
        "--size",
        "light"
      ]),
    (err) => {
      assert.match(err.stderr, /light/);
      return true;
    }
  );
});

test("CLI write-handoff --force bypasses validation", async () => {
  const repoPath = await makeTempDir("crew-cli-handoff-force-");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);

  const { stdout } = await execFile("node", [
    cliPath,
    "write-handoff",
    "--repo",
    repoPath,
    "--title",
    "Forced handoff",
    "--force"
  ]);
  const result = JSON.parse(stdout);
  assert.match(result.path, /handoffs\//);
});

test("CLI write-review-result exits non-zero on sparse input", async () => {
  const repoPath = await makeTempDir("crew-cli-review-sparse-");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);

  await assert.rejects(
    () =>
      execFile("node", [
        cliPath,
        "write-review-result",
        "--repo",
        repoPath,
        "--title",
        "Sparse review"
      ]),
    (err) => {
      assert.ok(err.code !== 0);
      assert.match(err.stderr, /--decision/);
      assert.match(err.stderr, /--evidence/);
      return true;
    }
  );
});

test("CLI write-review-result accepts --verdict alias and evidence", async () => {
  const repoPath = await makeTempDir("crew-cli-review-ok-");
  await execFile("node", [cliPath, "init", "--repo", repoPath]);

  const { stdout, stderr } = await execFile("node", [
    cliPath,
    "write-review-result",
    "--repo",
    repoPath,
    "--title",
    "Complete review",
    "--verdict",
    "approved",
    "--evidence",
    "diff inspected,tests run",
    "--test-summary",
    "npm test green"
  ]);
  const result = JSON.parse(stdout);
  const body = await fs.readFile(result.path, "utf8");
  assert.match(body, /Decision: approved/);
  assert.match(body, /Evidence Checked/);
  // No warnings expected when test-summary is present
  assert.doesNotMatch(stderr, /--test-summary/);
});
