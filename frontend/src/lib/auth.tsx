import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Owner } from "./api";
import { apiFetch } from "./api";

const TOKEN_KEY = "wiclawhub_token";
const REFRESH_TOKEN_KEY = "wiclawhub_refresh_token";

interface AuthState {
  token: string | null;
  user: Owner | null;
  isLoading: boolean;
  login: (token: string) => Promise<boolean>;
  loginWithTokens: (accessToken: string, refreshToken: string) => Promise<boolean>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  authFetch: <T = unknown>(path: string, init?: RequestInit) => Promise<T>;
}

const AuthContext = createContext<AuthState>({
  token: null,
  user: null,
  isLoading: false,
  login: async () => false,
  loginWithTokens: async () => false,
  logout: () => {},
  refreshUser: async () => {},
  authFetch: () => Promise.reject(new Error("AuthProvider not mounted")),
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() =>
    localStorage.getItem(TOKEN_KEY),
  );
  const [, setRefreshToken] = useState<string | null>(() =>
    localStorage.getItem(REFRESH_TOKEN_KEY),
  );
  const [user, setUser] = useState<Owner | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const tryRefreshToken = useCallback(async (): Promise<string | null> => {
    const rt = localStorage.getItem(REFRESH_TOKEN_KEY);
    if (!rt) return null;
    try {
      const res = await apiFetch<{
        access_token: string;
        refresh_token: string;
        user: Owner;
      }>("/auth/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: rt }),
      });
      localStorage.setItem(TOKEN_KEY, res.access_token);
      localStorage.setItem(REFRESH_TOKEN_KEY, res.refresh_token);
      setToken(res.access_token);
      setRefreshToken(res.refresh_token);
      setUser(res.user);
      return res.access_token;
    } catch {
      // Refresh token also expired — force logout
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      return null;
    }
  }, []);

  const fetchUser = useCallback(async (t: string) => {
    try {
      setIsLoading(true);
      const res = await apiFetch<{ user: Owner }>("/whoami", {
        headers: { Authorization: `Bearer ${t}` },
      });
      setUser(res.user);
      return true;
    } catch {
      // Token may have expired — try refresh
      const newToken = await tryRefreshToken();
      if (newToken) return true;
      setUser(null);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [tryRefreshToken]);

  useEffect(() => {
    if (token) {
      fetchUser(token);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Legacy API token login
  const login = useCallback(
    async (t: string) => {
      const ok = await fetchUser(t);
      if (ok) {
        setToken(t);
        localStorage.setItem(TOKEN_KEY, t);
      }
      return ok;
    },
    [fetchUser],
  );

  // JWT-based login (from registration, email login, or OAuth callback)
  const loginWithTokens = useCallback(
    async (accessToken: string, newRefreshToken: string) => {
      const ok = await fetchUser(accessToken);
      if (ok) {
        setToken(accessToken);
        setRefreshToken(newRefreshToken);
        localStorage.setItem(TOKEN_KEY, accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken);
      }
      return ok;
    },
    [fetchUser],
  );

  const refreshUser = useCallback(async () => {
    if (token) {
      await fetchUser(token);
    }
  }, [token, fetchUser]);

  const authFetch = useCallback(
    async <T = unknown>(path: string, init?: RequestInit): Promise<T> => {
      const currentToken = localStorage.getItem(TOKEN_KEY);
      if (!currentToken) throw new Error("Not authenticated");

      const headers = { ...init?.headers, Authorization: `Bearer ${currentToken}` };
      try {
        return await apiFetch<T>(path, { ...init, headers });
      } catch (err: unknown) {
        // On 401, try refreshing the token and retry once
        if (err instanceof Error && err.message.includes("401")) {
          const newToken = await tryRefreshToken();
          if (newToken) {
            return await apiFetch<T>(path, {
              ...init,
              headers: { ...init?.headers, Authorization: `Bearer ${newToken}` },
            });
          }
        }
        throw err;
      }
    },
    [tryRefreshToken],
  );

  const logout = useCallback(async () => {
    // Attempt to revoke refresh token server-side
    if (token) {
      try {
        await apiFetch("/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {
        // Ignore errors during logout
      }
    }
    setToken(null);
    setRefreshToken(null);
    setUser(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }, [token]);

  return (
    <AuthContext.Provider value={{ token, user, isLoading, login, loginWithTokens, logout, refreshUser, authFetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}

export function authHeaders(token: string | null): Record<string, string> {
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
