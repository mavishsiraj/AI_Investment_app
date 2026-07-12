import axios from "axios";
import type { NewsArticle } from "../agents/types";

/**
 * news.ts
 *
 * Unlike yahoo.ts, this service is intentionally graceful rather than
 * throw-on-failure: a missing API key or a failed request should degrade
 * to "no news available" rather than take down the whole pipeline, since
 * news is supplementary context, not a primary financial data source.
 * fetchData.ts treats an empty array as "no data" (not counted toward
 * dataSources) without treating it as an error.
 *
 * Change from previous version: accepts an optional AbortSignal so the
 * request can be cancelled by the /api/research route's timeout or
 * client-disconnect handling. A cancelled request still resolves to []
 * (never throws), consistent with this service's graceful contract.
 */

const NEWS_API_URL = "https://newsapi.org/v2/everything";
const REQUEST_TIMEOUT_MS = 8000;
const MAX_ARTICLES = 10;

interface NewsApiArticle {
  title: string | null;
  source: { name: string | null } | null;
  url: string | null;
  publishedAt: string | null;
  description: string | null;
}

interface NewsApiResponse {
  articles: NewsApiArticle[];
}

export async function fetchNews(companyName: string, signal?: AbortSignal): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSAPI_KEY;
  if (!apiKey || signal?.aborted) {
    return [];
  }

  try {
    const response = await axios.get<NewsApiResponse>(NEWS_API_URL, {
      params: {
        q: companyName,
        sortBy: "publishedAt",
        language: "en",
        pageSize: MAX_ARTICLES,
        apiKey,
      },
      timeout: REQUEST_TIMEOUT_MS,
      signal,
    });

    const articles = response.data?.articles ?? [];

    return articles
      .filter((article) => Boolean(article.title && article.url))
      .map((article) => ({
        title: article.title as string,
        source: article.source?.name ?? "Unknown",
        url: article.url as string,
        publishedAt: article.publishedAt ?? new Date().toISOString(),
        description: article.description ?? null,
      }));
  } catch {
    // Network failure, rate limit, invalid key, timeout, cancellation, etc.
    // — degrade gracefully regardless of cause.
    return [];
  }
}
