"use client";

import { useEffect, useState } from "react";
import { getCoverUrl } from "@/lib/supabase";
import { Disc3 } from "lucide-react";

interface CoverImageProps {
  coverPath: string | null | undefined;
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

export function CoverImage({ coverPath, alt, size = "md", className = "" }: CoverImageProps) {
  useEffect(() => {
    setError(false);
  }, [coverPath]);

  const cleanCoverPath = coverPath?.trim();
  const url = cleanCoverPath ? getCoverUrl(cleanCoverPath) : null;
  const sizeClass = SIZES[size];

  if (error || !url) {
    return (
      <div
        className={`${sizeClass} ${className} flex items-center justify-center bg-ink-800 rounded-lg bg-ink-800 text-ink-500`}
      >
        <Disc3 className="w-1/2 h-1/2" />
      </div>
    );
  }

  return (
    <img
      src={url}
      alt={alt}
      loading="lazy"
      onError={() => setError(true)}
      className={`${sizeClass} object-cover rounded-lg ${className}`}
    />
  );
}
