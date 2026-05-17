"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";

type LinkedCountBadgeProps = {
  count: number;
  label?: string;
  icon?: ReactNode;
  href?: string;
  title?: string;
};

export function LinkedCountBadge({
  count,
  label,
  icon,
  href,
  title,
}: LinkedCountBadgeProps) {
  const tooltip =
    title ?? (label ? `${count} ${label}` : String(count));
  const content = (
    <>
      {icon}
      <span>{count}</span>
      {label ? <span className="text-muted-foreground">{label}</span> : null}
    </>
  );

  if (count === 0 || !href) {
    return (
      <Badge variant="outline" className="text-muted-foreground" title={tooltip}>
        {content}
      </Badge>
    );
  }

  return (
    <Badge asChild variant="secondary" title={tooltip}>
      <Link href={href}>{content}</Link>
    </Badge>
  );
}
