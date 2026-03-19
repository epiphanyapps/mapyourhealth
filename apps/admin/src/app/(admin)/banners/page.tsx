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
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

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

const defaultFormData: FormData = {
  title: "",
  titleFr: "",
  description: "",
  descriptionFr: "",
  severity: "warning",
  city: "",
  state: "",
  country: "",
  startsAt: new Date().toISOString().slice(0, 16),
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
        ? new Date(banner.startsAt).toISOString().slice(0, 16)
        : "",
      expiresAt: banner.expiresAt
        ? new Date(banner.expiresAt).toISOString().slice(0, 16)
        : "",
      isActive: banner.isActive ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.title || !formData.description || !formData.startsAt) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();

      const bannerData = {
        title: formData.title,
        titleFr: formData.titleFr || null,
        description: formData.description,
        descriptionFr: formData.descriptionFr || null,
        severity: formData.severity,
        city: formData.city || null,
        state: formData.state || null,
        country: formData.country || null,
        startsAt: new Date(formData.startsAt).toISOString(),
        expiresAt: formData.expiresAt
          ? new Date(formData.expiresAt).toISOString()
          : null,
        isActive: formData.isActive,
      };

      if (editingBanner) {
        await client.models.WarningBanner.update({
          id: editingBanner.id,
          ...bannerData,
        });
        toast.success("Banner updated");
      } else {
        await client.models.WarningBanner.create({
          bannerId: crypto.randomUUID(),
          ...bannerData,
        });
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

  const handleDelete = async (banner: WarningBanner) => {
    if (!confirm(`Are you sure you want to delete "${banner.title}"?`)) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.WarningBanner.delete({ id: banner.id });
      toast.success("Banner deleted");
      fetchBanners();
    } catch (error) {
      console.error("Error deleting banner:", error);
      toast.error("Failed to delete banner");
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
                <select
                  id="severity"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  value={formData.severity}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      severity: e.target.value as Severity,
                    })
                  }
                >
                  {SEVERITY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
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
            {banners.length} banner{banners.length !== 1 ? "s" : ""} configured
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
                {banners.map((banner) => (
                  <TableRow key={banner.id}>
                    <TableCell>
                      <Badge
                        className={
                          SEVERITY_COLORS[
                            (banner.severity as Severity) || "warning"
                          ]
                        }
                      >
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
                      {banner.isActive ? (
                        <Badge className="bg-green-100 text-green-800">
                          <Eye className="h-3 w-3 mr-1" />
                          Active
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
                          onClick={() => openEditDialog(banner)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(banner)}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
