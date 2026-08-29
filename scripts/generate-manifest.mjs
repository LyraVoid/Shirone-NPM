/**
 * Step 4 — emit `dist/manifest.json`.
 *
 * The manifest documents what the package injects: every route, every
 * overridable component, and every config module a user may shadow. It is both
 * a debugging aid and the data source for the override documentation.
 */

import { existsSync } from "node:fs";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { CONTENT_ROOT, PACKAGE_NAME } from "./config.mjs";

const DIST_DIR = resolve("dist");
const SRC_DIR = join(DIST_DIR, "src");

/** Mirror of `src/integration/routes.ts` — keep the two in sync. */
function toRoutePattern(relativePath) {
	let route = relativePath.replace(/\\/g, "/");
	route = route.replace(/\.(astro|ts|js|mdx|md)$/, "");
	route = route.replace(/(^|\/)index$/, "");
	if (!route.startsWith("/")) route = `/${route}`;
	return route === "/" ? "/" : route.replace(/\/+$/, "");
}

async function walk(dir, predicate) {
	if (!existsSync(dir)) return [];
	const found = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name.startsWith("_")) continue;
			found.push(...(await walk(full, predicate)));
		} else if (predicate(entry.name)) {
			found.push(full);
		}
	}
	return found;
}

const PAGE_EXTENSIONS = [".astro", ".ts", ".js", ".md", ".mdx"];

/** Documentation that lives alongside pages but must never become a route. */
const DOC_FILENAMES = new Set([
	"AGENTS.md",
	"README.md",
	"CONTRIBUTING.md",
	"LICENSE.md",
]);

const pagesDir = join(SRC_DIR, "pages");
const pageFiles = await walk(
	pagesDir,
	(name) =>
		!name.startsWith("_") &&
		!name.endsWith(".d.ts") &&
		!DOC_FILENAMES.has(name) &&
		PAGE_EXTENSIONS.includes(extname(name)),
);

const routes = pageFiles
	.map((file) => {
		const rel = relative(pagesDir, file).replace(/\\/g, "/");
		return { pattern: toRoutePattern(rel), source: `src/pages/${rel}` };
	})
	.sort((a, b) => a.pattern.localeCompare(b.pattern));

/**
 * Overridable components. The key is what a user mirrors under
 * `src/components/` in their own project.
 */
async function collectOverridables(dir, prefix) {
	const files = await walk(dir, (name) => [".astro", ".svelte"].includes(extname(name)));
	return files
		.map((file) => {
			const rel = relative(dir, file).replace(/\\/g, "/");
			return {
				key: `${prefix}${rel.replace(/\.(astro|svelte)$/, "")}`,
				overrideWith: `src/${prefix ? "layouts" : "components"}/${rel}`,
			};
		})
		.sort((a, b) => a.key.localeCompare(b.key));
}

const components = await collectOverridables(join(SRC_DIR, "components"), "");
const layouts = await collectOverridables(join(SRC_DIR, "layouts"), "layouts/");

// Config modules a user can shadow in `<CONTENT_ROOT>/config/`.
const configDir = join(SRC_DIR, "config");
const configModules = (
	await walk(configDir, (name) => extname(name) === ".ts" && name !== "index.ts")
)
	.map((file) => relative(configDir, file).replace(/\\/g, "/").replace(/\.ts$/, ""))
	.sort();

const dataDir = join(SRC_DIR, "data");
const dataModules = (await walk(dataDir, (name) => extname(name) === ".ts"))
	.map((file) => relative(dataDir, file).replace(/\\/g, "/").replace(/\.ts$/, ""))
	.sort();

const pkg = JSON.parse(await readFile(join(DIST_DIR, "package.json"), "utf8"));

const manifest = {
	package: PACKAGE_NAME,
	version: pkg.version,
	contentRoot: CONTENT_ROOT,
	routes,
	overrides: {
		components,
		layouts,
		config: configModules.map((name) => ({
			key: name,
			overrideWith: `${CONTENT_ROOT}/config/${name}.ts`,
		})),
		data: dataModules.map((name) => ({
			key: name,
			overrideWith: `${CONTENT_ROOT}/config/data/${name}.ts`,
		})),
	},
	counts: {
		routes: routes.length,
		components: components.length,
		layouts: layouts.length,
		config: configModules.length,
		data: dataModules.length,
	},
};

await writeFile(
	join(DIST_DIR, "manifest.json"),
	`${JSON.stringify(manifest, null, 2)}\n`,
	"utf8",
);

console.log("[manifest] dist/manifest.json");
for (const [key, value] of Object.entries(manifest.counts)) {
	console.log(`  ${key.padEnd(11)} ${value}`);
}
