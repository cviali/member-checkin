interface CloudflareEnv {
  ASSETS: Fetcher;
  API: Fetcher;
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_API_URL: string;
    }
  }
}

export {};
