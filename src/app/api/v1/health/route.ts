import { apiOk } from "@/lib/api/errors";

export async function GET() {
  return apiOk({
    ok: true,
    service: "review-generator",
    phase: "phase-3-qr-feedback",
  });
}
