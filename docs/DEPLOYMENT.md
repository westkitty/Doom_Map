# Doom Map — Deployment

## GitHub Pages

The repository contains `.github/workflows/deploy-pages.yml`.

GitHub Pages is enabled in **GitHub Actions workflow mode**, and the public production site is live at:

`https://westkitty.github.io/Doom_Map/`

The production build uses the Vite base `/Doom_Map/`.

## Verified deployment evidence

The deployment blocker recorded during the initial setup has been resolved.

Verified on 2026-09-28:
- GitHub Actions CI run 36447608037 passed TypeScript typecheck, 3/3 WGS84 coordinate tests, and the Vite production build.
- Deploy GitHub Pages run 36448035612 completed successfully.
- The public URL returned HTTP 200 with the expected `<title>Doom Map</title>`.

Local branch browser acceptance now exists (docs/BROWSER_ACCEPTANCE.md).
This does not establish new public Pages deployment. Both workflows use the
committed lockfile with npm ci and run the browser gate before delivery.

## Deployment validation after web-facing changes

For any change merged to `main` that affects the web application:
1. Confirm CI passes.
2. Confirm the Pages build and deploy jobs pass.
3. Load `https://westkitty.github.io/Doom_Map/`.
4. Run the browser acceptance path.
5. Record only the behavior actually observed as verified.

Do not call the application deployed merely because `git push` succeeded.

## Native wrapper

The planned wrapper is Tauri 2 using the same built `dist` artifact.

Do not create a parallel wrapper-specific simulation implementation.

Wrapper validation order:
1. macOS desktop build and launch
2. Android build and launch
3. offline shell
4. network/provider failure states
5. shared scenario import/export parity
6. only then additional platforms if explicitly required

## Branch delivery restriction (verified 2026-09-28)

GitHub environment API reports `github-pages` has a custom deployment branch
policy allowing only `main`. Session work remains on `arena/01a0e93e-doom-map`;
no environment bypass, force push or main push was performed. CI runs on the
branch, but public deployment requires merging its PR to main, followed by the
Pages workflow and live browser smoke. The existing public deployment is not
proof of the new branch revision.
