#!/usr/bin/env node

import path from "node:path";
import { readFile } from "node:fs/promises";
import {
  MISSION_PROPOSED_TASK_STATUS_VALUES,
  MISSION_TERMINAL_STATUS_VALUES,
  validateArtifactFields,
  writeArtifact,
  writeFinalSynthesisWithMission
} from "./lib/artifacts.mjs";
import { auditRepo, bootstrapRepo, initRepo, installUserAssets } from "./lib/installer.mjs";
import { listApprovals, requestApproval, resolveApproval } from "./lib/approvals.mjs";
import { claimFiles, inspectClaims, listClaims, releaseFiles } from "./lib/claims.mjs";
import { buildWakeUpBrief } from "./lib/wakeup.mjs";
import { parseMissionEnvelope } from "./lib/mission-envelope.mjs";
import {
  appendMissionEvent,
  writeMissionStatus
} from "./lib/mission-writer.mjs";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {
    repo: process.cwd(),
    allowExisting: false,
    help: false,
    owner: null,
    requester: null,
    approver: null,
    resolver: null,
    kind: null,
    severity: null,
    summary: null,
    reason: null,
    note: null,
    status: "open",
    id: null,
    decision: null,
    title: null,
    goal: null,
    mode: null,
    pace: null,
    scope: null,
    outOfScope: null,
    files: null,
    evidence: null,
    risks: null,
    next: null,
    from: null,
    to: null,
    deliverable: null,
    confidence: null,
    reviewer: null,
    validator: null,
    deployer: null,
    environment: null,
    scenario: null,
    target: null,
    testSummary: null,
    executedEvidence: null,
    inferredConfidence: null,
    runSteps: null,
    home: null,
    size: null,
    force: false,
    missionId: null,
    phase: null,
    event: null,
    statusFile: null,
    eventLog: null,
    proposedTaskStatus: null,
    needsUser: null,
    userDecisionNeeded: null,
    nextAction: null,
    updatedAt: null,
    taskId: null,
    missionRepo: null,
    envelopeJson: null,
    promptFile: null,
    prompt: null,
    artifactHandoff: null,
    artifactReview: null,
    artifactValidation: null,
    artifactPr: null,
    missionTerminalStatus: null,
    handoffOut: null
  };
  const positionals = [];

  for (let index = 0; index < rest.length; index += 1) {
    const value = rest[index];
    if (value === "--help" || value === "-h") {
      flags.help = true;
      continue;
    }
    if (value === "--repo") {
      flags.repo = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--allow-existing") {
      flags.allowExisting = true;
      continue;
    }
    if (value === "--owner") {
      flags.owner = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--requester") {
      flags.requester = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--approver") {
      flags.approver = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--resolver") {
      flags.resolver = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--kind") {
      flags.kind = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--severity") {
      flags.severity = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--summary") {
      flags.summary = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--reason") {
      flags.reason = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--note") {
      flags.note = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--status") {
      flags.status = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--id") {
      flags.id = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--decision") {
      flags.decision = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--verdict") {
      flags.decision = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--title") {
      flags.title = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--goal") {
      flags.goal = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--mode") {
      flags.mode = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--pace") {
      flags.pace = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--scope") {
      flags.scope = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--out-of-scope") {
      flags.outOfScope = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--files") {
      flags.files = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--evidence") {
      flags.evidence = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--risks") {
      flags.risks = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--next") {
      flags.next = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--from") {
      flags.from = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--to") {
      flags.to = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--deliverable") {
      flags.deliverable = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--confidence") {
      flags.confidence = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--reviewer") {
      flags.reviewer = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--validator") {
      flags.validator = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--deployer") {
      flags.deployer = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--environment") {
      flags.environment = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--scenario") {
      flags.scenario = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--target") {
      flags.target = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--test-summary") {
      flags.testSummary = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--executed-evidence") {
      flags.executedEvidence = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--inferred-confidence") {
      flags.inferredConfidence = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--run-steps") {
      flags.runSteps = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--external-deltas") {
      flags.externalDeltas = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--home") {
      flags.home = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--outcome") {
      flags.decision = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--size") {
      flags.size = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--force") {
      flags.force = true;
      continue;
    }
    if (value === "--mission-id") {
      flags.missionId = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--phase") {
      flags.phase = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--event") {
      flags.event = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--status-file") {
      flags.statusFile = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--event-log") {
      flags.eventLog = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--proposed-task-status") {
      flags.proposedTaskStatus = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--needs-user") {
      flags.needsUser = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--user-decision-needed") {
      flags.userDecisionNeeded = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--next-action") {
      flags.nextAction = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--updated-at") {
      flags.updatedAt = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--task-id") {
      flags.taskId = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--mission-repo") {
      flags.missionRepo = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--envelope-json") {
      flags.envelopeJson = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--prompt-file") {
      flags.promptFile = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--prompt") {
      flags.prompt = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--artifact-handoff") {
      flags.artifactHandoff = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--artifact-review") {
      flags.artifactReview = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--artifact-validation") {
      flags.artifactValidation = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--artifact-pr") {
      flags.artifactPr = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--mission-terminal-status") {
      flags.missionTerminalStatus = rest[index + 1];
      index += 1;
      continue;
    }
    if (value === "--handoff-out") {
      flags.handoffOut = rest[index + 1];
      index += 1;
      continue;
    }
    if (value.startsWith("--")) {
      throw new Error(`Unknown argument: ${value}`);
    }
    positionals.push(value);
  }

  if (!command || command === "--help" || command === "-h") {
    return { command: "help", helpTarget: null, flags, positionals };
  }

  if (flags.help) {
    return { command: "help", helpTarget: command, flags, positionals };
  }

  return { command, helpTarget: null, flags, positionals };
}

function usage(target = null) {
  const subcommands = {
    audit: "  node scripts/crew.mjs audit --repo <path>",
    bootstrap: "  node scripts/crew.mjs bootstrap --repo <path>",
    init: "  node scripts/crew.mjs init --repo <path> [--allow-existing]",
    "install-user-assets": "  node scripts/crew.mjs install-user-assets [--home <path>]",
    claim: "  node scripts/crew.mjs claim --repo <path> [--owner <name>] <files...>",
    release: "  node scripts/crew.mjs release --repo <path> [--owner <name>] [files...]",
    "show-claims": "  node scripts/crew.mjs show-claims --repo <path>",
    "show-conflicts": "  node scripts/crew.mjs show-conflicts --repo <path> [--owner <name>] [files...]",
    "request-approval": "  node scripts/crew.mjs request-approval --repo <path> --summary <text> [--kind <kind>] [--severity <level>] [--requester <name>] [--approver <name>] [--reason <text>]",
    "show-approvals": "  node scripts/crew.mjs show-approvals --repo <path> [--status open|resolved|all] [--approver <name>]",
    "resolve-approval": "  node scripts/crew.mjs resolve-approval --repo <path> --id <approval-id> --decision approved|rejected|canceled [--resolver <name>] [--note <text>]",
    "wake-up": "  node scripts/crew.mjs wake-up --repo <path> [--home <path>]",
    "write-run-brief": "  node scripts/crew.mjs write-run-brief --repo <path> --title <text> [--goal <text>] [--mode <mode>] [--pace <pace>]",
    "write-handoff": "  node scripts/crew.mjs write-handoff --repo <path> --title <text> --summary <text> --files <a,b> [--from <role>] [--to <role>] [--force]",
    "write-review-result": "  node scripts/crew.mjs write-review-result --repo <path> --title <text> --decision <decision> --evidence <a,b> [--reviewer <role>] [--verdict <decision>] [--test-summary <text>] [--force]",
    "write-validation-result": "  node scripts/crew.mjs write-validation-result --repo <path> --title <text> [--validator <role>] [--environment <env>] [--scenario <text>] [--decision <passed|failed|blocked>] [--executed-evidence <a,b>] [--inferred-confidence <text>]",
    "write-deployment-result": "  node scripts/crew.mjs write-deployment-result --repo <path> --title <text> [--deployer <role>] [--environment <env>] [--target <revision>] [--outcome <deployed|verified|blocked|rolled_back>]",
    "write-final-synthesis": "  node scripts/crew.mjs write-final-synthesis --repo <path> --title <text> --external-deltas <text> [--summary <text>] [--files <a,b>] [--run-steps <a,b>] [--mission-terminal-status done|partial|needs_user|blocked|abandoned --mission-id <id> --status-file <abs path> --event-log <abs path>] [--proposed-task-status candidate|ready|active|blocked|needs_review|done|parked|cancelled] [--next-action <text>] [--handoff-out <abs path>] [--task-id <id>] [--mission-repo <name>] [--phase <p>]",
    "record-mission": "  node scripts/crew.mjs record-mission --repo <path> (--envelope-json <json> | --prompt-file <path> | --prompt <text>)  [DEPRECATED: no longer writes a pointer file; prints inferred reporting paths to stdout. Pass them explicitly to mission writers.]",
    "write-mission-status": "  node scripts/crew.mjs write-mission-status --repo <path> --mission-id <id> --status-file <abs path> --status <s> --summary <text> [--phase <p>] [--proposed-task-status <s>] [--needs-user true|false] [--user-decision-needed <text>] [--next-action <text>] [--task-id <id>] [--mission-repo <name>] [--artifact-handoff <path>] [--artifact-review <path>] [--artifact-validation <path>] [--artifact-pr <url>] [--updated-at <iso>]",
    "append-mission-event": "  node scripts/crew.mjs append-mission-event --repo <path> --mission-id <id> --event-log <abs path> --event <kind> --summary <text> [--phase <p>]"
  };

  if (target && subcommands[target]) {
    return [
      "Crew installer",
      "",
      "Usage:",
      subcommands[target]
    ].join("\n");
  }

  return [
    "Crew installer",
    "",
    "Usage:",
    ...Object.values(subcommands)
  ].join("\n");
}

async function main() {
  const { command, helpTarget, flags, positionals } = parseArgs(process.argv.slice(2));
  const repoPath = path.resolve(flags.repo);

  if (command === "help") {
    console.log(usage(helpTarget));
    return;
  }

  let result;
  if (command === "audit") {
    result = await auditRepo(repoPath);
  } else if (command === "bootstrap") {
    result = await bootstrapRepo(repoPath);
  } else if (command === "init") {
    result = await initRepo(repoPath, { allowExisting: flags.allowExisting });
  } else if (command === "install-user-assets") {
    result = await installUserAssets({ homePath: flags.home });
  } else if (command === "claim") {
    result = await claimFiles(repoPath, positionals, { owner: flags.owner || "lead-session" });
  } else if (command === "release") {
    result = await releaseFiles(repoPath, positionals, { owner: flags.owner });
  } else if (command === "show-claims") {
    result = { claims: await listClaims(repoPath) };
  } else if (command === "show-conflicts") {
    result = await inspectClaims(repoPath, positionals, { owner: flags.owner || "lead-session" });
  } else if (command === "request-approval") {
    result = await requestApproval(repoPath, {
      requester: flags.requester || "lead-session",
      approver: flags.approver,
      kind: flags.kind || "scope_change",
      severity: flags.severity || "medium",
      summary: flags.summary || positionals.join(" ") || "Approval requested",
      reason: flags.reason || ""
    });
  } else if (command === "show-approvals") {
    result = { approvals: await listApprovals(repoPath, { status: flags.status, approver: flags.approver }) };
  } else if (command === "resolve-approval") {
    result = await resolveApproval(repoPath, {
      id: flags.id,
      decision: flags.decision,
      resolver: flags.resolver || "lead-session",
      note: flags.note || ""
    });
  } else if (command === "wake-up") {
    result = await buildWakeUpBrief(repoPath, { homePath: flags.home });
  } else if (command === "write-run-brief") {
    result = await writeArtifact(repoPath, "run-brief", {
      title: flags.title || positionals.join(" ") || "Run Brief",
      goal: flags.goal,
      mode: flags.mode,
      pace: flags.pace,
      owner: flags.owner || "lead-session",
      status: flags.status === "open" ? "active" : flags.status,
      summary: flags.summary,
      scope: flags.scope,
      outOfScope: flags.outOfScope,
      files: flags.files,
      next: flags.next
    });
  } else if (command === "write-handoff") {
    const handoffFields = {
      title: flags.title || positionals.join(" ") || "Task Handoff",
      from: flags.from,
      to: flags.to,
      goal: flags.goal,
      summary: flags.summary,
      scope: flags.scope,
      outOfScope: flags.outOfScope,
      deliverable: flags.deliverable,
      files: flags.files,
      confidence: flags.confidence,
      risks: flags.risks,
      next: flags.next,
      size: flags.size,
      force: flags.force
    };
    const { warnings } = validateArtifactFields("handoff", handoffFields);
    for (const w of warnings) {
      console.error(`warning: ${w}`);
    }
    handoffFields.from = handoffFields.from || flags.owner || "lead-session";
    result = await writeArtifact(repoPath, "handoff", handoffFields);
  } else if (command === "write-review-result") {
    const reviewFields = {
      title: flags.title || positionals.join(" ") || "Review Result",
      reviewer: flags.reviewer || flags.owner || "reviewer",
      decision: flags.decision,
      summary: flags.summary,
      evidence: flags.evidence,
      files: flags.files,
      testSummary: flags.testSummary,
      risks: flags.risks,
      next: flags.next,
      force: flags.force
    };
    const { warnings } = validateArtifactFields("review-result", reviewFields);
    for (const w of warnings) {
      console.error(`warning: ${w}`);
    }
    result = await writeArtifact(repoPath, "review-result", reviewFields);
  } else if (command === "write-validation-result") {
    result = await writeArtifact(repoPath, "validation-result", {
      title: flags.title || positionals.join(" ") || "Validation Result",
      validator: flags.validator || flags.owner || "validator",
      environment: flags.environment,
      scenario: flags.scenario,
      decision: flags.decision,
      summary: flags.summary,
      executedEvidence: flags.executedEvidence || flags.evidence,
      inferredConfidence: flags.inferredConfidence,
      risks: flags.risks,
      next: flags.next
    });
  } else if (command === "write-deployment-result") {
    result = await writeArtifact(repoPath, "deployment-result", {
      title: flags.title || positionals.join(" ") || "Deployment Result",
      deployer: flags.deployer || flags.owner || "deployer",
      environment: flags.environment,
      target: flags.target,
      to: flags.to,
      decision: flags.decision,
      summary: flags.summary,
      evidence: flags.evidence,
      risks: flags.risks,
      next: flags.next
    });
  } else if (command === "write-final-synthesis") {
    if (
      flags.missionTerminalStatus != null &&
      !MISSION_TERMINAL_STATUS_VALUES.has(flags.missionTerminalStatus)
    ) {
      throw new Error(
        `write-final-synthesis: invalid --mission-terminal-status "${flags.missionTerminalStatus}". ` +
          `Valid values: ${[...MISSION_TERMINAL_STATUS_VALUES].join(", ")}.`
      );
    }
    if (
      flags.proposedTaskStatus != null &&
      !MISSION_PROPOSED_TASK_STATUS_VALUES.has(flags.proposedTaskStatus)
    ) {
      throw new Error(
        `write-final-synthesis: invalid --proposed-task-status "${flags.proposedTaskStatus}". ` +
          `Valid values: ${[...MISSION_PROPOSED_TASK_STATUS_VALUES].join(", ")}.`
      );
    }
    const synthesisFields = {
      title: flags.title || positionals.join(" ") || "Final Synthesis",
      owner: flags.owner || "lead-session",
      status: flags.status === "open" ? "completed" : flags.status,
      summary: flags.summary,
      files: flags.files,
      evidence: flags.evidence,
      runSteps: flags.runSteps,
      externalDeltas: flags.externalDeltas,
      risks: flags.risks,
      next: flags.next,
      force: flags.force
    };
    result = await writeFinalSynthesisWithMission(repoPath, synthesisFields, {
      terminalStatus: flags.missionTerminalStatus,
      proposedTaskStatus: flags.proposedTaskStatus,
      nextAction: flags.nextAction,
      handoffOut: flags.handoffOut,
      phase: flags.phase,
      missionId: flags.missionId,
      statusFile: flags.statusFile,
      eventLog: flags.eventLog,
      taskId: flags.taskId,
      repo: flags.missionRepo
    });
  } else if (command === "record-mission") {
    let envelope = null;
    if (flags.envelopeJson) {
      envelope = JSON.parse(flags.envelopeJson);
    } else if (flags.promptFile) {
      const contents = await readFile(flags.promptFile, "utf8");
      envelope = parseMissionEnvelope(contents).envelope;
    } else if (flags.prompt) {
      envelope = parseMissionEnvelope(flags.prompt).envelope;
    }
    if (!envelope || !envelope.mission_id) {
      throw new Error("record-mission: no ORCHESTRATOR_MISSION envelope found in input");
    }
    const reporting = (envelope.reporting && typeof envelope.reporting === "object") ? envelope.reporting : {};
    console.error(
      "warning: record-mission is deprecated and no longer writes " +
        ".claude/state/crew/current-mission.json. Mission writers " +
        "(write-mission-status, append-mission-event, write-final-synthesis " +
        "--mission-terminal-status) require explicit --mission-id / " +
        "--status-file / --event-log captured from the envelope at parse-time. " +
        "This command remains as a parser convenience that prints the inferred " +
        "reporting paths to stdout for callers to capture."
    );
    result = {
      kind: "record-mission",
      deprecated: true,
      mission_id: envelope.mission_id,
      task_id: envelope.task_id ?? "",
      repo: envelope.repo ?? "",
      status_file: reporting.status_file ?? null,
      event_log: reporting.event_log ?? null,
      handoff_file: reporting.handoff_file ?? null
    };
  } else if (command === "write-mission-status") {
    if (!flags.missionId) throw new Error("write-mission-status: --mission-id is required. Pass the envelope's mission_id explicitly (no pointer-file fallback).");
    if (!flags.statusFile) throw new Error("write-mission-status: --status-file is required. Pass the envelope's reporting.status_file explicitly (no pointer-file fallback).");
    if (!flags.status) throw new Error("write-mission-status: --status is required");
    if (!flags.summary) throw new Error("write-mission-status: --summary is required");
    const statusFilePath = flags.statusFile;
    const needsUser = flags.needsUser == null ? false : String(flags.needsUser).toLowerCase() === "true";
    const artifacts = {};
    if (flags.artifactHandoff != null) artifacts.handoff = flags.artifactHandoff;
    if (flags.artifactReview != null) artifacts.review = flags.artifactReview;
    if (flags.artifactValidation != null) artifacts.validation = flags.artifactValidation;
    if (flags.artifactPr != null) artifacts.pr = flags.artifactPr;
    const written = await writeMissionStatus({
      missionId: flags.missionId,
      statusFilePath,
      taskId: flags.taskId ?? undefined,
      repo: flags.missionRepo ?? undefined,
      status: flags.status,
      phase: flags.phase ?? undefined,
      summary: flags.summary,
      proposedTaskStatus: flags.proposedTaskStatus ?? undefined,
      needsUser,
      userDecisionNeeded: flags.userDecisionNeeded ?? undefined,
      nextAction: flags.nextAction ?? undefined,
      artifacts: Object.keys(artifacts).length > 0 ? artifacts : undefined,
      updatedAt: flags.updatedAt ?? undefined
    });
    result = { kind: "mission-status", path: statusFilePath, status: written };
  } else if (command === "append-mission-event") {
    if (!flags.missionId) throw new Error("append-mission-event: --mission-id is required. Pass the envelope's mission_id explicitly (no pointer-file fallback).");
    if (!flags.eventLog) throw new Error("append-mission-event: --event-log is required. Pass the envelope's reporting.event_log explicitly (no pointer-file fallback).");
    if (!flags.event) throw new Error("append-mission-event: --event is required");
    if (!flags.summary) throw new Error("append-mission-event: --summary is required");
    const eventLogPath = flags.eventLog;
    const line = await appendMissionEvent({
      missionId: flags.missionId,
      eventLogPath,
      event: flags.event,
      phase: flags.phase ?? undefined,
      summary: flags.summary
    });
    result = { kind: "mission-event", path: eventLogPath, line };
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = (error && typeof error.exitCode === "number") ? error.exitCode : 1;
});
