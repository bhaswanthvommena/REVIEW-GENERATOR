import { User } from "lucide-react";
import { cn } from "@/lib/cn";

export function ProfileAvatar({
  src,
  label = "Account",
  className,
}: {
  src: string | null;
  label?: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted text-muted-foreground",
        className,
      )}
    >
      {src ? (
        // Public storage URL; host depends on the project, so next/image remote patterns do not apply.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <User className="size-4" aria-hidden="true" />
      )}
      <span className="sr-only">{label}</span>
    </span>
  );
}
