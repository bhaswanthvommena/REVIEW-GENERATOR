import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const badgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
  {
    variants: {
      tone: {
        default: "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-100",
        success: "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200",
        warning: "bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-200",
        muted: "bg-muted text-muted-foreground",
        danger: "bg-rose-50 text-rose-700 dark:bg-rose-950 dark:text-rose-200",
      },
    },
    defaultVariants: { tone: "default" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}
