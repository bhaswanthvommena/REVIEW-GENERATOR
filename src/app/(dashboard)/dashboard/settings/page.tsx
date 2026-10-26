import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";
import { AccountForm } from "./account-form";

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);
  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, phone, date_of_birth")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account details for this owner login. Customers do not have accounts."
      />
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Your name, phone number, and date of birth.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <AccountForm
            userId={user.id}
            email={user.email ?? ""}
            initialName={(profile?.full_name as string | undefined) ?? ""}
            initialPhone={(profile?.phone as string | undefined) ?? ""}
            initialDateOfBirth={
              profile?.date_of_birth ? String(profile.date_of_birth).slice(0, 10) : ""
            }
          />
          <form action="/auth/signout" method="post">
            <Button type="submit" variant="outline">
              Sign out
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
          <CardDescription>Switch between light and dark. The first visit follows this device.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center gap-3">
          <ThemeToggle />
          <p className="text-sm text-muted-foreground">Toggle the theme for this browser.</p>
        </CardContent>
      </Card>
    </div>
  );
}
