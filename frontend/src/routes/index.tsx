import { Link } from "@tanstack/react-router";
import { useSkills } from "@/lib/hooks";
import { useSiteConfig } from "@/lib/siteConfig";
import { SkillCard } from "@/components/SkillCard";
import { Spinner } from "@/components/Spinner";
import { ErrorMessage } from "@/components/ErrorMessage";

export function HomePage() {
  const { data, isLoading, error, refetch } = useSkills(6);
  const { siteName } = useSiteConfig();

  return (
    <div className="flex flex-col gap-12 py-8">
      {/* Hero */}
      <section className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-50">
          {siteName}
        </h1>
        <p className="max-w-md text-lg text-gray-600 dark:text-gray-400">
          Publish, version, and search text-based agent skills.
        </p>
        <div className="flex gap-3 pt-2">
          <Link
            to="/skills"
            className="rounded-lg bg-indigo-600 px-5 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            Browse Skills
          </Link>
          <Link
            to="/search"
            className="rounded-lg border border-gray-300 px-5 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Search
          </Link>
        </div>
      </section>

      {/* Latest skills */}
      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Latest Skills
          </h2>
          <Link
            to="/skills"
            className="text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
          >
            View all &rarr;
          </Link>
        </div>

        {isLoading ? (
          <Spinner />
        ) : error ? (
          <ErrorMessage
            message="Failed to load skills."
            retry={() => refetch()}
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} />
            ))}
          </div>
        )}

        {!isLoading && !error && data?.items.length === 0 && (
          <p className="py-8 text-center text-gray-500">
            No skills published yet.
          </p>
        )}
      </section>
    </div>
  );
}
