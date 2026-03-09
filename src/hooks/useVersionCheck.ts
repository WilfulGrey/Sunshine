import { useEffect, useRef, useCallback } from 'react';

function extractScriptHash(html: string): string | null {
  const match = html.match(/\/assets\/index-([a-zA-Z0-9]+)\.js/);
  return match ? match[1] : null;
}

export function useVersionCheck() {
  const currentHashRef = useRef<string | null>(null);
  const updateAvailableRef = useRef(false);

  // Read hash of currently loaded script
  useEffect(() => {
    const scriptEl = document.querySelector('script[src*="/assets/index-"]');
    if (!scriptEl) return; // dev mode — no hashed assets
    const src = scriptEl.getAttribute('src') || '';
    currentHashRef.current = extractScriptHash(src);
  }, []);

  // Check every 60s if a new deploy happened
  useEffect(() => {
    if (!currentHashRef.current) return; // dev mode

    const checkForUpdate = async () => {
      try {
        const response = await fetch(`/index.html?_=${Date.now()}`, { cache: 'no-store' });
        const html = await response.text();
        const remoteHash = extractScriptHash(html);
        if (remoteHash && remoteHash !== currentHashRef.current) {
          updateAvailableRef.current = true;
        }
      } catch { /* silently ignore network errors */ }
    };

    checkForUpdate();
    const interval = setInterval(checkForUpdate, 60_000);
    return () => clearInterval(interval);
  }, []);

  const reloadIfUpdateAvailable = useCallback((): boolean => {
    if (updateAvailableRef.current) {
      window.location.reload();
      return true;
    }
    return false;
  }, []);

  return { reloadIfUpdateAvailable };
}
