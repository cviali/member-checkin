"use client";

import { useState } from "react";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api-config";
import { formatDateTimeGMT7, formatPoints } from "@/lib/utils";
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

interface RedemptionApprovalDrawerProps {
  redemption: Redemption | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProcessed?: () => void;
}

export function RedemptionApprovalDrawer({
  redemption,
  open,
  onOpenChange,
  onProcessed,
}: RedemptionApprovalDrawerProps) {
  const [notes, setNotes] = useState("");
  const [processing, setProcessing] = useState<"approve" | "reject" | null>(null);

  const handleAction = async (action: "approve" | "reject") => {
    if (!redemption) return;
    setProcessing(action);

    try {
      const token = localStorage.getItem("token");
      const url = getApiUrl(`/redemptions/${redemption.id}/${action}`);
      const body: Record<string, string> = {};
      if (notes.trim()) {
        body.notes = notes.trim();
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
        throw new Error(err.error || `Failed to ${action} redemption`);
      }

      toast.success(
        action === "approve" ? "Redemption approved!" : "Redemption rejected — points refunded"
      );
      setNotes("");
      onOpenChange(false);
      onProcessed?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setProcessing(null);
    }
  };

  if (!redemption) return null;

  const isPending = redemption.status === "pending";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Redemption Details</SheetTitle>
          <SheetDescription>
            Review and process this redemption request
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          {redemption.rewardImageUrl && (
            <div className="overflow-hidden rounded-lg border">
              <img
                src={getApiUrl(redemption.rewardImageUrl)}
                alt={redemption.rewardName || "Reward"}
                className="h-40 w-full object-cover"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Reward</span>
              <span className="text-sm font-medium">
                {redemption.rewardName || redemption.rewardId}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Points Cost</span>
              <span className="text-sm font-medium">
                {formatPoints(redemption.pointsSpent)} pts
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Customer</span>
              <span className="text-sm font-medium">
                {redemption.customerName || redemption.customerPhoneNumber}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Phone</span>
              <span className="text-sm">{redemption.customerPhoneNumber}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Status</span>
              <StatusBadge status={redemption.status} />
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Requested</span>
              <span className="text-sm">
                {formatDateTimeGMT7(redemption.requestedAt)}
              </span>
            </div>
            {redemption.processedAt && (
              <div className="flex justify-between">
                <span className="text-sm text-muted-foreground">Processed</span>
                <span className="text-sm">
                  {formatDateTimeGMT7(redemption.processedAt)}
                </span>
              </div>
            )}
          </div>

          {isPending && (
            <>
              <Separator />

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-sm">
                  Notes (optional)
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Add a note..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
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

          {redemption.notes && (
            <>
              <Separator />
              <div className="space-y-1">
                <Label className="text-sm text-muted-foreground">Notes</Label>
                <p className="text-sm">{redemption.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
