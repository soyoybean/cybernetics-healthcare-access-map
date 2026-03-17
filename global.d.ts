declare global {
  interface Window {
    __healthcareAccessMapGaInitialized?: boolean
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string
          callback?: (token: string) => void
          'expired-callback'?: () => void
          'error-callback'?: () => void
        },
      ) => string | number
      reset: (widgetId: string | number) => void
    }
  }

  interface ImportMetaEnv {
    readonly VITE_TURNSTILE_SITE_KEY?: string
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv
  }
}

export {}
