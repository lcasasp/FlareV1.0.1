import { useCallback, useEffect, useState } from "react";
import type { FlareArticle } from "@/types/flare";
import { fetchArticles } from "@/lib/api";

const LS_DATE_KEY = "flare-articles-date";
const LS_DATA_KEY = "flare-articles-data";

export interface UseArticlesResult {
  articles: FlareArticle[];
  setArticles: React.Dispatch<React.SetStateAction<FlareArticle[]>>;
  loading: boolean;
  error: string | null;
  refresh: (force?: boolean) => Promise<void>;
}

/**
 * Loads articles once per day, caching in localStorage.
 * On mount:
 *   - show cached immediately if fresh
 *   - background-refresh for safety
 */
export function useArticles(): UseArticlesResult {
  const [articles, setArticles] = useState<FlareArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (force = false) => {
    const today = new Date().toISOString().slice(0, 10);

    if (!force) {
      const cachedDate = localStorage.getItem(LS_DATE_KEY);
      const cachedData = localStorage.getItem(LS_DATA_KEY);
      if (cachedDate === today && cachedData) {
        try {
          const parsed: FlareArticle[] = JSON.parse(cachedData);
          if (parsed.length) {
            setArticles(parsed);
            setLoading(false);
            // background refresh
            fetchArticles().then((fresh) => {
              localStorage.setItem(LS_DATE_KEY, today);
              localStorage.setItem(LS_DATA_KEY, JSON.stringify(fresh));
              setArticles(fresh);
            });
            return;
          }
        } catch {
          // ignore parsing errors, fall through to network
        }
      }
    }

    try {
      const fresh = await fetchArticles();
      localStorage.setItem(LS_DATE_KEY, today);
      localStorage.setItem(LS_DATA_KEY, JSON.stringify(fresh));
      setArticles(fresh);
    } catch (e: any) {
      setError(e?.message ?? "Failed to fetch articles");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { articles, setArticles, loading, error, refresh };
}
