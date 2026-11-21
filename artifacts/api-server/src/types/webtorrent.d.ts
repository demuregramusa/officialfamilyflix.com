declare module "webtorrent" {
  interface SeededTorrent {
    infoHash: string;
    files: Array<{
      name: string;
      length: number;
      type: string;
      createReadStream(options?: { start?: number; end?: number }): import("node:stream").Readable;
    }>;
  }

  export default class WebTorrent {
    constructor(options?: Record<string, unknown>);
    torrents: SeededTorrent[];
    on(event: "error", listener: (error: Error) => void): this;
    seed(
      input: string,
      options: Record<string, unknown>,
      callback: (torrent: SeededTorrent) => void,
    ): SeededTorrent;
    destroy(): Promise<void>;
  }
}
