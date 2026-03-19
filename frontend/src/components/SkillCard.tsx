import { Link } from "@tanstack/react-router";
import { Download, Star, Eye } from "lucide-react";
import type { SkillListItem } from "@/lib/api";
import { timeAgo, formatNumber } from "@/lib/format";
import { TagBadge } from "./TagBadge";

export function SkillCard({ skill }: { skill: SkillListItem }) {
  const tags = Object.values(skill.tags);
  const downloads = skill.stats?.downloads ?? 0;
  const stars = skill.stats?.stars ?? 0;
  const views = skill.stats?.views ?? 0;
  const owner = skill.owner;

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

      {/* Owner */}
      {owner && (
        <div className="mb-3 flex items-center gap-1.5">
          {owner.image ? (
            <img
              src={owner.image}
              alt=""
              className="h-4 w-4 rounded-full object-cover"
            />
          ) : (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-gray-200 text-[8px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
              {(owner.handle || "?")[0].toUpperCase()}
            </span>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            @{owner.handle || "unknown"}
          </span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        {tags.slice(0, 3).map((tag) => (
          <TagBadge key={tag} label={tag} />
        ))}

        <div className="ml-auto flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
          <span className="flex items-center gap-1" title="Stars">
            <Star size={12} />
            {formatNumber(stars)}
          </span>
          <span className="flex items-center gap-1" title="Views">
            <Eye size={12} />
            {formatNumber(views)}
          </span>
          {downloads > 0 && (
            <span className="flex items-center gap-1" title="Downloads">
              <Download size={12} />
              {formatNumber(downloads)}
            </span>
          )}
          <span>{timeAgo(skill.updatedAt)}</span>
        </div>
      </div>
    </Link>
  );
}
