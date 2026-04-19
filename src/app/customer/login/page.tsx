"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { getApiUrl } from "@/lib/api-config";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import Image from "next/image";
import { jwtDecode } from "jwt-decode";
import type { User } from "@/hooks/use-auth";

export default function CustomerLoginPage() {
  const { login } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phoneNumber || !dateOfBirth) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(getApiUrl("/auth/customer/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phoneNumber, dateOfBirth }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Login failed");
        return;
      }

      const decoded = jwtDecode<User & { exp: number }>(data.token);
      const user: User = {
        id: decoded.id,
        username: decoded.username,
        role: decoded.role,
        name: decoded.name,
        phoneNumber: decoded.phoneNumber,
      };
      login(data.token, user);
      toast.success("Welcome back!");
    } catch {
      toast.error("Connection error. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2">
            <Image
              src="/images/logo.jpg"
              alt="Vlocity Arena"
              width={48}
              height={48}
              className="size-12 rounded-lg"
            />
          </div>
          <CardTitle className="text-xl">Member Login</CardTitle>
          <CardDescription>
            Sign in with your phone number and date of birth
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="08xxxxxxxxxx"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                required
                autoComplete="tel"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="text"
                inputMode="numeric"
                placeholder="DD/MM/YYYY"
                value={dateOfBirth}
                onChange={(e) => {
                  let v = e.target.value.replace(/[^0-9]/g, "");
                  if (v.length > 8) v = v.slice(0, 8);
                  if (v.length >= 5) v = v.slice(0, 2) + "/" + v.slice(2, 4) + "/" + v.slice(4);
                  else if (v.length >= 3) v = v.slice(0, 2) + "/" + v.slice(2);
                  setDateOfBirth(v);
                }}
                maxLength={10}
                required
              />
            </div>
            <Button type="submit" disabled={isSubmitting} className="w-full">
              {isSubmitting && <Loader2 className="mr-2 size-4 animate-spin" />}
              Sign In
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
