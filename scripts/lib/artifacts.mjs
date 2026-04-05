import fs from "node:fs/promises";
import path from "node:path";

const ARTIFACT_ROOT = [".claude", "artifacts", "engineering-os"];

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
          renderField("Risks", fields.risks),
          renderField("Next Step", fields.next),
          ""
        ].join("\n");
      }
    };
  }

  throw new Error(`Unsupported artifact kind: ${kind}`);
}

export async function writeArtifact(repoPath, kind, fields = {}) {
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
