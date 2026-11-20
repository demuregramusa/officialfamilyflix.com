import {
  getGetAdminArchiveSourcesQueryKey,
  useGetAdminArchiveSources,
} from "@workspace/api-client-react";

export function ArchiveSourcePanel({ id }: { id: string }) {
  const sources = useGetAdminArchiveSources(id, {
    query: {
      enabled: Boolean(id),
      queryKey: getGetAdminArchiveSourcesQueryKey(id),
    },
  });

  return (
    <section className="panel" style={{ marginTop: 18 }} data-testid="panel-imported-archive-sources">
      <h2>Private archive source details</h2>
      <p className="helper">
        These catalog and torrent references are internal metadata only. They are not rights evidence,
        are not linked to the player, and remain disabled and unverified.
      </p>
      {sources.isLoading ? <div className="skeleton" style={{ height: 100 }} /> :
        sources.isError ? <p className="form-message error">Private source details could not be loaded.</p> :
          sources.data?.length ? sources.data.map((source) => (
            <details key={`${source.provider}-${source.sourceId}`} className="rights-row">
              <summary style={{ cursor: "pointer" }}>
                <strong>{source.provider} source {source.sourceId}</strong>
                <span className="helper"> · IMDb {source.imdbCode ?? "not supplied"} · {source.torrents.length} stored reference(s)</span>
              </summary>
              <div style={{ width: "100%", paddingTop: 12 }}>
                <p className="helper wrap">Catalog page URL: {source.sourceUrl ?? "Not supplied"}</p>
                <details>
                  <summary className="helper" style={{ cursor: "pointer" }}>Imported metadata (not rights evidence)</summary>
                  <pre className="helper wrap" style={{ whiteSpace: "pre-wrap", maxHeight: 280, overflow: "auto" }}>
                    {JSON.stringify(source.metadata, null, 2)}
                  </pre>
                </details>
                {source.torrents.length > 0 ? (
                  <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table className="data-table">
                      <thead>
                        <tr><th>Quality / type</th><th>Hash</th><th>Size</th><th>Seeds / peers</th><th>Status</th><th>Source URL</th></tr>
                      </thead>
                      <tbody>
                        {source.torrents.map((torrent, index) => (
                          <tr key={`${torrent.infoHash ?? "reference"}-${index}`}>
                            <td>{torrent.quality ?? "Unknown"}<div className="helper">{torrent.sourceType ?? "Type not supplied"}</div></td>
                            <td className="mono wrap">{torrent.infoHash ?? "Not supplied"}</td>
                            <td>{torrent.size ?? "Unknown"}</td>
                            <td>{torrent.seeders ?? "—"} / {torrent.peers ?? "—"}</td>
                            <td><span className="status warn">{torrent.rightsStatus} · {torrent.playbackStatus}</span></td>
                            <td className="mono wrap">{torrent.sourceUrl ?? "Not supplied"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : <p className="helper">No torrent references were present for this source record.</p>}
              </div>
            </details>
          )) : <p className="helper">No archive source records are attached to this title.</p>}
    </section>
  );
}
