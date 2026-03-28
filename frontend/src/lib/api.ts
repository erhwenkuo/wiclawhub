const API_BASE = "/api/v1";

export async function apiFetch<T>(
  path: string,
  options?: RequestInit,
): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function apiFetchText(
  path: string,
  options?: RequestInit,
): Promise<string> {
  const response = await fetch(`${API_BASE}${path}`, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.text();
}

// --- Types ---

export interface LatestVersion {
  version: string;
  createdAt: number;
  changelog: string;
}

export interface Owner {
  handle: string | null;
  displayName: string | null;
  image: string | null;
}

export interface ModerationInfo {
  isSuspicious: boolean;
  isMalwareBlocked: boolean;
  verdict: string;
  reasonCodes: string[];
  summary: string | null;
  engineVersion: string | null;
  updatedAt: number | null;
}

export interface SkillListItem {
  slug: string;
  displayName: string;
  summary: string | null;
  tags: Record<string, string>;
  stats: Record<string, number>;
  createdAt: number;
  updatedAt: number;
  latestVersion: LatestVersion | null;
  owner: Owner | null;
}

export interface SkillListResponse {
  items: SkillListItem[];
  nextCursor: string | null;
}

export interface SkillResponse {
  skill: {
    slug: string;
    displayName: string;
    summary: string | null;
    tags: Record<string, string>;
    stats: Record<string, number>;
    createdAt: number;
    updatedAt: number;
  };
  latestVersion: LatestVersion | null;
  owner: Owner | null;
  moderation: ModerationInfo | null;
}

export interface VersionFile {
  path: string;
  size: number;
  sha256: string;
  contentType: string | null;
}

export interface SecuritySnapshot {
  status: string;
  hasWarnings: boolean;
  checkedAt: number | null;
  hasScanResult: boolean;
}

export interface SkillVersionItem {
  version: string;
  createdAt: number;
  changelog: string;
  changelogSource: string | null;
}

export interface SkillVersionListResponse {
  items: SkillVersionItem[];
  nextCursor: string | null;
}

export interface SkillVersionResponse {
  skill: { slug: string; displayName: string } | null;
  version: {
    version: string;
    createdAt: number;
    changelog: string;
    changelogSource: string | null;
    files: VersionFile[];
    security: SecuritySnapshot;
  } | null;
}

export interface SearchResult {
  score: number;
  slug: string | null;
  displayName: string | null;
  summary: string | null;
  version: string | null;
  updatedAt: number | null;
  downloads: number;
  stars: number;
  views: number;
  ownerHandle: string | null;
  ownerImage: string | null;
}

export interface SearchResponse {
  results: SearchResult[];
  hasMore: boolean;
}
