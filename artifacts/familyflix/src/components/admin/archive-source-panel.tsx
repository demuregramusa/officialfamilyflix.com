import {
  getGetAdminArchiveSourcesQueryKey,
  useReviewImportedTorrentRights,
  useSetImportedTorrentPlayback,
  useGetAdminArchiveSources,
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import type { FormEvent } from "react";
import { useState } from "react";

export function ArchiveSourcePanel({ id }: { id: string }) {
  const queryClient = useQueryClient();
  const review = useReviewImportedTorrentRights();
  const playback = useSetImportedTorrentPlayback();
  const [message, setMessage] = useState("");
  const sources = useGetAdminArchiveSources(id, {
    query: {
      enabled: Boolean(id),
      queryKey: getGetAdminArchiveSourcesQueryKey(id),
    },
  });

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: getGetAdminArchiveSourcesQueryKey(id) });
  }

  function reviewSource(event: FormEvent<HTMLFormElement>, torrentId: string) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const decision = submitter?.value as "approve" | "reject" | "restrict" | undefined;
    if (!decision) {
      setMessage("Choose an explicit rights decision.");
      return;
    }
    review.mutate({
      id,
      torrentId,
      data: {
        decision,
        evidenceUrl: String(form.get("evidenceUrl")).trim(),
        evidenceNotes: String(form.get("evidenceNotes")).trim(),
        reviewerNote: String(form.get("reviewerNote")).trim(),
      },
    }, {
      onSuccess: () => {
        refresh();
        setMessage("Rights decision saved. Activate a source separately after approval.");
      },
      onError: (error) => setMessage(error instanceof Error ? error.message : "Rights review could not be saved."),
    });
  }

  function setSourcePlayback(torrentId: string, active: boolean) {
    const action = active ? "activate this source and allow public playback" : "deactivate it and stop current playback";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    playback.mutate({ id, torrentId, data: { active } }, {
      onSuccess: () => {
        refresh();
        setMessage(active ? "Source activated for approved playback." : "Source deactivated.");
      },
      onError: (error) => setMessage(error instanceof Error ? error.message : "Playback state could not be changed."),
    });
  }

  return (
    <section className="panel" style={{ marginTop: 18 }} data-testid="panel-imported-archive-sources">
      <h2>Imported torrent source review</h2>
      <p className="helper">
        Imported metadata is not proof of distribution rights. Review independent evidence for the
        complete work and this exact source. Torrent locators stay on the server and are never sent
        to the browser. Approval and public activation are separate decisions.
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
                  <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
                    {source.torrents.map((torrent) => (
                      <article className="rights-row" key={torrent.id} data-testid={`row-torrent-source-${torrent.id}`}>
                        <div style={{ width: "100%" }}>
                          <div className="form-actions" style={{ justifyContent: "space-between", marginTop: 0 }}>
                            <strong>{torrent.quality ?? "Unknown quality"} · {torrent.sourceType ?? "Torrent"}</strong>
                            <span className={`status ${torrent.rightsStatus === "approved" && torrent.playbackStatus === "active" ? "good" : "warn"}`}>
                              {torrent.rightsStatus} · {torrent.playbackStatus}
                            </span>
                          </div>
                          <p className="helper mono wrap">Info hash: {torrent.infoHash ?? "Missing or invalid"}</p>
                          <p className="helper">
                            {torrent.size ?? "Size unknown"} · {torrent.videoCodec ?? "Codec unknown"} ·
                            {" "}{torrent.audioChannels ?? "Audio unknown"} · {torrent.seeders ?? "—"} seeders / {torrent.peers ?? "—"} peers
                          </p>
                          <p className="helper">Private source locator remains server-side; the imported URL is not shown or sent to this page.</p>
                          {torrent.rightsEvidenceUrl && (
                            <p className="helper">
                              Rights evidence: <a href={torrent.rightsEvidenceUrl} target="_blank" rel="noreferrer">open evidence ↗</a>
                              {torrent.rightsReviewedAt ? ` · reviewed ${new Date(torrent.rightsReviewedAt).toLocaleString()}` : ""}
                            </p>
                          )}
                          {torrent.rightsEvidenceNotes && <p className="helper wrap">{torrent.rightsEvidenceNotes}</p>}
                          {torrent.rightsReviewNote && <p className="helper wrap">Reviewer note: {torrent.rightsReviewNote}</p>}
                          <form className="panel" style={{ marginTop: 12 }} onSubmit={(event) => reviewSource(event, torrent.id)}>
                            <h3>Review rights evidence</h3>
                            <p className="helper">Confirm that the evidence authorizes distribution of the complete work through this source. Metadata or a hash alone is not evidence.</p>
                            <div className="field-grid">
                              <div className="field full">
                                <label>Independent evidence URL</label>
                                <input name="evidenceUrl" type="url" required placeholder="https://rights-holder.example/permission" data-testid={`input-torrent-evidence-url-${torrent.id}`} />
                              </div>
                              <div className="field full">
                                <label>What the evidence establishes</label>
                                <textarea name="evidenceNotes" required minLength={20} maxLength={4000} data-testid={`input-torrent-evidence-notes-${torrent.id}`} />
                              </div>
                              <div className="field full">
                                <label>Reviewer note</label>
                                <textarea name="reviewerNote" required minLength={1} maxLength={4000} data-testid={`input-torrent-review-note-${torrent.id}`} />
                              </div>
                            </div>
                            <div className="form-actions">
                              <button className="button" type="submit" name="decision" value="approve" disabled={review.isPending} data-testid={`button-approve-torrent-${torrent.id}`}>Approve evidence</button>
                              <button className="button-secondary" type="submit" name="decision" value="restrict" disabled={review.isPending} data-testid={`button-restrict-torrent-${torrent.id}`}>Restrict source</button>
                              <button className="button-danger" type="submit" name="decision" value="reject" disabled={review.isPending} data-testid={`button-reject-torrent-${torrent.id}`}>Reject evidence</button>
                            </div>
                          </form>
                          <div className="form-actions">
                            {torrent.playbackStatus === "active" ? (
                              <button className="button-danger" disabled={playback.isPending} onClick={() => setSourcePlayback(torrent.id, false)} data-testid={`button-deactivate-torrent-${torrent.id}`}>Deactivate playback</button>
                            ) : (
                              <button className="button" disabled={playback.isPending || torrent.rightsStatus !== "approved"} onClick={() => setSourcePlayback(torrent.id, true)} data-testid={`button-activate-torrent-${torrent.id}`}>Activate playback</button>
                            )}
                          </div>
                        </div>
                      </article>
                    ))}
                  </div>
                ) : <p className="helper">No torrent references were present for this source record.</p>}
              </div>
            </details>
          )) : <p className="helper">No archive source records are attached to this title.</p>}
      {message && <p className="form-message" role="status" data-testid="status-torrent-review-message">{message}</p>}
    </section>
  );
}
