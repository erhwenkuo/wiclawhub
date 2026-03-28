import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Link } from "@tanstack/react-router";
import {
  Search as SearchIcon,
  Download,
  Star,
  Box,
  ArrowDown,
  ArrowUp,
  Loader2,
} from "lucide-react";
import { useInfiniteSearch, useSkillCount } from "@/lib/hooks";
import { formatNumber } from "@/lib/format";
import { Spinner } from "@/components/Spinner";

type SortField = "downloads" | "updated";
type SortDir = "desc" | "asc";

export function SearchPage() {
  const [query, setQuery] = useState("");
  const [sortField, setSortField] = useState<SortField>("downloads");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const { data: countData } = useSkillCount();
  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteSearch(query, sortField);

  // Flatten all pages into a single list
  const allResults = useMemo(() => {
    if (!data?.pages) return [];
    const items = data.pages.flatMap((page) => page.results);
    if (sortDir === "asc") return [...items].reverse();
    return items;
  }, [data, sortDir]);

  // Intersection observer for infinite scroll
  const sentinelRef = useRef<HTMLDivElement>(null);

  const handleIntersect = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage],
  );

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(handleIntersect, {
      rootMargin: "200px",
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [handleIntersect]);

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    } else {
      setSortField(field);
      setSortDir("desc");
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return null;
    return sortDir === "desc" ? (
      <ArrowDown size={14} className="inline" />
    ) : (
      <ArrowUp size={14} className="inline" />
    );
  };

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-1 flex items-baseline gap-3">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          Skills
        </h1>
        {countData && (
          <span className="text-lg text-gray-500 dark:text-gray-400">
            ({formatNumber(countData.total)})
          </span>
        )}
      </div>
      <p className="mb-6 text-sm text-gray-500 dark:text-gray-400">
        Browse the skill library.
      </p>

      {/* Search + sort controls */}
      <div className="mb-6 rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900">
        <div className="relative mb-3">
          <SearchIcon
            size={18}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500"
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Filter by name, slug, or summary..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2.5 pl-10 pr-4 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleSort("downloads")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              sortField === "downloads"
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
                : "border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500"
            }`}
          >
            Downloads <SortIcon field="downloads" />
          </button>
          <button
            onClick={() => toggleSort("updated")}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
              sortField === "updated"
                ? "border-indigo-300 bg-indigo-50 text-indigo-700 dark:border-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-300"
                : "border-gray-300 text-gray-600 hover:border-gray-400 dark:border-gray-600 dark:text-gray-400 dark:hover:border-gray-500"
            }`}
          >
            Updated <SortIcon field="updated" />
          </button>
        </div>
      </div>

      {isLoading && <Spinner />}

      {!isLoading && data && (
        <>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {allResults.length} result{allResults.length !== 1 ? "s" : ""}
            {hasNextPage && "+"}
            {query && <> for &ldquo;{query}&rdquo;</>}
          </p>

          <div className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white dark:divide-gray-700 dark:border-gray-700 dark:bg-gray-900">
            {allResults.length === 0 ? (
              <div className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                No skills found.
              </div>
            ) : (
              allResults.map((r) => (
                <Link
                  key={r.slug}
                  to="/skills/$slug"
                  params={{ slug: r.slug! }}
                  className="block px-6 py-5 transition hover:bg-gray-50 dark:hover:bg-gray-800"
                >
                  <div className="flex items-start justify-between gap-4">
                    {/* Left: name + summary + author */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2">
                        <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                          {r.displayName}
                        </h3>
                        <span className="shrink-0 text-sm text-gray-400 dark:text-gray-500">
                          /{r.slug}
                        </span>
                      </div>
                      {r.summary && (
                        <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-gray-600 dark:text-gray-400">
                          {r.summary}
                        </p>
                      )}
                      {/* Author */}
                      <div className="mt-2.5 flex items-center gap-1.5">
                        <span className="text-xs text-gray-400 dark:text-gray-500">
                          by
                        </span>
                        {r.ownerImage ? (
                          <img
                            src={r.ownerImage}
                            alt=""
                            className="h-5 w-5 rounded-full object-cover"
                          />
                        ) : (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                            {(r.ownerHandle || "?")[0].toUpperCase()}
                          </span>
                        )}
                        <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                          @{r.ownerHandle || "unknown"}
                        </span>
                      </div>
                    </div>

                    {/* Right: stats */}
                    <div className="flex shrink-0 items-center gap-4 pt-1 text-xs text-gray-500 dark:text-gray-400">
                      <span className="inline-flex items-center gap-1" title="Downloads">
                        <Download size={14} />
                        {formatNumber(r.downloads)}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Stars">
                        <Star size={14} />
                        {formatNumber(r.stars)}
                      </span>
                      <span className="inline-flex items-center gap-1" title="Views">
                        <Box size={14} />
                        {formatNumber(r.views)}
                      </span>
                      {r.version && (
                        <span className="text-gray-400 dark:text-gray-500">
                          v{r.version}
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>

          {/* Scroll sentinel — triggers next page fetch */}
          <div ref={sentinelRef} className="py-4 text-center">
            {isFetchingNextPage && (
              <div className="flex items-center justify-center gap-2 text-sm text-gray-400 dark:text-gray-500">
                <Loader2 size={16} className="animate-spin" />
                Loading more...
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
