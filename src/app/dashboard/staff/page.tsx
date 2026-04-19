"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { getApiUrl } from "@/lib/api-config";
import { formatDate } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { IconLoader2, IconPlus, IconPencil, IconTrash } from "@tabler/icons-react";

interface StaffUser {
  id: string;
  name: string;
  username: string;
  phoneNumber: string | null;
  role: "admin" | "cashier";
  createdAt: string;
}

export default function StaffPage() {
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    username: "",
    phoneNumber: "",
    password: "",
    role: "cashier" as string,
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<StaffUser | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      const res = await fetch(getApiUrl(`/users?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      // Filter to only staff roles
      const staffUsers = (json.users || []).filter(
        (u: StaffUser) => u.role === "admin" || u.role === "cashier"
      );
      setStaff(staffUsers);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load staff");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const openCreate = () => {
    setEditingStaff(null);
    setFormData({
      name: "",
      username: "",
      phoneNumber: "",
      password: "",
      role: "cashier",
    });
    setSheetOpen(true);
  };

  const openEdit = (member: StaffUser) => {
    setEditingStaff(member);
    setFormData({
      name: member.name,
      username: member.username,
      phoneNumber: member.phoneNumber || "",
      password: "",
      role: member.role,
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const isEditing = !!editingStaff;
      const url = isEditing
        ? getApiUrl(`/users/${editingStaff.id}`)
        : getApiUrl("/users");
      const method = isEditing ? "PATCH" : "POST";

      const body: Record<string, string> = {
        name: formData.name,
        username: formData.username,
        role: formData.role,
      };
      if (formData.phoneNumber) body.phoneNumber = formData.phoneNumber;
      if (!isEditing) {
        body.password = formData.password || "staff123";
      } else if (formData.password) {
        body.password = formData.password;
      }

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
        throw new Error(err.error || "Failed to save staff");
      }

      toast.success(isEditing ? "Staff updated" : "Staff created");
      setSheetOpen(false);
      fetchStaff();
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
      const res = await fetch(getApiUrl(`/users/${deleteTarget.id}`), {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to delete staff");
      }

      toast.success("Staff member deleted");
      setDeleteTarget(null);
      fetchStaff();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const roleColors: Record<string, string> = {
    admin:
      "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
    cashier:
      "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  };

  const columns: ColumnDef<StaffUser>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "username",
      header: "Username",
    },
    {
      accessorKey: "role",
      header: "Role",
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={`capitalize ${roleColors[row.original.role] || ""}`}
        >
          {row.original.role}
        </Badge>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Joined",
      cell: ({ row }) => formatDate(new Date(row.original.createdAt)),
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
          Add Staff
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={staff}
        pageIndex={page - 1}
        pageCount={totalPages}
        onPageChange={(p) => setPage(p + 1)}
      />

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingStaff ? "Edit Staff" : "Add Staff"}
            </SheetTitle>
            <SheetDescription>
              {editingStaff
                ? "Update staff member information"
                : "Create a new staff account"}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="staff-name">Name</Label>
              <Input
                id="staff-name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-username">Username</Label>
              <Input
                id="staff-username"
                value={formData.username}
                onChange={(e) =>
                  setFormData({ ...formData, username: e.target.value })
                }
                placeholder="Username for login"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-phone">Phone Number (optional)</Label>
              <Input
                id="staff-phone"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-role">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(val) =>
                  setFormData({ ...formData, role: val })
                }
              >
                <SelectTrigger id="staff-role">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cashier">Cashier</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="staff-password">
                Password{" "}
                {editingStaff && (
                  <span className="text-xs text-muted-foreground">
                    (leave blank to keep current)
                  </span>
                )}
              </Label>
              <Input
                id="staff-password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                placeholder={editingStaff ? "••••••••" : "Default: staff123"}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
              {editingStaff ? "Update" : "Create"}
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
            <DialogTitle>Delete Staff Member</DialogTitle>
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
