"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { getApiUrl } from "@/lib/api-config";
import { formatDateTimeGMT7 } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { StatusBadge } from "@/components/status-badge";
import { CheckinApprovalDrawer } from "@/components/checkin-approval-drawer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

interface CourtBooked {
  courtId: string;
  courtName: string;
  hours: number;
}

interface CheckIn {
  id: string;
  customerPhoneNumber: string;
  customerName?: string;
  sportType: string;
  courtsBooked: CourtBooked[];
  pointsEarned: number;
  status: string;
  rejectionReason?: string | null;
  processedBy?: string | null;
  createdAt: string;
}

export default function CheckinsPage() {
  const [pendingCheckins, setPendingCheckins] = useState<CheckIn[]>([]);
  const [historyCheckins, setHistoryCheckins] = useState<CheckIn[]>([]);
  const [loadingPending, setLoadingPending] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);
  const [historyFilter, setHistoryFilter] = useState("all");
  const [selectedCheckin, setSelectedCheckin] = useState<CheckIn | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchPending = useCallback(async () => {
    setLoadingPending(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl("/checkins?status=pending&limit=100"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setPendingCheckins(json.checkins || []);
    } catch {
      toast.error("Failed to load pending check-ins");
    } finally {
      setLoadingPending(false);
    }
  }, []);

  const fetchHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: String(historyPage),
        limit: "20",
      });
      if (historyFilter !== "all") params.set("status", historyFilter);

      const res = await fetch(getApiUrl(`/checkins?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setHistoryCheckins(json.checkins || []);
      setHistoryTotalPages(json.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load check-in history");
    } finally {
      setLoadingHistory(false);
    }
  }, [historyPage, historyFilter]);

  useEffect(() => {
    fetchPending();
  }, [fetchPending]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleOpenDrawer = (checkin: CheckIn) => {
    setSelectedCheckin(checkin);
    setDrawerOpen(true);
  };

  const handleProcessed = () => {
    fetchPending();
    fetchHistory();
  };

  const getCourtsString = (courtsBooked: CourtBooked[] | string): string => {
    const courts: CourtBooked[] =
      typeof courtsBooked === "string"
        ? JSON.parse(courtsBooked)
        : courtsBooked;
    return courts.map((c) => `${c.courtName} (${c.hours}h)`).join(", ");
  };

  const pendingColumns: ColumnDef<CheckIn>[] = [
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) =>
        row.original.customerName || row.original.customerPhoneNumber,
    },
    {
      accessorKey: "sportType",
      header: "Sport",
      cell: ({ row }) => (
        <span className="capitalize">{row.original.sportType}</span>
      ),
    },
    {
      accessorKey: "courtsBooked",
      header: "Courts",
      cell: ({ row }) => (
        <span className="max-w-[200px] truncate text-xs">
          {getCourtsString(row.original.courtsBooked)}
        </span>
      ),
    },
    {
      accessorKey: "pointsEarned",
      header: "Points",
      cell: ({ row }) => `${row.original.pointsEarned} pts`,
    },
    {
      accessorKey: "createdAt",
      header: "Requested",
      cell: ({ row }) => formatDateTimeGMT7(row.original.createdAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="outline"
          onClick={() => handleOpenDrawer(row.original)}
        >
          Review
        </Button>
      ),
    },
  ];

  const historyColumns: ColumnDef<CheckIn>[] = [
    {
      accessorKey: "customerName",
      header: "Customer",
      cell: ({ row }) =>
        row.original.customerName || row.original.customerPhoneNumber,
    },
    {
      accessorKey: "sportType",
      header: "Sport",
      cell: ({ row }) => (
        <span className="capitalize">{row.original.sportType}</span>
      ),
    },
    {
      accessorKey: "pointsEarned",
      header: "Points",
      cell: ({ row }) => `${row.original.pointsEarned} pts`,
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => <StatusBadge status={row.original.status} />,
    },
    {
      accessorKey: "createdAt",
      header: "Date",
      cell: ({ row }) => formatDateTimeGMT7(row.original.createdAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => handleOpenDrawer(row.original)}
        >
          View
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">
            Pending Queue
            {pendingCheckins.length > 0 && (
              <span className="ml-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs text-white">
                {pendingCheckins.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <DataTable columns={pendingColumns} data={pendingCheckins} />
        </TabsContent>

        <TabsContent value="history" className="mt-4 space-y-4">
          <div className="flex items-center gap-2">
            <Select
              value={historyFilter}
              onValueChange={(val) => {
                setHistoryFilter(val);
                setHistoryPage(1);
              }}
            >
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DataTable
            columns={historyColumns}
            data={historyCheckins}
            pageIndex={historyPage - 1}
            pageCount={historyTotalPages}
            onPageChange={(p) => setHistoryPage(p + 1)}
          />
        </TabsContent>
      </Tabs>

      <CheckinApprovalDrawer
        checkin={selectedCheckin}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onProcessed={handleProcessed}
      />
    </div>
  );
}
