import { useState, useEffect, useRef, lazy, Suspense } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  Download,
  Star,
  Clock,
  Eye,
  Shield,
  FileText,
  ChevronDown,
  ChevronRight,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useSkill, useVersions, useVersion, useFileContent } from "@/lib/hooks";
import { formatDate, timeAgo, formatNumber } from "@/lib/format";
import { TagBadge } from "@/components/TagBadge";
import { Spinner } from "@/components/Spinner";
import { ErrorMessage } from "@/components/ErrorMessage";
const CodeViewer = lazy(() =>
  import("@/components/CodeViewer").then((m) => ({ default: m.CodeViewer })),
);

export function SkillDetailPage({ slug }: { slug: string }) {
  const { data, isLoading, error, refetch } = useSkill(slug);
  const { data: versionsData } = useVersions(slug);
  const { token, user: authUser } = useAuth();
  const queryClient = useQueryClient();

  // Fire a one-time view count on page mount
  const viewCounted = useRef(false);
  useEffect(() => {
    if (!viewCounted.current) {
      viewCounted.current = true;
      apiFetch(`/skills/${slug}?view=true`).catch(() => {});
    }
  }, [slug]);

  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null);
  const [showVersions, setShowVersions] = useState(false);
  const [starring, setStarring] = useState(false);

  // Check if current user has starred this skill
  const { data: starData } = useQuery<{ starred: boolean }>({
    queryKey: ["star-check", slug],
    queryFn: () =>
      apiFetch(`/stars/${slug}`, {
        headers: { Authorization: `Bearer ${token}` },
      }),
    enabled: !!token,
  });

  const isStarred = starData?.starred ?? false;

  const handleToggleStar = async () => {
    if (!token || starring) return;
    setStarring(true);
    try {
      const method = isStarred ? "DELETE" : "POST";
      await apiFetch(`/stars/${slug}`, {
        method,
        headers: { Authorization: `Bearer ${token}` },
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["star-check", slug] }),
        queryClient.invalidateQueries({ queryKey: ["skill", slug] }),
      ]);
    } finally {
      setStarring(false);
    }
  };

  const latestVersion = data?.latestVersion?.version;
  const displayVersion = selectedVersion ?? latestVersion;

  if (isLoading) return <Spinner />;
  if (error || !data) {
    return (
      <ErrorMessage
        message="Skill not found or failed to load."
        retry={() => refetch()}
      />
    );
  }

  const { skill, owner, moderation } = data;
  const tags = Object.values(skill.tags);
  const downloads = skill.stats?.downloads ?? 0;
  const stars = skill.stats?.stars ?? 0;
  const views = skill.stats?.views ?? 0;

  const panel =
    "rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-900";

  return (
    <div>
      {/* Breadcrumb */}
      <Link
        to="/skills"
        className="mb-6 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
      >
        <ArrowLeft size={14} />
        Back to skills
      </Link>

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main content */}
        <div className="lg:col-span-2">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-50">
              {skill.displayName}
            </h1>
            <div className="mt-1 flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
              <span>{skill.slug}</span>
              {owner && (
                <>
                  <span>&middot;</span>
                  <span>by</span>
                  {owner.image ? (
                    <img
                      src={owner.image}
                      alt=""
                      className="h-5 w-5 rounded-full object-cover"
                    />
                  ) : (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-gray-200 text-[10px] font-medium text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                      {(owner.handle || "?")[0].toUpperCase()}
                    </span>
                  )}
                  <Link
                    to="/u/$handle"
                    params={{ handle: owner.handle ?? "unknown" }}
                    className="font-medium text-gray-700 hover:text-indigo-600 dark:text-gray-300 dark:hover:text-indigo-400"
                  >
                    @{owner.handle ?? "unknown"}
                  </Link>
                </>
              )}
            </div>
          </div>

          {/* Summary */}
          {skill.summary && (
            <div className={`${panel} mb-6`}>
              <p className="text-gray-700 dark:text-gray-300">
                {skill.summary}
              </p>
            </div>
          )}

          {/* Star button — only for logged-in users who are NOT the skill owner */}
          {token && authUser && (!owner || owner.handle !== authUser.handle) && (
            <div className="mb-6">
              <button
                onClick={handleToggleStar}
                disabled={starring}
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  isStarred
                    ? "border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100 dark:border-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-300 dark:hover:bg-yellow-900/50"
                    : "border-gray-300 bg-white text-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-300 dark:hover:border-gray-500 dark:hover:bg-gray-800"
                }`}
              >
                <Star
                  size={16}
                  className={isStarred ? "fill-yellow-500 text-yellow-500" : ""}
                />
                {isStarred ? "Starred" : "Star"}
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatNumber(stars)}
                </span>
              </button>
            </div>
          )}

          {/* Download button */}
          {displayVersion && (
            <div className="mb-6">
              <a
                href={`/api/v1/download?slug=${encodeURIComponent(slug)}&version=${encodeURIComponent(displayVersion)}`}
                download
                className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
              >
                <Download size={16} />
                Download zip
                <span className="text-indigo-200">
                  {slug}-{displayVersion}.zip
                </span>
              </a>
            </div>
          )}

          {/* Changelog */}
          {data.latestVersion && (
            <div className="mb-6">
              <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
                Changelog
              </h2>
              <div className={`${panel} prose prose-sm max-w-none dark:prose-invert`}>
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {data.latestVersion.changelog}
                </ReactMarkdown>
              </div>
            </div>
          )}

          {/* File viewer */}
          <FileViewer
            slug={slug}
            version={displayVersion ?? undefined}
            selectedFile={selectedFile}
            onSelectFile={setSelectedFile}
          />
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Stats */}
          <div className={panel}>
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
              Info
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              {latestVersion && (
                <div className="flex items-center justify-between">
                  <span>Version</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    v{latestVersion}
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Download size={14} /> Downloads
                </span>
                <span>{formatNumber(downloads)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Star size={14} /> Stars
                </span>
                <span>{formatNumber(stars)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Eye size={14} /> Views
                </span>
                <span>{formatNumber(views)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Clock size={14} /> Created
                </span>
                <span>{formatDate(skill.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Updated</span>
                <span>{timeAgo(skill.updatedAt)}</span>
              </div>
            </div>
          </div>

          {/* Tags */}
          {tags.length > 0 && (
            <div className={panel}>
              <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-gray-100">
                Tags
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => (
                  <TagBadge key={tag} label={tag} />
                ))}
              </div>
            </div>
          )}

          {/* Moderation */}
          {moderation && (
            <div className={panel}>
              <h3 className="mb-3 flex items-center gap-1 text-sm font-semibold text-gray-900 dark:text-gray-100">
                <Shield size={14} /> Security
              </h3>
              <VerdictBadge verdict={moderation.verdict} />
            </div>
          )}

          {/* Versions */}
          <div className={panel}>
            <button
              onClick={() => setShowVersions(!showVersions)}
              className="flex w-full items-center justify-between text-sm font-semibold text-gray-900 dark:text-gray-100"
            >
              <span>Versions</span>
              {showVersions ? (
                <ChevronDown size={14} />
              ) : (
                <ChevronRight size={14} />
              )}
            </button>
            {showVersions && versionsData && (
              <div className="mt-3 space-y-2">
                {versionsData.items.map((v) => (
                  <button
                    key={v.version}
                    onClick={() => setSelectedVersion(v.version)}
                    className={`block w-full rounded px-2 py-1.5 text-left text-sm transition ${
                      displayVersion === v.version
                        ? "bg-indigo-50 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300"
                        : "text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-800"
                    }`}
                  >
                    <span className="font-medium">v{v.version}</span>
                    <span className="ml-2 text-xs text-gray-400 dark:text-gray-500">
                      {timeAgo(v.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function FileViewer({
  slug,
  version,
  selectedFile,
  onSelectFile,
}: {
  slug: string;
  version?: string;
  selectedFile: string | null;
  onSelectFile: (path: string | null) => void;
}) {
  const versionStr = version;
  const { data: versionDetail } = useVersion(slug, versionStr ?? "");
  const files = versionDetail?.version?.files ?? [];

  const { data: fileContent, isLoading: fileLoading } = useFileContent(
    slug,
    selectedFile ?? "",
    versionStr,
  );

  const panel =
    "rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900";

  return (
    <div>
      <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        Files
      </h2>

      {/* File list */}
      {files.length > 0 && !selectedFile && (
        <div className={`${panel} divide-y divide-gray-100 dark:divide-gray-800`}>
          {files.map((f) => (
            <button
              key={f.path}
              onClick={() => onSelectFile(f.path)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm transition hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <FileText size={14} className="shrink-0 text-gray-400" />
              <span className="font-medium text-gray-700 dark:text-gray-300">
                {f.path}
              </span>
              <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">
                {f.size > 1024
                  ? `${(f.size / 1024).toFixed(1)} KB`
                  : `${f.size} B`}
              </span>
            </button>
          ))}
        </div>
      )}

      {files.length === 0 && !selectedFile && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No files in this version.
        </p>
      )}

      {/* File content */}
      {selectedFile && (
        <div className={panel}>
          <div className="flex items-center justify-between border-b border-gray-200 px-4 py-2 dark:border-gray-700">
            <span className="flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <FileText size={14} />
              {selectedFile}
            </span>
            <button
              onClick={() => onSelectFile(null)}
              className="text-xs text-indigo-600 hover:text-indigo-700 dark:text-indigo-400"
            >
              Close
            </button>
          </div>
          <div>
            {fileLoading ? (
              <div className="p-4">
                <Spinner />
              </div>
            ) : (
              <Suspense fallback={<div className="p-4"><Spinner /></div>}>
                <CodeViewer
                  content={fileContent ?? ""}
                  filename={selectedFile}
                />
              </Suspense>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function VerdictBadge({ verdict }: { verdict: string }) {
  const styles: Record<string, string> = {
    clean: "bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
    suspicious:
      "bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
    malicious: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
  };

  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[verdict] ?? "bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
    >
      {verdict}
    </span>
  );
}
