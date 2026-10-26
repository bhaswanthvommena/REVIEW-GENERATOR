"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { ProfileAvatar } from "@/components/dashboard/profile-avatar";
import { useToast } from "@/components/ui/toast";
import { createClient } from "@/lib/supabase/browser";
import { toUserMessage, UserFacingError } from "@/lib/api/client";
import { publicAvatarUrl } from "@/modules/profile";

const MAX_BYTES = 2 * 1024 * 1024;
const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export function AvatarForm({
  userId,
  initialPath,
}: {
  userId: string;
  initialPath: string | null;
}) {
  const router = useRouter();
  const { push } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [path, setPath] = useState(initialPath);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    const extension = TYPES[file.type];
    if (!extension) {
      setError("Use a JPEG, PNG, or WebP image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Image must be 2 MB or smaller.");
      return;
    }

    setPending(true);
    setError(null);
    const nextPath = `${userId}/${crypto.randomUUID()}.${extension}`;
    try {
      const supabase = createClient();
      const { error: uploadError } = await supabase.storage.from("avatars").upload(nextPath, file, {
        contentType: file.type,
        upsert: false,
      });
      if (uploadError) throw new UserFacingError("Could not upload that photo.");
      const { error: saveError } = await supabase.from("profiles").upsert({
        id: userId,
        avatar_path: nextPath,
        updated_at: new Date().toISOString(),
      });
      if (saveError) {
        await supabase.storage.from("avatars").remove([nextPath]);
        throw new UserFacingError("Could not save your photo.");
      }
      if (path && path !== nextPath) {
        await supabase.storage.from("avatars").remove([path]);
      }
      setPath(nextPath);
      push("Photo updated");
      router.refresh();
    } catch (err) {
      setError(toUserMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex items-center gap-4">
      <ProfileAvatar src={publicAvatarUrl(path)} label="Profile photo" className="size-16" />
      <div className="space-y-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(event) => void onFile(event)}
        />
        <Button type="button" variant="outline" loading={pending} onClick={() => inputRef.current?.click()}>
          {path ? "Change photo" : "Upload photo"}
        </Button>
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP. 2 MB max.</p>
        {error ? <Alert tone="danger">{error}</Alert> : null}
      </div>
    </div>
  );
}
