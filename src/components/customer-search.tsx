"use client";

import { useState, useEffect, useCallback } from "react";
import { useDebounce } from "@/hooks/use-debounce";
import { getApiUrl } from "@/lib/api-config";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Search, X, UserPlus } from "lucide-react";
import Link from "next/link";

interface Customer {
  id: string;
  name: string;
  phoneNumber: string;
  currentPoints: number;
  totalPoints: number;
}

interface CustomerSearchProps {
  onSelect: (customer: Customer) => void;
  value?: Customer | null;
  onClear?: () => void;
}

export function CustomerSearch({
  onSelect,
  value,
  onClear,
}: CustomerSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Customer[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(query, 300);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(getApiUrl(`/users/search?q=${encodeURIComponent(q)}`), {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setResults(data.data || []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    search(debouncedQuery);
  }, [debouncedQuery, search]);

  if (value) {
    return (
      <div className="flex items-center gap-3 rounded-lg border p-3">
        <div className="flex-1">
          <p className="text-sm font-medium">{value.name}</p>
          <p className="text-xs text-muted-foreground">{value.phoneNumber}</p>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold">{value.currentPoints} pts</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          onClick={onClear}
        >
          <X className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <Popover open={isOpen && results.length > 0} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search member by name or phone..."
            className="pl-9"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="max-h-64 overflow-y-auto">
          {isLoading && (
            <p className="px-3 py-2 text-sm text-muted-foreground">
              Searching...
            </p>
          )}
          {results.map((customer) => (
            <button
              key={customer.id}
              className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent"
              onClick={() => {
                onSelect(customer);
                setIsOpen(false);
                setQuery("");
              }}
            >
              <div className="flex-1">
                <p className="font-medium">{customer.name}</p>
                <p className="text-xs text-muted-foreground">
                  {customer.phoneNumber}
                </p>
              </div>
              <span className="text-xs text-muted-foreground">
                {customer.currentPoints} pts
              </span>
            </button>
          ))}
          {!isLoading && results.length === 0 && debouncedQuery.length >= 2 && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-muted-foreground">No members found</p>
              <Link
                href="/dashboard/members"
                className="mt-1 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <UserPlus className="size-3" />
                Register new member
              </Link>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
