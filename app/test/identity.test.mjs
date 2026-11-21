// Identity comes from blueprint.edn; every name below is an inline fixture
// except the refusal shapes, which hold for all series repositories.
import { test } from "node:test";
import assert from "node:assert/strict";
import { deriveIdentity, readBlueprint } from "../scripts/identity.mjs";

const edn = (id, name) => `[{:itonami.blueprint/id "${id}"\n  :itonami.blueprint/name "${name}"}]`;

test("isco blueprint gives the pilot identity", () => {
  const identity = deriveIdentity(readBlueprint(edn("cloud-itonami-isco-2423", "Community Careers Practice")));
  assert.equal(identity.source, "cloud-itonami-isco-2423");
  assert.equal(identity.scheme, "isco");
  assert.equal(identity.code, "2423");
  assert.equal(identity.slug, "isco2423");
  assert.equal(identity.id, "network.itonami.isco2423");
  assert.equal(identity.title, "Community Careers Practice");
  assert.equal(identity.classification, "ISCO-08 2423");
  assert.equal(identity.stateSchema, "itonami.series.isco2423.v1");
});

test("cofog code with a dot loses the dot in slug and id", () => {
  const identity = deriveIdentity(readBlueprint(edn("cloud-itonami-cofog-03.2", "Household Consumption")));
  assert.equal(identity.scheme, "cofog");
  assert.equal(identity.code, "03.2");
  assert.equal(identity.slug, "cofog032");
  assert.equal(identity.id, "network.itonami.cofog032");
  assert.equal(identity.classification, "COFOG 03.2");
  assert.equal(identity.stateSchema, "itonami.series.cofog032.v1");
});

test("refusals fail closed instead of guessing a name", () => {
  assert.throws(() => deriveIdentity(readBlueprint(edn("cloud-itonami-foo-1", "Whatever"))), /not a classification-series/);
  assert.throws(() => deriveIdentity(readBlueprint(edn("cloud-itonami-isco-2423", ""))), /no :itonami.blueprint\/name/);
  assert.throws(() => deriveIdentity(readBlueprint(`[{:itonami.blueprint/id "cloud-itonami-isco-2423"}]`)), /blueprint has no/);
  assert.throws(() => deriveIdentity(readBlueprint(edn("cloud-itonami-isco-2423", "a/b"))), /not usable as a product name/);
  assert.throws(() => readBlueprint(`[{:other/id "x"}]`), /exactly one blueprint map/);
  assert.throws(() => readBlueprint(edn("cloud-itonami-isco-2423", "A") + "\n" + edn("cloud-itonami-isco-2424", "B")), /exactly one blueprint map/);
});
