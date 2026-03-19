import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Github, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";

const API_BASE = "/api/v1";

const inputCls =
  "w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder-gray-400 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100 dark:placeholder-gray-500 dark:focus:border-indigo-400 dark:focus:ring-indigo-400";

const labelCls =
  "mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300";

const oauthBtnCls =
  "flex flex-1 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700";

export function SignUpPage() {
  const { loginWithTokens } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [retypePassword, setRetypePassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showRetypePassword, setShowRetypePassword] = useState(false);
  const [agreeTos, setAgreeTos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuth = (provider: string) => {
    window.location.href = `${API_BASE}/auth/oauth/${provider}/authorize`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== retypePassword) {
      setError("Passwords do not match. Please retype your password.");
      return;
    }
    if (!agreeTos) {
      setError("You must agree to the Terms of Service.");
      return;
    }

    setIsLoading(true);
    try {
      const resp = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, agree_tos: true }),
      });

      if (resp.status === 409) {
        setError("An account with this email already exists. Sign in instead.");
        return;
      }

      if (!resp.ok) {
        const data = await resp.json().catch(() => null);
        setError(data?.detail || "Registration failed. Please try again.");
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
      setIsLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-md py-16">
      <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        {/* Close button area */}
        <div className="mb-6 text-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-50">Create your account</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Welcome! Please fill in the details to get started.
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
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          </button>
          <button
            type="button"
            className={`${oauthBtnCls} disabled:opacity-50`}
            title="Coming soon"
            disabled
          >
            <span className="text-lg">🐱</span>
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
        <form onSubmit={handleSubmit} className="space-y-4">
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

          <div>
            <label htmlFor="retype-password" className={labelCls}>
              Retype password
            </label>
            <div className="relative">
              <input
                id="retype-password"
                type={showRetypePassword ? "text" : "password"}
                value={retypePassword}
                onChange={(e) => setRetypePassword(e.target.value)}
                placeholder="Retype your password"
                className={`${inputCls} pr-10${retypePassword && retypePassword !== password ? " border-red-400 dark:border-red-500" : ""}`}
              />
              <button
                type="button"
                onClick={() => setShowRetypePassword(!showRetypePassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                {showRetypePassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {retypePassword && retypePassword !== password && (
              <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                Passwords do not match.
              </p>
            )}
          </div>

          <div className="flex items-start gap-2">
            <input
              id="agree-tos"
              type="checkbox"
              checked={agreeTos}
              onChange={(e) => setAgreeTos(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-800"
            />
            <label htmlFor="agree-tos" className="text-sm text-gray-600 dark:text-gray-400">
              I agree to the{" "}
              <a href="#" className="text-indigo-600 hover:underline dark:text-indigo-400">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-indigo-600 hover:underline dark:text-indigo-400">
                Privacy Policy
              </a>
            </label>
          </div>

          {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {isLoading ? "Creating account..." : "Continue ▸"}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline dark:text-indigo-400">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
