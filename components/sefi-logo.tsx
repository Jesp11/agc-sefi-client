import Image from "next/image";
import { cn } from "@/lib/utils";

interface SefiLogoProps {
  className?: string;
}

export function SefiLogo({ className }: SefiLogoProps) {
  return (
    <div className={cn("shrink-0 rounded-lg bg-white overflow-hidden", className)}>
      <Image
        src="/logo.png"
        alt="SEFI Logo"
        width={48}
        height={48}
        className="object-contain p-0.5"
        priority
      />
    </div>
  );
}
