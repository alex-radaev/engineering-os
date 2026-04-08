import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { auditRepo, bootstrapRepo, initRepo, installGlobal } from "../scripts/lib/installer.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("bootstrap adds harness files to an existing repo and preserves CLAUDE.md", async () => {
  const repoPath = await makeTempDir("engineering-os-bootstrap-");
  await fs.writeFile(
    path.join(repoPath, "CLAUDE.md"),
    "# Existing Repo Rules\n\nKeep tests fast.\n"
  );

  const result = await bootstrapRepo(repoPath);
  const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");
  const settings = JSON.parse(
    await fs.readFile(path.join(repoPath, ".claude", "settings.json"), "utf8")
  );
  const claimsState = JSON.parse(
    await fs.readFile(
      path.join(repoPath, ".claude", "state", "engineering-os", "claims.json"),
      "utf8"
    )
  );

  assert.equal(result.mode, "bootstrap");
  assert.match(claudeMd, /# Existing Repo Rules/);
  assert.match(claudeMd, /engineering-os:start/);
  assert.ok(settings.hooks.SessionStart);
  assert.ok(settings.hooks.TaskCreated);
  assert.deepEqual(claimsState.claims, {});
});

test("bootstrap is idempotent for CLAUDE.md imports", async () => {
  const repoPath = await makeTempDir("engineering-os-idempotent-");
  await fs.writeFile(path.join(repoPath, "CLAUDE.md"), "# Repo\n");

  await bootstrapRepo(repoPath);
  await bootstrapRepo(repoPath);

  const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");
  const occurrences = claudeMd.match(/engineering-os:start/g) ?? [];
  assert.equal(occurrences.length, 1);
});

test("init creates a new repo harness and audit sees it", async () => {
  const rootPath = await makeTempDir("engineering-os-root-");
  const repoPath = path.join(rootPath, "demo-repo");

  const result = await initRepo(repoPath);
  const audit = await auditRepo(repoPath);

  assert.equal(result.mode, "init");
  assert.equal(audit.exists, true);
  assert.equal(audit.hasClaudeMd, true);
  assert.equal(audit.hasHarnessLayer, true);
  assert.equal(audit.hasStateLayer, true);
});

test("init rejects a non-empty existing directory without opt-in", async () => {
  const repoPath = await makeTempDir("engineering-os-existing-");
  await fs.writeFile(path.join(repoPath, "README.md"), "hello\n");

  await assert.rejects(() => initRepo(repoPath), /already exists and is not empty/);
});

test("installGlobal writes one managed global memory copy and is idempotent", async () => {
  const originalHome = process.env.HOME;
  const homePath = await makeTempDir("engineering-os-global-home-");
  process.env.HOME = homePath;

  try {
    const first = await installGlobal();
    assert.equal(first.mode, "install-global");
    assert.deepEqual(first.writes, [
      "~/.claude/engineering-os/constitution.md",
      "~/.claude/engineering-os/workflow.md",
      "~/.claude/engineering-os/metadata.json",
      "~/.claude/CLAUDE.md"
    ]);
    assert.equal(first.global.hasGlobalMemory, true);
    assert.equal(first.global.globalMemoryStale, false);

    const claudeMd = await fs.readFile(path.join(homePath, ".claude", "CLAUDE.md"), "utf8");
    assert.match(claudeMd, /@~\/\.claude\/engineering-os\/constitution\.md/);
    assert.match(claudeMd, /@~\/\.claude\/engineering-os\/workflow\.md/);

    const metadata = JSON.parse(
      await fs.readFile(path.join(homePath, ".claude", "engineering-os", "metadata.json"), "utf8")
    );
    assert.equal(metadata.managedBy, "engineering-os");

    const second = await installGlobal();
    assert.deepEqual(second.writes, []);
    assert.equal(second.global.hasGlobalMemory, true);
  } finally {
    if (originalHome === undefined) {
      delete process.env.HOME;
    } else {
      process.env.HOME = originalHome;
    }
  }
});
