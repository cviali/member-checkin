"use client";

import { useEffect, useState } from "react";
import { getApiUrl } from "@/lib/api-config";
import { formatDateTimeGMT7 } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { StatusBadge } from "@/components/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IconLoader2 } from "@tabler/icons-react";

interface CourtBooked {
  courtId: string;
  courtName: string;
  hours: number;
}

interface CheckIn {
  id: string;
  sportType: string;
  courtsBooked: CourtBooked[] | string;
  pointsEarned: number;
  status: string;
  rejectionReason?: string | null;
  createdAt: string;
}

export default function CustomerCheckinsPage() {
  const { user } = useAuth();
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCheckins = async () => {
      if (!user?.phoneNumber) return;
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(
          getApiUrl(`/checkins/customer/${encodeURIComponent(user.phoneNumber)}`),
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const json = await res.json();
        setCheckins(json.checkins || []);
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    };
    fetchCheckins();
  }, [user?.phoneNumber]);

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (checkins.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-muted-foreground">No check-ins yet</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Book a court to create your first check-in
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {checkins.map((checkin) => {
        const courts: CourtBooked[] =
          typeof checkin.courtsBooked === "string"
            ? JSON.parse(checkin.courtsBooked)
            : checkin.courtsBooked;

        return (
          <Card key={checkin.id}>
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">
                    {checkin.sportType}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTimeGMT7(checkin.createdAt)}
                  </p>
                </div>
                <StatusBadge status={checkin.status} />
              </div>

              <div className="mt-3 space-y-1">
                {courts.map((court) => (
                  <div
                    key={court.courtId}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-muted-foreground">
                      {court.courtName}
                    </span>
                    <span>{court.hours}h</span>
                  </div>
                ))}
              </div>

              <div className="mt-2 flex justify-between border-t pt-2 text-sm font-medium">
                <span>Points</span>
                <span>{checkin.pointsEarned} pts</span>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
