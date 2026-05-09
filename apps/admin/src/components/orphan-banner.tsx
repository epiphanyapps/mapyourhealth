"use client";

import { AlertTriangle } from "lucide-react";

const EPI_25_URL =
  "https://linear.app/epiphany-apps/issue/EPI-25/decide-fate-of-orphaned-admin-pages-observations-pollution-sources";

interface OrphanBannerProps {
  /** What this page edits, in admin-friendly terms (e.g., "pollution sources"). */
  pageLabel: string;
}

/** Top-of-page banner for admin sections whose mobile consumer was removed
 *  in PR #309. Surfaces the orphan state inline so contributors don't waste
 *  effort entering data that doesn't ship. Decision pending on EPI-25. */
export function OrphanBanner({ pageLabel }: OrphanBannerProps) {
  return (
    <div
      role="status"
      className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
        <div className="space-y-1 text-sm">
          <p className="font-semibold">No mobile consumer for {pageLabel}.</p>
          <p>
            The mobile dashboard card that read this data was removed in PR
            #309. Edits made here will not appear in the app until the consumer
            surface is restored.{" "}
            <a
              href={EPI_25_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium underline hover:no-underline"
            >
              EPI-25
            </a>{" "}
            tracks the decision on whether to restore, archive, or repurpose
            this page.
          </p>
        </div>
      </div>
    </div>
  );
}
