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
import { Plus, Pencil, Trash2, Loader2, Scale } from "lucide-react";
import {
  CONTAMINANT_CATEGORIES,
  contaminantCategoryColors,
  contaminantCategoryNames,
  type ContaminantCategory,
} from "@/lib/constants";
import { LinkedCountBadge } from "@/components/LinkedCountBadge";
import { useCrudResource } from "@/hooks/useCrudResource";

type Contaminant = Schema["Contaminant"]["type"];

interface ContaminantFormData {
  contaminantId: string;
  name: string;
  nameFr: string;
  unit: string;
  description: string;
  descriptionFr: string;
  category: ContaminantCategory | "";
  studies: string;
  higherIsBad: boolean;
}

const DEFAULT_FORM: ContaminantFormData = {
  contaminantId: "",
  name: "",
  nameFr: "",
  unit: "",
  description: "",
  descriptionFr: "",
  category: "",
  studies: "",
  higherIsBad: true,
};

export default function ContaminantsPage() {
  const {
    data: contaminants,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    editingRecord: editingContaminant,
    openCreate,
    openEdit,
    formData,
    setFormData,
    isSaving,
    handleSave,
    handleDelete,
  } = useCrudResource<Contaminant, ContaminantFormData>({
    resourceName: "Contaminant",
    getModel: (client) => client.models.Contaminant,
    listOptions: { limit: 1000 },
    defaultFormValues: DEFAULT_FORM,
    editToForm: (c) => ({
      contaminantId: c.contaminantId,
      name: c.name,
      nameFr: c.nameFr || "",
      unit: c.unit,
      description: c.description || "",
      descriptionFr: c.descriptionFr || "",
      category: (c.category as ContaminantCategory) || "",
      studies: c.studies || "",
      higherIsBad: c.higherIsBad,
    }),
    validate: (form) => {
      if (!form.contaminantId || !form.name || !form.unit || !form.category) {
        return "Please fill in all required fields";
      }
      return null;
    },
    formToPayload: (form) => ({
      contaminantId: form.contaminantId,
      name: form.name,
      nameFr: form.nameFr || null,
      unit: form.unit,
      description: form.description || null,
      descriptionFr: form.descriptionFr || null,
      category: form.category as ContaminantCategory,
      studies: form.studies || null,
      higherIsBad: form.higherIsBad,
    }),
    getDisplayName: (c) => c.name,
  });

  // Companion fetch for the LinkedCountBadge counts (Thresholds column).
  // Kept in the page because it reads a different model. Only fetched once on
  // mount — admins manage thresholds elsewhere, so we don't need to retrigger
  // on Contaminant CRUD.
  const [thresholdCountByContaminant, setThresholdCountByContaminant] =
    useState<Record<string, number>>({});

  useEffect(() => {
    const client = generateClient<Schema>();
    client.models.ContaminantThreshold.list({ limit: 1000 }).then((result) => {
      const counts: Record<string, number> = {};
      for (const t of result.data || []) {
        if (!t.contaminantId) continue;
        counts[t.contaminantId] = (counts[t.contaminantId] || 0) + 1;
      }
      setThresholdCountByContaminant(counts);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contaminants</h1>
          <p className="text-muted-foreground">
            Manage water contaminants and their properties
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Contaminant
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <DialogHeader>
              <DialogTitle>
                {editingContaminant ? "Edit Contaminant" : "Create Contaminant"}
              </DialogTitle>
              <DialogDescription>
                {editingContaminant
                  ? "Update the contaminant details below."
                  : "Add a new water contaminant to track."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contaminantId">Contaminant ID *</Label>
                  <Input
                    id="contaminantId"
                    placeholder="e.g., nitrate"
                    value={formData.contaminantId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contaminantId: e.target.value,
                      })
                    }
                    disabled={!!editingContaminant}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select
                    value={formData.category}
                    onValueChange={(value) =>
                      setFormData({
                        ...formData,
                        category: value as ContaminantCategory,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CONTAMINANT_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {contaminantCategoryNames[cat]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (English) *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Nitrate"
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
                    placeholder="e.g., Nitrate"
                    value={formData.nameFr}
                    onChange={(e) =>
                      setFormData({ ...formData, nameFr: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit *</Label>
                  <Input
                    id="unit"
                    placeholder="e.g., μg/L"
                    value={formData.unit}
                    onChange={(e) =>
                      setFormData({ ...formData, unit: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Higher Values Are</Label>
                  <Select
                    value={formData.higherIsBad ? "bad" : "good"}
                    onValueChange={(value) =>
                      setFormData({ ...formData, higherIsBad: value === "bad" })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bad">Bad (worse)</SelectItem>
                      <SelectItem value="good">Good (better)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (English)</Label>
                <Input
                  id="description"
                  placeholder="Health concerns and effects"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="descriptionFr">Description (French)</Label>
                <Input
                  id="descriptionFr"
                  placeholder="Préoccupations et effets sur la santé"
                  value={formData.descriptionFr}
                  onChange={(e) =>
                    setFormData({ ...formData, descriptionFr: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="studies">Scientific References</Label>
                <Input
                  id="studies"
                  placeholder="Links to scientific studies"
                  value={formData.studies}
                  onChange={(e) =>
                    setFormData({ ...formData, studies: e.target.value })
                  }
                />
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
                ) : editingContaminant ? (
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
          <CardTitle>All Contaminants</CardTitle>
          <CardDescription>
            {contaminants.length} contaminant
            {contaminants.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : contaminants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contaminants yet. Click &quot;Add Contaminant&quot; to create
              one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Unit</TableHead>
                  <TableHead>Higher Is</TableHead>
                  <TableHead title="Number of ContaminantThreshold rows defined for this contaminant across all jurisdictions. Click to view them.">
                    Thresholds
                  </TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contaminants.map((contaminant) => {
                  const tCount =
                    thresholdCountByContaminant[contaminant.contaminantId] ?? 0;
                  return (
                    <TableRow key={contaminant.id}>
                      <TableCell className="font-mono text-sm">
                        {contaminant.contaminantId}
                      </TableCell>
                      <TableCell className="font-medium">
                        {contaminant.name}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="secondary"
                          className={
                            contaminant.category
                              ? contaminantCategoryColors[
                                  contaminant.category as ContaminantCategory
                                ]
                              : ""
                          }
                        >
                          {contaminant.category
                            ? contaminantCategoryNames[
                                contaminant.category as ContaminantCategory
                              ]
                            : "—"}
                        </Badge>
                      </TableCell>
                      <TableCell>{contaminant.unit}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            contaminant.higherIsBad ? "destructive" : "default"
                          }
                        >
                          {contaminant.higherIsBad ? "Bad" : "Good"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <LinkedCountBadge
                          count={tCount}
                          icon={<Scale />}
                          href={`/thresholds?contaminant=${encodeURIComponent(contaminant.contaminantId)}`}
                          title={`${tCount} ${tCount === 1 ? "threshold" : "thresholds"} defined for ${contaminant.contaminantId}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openEdit(contaminant)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(contaminant)}
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
          )}
        </CardContent>
      </Card>
    </div>
  );
}
