import axios from "axios";
import type { FlareArticle, LatLngLabel } from "@/types/flare";
import { API_CONFIG } from "@/constants/config";

// ---- formatters ------------------------------------------------------------

/** Shape the ES _source into FlareArticle */
export const formatArticleFromSource = (src: any): FlareArticle => {
  const title = src.title?.eng ?? "";
  const summary = src.summary?.eng ?? "";
  const image = src.images?.[0] ?? "";

  const mainLocation: LatLngLabel | null =
    src.location?.lat && src.location?.long
      ? {
          label: src.location.label?.eng ?? "",
          latitude: src.location.lat,
          longitude: src.location.long,
        }
      : null;

  const locations: LatLngLabel[] =
    src.concepts
      ?.filter((c: any) => c.type === "loc" && c.score > 60)
      .map((loc: any) => ({
        label: loc.label?.eng ?? "",
        latitude: loc.location?.lat ?? 0,
        longitude: loc.location?.long ?? 0,
      })) ?? [];

  const compositeScore = src.wgt;

  return {
    uri: src.uri ?? crypto.randomUUID(),
    title,
    summary,
    image,
    sentiment: src.sentiment ?? 0,
    eventDate: src.eventDate ?? "",
    socialScore: src.socialScore ?? 0,
    wgt: src.wgt ?? 0,
    categories: src.categories ?? [],
    concepts: src.concepts ?? [],
    mainLocation,
    locations,
    infoArticle: src.infoArticle,
    compositeScore,
    totalArticleCount: src.totalArticleCount ?? 0,
  };
};

// ---- API wrappers ----------------------------------------------------------

export async function fetchArticles(): Promise<FlareArticle[]> {
  const res = await axios.get(
    `${API_CONFIG.BASE_URL}/${API_CONFIG.ENDPOINTS.ARTICLES}`,
    {
      validateStatus: (s) => s >= 200 && s < 300,
    }
  );

  if (res.headers["content-encoding"] === "gzip") {
    console.debug("Articles response gzipped ✅");
  }

  return res.data.map((src: any) => formatArticleFromSource(src));
}

export async function searchArticles(query: string): Promise<FlareArticle[]> {
  const res = await axios.get(
    `${API_CONFIG.BASE_URL}/${
      API_CONFIG.ENDPOINTS.SEARCH
    }?query=${encodeURIComponent(query)}`,
    { validateStatus: (s) => s >= 200 && s < 300 }
  );

  // _score is returned only in search hits
  return res.data.map((hit: any) => {
    const src = hit._source;
    const score = hit._score ?? 0;
    const base = formatArticleFromSource(src);
    const compositeScore =
      0.2 * (src.totalArticleCount ?? 0) + 0.2 * (src.wgt ?? 0) + 0.6 * score;
    return { ...base, compositeScore };
  });
}
