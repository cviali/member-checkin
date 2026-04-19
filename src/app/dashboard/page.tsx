"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getApiUrl } from "@/lib/api-config";
import { formatDateTimeGMT7 } from "@/lib/utils";
import { DashboardStats } from "@/components/dashboard-stats";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { StatusBadge } from "@/components/status-badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

interface PendingItem {
  id: string;
  customerName?: string;
  customerPhoneNumber: string;
  status: string;
  createdAt?: string;
  requestedAt?: string;
  // check-in specific
  sportType?: string;
  pointsEarned?: number;
  // redemption specific
  rewardName?: string;
  pointsSpent?: number;
}

export default function DashboardPage() {
  const [pendingCheckins, setPendingCheckins] = useState<PendingItem[]>([]);
  const [pendingRedemptions, setPendingRedemptions] = useState<PendingItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const token = localStorage.getItem("token");
        const headers = { Authorization: `Bearer ${token}` };

        const [checkinsRes, redemptionsRes] = await Promise.all([
          fetch(getApiUrl("/checkins?status=pending&limit=5"), { headers }),
          fetch(getApiUrl("/redemptions?status=pending&limit=5"), { headers }),
        ]);

        const checkinsJson = await checkinsRes.json();
        const redemptionsJson = await redemptionsRes.json();

        setPendingCheckins(checkinsJson.checkins || []);
        setPendingRedemptions(redemptionsJson.redemptions || []);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchRecent();
  }, []);

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
      <DashboardStats />
      <ChartAreaInteractive />

      <div className="grid gap-4 md:grid-cols-2">
        {/* Pending Check-ins */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">
                Pending Check-ins
              </CardTitle>
              <CardDescription>Awaiting staff approval</CardDescription>
            </div>
            <Link href="/dashboard/checkins">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : pendingCheckins.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No pending check-ins
              </p>
            ) : (
              <div className="space-y-2">
                {pendingCheckins.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {item.customerName || item.customerPhoneNumber}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {item.sportType} · {item.pointsEarned} pts
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Pending Redemptions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <div>
              <CardTitle className="text-sm font-medium">
                Pending Redemptions
              </CardTitle>
              <CardDescription>Awaiting staff approval</CardDescription>
            </div>
            <Link href="/dashboard/redemptions">
              <Button variant="ghost" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : pendingRedemptions.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No pending redemptions
              </p>
            ) : (
              <div className="space-y-2">
                {pendingRedemptions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-md border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">
                        {item.customerName || item.customerPhoneNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.rewardName} · {item.pointsSpent} pts
                      </p>
                    </div>
                    <StatusBadge status={item.status} />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
