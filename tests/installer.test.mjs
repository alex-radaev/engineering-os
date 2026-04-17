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
  const workflowMd = await fs.readFile(
    path.join(repoPath, ".claude", "crew", "workflow.md"),
    "utf8"
  );
  const protocolMd = await fs.readFile(
    path.join(repoPath, ".claude", "crew", "protocol.md"),
    "utf8"
  );
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
  assert.match(claudeMd, /@\.claude\/crew\/constitution\.md/);
  assert.doesNotMatch(claudeMd, /@\.claude\/crew\/workflow\.md/);
  assert.match(workflowMd, /Builder owns code-bearing tasks, including automated tests for changed behavior/);
  assert.match(protocolMd, /Validation Result/);
  assert.match(protocolMd, /Deployment Result/);
  assert.match(protocolMd, /whether tests were added or updated/);
  assert.ok(settings.hooks.SessionStart);
  assert.ok(settings.hooks.TaskCreated);
  assert.match(gitignore, /node_modules\//);
  assert.match(gitignore, /# crew:start/);
  assert.deepEqual(claimsState.claims, {});
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

test("bootstrap upgrades legacy harness paths and CLAUDE import block", async () => {
  const repoPath = await makeTempDir("crew-legacy-upgrade-");
  await fs.mkdir(path.join(repoPath, ".claude", "engineering-os"), { recursive: true });
  await fs.mkdir(path.join(repoPath, ".claude", "artifacts", "engineering-os", "runs"), {
    recursive: true
  });
  await fs.mkdir(path.join(repoPath, ".claude", "state", "engineering-os"), {
    recursive: true
  });
  await fs.writeFile(
    path.join(repoPath, "CLAUDE.md"),
    [
      "# Repo",
      "",
      "<!-- engineering-os:start -->",
      "@.claude/engineering-os/constitution.md",
      "<!-- engineering-os:end -->",
      ""
    ].join("\n")
  );
  await fs.writeFile(
    path.join(repoPath, ".claude", "engineering-os", "constitution.md"),
    "# Legacy Constitution\n"
  );
  await fs.writeFile(
    path.join(repoPath, ".claude", "state", "engineering-os", "claims.json"),
    "{\n  \"claims\": {\n    \"src/legacy.ts\": {\n      \"owner\": \"builder\"\n    }\n  }\n}\n"
  );

  await bootstrapRepo(repoPath);

  const claudeMd = await fs.readFile(path.join(repoPath, "CLAUDE.md"), "utf8");
  const claimsState = await fs.readFile(
    path.join(repoPath, ".claude", "state", "crew", "claims.json"),
    "utf8"
  );
  assert.match(claudeMd, /<!-- crew:start -->/);
  assert.doesNotMatch(claudeMd, /engineering-os:start/);
  assert.equal(await fs.access(path.join(repoPath, ".claude", "crew", "constitution.md")).then(() => true).catch(() => false), true);
  assert.equal(await fs.access(path.join(repoPath, ".claude", "state", "crew", "claims.json")).then(() => true).catch(() => false), true);
  assert.match(claimsState, /src\/legacy\.ts/);
  assert.equal(
    await fs
      .access(path.join(repoPath, ".claude", "engineering-os"))
      .then(() => true)
      .catch(() => false),
    false
  );
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

test("installUserAssets creates overlay files without overwriting existing custom files", async () => {
  const homePath = await makeTempDir("crew-user-assets-");
  const customLeadPath = path.join(homePath, ".claude", "crew", "lead.md");
  await fs.mkdir(path.dirname(customLeadPath), { recursive: true });
  await fs.writeFile(customLeadPath, "# My Lead Overlay\n");

  const result = await installUserAssets({ homePath });
  const lead = await fs.readFile(customLeadPath, "utf8");
  const reviewer = await fs.readFile(path.join(homePath, ".claude", "crew", "reviewer.md"), "utf8");

  assert.equal(result.mode, "install-user-assets");
  assert.equal(result.legacyPathDetected, false);
  assert.equal(lead, "# My Lead Overlay\n");
  assert.match(reviewer, /Reviewer Overlay/);
});
