"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api-config";
import { formatDateTimeGMT7, formatPoints } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface Redemption {
  id: string;
  rewardName?: string;
  pointsSpent: number;
  status: string;
  notes?: string | null;
  requestedAt: string;
  processedAt?: string | null;
}

export default function CustomerRedemptionsPage() {
  const { user } = useAuth();
  const [redemptions, setRedemptions] = useState<Redemption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRedemptions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(getApiUrl("/redemptions/customer"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setRedemptions(json.redemptions || []);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchRedemptions();
  }, []);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (redemptions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No redemptions yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Redeem rewards to see them here
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {redemptions.map((r) => (
        <Card key={r.id}>
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm font-medium">
                  {r.rewardName || "Reward"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTimeGMT7(r.requestedAt)}
                </p>
              </div>
              <StatusBadge status={r.status} />
            </div>
            <div className="mt-2 flex justify-between text-sm">
              <span className="text-muted-foreground">Points Spent</span>
              <span className="font-medium">
                {formatPoints(r.pointsSpent)} pts
              </span>
            </div>
            {r.notes && (
              <div className="mt-2 rounded-md bg-muted p-2 text-xs">
                Note: {r.notes}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
