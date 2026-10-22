import type { SourceRef } from "@team-republic/contracts";
import type { ReactNode } from "react";

export function sourceTooltip(ref: SourceRef): string {
  const parts: string[] = [ref.title];
  if (ref.sheet) {
    parts.push(`sheet ${ref.sheet}`);
  }
  if (ref.row != null) {
    parts.push(`row ${ref.row}`);
  }
  if (ref.page != null) {
    parts.push(`page ${ref.page}`);
  }
  return parts.join(" · ");
}

export function SourceLink({
  source,
  children,
  className,
}: {
  source: SourceRef;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      title={sourceTooltip(source)}
      className={
        className ??
        "text-neutral-800 underline decoration-neutral-400 underline-offset-2 hover:decoration-neutral-800"
      }
    >
      {children}
    </a>
  );
}
