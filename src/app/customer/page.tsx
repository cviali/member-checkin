"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { getApiUrl } from "@/lib/api-config";
import { formatPoints } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import {
  IconCalendarCheck,
  IconGift,
  IconHistory,
  IconPlayBasketball,
} from "@tabler/icons-react";

interface CustomerProfile {
  id: string;
  name: string;
  phoneNumber: string;
  currentPoints: number;
  totalPoints: number;
}

export default function CustomerHomePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [flipped, setFlipped] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(getApiUrl("/auth/me"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setProfile(json);
      } catch {
        // Silently fail
      }
    };
    fetchProfile();
  }, []);

  const quickLinks = [
    {
      label: "Check In",
      href: "/customer/book-court",
      icon: IconPlayBasketball,
      color: "bg-blue-500",
    },
    {
      label: "My Check-ins",
      href: "/customer/checkins",
      icon: IconCalendarCheck,
      color: "bg-emerald-500",
    },
    {
      label: "Rewards",
      href: "/customer/rewards",
      icon: IconGift,
      color: "bg-amber-500",
    },
    {
      label: "Redemptions",
      href: "/customer/redemptions",
      icon: IconHistory,
      color: "bg-purple-500",
    },
  ];

  return (
    <div className="space-y-6">
      {/* 3D Flip Card */}
      <div
        className="perspective-1000 cursor-pointer"
        onClick={() => setFlipped(!flipped)}
      >
        <motion.div
          className="preserve-3d relative h-52 w-full"
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Front */}
          <div className="backface-hidden absolute inset-0 rounded-2xl bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground shadow-lg">
            <div className="flex h-full flex-col justify-between">
              <div className="flex items-start justify-between">
                <BrandLogo />
                <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-medium">
                  Member
                </span>
              </div>
              <div>
                <p className="text-sm opacity-80">
                  {profile?.phoneNumber || user?.phoneNumber}
                </p>
                <p className="text-lg font-bold">
                  {profile?.name || user?.name || "Member"}
                </p>
              </div>
            </div>
          </div>

          {/* Back */}
          <div className="backface-hidden absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/70 to-primary p-6 text-primary-foreground shadow-lg [transform:rotateY(180deg)]">
            <div className="flex h-full flex-col items-center justify-center text-center">
              <p className="text-sm opacity-80">Current Points</p>
              <p className="text-4xl font-bold">
                {formatPoints(profile?.currentPoints ?? 0)}
              </p>
              <div className="mt-3 h-px w-20 bg-white/30" />
              <p className="mt-3 text-xs opacity-60">
                Lifetime: {formatPoints(profile?.totalPoints ?? 0)} pts
              </p>
              <p className="mt-1 text-xs opacity-50">Tap to flip</p>
            </div>
          </div>
        </motion.div>
      </div>

      <p className="text-center text-xs text-muted-foreground">
        Tap the card to see your points
      </p>

      {/* Quick Links */}
      <div className="grid grid-cols-2 gap-3">
        {quickLinks.map((link) => (
          <Link key={link.href} href={link.href}>
            <Button
              variant="outline"
              className="flex h-24 w-full flex-col items-center justify-center gap-2 rounded-xl"
            >
              <div
                className={`flex size-10 items-center justify-center rounded-lg ${link.color} text-white`}
              >
                <link.icon className="size-5" />
              </div>
              <span className="text-xs font-medium">{link.label}</span>
            </Button>
          </Link>
        ))}
      </div>
    </div>
  );
}
