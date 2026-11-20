import assert from "node:assert/strict";
import test from "node:test";
import { CreateAdminTitleBody } from "../../../../lib/api-zod/src/generated/api.ts";
import { curatedPublicDomainTitles } from "./curated-public-domain-titles.ts";

test("curated Library of Congress titles contain complete, valid rights evidence", () => {
  assert.equal(curatedPublicDomainTitles.length, 3);

  for (const input of curatedPublicDomainTitles) {
    const title = CreateAdminTitleBody.parse(input);
    const [mainVideo] = title.rights.filter((right) => right.assetKind === "main-video");

    assert.ok(mainVideo, `${title.name} must have main-video rights evidence`);
    assert.equal(title.rights.filter((right) => right.assetKind === "main-video").length, 1);
    assert.equal(mainVideo.licenseType, "public-domain");
    assert.equal(mainVideo.territory, "United States only; other territories not assessed");
    assert.match(mainVideo.evidenceNotes ?? "", /public domain and free to use and reuse/i);
    assert.match(mainVideo.assetUrl, /\.m3u8$/);
    assert.equal(title.stream?.provider, "manual");
    assert.equal(title.stream?.hlsUrl, mainVideo.assetUrl);
    assert.equal(title.uploaderAttested, true);
  }
});

test("curated titles stay draft-ready and require separate rights review", () => {
  for (const input of curatedPublicDomainTitles) {
    assert.equal(input.rights[0].uploaderAttested, true);
    assert.ok(input.rights[0].sourceUrl.startsWith("https://www.loc.gov/item/"));
    assert.equal(input.rights[0].sourceUrl, input.rights[0].evidenceUrl);
    assert.ok(input.rights[0].usageRestrictions.length > 0);
  }
});
