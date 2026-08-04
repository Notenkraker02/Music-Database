"use client";

import { useState } from "react";
import { getCoverUrl } from "@/lib/supabase";
import { Disc3 } from "lucide-react";

interface CoverImageProps {
  coverPath: string | null;
  alt: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const SIZES = {
  sm: "w-12 h-12",
  md: "w-24 h-24",
  lg: "w-48 h-48",
  xl: "w-full aspect-square max-w-md",
};

// export function CoverImage({ coverPath, alt, size = "md", className = "" }: CoverImageProps) {
//   const [error, setError] = useState(false);
//   const url = getCoverUrl(coverPath);
//   const sizeClass = SIZES[size];

//   if (error || !coverPath) {
//     return (
//       <div
//         className={`${sizeClass} bg-ink-800 rounded-lg flex items-center justify-center ${className}`}
//       >
//         <Disc3 className="w-1/3 h-1/3 text-ink-600" />
//       </div>
//     );
//   }

//   return (
//     <img
//       src={url}
//       alt={alt}
//       loading="lazy"
//       onError={() => setError(true)}
//       className={`${sizeClass} object-cover rounded-lg ${className}`}
//     />
//   );
// }

export function CoverImage({ coverPath, alt, size = "md", className = "" }: CoverImageProps) {
  return ( <div 
    style ={{ width = 200,
      height = 200,
      background = "red",
      color = "white",
    }}
    >
      {coverPath ?? "NO COVER"}
    </div>
  );
}