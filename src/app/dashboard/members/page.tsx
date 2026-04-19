"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { getApiUrl } from "@/lib/api-config";
import { formatDate, formatPoints } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

interface Member {
  id: string;
  name: string;
  phoneNumber: string;
  dateOfBirth: string | null;
  currentPoints: number;
  totalPoints: number;
  createdAt: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMember, setEditingMember] = useState<Member | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    phoneNumber: "",
    dateOfBirth: "",
  });
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<Member | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        role: "customer",
      });
      if (search) params.set("search", search);

      const res = await fetch(getApiUrl(`/users?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setMembers(json.users || []);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load members");
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  const openCreate = () => {
    setEditingMember(null);
    setFormData({ name: "", phoneNumber: "", dateOfBirth: "" });
    setSheetOpen(true);
  };

  const openEdit = (member: Member) => {
    setEditingMember(member);
    setFormData({
      name: member.name,
      phoneNumber: member.phoneNumber,
      dateOfBirth: member.dateOfBirth || "",
    });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const token = localStorage.getItem("token");
      const isEditing = !!editingMember;
      const url = isEditing
        ? getApiUrl(`/users/${editingMember.id}`)
        : getApiUrl("/users");
      const method = isEditing ? "PATCH" : "POST";

      const body: Record<string, string> = {
        name: formData.name,
        phoneNumber: formData.phoneNumber,
      };
      if (formData.dateOfBirth) body.dateOfBirth = formData.dateOfBirth;
      if (!isEditing) {
        body.role = "customer";
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
        throw new Error(err.error || "Failed to save member");
      }

      toast.success(isEditing ? "Member updated" : "Member created");
      setSheetOpen(false);
      fetchMembers();
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
        throw new Error(err.error || "Failed to delete member");
      }

      toast.success("Member deleted");
      setDeleteTarget(null);
      fetchMembers();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setDeleting(false);
    }
  };

  const columns: ColumnDef<Member>[] = [
    {
      accessorKey: "name",
      header: "Name",
    },
    {
      accessorKey: "phoneNumber",
      header: "Phone",
    },
    {
      accessorKey: "currentPoints",
      header: "Points",
      cell: ({ row }) => formatPoints(row.original.currentPoints),
    },
    {
      accessorKey: "totalPoints",
      header: "Lifetime",
      cell: ({ row }) => formatPoints(row.original.totalPoints),
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
      <div className="flex items-center justify-between">
        <Input
          placeholder="Search members..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="max-w-sm"
        />
        <Button onClick={openCreate}>
          <IconPlus className="mr-2 size-4" />
          Add Member
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={members}
        pageIndex={page - 1}
        pageCount={totalPages}
        onPageChange={(p) => setPage(p + 1)}
      />

      {/* Create/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>
              {editingMember ? "Edit Member" : "Add Member"}
            </SheetTitle>
            <SheetDescription>
              {editingMember
                ? "Update member information"
                : "Create a new member account"}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="Full name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                value={formData.phoneNumber}
                onChange={(e) =>
                  setFormData({ ...formData, phoneNumber: e.target.value })
                }
                placeholder="08xxxxxxxxxx"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                value={formData.dateOfBirth}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, "");
                  if (v.length > 8) v = v.slice(0, 8);
                  if (v.length >= 5) v = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4);
                  else if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                  setFormData({ ...formData, dateOfBirth: v });
                }}
                maxLength={10}
              />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <IconLoader2 className="mr-2 size-4 animate-spin" />}
              {editingMember ? "Update" : "Create"}
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
            <DialogTitle>Delete Member</DialogTitle>
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
