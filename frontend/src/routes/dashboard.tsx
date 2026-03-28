import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { PackagePlus, Eye, Trash2, Download, Star, Box } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, authHeaders } from "@/lib/auth";
import { apiFetch, type SkillListResponse } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { Spinner } from "@/components/Spinner";

export function DashboardPage() {
  const { token } = useAuth();

  const { data, isLoading } = useQuery<SkillListResponse>({
    queryKey: ["my-skills", token],
    queryFn: () =>
      apiFetch("/skills?limit=100&owner=me", {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      }),
    enabled: !!token,
  });

  const skills = data?.items ?? [];

  if (!token) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to view your dashboard.</p>
        <Link
          to="/login"
          className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-50">Publisher Skills</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Hidden skill versions remain visible here while checks are pending.
        </p>
      </div>

      {isLoading ? (
        <Spinner />
      ) : skills.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No skills published yet.</p>
          <Link
            to="/publish-skill"
            className="mt-3 inline-block text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Publish your first skill
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Skill
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Summary
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Status
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {skills.map((skill) => (
                <SkillRow key={skill.slug} skill={skill} token={token} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SkillRow({
  skill,
  token,
}: {
  skill: SkillListResponse["items"][0];
  token: string;
}) {
  const queryClient = useQueryClient();
  const [confirming, setConfirming] = useState(false);

  const deleteMutation = useMutation({
    mutationFn: () =>
      apiFetch(`/skills/${skill.slug}`, {
        method: "DELETE",
        headers: authHeaders(token),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-skills"] });
    },
  });

  const downloads = skill.stats?.downloads ?? 0;
  const stars = skill.stats?.stars ?? 0;
  const versions = skill.stats?.versions ?? 0;

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50">
      {/* SKILL column: name, slug, stats */}
      <td className="px-6 py-4">
        <div>
          <div className="flex items-baseline gap-2">
            <Link
              to="/skills/$slug"
              params={{ slug: skill.slug }}
              className="text-base font-semibold text-gray-900 hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400"
            >
              {skill.displayName}
            </Link>
            <span className="text-sm text-gray-400 dark:text-gray-500">/{skill.slug}</span>
          </div>
          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1" title="Downloads">
              <Download size={12} />
              {formatNumber(downloads)}
            </span>
            <span className="flex items-center gap-1" title="Stars">
              <Star size={12} />
              {formatNumber(stars)}
            </span>
            <span className="flex items-center gap-1" title="Versions">
              <Box size={12} />
              {formatNumber(versions)}
            </span>
          </div>
        </div>
      </td>

      {/* SUMMARY column */}
      <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">
        {skill.summary || <span className="text-gray-300 dark:text-gray-600">&mdash;</span>}
      </td>

      {/* STATUS column */}
      <td className="px-6 py-4">
        <span className="text-sm text-gray-700 dark:text-gray-300">Visible</span>
      </td>

      {/* ACTIONS column */}
      <td className="px-6 py-4">
        <div className="flex items-center justify-end gap-1">
          {confirming ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  deleteMutation.mutate();
                  setConfirming(false);
                }}
                className="rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-700 dark:bg-red-950 dark:text-red-400 dark:hover:bg-red-900"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
            </div>
          ) : (
            <>
              <Link
                to="/publish-skill"
                search={{ updateSlug: skill.slug }}
                className="group relative rounded-lg p-2 text-gray-400 hover:bg-indigo-50 hover:text-indigo-600 dark:text-gray-500 dark:hover:bg-indigo-950 dark:hover:text-indigo-400"
                title="New Version"
              >
                <PackagePlus size={16} />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
                  New Version
                </span>
              </Link>
              <Link
                to="/skills/$slug"
                params={{ slug: skill.slug }}
                className="group relative rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                title="View"
              >
                <Eye size={16} />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
                  View
                </span>
              </Link>
              <button
                onClick={() => setConfirming(true)}
                className="group relative rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950 dark:hover:text-red-400"
                title="Delete"
              >
                <Trash2 size={16} />
                <span className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100 dark:bg-gray-100 dark:text-gray-900">
                  Delete
                </span>
              </button>
            </>
          )}
        </div>
      </td>
    </tr>
  );
}
