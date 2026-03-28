import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { Upload as UploadIcon, Plus, X, FolderOpen, Info } from "lucide-react";
import { useAuth, authHeaders } from "@/lib/auth";
import { apiFetch, type SkillResponse } from "@/lib/api";

interface UploadFile {
  file: File;
  path: string; // relative path (e.g. "src/main.ts")
}

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${bytes} B`;
}

function totalSize(files: UploadFile[]): string {
  return formatSize(files.reduce((sum, f) => sum + f.file.size, 0));
}

/** Increment the patch number of a semver string, e.g. "1.2.3" → "1.2.4" */
function bumpPatch(version: string): string {
  const parts = version.split(".");
  if (parts.length !== 3) return version;
  const [major, minor, patch] = parts;
  const patchNum = parseInt(patch, 10);
  if (isNaN(patchNum)) return version;
  return `${major}.${minor}.${patchNum + 1}`;
}

/** Convert tags Record<string, string> to comma-separated string */
function tagsToString(tags: Record<string, string> | undefined): string {
  if (!tags) return "";
  return Object.keys(tags).join(", ");
}

/** Read all files from a DataTransferItem (folder) recursively */
async function readEntryRecursive(
  entry: FileSystemEntry,
  basePath: string,
): Promise<UploadFile[]> {
  if (entry.isFile) {
    const fileEntry = entry as FileSystemFileEntry;
    const file = await new Promise<File>((resolve, reject) =>
      fileEntry.file(resolve, reject),
    );
    return [{ file, path: basePath + entry.name }];
  }
  if (entry.isDirectory) {
    const dirEntry = entry as FileSystemDirectoryEntry;
    const reader = dirEntry.createReader();
    const entries: FileSystemEntry[] = [];
    // readEntries may return partial results, so read until empty
    let batch: FileSystemEntry[];
    do {
      batch = await new Promise<FileSystemEntry[]>((resolve, reject) =>
        reader.readEntries(resolve, reject),
      );
      entries.push(...batch);
    } while (batch.length > 0);

    const results: UploadFile[] = [];
    for (const child of entries) {
      results.push(...(await readEntryRecursive(child, basePath + entry.name + "/")));
    }
    return results;
  }
  return [];
}

/** Strip the common top-level folder if all files share the same root */
function flattenOuterWrapper(files: UploadFile[]): UploadFile[] {
  if (files.length === 0) return files;
  const firstSlash = files[0].path.indexOf("/");
  if (firstSlash === -1) return files;
  const prefix = files[0].path.slice(0, firstSlash + 1);
  const allShare = files.every((f) => f.path.startsWith(prefix));
  if (!allShare) return files;
  return files.map((f) => ({ ...f, path: f.path.slice(prefix.length) }));
}

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

const inputDisabledCls =
  "w-full rounded-lg border border-gray-200 bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-800/50 dark:text-gray-500 cursor-not-allowed";

const labelCls =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

export function UploadPage() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const { updateSlug } = useSearch({ from: "/publish-skill" });

  const isUpdate = !!updateSlug;

  const [slug, setSlug] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [version, setVersion] = useState("1.0.0");
  const [changelog, setChangelog] = useState("");
  const [tags, setTags] = useState("");
  const [files, setFiles] = useState<UploadFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const folderInputRef = useRef<HTMLInputElement>(null);

  // Fetch existing skill data when updateSlug is provided
  useEffect(() => {
    if (!updateSlug || !token) return;

    setLoading(true);
    apiFetch(`/skills/${updateSlug}?view=false`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((data: unknown) => {
        const { skill, latestVersion } = data as SkillResponse;
        setSlug(skill.slug);
        setDisplayName(skill.displayName);
        setTags(tagsToString(skill.tags));

        if (latestVersion) {
          setVersion(bumpPatch(latestVersion.version));
        }
      })
      .catch((err: Error) => {
        setError(`Failed to load skill: ${err.message}`);
      })
      .finally(() => setLoading(false));
  }, [updateSlug, token]);

  if (!token) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to publish a skill.</p>
      </div>
    );
  }

  const handleFileAdd = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles: UploadFile[] = Array.from(e.target.files).map((f) => ({
        file: f,
        path: f.name,
      }));
      setFiles((prev) => [...prev, ...newFiles]);
    }
    e.target.value = "";
  };

  const handleFolderSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const newFiles: UploadFile[] = Array.from(e.target.files).map((f) => ({
      file: f,
      path: f.webkitRelativePath || f.name,
    }));
    const flattened = flattenOuterWrapper(newFiles);
    setFiles((prev) => [...prev, ...flattened]);
    e.target.value = "";
  };

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);

    const items = e.dataTransfer.items;
    if (!items) return;

    const allFiles: UploadFile[] = [];
    const entries: FileSystemEntry[] = [];
    for (let i = 0; i < items.length; i++) {
      const entry = items[i].webkitGetAsEntry?.();
      if (entry) entries.push(entry);
    }

    for (const entry of entries) {
      allFiles.push(...(await readEntryRecursive(entry, "")));
    }

    const flattened = flattenOuterWrapper(allFiles);
    setFiles((prev) => [...prev, ...flattened]);
  }, []);

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!slug.trim() || !displayName.trim() || !version.trim() || !changelog.trim()) {
      setError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);
    try {
      const tagList = tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);

      const fileEntries = files.map((f) => ({
        path: f.path,
        size: f.file.size,
        sha256: "",
        contentType: f.file.type || "application/octet-stream",
      }));

      const payload = JSON.stringify({
        slug: slug.trim(),
        displayName: displayName.trim(),
        version: version.trim(),
        changelog: changelog.trim(),
        files: fileEntries,
        tags: tagList,
      });

      const formData = new FormData();
      formData.append("payload", payload);
      for (const f of files) {
        formData.append("files", f.file, f.path);
      }

      const res = await fetch("/api/v1/skills", {
        method: "POST",
        headers: authHeaders(token),
        body: formData,
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || `HTTP ${res.status}`);
      }

      navigate({ to: "/skills/$slug", params: { slug: slug.trim() } });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to publish skill.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-50">
          {isUpdate ? "Publish New Version" : "Publish a Skill"}
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {isUpdate
            ? `Publishing a new version for ${updateSlug}.`
            : "Create a new skill or publish a new version of an existing one."}
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900"
        >
          {/* Slug */}
          <div>
            <label className={labelCls}>
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="my-awesome-skill"
              className={isUpdate ? inputDisabledCls : inputCls}
              readOnly={isUpdate}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              {isUpdate
                ? "Slug cannot be changed when publishing a new version."
                : "Unique identifier. Use lowercase letters, numbers, and hyphens."}
            </p>
          </div>

          {/* Display Name */}
          <div>
            <label className={labelCls}>
              Display Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="My Awesome Skill"
              className={inputCls}
            />
          </div>

          {/* Version */}
          <div>
            <label className={labelCls}>
              Version <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              className={inputCls}
            />
            <div className="mt-1.5 flex items-start gap-1.5 rounded-md bg-blue-50 px-2.5 py-2 dark:bg-blue-950/40">
              <Info size={14} className="mt-0.5 shrink-0 text-blue-500 dark:text-blue-400" />
              <p className="text-xs leading-relaxed text-blue-700 dark:text-blue-300">
                Uses <span className="font-semibold">Semantic Versioning</span> (SemVer) format:{" "}
                <code className="rounded bg-blue-100 px-1 py-0.5 font-mono text-[11px] dark:bg-blue-900/60">
                  MAJOR.MINOR.PATCH
                </code>
                . Increment <span className="font-medium">MAJOR</span> for breaking changes,{" "}
                <span className="font-medium">MINOR</span> for new features (backward-compatible),{" "}
                <span className="font-medium">PATCH</span> for bug fixes.
              </p>
            </div>
          </div>

          {/* Changelog */}
          <div>
            <label className={labelCls}>
              Changelog <span className="text-red-500">*</span>
            </label>
            <textarea
              value={changelog}
              onChange={(e) => setChangelog(e.target.value)}
              placeholder="Describe what changed in this version..."
              rows={4}
              className={inputCls}
            />
          </div>

          {/* Tags */}
          <div>
            <label className={labelCls}>
              Tags
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="utility, text-processing, development"
              className={inputCls}
            />
            <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
              Comma-separated list of tags.
            </p>
          </div>

          {/* Folder drop zone */}
          <div>
            <label className={labelCls}>
              Files
            </label>

            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              className={`rounded-lg border-2 border-dashed p-5 transition-colors ${
                dragOver
                  ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                  : "border-gray-300 bg-gray-50 dark:border-gray-600 dark:bg-gray-800"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Drop a folder</p>
                  <p className="mt-1 text-xs text-gray-400 dark:text-gray-500">
                    We keep folder paths and flatten the outer wrapper automatically.
                  </p>
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  {files.length} file{files.length !== 1 ? "s" : ""} · {totalSize(files)}
                </span>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => folderInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  <FolderOpen size={14} />
                  Choose folder
                </button>
                <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600">
                  <Plus size={14} />
                  Add files
                  <input
                    type="file"
                    multiple
                    onChange={handleFileAdd}
                    className="hidden"
                  />
                </label>
              </div>

              <input
                ref={folderInputRef}
                type="file"
                /* @ts-expect-error -- webkitdirectory is non-standard but widely supported */
                webkitdirectory=""
                multiple
                onChange={handleFolderSelect}
                className="hidden"
              />
            </div>

            {/* File list */}
            {files.length > 0 ? (
              <div className="mt-3 max-h-60 space-y-1 overflow-y-auto">
                {files.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded border border-gray-200 px-3 py-1.5 text-sm dark:border-gray-700"
                  >
                    <span className="min-w-0 truncate text-gray-700 dark:text-gray-300" title={f.path}>
                      {f.path}
                    </span>
                    <div className="flex shrink-0 items-center gap-2 pl-2">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {formatSize(f.file.size)}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeFile(i)}
                        className="text-gray-400 hover:text-red-500 dark:text-gray-500 dark:hover:text-red-400"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">No files selected.</p>
            )}
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            <UploadIcon size={16} />
            {submitting ? "Publishing..." : isUpdate ? "Publish New Version" : "Publish"}
          </button>
        </form>
      )}
    </div>
  );
}
