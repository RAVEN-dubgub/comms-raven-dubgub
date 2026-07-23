export function pmPlatformUrl() {
  return (process.env.PM_PLATFORM_URL ?? "https://pm-raven-dubgub.vercel.app").replace(
    /\/$/,
    "",
  );
}

/** Detect PM task URLs and return a short label for unfurl chips. */
export function extractPmLinks(body: string, baseUrl?: string) {
  const base = (baseUrl ?? pmPlatformUrl()).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`${base}/(?:tasks|dashboard|projects)[^\\s]*`, "gi");
  const matches = body.match(re) ?? [];
  return [...new Set(matches)];
}

export function dmPairKey(userA: string, userB: string) {
  return [userA, userB].sort().join(":");
}

export function parseMentions(body: string) {
  const matches = body.match(/@([a-zA-Z0-9._-]{2,40})/g) ?? [];
  return [...new Set(matches.map((m) => m.slice(1).toLowerCase()))];
}
