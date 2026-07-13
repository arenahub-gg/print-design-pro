# Round 6: Drawing Enhancements — A Phantom Test Killed an Entire Feature in Silence

**Date**: 2026-07-13 21:45
**Severity**: Critical (caught in code review; would have shipped broken without it)
**Component**: Element schema migration, strokeStyle/arrowheads/polygons, document load path, zod defaults
**Status**: Resolved

## What Happened

Round 6 shipped drawing enhancements: stroke styles (solid, dashed, dotted) on rectangles, lines, and circles; line arrowheads (startCap, endCap variants); and a new polygon shape element with six variants (triangle, diamond, star, arrow, pentagon, hexagon). All shapes feed through a unified `mm-geometry` module (core/shape-paths.ts) that generates SVG paths for the editor view and Canvas2D paths for the print engine—same single-source pattern that worked for table layout in round 4. Shapes are accessible via a flyout panel in the topbar tool strip (position:fixed because the strip itself is overflow-x-auto, so the flyout needs to be positioned relative to the viewport, not the strip).

Commit `e49f27c` pushed to main. All test gates green: unit tests pass, typecheck clean, lint pass, build succeeds, E2E suite runs 7/7 twice, live browser verification in Chrome and Firefox complete.

But code review caught a **silent killer** that every green gate missed: the new schema fields used `zod.default()` for backward compatibility with legacy documents. The unit test proving "legacy documents load with defaults" passed. But it tested the wrong code path entirely.

## The Brutal Truth

This is infuriating because the feature would have shipped broken to production. A user with a document saved before round 6 opens it. The editor loads. They click "Dashed" on a line. The command dispatches. The UI shows the control is selected. Nothing happens. The line stays solid. No error. No feedback. Just broken controls.

The deeper horror is that the gates lied. Tests passed. E2E passed. Visual verification passed. The code looked clean. And a **phantom test** was the culprit—a unit test that verified a code path the editor never executes.

What makes this particularly painful is that we have a *single* load function (`openTemplate`) that every editor instance uses. We have a *single* command dispatcher. We have a *single* element update flow. There is exactly one place where backward compatibility breaks, and we tested a different place entirely. The test was so plausible—"parse legacy, apply defaults, verify defaults apply"—that no one questioned whether `parseTemplate` was actually being called.

## Technical Details

**The Bug:**

The new polygon and strokeStyle fields were added to the element schema with `zod.default()`:
```typescript
const lineSchema = z.object({
  id: z.string(),
  type: z.literal('line'),
  strokeStyle: z.enum(['solid', 'dashed', 'dotted']).default('solid'),  // NEW
  startCap: z.enum(['none', 'arrow', 'circle']).default('none'),       // NEW
  endCap: z.enum(['none', 'arrow', 'circle']).default('none'),         // NEW
  // ... rest of schema
});
```

The unit test passed:
```typescript
it('loads legacy document with defaults', () => {
  const legacy = { id: 'line1', type: 'line' }; // no strokeStyle, no caps
  const parsed = lineSchema.parse(legacy);
  expect(parsed.strokeStyle).toBe('solid');
  expect(parsed.startCap).toBe('none');
});
```

This test verified that `zod.parse()` applies defaults. It passed. It was *correct code for the wrong path*.

**The Real Load Path:**

When the editor opens a document:
```typescript
async function openTemplate(templateId: string) {
  const doc = await repo.get(templateId); // Returns raw IndexedDB object, NO parsing
  // ← repo.get() does NOT call parseTemplate
  // ← doc.elements[i] has only the fields that were saved
  
  state.document = doc; // Directly assigned, no schema validation
}
```

The repository's `save()` function *does* parse:
```typescript
function save(doc) {
  const validated = parseTemplate(doc); // zod.parse() here
  return indexedDB.put(validated);
}
```

But `get()` does not:
```typescript
function get(id) {
  return indexedDB.get(id); // Raw object, no validation
}
```

So a legacy document loaded via `openTemplate` lands in state with missing fields: `{ id: 'line1', type: 'line' }`. The defaults were never applied. The fields were undefined.

**The Command Dispatch Disaster:**

The stroke style command looks like:
```typescript
const updateElementsCommand = (patch: Partial<Element>) => {
  return {
    apply: (doc) => {
      doc.elements.forEach(el => {
        Object.keys(patch).forEach(key => {
          if (key in el) { // ← THE FILTER
            el[key] = patch[key];
          }
        });
      });
    }
  };
};
```

When the user clicks "Dashed", the command patches `{ strokeStyle: 'dashed' }`. The `key in el` check finds that `strokeStyle` doesn't exist on the legacy element. The patch is silently dropped. Zero error. Zero effect. The UI shows the control as selected, but the element was never updated. Rendering degrades gracefully (undefined strokeStyle defaults to solid CSS), so it *looks* shippable.

**How It Was Caught:**

Code review asked: "How do legacy documents behave when they load?" The reviewer traced `openTemplate()` to `repo.get()` and noticed no parsing. They added a minimal test:
```typescript
it('legacy element accepts stroke style patch on load', () => {
  const repo = createTestRepo();
  const legacy = { elements: [{ id: 'line1', type: 'line' }] }; // No strokeStyle
  repo.put('doc1', legacy);
  
  const loaded = repo.get('doc1'); // Raw object
  const command = updateElementsCommand({ strokeStyle: 'dashed' });
  command.apply(loaded);
  
  expect(loaded.elements[0].strokeStyle).toBe('dashed');
  // ← This fails! Patch was silently dropped.
});
```

This test failed immediately. The existing test passed. The difference: one tested `parseTemplate()` (the wrong path), the other tested `repo.get()` (the real path).

**The Fix:**

1. **openTemplate now migrates on load:**
   ```typescript
   async function openTemplate(templateId: string) {
     let doc = await repo.get(templateId);
     doc = parseTemplate(doc.clone()); // ← Apply defaults and migration logic
     state.document = doc;
   }
   ```
   This is the single migration choke point. All documents pass through validation once on open.

2. **Regression test:**
   ```typescript
   it('stroke style patch applies to legacy elements loaded via openTemplate', async () => {
     const repo = createTestRepo();
     const legacy = { elements: [{ id: 'line1', type: 'line' }] };
     repo.put('doc1', legacy);
     
     const loaded = await openTemplate('doc1'); // Real path
     const command = updateElementsCommand({ strokeStyle: 'dashed' });
     command.apply(loaded);
     
     expect(loaded.elements[0].strokeStyle).toBe('dashed');
   });
   ```

3. **Invariant documented in the code:**
   ```typescript
   /**
    * When adding fields with zod.default():
    * 1. Add the field to the schema with .default(value)
    * 2. Defaults are applied in openTemplate (doc load)
    * 3. Do NOT rely on parseTemplate for defaults in the editor
    * 4. Add a regression test that loads legacy + patches the new field
    *
    * Schema fields without defaults must be provided by save() before they reach the state.
    */
   ```

**Secondary Issues Caught:**

1. **Flyout anchor staleness on scroll/resize:** The shapes flyout was positioned relative to the tool strip button, but when the viewport scrolled or resized, the anchor position became stale. The flyout stayed in the old position. Fixed: close the flyout on both scroll and resize events, so it re-anchors on next open.

2. **CDP screenshot timeouts during E2E verification:** Chromium DevTools Protocol screenshot commands kept timing out during visual verification of the dashed/dotted line rendering. Fallback: verified the math directly via DOM assertions. For a 1.6mm dashed gap with 96dpi screen, the computed SVG dasharray should be "6.047px 6.047px". Asserted the exact value in pixels. It matched. Rendering is correct; the CDP timeout was a flake.

3. **PowerShell UTF-8 mangling (third incident in this project):** During documentation update, a PowerShell Set-Content sweep on plan markdown corrupted Vietnamese text. "Nét vẽ" (drawing line) became "NÃ©t váº½" (mojibake). This is the *third time* PowerShell encoding has burned this project (first: round 1 config files, second: round 5 CSS sweep). Fixed via the Edit tool (which preserves UTF-8). Added comment: PowerShell is now formally banned for any operation touching source or documentation.

## What We Tried

1. **Traced the defaults through `parseTemplate()`**—verified that `zod.default()` works as expected in isolation. Test passed. Assumed the editor used parseTemplate on load. It doesn't.

2. **Verified the E2E test**—a full user flow of "open document, set stroke to dashed, save, close" passed. But the E2E test started with a *fresh* document (created in round 6), which had no undefined fields. Legacy document behavior was never tested end-to-end.

3. **Inspected the element state post-patch**—added temporary debug logging to the command dispatcher. Confirmed that the `key in el` check was filtering out the strokeStyle key on legacy elements.

4. **Considered making zod.default() work retroactively**—thought about applying defaults in the command dispatcher itself. No; that pushes schema logic into business logic. The right place is the load boundary.

5. **Attempted CDP screenshot retry logic**—added exponential backoff for the timeout. Still flaked. Switched to DOM assertions instead, which are deterministic and don't depend on CDP responsiveness.

## Root Cause Analysis

**Immediate:** The unit test for backward compatibility tested `zod.parse()` in isolation but never verified the document *load path* that actually runs in the editor. The test was correct code for the wrong execution path.

**Systemic:** Schema migration logic must be tested through the real code path, not a path that looks conceptually similar. Defaults are only useful if they're applied at the boundary where data enters the system. We apply them in `save()` but not in `get()`, creating a silent incompatibility: documents loaded from disk are unvalidated.

**Systemic:** The command dispatcher's `key in el` filter is a reasonable optimization (don't write fields that don't exist), but it interacts dangerously with schema defaults. A field that "should exist with a default" and "doesn't exist yet" look identical to the filter. The invariant—"all fields with defaults are applied on load"—was never documented where the filter lives.

**Systemic:** The test suite didn't cover the *transition* from legacy format to new format. We had unit tests for new elements, and E2E tests that started with fresh documents. No test that loads a pre-round-6 document and patches it. The gap was invisible until review.

## Lessons Learned

1. **A passing test for the wrong code path manufactures confidence and delays discovery.** This test passed. It looked good. It was *correct code* but *wrong path*. The only way to catch this is to trace the actual execution path the system takes, not the path that "should" be taken. Document the critical paths; test them explicitly.

2. **Schema defaults must be applied at the data boundary, not at the business logic boundary.** All input data from disk/network should be validated once as it enters. The repository layer should parse on both `get()` and `save()`. No component should assume fields exist; let the schema be the contract.

3. **Backward-compat claims are only tested if you test *against* legacy data through the *real* load path.** Creating a new document and verifying defaults work is not a backward-compat test. A real backward-compat test loads a serialized legacy document, applies current-version code, and asserts it still works. Do this end-to-end.

4. **Silent filters + missing data = undebuggable failures.** The `key in el` filter is good for performance, but when a "mandatory default field" is missing, the filter silently drops the patch. Document the invariant where the filter is defined: "All keys in a patch must exist on the element because schema defaults are applied on load."

5. **PowerShell is permanently blacklisted for UTF-8 source/doc manipulation.** This is the third incident. Add a pre-commit hook that rejects PowerShell-generated files (check for UTF-16 BOM, check for mojibake patterns). Or better: use Node or bash for any file operation that touches source.

6. **Flyout anchoring to a scrollable parent requires explicit re-anchor on scroll/resize events.** Fixed by closing the flyout on these events, but the lesson is: when UI is positioned relative to a scroll container, you must either re-calculate position on every scroll or dismiss and let the user re-open.

## Next Steps

- **Establish a "backward-compat test strategy":** Create a suite that loads documents serialized *before* each major schema change, applies current code, and asserts the update path works. This is separate from unit tests—it's integration. Document in `docs/migration-strategy.md`.

- **Parse on both `repo.get()` and `repo.save()`:** Make the repository layer the schema boundary. Documents should never exist in state without validation. This single change eliminates an entire class of silent failures.

- **Document the schema migration invariant:** In the code comment where zod defaults are used and where the command filter is defined, state the invariant explicitly: "Fields added with zod.default() are applied in openTemplate(). If a field has a default, it will always exist in memory after load. Patches can assume all fields exist."

- **Blacklist PowerShell for source/doc files:** Add to the project README: "Do not use PowerShell Set-Content, Get-Content, or Add-Content on source files or markdown docs. Use Node, bash, or the Edit tool. PowerShell defaults to UTF-16LE encoding and mangles UTF-8 source." Add a pre-commit hook that checks for UTF-16 BOM and rejects commits.

- **Add visual regression tests for new shape elements:** Beyond the unit tests, add E2E tests that create each polygon variant and each stroke style, verify the SVG/canvas rendering is correct, take a screenshot, and compare pixel-perfect against a golden image. This would have caught the strokeStyle patch failure immediately in E2E.

- **Test the flyout anchor behavior explicitly:** Add tests that open the flyout, scroll, verify it closes, re-open, and verify it re-anchors. Same for resize.

---

**Status**: DONE

**Summary**: Round 6 drawing enhancements (strokeStyle, arrowheads, polygons, unified mm-geometry module) shipped with all gates green, but code review caught a critical silent failure: a phantom unit test green-lit a backward-compat contract for a code path the editor never executes; legacy documents didn't get schema defaults, so stroke style patches were silently dropped. Fixed by making openTemplate apply parseTemplate, establishing the single migration boundary. Also fixed: flyout re-anchoring on scroll/resize, PowerShell UTF-8 mangling (third occurrence, now blacklisted), and CDP screenshot flakes.
