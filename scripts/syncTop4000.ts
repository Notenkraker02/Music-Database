import { supabase } from "@/lib/supabase";

export async function syncTop4000() {
    const { data: songs } = await supabase 
    .from("songs")
    .select("*");

    const { data: rankings } = await supabase
    .from("top4000_lists")
    .select("*");

    if (!songs || !rankings)  return;
    
    for (const song of songs) {
        const matches = rankings.filter(
            r => 
                r.artist.toLowerCase().trim() === song.artist.toLowerCase().trim() &&
                r.title.toLowerCase().trim() === song.title.toLowerCase().trim()
        );

        const updates: any = {};

        for (const match of matches) {
            switch (match.list_year) {
                case 2023:
                    if (!song.top2023) 
                        updates.top2023 = match.position;
                    break;
                case 2024:
                    if (!song.top2024) 
                        updates.top2024 = match.position;
                    break;
                case 2025:
                    if (!song.top2025)
                        updates.top2025 = match.position;
                    break;
                case 2026:
                    if (!song.top2026)
                        updates.top2026 = match.position;
                    break;
            }
        }

        if (Object.keys(updates).length > 0) {
            await supabase
                .from("songs")
                .update(updates)
                .eq("id", song.id);
        }
    }
}