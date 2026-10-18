import { createClient } from "@supabase/supabase-js";
import { projectId, publicAnonKey } from "../../utils/supabase/info";

const defaultAuthStorageKey = `sb-${projectId}-auth-token`;
const authStorageKey = `nova-invest-${projectId}-auth-token`;

// Preserve sessions created before NOVA INVEST received its own storage key.
if (typeof window !== "undefined") {
  try {
    const existingSession = window.localStorage.getItem(defaultAuthStorageKey);
    if (existingSession && !window.localStorage.getItem(authStorageKey)) {
      window.localStorage.setItem(authStorageKey, existingSession);
    }
  } catch {
    // Supabase will fall back gracefully when browser storage is unavailable.
  }
}

const globalSupabase = globalThis as typeof globalThis & {
  __novaInvestSupabaseV2?: ReturnType<typeof createClient>;
};

export const supabase =
  globalSupabase.__novaInvestSupabaseV2 ??
  (globalSupabase.__novaInvestSupabaseV2 = createClient(
    `https://${projectId}.supabase.co`,
    publicAnonKey,
    {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
        storageKey: authStorageKey,
      },
    },
  ));
