import assert from "node:assert/strict";
import test from "node:test";
import {
  checkManualMediaSource,
  checkDirectMediaSource,
  isPublicMediaSourceAddress,
} from "./rights.ts";

const mediaUrl = "https://media.example.com/film.mp4";

function createTransport({ addresses = ["93.184.216.34"], responses = [] } = {}) {
  const requests = [];
  let responseIndex = 0;
  return {
    requests,
    transport: {
      async resolve(hostname) {
        assert.ok(hostname);
        return addresses;
      },
      async request(url, address) {
        requests.push({ url: url.href, address });
        return responses[responseIndex++] ?? {
          status: 200,
          contentType: "video/mp4",
          location: null,
        };
      },
    },
  };
}

test("public source address checks reject private and reserved ranges", () => {
  for (const address of [
    "0.1.2.3",
    "10.0.0.1",
    "100.64.0.1",
    "127.0.0.1",
    "169.254.1.2",
    "172.31.255.255",
    "192.168.1.1",
    "198.18.0.1",
    "203.0.113.8",
    "224.0.0.1",
    "::1",
    "fe80::1",
    "fc00::1",
    "::ffff:127.0.0.1",
    "2001:db8::1",
    "2001:0db8:0000:0000:0000:0000:0000:0001",
    "2001:0002::1",
    "2002::1",
  ]) {
    assert.equal(isPublicMediaSourceAddress(address), false, address);
  }
  assert.equal(isPublicMediaSourceAddress("93.184.216.34"), true);
  assert.equal(isPublicMediaSourceAddress("2606:4700:4700::1111"), true);
});

test("source probe accepts a successful direct MP4 response", async () => {
  const { transport, requests } = createTransport();
  assert.equal(await checkDirectMediaSource(mediaUrl, "mp4", transport), null);
  assert.equal(requests.length, 1);
  assert.equal(requests[0].address, "93.184.216.34");
});

test("source probe rejects private DNS results before making a request", async () => {
  const { transport, requests } = createTransport({ addresses: ["93.184.216.34", "127.0.0.1"] });
  const issue = await checkDirectMediaSource(mediaUrl, "mp4", transport);
  assert.match(issue, /public internet addresses/);
  assert.equal(requests.length, 0);
});

test("source probe rejects webpage content and unsuccessful HTTP statuses", async () => {
  const webpage = createTransport({
    responses: [{ status: 200, contentType: "text/html; charset=utf-8", location: null }],
  });
  assert.match(await checkDirectMediaSource(mediaUrl, "mp4", webpage.transport), /supported MP4 media type/);

  const missing = createTransport({
    responses: [{ status: 404, contentType: "text/html", location: null }],
  });
  assert.equal(await checkDirectMediaSource(mediaUrl, "mp4", missing.transport), "The media source returned HTTP 404.");
});

test("source probe follows only bounded safe redirects and rechecks destinations", async () => {
  const privateRedirect = createTransport({
    responses: [{
      status: 302,
      contentType: null,
      location: "https://127.0.0.1/film.mp4",
    }],
  });
  privateRedirect.transport.resolve = async (hostname) =>
    hostname === "127.0.0.1" ? ["127.0.0.1"] : ["93.184.216.34"];
  assert.match(
    await checkDirectMediaSource(mediaUrl, "mp4", privateRedirect.transport),
    /public internet addresses/,
  );
  assert.equal(privateRedirect.requests.length, 1);

  const tooManyRedirects = createTransport({
    responses: Array.from({ length: 5 }, (_, index) => ({
      status: 302,
      contentType: null,
      location: `/film-${index}.mp4`,
    })),
  });
  assert.match(
    await checkDirectMediaSource(mediaUrl, "mp4", tooManyRedirects.transport),
    /redirected too many times/,
  );
  assert.equal(tooManyRedirects.requests.length, 4);
});

test("source probe accepts supported HLS media types and rejects unsafe URL forms", async () => {
  const hlsTransport = createTransport({
    responses: [{
      status: 206,
      contentType: "application/vnd.apple.mpegurl; charset=utf-8",
      location: null,
    }],
  });
  assert.equal(
    await checkDirectMediaSource("https://media.example.com/film.m3u8", "hls", hlsTransport.transport),
    null,
  );

  for (const value of [
    "http://media.example.com/film.mp4",
    "https://user:secret@media.example.com/film.mp4",
    "https://media.example.com:8443/film.mp4",
    "https://localhost/film.mp4",
    "https://metadata.internal/film.mp4",
  ]) {
    assert.ok(await checkDirectMediaSource(value, "mp4", hlsTransport.transport), value);
  }
});

test("manual admin title sources are marked ready only when the direct probe succeeds", async () => {
  const successful = createTransport();
  assert.equal(
    await checkManualMediaSource({ mp4Url: mediaUrl }, successful.transport),
    null,
  );
  assert.equal(successful.requests.length, 1);

  const hls = createTransport({
    responses: [{
      status: 200,
      contentType: "application/vnd.apple.mpegurl",
      location: null,
    }],
  });
  assert.equal(
    await checkManualMediaSource({ hlsUrl: "https://media.example.com/film.m3u8" }, hls.transport),
    null,
  );

  const unavailable = createTransport({
    responses: [{ status: 404, contentType: "text/html", location: null }],
  });
  assert.equal(
    await checkManualMediaSource({ mp4Url: mediaUrl }, unavailable.transport),
    "The media source returned HTTP 404.",
  );
  assert.equal(unavailable.requests.length, 1);
});

test("manual admin title sources reject unsafe destinations and ambiguous source choices", async () => {
  const privateAddress = createTransport({ addresses: ["192.168.1.12"] });
  assert.match(
    await checkManualMediaSource({ mp4Url: mediaUrl }, privateAddress.transport),
    /public internet addresses/,
  );
  assert.equal(privateAddress.requests.length, 0);
  assert.equal(
    await checkManualMediaSource({
      mp4Url: mediaUrl,
      hlsUrl: "https://media.example.com/film.m3u8",
    }),
    "Provide exactly one direct MP4 or HLS source.",
  );
});
