# Shirone-NPM — build & publish pipeline

This repository packages the [Shirone](https://github.com/LyraVoid/Shirone) Astro
theme as an npm package. **It contains no theme source**: everything is pulled
from upstream at build time, so the theme has exactly one source of truth.

This repo is the build & publish pipeline only.

```text
LyraVoid/Shirone (theme + src/integration/)
        │  git clone --branch $SHIRONES_UPSTREAM_REF
        ▼
   workspace/                     synced checkout
        │
        ├─ prepare-templates.mjs  → dist/template/   (what `init` copies)
        ├─ build-package.mjs      → dist/            (the npm tarball)
        ├─ generate-manifest.mjs  → dist/manifest.json
        └─ validate.mjs           → real install + init + astro build
        │
        ▼
   npm publish  (GitHub Actions, provenance enabled)
```

## Pipeline steps

| Script | Purpose |
| --- | --- |
| `pnpm version:next` | Decide the version to publish (patch bump, or an explicit one) |
| `pnpm sync` | Clone the upstream theme into `workspace/` |
| `pnpm templates` | Build `dist/template/`, rewriting imports for the user layout |
| `pnpm build` | Bundle the integration, copy theme source, write `package.json` |
| `pnpm manifest` | Emit the route/override manifest |
| `pnpm validate` | Install into a scratch project, run `init`, then `astro build` |

Run the whole thing with `pnpm all`.

## Documentation

| Document | What it covers |
| --- | --- |
| [docs/releasing.md](docs/releasing.md) | How to cut a release, what each workflow input means, promoting to the production package name |
| [docs/pipeline.md](docs/pipeline.md) | What each of the five scripts does, the import-rewrite rules, the dependency rules, every env var |
| [docs/troubleshooting.md](docs/troubleshooting.md) | Failures that have actually happened here and what they meant |
| [AGENTS.md](AGENTS.md) | Conventions for automated contributors |
| [PACKAGE_README.md](PACKAGE_README.md) | The README shipped to npm, i.e. what users read |

The theme side of the two-mode design is documented upstream in
[`docs/npm-package-mode.md`](https://github.com/LyraVoid/Shirone/blob/main/docs/npm-package-mode.md),
including the packaging contract every new piece of theme code has to respect.

## Configuration

`scripts/config.mjs` holds everything environment-specific; the values used
most often can be overridden with an env var (full list in
[docs/pipeline.md](docs/pipeline.md#configuration)):

| Variable | Default | Meaning |
| --- | --- | --- |
| `SHIRONES_UPSTREAM_REPO` | `https://github.com/LyraVoid/Shirone.git` | Theme repository |
| `SHIRONES_UPSTREAM_REF` | `main` | Branch/tag to package |
| `SHIRONES_PACKAGE_NAME` | `shirones` | Published package name |
| `SHIRONES_VALIDATE_BUILD` | `1` | Set to `0` to skip the Astro build during validation |

The GitHub repository is named **Shirone-NPM**; `SHIRONES_PACKAGE_NAME` controls
only the **npm** package name (default `shirones`) and can be changed to publish
under a different name.

## Publishing

**Manual only** — there is no push trigger, so nothing here publishes by
accident. GitHub → Actions → **Build & Publish** → **Run workflow**, defaults
untouched, is the standard release: the next version is a patch bump of the
latest release on npm, and the version input overrides it when a release needs
a minor, a major or a prerelease. A version that already exists fails the run.
Publishing uses `npm publish --provenance` with `NPM_TOKEN`.

See [docs/releasing.md](docs/releasing.md) for the dispatch inputs and when
they are worth changing.

## Why the theme is not vendored here

Keeping the source upstream means:

- contributors only ever edit one repository;
- the package version always tracks the theme version;
- `workspace/` and `dist/` stay disposable and are `.gitignore`d.

## Authors & acknowledgments

- **Upstream theme** — [Shirone](https://github.com/LyraVoid/Shirone) by
  [LyraVoid](https://github.com/LyraVoid). All theme source, design and the
  two-mode packaging contract live there; this repository ships none of it.
- **Build pipeline** — designed and originally maintained by
  [yCENzh](https://github.com/yCENzh) in
  [yCENzh/Shirones](https://github.com/yCENzh/Shirones), the personal repo this
  one grew out of.
- **This repository** — `Shirone-NPM`, the pipeline carried forward under the
  organization after the move from the personal repo.
