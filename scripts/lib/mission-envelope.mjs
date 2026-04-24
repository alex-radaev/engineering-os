// Parser for the ORCHESTRATOR_MISSION envelope that orchestrators prepend
// to a Crew lead's first-turn prompt. The envelope is binding on the lead:
// objective, scope, acceptance_criteria, and reporting paths override any
// lead-inferred scope. Absent envelope is normal — this parser returns
// { envelope: null, body: prompt } and the caller proceeds unchanged.
//
// Shape and rules are documented in docs/mission-envelope.md and
// crew/workflow.md § Mission Envelope. This module is pure: no I/O, no
// process exits. The caller (the lead) decides how to handle missing
// required fields (e.g. emit help_request).

const HEADER = "ORCHESTRATOR_MISSION";
const TERMINATOR_LITERAL = "End of mission envelope.";
const SLASH_COMMAND_RE = /^\/crew:/;

function firstNonEmptyLineIndex(lines) {
  for (let i = 0; i < lines.length; i += 1) {
    if (lines[i].trim().length > 0) {
      return i;
    }
  }
  return -1;
}

function isTopLevelKeyLine(line) {
  // Top-level key: matches `key:` or `key: value` with no leading whitespace.
  return /^[A-Za-z_][A-Za-z0-9_]*:\s*(.*)$/.test(line) && !/^\s/.test(line);
}

function parseKeyLine(line) {
  const match = /^([A-Za-z_][A-Za-z0-9_]*):\s*(.*)$/.exec(line);
  if (!match) {
    return null;
  }
  return { key: match[1], value: match[2] };
}

function gatherContinuation(lines, startIdx) {
  // Gather lines indented by >=2 spaces until the next top-level key or end.
  // Returns { block: string[], nextIdx: number } where block has the 2-space
  // prefix stripped and line breaks preserved.
  const block = [];
  let i = startIdx;
  while (i < lines.length) {
    const line = lines[i];
    if (line.length === 0) {
      // Blank line — include as part of the block (preserves paragraph breaks
      // inside a multi-line value). Stop if the NEXT non-empty line is a
      // top-level key.
      let j = i + 1;
      while (j < lines.length && lines[j].length === 0) j += 1;
      if (j >= lines.length || isTopLevelKeyLine(lines[j])) {
        break;
      }
      block.push("");
      i += 1;
      continue;
    }
    if (/^ {2,}/.test(line)) {
      block.push(line.replace(/^ {2}/, ""));
      i += 1;
      continue;
    }
    // Non-indented, non-empty — end of continuation.
    break;
  }
  return { block, nextIdx: i };
}

function parseNestedObject(blockLines) {
  // Parse an indented block as a nested object when every non-empty line
  // looks like `key: value`. Otherwise return the raw string.
  const obj = {};
  let allKeyLines = true;
  for (const line of blockLines) {
    if (line.trim().length === 0) continue;
    const kv = parseKeyLine(line);
    if (!kv) {
      allKeyLines = false;
      break;
    }
    obj[kv.key] = kv.value;
  }
  if (allKeyLines && Object.keys(obj).length > 0) {
    return obj;
  }
  return blockLines.join("\n");
}

export function parseMissionEnvelope(prompt) {
  if (typeof prompt !== "string" || prompt.length === 0) {
    return { envelope: null, body: prompt ?? "" };
  }

  const lines = prompt.split("\n");
  const firstIdx = firstNonEmptyLineIndex(lines);
  if (firstIdx === -1 || lines[firstIdx].trim() !== HEADER) {
    return { envelope: null, body: prompt };
  }

  // Walk forward from the header to find the terminator.
  let terminatorIdx = -1;
  let terminatorIsSlash = false;
  for (let i = firstIdx + 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.trim() === TERMINATOR_LITERAL) {
      terminatorIdx = i;
      terminatorIsSlash = false;
      break;
    }
    if (SLASH_COMMAND_RE.test(line)) {
      terminatorIdx = i;
      terminatorIsSlash = true;
      break;
    }
  }

  // Envelope body is between header and terminator; free-form body starts
  // at the terminator line when it's a slash command (the line IS part of
  // the body) or after it when it's the literal terminator.
  const envelopeBodyEnd = terminatorIdx === -1 ? lines.length : terminatorIdx;
  const envelopeLines = lines.slice(firstIdx + 1, envelopeBodyEnd);

  let bodyLines;
  if (terminatorIdx === -1) {
    bodyLines = [];
  } else if (terminatorIsSlash) {
    bodyLines = lines.slice(terminatorIdx);
  } else {
    bodyLines = lines.slice(terminatorIdx + 1);
  }
  const body = bodyLines.join("\n");

  // Parse envelope fields.
  const envelope = {};
  let i = 0;
  while (i < envelopeLines.length) {
    const line = envelopeLines[i];
    if (line.trim().length === 0) {
      i += 1;
      continue;
    }
    if (!isTopLevelKeyLine(line)) {
      // Stray line — skip.
      i += 1;
      continue;
    }
    const kv = parseKeyLine(line);
    if (!kv) {
      i += 1;
      continue;
    }
    if (kv.value.length > 0) {
      envelope[kv.key] = kv.value;
      i += 1;
      continue;
    }
    // Empty value — gather indented continuation.
    const { block, nextIdx } = gatherContinuation(envelopeLines, i + 1);
    if (block.length === 0) {
      envelope[kv.key] = "";
    } else {
      envelope[kv.key] = parseNestedObject(block);
    }
    i = nextIdx;
  }

  return { envelope, body };
}
