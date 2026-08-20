/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Leaderboard API origin for static hosts (itch). Empty = same origin. */
  readonly VITE_API_BASE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
