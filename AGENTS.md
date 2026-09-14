# Học Viện Ads agent rules

This repository follows a Ponytail-inspired engineering approach: understand first, reuse what already exists, and make the smallest correct change.

## Decision ladder

Before writing code, stop at the first rung that solves the task safely:

1. Does this change need to exist at all? Avoid speculative work (YAGNI).
2. Does the repository already contain the right selector, helper, token, build step, or pattern? Reuse it.
3. Can Blogger, CSS, HTML, DOM/Web APIs, or Node standard library solve it natively? Prefer that.
4. Can an already-installed dependency solve it? Reuse it before adding anything new.
5. Only then add the minimum new code required.

The shortest diff is preferred only after the existing flow has been traced and the root cause is understood.

## HVA source-of-truth rules

- Treat `src/template/base.xml` as the Blogger baseline, not as a dumping ground for new patches.
- Prefer editing modular source under `src/css/` and `src/js/` when the build pipeline can carry the change.
- Do not append another override block when an existing token/module can be corrected instead.
- Blogger Customizer `hva.*` variables are the design-token source of truth unless the task explicitly changes that architecture.
- Reuse semantic HVA tokens before introducing new color, spacing, width, radius, or typography constants.
- Prefer deletion or consolidation of obsolete legacy CSS/JS over another compatibility layer once migration is safe.

## Blogger constraints

- Keep the output valid Blogger XML.
- Preserve required Blogger namespaces, `b:*`, `data:*`, and `expr:*` semantics.
- Do not remove or rename Blogger widgets, sections, IDs, or template expressions unless the task explicitly requires it and all callers/usages have been checked.
- Do not convert working Blogger-native behavior into a custom JavaScript implementation without a concrete reason.
- Avoid `document.write`, inline event handlers, and unnecessary dynamic script injection in new code.

## CSS and layout

- Fix the shared selector or token instead of patching individual pages when the root cause is shared.
- Prefer normal cascade and low-specificity selectors; avoid adding `!important` unless required to interoperate with immutable Blogger output.
- Keep responsive behavior mobile-first where practical and reuse existing breakpoints before adding a new breakpoint.
- Preserve readable article width and responsive media behavior.
- Keep keyboard focus, visible focus states, touch targets, and reduced-motion support intact.

## JavaScript

- Prefer native DOM/Web APIs and existing helpers.
- No new dependency when the platform or current code already covers the requirement.
- Fix shared functions rather than each caller independently.
- Avoid global state unless required by Blogger integration.
- Keep scripts progressively enhanced: core content must remain usable if non-essential JavaScript fails.

## SEO, accessibility, and safety

Minimal code must not remove:

- canonical and robots behavior,
- structured/social metadata required by the task,
- keyboard navigation,
- focus visibility,
- accessible labels/semantics,
- validation at trust boundaries,
- error handling that prevents broken builds or data loss.

Accessibility and SEO are correctness requirements, not optional cleanup.

## Validation before completion

For every non-trivial change:

1. Run or rely on the repository check equivalent to `npm run check`.
2. Confirm the build still produces `dist/hocvienads.xml`.
3. Keep the change reviewable and scoped to the requested root cause.
4. Do not merge unrelated cleanup into the same change unless it is required for correctness.

## Review heuristic

Prefer, in order:

- no code,
- reuse,
- native platform feature,
- deletion/consolidation,
- one small shared fix,
- only then a new abstraction or dependency.

When a deliberate simplification has a known ceiling, document the limitation and the upgrade path in a short `ponytail:` comment.

Derived from the engineering principles in DietrichGebert/ponytail, adapted specifically for Blogger and the HVA theme architecture.
