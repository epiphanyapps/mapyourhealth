import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertTriangle, Smartphone } from "lucide-react";
import type { AdminSection } from "../data/admin-sections";
import { FieldTable } from "./FieldTable";

export function AdminSectionCard({ section }: { section: AdminSection }) {
  const Icon = section.icon;
  const hasMobileDetail =
    (section.mobileImpact.surfaces?.length ?? 0) > 0 ||
    (section.mobileImpact.edgeCases?.length ?? 0) > 0;

  return (
    <Card id={section.id} className="scroll-mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Icon className="h-5 w-5" />
          <span>{section.title}</span>
          <code className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono font-normal">
            {section.route}
          </code>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <p className="text-sm text-muted-foreground">{section.purpose}</p>

        {section.lists && section.lists.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Lists &amp; filters
            </h3>
            {section.lists.map((list) => (
              <div key={list.title}>
                <h4 className="font-medium text-sm mb-1">{list.title}</h4>
                {list.columns && list.columns.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Columns:</span>{" "}
                    {list.columns.join(", ")}
                  </p>
                ) : null}
                {list.filters && list.filters.length > 0 ? (
                  <p className="text-sm text-muted-foreground">
                    <span className="font-medium text-foreground">Filters:</span>{" "}
                    {list.filters.join(", ")}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}

        {section.fields && section.fields.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Form fields
            </h3>
            <FieldTable fields={section.fields} />
          </div>
        ) : null}

        {section.actions && section.actions.length > 0 ? (
          <div className="space-y-3">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              Buttons &amp; actions
            </h3>
            <ul className="space-y-2">
              {section.actions.map((action) => (
                <li key={action.label} className="text-sm">
                  <span
                    className={
                      action.destructive
                        ? "inline-flex items-center gap-1 font-medium text-red-700 dark:text-red-400"
                        : "font-medium text-foreground"
                    }
                  >
                    {action.destructive ? (
                      <AlertTriangle className="h-3.5 w-3.5" />
                    ) : null}
                    {action.label}
                  </span>
                  <span className="text-muted-foreground"> — {action.description}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="space-y-3 rounded-lg border bg-muted/30 p-4">
          <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            What the mobile user sees
          </h3>
          <p className="text-sm text-muted-foreground">{section.mobileImpact.summary}</p>

          {hasMobileDetail ? (
            <>
              {section.mobileImpact.surfaces &&
              section.mobileImpact.surfaces.length > 0 ? (
                <div>
                  <h4 className="font-medium text-sm mb-1">Where it shows up</h4>
                  <ul className="text-sm space-y-1.5 list-disc ml-6 text-muted-foreground">
                    {section.mobileImpact.surfaces.map((surface) => (
                      <li key={surface.screen}>
                        <span className="font-medium text-foreground">
                          {surface.screen}
                        </span>{" "}
                        — {surface.behavior}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {section.mobileImpact.edgeCases &&
              section.mobileImpact.edgeCases.length > 0 ? (
                <div>
                  <h4 className="font-medium text-sm mb-1">Edge cases</h4>
                  <ul className="text-sm space-y-1 list-disc ml-6 text-muted-foreground">
                    {section.mobileImpact.edgeCases.map((edge) => (
                      <li key={edge}>{edge}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        {section.notes && section.notes.length > 0 ? (
          <ul className="text-sm space-y-1 list-disc ml-6 text-muted-foreground">
            {section.notes.map((note) => (
              <li key={note}>{note}</li>
            ))}
          </ul>
        ) : null}
      </CardContent>
    </Card>
  );
}
