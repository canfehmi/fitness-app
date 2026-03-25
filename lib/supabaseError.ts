import type { PostgrestError } from "@supabase/supabase-js";

/** Alert / kullanıcı mesajı için PostgREST hatasını tek satırda birleştirir. */
export function formatPostgrestError(e: PostgrestError): Error {
  const parts = [e.message, e.details, e.hint].filter(
    (s): s is string => Boolean(s && String(s).trim()),
  );
  return new Error(parts.join(" — ") || "Veritabanı hatası");
}
