import fs from "node:fs/promises";
import path from "node:path";

const STATE_DIR = [".claude", "state", "engineering-os"];
const WORKFLOW_STATE_PATH = [...STATE_DIR, "workflow-state.json"];
const MAX_RECENT_RUNS = 5;

function nowIso() {
  return new Date().toISOString();
}

function defaultWorkflowState() {
  return {
    version: "1.0",
    updatedAt: nowIso(),
    currentRun: null,
    recentRuns: []
  };
}

async function ensureDir(dirPath) {
  await fs.mkdir(dirPath, { recursive: true });
}

async function ensureFile(filePath, contents) {
  try {
    await fs.access(filePath);
  } catch {
    await ensureDir(path.dirname(filePath));
    await fs.writeFile(filePath, contents);
  }
}

export async function ensureWorkflowStateScaffold(repoPath) {
  await ensureFile(
    path.join(repoPath, ...WORKFLOW_STATE_PATH),
    `${JSON.stringify(defaultWorkflowState(), null, 2)}\n`
  );
}

async function workflowStateExists(repoPath) {
  try {
    await fs.access(path.join(repoPath, ...WORKFLOW_STATE_PATH));
    return true;
  } catch {
    return false;
  }
}

export async function loadWorkflowState(repoPath, options = {}) {
  if (options.createIfMissing === false && !(await workflowStateExists(repoPath))) {
    return defaultWorkflowState();
  }
  await ensureWorkflowStateScaffold(repoPath);
  const workflowPath = path.join(repoPath, ...WORKFLOW_STATE_PATH);
  return JSON.parse(await fs.readFile(workflowPath, "utf8"));
}

async function saveWorkflowState(repoPath, state) {
  const workflowPath = path.join(repoPath, ...WORKFLOW_STATE_PATH);
  state.updatedAt = nowIso();
  await fs.writeFile(workflowPath, `${JSON.stringify(state, null, 2)}\n`);
}

function archiveRun(state, run) {
  if (!run) {
    return;
  }

  const archived = {
    title: run.title,
    goal: run.goal || "",
    mode: run.mode || "",
    status: run.status || "completed",
    startedAt: run.startedAt || run.updatedAt || nowIso(),
    completedAt: run.completedAt || run.updatedAt || nowIso(),
    gates: run.gates || { review: null, validation: null }
  };

  state.recentRuns = [archived, ...(state.recentRuns || [])].slice(0, MAX_RECENT_RUNS);
}

function createRun(fields = {}) {
  return {
    title: fields.title || "Workflow Run",
    goal: fields.goal || "",
    mode: fields.mode || "",
    status: fields.status || "active",
    startedAt: nowIso(),
    updatedAt: nowIso(),
    next: fields.next || "",
    gates: {
      review: null,
      validation: null,
      deployment: {
        dev: null,
        prod: null
      }
    },
    artifacts: {
      runBrief: fields.path || null,
      handoffs: [],
      reviewResult: null,
      validationPlan: null,
      validationResult: null,
      deploymentChecks: {
        dev: null,
        prod: null
      },
      finalSynthesis: null
    }
  };
}

export async function startWorkflowRun(repoPath, fields = {}) {
  const state = await loadWorkflowState(repoPath);
  if (state.currentRun) {
    archiveRun(state, state.currentRun);
  }

  state.currentRun = createRun(fields);
  await saveWorkflowState(repoPath, state);
  return state.currentRun;
}

function ensureCurrentRun(state, fields = {}) {
  if (!state.currentRun) {
    state.currentRun = createRun(fields);
  }
  return state.currentRun;
}

function applyBadge(run, badge, note = "") {
  const updatedAt = nowIso();
  if (badge === "review_required") {
    run.gates.review = { status: "required", updatedAt, note };
    return;
  }
  if (badge === "review_passed") {
    run.gates.review = { status: "passed", updatedAt, note };
    return;
  }
  if (badge === "review_failed") {
    run.gates.review = { status: "failed", updatedAt, note };
    return;
  }
  if (badge === "review_skipped") {
    run.gates.review = { status: "skipped", updatedAt, note };
    return;
  }
  if (badge === "validation_expected") {
    run.gates.validation = { status: "expected", updatedAt, note };
    return;
  }
  if (badge === "validation_passed") {
    run.gates.validation = { status: "passed", updatedAt, note };
    return;
  }
  if (badge === "validation_failed") {
    run.gates.validation = { status: "failed", updatedAt, note };
    return;
  }
  if (badge === "validation_skipped") {
    run.gates.validation = { status: "skipped", updatedAt, note };
    return;
  }
  if (badge === "dev_deploy_expected") {
    run.gates.deployment.dev = { status: "expected", updatedAt, note };
    return;
  }
  if (badge === "dev_checked") {
    run.gates.deployment.dev = { status: "passed", updatedAt, note };
    return;
  }
  if (badge === "dev_failed") {
    run.gates.deployment.dev = { status: "failed", updatedAt, note };
    return;
  }
  if (badge === "dev_skipped") {
    run.gates.deployment.dev = { status: "skipped", updatedAt, note };
    return;
  }
  if (badge === "prod_deploy_expected") {
    run.gates.deployment.prod = { status: "expected", updatedAt, note };
    return;
  }
  if (badge === "prod_checked") {
    run.gates.deployment.prod = { status: "passed", updatedAt, note };
    return;
  }
  if (badge === "prod_failed") {
    run.gates.deployment.prod = { status: "failed", updatedAt, note };
    return;
  }
  if (badge === "prod_skipped") {
    run.gates.deployment.prod = { status: "skipped", updatedAt, note };
    return;
  }

  throw new Error(`Unsupported workflow badge: ${badge}`);
}

export async function markWorkflowBadge(repoPath, options = {}) {
  const badge = options.badge;
  if (!badge) {
    throw new Error("Workflow badge is required.");
  }

  const state = await loadWorkflowState(repoPath);
  const run = ensureCurrentRun(state, {
    title: options.title || "Workflow Run",
    goal: options.goal || "",
    mode: options.mode || "",
    next: options.next || ""
  });
  applyBadge(run, badge, options.note || "");
  run.updatedAt = nowIso();
  if (options.next) {
    run.next = options.next;
  }
  await saveWorkflowState(repoPath, state);
  return state.currentRun;
}

export async function registerWorkflowArtifact(repoPath, artifact, fields = {}) {
  const state = await loadWorkflowState(repoPath);

  if (artifact.kind === "run-brief") {
    state.currentRun = createRun({
      title: fields.title,
      goal: fields.goal,
      mode: fields.mode,
      next: fields.next,
      path: artifact.path
    });
    await saveWorkflowState(repoPath, state);
    return state.currentRun;
  }

  const run = ensureCurrentRun(state, {
    title: fields.title || artifact.title,
    goal: fields.goal || "",
    mode: fields.mode || "",
    next: fields.next || ""
  });

  if (artifact.kind === "handoff") {
    run.artifacts.handoffs = [...(run.artifacts.handoffs || []), artifact.path].slice(-10);
  } else if (artifact.kind === "review-result") {
    run.artifacts.reviewResult = artifact.path;
    applyBadge(
      run,
      fields.decision === "rejected" ? "review_failed" : "review_passed",
      fields.summary || ""
    );
  } else if (artifact.kind === "validation-plan") {
    run.artifacts.validationPlan = artifact.path;
    applyBadge(run, "validation_expected", fields.summary || fields.goal || "");
  } else if (artifact.kind === "validation-result") {
    run.artifacts.validationResult = artifact.path;
    applyBadge(
      run,
      fields.decision === "failed" ? "validation_failed" : "validation_passed",
      fields.summary || fields.goal || ""
    );
  } else if (artifact.kind === "deployment-check") {
    const environment = fields.environment === "prod" ? "prod" : "dev";
    run.artifacts.deploymentChecks[environment] = artifact.path;
    applyBadge(
      run,
      fields.decision === "failed"
        ? `${environment}_failed`
        : `${environment}_checked`,
      fields.summary || fields.goal || ""
    );
  } else if (artifact.kind === "final-synthesis") {
    const pendingBadges = summarizeWorkflowState({ currentRun: run }).pendingBadges;
    if (pendingBadges.length > 0) {
      throw new Error(
        `Cannot finalize run while workflow badges are still pending: ${pendingBadges.join(", ")}`
      );
    }
    run.artifacts.finalSynthesis = artifact.path;
    run.status = fields.status || "completed";
    run.completedAt = nowIso();
  }

  run.updatedAt = nowIso();
  if (fields.next) {
    run.next = fields.next;
  }
  await saveWorkflowState(repoPath, state);
  return state.currentRun;
}

export function summarizeWorkflowState(state) {
  const currentRun = state?.currentRun || null;
  if (!currentRun) {
    return {
      hasActiveRun: false,
      pendingBadges: [],
      currentRun: null
    };
  }

  const pendingBadges = [];
  if (currentRun.gates?.review?.status === "required") {
    pendingBadges.push("review_required");
  }
  if (currentRun.gates?.validation?.status === "expected") {
    pendingBadges.push("validation_expected");
  }
  if (currentRun.gates?.deployment?.dev?.status === "expected") {
    pendingBadges.push("dev_deploy_expected");
  }
  if (currentRun.gates?.deployment?.prod?.status === "expected") {
    pendingBadges.push("prod_deploy_expected");
  }

  return {
    hasActiveRun: currentRun.status !== "completed",
    pendingBadges,
    currentRun: {
      title: currentRun.title,
      goal: currentRun.goal,
      mode: currentRun.mode,
      status: currentRun.status,
      next: currentRun.next,
      gates: currentRun.gates,
      updatedAt: currentRun.updatedAt
    }
  };
}
