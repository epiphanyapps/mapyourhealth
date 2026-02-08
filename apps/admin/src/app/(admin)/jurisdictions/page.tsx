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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";

type Jurisdiction = Schema["Jurisdiction"]["type"];

export default function JurisdictionsPage() {
  const [jurisdictions, setJurisdictions] = useState<Jurisdiction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingJurisdiction, setEditingJurisdiction] = useState<Jurisdiction | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    nameFr: "",
    country: "",
    region: "",
    parentCode: "",
    isDefault: false,
  });

  const fetchJurisdictions = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Jurisdiction.list({
        limit: 100,
      });

      if (errors) {
        console.error("Error fetching jurisdictions:", errors);
        toast.error("Failed to fetch jurisdictions");
        return;
      }

      setJurisdictions(data || []);
    } catch (error) {
      console.error("Error fetching jurisdictions:", error);
      toast.error("Failed to fetch jurisdictions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchJurisdictions();
  }, []);

  const resetForm = () => {
    setFormData({
      code: "",
      name: "",
      nameFr: "",
      country: "",
      region: "",
      parentCode: "",
      isDefault: false,
    });
    setEditingJurisdiction(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (jurisdiction: Jurisdiction) => {
    setEditingJurisdiction(jurisdiction);
    setFormData({
      code: jurisdiction.code,
      name: jurisdiction.name,
      nameFr: jurisdiction.nameFr || "",
      country: jurisdiction.country,
      region: jurisdiction.region || "",
      parentCode: jurisdiction.parentCode || "",
      isDefault: jurisdiction.isDefault ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.code || !formData.name || !formData.country) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();

      const jurisdictionData = {
        code: formData.code,
        name: formData.name,
        nameFr: formData.nameFr || null,
        country: formData.country,
        region: formData.region || null,
        parentCode: formData.parentCode || null,
        isDefault: formData.isDefault,
      };

      if (editingJurisdiction) {
        await client.models.Jurisdiction.update({
          id: editingJurisdiction.id,
          ...jurisdictionData,
        });
        toast.success("Jurisdiction updated");
      } else {
        await client.models.Jurisdiction.create(jurisdictionData);
        toast.success("Jurisdiction created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchJurisdictions();
    } catch (error) {
      console.error("Error saving jurisdiction:", error);
      toast.error("Failed to save jurisdiction");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (jurisdiction: Jurisdiction) => {
    if (!confirm(`Are you sure you want to delete "${jurisdiction.name}"?`)) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.Jurisdiction.delete({ id: jurisdiction.id });
      toast.success("Jurisdiction deleted");
      fetchJurisdictions();
    } catch (error) {
      console.error("Error deleting jurisdiction:", error);
      toast.error("Failed to delete jurisdiction");
    }
  };

  // Group jurisdictions by country (currently unused, kept for future grouping feature)
  const _jurisdictionsByCountry = jurisdictions.reduce((acc, j) => {
    const country = j.country;
    if (!acc[country]) acc[country] = [];
    acc[country].push(j);
    return acc;
  }, {} as Record<string, Jurisdiction[]>);
  void _jurisdictionsByCountry;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Jurisdictions</h1>
          <p className="text-muted-foreground">
            Manage regulatory jurisdictions for threshold comparisons
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Jurisdiction
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>
                {editingJurisdiction ? "Edit Jurisdiction" : "Create Jurisdiction"}
              </DialogTitle>
              <DialogDescription>
                {editingJurisdiction
                  ? "Update the jurisdiction details below."
                  : "Add a new regulatory jurisdiction."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="code">Code *</Label>
                  <Input
                    id="code"
                    placeholder="e.g., US-NY, CA-QC, WHO"
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value.toUpperCase() })
                    }
                    disabled={!!editingJurisdiction}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country Code *</Label>
                  <Input
                    id="country"
                    placeholder="e.g., US, CA, INTL"
                    value={formData.country}
                    onChange={(e) =>
                      setFormData({ ...formData, country: e.target.value.toUpperCase() })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (English) *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., New York State"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nameFr">Name (French)</Label>
                  <Input
                    id="nameFr"
                    placeholder="e.g., État de New York"
                    value={formData.nameFr}
                    onChange={(e) =>
                      setFormData({ ...formData, nameFr: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="region">Region/State Code</Label>
                  <Input
                    id="region"
                    placeholder="e.g., NY, QC"
                    value={formData.region}
                    onChange={(e) =>
                      setFormData({ ...formData, region: e.target.value.toUpperCase() })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="parentCode">Parent Jurisdiction Code</Label>
                  <Select
                    value={formData.parentCode || "none"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, parentCode: value === "none" ? "" : value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="None (top-level)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None (top-level)</SelectItem>
                      {jurisdictions
                        .filter(j => j.code !== formData.code)
                        .map((j) => (
                          <SelectItem key={j.id} value={j.code}>
                            {j.code} - {j.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Parent for threshold fallback (e.g., US for US-NY)
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="isDefault"
                  checked={formData.isDefault}
                  onCheckedChange={(checked: boolean) =>
                    setFormData({ ...formData, isDefault: checked })
                  }
                />
                <Label htmlFor="isDefault">
                  Default jurisdiction (for WHO global standard)
                </Label>
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
                ) : editingJurisdiction ? (
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
          <CardTitle>All Jurisdictions</CardTitle>
          <CardDescription>
            {jurisdictions.length} jurisdiction{jurisdictions.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : jurisdictions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No jurisdictions yet. Click &quot;Add Jurisdiction&quot; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Country</TableHead>
                  <TableHead>Region</TableHead>
                  <TableHead>Parent</TableHead>
                  <TableHead>Default</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jurisdictions.map((jurisdiction) => (
                  <TableRow key={jurisdiction.id}>
                    <TableCell className="font-mono font-medium">
                      {jurisdiction.code}
                    </TableCell>
                    <TableCell>{jurisdiction.name}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{jurisdiction.country}</Badge>
                    </TableCell>
                    <TableCell>{jurisdiction.region || "—"}</TableCell>
                    <TableCell>
                      {jurisdiction.parentCode ? (
                        <Badge variant="secondary">{jurisdiction.parentCode}</Badge>
                      ) : (
                        "—"
                      )}
                    </TableCell>
                    <TableCell>
                      {jurisdiction.isDefault ? (
                        <Badge>Default</Badge>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(jurisdiction)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(jurisdiction)}
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
