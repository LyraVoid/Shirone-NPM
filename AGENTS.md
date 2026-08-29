# Agent notes — shirones pipeline

## Ground rules

1. **Never add theme source to this repository.** All components, layouts,
   pages, config defaults and the Astro Integration live in
   `LyraVoid/Shirone` under `src/` and `src/integration/`. This repo only
   transforms and publishes them.
2. `workspace/`, `dist/`, `.upstream/` and `.validate/` are generated. They are
   git-ignored and safe to delete at any time.
3. Scripts are plain Node ESM (`.mjs`). Do not write TypeScript syntax in
   `.mjs` files — Node will refuse to parse it.
4. Anything imported by an injected route must end up in the package's
   `dependencies`, never `devDependencies`. `build-package.mjs` warns about
   undeclared bare imports; treat those warnings as errors.

## Where things live

| Concern | File |
| --- | --- |
| Upstream repo/ref, package name, excluded deps | `scripts/config.mjs` |
| Version selection | `scripts/resolve-version.mjs` |
| Import rewriting for the user-facing template | `scripts/prepare-templates.mjs` |
| Bundling + `package.json` generation | `scripts/build-package.mjs` |
| Route/override manifest | `scripts/generate-manifest.mjs` |
| End-to-end install test | `scripts/validate.mjs` |
| CI | `.github/workflows/publish.yml` |

## Documentation

Keep these current when behaviour changes; they are what a human reads before
touching the pipeline:

| File | Scope |
| --- | --- |
| `README.md` | Overview and the map of everything else |
| `docs/releasing.md` | Release procedure and the meaning of each workflow input |
| `docs/pipeline.md` | The five scripts in detail, rewrite rules, env vars |
| `docs/troubleshooting.md` | Failures already diagnosed — add to it rather than rediscovering |
| `PACKAGE_README.md` | Shipped to npm; user-facing, not maintainer-facing |

The theme-side counterpart is `docs/packaging-contract.md` upstream. When a rule
here constrains how theme code must be written, it belongs there too.

## CI

Manual dispatch only — the push trigger was removed on purpose so that editing
this repository never publishes. `pnpm/setup@v2` (not `pnpm/action-setup`)
installs pnpm 11 plus Node in one step; the publish job still uses
`actions/setup-node` because it needs `registry-url` to write the auth `.npmrc`.

The published version is **not** the theme's version: `resolve-version.mjs`
patch-bumps the latest release on npm, or takes the workflow's version input,
and fails if that version already exists. The pnpm store is pinned with
`PNPM_CONFIG_STORE_DIR` and cached with a key hashing the synced theme's
lockfile, which is why the cache step sits after `pnpm sync`.

## Route patterns

`generate-manifest.mjs` reimplements the route-pattern derivation from
`src/integration/routes.ts` upstream. If one changes, change both.

## Local run

```sh
pnpm install
pnpm sync
pnpm templates
pnpm build
pnpm manifest
SHIRONES_VALIDATE_BUILD=0 pnpm validate   # full build needs ~4 GB RAM
```

## Switching the upstream repo / branch / package name

Nothing is hardcoded in more than one place. Every knob lives in
`scripts/config.mjs` and can be overridden by an environment variable, and the
three that change most often are also `workflow_dispatch` inputs:

| What | Env var | Workflow input | Default |
| --- | --- | --- | --- |
| Theme repository | `SHIRONES_UPSTREAM_REPO` | `upstream-repo` | `https://github.com/LyraVoid/Shirone.git` |
| Branch or tag to package | `SHIRONES_UPSTREAM_REF` | `ref` | `main` |
| Published package name | `SHIRONES_PACKAGE_NAME` | `package-name` | `shirones` |
| Author in package.json | `SHIRONES_PACKAGE_AUTHOR` | — | `yCENzh` |
| Repo recorded for provenance | `SHIRONES_PACKAGE_REPOSITORY` | — | this repository |

A one-off run against a different fork or branch needs no commit — just pass the
inputs when dispatching the workflow. To change it permanently, edit the
defaults in `scripts/config.mjs` (and the `env:` block of
`.github/workflows/publish.yml`, which feeds the dispatch inputs).

Renaming the repository itself needs nothing: provenance reads
`GITHUB_REPOSITORY` at build time.
