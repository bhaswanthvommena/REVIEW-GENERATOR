"use client";

import { useState } from "react";
import { cn } from "@/lib/cn";

const items = [
  {
    q: "Do you post the review to Google?",
    a: "No. The customer copies the draft and posts it themselves. We only count the click on Continue to Google.",
  },
  {
    q: "What if the visit was just okay?",
    a: "Continue to Google stays available for every rating. We do not hide it, disable it, or rewrite a bad visit into a glowing one.",
  },
  {
    q: "Do customers need an account?",
    a: "No. Only the business owner signs in. Customers open the QR link, rate the visit, and leave.",
  },
  {
    q: "Which AI writes the draft?",
    a: "Google Gemini, called from our servers. The customer can edit every word before copying.",
  },
  {
    q: "Can I ask only happy customers?",
    a: "No. Do not hide the Google link, offer incentives, or filter who is invited to review.",
  },
];

export function FaqList() {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-card">
      {items.map((item, index) => {
        const expanded = open === index;
        return (
          <div key={item.q}>
            <h3>
              <button
                type="button"
                className="flex min-h-14 w-full items-center justify-between gap-4 px-5 text-left text-sm font-medium"
                aria-expanded={expanded}
                onClick={() => setOpen(expanded ? null : index)}
              >
                {item.q}
                <span aria-hidden="true" className="text-muted-foreground">
                  {expanded ? "–" : "+"}
                </span>
              </button>
            </h3>
            <div className={cn("px-5 pb-4 text-sm text-muted-foreground", expanded ? "block" : "hidden")}>
              {item.a}
            </div>
          </div>
        );
      })}
    </div>
  );
}
