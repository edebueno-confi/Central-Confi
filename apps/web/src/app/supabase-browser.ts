import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { AppError } from './errors';
import { readRuntimeConfig } from './runtime-config';

let browserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient() {
  const config = readRuntimeConfig();

  if (!config.ok) {
    return null;
  }

  if (browserClient) {
    return browserClient;
  }

  browserClient = createClient(
    config.config.supabaseUrl,
    config.config.supabaseAnonKey,
    {
      auth: {
        autoRefreshToken: true,
        detectSessionInUrl: true,
        persistSession: true,
        storageKey: `genius-support-os-${config.config.appEnv}-auth-token`,
      },
    },
  );

  return browserClient;
}

export function requireSupabaseBrowserClient() {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new AppError(
      'runtime-config',
      'As variaveis publicas do Supabase nao estao configuradas neste frontend.',
    );
  }

  return client;
}
