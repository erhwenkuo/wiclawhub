import { Link } from "@tanstack/react-router";
import { Star, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { formatNumber } from "@/lib/format";
import { Spinner } from "@/components/Spinner";
import { ErrorMessage } from "@/components/ErrorMessage";

interface ProfileSkill {
  slug: string;
  displayName: string;
  summary: string | null;
  stars: number;
  downloads: number;
  views: number;
  version: string | null;
}

interface UserProfile {
  handle: string;
  displayName: string | null;
  image: string | null;
  createdAt: number;
  published: ProfileSkill[];
  starred: ProfileSkill[];
}

function useUserProfile(handle: string) {
  return useQuery<UserProfile>({
    queryKey: ["user-profile", handle],
    queryFn: () => apiFetch(`/users/${handle}`),
    enabled: !!handle,
  });
}

export function UserProfilePage({ handle }: { handle: string }) {
  const { data, isLoading, error, refetch } = useUserProfile(handle);

  if (isLoading) return <Spinner />;
  if (error || !data) {
    return (
      <ErrorMessage
        message="User not found."
        retry={() => refetch()}
      />
    );
  }

  return (
    <div className="mx-auto max-w-4xl">
      {/* Profile header */}
      <div className="mb-8 rounded-lg border border-gray-200 bg-white py-8 text-center dark:border-gray-700 dark:bg-gray-900">
        {data.image ? (
          <img
            src={data.image}
            alt=""
            className="mx-auto h-20 w-20 rounded-full object-cover"
          />
        ) : (
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gray-200 text-2xl font-bold text-gray-500 dark:bg-gray-700 dark:text-gray-400">
            {(data.handle || "?")[0].toUpperCase()}
          </div>
        )}
        <h1 className="mt-3 text-xl font-bold text-gray-900 dark:text-gray-100">
          {data.displayName || data.handle}
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          @{data.handle}
        </p>
      </div>

      {/* Published */}
      <section className="mb-8">
        <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">
          Published
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Skills published by this user.
        </p>
        {data.published.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No published skills yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.published.map((s) => (
              <SkillMiniCard key={s.slug} skill={s} />
            ))}
          </div>
        )}
      </section>

      {/* Stars */}
      <section>
        <h2 className="mb-1 text-lg font-bold text-gray-900 dark:text-gray-100">
          Stars
        </h2>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Skills this user has starred.
        </p>
        {data.starred.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            No starred skills yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {data.starred.map((s) => (
              <SkillMiniCard key={s.slug} skill={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function SkillMiniCard({ skill }: { skill: ProfileSkill }) {
  return (
    <Link
      to="/skills/$slug"
      params={{ slug: skill.slug }}
      className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-600"
    >
      <h3 className="font-bold text-gray-900 dark:text-gray-100">
        {skill.displayName || skill.slug}
      </h3>
      {skill.summary && (
        <p className="mt-1.5 line-clamp-3 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
          {skill.summary}
        </p>
      )}
      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
        <span className="inline-flex items-center gap-1">
          <Star size={13} className="text-yellow-500" />
          {formatNumber(skill.stars)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Download size={13} />
          {formatNumber(skill.downloads)}
        </span>
      </div>
    </Link>
  );
}
