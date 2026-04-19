import Image from "next/image";
import { cn } from "@/lib/utils";

export function BrandLogo({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Image
        src="/images/logo.jpg"
        alt="Vlocity Arena"
        width={32}
        height={32}
        className="size-8 rounded-md"
      />
      <div className="flex flex-col">
        <span className="text-sm font-bold leading-none">Vlocity Arena</span>
        <span className="text-[10px] text-muted-foreground">Sport Center</span>
      </div>
    </div>
  );
}
