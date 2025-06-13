const isDevelopment = process.env.NODE_ENV === "development";

export const API_CONFIG = {
  BASE_URL: isDevelopment
    ? "http://localhost:5000" // Local development
    : process.env.NEXT_PUBLIC_API_URL || "", // Production or custom URL
  ENDPOINTS: {
    ARTICLES: "/articles",
    SEARCH: "/search",
    FETCH: "/fetch",
    EXPORT: "/export",
    CREATE_INDEX: "/es-index",
    DELETE_INDEX: "/delete_index",
  },
} as const;

// Helper function to get full API URL
export const getApiUrl = (
  endpoint: keyof typeof API_CONFIG.ENDPOINTS
): string => {
  return `${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS[endpoint]}`;
};
