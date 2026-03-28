import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/Spinner";

const API_BASE = "/api/v1";

/**
 * /cli/auth — Browser flow page for ClawHub CLI login.
 *
 * Flow:
 * 1. CLI opens this page with ?redirect_uri=...&state=...&label_b64=...
 * 2. If user is already logged in, generate an API token and redirect back.
 * 3. If not logged in, show login form first, then generate token and redirect.
 */
export function CliAuthPage() {
  const { token, user, isLoading } = useAuth();
  const [status, setStatus] = useState<
    "waiting" | "logging-in" | "generating" | "redirecting" | "error"
  >("waiting");
  const [error, setError] = useState<string | null>(null);
  const [redirected, setRedirected] = useState(false);

  // Login form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Parse query params
  const params = new URLSearchParams(window.location.search);
  const redirectUri = params.get("redirect_uri");
  const state = params.get("state");
  const labelB64 = params.get("label_b64");
  const label = labelB64
    ? (() => {
        try {
          return atob(labelB64.replace(/-/g, "+").replace(/_/g, "/"));
        } catch {
          return "CLI token";
        }
      })()
    : "CLI token";

  // Validate redirect_uri is a loopback address
  const isValidRedirect = (() => {
    if (!redirectUri) return false;
    try {
      const url = new URL(redirectUri);
      if (url.protocol !== "http:") return false;
      const host = url.hostname.toLowerCase();
      return (
        host === "127.0.0.1" ||
        host === "localhost" ||
        host === "::1" ||
        host === "[::1]"
      );
    } catch {
      return false;
    }
  })();

  // Generate token and redirect
  const generateAndRedirect = async (authToken: string) => {
    if (redirected) return;
    setStatus("generating");
    try {
      const resp = await fetch(`${API_BASE}/auth/cli-token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      });
      if (!resp.ok) {
        throw new Error("Failed to generate API token");
      }
      const data = await resp.json();
      const apiToken = data.token;

      // Build redirect URL with token in hash fragment
      const url = new URL(redirectUri!);
      const hashParams = new URLSearchParams();
      hashParams.set("token", apiToken);
      if (state) hashParams.set("state", state);
      url.hash = hashParams.toString();

      setStatus("redirecting");
      setRedirected(true);
      window.location.href = url.toString();
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  };

  // Auto-redirect if user is already logged in
  useEffect(() => {
    if (!isLoading && token && user && isValidRedirect && !redirected) {
      generateAndRedirect(token);
    }
  }, [isLoading, token, user, isValidRedirect, redirected]);

  // Handle email/password login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError(null);
    setLoginLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        setLoginError(data?.detail || "Login failed");
        return;
      }
      const data = await resp.json();
      // Use the access token directly to generate the CLI token
      await generateAndRedirect(data.access_token);
    } catch {
      setLoginError("Network error. Please try again.");
    } finally {
      setLoginLoading(false);
    }
  };

  if (!redirectUri || !state) {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <h1 className="text-xl font-bold text-red-600">Invalid Request</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          Missing required parameters. Please use the ClawHub CLI to initiate
          login.
        </p>
      </div>
    );
  }

  if (!isValidRedirect) {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <h1 className="text-xl font-bold text-red-600">Invalid Redirect</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          The redirect URI must be a loopback address (127.0.0.1 or localhost).
        </p>
      </div>
    );
  }

  if (isLoading) return <Spinner />;

  if (status === "generating" || status === "redirecting") {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <Spinner />
        <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          {status === "generating"
            ? "Generating API token..."
            : "Redirecting back to CLI..."}
        </p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="mx-auto mt-20 max-w-md text-center">
        <h1 className="text-xl font-bold text-red-600">Error</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {error}
        </p>
      </div>
    );
  }

  // User is not logged in — show login form
  if (!token || !user) {
    const inputCls =
      "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

    return (
      <div className="mx-auto mt-16 max-w-sm">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h1 className="mb-1 text-center text-xl font-bold text-gray-900 dark:text-gray-100">
            Authorize CLI
          </h1>
          <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Sign in to authorize <strong>{label}</strong>
          </p>

          {loginError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                placeholder="you@example.com"
                autoFocus
                required
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputCls}
                placeholder="Your password"
                required
              />
            </div>
            <button
              type="submit"
              disabled={loginLoading}
              className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {loginLoading ? "Signing in..." : "Sign in & Authorize"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  // Should not reach here — user is logged in and effect triggers redirect
  return <Spinner />;
}
