"use client";

import { useEffect, useState } from "react";
import { generateClient } from "aws-amplify/data";
import type { Schema } from "@mapyourhealth/backend/amplify/data/resource";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Eye,
  EyeOff,
  AlertOctagon,
  AlertTriangle,
  Info,
  Clock,
  CalendarX2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";

type WarningBanner = Schema["WarningBanner"]["type"];

type Severity = "critical" | "warning" | "info";

const SEVERITY_OPTIONS: { value: Severity; label: string }[] = [
  { value: "critical", label: "Critical" },
  { value: "warning", label: "Warning" },
  { value: "info", label: "Info" },
];

const SEVERITY_COLORS: Record<Severity, string> = {
  critical: "bg-red-100 text-red-800",
  warning: "bg-amber-100 text-amber-800",
  info: "bg-blue-100 text-blue-800",
};

const SEVERITY_ICONS: Record<Severity, LucideIcon> = {
  critical: AlertOctagon,
  warning: AlertTriangle,
  info: Info,
};

type DisplayStatus = "active" | "scheduled" | "expired" | "inactive";

const getDisplayStatus = (banner: WarningBanner): DisplayStatus => {
  if (!banner.isActive) return "inactive";
  const now = Date.now();
  const start = new Date(banner.startsAt).getTime();
  if (Number.isFinite(start) && start > now) return "scheduled";
  if (banner.expiresAt) {
    const end = new Date(banner.expiresAt).getTime();
    if (Number.isFinite(end) && end <= now) return "expired";
  }
  return "active";
};

const bannerFormSchema = z
  .object({
    title: z.string().min(1, "Title is required"),
    titleFr: z.string().optional(),
    description: z.string().min(1, "Description is required"),
    descriptionFr: z.string().optional(),
    severity: z.enum(["critical", "warning", "info"]),
    city: z.string().optional(),
    state: z.string().optional(),
    country: z.string().optional(),
    startsAt: z.string().min(1, "Start date is required"),
    expiresAt: z.string().optional(),
    isActive: z.boolean(),
  })
  .refine(
    (data) => {
      if (data.expiresAt && data.startsAt) {
        return new Date(data.expiresAt) > new Date(data.startsAt);
      }
      return true;
    },
    {
      message: "Expiration date must be after start date",
      path: ["expiresAt"],
    },
  );

interface FormData {
  title: string;
  titleFr: string;
  description: string;
  descriptionFr: string;
  severity: Severity;
  city: string;
  state: string;
  country: string;
  startsAt: string;
  expiresAt: string;
  isActive: boolean;
}

// Format a Date as `YYYY-MM-DDTHH:mm` in the user's LOCAL timezone, suitable
// for an <input type="datetime-local">. Using `toISOString()` would emit UTC
// wall-clock and the input would parse it back as local time, shifting the
// stored timestamp by the user's UTC offset on every save.
const formatLocalDateTime = (date: Date) => {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

const defaultFormData: FormData = {
  title: "",
  titleFr: "",
  description: "",
  descriptionFr: "",
  severity: "warning",
  city: "",
  state: "",
  country: "",
  startsAt: formatLocalDateTime(new Date()),
  expiresAt: "",
  isActive: true,
};

export default function BannersPage() {
  const [banners, setBanners] = useState<WarningBanner[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<WarningBanner | null>(
    null,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [bannerToDelete, setBannerToDelete] = useState<WarningBanner | null>(
    null,
  );
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchBanners = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.WarningBanner.list({
        limit: 100,
      });

      if (errors) {
        console.error("Error fetching banners:", errors);
        toast.error("Failed to fetch banners");
        return;
      }

      // Sort by startsAt descending (newest first)
      const sorted = [...(data || [])].sort(
        (a, b) =>
          new Date(b.startsAt).getTime() - new Date(a.startsAt).getTime(),
      );
      setBanners(sorted);
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast.error("Failed to fetch banners");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBanners();
  }, []);

  const resetForm = () => {
    setFormData(defaultFormData);
    setEditingBanner(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (banner: WarningBanner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title,
      titleFr: banner.titleFr || "",
      description: banner.description,
      descriptionFr: banner.descriptionFr || "",
      severity: (banner.severity as Severity) || "warning",
      city: banner.city || "",
      state: banner.state || "",
      country: banner.country || "",
      startsAt: banner.startsAt
        ? formatLocalDateTime(new Date(banner.startsAt))
        : "",
      expiresAt: banner.expiresAt
        ? formatLocalDateTime(new Date(banner.expiresAt))
        : "",
      isActive: banner.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    const result = bannerFormSchema.safeParse(formData);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join(". ");
      toast.error(messages || "Please fix the form errors");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();

      const validated = result.data;
      const bannerData = {
        title: validated.title,
        titleFr: validated.titleFr || null,
        description: validated.description,
        descriptionFr: validated.descriptionFr || null,
        severity: validated.severity,
        city: validated.city || null,
        state: validated.state || null,
        country: validated.country || null,
        startsAt: new Date(validated.startsAt).toISOString(),
        expiresAt: validated.expiresAt
          ? new Date(validated.expiresAt).toISOString()
          : null,
        isActive: validated.isActive,
      };

      if (editingBanner) {
        await client.models.WarningBanner.update({
          id: editingBanner.id,
          ...bannerData,
        });
        toast.success("Banner updated");
      } else {
        await client.models.WarningBanner.create(bannerData);
        toast.success("Banner created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchBanners();
    } catch (error) {
      console.error("Error saving banner:", error);
      toast.error("Failed to save banner");
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!bannerToDelete) return;

    setIsDeleting(true);
    try {
      const client = generateClient<Schema>();
      await client.models.WarningBanner.delete({ id: bannerToDelete.id });
      toast.success("Banner deleted");
      setBannerToDelete(null);
      fetchBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast.error("Failed to delete banner");
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getLocationDisplay = (banner: WarningBanner) => {
    const parts = [banner.city, banner.state, banner.country].filter(Boolean);
    return parts.length > 0 ? parts.join(", ") : "Global";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Warning Banners
          </h1>
          <p className="text-muted-foreground">
            Manage warning banners displayed to mobile users
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? "Edit Banner" : "Create Banner"}
              </DialogTitle>
              <DialogDescription>
                {editingBanner
                  ? "Update the warning banner details below."
                  : "Create a new warning banner for mobile users."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title (English) *</Label>
                  <Input
                    id="title"
                    required
                    aria-required="true"
                    placeholder="e.g., Boil Water Advisory"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="titleFr">Title (French)</Label>
                  <Input
                    id="titleFr"
                    placeholder="e.g., Avis d'ébullition de l'eau"
                    value={formData.titleFr}
                    onChange={(e) =>
                      setFormData({ ...formData, titleFr: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (English) *</Label>
                <Textarea
                  id="description"
                  required
                  aria-required="true"
                  placeholder="Describe the warning..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descriptionFr">Description (French)</Label>
                <Textarea
                  id="descriptionFr"
                  placeholder="Décrivez l'avertissement..."
                  value={formData.descriptionFr}
                  onChange={(e) =>
                    setFormData({ ...formData, descriptionFr: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="severity">Severity *</Label>
                <Select
                  value={formData.severity}
                  onValueChange={(value) =>
                    setFormData({ ...formData, severity: value as Severity })
                  }
                >
                  <SelectTrigger
                    id="severity"
                    aria-required="true"
                    className="w-full"
                  >
                    <SelectValue placeholder="Select severity" />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITY_OPTIONS.map((opt) => {
                      const Icon = SEVERITY_ICONS[opt.value];
                      return (
                        <SelectItem key={opt.value} value={opt.value}>
                          <Icon className="h-4 w-4" />
                          {opt.label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    placeholder="e.g., Montreal"
                    value={formData.city}
                    onChange={(e) =>
                      setFormData({ ...formData, city: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State/Province</Label>
                  <Input
                    id="state"
                    placeholder="e.g., QC"
                    value={formData.state}
                    onChange={(e) =>
                      setFormData({ ...formData, state: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    placeholder="e.g., CA"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">
                Leave location fields empty for a global banner shown to all
                users.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="startsAt">Starts At *</Label>
                  <Input
                    id="startsAt"
                    type="datetime-local"
                    required
                    aria-required="true"
                    value={formData.startsAt}
                    onChange={(e) =>
                      setFormData({ ...formData, startsAt: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expiresAt">Expires At</Label>
                  <Input
                    id="expiresAt"
                    type="datetime-local"
                    value={formData.expiresAt}
                    onChange={(e) =>
                      setFormData({ ...formData, expiresAt: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Leave empty for no expiration
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
                <Label htmlFor="isActive">Active</Label>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : editingBanner ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Banners</CardTitle>
          <CardDescription>
            {isLoading
              ? "Loading…"
              : `${banners.length} banner${banners.length !== 1 ? "s" : ""} configured`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : banners.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No banners yet. Click &quot;Add Banner&quot; to create one.
            </div>
          ) : (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Starts At</TableHead>
                  <TableHead>Expires At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {banners.map((banner) => {
                  const severity = (banner.severity as Severity) || "warning";
                  const SeverityIcon = SEVERITY_ICONS[severity];
                  const status = getDisplayStatus(banner);
                  return (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <Badge className={SEVERITY_COLORS[severity]}>
                        <SeverityIcon className="h-3 w-3 mr-1" />
                        {banner.severity || "warning"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{banner.title}</div>
                        {banner.titleFr && (
                          <div className="text-xs text-muted-foreground">
                            {banner.titleFr}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getLocationDisplay(banner)}</TableCell>
                    <TableCell>{formatDate(banner.startsAt)}</TableCell>
                    <TableCell>
                      {banner.expiresAt
                        ? formatDate(banner.expiresAt)
                        : "Never"}
                    </TableCell>
                    <TableCell>
                      {status === "active" ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Eye className="h-3 w-3 mr-1" />
                          Active
                        </Badge>
                      ) : status === "scheduled" ? (
                        <Badge className="bg-blue-100 text-blue-800">
                          <Clock className="h-3 w-3 mr-1" />
                          Scheduled
                        </Badge>
                      ) : status === "expired" ? (
                        <Badge variant="secondary">
                          <CalendarX2 className="h-3 w-3 mr-1" />
                          Expired
                        </Badge>
                      ) : (
                        <Badge variant="secondary">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Edit banner: ${banner.title}`}
                          onClick={() => openEditDialog(banner)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Delete banner: ${banner.title}`}
                          onClick={() => setBannerToDelete(banner)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={bannerToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setBannerToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Delete banner?</DialogTitle>
            <DialogDescription>
              This will permanently remove
              {bannerToDelete ? ` "${bannerToDelete.title}"` : " this banner"}.
              Mobile users will stop seeing it on their next refresh. This
              action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setBannerToDelete(null)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting…
                </>
              ) : (
                "Delete banner"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
