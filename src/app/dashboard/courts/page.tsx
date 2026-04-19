"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { getApiUrl } from "@/lib/api-config";
import { DataTable } from "@/components/data-table";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface Court {
  id: string;
  name: string;
  sportType: string;
  variant: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function CourtsPage() {
  const [courts, setCourts] = useState<Court[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchCourts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl("/courts"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setCourts(json.courts || []);
    } catch {
      toast.error("Failed to load courts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourts();
  }, []);

  const toggleActive = async (court: Court) => {
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl(`/courts/${court.id}`), {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !court.isActive }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to update court");
      }

      setCourts((prev) =>
        prev.map((c) =>
          c.id === court.id ? { ...c, isActive: !c.isActive } : c
        )
      );
      toast.success(`${court.name} ${!court.isActive ? "activated" : "deactivated"}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    }
  };

  const sportColors: Record<string, string> = {
    padel: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
    tennis:
      "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300",
    badminton:
      "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  };

  const columns: ColumnDef<Court>[] = [
    {
      accessorKey: "name",
      header: "Court Name",
    },
    {
      accessorKey: "sportType",
      header: "Sport",
      cell: ({ row }) => (
        <Badge
          variant="secondary"
          className={`capitalize ${sportColors[row.original.sportType] || ""}`}
        >
          {row.original.sportType}
        </Badge>
      ),
    },
    {
      accessorKey: "variant",
      header: "Variant",
      cell: ({ row }) => row.original.variant || "—",
    },
    {
      accessorKey: "isActive",
      header: "Active",
      cell: ({ row }) => (
        <Switch
          checked={row.original.isActive}
          onCheckedChange={() => toggleActive(row.original)}
        />
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <DataTable columns={columns} data={courts} />
    </div>
  );
}
