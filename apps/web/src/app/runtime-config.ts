export interface RuntimeConfig {
  appEnv: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface MissingRuntimeConfig {
  missingKeys: string[];
}

const runtimeEnv = import.meta.env;

function readEnvValue(primaryKey: string, fallbackKey?: string) {
  return (
    runtimeEnv[primaryKey as keyof typeof runtimeEnv] ??
    (fallbackKey
      ? runtimeEnv[fallbackKey as keyof typeof runtimeEnv]
      : undefined) ??
    ''
  )
    .toString()
    .trim();
}

export function readRuntimeConfig():
  | { ok: true; config: RuntimeConfig }
  | { ok: false; error: MissingRuntimeConfig } {
  const appEnv = readEnvValue('NEXT_PUBLIC_APP_ENV', 'VITE_APP_ENV') || 'development';
  const supabaseUrl = readEnvValue(
    'NEXT_PUBLIC_SUPABASE_URL',
    'VITE_SUPABASE_URL',
  );
  const supabaseAnonKey = readEnvValue(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'VITE_SUPABASE_ANON_KEY',
  );

  const missingKeys = [
    !supabaseUrl ? 'NEXT_PUBLIC_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'NEXT_PUBLIC_SUPABASE_ANON_KEY' : null,
  ].filter(Boolean) as string[];

  if (missingKeys.length > 0) {
    return {
      ok: false,
      error: { missingKeys },
    };
  }

  return {
    ok: true,
    config: {
      appEnv,
      supabaseUrl,
      supabaseAnonKey,
    },
  };
}
