"use client";

import { useRef, useState } from "react";
import { uploadData, getUrl } from "aws-amplify/storage";
import {
  type LogoVariant,
  type LogoMode,
  LOGO_IMAGE_CONSTRAINTS,
} from "@mapyourhealth/backend/shared/landing-logo";
import { tenantStoragePath } from "@mapyourhealth/backend/shared/tenant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";

interface Props {
  /** Label shown above the form, e.g. "Global" or "English override". */
  heading: string;
  /**
   * Tenant the upload is scoped to. All uploads land under
   * `tenants/{tenantId}/landing/logo/*`.
   */
  tenantId: string;
  /**
   * Current variant, or `null` when this slot is "no override" (per-locale
   * only — the Global slot is always present).
   */
  value: LogoVariant | null;
  /** Whether the consumer lets this slot be cleared to "no override". */
  clearable?: boolean;
  onChange: (next: LogoVariant | null) => void;
}

export function LogoEditor({
  heading,
  tenantId,
  value,
  clearable = false,
  onChange,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const mode: LogoMode = value?.mode ?? "text";
  const isDisabled = value === null;

  const updateField = <K extends keyof LogoVariant>(
    key: K,
    val: LogoVariant[K],
  ) => {
    const base: LogoVariant = value ?? { mode: "text" };
    onChange({ ...base, [key]: val });
  };

  const handleFileSelect = async (file: File) => {
    const err = validateLogoFile(file);
    if (err) {
      toast.error(err);
      return;
    }
    try {
      setUploading(true);
      const imageUrl = await uploadLogoFile(tenantId, file);
      const base: LogoVariant = value ?? { mode: "image" };
      onChange({ ...base, mode: "image", imageUrl });
      toast.success("Logo uploaded");
    } catch (e) {
      console.error("Logo upload failed:", e);
      toast.error("Logo upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4 border rounded-md p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium">{heading}</h3>
        {clearable && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onChange(value === null ? { mode: "text" } : null)}
          >
            {value === null ? "Add override" : (
              <>
                <X className="h-3 w-3 mr-1" />
                Clear override
              </>
            )}
          </Button>
        )}
      </div>

      {isDisabled ? (
        <p className="text-sm text-muted-foreground">
          Using the global logo for this locale.
        </p>
      ) : (
        <>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={mode === "text"}
                onChange={() => updateField("mode", "text")}
              />
              Text
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="radio"
                checked={mode === "image"}
                onChange={() => updateField("mode", "image")}
              />
              Image
            </label>
          </div>

          {mode === "text" ? (
            <div className="grid grid-cols-1 sm:grid-cols-[1fr_140px] gap-3">
              <div className="space-y-1.5">
                <Label>Text</Label>
                <Input
                  value={value?.text ?? ""}
                  onChange={(e) => updateField("text", e.target.value)}
                  placeholder="MapYourHealth"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <div className="flex gap-2 items-center">
                  <input
                    type="color"
                    value={value?.textColor ?? "#84cc16"}
                    onChange={(e) => updateField("textColor", e.target.value)}
                    className="h-9 w-12 border rounded"
                  />
                  <Input
                    value={value?.textColor ?? ""}
                    onChange={(e) => updateField("textColor", e.target.value)}
                    placeholder="#84cc16"
                    className="font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {value?.imageUrl && (
                <div className="flex items-center gap-3 rounded-md border p-2 bg-muted/30">
                  <img
                    src={value.imageUrl}
                    alt={value.imageAlt ?? ""}
                    className="h-10 max-w-32 object-contain"
                  />
                  <span className="text-xs text-muted-foreground truncate">
                    {value.imageUrl}
                  </span>
                </div>
              )}
              <div className="flex gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png"
                  hidden
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleFileSelect(f);
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? (
                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-3 w-3 mr-2" />
                  )}
                  {value?.imageUrl ? "Replace" : "Upload PNG"}
                </Button>
                <p className="text-xs text-muted-foreground self-center">
                  PNG only, ≤ 500 KB, ≤ 1024×1024
                </p>
              </div>
              <div className="space-y-1.5">
                <Label>Alt text</Label>
                <Input
                  value={value?.imageAlt ?? ""}
                  onChange={(e) => updateField("imageAlt", e.target.value)}
                  placeholder="MapYourHealth"
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function validateLogoFile(file: File): string | null {
  if (
    !(LOGO_IMAGE_CONSTRAINTS.allowedMimeTypes as readonly string[]).includes(
      file.type,
    )
  ) {
    return "Only PNG images are allowed.";
  }
  if (file.size > LOGO_IMAGE_CONSTRAINTS.maxBytes) {
    return `Logo is too large (max ${Math.round(
      LOGO_IMAGE_CONSTRAINTS.maxBytes / 1024,
    )} KB).`;
  }
  return null;
}

async function uploadLogoFile(tenantId: string, file: File): Promise<string> {
  // Image-dimension check (browser-only; skipped in SSR).
  await ensureDimensionsOk(file);

  const ext = file.name.split(".").pop()?.toLowerCase() ?? "png";
  const path = tenantStoragePath(
    tenantId,
    "landing",
    "logo",
    `${Date.now()}.${ext}`,
  );
  const upload = await uploadData({
    path,
    data: file,
    options: { contentType: file.type },
  }).result;
  const { url } = await getUrl({ path: upload.path });
  // Strip signed query params — storage is public-read.
  return url.toString().split("?")[0] ?? url.toString();
}

function ensureDimensionsOk(file: File): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") return resolve();
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      if (
        img.width > LOGO_IMAGE_CONSTRAINTS.maxDimension ||
        img.height > LOGO_IMAGE_CONSTRAINTS.maxDimension
      ) {
        reject(
          new Error(
            `Image exceeds ${LOGO_IMAGE_CONSTRAINTS.maxDimension}×${LOGO_IMAGE_CONSTRAINTS.maxDimension}.`,
          ),
        );
      } else {
        resolve();
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image."));
    };
    img.src = url;
  });
}
