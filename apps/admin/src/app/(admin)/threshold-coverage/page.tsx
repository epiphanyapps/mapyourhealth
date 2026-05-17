"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  CircleSlash,
  Loader2,
} from "lucide-react";
import {
  resolveThresholdCoverage,
  makeThresholdKey,
  type CoverageState,
  type MinimalJurisdiction,
} from "@/lib/threshold-cascade";

type Jurisdiction = Schema["Jurisdiction"]["type"];
type Contaminant = Schema["Contaminant"]["type"];
type ContaminantThreshold = Schema["ContaminantThreshold"]["type"];

type Counts = Record<CoverageState, number>;

const EMPTY_COUNTS: Counts = {
  "direct": 0,
  "cascade-parent": 0,
  "cascade-who": 0,
  "none": 0,
};

function formatChain(
  code: string,
  jurisdictionByCode: Map<string, MinimalJurisdiction>,
): string {
  const chain: string[] = [code];
  const current = jurisdictionByCode.get(code);
  // One-level parent + WHO terminator, mirroring resolveThresholdCoverage.
  if (current?.parentCode) chain.push(current.parentCode);
  if (chain[chain.length - 1] !== "WHO") chain.push("WHO");
  return chain.join(" → ");
}

export default function ThresholdCoveragePage() {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [contaminants, setContaminants] = useState<Contaminant[]>([]);
  const [thresholds, setThresholds] = useState<ContaminantThreshold[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [expandedCode, setExpandedCode] = useState<string | null>(null);
  const [truncatedLists, setTruncatedLists] = useState<string[]>([]);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const client = generateClient<Schema>();
        const [j, c, t] = await Promise.all([
          client.models.Jurisdiction.list({ limit: 100 }),
          client.models.Contaminant.list({ limit: 1000 }),
          client.models.ContaminantThreshold.list({ limit: 1000 }),
        ]);
        if (j.errors || c.errors || t.errors) {
          console.error("Coverage fetch errors", {
            j: j.errors,
            c: c.errors,
            t: t.errors,
          });
          toast.error("Failed to load coverage data");
          return;
        }
        setJurisdictions(j.data || []);
        setContaminants(c.data || []);
        setThresholds(t.data || []);

        // Detect pagination ceiling. Amplify list() returns nextToken when
        // more rows exist than the page size; we don't paginate here, so a
        // present nextToken means the audit is reading a partial dataset and
        // would mis-classify direct rows as cascade-WHO. Surface both as a
        // toast and a persistent inline banner so the warning doesn't vanish
        // while the admin reads the table.
        const truncated: string[] = [];
        if (j.nextToken) truncated.push("jurisdictions");
        if (c.nextToken) truncated.push("contaminants");
        if (t.nextToken) truncated.push("thresholds");
        setTruncatedLists(truncated);
        if (truncated.length > 0) {
          toast.warning(
            `Partial data: ${truncated.join(", ")} list(s) exceeded page size. Counts may undercount Direct.`,
          );
        }
      } catch (err) {
        console.error("Coverage fetch error", err);
        toast.error("Failed to load coverage data");
      } finally {
        setIsLoading(false);
      }
    };
    fetchAll();
  }, []);

  const jurisdictionByCode = useMemo(() => {
    const m = new Map<string, MinimalJurisdiction>();
    for (const j of jurisdictions) {
      m.set(j.code, { code: j.code, parentCode: j.parentCode });
    }
    return m;
  }, [jurisdictions]);

  const thresholdKeys = useMemo(() => {
    const s = new Set<string>();
    for (const t of thresholds) {
      if (!t.contaminantId || !t.jurisdictionCode) continue;
      s.add(makeThresholdKey(t.contaminantId, t.jurisdictionCode));
    }
    return s;
  }, [thresholds]);

  // For each jurisdiction, walk every contaminant and bucket the resolution state.
  // O(jurisdictions × contaminants) — ~20 × ~170 = 3400 lookups, all in-memory Set
  // hits. Trivial at this scale.
  const coverageByJurisdiction = useMemo(() => {
    const out = new Map<string, { counts: Counts; rows: Array<{
      contaminant: Contaminant;
      state: CoverageState;
      resolvedJurisdictionCode: string | null;
    }> }>();
    for (const j of jurisdictions) {
      const counts: Counts = { ...EMPTY_COUNTS };
      const rows: Array<{
        contaminant: Contaminant;
        state: CoverageState;
        resolvedJurisdictionCode: string | null;
      }> = [];
      for (const c of contaminants) {
        const cov = resolveThresholdCoverage(
          c.contaminantId,
          j.code,
          jurisdictionByCode,
          thresholdKeys,
        );
        counts[cov.state] += 1;
        rows.push({
          contaminant: c,
          state: cov.state,
          resolvedJurisdictionCode: cov.resolvedJurisdictionCode,
        });
      }
      out.set(j.code, { counts, rows });
    }
    return out;
  }, [jurisdictions, contaminants, jurisdictionByCode, thresholdKeys]);

  const totals = useMemo(() => {
    const sum: Counts = { ...EMPTY_COUNTS };
    for (const { counts } of coverageByJurisdiction.values()) {
      sum["direct"] += counts["direct"];
      sum["cascade-parent"] += counts["cascade-parent"];
      sum["cascade-who"] += counts["cascade-who"];
      sum["none"] += counts["none"];
    }
    return sum;
  }, [coverageByJurisdiction]);

  const totalCells = jurisdictions.length * contaminants.length;
  const directPct = totalCells === 0 ? 0 : Math.round((totals.direct * 100) / totalCells);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Threshold Coverage</h1>
        <p className="text-muted-foreground">
          For every (jurisdiction, contaminant) pair, where does the mobile
          app&apos;s safety badge get its limit from? Cells fall into one of:{" "}
          <span className="font-medium">✓ direct</span> (threshold seeded for
          this exact jurisdiction),{" "}
          <span className="font-medium">↓ cascade-parent</span> (no direct row,
          resolved via the jurisdiction&apos;s <code>parentCode</code>),{" "}
          <span className="font-medium">⚠ cascade-WHO</span> (fell all the way
          to the WHO default — this is what causes the mobile app&apos;s WHO
          and LOCAL columns to show identical values), or{" "}
          <span className="font-medium">⊘ none</span> (no row anywhere,
          unregulated for that contaminant). Mirrors{" "}
          <code>getThreshold</code> in mobile&apos;s ContaminantsContext.
        </p>
      </div>

      {truncatedLists.length > 0 && (
        <Card className="border-amber-300 bg-amber-50">
          <CardContent className="flex items-start gap-3 py-4">
            <AlertTriangle className="h-5 w-5 mt-0.5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Partial data — audit may undercount.</p>
              <p>
                The following list(s) exceeded the page size and were not
                fully fetched: <code>{truncatedLists.join(", ")}</code>.
                Missing rows are silently classified as cascading to WHO, so{" "}
                <span className="font-medium">⚠ Cascade to WHO</span> is
                inflated and <span className="font-medium">✓ Direct</span> is
                undercounted until pagination is wired up.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <SummaryCard
          label="✓ Direct"
          count={totals.direct}
          total={totalCells}
          tone="success"
        />
        <SummaryCard
          label="↓ Cascade to parent"
          count={totals["cascade-parent"]}
          total={totalCells}
          tone="info"
        />
        <SummaryCard
          label="⚠ Cascade to WHO"
          count={totals["cascade-who"]}
          total={totalCells}
          tone="warning"
        />
        <SummaryCard
          label="⊘ Unregulated"
          count={totals.none}
          total={totalCells}
          tone="muted"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>By Jurisdiction</CardTitle>
          <CardDescription>
            {jurisdictions.length} jurisdiction
            {jurisdictions.length === 1 ? "" : "s"} × {contaminants.length}{" "}
            contaminants = {totalCells.toLocaleString()} pairs.{" "}
            {directPct}% have a direct threshold; the rest cascade.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : jurisdictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No jurisdictions yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Cascade chain</TableHead>
                  <TableHead className="text-right">✓ Direct</TableHead>
                  <TableHead className="text-right">↓ Parent</TableHead>
                  <TableHead className="text-right">⚠ WHO</TableHead>
                  <TableHead className="text-right">⊘ None</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jurisdictions.map((j) => {
                  const cov = coverageByJurisdiction.get(j.code);
                  if (!cov) return null;
                  const isExpanded = expandedCode === j.code;
                  return (
                    <Fragment key={j.code}>
                      <TableRow>
                        <TableCell className="font-mono font-medium">
                          {j.code}
                        </TableCell>
                        <TableCell>{j.name}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {formatChain(j.code, jurisdictionByCode)}
                        </TableCell>
                        <CountCell count={cov.counts.direct} tone="success" />
                        <CountCell count={cov.counts["cascade-parent"]} tone="info" />
                        <CountCell count={cov.counts["cascade-who"]} tone="warning" />
                        <CountCell count={cov.counts.none} tone="muted" />
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() =>
                              setExpandedCode(isExpanded ? null : j.code)
                            }
                          >
                            {isExpanded ? "Hide" : "Show contaminants"}
                          </Button>
                        </TableCell>
                      </TableRow>
                      {isExpanded && (
                        <TableRow>
                          <TableCell colSpan={8} className="bg-muted/30">
                            <DetailList
                              jurisdictionCode={j.code}
                              rows={cov.rows}
                            />
                          </TableCell>
                        </TableRow>
                      )}
                    </Fragment>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({
  label,
  count,
  total,
  tone,
}: {
  label: string;
  count: number;
  total: number;
  tone: "success" | "info" | "warning" | "muted";
}) {
  const pct = total === 0 ? 0 : Math.round((count * 100) / total);
  const toneClass = {
    success: "text-green-600",
    info: "text-blue-600",
    warning: "text-amber-600",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardDescription>{label}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${toneClass}`}>
          {count.toLocaleString()}
          <span className="text-sm font-normal text-muted-foreground ml-2">
            {pct}%
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function CountCell({
  count,
  tone,
}: {
  count: number;
  tone: "success" | "info" | "warning" | "muted";
}) {
  if (count === 0) {
    return (
      <TableCell className="text-right text-muted-foreground">—</TableCell>
    );
  }
  const toneClass = {
    success: "text-green-700",
    info: "text-blue-700",
    warning: "text-amber-700 font-medium",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <TableCell className={`text-right tabular-nums ${toneClass}`}>
      {count}
    </TableCell>
  );
}

function DetailList({
  jurisdictionCode,
  rows,
}: {
  jurisdictionCode: string;
  rows: Array<{
    contaminant: Contaminant;
    state: CoverageState;
    resolvedJurisdictionCode: string | null;
  }>;
}) {
  // Order: ⚠ WHO-cascades and ⊘ none first (the gaps), then ↓ parent, then ✓ direct.
  const order: Record<CoverageState, number> = {
    "cascade-who": 0,
    "none": 1,
    "cascade-parent": 2,
    "direct": 3,
  };
  const sorted = [...rows].sort((a, b) => {
    const so = order[a.state] - order[b.state];
    if (so !== 0) return so;
    return a.contaminant.name.localeCompare(b.contaminant.name);
  });

  return (
    <div className="py-2 space-y-1 max-h-[480px] overflow-y-auto">
      <p className="text-xs text-muted-foreground mb-3">
        Gaps first (⚠ WHO-only, ⊘ unregulated), then ↓ cascaded-via-parent, then ✓ direct.
        To add a missing threshold,{" "}
        <Link
          href={`/thresholds?jurisdiction=${encodeURIComponent(jurisdictionCode)}`}
          className="text-foreground underline underline-offset-2"
        >
          open /thresholds filtered to {jurisdictionCode}
          <ArrowRight className="inline h-3 w-3 ml-0.5" />
        </Link>
        .
      </p>
      {sorted.map(({ contaminant, state, resolvedJurisdictionCode }) => (
        <div
          key={contaminant.contaminantId}
          className="flex items-center gap-3 text-sm"
        >
          <StateBadge state={state} />
          <span className="font-mono text-xs text-muted-foreground w-28 shrink-0">
            {contaminant.contaminantId}
          </span>
          <span className="flex-1 truncate">{contaminant.name}</span>
          {resolvedJurisdictionCode &&
            resolvedJurisdictionCode !== jurisdictionCode && (
              <span className="text-xs text-muted-foreground">
                resolves via {resolvedJurisdictionCode}
              </span>
            )}
          <Link
            href={`/thresholds?contaminant=${encodeURIComponent(contaminant.contaminantId)}&jurisdiction=${encodeURIComponent(jurisdictionCode)}`}
            className="text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
          >
            edit
          </Link>
        </div>
      ))}
    </div>
  );
}

function StateBadge({ state }: { state: CoverageState }) {
  const config: Record<
    CoverageState,
    { label: string; icon: React.ReactNode; className: string }
  > = {
    "direct": {
      label: "direct",
      icon: <CheckCircle2 className="h-3 w-3" />,
      className: "border-green-200 bg-green-50 text-green-700",
    },
    "cascade-parent": {
      label: "parent",
      icon: <ArrowRight className="h-3 w-3" />,
      className: "border-blue-200 bg-blue-50 text-blue-700",
    },
    "cascade-who": {
      label: "WHO",
      icon: <ArrowRight className="h-3 w-3" />,
      className: "border-amber-200 bg-amber-50 text-amber-700",
    },
    "none": {
      label: "none",
      icon: <CircleSlash className="h-3 w-3" />,
      className: "border-muted bg-muted/50 text-muted-foreground",
    },
  };
  const { label, icon, className } = config[state];
  return (
    <Badge variant="outline" className={`${className} w-20 justify-center`}>
      {icon}
      <span>{label}</span>
    </Badge>
  );
}
