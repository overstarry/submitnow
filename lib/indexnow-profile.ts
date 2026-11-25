import type { IndexNowEndpointId } from "@/lib/indexnow-endpoints";

const LEGACY_STORAGE_KEY = "submitnow:indexnow-profile:v1";
const STORAGE_KEY = "submitnow:indexnow-profiles:v2";
const MAX_PROFILES = 20;

export type IndexNowProfile = {
  version: 1;
  host: string;
  key: string;
  keyLocation: string;
  endpointId?: IndexNowEndpointId;
  updatedAt: string;
};

type ProfileStoreV2 = {
  version: 2;
  activeHost: string | null;
  profiles: IndexNowProfile[];
};

function isValidProfile(item: unknown): item is IndexNowProfile {
  if (!item || typeof item !== "object") return false;
  const candidate = item as Partial<IndexNowProfile>;
  return (
    typeof candidate.host === "string" &&
    candidate.host.trim().length > 0 &&
    typeof candidate.key === "string" &&
    typeof candidate.keyLocation === "string"
  );
}

function readStore(): ProfileStoreV2 {
  if (typeof window === "undefined") {
    return { version: 2, activeHost: null, profiles: [] };
  }

  try {
    const rawV2 = window.localStorage.getItem(STORAGE_KEY);
    if (rawV2) {
      const parsed = JSON.parse(rawV2) as Partial<ProfileStoreV2>;
      if (parsed?.version === 2 && Array.isArray(parsed.profiles)) {
        const profiles = parsed.profiles
          .filter(isValidProfile)
          .slice(0, MAX_PROFILES);
        const activeHost =
          typeof parsed.activeHost === "string" &&
          profiles.some((p) => p.host === parsed.activeHost)
            ? parsed.activeHost
            : profiles[0]?.host ?? null;
        return { version: 2, activeHost, profiles };
      }
    }

    // Transparently migrate legacy v1 single-profile storage.
    const rawV1 = window.localStorage.getItem(LEGACY_STORAGE_KEY);
    if (rawV1) {
      const legacy = JSON.parse(rawV1) as Partial<IndexNowProfile> | null;
      if (legacy?.version === 1 && isValidProfile(legacy)) {
        const migrated: ProfileStoreV2 = {
          version: 2,
          activeHost: legacy.host,
          profiles: [
            {
              version: 1,
              host: legacy.host,
              key: legacy.key,
              keyLocation: legacy.keyLocation,
              endpointId: legacy.endpointId,
              updatedAt: legacy.updatedAt ?? new Date().toISOString(),
            },
          ],
        };
        writeStore(migrated);
        return migrated;
      }
    }
  } catch {
    // Ignore storage read failures.
  }

  return { version: 2, activeHost: null, profiles: [] };
}

function writeStore(store: ProfileStoreV2): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Persistence is optional and must never break submissions.
  }
}

export function loadIndexNowProfiles(): {
  profiles: IndexNowProfile[];
  activeProfile: IndexNowProfile | null;
} {
  const store = readStore();
  const activeProfile =
    store.profiles.find((p) => p.host === store.activeHost) ??
    store.profiles[0] ??
    null;
  return { profiles: store.profiles, activeProfile };
}

export function loadIndexNowProfile(): IndexNowProfile | null {
  return loadIndexNowProfiles().activeProfile;
}

export function upsertIndexNowProfile(
  profile: Pick<IndexNowProfile, "host" | "key" | "keyLocation" | "endpointId">
): IndexNowProfile[] {
  const normalizedHost = profile.host.trim().toLowerCase();
  if (!normalizedHost || !profile.key.trim()) {
    return readStore().profiles;
  }

  const store = readStore();
  const nextEntry: IndexNowProfile = {
    version: 1,
    host: normalizedHost,
    key: profile.key.trim(),
    keyLocation: profile.keyLocation.trim(),
    endpointId: profile.endpointId,
    updatedAt: new Date().toISOString(),
  };

  const nextProfiles = [
    nextEntry,
    ...store.profiles.filter((item) => item.host !== normalizedHost),
  ].slice(0, MAX_PROFILES);

  writeStore({
    version: 2,
    activeHost: normalizedHost,
    profiles: nextProfiles,
  });

  return nextProfiles;
}

export function setActiveIndexNowProfile(host: string): IndexNowProfile | null {
  const normalizedHost = host.trim().toLowerCase();
  const store = readStore();
  const found = store.profiles.find((p) => p.host === normalizedHost) ?? null;
  if (!found) return null;

  writeStore({
    version: 2,
    activeHost: found.host,
    profiles: store.profiles,
  });
  return found;
}

export function deleteIndexNowProfile(host: string): IndexNowProfile[] {
  const normalizedHost = host.trim().toLowerCase();
  const store = readStore();
  const nextProfiles = store.profiles.filter((p) => p.host !== normalizedHost);
  const nextActive =
    store.activeHost === normalizedHost
      ? nextProfiles[0]?.host ?? null
      : store.activeHost;

  writeStore({
    version: 2,
    activeHost: nextActive,
    profiles: nextProfiles,
  });

  if (nextProfiles.length === 0 && typeof window !== "undefined") {
    try {
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  return nextProfiles;
}

export function saveIndexNowProfile(
  profile: Pick<IndexNowProfile, "host" | "key" | "keyLocation" | "endpointId">
): void {
  upsertIndexNowProfile(profile);
}

export function clearIndexNowProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.localStorage.removeItem(LEGACY_STORAGE_KEY);
  } catch {
    // Ignore browsers that disable local storage.
  }
}
