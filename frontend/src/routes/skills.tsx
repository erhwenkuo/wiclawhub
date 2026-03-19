import { useState } from "react";
import { useSkills } from "@/lib/hooks";
import { SkillCard } from "@/components/SkillCard";
import { Spinner } from "@/components/Spinner";
import { ErrorMessage } from "@/components/ErrorMessage";

export function SkillsPage() {
  const [cursor, setCursor] = useState<string | undefined>();
  const { data, isLoading, error, refetch } = useSkills(20, cursor);

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
          Skills
        </h1>
      </div>

      {isLoading ? (
        <Spinner />
      ) : error ? (
        <ErrorMessage
          message="Failed to load skills."
          retry={() => refetch()}
        />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {data?.items.map((skill) => (
              <SkillCard key={skill.slug} skill={skill} />
            ))}
          </div>

          {data?.items.length === 0 && (
            <p className="py-12 text-center text-gray-500">No skills found.</p>
          )}

          {/* Pagination */}
          <div className="mt-8 flex justify-center gap-4">
            {cursor && (
              <button
                onClick={() => setCursor(undefined)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                &larr; First page
              </button>
            )}
            {data?.nextCursor && (
              <button
                onClick={() => setCursor(data.nextCursor!)}
                className="rounded-lg border border-gray-300 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Next page &rarr;
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
