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

type Category = Schema["Category"]["type"];

interface CategoryLink {
  label: string;
  url: string;
}

// Common MaterialCommunityIcons used in the app
const ICON_OPTIONS = [
  { value: "water", label: "Water" },
  { value: "weather-cloudy", label: "Air/Cloud" },
  { value: "heart", label: "Heart" },
  { value: "fire", label: "Fire" },
  { value: "alert", label: "Alert" },
  { value: "shield", label: "Shield" },
  { value: "leaf", label: "Leaf" },
  { value: "flask", label: "Flask" },
  { value: "atom", label: "Atom" },
  { value: "biohazard", label: "Biohazard" },
  { value: "radioactive", label: "Radioactive" },
  { value: "bacteria", label: "Bacteria" },
];

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    categoryId: "",
    name: "",
    nameFr: "",
    description: "",
    descriptionFr: "",
    icon: "water",
    color: "#3B82F6",
    sortOrder: 0,
    isActive: true,
    links: [] as CategoryLink[],
    showStandardsTable: false,
  });

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const client = generateClient<Schema>();
      const { data, errors } = await client.models.Category.list({
        limit: 100,
      });

      if (errors) {
        console.error("Error fetching categories:", errors);
        toast.error("Failed to fetch categories");
        return;
      }

      // Sort by sortOrder
      const sorted = [...(data || [])].sort(
        (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0),
      );
      setCategories(sorted);
    } catch (error) {
      console.error("Error fetching categories:", error);
      toast.error("Failed to fetch categories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const resetForm = () => {
    setFormData({
      categoryId: "",
      name: "",
      nameFr: "",
      description: "",
      descriptionFr: "",
      icon: "water",
      color: "#3B82F6",
      sortOrder: categories.length,
      isActive: true,
      links: [],
      showStandardsTable: false,
    });
    setEditingCategory(null);
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  const openEditDialog = (category: Category) => {
    setEditingCategory(category);
    let links: CategoryLink[] = [];
    try {
      if (category.links) {
        links =
          typeof category.links === "string"
            ? JSON.parse(category.links)
            : category.links;
      }
    } catch {
      links = [];
    }

    setFormData({
      categoryId: category.categoryId,
      name: category.name,
      nameFr: category.nameFr || "",
      description: category.description || "",
      descriptionFr: category.descriptionFr || "",
      icon: category.icon,
      color: category.color,
      sortOrder: category.sortOrder ?? 0,
      isActive: category.isActive ?? true,
      links,
      showStandardsTable: category.showStandardsTable ?? false,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!formData.categoryId || !formData.name || !formData.icon) {
      toast.error("Please fill in all required fields");
      return;
    }

    setIsSaving(true);
    try {
      const client = generateClient<Schema>();

      const categoryData = {
        categoryId: formData.categoryId.toLowerCase(),
        name: formData.name,
        nameFr: formData.nameFr || null,
        description: formData.description || null,
        descriptionFr: formData.descriptionFr || null,
        icon: formData.icon,
        color: formData.color,
        sortOrder: formData.sortOrder,
        isActive: formData.isActive,
        links:
          formData.links.length > 0 ? JSON.stringify(formData.links) : null,
        showStandardsTable: formData.showStandardsTable,
      };

      if (editingCategory) {
        await client.models.Category.update({
          id: editingCategory.id,
          ...categoryData,
        });
        toast.success("Category updated");
      } else {
        await client.models.Category.create(categoryData);
        toast.success("Category created");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchCategories();
    } catch (error) {
      console.error("Error saving category:", error);
      toast.error("Failed to save category");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (category: Category) => {
    if (!confirm(`Are you sure you want to delete "${category.name}"?`)) {
      return;
    }

    try {
      const client = generateClient<Schema>();
      await client.models.Category.delete({ id: category.id });
      toast.success("Category deleted");
      fetchCategories();
    } catch (error) {
      console.error("Error deleting category:", error);
      toast.error("Failed to delete category");
    }
  };

  const addLink = () => {
    setFormData({
      ...formData,
      links: [...formData.links, { label: "", url: "" }],
    });
  };

  const updateLink = (
    index: number,
    field: "label" | "url",
    value: string,
  ) => {
    const newLinks = [...formData.links];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFormData({ ...formData, links: newLinks });
  };

  const removeLink = (index: number) => {
    setFormData({
      ...formData,
      links: formData.links.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Categories</h1>
          <p className="text-muted-foreground">
            Manage top-level categories (Water, Air, Health, Disaster)
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreateDialog}>
              <Plus className="mr-2 h-4 w-4" />
              Add Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Edit Category" : "Create Category"}
              </DialogTitle>
              <DialogDescription>
                {editingCategory
                  ? "Update the category details below."
                  : "Add a new top-level category."}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoryId">Category ID *</Label>
                  <Input
                    id="categoryId"
                    placeholder="e.g., water, air"
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        categoryId: e.target.value.toLowerCase(),
                      })
                    }
                    disabled={!!editingCategory}
                  />
                </div>
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
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name (English) *</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Water Quality"
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
                    placeholder="e.g., Qualité de l'eau"
                    value={formData.nameFr}
                    onChange={(e) =>
                      setFormData({ ...formData, nameFr: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon *</Label>
                  <select
                    id="icon"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={formData.icon}
                    onChange={(e) =>
                      setFormData({ ...formData, icon: e.target.value })
                    }
                  >
                    {ICON_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-muted-foreground">
                    MaterialCommunityIcons name
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="color">Color *</Label>
                  <div className="flex gap-2">
                    <Input
                      id="color"
                      type="color"
                      className="w-16 h-10 p-1"
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                    />
                    <Input
                      value={formData.color}
                      onChange={(e) =>
                        setFormData({ ...formData, color: e.target.value })
                      }
                      placeholder="#3B82F6"
                    />
                  </div>
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
                <p className="text-xs text-muted-foreground">
                  Use {"{count}"} for dynamic contaminant count
                </p>
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
                      onChange={(e) => updateLink(index, "label", e.target.value)}
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

              <div className="flex items-center space-x-4">
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
                <div className="flex items-center space-x-2">
                  <Switch
                    id="showStandardsTable"
                    checked={formData.showStandardsTable}
                    onCheckedChange={(checked: boolean) =>
                      setFormData({ ...formData, showStandardsTable: checked })
                    }
                  />
                  <Label htmlFor="showStandardsTable">
                    Show Standards Table
                  </Label>
                </div>
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
                ) : editingCategory ? (
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
          <CardTitle>All Categories</CardTitle>
          <CardDescription>
            {categories.length} categor{categories.length !== 1 ? "ies" : "y"}{" "}
            configured
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : categories.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No categories yet. Click &quot;Add Category&quot; to create one.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Preview</TableHead>
                  <TableHead>ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Icon</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categories.map((category) => (
                  <TableRow key={category.id}>
                    <TableCell className="font-mono">
                      {category.sortOrder}
                    </TableCell>
                    <TableCell>
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold"
                        style={{ backgroundColor: category.color }}
                      >
                        {category.categoryId.charAt(0).toUpperCase()}
                      </div>
                    </TableCell>
                    <TableCell className="font-mono font-medium">
                      {category.categoryId}
                    </TableCell>
                    <TableCell>
                      <div>
                        <div>{category.name}</div>
                        {category.nameFr && (
                          <div className="text-xs text-muted-foreground">
                            {category.nameFr}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{category.icon}</Badge>
                    </TableCell>
                    <TableCell>
                      {category.isActive ? (
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
                          onClick={() => openEditDialog(category)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(category)}
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
