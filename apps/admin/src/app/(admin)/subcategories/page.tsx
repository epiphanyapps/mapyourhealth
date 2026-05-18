"use client";

import { useEffect, useMemo, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, Pencil, Trash2, Loader2, Eye, EyeOff } from "lucide-react";
import { useCrudResource } from "@/hooks/useCrudResource";

type Category = Schema["Category"]["type"];
type SubCategory = Schema["SubCategory"]["type"];

interface CategoryLink {
  label: string;
  url: string;
}

interface SubCategoryFormData {
  subCategoryId: string;
  categoryId: string;
  name: string;
  nameFr: string;
  description: string;
  descriptionFr: string;
  icon: string;
  color: string;
  sortOrder: number;
  isActive: boolean;
  links: CategoryLink[];
}

const DEFAULT_FORM: SubCategoryFormData = {
  subCategoryId: "",
  categoryId: "",
  name: "",
  nameFr: "",
  description: "",
  descriptionFr: "",
  icon: "",
  color: "",
  sortOrder: 0,
  isActive: true,
  links: [],
};

function parseLinks(raw: SubCategory["links"]): CategoryLink[] {
  if (!raw) return [];
  try {
    return typeof raw === "string" ? JSON.parse(raw) : (raw as CategoryLink[]);
  } catch {
    return [];
  }
}

export default function SubCategoriesPage() {
  // Companion fetch: parent categories list. Used for the parent select,
  // filter dropdown, and color/name lookup in the table. Kept in the page
  // because it's a different model; only fetched once on mount.
  const [categories, setCategories] = useState<Category[]>([]);
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");

  useEffect(() => {
    const client = generateClient<Schema>();
    client.models.Category.list({ limit: 100 }).then((result) => {
      setCategories(
        [...(result.data || [])].sort(
          (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
        ),
      );
    });
  }, []);

  const {
    data: unsortedSubCategories,
    isLoading,
    isDialogOpen,
    setIsDialogOpen,
    editingRecord: editingSubCategory,
    openCreate,
    openEdit,
    formData,
    setFormData,
    isSaving,
    handleSave,
    handleDelete,
  } = useCrudResource<SubCategory, SubCategoryFormData>({
    resourceName: "Sub-category",
    resourceNamePlural: "sub-categories",
    getModel: (client) => client.models.SubCategory,
    listOptions: { limit: 500 },
    defaultFormValues: DEFAULT_FORM,
    editToForm: (sc) => ({
      subCategoryId: sc.subCategoryId,
      categoryId: sc.categoryId,
      name: sc.name,
      nameFr: sc.nameFr || "",
      description: sc.description || "",
      descriptionFr: sc.descriptionFr || "",
      icon: sc.icon || "",
      color: sc.color || "",
      sortOrder: sc.sortOrder ?? 0,
      isActive: sc.isActive ?? true,
      links: parseLinks(sc.links),
    }),
    validate: (form) => {
      if (!form.subCategoryId || !form.name || !form.categoryId) {
        return "Please fill in all required fields";
      }
      return null;
    },
    formToPayload: (form) => ({
      subCategoryId: form.subCategoryId.toLowerCase(),
      categoryId: form.categoryId,
      name: form.name,
      nameFr: form.nameFr || null,
      description: form.description || null,
      descriptionFr: form.descriptionFr || null,
      icon: form.icon || null,
      color: form.color || null,
      sortOrder: form.sortOrder,
      isActive: form.isActive,
      links: form.links.length > 0 ? JSON.stringify(form.links) : null,
    }),
    getDisplayName: (sc) => sc.name,
  });

  // Sort by sortOrder for display.
  const subCategories = useMemo(
    () =>
      [...unsortedSubCategories].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      ),
    [unsortedSubCategories],
  );

  // Wrap openCreate to pre-select a parent category:
  // - if the page filter is active, use the filtered category
  // - otherwise default to the first category in the list
  // (Matches the prior resetForm + post-reset patch behavior.)
  const handleOpenCreate = () => {
    openCreate();
    const preselectedCategoryId =
      filterCategoryId !== "all"
        ? filterCategoryId
        : categories[0]?.categoryId || "";
    if (preselectedCategoryId) {
      setFormData((prev) => ({ ...prev, categoryId: preselectedCategoryId }));
    }
  };

  // Link helpers — pure setFormData mutations, page-owned.
  const addLink = () => {
    setFormData((prev) => ({
      ...prev,
      links: [...prev.links, { label: "", url: "" }],
    }));
  };
  const updateLink = (
    index: number,
    field: "label" | "url",
    value: string,
  ) => {
    setFormData((prev) => {
      const newLinks = [...prev.links];
      newLinks[index] = { ...newLinks[index], [field]: value };
      return { ...prev, links: newLinks };
    });
  };
  const removeLink = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      links: prev.links.filter((_, i) => i !== index),
    }));
  };

  const getCategoryName = (categoryId: string) =>
    categories.find((c) => c.categoryId === categoryId)?.name || categoryId;
  const getCategoryColor = (categoryId: string) =>
    categories.find((c) => c.categoryId === categoryId)?.color || "#6B7280";

  const filteredSubCategories =
    filterCategoryId === "all"
      ? subCategories
      : subCategories.filter((sc) => sc.categoryId === filterCategoryId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sub-Categories</h1>
          <p className="text-muted-foreground">
            Manage sub-categories (Fertilizers, Pesticides, Radon, etc.)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={handleOpenCreate}>
              <Plus className="mr-2 h-4 w-4" />
              Add Sub-Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingSubCategory
                  ? "Edit Sub-Category"
                  : "Create Sub-Category"}
              </DialogTitle>
              <DialogDescription>
                {editingSubCategory
                  ? "Update the sub-category details below."
                  : "Add a new sub-category under a parent category."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="subCategoryId">Sub-Category ID *</Label>
                  <Input
                    id="subCategoryId"
                    placeholder="e.g., fertilizer, radon"
                    value={formData.subCategoryId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        subCategoryId: e.target.value.toLowerCase(),
                      })
                    }
                    disabled={!!editingSubCategory}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Parent Category *</Label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.categoryId}>
                          {cat.name}
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
                    placeholder="e.g., Fertilizers"
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
                    placeholder="e.g., Engrais"
                    value={formData.nameFr}
                    onChange={(e) =>
                      setFormData({ ...formData, nameFr: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="sortOrder">Sort Order</Label>
                  <Input
                    id="sortOrder"
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon (optional)</Label>
                  <Input
                    id="icon"
                    placeholder="Inherits from parent if empty"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="color">Color (optional)</Label>
                <div className="flex gap-2">
                  <Input
                    id="color"
                    type="color"
                    className="w-16 h-10 p-1"
                    value={formData.color || "#6B7280"}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                  />
                  <Input
                    value={formData.color}
                    onChange={(e) =>
                      setFormData({ ...formData, color: e.target.value })
                    }
                    placeholder="Inherits from parent"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description (English)</Label>
                <Textarea
                  id="description"
                  placeholder="Supports markdown..."
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
                  placeholder="Supporte le markdown..."
                  value={formData.descriptionFr}
                  onChange={(e) =>
                    setFormData({ ...formData, descriptionFr: e.target.value })
                  }
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>External Links</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addLink}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Link
                  </Button>
                </div>
                {formData.links.map((link, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Label"
                      value={link.label}
                      onChange={(e) =>
                        updateLink(index, "label", e.target.value)
                      }
                    />
                    <Input
                      placeholder="URL"
                      value={link.url}
                      onChange={(e) => updateLink(index, "url", e.target.value)}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeLink(index)}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                ))}
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
                ) : editingSubCategory ? (
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
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Sub-Categories</CardTitle>
              <CardDescription>
                {filteredSubCategories.length} sub-categor
                {filteredSubCategories.length !== 1 ? "ies" : "y"}{" "}
                {filterCategoryId !== "all" &&
                  `in ${getCategoryName(filterCategoryId)}`}
              </CardDescription>
            </div>
            <Select
              value={filterCategoryId}
              onValueChange={setFilterCategoryId}
            >
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.categoryId}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredSubCategories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No sub-categories found. Click &quot;Add Sub-Category&quot; to
              create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubCategories.map((subCategory) => (
                  <TableRow key={subCategory.id}>
                    <TableCell className="font-mono">
                      {subCategory.sortOrder}
                    </TableCell>
                    <TableCell>
                      <Badge
                        style={{
                          backgroundColor: getCategoryColor(
                            subCategory.categoryId,
                          ),
                          color: "white",
                        }}
                      >
                        {getCategoryName(subCategory.categoryId)}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {subCategory.subCategoryId}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{subCategory.name}</div>
                        {subCategory.nameFr && (
                          <div className="text-xs text-muted-foreground">
                            {subCategory.nameFr}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {subCategory.isActive ? (
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
                          onClick={() => openEdit(subCategory)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(subCategory)}
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
