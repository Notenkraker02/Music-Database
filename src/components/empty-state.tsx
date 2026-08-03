import { SearchX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon: Icon = SearchX,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="p-4 rounded-full bg-ink-800 mb-4">
        <Icon className="w-8 h-8 text-ink-500" />
      </div>
      <h3 className="text-lg font-semibold text-ink-200 mb-1">{title}</h3>
      {description && <p className="text-sm text-ink-400 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
