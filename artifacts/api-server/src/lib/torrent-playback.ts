import { mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { Readable } from "node:stream";
import WebTorrent from "webtorrent";
import {
  isTorrentPlaybackEligible,
  isValidTorrentInfoHash,
  type TorrentRightsState,
} from "./torrent-source-policy.mjs";

type TorrentFile = {
  name: string;
  length: number;
  type: string;
  createReadStream(options?: { start?: number; end?: number }): Readable;
};

type Torrent = {
  infoHash: string;
  files: TorrentFile[];
  once(event: "error", listener: (error: Error) => void): Torrent;
  removeListener(event: "error", listener: (error: Error) => void): Torrent;
  destroy?(error?: Error): void;
};

export type TorrentClient = {
  torrents: Torrent[];
  add(
    magnetUri: string,
    options: Record<string, unknown>,
    callback: (torrent: Torrent) => void,
  ): Torrent;
  on(event: "error", listener: (error: Error) => void): TorrentClient;
  remove?(
    infoHash: string,
    options?: { destroyStore?: boolean },
  ): Promise<void>;
};

type TorrentSource = TorrentRightsState & {
  id: string;
  sourceUrl?: string | null;
};

const metadataWaitMs = 1_000;
const torrentPath = path.join(os.tmpdir(), "familyflix-torrents");
const defaultTrackers = [
  "udp://tracker.opentrackr.org:1337/announce",
  "udp://open.stealth.si:80/announce",
  "udp://tracker.torrent.eu.org:451/announce",
  "udp://tracker.bittor.pw:1337/announce",
  "udp://public.tracker.virenkuil.com:6969/announce",
  "udp://tracker.dler.org:6969/announce",
  "udp://explodie.org:6969/announce",
  "http://tracker.opentrackr.org:1337/announce",
  "wss://tracker.openwebtorrent.com",
  "wss://tracker.btorrent.xyz",
];
let handleTorrentClientError = (_error: Error) => {};
let defaultTorrentPlayback: ReturnType<typeof createTorrentPlayback> | null = null;

export function setTorrentClientErrorHandler(handler: (error: Error) => void): void {
  handleTorrentClientError = handler;
}

function playableMp4File(torrent: Torrent): TorrentFile | null {
  return torrent.files
    .filter((file) => file.length > 0 && file.type === "video/mp4" && /\.mp4$/i.test(file.name))
    .sort((left, right) => right.length - left.length)[0] ?? null;
}

export interface TorrentMediaFile {
  name: string;
  length: number;
  contentType: "video/mp4";
  createReadStream(options?: { start?: number; end?: number }): Readable;
  sourceId: string;
}

export function parseSingleByteRange(value: string | undefined, size: number) {
  if (!value) return { start: 0, end: size - 1, partial: false };
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return null;
  let start: number;
  let end: number;
  if (!match[1]) {
    const suffixLength = Number(match[2]);
    if (!Number.isSafeInteger(suffixLength) || suffixLength < 1) return null;
    start = Math.max(0, size - suffixLength);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] ? Number(match[2]) : size - 1;
  }
  if (
    !Number.isSafeInteger(start) ||
    !Number.isSafeInteger(end) ||
    start < 0 ||
    start >= size ||
    end < start
  ) return null;
  return { start, end: Math.min(end, size - 1), partial: true };
}

export function createTorrentPlayback(
  client: TorrentClient,
  options: { metadataWaitMs?: number } = {},
) {
  const waitMs = options.metadataWaitMs ?? metadataWaitMs;
  const streamsBySource = new Map<string, Set<Readable>>();
  const infoHashBySource = new Map<string, string>();
  const generationBySource = new Map<string, number>();

  async function removeTorrentIfUnused(infoHash: string): Promise<void> {
    if ([...infoHashBySource.values()].some((activeHash) => activeHash === infoHash)) return;
    const torrent = client.torrents.find(
      (item) => item.infoHash.toLowerCase() === infoHash.toLowerCase(),
    );
    if (!torrent) return;
    if (client.remove) {
      await client.remove(infoHash, { destroyStore: true }).catch(handleTorrentClientError);
    } else {
      torrent.destroy?.();
    }
  }

  async function getTorrent(infoHash: string): Promise<Torrent> {
    const existing = client.torrents.find(
      (torrent) => torrent.infoHash.toLowerCase() === infoHash.toLowerCase(),
    );
    if (existing?.files.length) return existing;

    await mkdir(torrentPath, { recursive: true });
    return new Promise<Torrent>((resolve, reject) => {
      let settled = false;
      let timer: NodeJS.Timeout;
      const finish = (error: Error | null, torrent?: Torrent) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (torrent) torrent.removeListener("error", onError);
        if (error) reject(error);
        else if (torrent) resolve(torrent);
        else reject(new Error("Torrent metadata was unavailable."));
      };
      const onError = (error: Error) => finish(error);
      timer = setTimeout(() => finish(new Error("Torrent metadata was unavailable.")), waitMs);

      try {
        const trackerQuery = defaultTrackers.map((tr) => `&tr=${encodeURIComponent(tr)}`).join("");
        const magnetUri = `magnet:?xt=urn:btih:${infoHash}${trackerQuery}`;
        const torrent = client.add(magnetUri, {
          path: torrentPath,
          announce: defaultTrackers,
          uploads: false,
          strategy: "sequential",
        }, (readyTorrent) => finish(null, readyTorrent));
        torrent.once("error", onError);
        if (torrent.files.length) finish(null, torrent);
      } catch (error) {
        finish(error instanceof Error ? error : new Error("Torrent metadata was unavailable."));
      }
    });
  }

  async function openApprovedTorrentMedia(source: TorrentSource): Promise<TorrentMediaFile> {
    if (!isTorrentPlaybackEligible(source, true) || !isValidTorrentInfoHash(source.infoHash)) {
      throw new Error("This torrent source is not approved for playback.");
    }

    const infoHash = source.infoHash;
    const generation = generationBySource.get(source.id) ?? 0;
    infoHashBySource.set(source.id, infoHash);
    try {
      const torrent = await getTorrent(infoHash);
      if ((generationBySource.get(source.id) ?? 0) !== generation) {
        throw new Error("This torrent source is no longer active.");
      }
      const file = playableMp4File(torrent);
      if (!file) throw new Error("No supported MP4 video is available in this torrent.");
      return {
        name: file.name,
        length: file.length,
        contentType: "video/mp4",
        sourceId: source.id,
        createReadStream: (options) => {
          if ((generationBySource.get(source.id) ?? 0) !== generation) {
            throw new Error("This torrent source is no longer active.");
          }
          const stream = file.createReadStream(options);
          const openStreams = streamsBySource.get(source.id) ?? new Set<Readable>();
          openStreams.add(stream);
          streamsBySource.set(source.id, openStreams);
          stream.once("close", () => {
            openStreams.delete(stream);
            if (!openStreams.size) streamsBySource.delete(source.id);
          });
          return stream;
        },
      };
    } catch (error) {
      if (infoHashBySource.get(source.id) === infoHash) infoHashBySource.delete(source.id);
      await removeTorrentIfUnused(infoHash);
      throw error;
    }
  }

  async function stopTorrentSourceStreams(sourceId: string): Promise<void> {
    generationBySource.set(sourceId, (generationBySource.get(sourceId) ?? 0) + 1);
    for (const stream of streamsBySource.get(sourceId) ?? []) {
      stream.destroy(new Error("This torrent source is no longer active."));
    }
    streamsBySource.delete(sourceId);
    const infoHash = infoHashBySource.get(sourceId);
    infoHashBySource.delete(sourceId);
    if (infoHash) await removeTorrentIfUnused(infoHash);
  }

  return { openApprovedTorrentMedia, stopTorrentSourceStreams };
}

function getDefaultTorrentPlayback() {
  if (defaultTorrentPlayback) return defaultTorrentPlayback;
  const client = new WebTorrent({
    dht: true,
    lsd: false,
    natPmp: false,
    natUpnp: false,
    seedOutgoingConnections: false,
    tracker: {},
  }) as unknown as TorrentClient;
  client.on("error", (error) => handleTorrentClientError(error));
  defaultTorrentPlayback = createTorrentPlayback(client);
  return defaultTorrentPlayback;
}

export function openApprovedTorrentMedia(source: TorrentSource): Promise<TorrentMediaFile> {
  return getDefaultTorrentPlayback().openApprovedTorrentMedia(source);
}

export async function stopTorrentSourceStreams(sourceId: string): Promise<void> {
  await defaultTorrentPlayback?.stopTorrentSourceStreams(sourceId);
}
