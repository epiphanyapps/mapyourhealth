"use client";

import { useCallback, useEffect, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
import { toast } from "sonner";

/**
 * useCrudResource — generic CRUD lifecycle for one Amplify model.
 *
 * Owns the parts every reference-data admin page does the same way:
 * list state, fetch + loading, dialog open/close + editing-record tracking,
 * form state, save (create/update) dispatch, delete with confirm, optional
 * JSON export. Pages stay responsible for their own JSX (table columns,
 * dialog form fields) and for the page-specific concerns the hook can't
 * see (companion-model fetches, derived counts, filtering / sort).
 *
 * Designed for the 8 admin pages that currently each carry ~500-600 LOC of
 * near-identical CRUD boilerplate. Each migration removes roughly the same
 * absolute amount (~70 LOC of state/handler glue per page) — most of what's
 * left is the form JSX, which doesn't compress. So expected shrink is ~10-15%
 * per page; the wins compound across the 5-8 pages that share the pattern.
 *
 * The hook does NOT replace forms. Form rendering, validation surface, and
 * field-level event handlers stay in the page — pass `defaultFormValues`,
 * `editToForm`, `validate`, and `formToPayload` to plug them in.
 */
/**
 * Loose Amplify model shape — the four methods every page-side CRUD touches.
 * Intentionally permissive on input/output payloads because Amplify's generated
 * types vary per model.
 */
interface CrudModel<TItem> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  list: (options?: any) => Promise<{ data?: TItem[] | null; errors?: unknown }>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  create: (data: any) => Promise<unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  update: (data: any) => Promise<unknown>;
  delete: (data: { id: string }) => Promise<unknown>;
}

export interface UseCrudResourceConfig<T, FormData> {
  /** Human-readable name used in toast messages, e.g. "Jurisdiction". */
  resourceName: string;
  /** Plural for list-fetch error toasts. Defaults to `resourceName + "s"`. */
  resourceNamePlural?: string;

  /**
   * Selector for the Amplify model on the generated client. Function form
   * (rather than passing the model directly) keeps the `generateClient()`
   * call inside the hook, matching the existing per-page pattern.
   *
   * Typed loosely because Amplify Gen2's per-model create/update signatures
   * require specific required-field shapes (e.g. `{ code, name, country }`
   * for Jurisdiction) that don't unify across models. The page-level T and
   * FormData generics preserve type safety for everything the hook returns
   * to consumers; the model interface itself is just glue.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  getModel: (client: ReturnType<typeof generateClient<Schema>>) => CrudModel<any>;

  /** Default values used to reset the form when opening Create. */
  defaultFormValues: FormData;

  /** Translate a record into form-shaped data when opening Edit. */
  editToForm: (record: T) => FormData;

  /** Optional pre-save validator. Return an error message to abort + toast. */
  validate?: (form: FormData) => string | null;

  /** Transform form data into the Amplify create / update payload. */
  formToPayload: (form: FormData) => Record<string, unknown>;

  /** Optional list-options passed to `model.list()` on each refresh. */
  listOptions?: Record<string, unknown>;

  /** Optional accessor for the record's display name. Used in the delete
   *  confirm prompt: `Are you sure you want to delete "<name>"?`. */
  getDisplayName?: (record: T) => string;

  /** Optional JSON export configuration. When set, `handleExport` writes
   *  a file with `transform`-mapped records (defaults to identity). */
  export?: {
    fileName: string;
    transform?: (record: T) => unknown;
  };
}

export interface UseCrudResource<T, FormData> {
  // List
  data: T[];
  isLoading: boolean;
  refresh: () => Promise<void>;

  // Dialog
  isDialogOpen: boolean;
  setIsDialogOpen: (open: boolean) => void;
  editingRecord: T | null;
  openCreate: () => void;
  openEdit: (record: T) => void;

  // Form
  formData: FormData;
  setFormData: Dispatch<SetStateAction<FormData>>;

  // Mutations
  isSaving: boolean;
  handleSave: () => Promise<void>;
  handleDelete: (record: T) => Promise<void>;

  // Export (no-op when `config.export` is not provided)
  handleExport: () => void;
}

type RecordWithId = { id: string };

export function useCrudResource<T extends RecordWithId, FormData>(
  config: UseCrudResourceConfig<T, FormData>,
): UseCrudResource<T, FormData> {
  const {
    resourceName,
    defaultFormValues,
    editToForm,
    validate,
    formToPayload,
    listOptions,
    getDisplayName,
    getModel,
  } = config;
  const resourceNamePlural = config.resourceNamePlural ?? `${resourceName}s`;
  const exportConfig = config.export;

  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<T | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultFormValues);

  const refresh = useCallback(async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();
      const model = getModel(client);
      const result = await model.list(listOptions);
      if (result.errors) {
        console.error(`Error fetching ${resourceNamePlural}:`, result.errors);
        toast.error(`Failed to fetch ${resourceNamePlural}`);
        return;
      }
      setData((result.data ?? []) as T[]);
    } catch (err) {
      console.error(`Error fetching ${resourceNamePlural}:`, err);
      toast.error(`Failed to fetch ${resourceNamePlural}`);
    } finally {
      setIsLoading(false);
    }
  }, [getModel, listOptions, resourceNamePlural]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only on mount;
    // subsequent refreshes are caller-triggered via the returned `refresh`.
  }, []);

  const openCreate = useCallback(() => {
    setEditingRecord(null);
    setFormData(defaultFormValues);
    setIsDialogOpen(true);
  }, [defaultFormValues]);

  const openEdit = useCallback(
    (record: T) => {
      setEditingRecord(record);
      setFormData(editToForm(record));
      setIsDialogOpen(true);
    },
    [editToForm],
  );

  const handleSave = useCallback(async () => {
    if (validate) {
      const err = validate(formData);
      if (err) {
        toast.error(err);
        return;
      }
    }
    setIsSaving(true);
    try {
      const client = generateClient<Schema>();
      const model = getModel(client);
      const payload = formToPayload(formData);
      if (editingRecord) {
        await model.update({ id: editingRecord.id, ...payload });
        toast.success(`${resourceName} updated`);
      } else {
        await model.create(payload);
        toast.success(`${resourceName} created`);
      }
      setIsDialogOpen(false);
      setEditingRecord(null);
      setFormData(defaultFormValues);
      await refresh();
    } catch (err) {
      console.error(`Error saving ${resourceName}:`, err);
      toast.error(`Failed to save ${resourceName}`);
    } finally {
      setIsSaving(false);
    }
  }, [
    defaultFormValues,
    editingRecord,
    formData,
    formToPayload,
    getModel,
    refresh,
    resourceName,
    validate,
  ]);

  const handleDelete = useCallback(
    async (record: T) => {
      const name = getDisplayName?.(record);
      const message = name
        ? `Are you sure you want to delete "${name}"?`
        : `Are you sure you want to delete this ${resourceName.toLowerCase()}?`;
      if (!confirm(message)) return;
      try {
        const client = generateClient<Schema>();
        const model = getModel(client);
        await model.delete({ id: record.id });
        toast.success(`${resourceName} deleted`);
        await refresh();
      } catch (err) {
        console.error(`Error deleting ${resourceName}:`, err);
        toast.error(`Failed to delete ${resourceName}`);
      }
    },
    [getDisplayName, getModel, refresh, resourceName],
  );

  const handleExport = useCallback(() => {
    if (!exportConfig) return;
    const exportData = data.map(exportConfig.transform ?? ((r) => r));
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = exportConfig.fileName;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${exportConfig.fileName}`);
  }, [data, exportConfig]);

  return {
    data,
    isLoading,
    refresh,
    isDialogOpen,
    setIsDialogOpen,
    editingRecord,
    openCreate,
    openEdit,
    formData,
    setFormData,
    isSaving,
    handleSave,
    handleDelete,
    handleExport,
  };
}
