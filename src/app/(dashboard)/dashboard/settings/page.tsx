import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/modules/auth";

export default async function SettingsPage() {
  const supabase = await createClient();
  const user = await requireUser(supabase);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Settings"
        description="Account details for this owner login. Customers do not have accounts."
      />
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>Signed in as {user.email ?? user.id}</CardDescription>
        </CardHeader>
        <CardContent>
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
