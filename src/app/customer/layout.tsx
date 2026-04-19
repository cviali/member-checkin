"use client";

import { usePathname, useRouter } from "next/navigation";
import { ChevronLeft, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";

const PAGE_CONFIG: Record<string, { title: string; back: string }> = {
  "/customer": { title: "My Card", back: "" },
  "/customer/book-court": { title: "Check In", back: "/customer" },
  "/customer/checkins": { title: "My Check-ins", back: "/customer" },
  "/customer/rewards": { title: "Rewards", back: "/customer" },
  "/customer/redemptions": { title: "My Redemptions", back: "/customer" },
};

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Don't show nav on login page
  if (pathname === "/customer/login") {
    return <>{children}</>;
  }

  if (!user || user.role !== "customer") {
    return null;
  }

  const config = PAGE_CONFIG[pathname] || { title: "", back: "/customer" };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center">
      {/* Sticky nav */}
      {pathname !== "/" && (
        <nav className="sticky top-0 z-50 flex h-14 w-full max-w-lg items-center border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          {config.back && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-2"
              onClick={() => router.push(config.back)}
            >
              <ChevronLeft className="size-5" />
            </Button>
          )}
          <h1 className="mx-auto text-sm font-semibold">{config.title}</h1>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-2"
            onClick={logout}
          >
            <LogOut className="size-4" />
          </Button>
        </nav>
      )}
      <main className="w-full max-w-lg p-4">{children}</main>
    </div>
  );
}
