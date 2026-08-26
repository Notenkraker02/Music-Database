"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  accent?: string;
  /** When true, the value is blurred until the user clicks to reveal it. */
  blurUntilClick?: boolean;
}

export function StatCard({
  label,
  value,
  icon: Icon,
  accent = "text-groove",
  blurUntilClick = false,
}: StatCardProps) {
  const [revealed, setRevealed] = useState(false);
  const hidden = blurUntilClick && !revealed;

  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          {blurUntilClick ? (
            <button
              type="button"
              onClick={() => setRevealed((r) => !r)}
              title={hidden ? "Click to reveal" : "Click to hide"}
              className="text-left group focus:outline-none"
            >
              <span
                className={`stat-value block transition-all duration-200 ${
                  hidden ? "blur-md select-none group-hover:blur-sm" : ""
                }`}
              >
                {value}
              </span>
              {hidden ? (
                <span className="stat-label flex items-center gap-1 text-ink-500">
                  <Eye className="w-3.5 h-3.5" /> Click to reveal
                </span>
              ) : (
                <span className="stat-label">{label}</span>
              )}
            </button>
          ) : (
            <>
              <p className="stat-value">{value}</p>
              <p className="stat-label">{label}</p>
            </>
          )}
        </div>
        <div className={`p-2.5 rounded-lg bg-ink-800 ${accent}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
    </div>
  );
}
