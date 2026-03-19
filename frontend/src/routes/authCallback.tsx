import { useEffect } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAuth } from "@/lib/auth";
import { Spinner } from "@/components/Spinner";

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const { loginWithTokens } = useAuth();
  const search = useSearch({ strict: false }) as Record<string, string>;

  useEffect(() => {
    const accessToken = search.access_token;
    const refreshToken = search.refresh_token;

    if (accessToken && refreshToken) {
      // Clear tokens from URL to avoid leaking in browser history
      window.history.replaceState({}, "", "/auth/callback");

      loginWithTokens(accessToken, refreshToken).then((ok) => {
        navigate({ to: ok ? "/dashboard" : "/login" });
      });
    } else {
      navigate({ to: "/login" });
    }
  }, [search, loginWithTokens, navigate]);

  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="text-center">
        <Spinner />
        <p className="mt-4 text-sm text-gray-500">Signing you in...</p>
      </div>
    </div>
  );
}
