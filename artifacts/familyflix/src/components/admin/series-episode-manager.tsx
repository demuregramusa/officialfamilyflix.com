import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  getListAdminSeriesEpisodesQueryKey,
  getListPublicTitlesQueryKey,
  getGetPublicTitleQueryKey,
  useImportAdminSeriesEpisodes,
  useListAdminSeriesEpisodes,
  usePublishSeriesEpisode,
  useReviewSeriesEpisode,
} from "@workspace/api-client-react";
import type { SeriesEpisodeImportInput } from "@workspace/api-client-react";

const exampleImport: SeriesEpisodeImportInput = {
  uploaderAttested: true,
  seasons: [{
    seasonNumber: 1,
    name: "Season 1",
    episodes: [{
      episodeNumber: 1,
      name: "Episode 1",
      synopsis: "Episode synopsis",
      durationMinutes: 25,
      rights: {
        assetKind: "main-video",
        assetLabel: "Season 1, Episode 1 video",
        assetUrl: "https://media.example.invalid/episode-1.mp4",
        rightsHolder: "Rights holder",
        creatorAttribution: "Creator",
        licenseType: "authorized-copyright",
        licenseVersion: "Authorization record",
        licenseUrl: "https://rights.example.invalid/license",
        usageRestrictions: [],
        sourceUrl: "https://rights.example.invalid/source",
        evidenceUrl: "https://rights.example.invalid/evidence",
        evidenceNotes: "Describe the evidence supporting this episode-specific authorization.",
        territory: "Worldwide",
        expiresAt: null,
        uploaderAttested: true,
      },
      stream: { url: "https://media.example.invalid/episode-1.mp4" },
    }],
  }],
};

function stamp(value?: string | null) {
  return value ? new Date(value).toLocaleDateString() : "No expiry date";
}

export function SeriesEpisodeManager({ id, slug, seriesPublished }: {
  id: string;
  slug: string;
  seriesPublished: boolean;
}) {
  const queryClient = useQueryClient();
  const episodes = useListAdminSeriesEpisodes(id);
  const importEpisodes = useImportAdminSeriesEpisodes();
  const reviewEpisode = useReviewSeriesEpisode();
  const publishEpisode = usePublishSeriesEpisode();
  const [payload, setPayload] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [message, setMessage] = useState("");

  function refresh() {
    queryClient.invalidateQueries({ queryKey: getListAdminSeriesEpisodesQueryKey(id) });
    queryClient.invalidateQueries({ queryKey: getListPublicTitlesQueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetPublicTitleQueryKey(slug) });
  }

  function submitImport() {
    try {
      const data = JSON.parse(payload) as SeriesEpisodeImportInput;
      importEpisodes.mutate({ id, data }, {
        onSuccess: (created) => {
          refresh();
          setPayload("");
          setMessage(`${created.length} episode${created.length === 1 ? "" : "s"} added as drafts. Review rights and publish each episode separately.`);
        },
        onError: (error) => setMessage(error.message),
      });
    } catch {
      setMessage("Enter valid JSON using the documented seasons and episodes format.");
    }
  }

  function review(episodeId: string, decision: "approve" | "restrict") {
    if (!reviewNote.trim()) {
      setMessage("Add a reviewer note before recording a rights decision.");
      return;
    }
    reviewEpisode.mutate({ episodeId, data: { decision, note: reviewNote.trim() } }, {
      onSuccess: () => {
        refresh();
        setMessage(`Episode rights ${decision === "approve" ? "approved" : "restricted"}. Publishing remains a separate step.`);
      },
      onError: (error) => setMessage(error.message),
    });
  }

  return <section className="panel" style={{ marginTop: 18 }} data-testid="admin-series-episodes">
    <h2>Seasons and episodes</h2>
    <p className="helper">Import JSON with a <code>seasons</code> array. Each episode must include its own <code>rights</code> evidence and one direct HTTPS MP4 or HLS URL in <code>stream.url</code>. The stream URL must exactly match <code>rights.assetUrl</code>. New episodes stay hidden until rights are approved and an administrator explicitly publishes each one.</p>
    <details style={{ margin: "12px 0" }}>
      <summary className="helper" style={{ cursor: "pointer" }}>View the documented JSON format</summary>
      <pre className="helper wrap" style={{ whiteSpace: "pre-wrap", padding: 12, background: "hsl(258 23% 11%)", borderRadius: 10 }}>{JSON.stringify(exampleImport, null, 2)}</pre>
    </details>
    <label className="field"><span className="helper">Season and episode JSON</span>
      <textarea rows={12} value={payload} onChange={(event) => setPayload(event.target.value)} placeholder='{"uploaderAttested":true,"seasons":[...]}' data-testid="input-series-episodes-json" />
    </label>
    <div className="form-actions"><button className="button-secondary" type="button" onClick={() => setPayload(JSON.stringify(exampleImport, null, 2))} data-testid="button-fill-episode-template">Use example format</button>
      <button className="button" type="button" disabled={!payload.trim() || importEpisodes.isPending} onClick={submitImport} data-testid="button-import-series-episodes">{importEpisodes.isPending ? "Importing…" : "Import episodes as drafts"}</button>
    </div>
    {message && <p className="form-message" role="status" data-testid="status-series-episodes">{message}</p>}
    {episodes.isLoading ? <div className="skeleton" style={{ height: 90 }} /> :
      episodes.isError ? <p className="form-message error">{episodes.error.message}</p> :
        episodes.data?.length ? <>
          <label className="field" style={{ maxWidth: 640, marginTop: 20 }}><span className="helper">Reviewer note required for rights decisions</span>
            <input value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} data-testid="input-episode-review-note" />
          </label>
          {episodes.data.map((episode) => {
            const rightsReady = episode.rights.length === 1 && episode.rights.every((right) =>
              right.reviewStatus === "approved" && (!right.expiresAt || new Date(right.expiresAt).getTime() > Date.now()),
            );
            const canPublish = seriesPublished && rightsReady && episode.streamStatus === "ready";
            return <article className="rights-row" key={episode.id} data-testid={`admin-episode-${episode.id}`}>
              <div>
                <strong>Season {episode.seasonNumber}, Episode {episode.episodeNumber}: {episode.name}</strong>
                <p>{episode.synopsis || "No synopsis supplied."}</p>
                <p>Episode publication: <span className={`status ${episode.status === "published" ? "good" : "warn"}`}>{episode.status}</span> · Stream: {episode.streamStatus}</p>
                {episode.rights.map((right) => <details key={right.id} style={{ marginTop: 8 }}>
                  <summary className="helper" style={{ cursor: "pointer" }}>{right.assetLabel} · rights {right.reviewStatus}</summary>
                  <div className="helper wrap"><p>Video/source asset: <a href={right.assetUrl} target="_blank" rel="noreferrer">Open source</a></p><p>Rights holder: {right.rightsHolder}</p><p>Creator: {right.creatorAttribution}</p><p>License: {right.licenseType} · {right.licenseVersion}</p><p>Territory: {right.territory || "Not specified"} · Expires: {stamp(right.expiresAt)}</p><p>Source evidence: <a href={right.evidenceUrl} target="_blank" rel="noreferrer">Open evidence</a></p><p>Rights notes: {right.evidenceNotes || "None supplied"}</p><p>Review notes: {right.reviewNotes || "Not reviewed"}</p></div>
                </details>)}
              </div>
              <div className="form-actions">
                <button className="button-secondary" type="button" disabled={!reviewNote.trim() || reviewEpisode.isPending || episode.rights.length === 0} onClick={() => review(episode.id, "approve")} data-testid={`button-approve-episode-${episode.id}`}>Approve rights</button>
                <button className="button-secondary" type="button" disabled={!reviewNote.trim() || reviewEpisode.isPending || episode.rights.length === 0} onClick={() => review(episode.id, "restrict")} data-testid={`button-restrict-episode-${episode.id}`}>Restrict</button>
                <button className="button" type="button" disabled={!canPublish || publishEpisode.isPending || episode.status === "published"} onClick={() => publishEpisode.mutate({ episodeId: episode.id }, {
                  onSuccess: () => { refresh(); setMessage("Episode published to the approved series."); },
                  onError: (error) => setMessage(error.message),
                })} data-testid={`button-publish-episode-${episode.id}`}>Publish episode</button>
              </div>
              {!seriesPublished && <p className="helper">Publish the parent series before publishing an episode.</p>}
            </article>;
          })}
        </> : <p className="helper" style={{ marginTop: 18 }}>No seasons yet. Imported episodes will appear here as drafts.</p>}
  </section>;
}
