"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api-config";
import { formatDateTimeGMT7 } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { IconLoader2 } from "@tabler/icons-react";

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
  createdAt: string;
}

interface CheckinApprovalDrawerProps {
  checkin: CheckIn | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessed?: () => void;
}

export function CheckinApprovalDrawer({
  checkin,
  open,
  onOpenChange,
  onProcessed,
}: CheckinApprovalDrawerProps) {
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState<"approve" | "reject" | null>(null);

  const handleAction = async (action: "approve" | "reject") => {
    if (!checkin) return;
    setProcessing(action);

    try {
      const token = localStorage.getItem("token");
      const url = getApiUrl(`/checkins/${checkin.id}/${action}`);
      const body: Record<string, string> = {};
      if (action === "reject" && rejectionReason.trim()) {
        body.rejectionReason = rejectionReason.trim();
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || `Failed to ${action} check-in`);
      }

      toast.success(
        action === "approve" ? "Check-in approved!" : "Check-in rejected"
      );
      setRejectionReason("");
      onOpenChange(false);
      onProcessed?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setProcessing(null);
    }
  };

  if (!checkin) return null;

  const courts: CourtBooked[] =
    typeof checkin.courtsBooked === "string"
      ? JSON.parse(checkin.courtsBooked)
      : checkin.courtsBooked;

  const isPending = checkin.status === "pending";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Check-in Details</SheetTitle>
          <SheetDescription>
            Review and process this check-in request
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Customer</span>
              <span className="text-sm font-medium">
                {checkin.customerName || checkin.customerPhoneNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Phone</span>
              <span className="text-sm">{checkin.customerPhoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Sport</span>
              <span className="text-sm capitalize">{checkin.sportType}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={checkin.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Requested</span>
              <span className="text-sm">
                {formatDateTimeGMT7(checkin.createdAt)}
              </span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label className="text-sm font-medium">Courts Booked</Label>
            {courts.map((court) => (
              <div
                key={court.courtId}
                className="flex justify-between rounded-md border px-3 py-2 text-sm"
              >
                <span>{court.courtName}</span>
                <span className="text-muted-foreground">
                  {court.hours}h = {court.hours} pts
                </span>
              </div>
            ))}
            <div className="flex justify-between pt-1 font-semibold text-sm">
              <span>Total Points</span>
              <span>{checkin.pointsEarned} pts</span>
            </div>
          </div>

          {isPending && (
            <>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="rejection-reason" className="text-sm">
                  Rejection Reason (optional)
                </Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Enter reason for rejection..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                />
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 border-red-500 text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950"
                  onClick={() => handleAction("reject")}
                  disabled={processing !== null}
                >
                  {processing === "reject" && (
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Reject
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                  onClick={() => handleAction("approve")}
                  disabled={processing !== null}
                >
                  {processing === "approve" && (
                    <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Approve
                </Button>
              </div>
            </>
          )}

          {checkin.rejectionReason && (
            <>
              <Separator />
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">
                  Rejection Reason
                </Label>
                <p className="text-sm">{checkin.rejectionReason}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
