# Round 5: PrintDesignPro Full Redesign — Tailwind Prefix Silently Devours CSS Variables

**Date**: 2026-07-11 18:45
**Severity**: High (caught in review; now resolved)
**Component**: Design tokens, dark theme, Tailwind 4 prefixing, canvas integration
**Status**: Resolved

## What Happened

Round 5 (PrintDesignPro UI Redesign) shipped the full Claude Design reskin: design tokens with semantic naming (`--color-app-bg`, `--color-surface`, etc.), complete dark theme support, 52px topbar with centered element tool strip (replacing the old left palette), paper preset panel, layers panel, restyled properties panel, 28px status bar, 220px sidebar app shell (home/templates/settings pages), and export modal with PNG/PDF/Print cards. The modal includes a live 150dpi render-engine preview replacing the old static preview dialog. Commit `4fff5a7` pushed to main. All gates green: unit tests (120+), typecheck, lint, build, full E2E twice, visual verification in light and dark themes.

But code review revealed a **cascading disaster** hiding in plain sight: Tailwind 4's `@theme` with `prefix(pp)` doesn't just prefix *class names*—it prefixes the CSS variables it **emits**. Our dark theme override block used unprefixed `--color-app-*` variable names, targeting nothing. The theme was inert. Inspection via DevTools `cssRules` showed `--pp-color-app-*` in the Tailwind output. Silent failure.

## The Brutal Truth

This is maddening because the design token system was carefully architected—semantic naming, token hierarchy, proper dark-mode override structure—and then **silently evaporated** due to a tooling behavior nobody documented. The theme *looked* correct. Classes applied. Colors appeared. Only in review, with a side-by-side cssRules inspection, did the override block show zero matches.

The deeper frustration: Tailwind's prefix feature is a black box. The docs don't explicitly state that `prefix()` applies to emitted variables. We assumed "prefix means class names." Wrong. And it wasn't caught by tests because CSS variable resolution happens at paint time, after your selectors have already stopped matching. A selector targeting `--color-app-*` that finds nothing doesn't throw; it silently falls back to the light theme.

## Technical Details

**The Bug:**
```css
/* Tailwind 4 output with @theme prefix(pp) */
:root {
  --pp-color-app-bg: #ffffff;
  --pp-color-surface: #f5f5f5;
  /* ... all vars prefixed */
}

/* Our dark override (broken) */
[data-theme="dark"] {
  --color-app-bg: #1a1a1a;    /* ← This var doesn't exist in scope */
  --color-surface: #2d2d2d;    /* ← Silent no-op */
}
```

**The Fix:**
```css
/* Correct dark override */
[data-theme="dark"] {
  --pp-color-app-bg: #1a1a1a;      /* ← Now matches emitted var */
  --pp-color-surface: #2d2d2d;
}
```

**Discovery Method:**
```javascript
// In DevTools console
Array.from(document.styleSheets)
  .flatMap(sheet => Array.from(sheet.cssRules || []))
  .filter(rule => rule.cssText?.includes('--pp-color'))
// Revealed: all vars are prefixed. Ours override block targets nothing.
```

**Canvas Ruler Crisis:**
Canvas rulers can't consume CSS variables at all—`ctx.fillStyle = 'var(--pp-color-grid)'` is invalid. Workaround: read computed values at draw time + MutationObserver on `data-theme` changes to retrigger render:
```typescript
const getTokenValue = (name: string) => {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(`--pp-${name}`)
    .trim();
};

// MutationObserver watches for theme changes
observer.observe(document.documentElement, { attributes: true });
```

**Secondary Bugs Caught in Review:**
- **51 dead utilities** across 9 files: variant-before-prefix is invalid (`hover:pp:x` silently dropped; must be `pp:hover:x`). Mechanical sweep fixed all.
- **Preset matching logic** ignored margins—custom-margin A4 preset showed as matching the standard A4, and re-applying was a no-op. Fixed with full-field deep compare in `samePageSettings()`.
- **StatusBar hardcoded Vietnamese labels** for presets; now built from i18n key lookup.
- **Rename input never focused**—the input was created but activeElement never updated. Fixed with explicit `focus()` call after DOM settle.
- **Duplicated `downloadBlob()`**—defined in both host app and lib. Now imported from lib.
- **Missing gesture guards on panel duplicate/delete**—mutating the layers array mid-drag would commit against stale panel IDs, causing orphaned UI. Added guard checks.

**PowerShell Text Manipulation Catastrophe (Again):**
The dead utilities sweep used PowerShell to search-and-replace across source files. Output came back mangled: `Â°` (mojibake), `âœ•`, `âˆ'`, and UTF-8 BOM prepended. PowerShell 5.1 default encoding is UTF-16LE; it rewrites output as UTF-16, then the terminal interprets it as UTF-8. This is the *second time* in this project (first was round 2 config files). Fixed by rewriting the sweep as a Node script with explicit `utf-8` encoding and no BOM.

## What We Tried

1. **Blamed the component styling**—checked every element's inline styles, Tailwind classes, computed styles. Colors were correct in Chrome DevTools computed panel.
2. **Tested color values directly**—added a debug div with inline `style="color: var(--pp-color-text)"` and it worked. So the var existed; the override just wasn't firing.
3. **Tried !important in the override block**—didn't matter because the selector wasn't matching anything.
4. **Inspected the stylesheet order**—checked if Tailwind was overriding our override. No; the override block wasn't in the cascade at all.
5. **Finally: cssRules inspection**—realized the override was targeting `--color-*` (unprefixed) while Tailwind emitted `--pp-color-*` (prefixed). Game over.
6. **PowerShell sweep went sideways**—first run output garbage; tried iconv, tried Notepad++ encoding change, finally rewrote it in Node.

## Root Cause Analysis

**Immediate (CSS Variables):** Tailwind 4's `prefix()` function operates on the *entire* theme output, including CSS variable declarations. The feature is powerful but underdocumented. We built a mental model ("prefix = class names") that didn't match the implementation.

**Systemic (Design Tokens):** The design token architecture was sound, but the integration contract with Tailwind was implicit. We should have read the compiled output *once* before writing overrides. Assumption + automation = silent failure.

**Systemic (PowerShell):** This is the *second time* PowerShell encoding has burned us in this project (round 2, YAML files). The default `Out-File` encoding is UTF-16LE; it's a footgun for UTF-8 source code. We have no CI check that catches rewritten files with wrong encoding.

**Why Review Caught It:** Code review explicitly looked at the CSS output. No automated test verifies that CSS variable names match their usages. Tests check that the color *appears* on the element, not that the variable *name* is correct.

## Lessons Learned

1. **Styling systems that silently drop constructs need automated checks, not reviewer eyeballs.** The dead utilities (51 of them) and the prefixing mismatch both violated no test and passed no lint. Automated checks exist for TypeScript, but CSS variant ordering and variable naming need explicit validation.

2. **Read generated output once before applying overrides.** Before writing the dark theme override block, we should have `cat dist/style.css | grep --color-app` to verify what was actually emitted. One 30-second check would have saved the review cycle.

3. **Reactivity across canvas boundaries requires explicit integration.** Canvas can't consume CSS variables; we need an explicit contract (MutationObserver + getComputedStyle) rather than hoping `ctx.fillStyle = 'var(...)'` works.

4. **PowerShell is a repeat offender for text file encoding.** This is the second time in this project. Add a CI check: verify that source files are UTF-8 without BOM. Or blacklist PowerShell for file manipulation; use Node or sed instead.

5. **Implicit contracts break silently.** The "override dark theme variables" contract was never written down. When Tailwind changed the output shape (prefixed vars), the contract broke. Document it: "Dark theme override block must target `--pp-*` variables as emitted by `@theme prefix(pp)`."

6. **A thorough code review caught 6+ bugs that passed all tests.** Unit tests for theme switching, E2E for component rendering, visual tests for light/dark pairs—none caught that the dark override block was selecting nothing. This is a test strategy gap, not a test quantity gap.

## Next Steps

- **Add CSS variable naming validation to CI:** Parse the Tailwind output and the theme override blocks; verify all referenced vars match emitted names. Fail the build if there's a mismatch.
- **Blacklist PowerShell for source file manipulation:** Document this as a project rule. Use Node, sed, or bash instead. Add a pre-commit hook that checks for UTF-16 BOM in source files.
- **Document the design token contract:** Write it down in `docs/design-tokens.md`. Include: Tailwind prefix behavior, how to add new tokens, how dark theme overrides work, canvas integration pattern with getComputedStyle.
- **Add visual regression testing for theme switching:** Beyond static light/dark screenshots, add a test that toggles `data-theme` and verifies computed colors match the design token values.

---

**Status**: DONE

**Summary**: Round 5 PrintDesignPro UI redesign shipped with full reskin and dark theme support, but Tailwind 4's `prefix()` behavior (prefixing CSS variables in addition to class names) made dark theme overrides silently ineffective until code review caught it with cssRules inspection. Five additional bugs caught in review (dead utilities, preset matching, hardcoded labels, rename focus, duplicated functions). PowerShell encoding caused mojibake in the sweep output (second occurrence). All issues resolved; architecture is solid, but testing and automation need to catch styling contract violations earlier.
