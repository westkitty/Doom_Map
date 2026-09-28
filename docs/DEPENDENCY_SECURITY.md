# Dependency security evidence — 2026-09-28

The first audit found inherited development-tool advisories: Vite high, Vitest
critical, and @vitest/mocker moderate. Production dependencies had no findings.

This is a **targeted security update**, not a framework migration:
- Vite 6.2.3 → 6.4.3 (same major; fixes reported dev-server advisories).
- Vitest 3.2.4 → 3.2.7 (same major; fixes reported critical UI-server advisory).
- Three.js, TypeScript and their type pins remain unchanged.

An attempted Vitest 4.1.11 install hit npm 10.9.8 Arborist's `edgesOut` null
exception while resolving optional peers. It did not modify package metadata.
Rather than force/override peers or add unneeded packages, the validated same-major
updates above were retained. A future isolated test-tool update can resolve the
remaining issue.

After clean `npm ci`:
- `npm audit --omit=dev`: **0 vulnerabilities**.
- `npm audit`: **2 moderate findings**, Vitest and its @vitest/mocker dependency,
  GHSA-82fw-gwwq-j7x9. No high/critical findings remain in the returned report.
- Typecheck, 30 unit tests, production build, 10 Chromium browser tests pass.

Do not publicly expose Vitest's dev/mock/UI server. Current tests use `vitest run`;
the static Pages artifact does not contain or run Vitest. This is mitigation, not
a claim that the remaining advisory is fixed. No blanket "audit clean" claim.
