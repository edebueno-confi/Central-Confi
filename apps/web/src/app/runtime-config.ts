export interface RuntimeConfig {
  appEnv: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
}

export interface MissingRuntimeConfig {
  missingKeys: string[];
}

const runtimeEnv = import.meta.env;

function readEnvValue(key: string) {
  return (runtimeEnv[key as keyof typeof runtimeEnv] ?? '')
    .toString()
    .trim();
}

export function readRuntimeConfig():
  | { ok: true; config: RuntimeConfig }
  | { ok: false; error: MissingRuntimeConfig } {
  const appEnv = readEnvValue('VITE_APP_ENV') || 'development';
  const supabaseUrl = readEnvValue('VITE_SUPABASE_URL');
  const supabaseAnonKey = readEnvValue('VITE_SUPABASE_ANON_KEY');

  const missingKeys = [
    !supabaseUrl ? 'VITE_SUPABASE_URL' : null,
    !supabaseAnonKey ? 'VITE_SUPABASE_ANON_KEY' : null,
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
