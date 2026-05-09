import type { AdminField } from "../data/admin-sections";

export function FieldTable({ fields }: { fields: AdminField[] }) {
  return (
    <ul className="space-y-3">
      {fields.map((field) => (
        <li
          key={field.name}
          className="border-l-2 border-muted pl-3 py-0.5"
        >
          <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
            <code className="px-1 py-0.5 bg-muted rounded text-foreground font-mono text-sm">
              {field.name}
            </code>
            <span className="text-xs text-muted-foreground">{field.type}</span>
            {field.required ? (
              <span className="text-xs font-medium text-foreground">required</span>
            ) : null}
            {field.default ? (
              <span className="text-xs text-muted-foreground">
                default <code className="px-1 py-0.5 bg-muted rounded text-foreground">{field.default}</code>
              </span>
            ) : null}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{field.description}</p>
          {field.gotcha ? (
            <p className="text-sm mt-1 text-amber-700 dark:text-amber-400">
              <span className="font-medium">Gotcha:</span> {field.gotcha}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
