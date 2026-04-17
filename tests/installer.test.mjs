import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

import { auditRepo, bootstrapRepo, initRepo, installUserAssets } from "../scripts/lib/installer.mjs";

async function makeTempDir(prefix) {
  return fs.mkdtemp(path.join(os.tmpdir(), prefix));
}

test("bootstrap adds harness files to an existing repo and preserves CLAUDE.md", async () => {
  const repoPath = await makeTempDir("crew-bootstrap-");
  await fs.writeFile(
    path.join(repoPath, "CLAUDE.md"),
    "# Existing Repo Rules\n\nKeep tests fast.\n"
  );
  await fs.writeFile(path.join(repoPath, ".gitignore"), "node_modules/\n");

  const result = await bootstrapRepo(repoPath);
  const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");
  const settings = JSON.parse(
    await fs.readFile(path.join(repoPath, ".claude", "settings.json"), "utf8")
  );
  const gitignore = await fs.readFile(path.join(repoPath, ".gitignore"), "utf8");
  const claimsState = JSON.parse(
    await fs.readFile(
      path.join(repoPath, ".claude", "state", "crew", "claims.json"),
      "utf8"
    )
  );

  assert.equal(result.mode, "bootstrap");
  assert.match(claudeMd, /# Existing Repo Rules/);
  assert.match(claudeMd, /crew:start/);
  assert.match(claudeMd, /@~\/\.claude\/crew\/constitution\.md/);
  assert.doesNotMatch(claudeMd, /@\.claude\/crew\/workflow\.md/);
  assert.equal(
    await fs.access(path.join(repoPath, ".claude", "crew", "constitution.md")).then(() => true).catch(() => false),
    false
  );
  assert.equal(
    await fs.access(path.join(repoPath, ".claude", "crew", "workflow.md")).then(() => true).catch(() => false),
    false
  );
  assert.equal(
    await fs.access(path.join(repoPath, ".claude", "crew", "protocol.md")).then(() => true).catch(() => false),
    false
  );
  assert.ok(settings.hooks.SessionStart);
  assert.ok(settings.hooks.TaskCreated);
  assert.ok(Array.isArray(settings.permissions?.allow));
  assert.ok(settings.permissions.allow.includes("Write(.claude/artifacts/crew/**)"));
  assert.ok(settings.permissions.allow.includes("Edit(.claude/state/crew/**)"));
  assert.match(gitignore, /node_modules\//);
  assert.match(gitignore, /# crew:start/);
  assert.deepEqual(claimsState.claims, {});
});

test("bootstrap removes stale repo-local canonical harness copies", async () => {
  const repoPath = await makeTempDir("crew-stale-harness-");
  await fs.writeFile(path.join(repoPath, "CLAUDE.md"), "# Repo\n");
  await fs.mkdir(path.join(repoPath, ".claude", "crew"), { recursive: true });
  await fs.writeFile(path.join(repoPath, ".claude", "crew", "constitution.md"), "# Stale\n");
  await fs.writeFile(path.join(repoPath, ".claude", "crew", "workflow.md"), "# Stale\n");
  await fs.writeFile(path.join(repoPath, ".claude", "crew", "protocol.md"), "# Stale\n");
  await fs.writeFile(path.join(repoPath, ".claude", "crew", "lead.md"), "# Custom lead\n");

  await bootstrapRepo(repoPath);

  for (const name of ["constitution.md", "workflow.md", "protocol.md"]) {
    const exists = await fs
      .access(path.join(repoPath, ".claude", "crew", name))
      .then(() => true)
      .catch(() => false);
    assert.equal(exists, false, `${name} should be removed`);
  }
  const lead = await fs.readFile(path.join(repoPath, ".claude", "crew", "lead.md"), "utf8");
  assert.equal(lead, "# Custom lead\n", "repo-local role overlay must be preserved");
});

test("bootstrap is idempotent for CLAUDE.md imports", async () => {
  const repoPath = await makeTempDir("crew-idempotent-");
  await fs.writeFile(path.join(repoPath, "CLAUDE.md"), "# Repo\n");

  await bootstrapRepo(repoPath);
  await bootstrapRepo(repoPath);

  const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");
  const occurrences = claudeMd.match(/crew:start/g) ?? [];
  assert.equal(occurrences.length, 1);
});

test("init creates a new repo harness and audit sees it", async () => {
  const rootPath = await makeTempDir("crew-root-");
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
  const repoPath = await makeTempDir("crew-existing-");
  await fs.writeFile(path.join(repoPath, "README.md"), "hello\n");

  await assert.rejects(() => initRepo(repoPath), /already exists and is not empty/);
});

test("installUserAssets writes canonical files and preserves custom overlays", async () => {
  const homePath = await makeTempDir("crew-user-assets-");
  const customLeadPath = path.join(homePath, ".claude", "crew", "lead.md");
  await fs.mkdir(path.dirname(customLeadPath), { recursive: true });
  await fs.writeFile(customLeadPath, "# My Lead Overlay\n");

  const result = await installUserAssets({ homePath });

  const lead = await fs.readFile(customLeadPath, "utf8");
  const reviewer = await fs.readFile(path.join(homePath, ".claude", "crew", "reviewer.md"), "utf8");
  const constitution = await fs.readFile(path.join(homePath, ".claude", "crew", "constitution.md"), "utf8");
  const workflow = await fs.readFile(path.join(homePath, ".claude", "crew", "workflow.md"), "utf8");
  const protocol = await fs.readFile(path.join(homePath, ".claude", "crew", "protocol.md"), "utf8");
  const homeClaudeMd = await fs.readFile(path.join(homePath, ".claude", "CLAUDE.md"), "utf8");

  assert.equal(result.mode, "install-user-assets");
  assert.equal(lead, "# My Lead Overlay\n", "custom overlay is preserved");
  assert.match(reviewer, /Reviewer Overlay/);
  assert.match(constitution, /Crew Constitution/);
  assert.match(workflow, /Crew Workflow/);
  assert.match(protocol, /Crew Protocol/);
  assert.match(homeClaudeMd, /<!-- crew:start -->/);
  assert.match(homeClaudeMd, /@~\/\.claude\/crew\/constitution\.md/);
});

test("installUserAssets refreshes canonical files on re-run", async () => {
  const homePath = await makeTempDir("crew-user-assets-refresh-");
  const constitutionPath = path.join(homePath, ".claude", "crew", "constitution.md");

  await installUserAssets({ homePath });
  await fs.writeFile(constitutionPath, "# Stale Hand-Edit\n");

  await installUserAssets({ homePath });
  const refreshed = await fs.readFile(constitutionPath, "utf8");

  assert.match(refreshed, /Crew Constitution/);
  assert.doesNotMatch(refreshed, /Stale Hand-Edit/);
});

test("installUserAssets leaves existing home CLAUDE.md import block untouched", async () => {
  const homePath = await makeTempDir("crew-user-assets-idempotent-");
  const claudeMdPath = path.join(homePath, ".claude", "CLAUDE.md");
  await fs.mkdir(path.dirname(claudeMdPath), { recursive: true });
  await fs.writeFile(claudeMdPath, "# Custom\n\n<!-- crew:start -->\n@~/.claude/crew/constitution.md\n<!-- crew:end -->\n");

  await installUserAssets({ homePath });
  const contents = await fs.readFile(claudeMdPath, "utf8");
  const occurrences = contents.match(/crew:start/g) ?? [];
  assert.equal(occurrences.length, 1);
});
