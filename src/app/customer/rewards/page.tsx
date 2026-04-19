"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api-config";
import { formatPoints } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { IconGift, IconLoader2 } from "@tabler/icons-react";

interface Reward {
  id: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  pointsRequired: number;
  isActive: boolean;
}

interface CustomerProfile {
  currentPoints: number;
}

export default function CustomerRewardsPage() {
  const { user } = useAuth();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token");
        const [rewardsRes, profileRes] = await Promise.all([
          fetch(getApiUrl("/rewards"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(getApiUrl("/auth/me"), {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);
        const rewardsJson = await rewardsRes.json();
        const profileJson = await profileRes.json();
        setRewards(rewardsJson.rewards || []);
        setProfile(profileJson || null);
      } catch {
        toast.error("Failed to load rewards");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleRedeem = async (reward: Reward) => {
    if (!user?.phoneNumber) return;
    setRedeeming(reward.id);

    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl("/redemptions"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          rewardId: reward.id,
          customerPhoneNumber: user.phoneNumber,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to redeem reward");
      }

      toast.success("Redemption submitted for approval!");
      // Refresh profile to update points
      const profileRes = await fetch(getApiUrl("/auth/me"), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const profileJson = await profileRes.json();
      setProfile(profileJson || null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  const currentPoints = profile?.currentPoints ?? 0;

  return (
    <div className="space-y-4">
      {/* Points Display */}
      <div className="rounded-xl bg-primary/10 p-4 text-center">
        <p className="text-xs text-muted-foreground">Your Points</p>
        <p className="text-2xl font-bold">{formatPoints(currentPoints)}</p>
      </div>

      {rewards.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <IconGift className="size-10 text-muted-foreground" />
          <p className="mt-2 text-muted-foreground">No rewards available</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {rewards.map((reward) => {
            const canAfford = currentPoints >= reward.pointsRequired;
            return (
              <Card key={reward.id}>
                <CardContent className="p-0">
                  {reward.imageUrl && (
                    <img
                      src={getApiUrl(reward.imageUrl)}
                      alt={reward.name}
                      className="aspect-square w-full rounded-t-xl object-contain bg-muted"
                    />
                  )}
                  <div className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">{reward.name}</p>
                        {reward.description && (
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {reward.description}
                          </p>
                        )}
                      </div>
                      <span className="shrink-0 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium">
                        {formatPoints(reward.pointsRequired)} pts
                      </span>
                    </div>
                    <Button
                      className="mt-3 w-full"
                      size="sm"
                      disabled={!canAfford || redeeming === reward.id}
                      onClick={() => handleRedeem(reward)}
                    >
                      {redeeming === reward.id ? (
                        <IconLoader2 className="mr-2 size-4 animate-spin" />
                      ) : null}
                      {canAfford ? "Redeem" : "Not Enough Points"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
