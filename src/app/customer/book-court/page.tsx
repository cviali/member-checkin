"use client";

import { useAuth } from "@/hooks/use-auth";
import { CourtBookingForm } from "@/components/court-booking-form";
import { useRouter } from "next/navigation";

export default function BookCourtPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Select courts and hours to submit a check-in request. Staff will review
        and approve your booking.
      </p>
      <CourtBookingForm
        customerPhone={user.phoneNumber || ""}
        onSuccess={() => router.push("/customer/checkins")}
      />
    </div>
  );
}
