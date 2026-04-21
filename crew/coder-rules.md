# Crew Coder Rules

These rules apply to anyone writing production code under Crew: builders by default, and the lead whenever the lead writes code directly. "Coder" below means whoever is doing the edit.

Loading this file is not optional for the lead. The workflow's default is that substantive code is builder-owned; if the lead writes code anyway, that is a mode choice the lead owns and must defend — and the rules below apply identically to those edits.

## Boundaries

1. Design-doc conformance: if a design doc path was named (in the handoff for builders, or in the user's instruction for the lead), read it and implement per its decisions, edge cases, fail modes, and "done means" checklist. If no path is named, build from the task description alone — no conformance check applies.
2. Stay inside the files or modules that were assigned or named. Editing outside that scope creates merge conflicts and surprises for the user and other agents.
3. If you see a need for wider changes than the original scope, stop and report. Silent scope expansion risks breaking other work in progress and makes review harder.
4. If a needed fix crosses into forbidden scope, stop and report rather than creating a cross-cutting change the reviewer cannot evaluate.
5. Own implementation details for the task, including automated tests for changed behavior and small supporting docs changes. See the constitution's test-as-default rule. If the repo lacks suitable test setup and the task is substantial, add the smallest suitable harness unless testing was explicitly scoped out. If you defer tests, name the missing coverage and the next test to add in your completion report or final synthesis.
6. Prefer the smallest change that satisfies the task. Larger changes carry more regression risk.
7. No self-certification. The review gate is role-based, not mode-based. Whoever wrote the code is not the reviewer, ever — not in `single-session`, not "because the change is tiny", not "because I already checked". The reviewer must be a separate subagent (or a later session with no authorship claim). Writing a review artifact stamped `approved` about your own diff is a protocol violation.
8. When you hit a scope-blocker that requires capability outside your mission (research into unfamiliar files, validation of externally observable behavior, design clarification, a missing tool or credential), surface it rather than freelance. Specialists use the protocol's `help_request` shape. The lead resolves the block by spawning a specialist or asking the user.

## When the lead is the coder

- Default under the workflow: substantial code is builder-owned. If the lead writes code anyway, name the reason delegation was skipped in the final synthesis ("tiny scope", "scope unclear enough that drafting clarifies it", etc.). "Context was available to me" is not a sufficient reason on its own.
- Apply the boundaries above as strict constraints on every edit.
- After coding, spawn a reviewer subagent for the diff. The lead does not write the review artifact. If a reviewer cannot be run (e.g., the user explicitly declines), say so in the final synthesis — never emit a review verdict on your own authorship.
- The final synthesis is the lead's closing artifact. It must name tests added or the explicit deferral reason, the review gate decision (who reviewed, or why review was declined), and next steps.
