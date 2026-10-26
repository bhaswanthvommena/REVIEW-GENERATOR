"use client";

import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <Alert tone="danger" title="This page could not load">
      <p>{error.message || "Try again in a moment."}</p>
      <Button className="mt-3" variant="outline" onClick={reset}>
        Try again
      </Button>
    </Alert>
  );
}
