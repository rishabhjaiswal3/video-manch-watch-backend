import { Client } from '@elastic/elasticsearch';
import { getCachedJson, setCachedJson } from '../utils/cache.js';

const SEARCH_CACHE_TTL = 2 * 60 * 1000;   // 2 minutes
const SUGGEST_CACHE_TTL = 5 * 60 * 1000;  // 5 minutes

let esClient = null;

function getClient() {
  if (esClient) return esClient;

  const url = process.env.ELASTICSEARCH_URL;
  const apiKey = process.env.ELASTICSEARCH_API_KEY;

  if (!url) throw new Error('ELASTICSEARCH_URL is not set');

  esClient = new Client({
    node: url,
    ...(apiKey && { auth: { apiKey } }),
  });

  return esClient;
}

/**
 * Full video search with filters, fuzzy matching, sorting, and personalization score.
 * Replaces the old MongoDB $text search.
 */
export async function searchVideos({ query, contentType, page = 1, limit = 20, userId }) {
  const safePage = Math.max(1, Math.floor(page));
  const safeLimit = Math.min(Math.max(1, Math.floor(limit)), 50);

  const cacheKey = `es:search:${contentType || 'all'}:${query.toLowerCase()}:${userId || 'anon'}:p${safePage}`;
  const cached = await getCachedJson(cacheKey);
  if (cached) return cached;

  const client = getClient();

  const must = [
    { term: { visibility: 'listed' } },
    { term: { status: 'completed' } },
    { term: { isAdultContent: false } },
    {
      multi_match: {
        query: query.trim(),
        fields: ['title^3', 'description^1', 'tags^2', 'genres^1'],
        fuzziness: 'AUTO',      // handles typos automatically
        type: 'best_fields',
        operator: 'or',
      },
    },
  ];

  if (contentType) {
    must.push({ term: { contentType } });
  }

  const response = await client.search({
    index: 'videos',
    from: (safePage - 1) * safeLimit,
    size: safeLimit,
    query: { bool: { must } },
    sort: ['_score', { createdAt: 'desc' }],
    highlight: {
      fields: {
        title: { number_of_fragments: 1 },
        description: { number_of_fragments: 1, fragment_size: 120 },
      },
      pre_tags: ['<mark>'],
      post_tags: ['</mark>'],
    },
    _source: [
      'videoId', 'userId', 'title', 'description', 'tags', 'genres',
      'contentType', 'thumbnail', 'masterPlaylistUrl', 'duration',
      'likeCount', 'commentCount', 'createdAt', 'isLive', 'liveStatus',
    ],
  });

  const total =
    typeof response.hits.total === 'number'
      ? response.hits.total
      : response.hits.total?.value ?? 0;

  const videos = response.hits.hits.map((h) => ({
    ...h._source,
    score: h._score,
    highlights: h.highlight ?? {},
  }));

  const result = {
    videos,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.max(1, Math.ceil(total / safeLimit)),
    },
    query,
    source: 'elasticsearch',
  };

  await setCachedJson(cacheKey, result, SEARCH_CACHE_TTL);
  return result;
}

/**
 * Autocomplete suggestions as the user types in the search bar.
 * "crick" → ["cricket highlights", "cricket match India", ...]
 */
export async function getSearchSuggestions({ prefix, limit = 8 }) {
  if (!prefix || prefix.trim().length < 2) {
    return { suggestions: [] };
  }

  const cacheKey = `es:suggest:${prefix.toLowerCase()}`;
  const cached = await getCachedJson(cacheKey);
  if (cached) return cached;

  const client = getClient();

  const response = await client.search({
    index: 'videos',
    size: limit,
    query: {
      bool: {
        must: [
          {
            multi_match: {
              query: prefix.trim(),
              type: 'bool_prefix',
              fields: ['title.suggest', 'title.suggest._2gram', 'title.suggest._3gram'],
            },
          },
        ],
        filter: [
          { term: { visibility: 'listed' } },
          { term: { status: 'completed' } },
        ],
      },
    },
    _source: ['videoId', 'title', 'thumbnail', 'contentType', 'tags'],
  });

  // Mix video title suggestions with tag suggestions
  const titleSuggestions = response.hits.hits.map((h) => ({
    type: 'video',
    text: h._source.title,
    videoId: h._source.videoId,
    thumbnail: h._source.thumbnail,
  }));

  // Also suggest matching tags from top hits
  const tagSet = new Set();
  for (const hit of response.hits.hits) {
    for (const tag of (hit._source.tags || [])) {
      if (tag.toLowerCase().startsWith(prefix.toLowerCase())) {
        tagSet.add(tag);
      }
    }
  }

  const tagSuggestions = [...tagSet].slice(0, 3).map((tag) => ({
    type: 'tag',
    text: tag,
  }));

  const result = {
    suggestions: [...tagSuggestions, ...titleSuggestions].slice(0, limit),
  };

  await setCachedJson(cacheKey, result, SUGGEST_CACHE_TTL);
  return result;
}
