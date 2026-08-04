import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Build a public URL for a cover stored in Supabase Storage */
export function getCoverUrl(path: string | null | undefined): string | null {
  if (!path) return "";
  
  // Clean the path in case it already includes the "covers/" folder name
  const cleanPath = path.startsWith("covers/") ? path.replace("covers/", "") : path;
  
  const { data } = supabase.storage.from("covers").getPublicUrl(cleanPath);
  return data.publicUrl;
}