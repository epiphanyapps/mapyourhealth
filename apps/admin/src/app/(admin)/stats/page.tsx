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
import { Plus, Pencil, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  CONTAMINANT_CATEGORIES,
  contaminantCategoryColors,
  contaminantCategoryNames,
  type ContaminantCategory,
} from "@/lib/constants";

type Contaminant = Schema["Contaminant"]["type"];

export default function ContaminantsPage() {
  const [contaminants, setContaminants] = useState<Contaminant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingContaminant, setEditingContaminant] = useState<Contaminant | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    contaminantId: "",
    name: "",
    nameFr: "",
    unit: "",
    description: "",
    descriptionFr: "",
    category: "" as ContaminantCategory | "",
    studies: "",
    higherIsBad: true,
  });

  const fetchContaminants = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Contaminant.list({
        limit: 1000,
      });

      if (errors) {
        console.error("Error fetching contaminants:", errors);
        toast.error("Failed to fetch contaminants");
        return;
      }

      setContaminants(data || []);
    } catch (error) {
      console.error("Error fetching contaminants:", error);
      toast.error("Failed to fetch contaminants");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchContaminants();
  }, []);

  const resetForm = () => {
    setFormData({
      contaminantId: "",
      name: "",
      nameFr: "",
      unit: "",
      description: "",
      descriptionFr: "",
      category: "",
      studies: "",
      higherIsBad: true,
    });
    setEditingContaminant(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (contaminant: Contaminant) => {
    setEditingContaminant(contaminant);
    setFormData({
      contaminantId: contaminant.contaminantId,
      name: contaminant.name,
      nameFr: contaminant.nameFr || "",
      unit: contaminant.unit,
      description: contaminant.description || "",
      descriptionFr: contaminant.descriptionFr || "",
      category: (contaminant.category as ContaminantCategory) || "",
      studies: contaminant.studies || "",
      higherIsBad: contaminant.higherIsBad ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.contaminantId || !formData.name || !formData.unit || !formData.category) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();

      const contaminantData = {
        contaminantId: formData.contaminantId,
        name: formData.name,
        nameFr: formData.nameFr || null,
        unit: formData.unit,
        description: formData.description || null,
        descriptionFr: formData.descriptionFr || null,
        category: formData.category as ContaminantCategory,
        studies: formData.studies || null,
        higherIsBad: formData.higherIsBad,
      };

      if (editingContaminant) {
        await client.models.Contaminant.update({
          id: editingContaminant.id,
          ...contaminantData,
        });
        toast.success("Contaminant updated");
      } else {
        await client.models.Contaminant.create(contaminantData);
        toast.success("Contaminant created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchContaminants();
    } catch (error) {
      console.error("Error saving contaminant:", error);
      toast.error("Failed to save contaminant");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (contaminant: Contaminant) => {
    if (!confirm(`Are you sure you want to delete "${contaminant.name}"?`)) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.Contaminant.delete({ id: contaminant.id });
      toast.success("Contaminant deleted");
      fetchContaminants();
    } catch (error) {
      console.error("Error deleting contaminant:", error);
      toast.error("Failed to delete contaminant");
    }
  };

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
            <Button onClick={openCreateDialog}>
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
                      setFormData({ ...formData, contaminantId: e.target.value })
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
            {contaminants.length} contaminant{contaminants.length !== 1 ? "s" : ""} configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : contaminants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No contaminants yet. Click &quot;Add Contaminant&quot; to create one.
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
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contaminants.map((contaminant) => (
                  <TableRow key={contaminant.id}>
                    <TableCell className="font-mono text-sm">
                      {contaminant.contaminantId}
                    </TableCell>
                    <TableCell className="font-medium">{contaminant.name}</TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={
                          contaminant.category
                            ? contaminantCategoryColors[contaminant.category as ContaminantCategory]
                            : ""
                        }
                      >
                        {contaminant.category
                          ? contaminantCategoryNames[contaminant.category as ContaminantCategory]
                          : "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>{contaminant.unit}</TableCell>
                    <TableCell>
                      <Badge variant={contaminant.higherIsBad ? "destructive" : "default"}>
                        {contaminant.higherIsBad ? "Bad" : "Good"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(contaminant)}
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
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
