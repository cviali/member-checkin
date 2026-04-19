"use client";

import { useCallback, useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { getApiUrl } from "@/lib/api-config";
import { formatPoints, resizeImage } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  IconLoader2,
  IconPlus,
  IconPencil,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";

interface Reward {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointsRequired: number;
  isActive: boolean;
  createdAt: string;
}

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingReward, setEditingReward] = useState<Reward | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    pointsRequired: "",
    isActive: true,
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Reward | null>(null);
  const [deleting, setDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRewards = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl("/rewards"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setRewards(json.rewards || []);
    } catch {
      toast.error("Failed to load rewards");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRewards();
  }, [fetchRewards]);

  const openCreate = () => {
    setEditingReward(null);
    setFormData({ name: "", description: "", pointsRequired: "", isActive: true });
    setImageFile(null);
    setImagePreview(null);
    setSheetOpen(true);
  };

  const openEdit = (reward: Reward) => {
    setEditingReward(reward);
    setFormData({
      name: reward.name,
      description: reward.description || "",
      pointsRequired: String(reward.pointsRequired),
      isActive: reward.isActive,
    });
    setImageFile(null);
    setImagePreview(reward.imageUrl ? getApiUrl(reward.imageUrl) : null);
    setSheetOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return editingReward?.imageUrl || null;
    try {
      const resized = await resizeImage(imageFile);
      const formData = new FormData();
      formData.append("image", resized, imageFile.name);

      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl("/rewards/upload"), {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) throw new Error("Failed to upload image");
      const json = await res.json();
      return json.imageUrl;
    } catch {
      toast.error("Failed to upload image");
      return editingReward?.imageUrl || null;
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const imageUrl = await uploadImage();
      const token = localStorage.getItem("token");
      const isEditing = !!editingReward;
      const url = isEditing
        ? getApiUrl(`/rewards/${editingReward.id}`)
        : getApiUrl("/rewards");
      const method = isEditing ? "PATCH" : "POST";

      const body: Record<string, unknown> = {
        name: formData.name,
        description: formData.description || null,
        pointsRequired: parseInt(formData.pointsRequired) || 0,
        isActive: formData.isActive,
      };
      if (imageUrl) body.imageUrl = imageUrl;

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to save reward");
      }

      toast.success(isEditing ? "Reward updated" : "Reward created");
      setSheetOpen(false);
      fetchRewards();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl(`/rewards/${deleteTarget.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete reward");
      }

      toast.success("Reward deleted");
      setDeleteTarget(null);
      fetchRewards();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Reward>[] = [
    {
      accessorKey: "imageUrl",
      header: "",
      cell: ({ row }) =>
        row.original.imageUrl ? (
          <img
            src={getApiUrl(row.original.imageUrl)}
            alt=""
            className="size-10 rounded-md object-cover"
          />
        ) : (
          <div className="flex size-10 items-center justify-center rounded-md bg-muted text-xs">
            —
          </div>
        ),
    },
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "pointsRequired",
      header: "Points",
      cell: ({ row }) => `${formatPoints(row.original.pointsRequired)} pts`,
    },
    {
      accessorKey: "isActive",
      header: "Active",
      cell: ({ row }) => (
        <span
          className={`text-xs font-medium ${
            row.original.isActive
              ? "text-emerald-600"
              : "text-muted-foreground"
          }`}
        >
          {row.original.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => openEdit(row.original)}
          >
            <IconPencil className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => setDeleteTarget(row.original)}
          >
            <IconTrash className="size-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate}>
          <IconPlus className="mr-2 size-4" />
          Create Reward
        </Button>
      </div>

      <DataTable columns={columns} data={rewards} />

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingReward ? "Edit Reward" : "Create Reward"}
            </SheetTitle>
            <SheetDescription>
              {editingReward
                ? "Update reward details"
                : "Add a new reward for members"}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Image</Label>
              {imagePreview && (
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-32 w-full rounded-lg object-cover"
                />
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
              <Button
                variant="outline"
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full"
              >
                <IconUpload className="mr-2 size-4" />
                {imagePreview ? "Change Image" : "Upload Image"}
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward-name">Name</Label>
              <Input
                id="reward-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Reward name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward-desc">Description</Label>
              <Textarea
                id="reward-desc"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Optional description"
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="reward-points">Points Required</Label>
              <Input
                id="reward-points"
                type="number"
                min={1}
                value={formData.pointsRequired}
                onChange={(e) =>
                  setFormData({ ...formData, pointsRequired: e.target.value })
                }
                placeholder="100"
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="reward-active">Active</Label>
              <Switch
                id="reward-active"
                checked={formData.isActive}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isActive: checked })
                }
              />
            </div>

            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
              {editingReward ? "Update" : "Create"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reward</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <strong>{deleteTarget?.name}</strong>? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteTarget(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && (
                <IconLoader2 className="mr-2 size-4 animate-spin" />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
