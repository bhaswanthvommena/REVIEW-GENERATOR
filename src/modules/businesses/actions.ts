"use server";

import { cookies } from "next/headers";
import { ACTIVE_BUSINESS_COOKIE } from "./constants";

export async function setActiveBusinessAction(businessId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(ACTIVE_BUSINESS_COOKIE, businessId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
}
