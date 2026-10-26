"use client";

import { useEffect } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Alert tone="danger" title="This page could not load">
      <p>Something went wrong, please try again.</p>
      <Button className="mt-3" variant="outline" onClick={reset}>
        Try again
      </Button>
    </Alert>
  );
}
