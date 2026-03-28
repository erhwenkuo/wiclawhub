import { useState, useEffect } from "react";
import { Github } from "lucide-react";
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

  // Build OAuth URL with CLI params forwarded through the backend state
  const handleOAuth = (provider: string) => {
    const oauthParams = new URLSearchParams({
      cli_redirect_uri: redirectUri!,
      cli_state: state!,
    });
    window.location.href = `${API_BASE}/auth/oauth/${provider}/authorize?${oauthParams.toString()}`;
  };

  // User is not logged in — show login form
  if (!token || !user) {
    const inputCls =
      "w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

    const oauthBtnCls =
      "flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700";

    return (
      <div className="mx-auto mt-16 max-w-sm">
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
          <h1 className="mb-1 text-center text-xl font-bold text-gray-900 dark:text-gray-100">
            Authorize CLI
          </h1>
          <p className="mb-6 text-center text-sm text-gray-500 dark:text-gray-400">
            Sign in to authorize <strong>{label}</strong>
          </p>

          {/* OAuth buttons */}
          <div className="mb-4 flex gap-3">
            <button type="button" onClick={() => handleOAuth("github")} className={oauthBtnCls}>
              <Github size={20} />
              GitHub
            </button>
            <button type="button" onClick={() => handleOAuth("google")} className={oauthBtnCls}>
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Google
            </button>
          </div>

          {/* Divider */}
          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="bg-white px-4 text-gray-400 dark:bg-gray-900 dark:text-gray-500">or</span>
            </div>
          </div>

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
