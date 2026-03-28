import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import {
  apiFetch,
  apiFetchText,
  type SkillListResponse,
  type SkillResponse,
  type SkillVersionListResponse,
  type SkillVersionResponse,
  type SearchResponse,
} from "./api";

export function useSkills(limit = 20, cursor?: string) {
  const params = new URLSearchParams({ limit: String(limit) });
  if (cursor) params.set("cursor", cursor);

  return useQuery<SkillListResponse>({
    queryKey: ["skills", limit, cursor],
    queryFn: () => apiFetch(`/skills?${params}`),
  });
}

export function useSkill(slug: string) {
  return useQuery<SkillResponse>({
    queryKey: ["skill", slug],
    queryFn: () => apiFetch(`/skills/${slug}?view=false`),
    enabled: !!slug,
  });
}

export function useVersions(slug: string, limit = 20) {
  return useQuery<SkillVersionListResponse>({
    queryKey: ["versions", slug, limit],
    queryFn: () => apiFetch(`/skills/${slug}/versions?limit=${limit}`),
    enabled: !!slug,
  });
}

export function useVersion(slug: string, version: string) {
  return useQuery<SkillVersionResponse>({
    queryKey: ["version", slug, version],
    queryFn: () => apiFetch(`/skills/${slug}/versions/${version}`),
    enabled: !!slug && !!version,
  });
}

const SEARCH_PAGE_SIZE = 20;

export function useInfiniteSearch(q: string, sort = "updated") {
  return useInfiniteQuery<SearchResponse>({
    queryKey: ["search", q, sort],
    queryFn: ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        q,
        sort,
        limit: String(SEARCH_PAGE_SIZE),
        offset: String(pageParam),
      });
      return apiFetch(`/search?${params}`);
    },
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage.hasMore) return undefined;
      return allPages.reduce((sum, page) => sum + page.results.length, 0);
    },
  });
}

export function useSkillCount() {
  return useQuery<{ total: number }>({
    queryKey: ["skills-count"],
    queryFn: () => apiFetch("/skills/count"),
  });
}

export function useFileContent(slug: string, path: string, version?: string) {
  const params = new URLSearchParams({ path });
  if (version) params.set("version", version);

  return useQuery<string>({
    queryKey: ["file", slug, path, version],
    queryFn: () => apiFetchText(`/skills/${slug}/file?${params}`),
    enabled: !!slug && !!path,
  });
}
