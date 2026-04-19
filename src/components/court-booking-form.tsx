"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { getApiUrl } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { IconLoader2 } from "@tabler/icons-react";

interface Court {
  id: string;
  name: string;
  sportType: "padel" | "tennis" | "badminton";
  variant: string | null;
  isActive: boolean;
}

interface SelectedCourt {
  courtId: string;
  courtName: string;
  hours: number;
}

interface CourtBookingFormProps {
  customerPhone: string;
  onSuccess?: () => void;
}

export function CourtBookingForm({
  customerPhone,
  onSuccess,
}: CourtBookingFormProps) {
  const [courts, setCourts] = useState<Court[]>([]);
  const [selectedCourts, setSelectedCourts] = useState<SelectedCourt[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState("padel");

  useEffect(() => {
    const fetchCourts = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(getApiUrl("/courts"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setCourts(json.courts || []);
      } catch {
        toast.error("Failed to load courts");
      } finally {
        setLoading(false);
      }
    };
    fetchCourts();
  }, []);

  const sportTypes = ["padel", "tennis", "badminton"] as const;

  const toggleCourt = (court: Court) => {
    setSelectedCourts((prev) => {
      const existing = prev.find((c) => c.courtId === court.id);
      if (existing) {
        return prev.filter((c) => c.courtId !== court.id);
      }
      return [...prev, { courtId: court.id, courtName: court.name, hours: 1 }];
    });
  };

  const updateHours = (courtId: string, hours: number) => {
    if (hours < 0.5) hours = 0.5;
    if (hours > 12) hours = 12;
    setSelectedCourts((prev) =>
      prev.map((c) => (c.courtId === courtId ? { ...c, hours } : c))
    );
  };

  const totalPoints = selectedCourts.reduce((sum, c) => sum + c.hours, 0);

  const handleSubmit = async () => {
    if (selectedCourts.length === 0) {
      toast.error("Please select at least one court");
      return;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl("/checkins"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          customerPhoneNumber: customerPhone,
          sportType: activeTab,
          courtsBooked: selectedCourts.map((c) => ({
            courtId: c.courtId,
            courtName: c.courtName,
            hours: c.hours,
          })),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create check-in");
      }

      toast.success("Check-in submitted for approval!");
      setSelectedCourts([]);
      onSuccess?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <IconLoader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSelectedCourts([]); }}>
        <TabsList className="grid w-full grid-cols-3">
          {sportTypes.map((sport) => (
            <TabsTrigger key={sport} value={sport} className="capitalize">
              {sport}
            </TabsTrigger>
          ))}
        </TabsList>

        {sportTypes.map((sport) => {
          const sportCourts = courts.filter((c) => c.sportType === sport);
          return (
            <TabsContent key={sport} value={sport} className="space-y-3">
              {sportCourts.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No {sport} courts available
                </p>
              ) : (
                sportCourts.map((court) => {
                  const selected = selectedCourts.find(
                    (c) => c.courtId === court.id
                  );
                  return (
                    <div
                      key={court.id}
                      className="flex items-center gap-3 rounded-lg border p-3"
                    >
                      <Checkbox
                        id={court.id}
                        checked={!!selected}
                        onCheckedChange={() => toggleCourt(court)}
                      />
                      <Label
                        htmlFor={court.id}
                        className="flex-1 cursor-pointer font-medium"
                      >
                        {court.name}
                        {court.variant && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            ({court.variant})
                          </span>
                        )}
                      </Label>
                      {selected && (
                        <div className="flex items-center gap-2">
                          <Label className="text-xs text-muted-foreground">
                            Hours:
                          </Label>
                          <Input
                            type="number"
                            min={0.5}
                            max={12}
                            step={0.5}
                            value={selected.hours}
                            onChange={(e) =>
                              updateHours(court.id, parseFloat(e.target.value) || 0.5)
                            }
                            className="h-8 w-20"
                          />
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </TabsContent>
          );
        })}
      </Tabs>

      {selectedCourts.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Booking Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {selectedCourts.map((c) => (
              <div key={c.courtId} className="flex justify-between text-sm">
                <span>{c.courtName}</span>
                <span className="text-muted-foreground">
                  {c.hours}h = {c.hours} pts
                </span>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 font-semibold">
              <span>Total Points</span>
              <span>{totalPoints} pts</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Button
        onClick={handleSubmit}
        disabled={submitting || selectedCourts.length === 0}
        className="w-full"
      >
        {submitting && <IconLoader2 className="mr-2 h-4 w-4 animate-spin" />}
        Submit Check-in
      </Button>
    </div>
  );
}
