#!/usr/bin/env node

import path from "node:path";
import { writeArtifact } from "./lib/artifacts.mjs";
import { auditRepo, bootstrapRepo, initRepo, installGlobal } from "./lib/installer.mjs";
import { listApprovals, requestApproval, resolveApproval } from "./lib/approvals.mjs";
import { claimFiles, inspectClaims, listClaims, releaseFiles } from "./lib/claims.mjs";
import { buildWakeUpBrief } from "./lib/wakeup.mjs";

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
    environment: null
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
    if (value === "--environment") {
      flags.environment = rest[index + 1];
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
    "install-global": "  node scripts/engineering-os.mjs install-global",
    audit: "  node scripts/engineering-os.mjs audit --repo <path>",
    bootstrap: "  node scripts/engineering-os.mjs bootstrap --repo <path>",
    init: "  node scripts/engineering-os.mjs init --repo <path> [--allow-existing]",
    claim: "  node scripts/engineering-os.mjs claim --repo <path> [--owner <name>] <files...>",
    release: "  node scripts/engineering-os.mjs release --repo <path> [--owner <name>] [files...]",
    "show-claims": "  node scripts/engineering-os.mjs show-claims --repo <path>",
    "show-conflicts": "  node scripts/engineering-os.mjs show-conflicts --repo <path> [--owner <name>] [files...]",
    "request-approval": "  node scripts/engineering-os.mjs request-approval --repo <path> --summary <text> [--kind <kind>] [--severity <level>] [--requester <name>] [--approver <name>] [--reason <text>]",
    "show-approvals": "  node scripts/engineering-os.mjs show-approvals --repo <path> [--status open|resolved|all] [--approver <name>]",
    "resolve-approval": "  node scripts/engineering-os.mjs resolve-approval --repo <path> --id <approval-id> --decision approved|rejected|canceled [--resolver <name>] [--note <text>]",
    "wake-up": "  node scripts/engineering-os.mjs wake-up --repo <path>",
    "write-run-brief": "  node scripts/engineering-os.mjs write-run-brief --repo <path> --title <text> [--goal <text>] [--mode <mode>] [--pace <pace>]",
    "write-handoff": "  node scripts/engineering-os.mjs write-handoff --repo <path> --title <text> [--from <role>] [--to <role>] [--files <a,b>]",
    "write-review-result": "  node scripts/engineering-os.mjs write-review-result --repo <path> --title <text> [--reviewer <role>] [--decision <decision>] [--verdict <decision>]",
    "write-validation-plan": "  node scripts/engineering-os.mjs write-validation-plan --repo <path> --title <text> [--validator <role>] [--environment <name>]",
    "write-validation-result": "  node scripts/engineering-os.mjs write-validation-result --repo <path> --title <text> [--validator <role>] [--environment <name>] [--decision <decision>]",
    "write-final-synthesis": "  node scripts/engineering-os.mjs write-final-synthesis --repo <path> --title <text> [--summary <text>] [--files <a,b>]"
  };

  if (target && subcommands[target]) {
    return [
      "Engineering OS installer",
      "",
      "Usage:",
      subcommands[target]
    ].join("\n");
  }

  return [
    "Engineering OS installer",
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
  if (command === "install-global") {
    result = await installGlobal();
  } else if (command === "audit") {
    result = await auditRepo(repoPath);
  } else if (command === "bootstrap") {
    result = await bootstrapRepo(repoPath);
  } else if (command === "init") {
    result = await initRepo(repoPath, { allowExisting: flags.allowExisting });
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
    result = await buildWakeUpBrief(repoPath);
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
    result = await writeArtifact(repoPath, "handoff", {
      title: flags.title || positionals.join(" ") || "Task Handoff",
      from: flags.from || flags.owner || "lead-session",
      to: flags.to,
      goal: flags.goal,
      summary: flags.summary,
      scope: flags.scope,
      outOfScope: flags.outOfScope,
      deliverable: flags.deliverable,
      files: flags.files,
      confidence: flags.confidence,
      risks: flags.risks,
      next: flags.next
    });
  } else if (command === "write-review-result") {
    result = await writeArtifact(repoPath, "review-result", {
      title: flags.title || positionals.join(" ") || "Review Result",
      reviewer: flags.reviewer || flags.owner || "reviewer",
      decision: flags.decision,
      summary: flags.summary,
      evidence: flags.evidence,
      files: flags.files,
      risks: flags.risks,
      next: flags.next
    });
  } else if (command === "write-validation-plan") {
    result = await writeArtifact(repoPath, "validation-plan", {
      title: flags.title || positionals.join(" ") || "Validation Plan",
      validator: flags.validator || flags.owner || "validator",
      owner: flags.owner || "lead-session",
      environment: flags.environment,
      goal: flags.goal,
      summary: flags.summary,
      scope: flags.scope,
      outOfScope: flags.outOfScope,
      evidence: flags.evidence,
      next: flags.next
    });
  } else if (command === "write-validation-result") {
    result = await writeArtifact(repoPath, "validation-result", {
      title: flags.title || positionals.join(" ") || "Validation Result",
      validator: flags.validator || flags.owner || "validator",
      environment: flags.environment,
      decision: flags.decision,
      goal: flags.goal,
      summary: flags.summary,
      evidence: flags.evidence,
      files: flags.files,
      risks: flags.risks,
      next: flags.next
    });
  } else if (command === "write-final-synthesis") {
    result = await writeArtifact(repoPath, "final-synthesis", {
      title: flags.title || positionals.join(" ") || "Final Synthesis",
      owner: flags.owner || "lead-session",
      status: flags.status === "open" ? "completed" : flags.status,
      summary: flags.summary,
      files: flags.files,
      evidence: flags.evidence,
      risks: flags.risks,
      next: flags.next
    });
  } else {
    throw new Error(`Unknown command: ${command}`);
  }

  console.log(JSON.stringify(result, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
