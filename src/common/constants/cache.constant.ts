export const CACHE_NAMESPACE = 'onboarding-cache';
export const CACHE_TTL_FALLBACK_SECONDS = 300;
export const CACHE_TTL_MS_MULTIPLIER = 1000;

export const CACHE_KEY_PREFIX = {
  eventsList: 'events:list:',
  eventCategoriesList: 'event-categories:list:',
} as const;
