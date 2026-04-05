# Memory System

## Why This Exists

Memory should be its own Engineering OS feature.

The problem is simple:

- we want sessions to recover context well
- we do not want startup context to grow forever

So memory needs two properties at once:

- durable on disk
- bounded in prompt context

## What We Need Now

The v1 memory system should stay very simple.

At session start or workflow start, Engineering OS should load only:

- stable repo memory
  - `CLAUDE.md`
  - `.claude/engineering-os/*.md`
- current live state
  - active claims
  - open approvals
  - sprint/focus state if present
- the most recent useful artifacts
  - latest run brief
  - latest final synthesis
  - latest relevant review
  - latest unresolved or relevant handoff
- a small amount of recent history
  - a few recent events
  - a little recent claim/history context if needed

It should not auto-load:

- all old artifacts
- all logs
- all resolved approvals
- the full archive

The wake-up brief should be the main surface for this.

## V1 Rule

Memory can grow on disk.

Loaded memory must stay small.

That is the whole rule.

## Hot, Warm, Cold

Even in v1, it helps to think in three layers.

### Hot

What is active now and should usually be loaded:

- open approvals
- active claims
- latest run brief
- latest final synthesis
- unresolved handoff

### Warm

Recent useful things that should be retrievable but not always loaded:

- recent reviews
- recent handoffs
- recent syntheses
- recent events

### Cold

History that should stay searchable but almost never auto-load:

- old logs
- older artifacts
- resolved approvals
- stale runs

## What The Wake-Up Brief Should Do

The wake-up brief should answer:

- where am I
- what are we doing
- what is active
- what changed recently
- what still matters

It should summarize.

It should point to deeper memory when needed.

It should not dump raw history.

## What Comes Later

Once v1 is working well, memory can get smarter.

The next level would be:

- meaning-based retrieval, not just recency
- reinforcement
  - memory that gets reused becomes easier to find
- decay
  - old unused memory becomes less likely to surface by default

That means the system could eventually retrieve things like:

- prior decisions about reviewer defaults
- related work on wake-up behavior
- relevant old syntheses for the same subsystem

without loading the whole archive every time.

## Ideal Direction

Longer term, good memory should feel like this:

- recent important things surface automatically
- older important things are still easy to find
- irrelevant history stays quiet
- repeated useful knowledge becomes more prominent
- stale knowledge fades unless it becomes relevant again

## Practical Roadmap

### Step 1

Keep wake-up bounded and useful.

### Step 2

Make artifacts easier to summarize and rank.

### Step 3

Add better retrieval over recent and related artifacts.

### Step 4

Experiment with meaning-based search, reinforcement, and decay.

## Success

Memory is working when a new session feels informed, not overloaded.
