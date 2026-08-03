import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Build a public URL for a cover stored in Supabase Storage */
export function getCoverUrl(coverPath: string | null): string {
  if (!coverPath) {
    return `${supabaseUrl}/storage/v1/object/public/covers/empty_cover.jpg`;
  }
  return `${supabaseUrl}/storage/v1/object/public/${coverPath}`;
}
