import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Plus, Trash2, ExternalLink } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth, authHeaders } from "@/lib/auth";
import { apiFetch, type SkillListResponse } from "@/lib/api";
import { timeAgo, formatNumber } from "@/lib/format";
import { Spinner } from "@/components/Spinner";

export function DashboardPage() {
  const { token, user } = useAuth();

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
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Welcome back, {user?.displayName ?? user?.handle ?? "User"}
          </p>
        </div>
        <Link
          to="/upload"
          className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus size={16} />
          Publish Skill
        </Link>
      </div>

      {isLoading ? (
        <Spinner />
      ) : skills.length === 0 ? (
        <div className="rounded-lg border border-dashed border-gray-300 py-16 text-center dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400">No skills published yet.</p>
          <Link
            to="/upload"
            className="mt-3 inline-block text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
          >
            Publish your first skill
          </Link>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
              <tr>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Skill</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Version</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Downloads</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Updated</th>
                <th className="px-4 py-3 font-medium text-gray-600 dark:text-gray-300">Actions</th>
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

  return (
    <tr className="hover:bg-gray-50 dark:hover:bg-gray-800">
      <td className="px-4 py-3">
        <Link
          to="/skills/$slug"
          params={{ slug: skill.slug }}
          className="font-medium text-gray-900 hover:text-indigo-600 dark:text-gray-100 dark:hover:text-indigo-400"
        >
          {skill.displayName}
        </Link>
        <p className="text-xs text-gray-400 dark:text-gray-500">{skill.slug}</p>
      </td>
      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">
        {skill.latestVersion ? `v${skill.latestVersion.version}` : "—"}
      </td>
      <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{formatNumber(downloads)}</td>
      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{timeAgo(skill.updatedAt)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <Link
            to="/skills/$slug"
            params={{ slug: skill.slug }}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:text-gray-500 dark:hover:bg-gray-700 dark:hover:text-gray-300"
            title="View"
          >
            <ExternalLink size={14} />
          </Link>
          {confirming ? (
            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  deleteMutation.mutate();
                  setConfirming(false);
                }}
                className="rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-700"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="rounded px-2 py-0.5 text-xs text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600 dark:text-gray-500 dark:hover:bg-red-950 dark:hover:text-red-400"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}
