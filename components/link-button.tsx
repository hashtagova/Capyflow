import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "secondary" | "ghost";
type Size = "default" | "sm" | "lg";

const base =
  "inline-flex items-center justify-center rounded-lg border border-transparent text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50";

const variants: Record<Variant, string> = {
  default: "bg-primary text-primary-foreground hover:bg-primary/80",
  outline: "border-border bg-background hover:bg-muted hover:text-foreground",
  secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
  ghost: "hover:bg-muted hover:text-foreground",
};

const sizes: Record<Size, string> = {
  default: "h-8 px-3 py-2",
  sm: "h-7 px-2.5 text-[0.8rem]",
  lg: "h-9 px-4",
};

interface Props {
  href: string;
  variant?: Variant;
  size?: Size;
  className?: string;
  children: React.ReactNode;
}

export function LinkButton({
  href,
  variant = "default",
  size = "default",
  className,
  children,
}: Props) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)}>
      {children}
    </Link>
  );
}
