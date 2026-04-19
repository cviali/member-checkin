"use client";

import { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import { getApiUrl } from "@/lib/api-config";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ChartDataPoint {
  date: string;
  checkIns: number;
  redemptions: number;
}

const chartConfig = {
  checkIns: {
    label: "Check-ins",
    color: "var(--chart-1)",
  },
  redemptions: {
    label: "Redemptions",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function ChartAreaInteractive() {
  const [data, setData] = useState<ChartDataPoint[]>([]);
  const [timeRange, setTimeRange] = useState("30d");
  const isMobile = useIsMobile();

  useEffect(() => {
    const fetchChart = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await fetch(getApiUrl("/stats"), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        setData(json.chartData || []);
      } catch {
        // Silently fail
      }
    };
    fetchChart();
  }, []);

  const filteredData = useMemo(() => {
    const now = new Date();
    let daysToSubtract = 90;
    if (timeRange === "30d") daysToSubtract = 30;
    if (timeRange === "7d") daysToSubtract = 7;

    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - daysToSubtract);

    return data.filter((item) => new Date(item.date) >= startDate);
  }, [data, timeRange]);

  return (
    <Card>
      <CardHeader className="flex items-center gap-2 space-y-0 border-b py-5 sm:flex-row">
        <div className="grid flex-1 gap-1 text-center sm:text-left">
          <CardTitle>Activity Overview</CardTitle>
          <CardDescription>
            Check-ins and redemptions over time
          </CardDescription>
        </div>
        {isMobile ? (
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-40" aria-label="Select time range">
              <SelectValue placeholder="Last 30 days" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="90d">Last 3 months</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="7d">Last 7 days</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <ToggleGroup
            type="single"
            value={timeRange}
            onValueChange={(val) => val && setTimeRange(val)}
            variant="outline"
            className="rounded-lg"
          >
            <ToggleGroupItem value="90d" className="h-8 px-3 text-xs">
              3M
            </ToggleGroupItem>
            <ToggleGroupItem value="30d" className="h-8 px-3 text-xs">
              30D
            </ToggleGroupItem>
            <ToggleGroupItem value="7d" className="h-8 px-3 text-xs">
              7D
            </ToggleGroupItem>
          </ToggleGroup>
        )}
      </CardHeader>
      <CardContent className="px-2 pt-4 sm:px-6 sm:pt-6">
        <ChartContainer config={chartConfig} className="aspect-auto h-[250px] w-full">
          <AreaChart data={filteredData}>
            <defs>
              <linearGradient id="fillCheckIns" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0.1} />
              </linearGradient>
              <linearGradient id="fillRedemptions" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.8} />
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={32}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("en-GB", {
                  day: "numeric",
                  month: "short",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("en-GB", {
                      day: "numeric",
                      month: "short",
                    });
                  }}
                  indicator="dot"
                />
              }
            />
            <Area
              dataKey="checkIns"
              type="natural"
              fill="url(#fillCheckIns)"
              stroke="var(--chart-1)"
              stackId="a"
            />
            <Area
              dataKey="redemptions"
              type="natural"
              fill="url(#fillRedemptions)"
              stroke="var(--chart-2)"
              stackId="a"
            />
          </AreaChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
