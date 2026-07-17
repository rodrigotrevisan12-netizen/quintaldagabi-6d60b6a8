const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined;

declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    turnstile: any;
  }
}

export function isTurnstileConfigured(): boolean {
  return Boolean(siteKey);
}

let scriptLoading: Promise<void> | null = null;

function loadTurnstileScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  if (scriptLoading) return scriptLoading;

  scriptLoading = new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src^="https://challenges.cloudflare.com/turnstile/v0/api.js"]',
    );
    if (existing && window.turnstile) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Falha ao carregar o CAPTCHA."));
    document.head.appendChild(script);
  });
  return scriptLoading;
}

/**
 * Renderiza o widget do Turnstile dentro do elemento informado.
 * Chama onToken toda vez que um token novo é gerado (inclusive em resets
 * automáticos por expiração — o Turnstile faz isso sozinho).
 */
export async function renderTurnstile(
  container: HTMLElement,
  onToken: (token: string) => void,
  onExpire?: () => void,
): Promise<string | undefined> {
  if (!siteKey) return undefined;
  await loadTurnstileScript();
  return window.turnstile.render(container, {
    sitekey: siteKey,
    callback: onToken,
    "expired-callback": () => onExpire?.(),
    "error-callback": () => onExpire?.(),
  });
}

export function resetTurnstile(widgetId: string | undefined) {
  if (widgetId && window.turnstile) {
    window.turnstile.reset(widgetId);
  }
}
