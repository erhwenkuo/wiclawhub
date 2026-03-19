import { useQuery } from "@tanstack/react-query";
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
    queryFn: () => apiFetch(`/skills/${slug}`),
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

export function useSearch(q: string, limit = 20) {
  return useQuery<SearchResponse>({
    queryKey: ["search", q, limit],
    queryFn: () => apiFetch(`/search?q=${encodeURIComponent(q)}&limit=${limit}`),
    enabled: q.length > 0,
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
