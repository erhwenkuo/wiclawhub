import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Github, Eye, EyeOff, KeyRound } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_BASE = "/api/v1";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

const labelCls =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

const oauthBtnCls =
  "flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700";

export function LoginPage() {
  const { login, loginWithTokens, isLoading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // API token section
  const [showTokenLogin, setShowTokenLogin] = useState(false);
  const [apiToken, setApiToken] = useState("");

  const handleOAuth = (provider: string) => {
    window.location.href = `${API_BASE}/auth/oauth/${provider}/authorize`;
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (!password) {
      setError("Please enter your password.");
      return;
    }

    setSubmitting(true);
    try {
      const resp = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        setError(data?.detail || "Invalid email or password.");
        return;
      }

      const data = await resp.json();
      const ok = await loginWithTokens(data.access_token, data.refresh_token);
      if (ok) {
        navigate({ to: "/dashboard" });
      }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleTokenLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmed = apiToken.trim();
    if (!trimmed) {
      setError("Please enter your API token.");
      return;
    }
    const ok = await login(trimmed);
    if (ok) {
      navigate({ to: "/dashboard" });
    } else {
      setError("Invalid API token. Please check and try again.");
    }
  };

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Sign in</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome back! Choose your sign-in method.
          </p>
        </div>

        {/* OAuth buttons */}
        <div className="mb-4 flex gap-3">
          <button
            type="button"
            onClick={() => handleOAuth("github")}
            className={oauthBtnCls}
          >
            <Github size={20} />
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            className={oauthBtnCls}
          >
            <svg viewBox="0 0 24 24" width="20" height="20">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
            </svg>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="bg-white px-4 text-gray-400 dark:bg-gray-900 dark:text-gray-500">or</span>
          </div>
        </div>

        {/* Email/Password form */}
        <form onSubmit={handleEmailLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className={labelCls}>
              Email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              className={inputCls}
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="password" className={labelCls}>
              Password
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className={`${inputCls} pr-10`}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {error && !showTokenLogin && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>

        {/* API Token section */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setShowTokenLogin(!showTokenLogin)}
            className="flex w-full items-center justify-center gap-2 text-sm text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
          >
            <KeyRound size={14} />
            Sign in with API token
          </button>

          {showTokenLogin && (
            <form onSubmit={handleTokenLogin} className="mt-3 space-y-3">
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Enter your API token"
                className={inputCls}
              />
              {error && showTokenLogin && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full rounded-lg border border-indigo-600 px-4 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50 disabled:opacity-50 dark:border-indigo-400 dark:text-indigo-400 dark:hover:bg-indigo-950"
              >
                {isLoading ? "Verifying..." : "Verify token"}
              </button>
            </form>
          )}
        </div>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Sign Up
          </Link>
        </p>
      </div>
    </div>
  );
}
