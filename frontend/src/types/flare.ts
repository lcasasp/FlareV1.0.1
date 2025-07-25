export type LatLngLabel = {
  label: string;
  latitude: number;
  longitude: number;
};

export interface FlareConcept {
  label: { eng: string };
  type: string;
  score?: number;
  location?: { lat?: number; long?: number };
}

export interface FlareCategory {
  label: string;
  wgt: number;
}

export interface FlareInfoArticle {
  eng?: { url?: string };
}

export interface FlareArticle {
  uri: string;
  title: string;
  summary: string;
  sentiment: number;
  image: string;
  eventDate: string;
  socialScore: number;
  wgt: number;
  categories: FlareCategory[];
  concepts: FlareConcept[];
  mainLocation: LatLngLabel | null;
  locations: LatLngLabel[];
  infoArticle?: FlareInfoArticle;
  compositeScore: number;
  totalArticleCount: number;
}
