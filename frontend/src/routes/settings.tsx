import { useState, useRef, useCallback } from "react";
import { Link } from "@tanstack/react-router";
import { KeyRound, User, Camera, Check, X, Copy, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_BASE = "/api/v1";

function EditableField({
  label,
  value,
  fieldKey,
  token,
  onSaved,
  placeholder,
  hint,
  displayPrefix,
}: {
  label: string;
  value: string | null;
  fieldKey: string;
  token: string;
  onSaved: () => Promise<void>;
  placeholder?: string;
  hint?: string;
  displayPrefix?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSave = async () => {
    setError(null);
    setSuccess(false);
    setSaving(true);
    try {
      const resp = await fetch(`${API_BASE}/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ [fieldKey]: draft }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        setError(data?.detail || `Failed to update ${label.toLowerCase()}.`);
        return;
      }
      await onSaved();
      setEditing(false);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2000);
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value ?? "");
    setEditing(false);
    setError(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <span className="text-gray-500 dark:text-gray-400">{label}</span>
        {!editing ? (
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {value ? `${displayPrefix ?? ""}${value}` : "—"}
            </span>
            <button
              type="button"
              onClick={() => {
                setDraft(value ?? "");
                setEditing(true);
                setSuccess(false);
              }}
              className="text-xs text-indigo-600 hover:underline dark:text-indigo-400"
            >
              Edit
            </button>
            {success && (
              <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
                <Check size={12} /> Saved
              </span>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <div className="flex w-48 items-center rounded border border-gray-300 focus-within:border-indigo-500 focus-within:ring-1 focus-within:ring-indigo-500 dark:border-gray-600 dark:focus-within:border-indigo-400 dark:focus-within:ring-indigo-400">
              {displayPrefix && (
                <span className="pl-2 text-sm text-gray-400 dark:text-gray-500">{displayPrefix}</span>
              )}
              <input
                type="text"
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder={placeholder}
                className={`w-full rounded bg-transparent py-1 pr-2 text-sm text-gray-900 focus:outline-none dark:text-gray-100 ${displayPrefix ? "pl-0" : "pl-2"}`}
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSave();
                  if (e.key === "Escape") handleCancel();
                }}
              />
            </div>
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded bg-indigo-600 p-1 text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              <Check size={14} />
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded border border-gray-300 p-1 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </div>
      {hint && !editing && !error && (
        <p className="mt-0.5 text-right text-xs text-gray-400 dark:text-gray-500">{hint}</p>
      )}
      {error && (
        <p className="mt-1 text-right text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}

function TokenSection({ token }: { token: string }) {
  const [copied, setCopied] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleCopy = useCallback(async () => {
    try {
      // Try the modern clipboard API first
      await navigator.clipboard.writeText(token);
    } catch {
      // Fallback: select + execCommand for non-secure contexts
      if (inputRef.current) {
        const prev = inputRef.current.type;
        inputRef.current.type = "text";
        inputRef.current.select();
        document.execCommand("copy");
        inputRef.current.type = prev;
        window.getSelection()?.removeAllRanges();
      }
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [token]);

  return (
    <section className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
        <KeyRound size={18} />
        API Token
      </h2>
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <input
            ref={inputRef}
            type={showToken ? "text" : "password"}
            value={token}
            readOnly
            className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
          />
          <button
            type="button"
            onClick={() => setShowToken(!showToken)}
            className="shrink-0 rounded-lg border border-gray-300 px-3 py-2 text-gray-500 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
            title={showToken ? "Hide token" : "Show token"}
          >
            {showToken ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-400 dark:hover:bg-gray-700"
          >
            {copied ? (
              <>
                <Check size={14} className="text-green-600 dark:text-green-400" />
                <span className="text-green-600 dark:text-green-400">Copied</span>
              </>
            ) : (
              <>
                <Copy size={14} />
                Copy
              </>
            )}
          </button>
        </div>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          This token is used to authenticate API requests. Keep it secret.
        </p>
      </div>
    </section>
  );
}

export function SettingsPage() {
  const { token, user, refreshUser } = useAuth();

  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!token) {
    return (
      <div className="py-16 text-center">
        <p className="text-gray-500 dark:text-gray-400">Please sign in to view settings.</p>
        <Link
          to="/login"
          className="mt-4 inline-block text-sm text-indigo-600 hover:text-indigo-700 dark:text-indigo-400 dark:hover:text-indigo-300"
        >
          Sign in
        </Link>
      </div>
    );
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarError(null);

    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setAvatarError("Please upload a JPEG, PNG, GIF, or WebP image.");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setAvatarError("Image must be smaller than 2 MB.");
      return;
    }

    setAvatarUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const resp = await fetch(`${API_BASE}/profile/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        setAvatarError(data?.detail || "Failed to upload avatar.");
        return;
      }
      await refreshUser();
    } catch {
      setAvatarError("Network error. Please try again.");
    } finally {
      setAvatarUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const avatarUrl = user?.image || null;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-2xl font-bold text-gray-900 dark:text-gray-50">Settings</h1>

      {/* Profile */}
      <section className="mb-6 rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-900">
        <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
          <User size={18} />
          Profile
        </h2>

        {/* Avatar */}
        <div className="mb-6 flex items-center gap-4">
          <div className="relative">
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={avatarUploading}
              className="group relative h-20 w-20 overflow-hidden rounded-full border-2 border-gray-200 bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-800 dark:focus:ring-offset-gray-900"
            >
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-2xl font-bold text-gray-400 dark:text-gray-500">
                  {(user?.displayName || user?.handle || "?")[0].toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <Camera size={20} className="text-white" />
              </div>
            </button>
            {avatarUploading && (
              <div className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70 dark:bg-gray-900/70">
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
              </div>
            )}
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile photo</p>
            <button
              type="button"
              onClick={handleAvatarClick}
              disabled={avatarUploading}
              className="mt-1 text-sm text-indigo-600 hover:underline disabled:opacity-50 dark:text-indigo-400"
            >
              {avatarUrl ? "Change photo" : "Upload photo"}
            </button>
            <p className="mt-0.5 text-xs text-gray-400 dark:text-gray-500">
              JPEG, PNG, GIF, or WebP. Max 2 MB.
            </p>
            {avatarError && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">{avatarError}</p>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleAvatarChange}
            className="hidden"
          />
        </div>

        {/* Fields */}
        <div className="space-y-4 text-sm">
          <EditableField
            label="Handle"
            value={user?.handle ?? null}
            fieldKey="handle"
            token={token}
            onSaved={refreshUser}
            placeholder="my-handle"
            displayPrefix="@"
            hint="Letters, numbers, hyphens, underscores only"
          />
          <EditableField
            label="Display Name"
            value={user?.displayName ?? null}
            fieldKey="display_name"
            token={token}
            onSaved={refreshUser}
          />
        </div>
      </section>

      {/* API Token */}
      <TokenSection token={token} />
    </div>
  );
}
