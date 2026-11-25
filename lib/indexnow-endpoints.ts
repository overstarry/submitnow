export type IndexNowEndpointId =
  | 'indexnow'
  | 'bing'
  | 'yandex'
  | 'seznam'
  | 'naver'
  | 'yep';

export type IndexNowEndpoint = {
  id: IndexNowEndpointId;
  name: string;
  url: string;
  recommended?: boolean;
};

export const INDEXNOW_ENDPOINTS: IndexNowEndpoint[] = [
  {
    id: 'indexnow',
    name: 'IndexNow API (api.indexnow.org)',
    url: 'https://api.indexnow.org/indexnow',
    recommended: true,
  },
  {
    id: 'bing',
    name: 'Bing (www.bing.com)',
    url: 'https://www.bing.com/indexnow',
  },
  {
    id: 'yandex',
    name: 'Yandex (yandex.com)',
    url: 'https://yandex.com/indexnow',
  },
  {
    id: 'seznam',
    name: 'Seznam.cz (search.seznam.cz)',
    url: 'https://search.seznam.cz/indexnow',
  },
  {
    id: 'naver',
    name: 'Naver (searchadvisor.naver.com)',
    url: 'https://searchadvisor.naver.com/indexnow',
  },
  {
    id: 'yep',
    name: 'Yep (indexnow.yep.com)',
    url: 'https://indexnow.yep.com/indexnow',
  },
];

export const DEFAULT_ENDPOINT_ID: IndexNowEndpointId = 'indexnow';

export function resolveIndexNowEndpoint(
  rawId?: string | null
): IndexNowEndpoint {
  const matched = INDEXNOW_ENDPOINTS.find((item) => item.id === rawId);
  return matched ?? INDEXNOW_ENDPOINTS[0];
}

export function getKeyLocationDirectoryPrefix(keyLocationUrl: URL): string {
  const pathname = keyLocationUrl.pathname || '/';
  const lastSlash = pathname.lastIndexOf('/');
  if (lastSlash <= 0) return '/';
  return pathname.slice(0, lastSlash + 1);
}

export type KeyLocationScopeResult =
  | { valid: true; directoryPrefix: string }
  | {
      valid: false;
      reason: 'host_mismatch' | 'protocol_mismatch' | 'subdirectory_mismatch';
      directoryPrefix: string;
      invalidUrl?: string;
    };

/**
 * Per IndexNow specification, a key file in a subdirectory (e.g.
 * https://example.com/blog/key.txt) only authorizes URLs under that exact
 * directory prefix (/blog/) on the same host and protocol.
 */
export function validateKeyLocationScope(
  keyLocationUrl: URL,
  host: string,
  urls: URL[]
): KeyLocationScopeResult {
  const directoryPrefix = getKeyLocationDirectoryPrefix(keyLocationUrl);

  if (keyLocationUrl.hostname !== host) {
    return { valid: false, reason: 'host_mismatch', directoryPrefix };
  }

  for (const target of urls) {
    if (target.hostname !== host) {
      return {
        valid: false,
        reason: 'host_mismatch',
        directoryPrefix,
        invalidUrl: target.toString(),
      };
    }

    if (target.protocol !== keyLocationUrl.protocol) {
      return {
        valid: false,
        reason: 'protocol_mismatch',
        directoryPrefix,
        invalidUrl: target.toString(),
      };
    }

    if (directoryPrefix !== '/' && !target.pathname.startsWith(directoryPrefix)) {
      return {
        valid: false,
        reason: 'subdirectory_mismatch',
        directoryPrefix,
        invalidUrl: target.toString(),
      };
    }
  }

  return { valid: true, directoryPrefix };
}
