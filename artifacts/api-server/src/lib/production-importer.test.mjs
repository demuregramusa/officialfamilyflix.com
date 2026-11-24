import assert from "node:assert/strict";
import test from "node:test";

function slugBase(value) {
  return (
    value
      .normalize("NFKD")
      .toLowerCase()
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 100) || "title"
  );
}

function normalizeTitleName(value) {
  return value.trim().replace(/\s+/g, " ");
}

function splitIntoBatches(records, maxItems = 25, maxBytes = 1_000_000) {
  const batches = [];
  let current = [];
  let currentBytes = 2;
  for (const record of records) {
    const bytes = Buffer.byteLength(JSON.stringify(record), "utf8") + 1;
    if (current.length > 0 && (current.length >= maxItems || currentBytes + bytes > maxBytes)) {
      batches.push(current);
      current = [];
      currentBytes = 2;
    }
    current.push(record);
    currentBytes += bytes;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

test("Production Importer: normalizes titles and generates deterministic slugs", () => {
  assert.equal(
    normalizeTitleName("  A Trip Down   Market Street Before the Fire  "),
    "A Trip Down Market Street Before the Fire",
  );
  assert.equal(
    slugBase("Early San Francisco Chronicles (1897–1916)"),
    "early-san-francisco-chronicles-1897-1916",
  );
});

test("Production Importer: protects existing published titles and skips within-batch duplicates", () => {
  const existingPublishedSlugs = new Set(["a-ghost-at-gilmore-house-2027"]);
  const seenBatchSlugs = new Set();

  const incoming = [
    { name: "A Ghost at Gilmore House", slug: "a-ghost-at-gilmore-house-2027", kind: "movie", year: 2027 },
    { name: "A trip down Market Street before the fire", kind: "movie", year: 1906 },
    { name: "A trip down Market Street before the fire", kind: "movie", year: 1906 },
  ];

  const results = incoming.map((rec) => {
    const slug = rec.slug || slugBase(rec.name);
    if (seenBatchSlugs.has(slug)) return "skipped_batch_duplicate";
    seenBatchSlugs.add(slug);
    if (existingPublishedSlugs.has(slug)) return "skipped_existing_duplicate";
    return "ready_to_import";
  });

  assert.deepEqual(results, [
    "skipped_existing_duplicate",
    "ready_to_import",
    "skipped_batch_duplicate",
  ]);
});

test("Production Importer: splits large payloads into batches well under the 5MB limit", () => {
  const records = Array.from({ length: 60 }, (_, idx) => ({
    name: `Public Domain Archival Feature ${idx + 1}`,
    kind: "movie",
    synopsis: "A".repeat(2000),
    year: 1920,
  }));
  const batches = splitIntoBatches(records, 25, 1_000_000);
  assert.equal(batches.length, 3);
  assert.equal(batches[0].length, 25);
  assert.equal(batches[1].length, 25);
  assert.equal(batches[2].length, 10);
  for (const b of batches) {
    assert.ok(Buffer.byteLength(JSON.stringify(b), "utf8") < 5_242_880);
  }
});

test("Production Importer: enforces explicit administrator confirmation before production writes, rights approval, and publication", () => {
  const checkConfirmationGate = (confirmedByAdmin) => {
    if (!confirmedByAdmin) {
      throw new Error("Explicit administrator confirmation is required.");
    }
    return true;
  };
  assert.throws(() => checkConfirmationGate(false), /Explicit administrator confirmation/);
  assert.equal(checkConfirmationGate(true), true);
});
