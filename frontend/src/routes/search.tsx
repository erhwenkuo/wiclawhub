import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Search as SearchIcon } from "lucide-react";
import { useSearch } from "@/lib/hooks";
import { timeAgo } from "@/lib/format";
import { Spinner } from "@/components/Spinner";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [submitted, setSubmitted] = useState("");
  const { data, isLoading } = useSearch(submitted);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(query.trim());
  };

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-50">Search Skills</h1>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <SearchIcon
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name, description..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
          />
        </div>
      </form>

      {isLoading && <Spinner />}

      {!isLoading && submitted && data && (
        <div className="space-y-3">
          {data.results.length === 0 ? (
            <p className="py-8 text-center text-gray-500 dark:text-gray-400">
              No results for &ldquo;{submitted}&rdquo;
            </p>
          ) : (
            <>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                {data.results.length} result
                {data.results.length !== 1 ? "s" : ""}
              </p>
              {data.results.map((r) => (
                <Link
                  key={r.slug}
                  to="/skills/$slug"
                  params={{ slug: r.slug! }}
                  className="block rounded-lg border border-gray-200 bg-white p-4 transition hover:border-indigo-300 hover:shadow-sm dark:border-gray-700 dark:bg-gray-900 dark:hover:border-indigo-600"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">
                      {r.displayName}
                    </h3>
                    {r.version && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        v{r.version}
                      </span>
                    )}
                  </div>
                  {r.summary && (
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{r.summary}</p>
                  )}
                  {r.updatedAt && (
                    <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                      Updated {timeAgo(r.updatedAt)}
                    </p>
                  )}
                </Link>
              ))}
            </>
          )}
        </div>
      )}
    </div>
  );
}
