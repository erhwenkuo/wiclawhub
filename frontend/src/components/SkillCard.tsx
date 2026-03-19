import { Link } from "@tanstack/react-router";
import { Download, Star } from "lucide-react";
import type { SkillListItem } from "@/lib/api";
import { timeAgo, formatNumber } from "@/lib/format";
import { TagBadge } from "./TagBadge";

export function SkillCard({ skill }: { skill: SkillListItem }) {
  const tags = Object.values(skill.tags);
  const downloads = skill.stats?.downloads ?? 0;
  const stars = skill.stats?.stars ?? 0;

  return (
    <Link
      to="/skills/$slug"
      params={{ slug: skill.slug }}
      className="group block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-md dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-600"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 dark:text-gray-100 dark:group-hover:text-indigo-400">
          {skill.displayName}
        </h3>
        {skill.latestVersion && (
          <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-400">
            v{skill.latestVersion.version}
          </span>
        )}
      </div>

      {skill.summary && (
        <p className="mb-3 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
          {skill.summary}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {tags.slice(0, 3).map((tag) => (
          <TagBadge key={tag} label={tag} />
        ))}

        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          {downloads > 0 && (
            <span className="flex items-center gap-1">
              <Download size={12} />
              {formatNumber(downloads)}
            </span>
          )}
          {stars > 0 && (
            <span className="flex items-center gap-1">
              <Star size={12} />
              {formatNumber(stars)}
            </span>
          )}
          <span>{timeAgo(skill.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
