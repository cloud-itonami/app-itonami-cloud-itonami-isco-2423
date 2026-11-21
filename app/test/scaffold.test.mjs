// The scaffold stamps this template into another repository: a cofog
// blueprint with a dotted code exercises the generator, and every template
// file must arrive byte-identical.
import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdirSync } from "node:fs";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { CSP } from "../scripts/build.mjs";
import { ICON_FILES, TEMPLATE_FILES, scaffold } from "../scripts/scaffold.mjs";

const APP = fileURLToPath(new URL("../", import.meta.url));

const BLUEPRINT = `[{:itonami.blueprint/id "cloud-itonami-cofog-03.2"
  :itonami.blueprint/name "Household Consumption"}]
`;

async function stamped() {
  const repo = await mkdtemp(join(tmpdir(), "itonami-scaffold-"));
  await writeFile(join(repo, "blueprint.edn"), BLUEPRINT);
  return repo;
}

test("scaffold writes identity files for a dotted cofog code", async (t) => {
  const repo = await stamped();
  t.after(() => rm(repo, { recursive: true, force: true }));
  const { identity } = await scaffold(repo, { icons: false });
  assert.equal(identity.slug, "cofog032");
  assert.equal(identity.id, "network.itonami.cofog032");

  const pkg = JSON.parse(await readFile(join(repo, "app/package.json"), "utf8"));
  assert.equal(pkg.name, "@itonami/cofog032");
  assert.deepEqual(pkg.itonami, {
    id: "network.itonami.cofog032",
    title: "Household Consumption",
    source: "cloud-itonami-cofog-03.2",
  });
  assert.deepEqual(
    Object.keys(pkg.scripts).sort(),
    ["build", "build:android", "build:desktop", "tauri", "test"],
  );
  assert.equal(pkg.devDependencies["@tauri-apps/cli"], "3.0.0-alpha.6");

  const conf = JSON.parse(await readFile(join(repo, "app/src-tauri/tauri.conf.json"), "utf8"));
  assert.equal(conf.$schema, "https://schema.tauri.app/config/3");
  assert.equal(conf.identifier, "network.itonami.cofog032");
  assert.equal(conf.productName, "Household Consumption");
  assert.equal(conf.app.windows[0].title, "Household Consumption");
  assert.equal(conf.build.frontendDist, "../dist");
  assert.equal(conf.app.withGlobalTauri, true);
  assert.equal(conf.app.security.csp, CSP);
  assert.equal(conf.bundle.active, false);
  assert.equal(conf.bundle.icon.length, 5);

  const svg = await readFile(join(repo, "app/icon/app.svg"), "utf8");
  assert.ok(svg.includes("<svg"));

  for (const name of TEMPLATE_FILES) {
    const want = await readFile(join(APP, name));
    const got = await readFile(join(repo, "app", name));
    assert.ok(got.equals(want), `${name} travels byte-identical`);
  }
  for (const name of ICON_FILES) {
    assert.ok(!existsSync(join(repo, "app/src-tauri/icons", name)), "--no-icons writes no icon");
  }
  const workflow = await readFile(join(repo, ".github/workflows/app.yml"), "utf8");
  assert.ok(workflow.includes("node-version: 22"));
  assert.ok(workflow.includes("npm ci && npm test") || (workflow.includes("npm ci") && workflow.includes("npm test")));
});

test("scaffold keeps an existing workflow and a set version", async (t) => {
  const repo = await stamped();
  t.after(() => rm(repo, { recursive: true, force: true }));
  await mkdir(join(repo, "app"), { recursive: true });
  await writeFile(join(repo, "app/package.json"), JSON.stringify({ version: "0.2.0" }));
  mkdirSync(join(repo, ".github/workflows"), { recursive: true });
  await writeFile(join(repo, ".github/workflows/app.yml"), "custom\n");
  await scaffold(repo, { icons: false });
  assert.equal(await readFile(join(repo, ".github/workflows/app.yml"), "utf8"), "custom\n");
  const pkg = JSON.parse(await readFile(join(repo, "app/package.json"), "utf8"));
  assert.equal(pkg.version, "0.2.0");
  const conf = JSON.parse(await readFile(join(repo, "app/src-tauri/tauri.conf.json"), "utf8"));
  assert.equal(conf.version, "0.2.0");
});
