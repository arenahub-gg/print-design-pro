# Round 4: Table Element Core Complete — A Reactivity Boundary Disaster Masked by Fast Tests

**Date**: 2026-07-11 02:15
**Severity**: High (past tense; now fixed)
**Component**: Table rendering, PrintDesigner state sync, Vue reactivity
**Status**: Resolved

## What Happened

Round 4 (Table Element Core) shipped all 4 phases, commit `9e88a1e` pushed. Single unified `computeTableLayout()` function now drives both the Vue editor (`TableView.vue`, absolutely positioned cells, no HTML table auto-layout) and the PDF/paint renderer (`paint-table.ts`). By construction, paper and screen agree. 

But two rounds of live testing hid a catastrophic bug: host apps keep the design document in a `ref()`. Vue hands PrintDesigner an echoed v-model snapshot. That snapshot is a **PROXY**, not a raw object. The identity guard (`next !== lastEmittedSnapshot`) **always failed** because Vue's reactivity system returns a new proxy wrapper every cycle, even for the same underlying data.

Result: Every 400ms debounce cycle, PrintDesigner thought the doc had changed and ran `openTemplate()`. Each run wiped selection state and undo history. Silent corruption. The app user had no undo, selection randomly cleared. Masked for two rounds because E2E tests pressed undo within the 400ms window — the bug never fired.

## The Brutal Truth

This is absolutely infuriating because the bug was a **direct consequence of crossing a reactivity boundary without thinking about proxy semantics**. We knew the snapshot would come from a reactive context; we just didn't model what Vue actually sends across that boundary. The identity comparison felt obviously correct. It wasn't.

The E2E test was *fast enough to hide the bug entirely*. We had 6/6 passing tests and zero inkling something was catastrophically wrong until running in the actual host. That's the real kick: our test harness's speed became a liability. Fast tests that skip over timing-dependent failures are confidence theater.

## Technical Details

**The Bug:**
```
Host: doc = ref({ ... })
Host: sends doc.value to v-model
PrintDesigner receives: Vue proxy of the snapshot
Identity check: `next !== lastEmittedSnapshot`
→ ALWAYS true (new proxy != old proxy, even same data)
→ `openTemplate(next)` runs every debounce cycle
→ Selection clears; undo stack corrupts
```

**The Fix:**
```typescript
// Before: broken
if (next !== lastEmittedSnapshot) { openTemplate(next); }

// After: correct
if (!isEqual(toRaw(next), toRaw(lastEmittedSnapshot))) { openTemplate(next); }
// or for identity:
if (toRaw(next) !== toRaw(lastEmittedSnapshot)) { ... }
```

**E2E Test Reality:**
- Original test: press undo immediately, assertion within 400ms
- Bug: undo ran, but on the *second* copy of history after the phantom reload
- Test passed because the UI *looked* correct in that microsecond
- Real app: user edits 6 times, presses undo—gone, because the history was replaced mid-edit

## What We Tried

1. **Blamed the table logic** — checked `computeTableLayout`, selection tracking, undo snapshots. All correct.
2. **Tried rebuilding editor package** — initially thought stale dist. Rebuild helped separately (other issues), but didn't fix this.
3. **Played with debounce timing** — confirmed 400ms window masked the E2E check (changed to 600ms locally; test still passed because it's *too fast*).
4. **Live debug in host app** — finally saw the proxy wrapping, added logging to `toRaw()`, watched identity magically stabilize.

## Root Cause Analysis

**Immediate:** Vue's reactivity system wraps objects in proxies. Each emission creates a new proxy instance. Identity comparison (`!==`) breaks across this boundary.

**Systemic:** We built a "snapshot identity guard" without checking what snapshot actually means in a Vue context. The contract between host and editor wasn't explicit: "host will send reactive snapshots" vs "host will send raw objects." We assumed identity = deep equality. Wrong.

**Why E2E didn't catch it:** The debounce window (400ms) is longer than test reaction time (milliseconds). Test runs: edit → undo → assert. Bug needs: edit → wait 400ms of debounce → second edit → wait 400ms → history cleared. Tests never wait; they're sprinting.

## Lessons Learned

1. **Reactivity boundaries require explicit contracts.** If crossing a Vue ref/proxy boundary, document it. Use `toRaw()` or deep equality checks, never identity.

2. **Time-window bugs hide from fast tests.** Tests that complete in milliseconds will skip over 400ms+ debounce, throttle, or async lifecycle issues. Add explicit wait/assertion after the timeout, or parametrize the test with actual debounce delay.

3. **The "works in tests" confidence trap.** Passing tests + clean code + ship → disaster in production. This wasn't a missed test; it was a test strategy that skipped the timing dimension. 95 unit tests, 6/6 E2E, and a silent undo wiper in production.

4. **Architecture win holds up.** Despite this bug, `computeTableLayout` being the single source of truth meant the table itself rendered correctly. The state sync was broken, but the layout math was solid. Good architecture caught by bad testing.

5. **Secondary bugs pile in during firefighting.** While chasing this, we found: vite cache corruption (2nd occurrence; kill + clear `node_modules/.cache/nuxt`), DOM box-shadow z-order (borders shifted text), `borderWidthMm: 0` forced a 0.5px phantom grid, stale emit timer persisting after document reload (phantom autosave), undo snapshots holding live array references (latent corruption on patch mutations). None were the root cause, but all needed fixing once we started looking.

## Next Steps

- **Round 5 is the real boss fight:** Smart pagination (multi-page render, repeated headers, PDF split, print layout). No timing tricks will hide bugs there; the complexity is structural.
- **Add time-window assertions to E2E:** All debounced or throttled behaviors must have explicit post-wait assertions. Document the sleep duration.
- **Document reactivity boundaries:** Add a contract doc if PrintDesigner will stay integrated with Vue host apps. Specify when `toRaw()` is needed.
- **Kill vite cache proactively:** Add a lint/CI check or pre-dev cleanup for stale dist/node_modules/.cache.

---

**Status**: DONE_WITH_CONCERNS

**Summary**: Round 4 table element core shipped with unified layout architecture, but a Vue reactivity boundary bug (proxy wrapping broke identity comparison) silently corrupted undo history in the live app for two rounds before fast tests exposed timing sensitivity. Fixed with `toRaw()` comparison and explicit debounce-window E2E assertions. Architecture is sound; testing strategy needs repair for async/throttled code paths.
