import fs from "node:fs/promises";
import path from "node:path";

const ARTIFACT_ROOT = [".claude", "artifacts", "crew"];

function nowIso() {
  return new Date().toISOString();
}

function timestampSlug() {
  return new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function slugify(value) {
  return (value || "artifact")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "artifact";
}

function toList(value) {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderField(label, value) {
  return `- ${label}: ${value || "-"}`;
}

function renderListField(label, value) {
  const items = toList(value);
  if (items.length === 0) {
    return `- ${label}: -`;
  }
  return [
    `- ${label}:`,
    ...items.map((item) => `  - ${item}`)
  ].join("\n");
}

function resolveArtifactConfig(kind) {
  if (kind === "run-brief") {
    return {
      directory: "runs",
      prefix: "run-brief",
      render(fields) {
        return [
          `# Run Brief: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("Goal", fields.goal),
          renderField("Mode", fields.mode),
          renderField("Pace", fields.pace),
          renderField("Owner", fields.owner),
          renderField("Status", fields.status || "active"),
          renderField("Summary", fields.summary),
          renderListField("Scope", fields.scope),
          renderListField("Out Of Scope", fields.outOfScope),
          renderListField("Planned Files", fields.files),
          renderField("Next Step", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  if (kind === "handoff") {
    return {
      directory: "handoffs",
      prefix: "handoff",
      render(fields) {
        return [
          `# Task Handoff: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("From", fields.from),
          renderField("To", fields.to),
          renderField("Objective", fields.goal || fields.summary),
          renderListField("Allowed Scope", fields.scope),
          renderListField("Forbidden Scope", fields.outOfScope),
          renderField("Deliverable", fields.deliverable),
          renderListField("Changed Files", fields.files),
          renderField("Confidence", fields.confidence),
          renderField("Risks", fields.risks),
          renderField("Suggested Next Handoff", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  if (kind === "review-result") {
    return {
      directory: "reviews",
      prefix: "review-result",
      render(fields) {
        return [
          `# Review Result: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("Reviewer", fields.reviewer || fields.owner),
          renderField("Decision", fields.decision || "approved_with_notes"),
          renderField("Summary", fields.summary),
          renderListField("Evidence Checked", fields.evidence),
          renderListField("Files Reviewed", fields.files),
          renderField("Test Adequacy", fields.testSummary),
          renderField("Risks", fields.risks),
          renderField("Required Follow-up", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  if (kind === "final-synthesis") {
    return {
      directory: "runs",
      prefix: "final-synthesis",
      render(fields) {
        return [
          `# Final Synthesis: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("Owner", fields.owner),
          renderField("Outcome", fields.status || "completed"),
          renderField("Summary", fields.summary),
          renderListField("Changed Files / Evidence", fields.files || fields.evidence),
          renderListField("Run / Test Steps", fields.runSteps),
          renderField("Risks", fields.risks),
          renderField("Next Step", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  if (kind === "validation-result") {
    return {
      directory: "validations",
      prefix: "validation-result",
      render(fields) {
        return [
          `# Validation Result: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("Validator", fields.validator || fields.owner),
          renderField("Environment", fields.environment),
          renderField("Scenario", fields.scenario),
          renderField("Decision", fields.decision || "passed"),
          renderField("Summary", fields.summary),
          renderListField("Executed Evidence", fields.executedEvidence),
          renderField("Inferred Confidence", fields.inferredConfidence),
          renderField("Risks Or Blockers", fields.risks),
          renderField("Recommended Next Step", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  if (kind === "deployment-result") {
    return {
      directory: "deployments",
      prefix: "deployment-result",
      render(fields) {
        return [
          `# Deployment Result: ${fields.title || "Untitled"}`,
          "",
          renderField("Created", nowIso()),
          renderField("Deployer", fields.deployer || fields.owner),
          renderField("Environment", fields.environment),
          renderField("Target", fields.target || fields.to),
          renderField("Outcome", fields.decision || "verified"),
          renderField("Summary", fields.summary),
          renderListField("Evidence Checked", fields.evidence),
          renderField("Risks Or Blockers", fields.risks),
          renderField("Recommended Next Step", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  throw new Error(`Unsupported artifact kind: ${kind}`);
}

function hasContent(value) {
  if (value == null) {
    return false;
  }
  const str = String(value).trim();
  if (!str) {
    return false;
  }
  if (str === "-") {
    return false;
  }
  return true;
}

function hasListContent(value) {
  return toList(value).length > 0;
}

export function validateArtifactFields(kind, fields = {}) {
  const errors = [];
  const warnings = [];

  if (fields.force) {
    return { errors, warnings };
  }

  if (kind === "handoff") {
    if (fields.size && String(fields.size).toLowerCase() === "light") {
      errors.push(
        "write-handoff refuses --size light: light-size handoffs do not persist artifacts. " +
          "Emit only the structured completion message instead. Pass --force to override."
      );
      return { errors, warnings };
    }
    if (!hasContent(fields.title)) {
      errors.push("write-handoff requires --title <text>.");
    }
    if (!hasContent(fields.summary) && !hasContent(fields.goal)) {
      errors.push(
        "write-handoff requires --summary <text> (what was done / what is being handed off). " +
          "A handoff without a summary is unusable for the next session."
      );
    }
    if (!hasListContent(fields.files)) {
      errors.push(
        "write-handoff requires --files <a,b,c> (changed or inspected files). " +
          "If genuinely no files changed, pass --files none or --force."
      );
    }
    if (!hasContent(fields.from)) {
      warnings.push("write-handoff: --from <role> is recommended (source of handoff).");
    }
    if (!hasContent(fields.to)) {
      warnings.push("write-handoff: --to <role> is recommended (receiver of handoff).");
    }
  }

  if (kind === "review-result") {
    if (!hasContent(fields.title)) {
      errors.push("write-review-result requires --title <text>.");
    }
    if (!hasContent(fields.decision)) {
      errors.push(
        "write-review-result requires --decision <approved|approved_with_notes|rejected> " +
          "(or --verdict as alias). A review without a decision is meaningless."
      );
    }
    if (!hasListContent(fields.evidence)) {
      errors.push(
        "write-review-result requires --evidence <a,b,c> (what was actually examined: files, commands, tests). " +
          "Pass --force to override if truly unavailable."
      );
    }
    if (!hasContent(fields.testSummary)) {
      warnings.push(
        "write-review-result: --test-summary <text> is recommended for code-bearing reviews. " +
          "Omit only for doc-only reviews."
      );
    }
  }

  return { errors, warnings };
}

export async function writeArtifact(repoPath, kind, fields = {}) {
  const validation = validateArtifactFields(kind, fields);
  if (validation.errors.length > 0) {
    const err = new Error(
      `Artifact validation failed for ${kind}:\n  - ${validation.errors.join("\n  - ")}`
    );
    err.validationErrors = validation.errors;
    err.validationWarnings = validation.warnings;
    throw err;
  }
  const config = resolveArtifactConfig(kind);
  const artifactDir = path.join(repoPath, ...ARTIFACT_ROOT, config.directory);
  await fs.mkdir(artifactDir, { recursive: true });

  const title = fields.title || fields.summary || kind;
  const fileName = `${timestampSlug()}-${config.prefix}-${slugify(title)}.md`;
  const artifactPath = path.join(artifactDir, fileName);
  const contents = `${config.render(fields)}\n`;

  await fs.writeFile(artifactPath, contents);

  return {
    kind,
    path: artifactPath,
    title: fields.title || "Untitled"
  };
}
