import { useState, useEffect } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { useProfile } from "@/lib/profile-context";
import { cn } from "@/lib/utils";

interface LikeDislikeProps {
  slug: string;
  genres?: string[];
  className?: string;
}

export function LikeDislikeButtons({ slug, genres, className }: LikeDislikeProps) {
  const { activeProfile } = useProfile();
  const [feedback, setFeedback] = useState<"like" | "dislike" | null>(null);

  useEffect(() => {
    try {
      const likes: string[] = JSON.parse(
        localStorage.getItem(`ff_likes_${activeProfile.id}`) || "[]"
      );
      const dislikes: string[] = JSON.parse(
        localStorage.getItem(`ff_dislikes_${activeProfile.id}`) || "[]"
      );
      if (likes.includes(slug)) setFeedback("like");
      else if (dislikes.includes(slug)) setFeedback("dislike");
      else setFeedback(null);
    } catch {
      setFeedback(null);
    }
  }, [slug, activeProfile.id]);

  function handleLike() {
    try {
      const likesKey = `ff_likes_${activeProfile.id}`;
      const dislikesKey = `ff_dislikes_${activeProfile.id}`;
      let likes: string[] = JSON.parse(localStorage.getItem(likesKey) || "[]");
      let dislikes: string[] = JSON.parse(localStorage.getItem(dislikesKey) || "[]");

      if (feedback === "like") {
        likes = likes.filter((s) => s !== slug);
        setFeedback(null);
      } else {
        likes = Array.from(new Set([...likes, slug]));
        dislikes = dislikes.filter((s) => s !== slug);
        setFeedback("like");
      }

      localStorage.setItem(likesKey, JSON.stringify(likes));
      localStorage.setItem(dislikesKey, JSON.stringify(dislikes));
    } catch {}
  }

  function handleDislike() {
    try {
      const likesKey = `ff_likes_${activeProfile.id}`;
      const dislikesKey = `ff_dislikes_${activeProfile.id}`;
      let likes: string[] = JSON.parse(localStorage.getItem(likesKey) || "[]");
      let dislikes: string[] = JSON.parse(localStorage.getItem(dislikesKey) || "[]");

      if (feedback === "dislike") {
        dislikes = dislikes.filter((s) => s !== slug);
        setFeedback(null);
      } else {
        dislikes = Array.from(new Set([...dislikes, slug]));
        likes = likes.filter((s) => s !== slug);
        setFeedback("dislike");
      }

      localStorage.setItem(likesKey, JSON.stringify(likes));
      localStorage.setItem(dislikesKey, JSON.stringify(dislikes));
    } catch {}
  }

  return (
    <div className={cn("inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/[0.08] p-1 backdrop-blur-md", className)}>
      <button
        type="button"
        onClick={handleLike}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95",
          feedback === "like"
            ? "bg-purple-600 text-white shadow-md shadow-purple-600/40"
            : "text-white hover:bg-white/15 hover:text-white"
        )}
        title="Like this title — Improves your recommendations"
        aria-label="Like this title"
        data-testid="button-like-title"
      >
        <ThumbsUp size={14} className={feedback === "like" ? "fill-current" : ""} />
        <span>Like</span>
      </button>

      <button
        type="button"
        onClick={handleDislike}
        className={cn(
          "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-95",
          feedback === "dislike"
            ? "bg-rose-600 text-white shadow-md shadow-rose-600/40"
            : "text-white hover:bg-white/15 hover:text-white"
        )}
        title="Dislike — See fewer titles like this"
        aria-label="Dislike this title"
        data-testid="button-dislike-title"
      >
        <ThumbsDown size={14} className={feedback === "dislike" ? "fill-current" : ""} />
        <span>Dislike</span>
      </button>
    </div>
  );
}
