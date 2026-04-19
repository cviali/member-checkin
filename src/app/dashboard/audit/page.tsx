"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { ColumnDef } from "@tanstack/react-table";
import { getApiUrl } from "@/lib/api-config";
import { formatDateTimeGMT7 } from "@/lib/utils";
import { DataTable } from "@/components/data-table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface AuditLog {
  id: string;
  action: string;
  details: string | null;
  userId: string | null;
  username: string | null;
  ipAddress: string | null;
  createdAt: string;
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [actionFilter, setActionFilter] = useState("all");
  const [userFilter, setUserFilter] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams({
        page: String(page),
        limit: "30",
      });
      if (actionFilter !== "all") params.set("action", actionFilter);
      if (userFilter) params.set("user", userFilter);

      const res = await fetch(getApiUrl(`/audit-logs?${params}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      setLogs(json.logs || []);
      setTotalPages(json.pagination?.totalPages || 1);
    } catch {
      toast.error("Failed to load audit logs");
    } finally {
      setLoading(false);
    }
  }, [page, actionFilter, userFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const columns: ColumnDef<AuditLog>[] = [
    {
      accessorKey: "action",
      header: "Action",
      cell: ({ row }) => (
        <span className="rounded bg-muted px-2 py-0.5 font-mono text-xs">
          {row.original.action}
        </span>
      ),
    },
    {
      accessorKey: "username",
      header: "User",
      cell: ({ row }) => row.original.username || "—",
    },
    {
      accessorKey: "ipAddress",
      header: "IP Address",
      cell: ({ row }) => (
        <span className="font-mono text-xs">
          {row.original.ipAddress || "—"}
        </span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Timestamp",
      cell: ({ row }) => formatDateTimeGMT7(row.original.createdAt),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) =>
        row.original.details ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelectedLog(row.original)}
          >
            Details
          </Button>
        ) : null,
    },
  ];

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          value={actionFilter}
          onValueChange={(val) => {
            setActionFilter(val);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by action" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Actions</SelectItem>
            <SelectItem value="login">Login</SelectItem>
            <SelectItem value="create_user">Create User</SelectItem>
            <SelectItem value="update_user">Update User</SelectItem>
            <SelectItem value="delete_user">Delete User</SelectItem>
            <SelectItem value="approve_checkin">Approve Check-in</SelectItem>
            <SelectItem value="reject_checkin">Reject Check-in</SelectItem>
            <SelectItem value="create_reward">Create Reward</SelectItem>
            <SelectItem value="update_reward">Update Reward</SelectItem>
            <SelectItem value="delete_reward">Delete Reward</SelectItem>
            <SelectItem value="approve_redemption">Approve Redemption</SelectItem>
            <SelectItem value="reject_redemption">Reject Redemption</SelectItem>
          </SelectContent>
        </Select>

        <Input
          placeholder="Filter by username..."
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value);
            setPage(1);
          }}
          className="max-w-[200px]"
        />
      </div>

      <DataTable
        columns={columns}
        data={logs}
        pageIndex={page - 1}
        pageCount={totalPages}
        onPageChange={(p) => setPage(p + 1)}
      />

      {/* Details Dialog */}
      <Dialog
        open={!!selectedLog}
        onOpenChange={(open) => !open && setSelectedLog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
            <DialogDescription>
              {selectedLog?.action} by {selectedLog?.username || "unknown"} at{" "}
              {selectedLog ? formatDateTimeGMT7(selectedLog.createdAt) : ""}
            </DialogDescription>
          </DialogHeader>
          <pre className="max-h-[300px] overflow-auto rounded-lg bg-muted p-4 text-sm">
            {selectedLog?.details
              ? JSON.stringify(JSON.parse(selectedLog.details), null, 2)
              : "No details available"}
          </pre>
        </DialogContent>
      </Dialog>
    </div>
  );
}
