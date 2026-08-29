/**
 * Step 1 — clone the upstream Shirone theme into `workspace/`.
 *
 * The upstream repository is the single source of truth: no theme source is
 * ever edited in this repository.
 */

import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { UPSTREAM_REF, UPSTREAM_REPO } from "./config.mjs";

const UPSTREAM_DIR = resolve(".upstream");
const WORKSPACE_DIR = resolve("workspace");

const ref = process.argv[2] || UPSTREAM_REF;

console.log(`[sync] ${UPSTREAM_REPO}@${ref}`);

await rm(UPSTREAM_DIR, { recursive: true, force: true });

execFileSync(
	"git",
	["clone", "--depth", "1", "--branch", ref, UPSTREAM_REPO, UPSTREAM_DIR],
	{ stdio: "inherit" },
);

const sha = execFileSync("git", ["rev-parse", "HEAD"], {
	cwd: UPSTREAM_DIR,
	encoding: "utf8",
}).trim();
console.log(`[sync] upstream sha ${sha}`);

await rm(WORKSPACE_DIR, { recursive: true, force: true });
await mkdir(WORKSPACE_DIR, { recursive: true });

// Copy the whole checkout except VCS metadata; individual steps pick what they
// need. This keeps the pipeline resilient to new upstream directories.
await cp(UPSTREAM_DIR, WORKSPACE_DIR, {
	recursive: true,
	filter: (source) => !source.includes(`${UPSTREAM_DIR}/.git/`),
});

await rm(join(WORKSPACE_DIR, ".git"), { recursive: true, force: true });
await writeFile(join(WORKSPACE_DIR, ".synced-sha"), sha, "utf8");
await writeFile(join(WORKSPACE_DIR, ".synced-ref"), ref, "utf8");

if (!existsSync(join(WORKSPACE_DIR, "src/integration/index.ts"))) {
	console.error(
		"[sync] ✗ workspace/src/integration/index.ts is missing.\n" +
			`  The upstream ref "${ref}" does not contain the Astro Integration.\n` +
			"  Point SHIRONES_UPSTREAM_REF at the branch that does.",
	);
	process.exit(1);
}

await rm(UPSTREAM_DIR, { recursive: true, force: true });
console.log("[sync] done");
