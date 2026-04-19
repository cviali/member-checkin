"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { getApiUrl } from "@/lib/api-config";
import { formatDateTimeGMT7, formatPoints } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { RedemptionApprovalDrawer } from "@/components/redemption-approval-drawer";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface Redemption {
  id: string;
  rewardId: string;
  rewardName?: string;
  rewardImageUrl?: string | null;
  customerPhoneNumber: string;
  customerName?: string;
  pointsSpent: number;
  status: string;
  notes?: string | null;
  requestedAt: string;
  processedAt?: string | null;
  processedBy?: string | null;
}

export default function RedemptionsPage() {
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedRedemption, setSelectedRedemption] =
    useState<Redemption | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchRedemptions = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);

      const res = await fetch(getApiUrl(`/redemptions?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setRedemptions(json.redemptions || []);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load redemptions");
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    fetchRedemptions();
  }, [fetchRedemptions]);

  const handleOpenDrawer = (redemption: Redemption) => {
    setSelectedRedemption(redemption);
    setDrawerOpen(true);
  };

  const columns: ColumnDef<Redemption>[] = [
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) =>
        row.original.customerName || row.original.customerPhoneNumber,
    },
    {
      accessorKey: "rewardName",
      header: "Reward",
      cell: ({ row }) => row.original.rewardName || row.original.rewardId,
    },
    {
      accessorKey: "pointsSpent",
      header: "Points",
      cell: ({ row }) => `${formatPoints(row.original.pointsSpent)} pts`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "requestedAt",
      header: "Requested",
      cell: ({ row }) => formatDateTimeGMT7(row.original.requestedAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant={row.original.status === "pending" ? "outline" : "ghost"}
          onClick={() => handleOpenDrawer(row.original)}
        >
          {row.original.status === "pending" ? "Review" : "View"}
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex items-center gap-2">
        <Select
          value={statusFilter}
          onValueChange={(val) => {
            setStatusFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filter status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={redemptions}
        pageIndex={page - 1}
        pageCount={totalPages}
        onPageChange={(p) => setPage(p + 1)}
      />

      <RedemptionApprovalDrawer
        redemption={selectedRedemption}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onProcessed={fetchRedemptions}
      />
    </div>
  );
}
