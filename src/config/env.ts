import "server-only";

/**
 * Server-side configuration. Everything optional degrades gracefully:
 * no Cloudinary → image upload hidden, no Supabase → staff login disabled,
 * no DATABASE_URL → embedded PGlite (development only).
 */
const isProduction = process.env.NODE_ENV === "production";

function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value ? value : undefined;
}

export const env = {
  isProduction,
  databaseUrl: optional("DATABASE_URL"),
  pgliteDir: optional("PGLITE_DIR") ?? ".data/pglite",
  sessionSecret: optional("SESSION_SECRET") ?? (isProduction ? undefined : "dev-only-insecure-session-secret"),
  moderationMode: (optional("MODERATION_MODE") === "pre" ? "pre" : "post") as "pre" | "post",
  showDemoData: optional("SHOW_DEMO_DATA") === "true",
  supabaseUrl: optional("NEXT_PUBLIC_SUPABASE_URL"),
  supabaseAnonKey: optional("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  /** Development-only staff login without Supabase. Ignored in production. */
  devAuthEnabled: !isProduction && optional("DEV_AUTH_ENABLED") === "true",
  cloudinary: {
    cloudName: optional("CLOUDINARY_CLOUD_NAME"),
    apiKey: optional("CLOUDINARY_API_KEY"),
    apiSecret: optional("CLOUDINARY_API_SECRET"),
    folder: optional("CLOUDINARY_FOLDER") ?? "damkoto",
  },
  geocoder: {
    provider: (optional("GEOCODER_PROVIDER") === "nominatim" ? "nominatim" : "none") as "none" | "nominatim",
    nominatimUrl: optional("NOMINATIM_URL") ?? "https://nominatim.openstreetmap.org",
    userAgent: optional("GEOCODER_USER_AGENT"),
  },
};

export const features = {
  get imageUploads() {
    const c = env.cloudinary;
    return Boolean(c.cloudName && c.apiKey && c.apiSecret);
  },
  get supabaseAuth() {
    return Boolean(env.supabaseUrl && env.supabaseAnonKey);
  },
  get geocoding() {
    return env.geocoder.provider === "nominatim" && Boolean(env.geocoder.userAgent);
  },
};

export function requireSessionSecret(): string {
  if (!env.sessionSecret) {
    throw new Error("SESSION_SECRET must be set in production.");
  }
  return env.sessionSecret;
}
