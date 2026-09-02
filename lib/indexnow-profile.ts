const STORAGE_KEY = "submitnow:indexnow-profile:v1";

export type IndexNowProfile = {
  version: 1;
  host: string;
  key: string;
  keyLocation: string;
  updatedAt: string;
};

export function loadIndexNowProfile(): IndexNowProfile | null {
  if (typeof window === "undefined") return null;

  try {
    const profile = JSON.parse(
      window.localStorage.getItem(STORAGE_KEY) ?? "null"
    ) as Partial<IndexNowProfile> | null;
    if (
      profile?.version !== 1 ||
      typeof profile.host !== "string" ||
      typeof profile.key !== "string" ||
      typeof profile.keyLocation !== "string"
    ) {
      return null;
    }
    return profile as IndexNowProfile;
  } catch {
    return null;
  }
}

export function saveIndexNowProfile(
  profile: Pick<IndexNowProfile, "host" | "key" | "keyLocation">
): void {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        version: 1,
        ...profile,
        updatedAt: new Date().toISOString(),
      } satisfies IndexNowProfile)
    );
  } catch {
    // Persistence is optional and must never change submission behavior.
  }
}

export function clearIndexNowProfile(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore browsers that disable local storage.
  }
}
