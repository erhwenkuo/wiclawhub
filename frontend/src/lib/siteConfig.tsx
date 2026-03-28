import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface SiteConfig {
  siteName: string;
}

const DEFAULT_SITE_NAME = "WiClawHub";

const SiteConfigContext = createContext<SiteConfig>({ siteName: DEFAULT_SITE_NAME });

export function SiteConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState<SiteConfig>({ siteName: DEFAULT_SITE_NAME });

  useEffect(() => {
    fetch("/api/v1/site-config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.siteName) {
          setConfig({ siteName: data.siteName });
          document.title = data.siteName;
        }
      })
      .catch(() => {});
  }, []);

  return (
    <SiteConfigContext.Provider value={config}>
      {children}
    </SiteConfigContext.Provider>
  );
}

export function useSiteConfig(): SiteConfig {
  return useContext(SiteConfigContext);
}
