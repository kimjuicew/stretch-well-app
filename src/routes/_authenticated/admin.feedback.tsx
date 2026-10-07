import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, BarChart3, LogOut, MessageSquareText, ShieldCheck, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { getAdminFeedback } from "@/lib/admin-feedback.functions";

export const Route = createFileRoute("/_authenticated/admin/feedback")({
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.rpc("has_role", {
      _user_id: context.user.id,
      _role: "admin",
    });
    if (error || !data) throw redirect({ to: "/" });
  },
  head: () => ({
    meta: [
      { title: "Admin Feedback — UniStretch" },
      { name: "description", content: "Secure UniStretch admin feedback dashboard." },
      { property: "og:title", content: "Admin Feedback — UniStretch" },
      { property: "og:description", content: "Secure UniStretch admin feedback dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AdminFeedbackPage,
});

function AdminFeedbackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchFeedback = useServerFn(getAdminFeedback);
  const feedbackQuery = useQuery({
    queryKey: ["unistretch", "admin-feedback"],
    queryFn: () => fetchFeedback(),
  });
  const feedback = feedbackQuery.data ?? [];
  const average = feedback.length
    ? feedback.reduce((sum, review) => sum + review.rating, 0) / feedback.length
    : 0;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/", replace: true });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="h-2 bg-[image:var(--gradient-strip)]" />
      <header className="border-b border-border bg-surface/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-5 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <p className="text-xl font-black">UniStretch Admin</p>
              <p className="text-sm text-muted-foreground">Feedback dashboard</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="soft" size="sm">
              <Link to="/"><ArrowLeft className="size-4" /> Back to app</Link>
            </Button>
            <Button variant="ghost" size="icon" onClick={handleSignOut} aria-label="Sign out">
              <LogOut className="size-4" />
            </Button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        <div>
          <Badge className="rounded-full">Admin only</Badge>
          <h1 className="mt-3 text-4xl font-black">User feedback</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Review ratings and suggestions submitted by signed-in UniStretch members.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Metric title="Total reviews" value={String(feedback.length)} icon={<MessageSquareText className="size-5" />} />
          <Metric title="Average rating" value={average ? average.toFixed(1) : "—"} icon={<Star className="size-5" />} />
          <Metric title="5-star reviews" value={String(feedback.filter((review) => review.rating === 5).length)} icon={<BarChart3 className="size-5" />} />
        </div>

        <Card className="rounded-3xl border-border shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle>Latest feedback</CardTitle>
          </CardHeader>
          <CardContent>
            {feedbackQuery.isLoading ? <p className="text-sm text-muted-foreground">Loading feedback…</p> : null}
            {feedbackQuery.isError ? (
              <p className="rounded-2xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">
                Admin feedback could not be loaded.
              </p>
            ) : null}
            {!feedbackQuery.isLoading && !feedbackQuery.isError && feedback.length === 0 ? (
              <div className="rounded-3xl bg-muted p-8 text-center">
                <MessageSquareText className="mx-auto size-8 text-primary" />
                <p className="mt-3 font-bold">No feedback yet</p>
                <p className="mt-1 text-sm text-muted-foreground">New ratings and suggestions will appear here.</p>
              </div>
            ) : null}
            {feedback.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Suggestion</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feedback.map((review) => (
                    <TableRow key={review.id}>
                      <TableCell className="font-bold">{review.reviewer}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1 font-bold text-warning-foreground">
                          <Star className="size-4 fill-warning text-warning" /> {review.rating}/5
                        </span>
                      </TableCell>
                      <TableCell className="max-w-xl whitespace-normal leading-6">{review.feedback}</TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" })}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: React.ReactNode }) {
  return (
    <Card className="rounded-3xl border-border shadow-[var(--shadow-card)]">
      <CardContent className="flex items-center justify-between gap-4 p-5">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <p className="mt-2 text-3xl font-black">{value}</p>
        </div>
        <div className="flex size-12 items-center justify-center rounded-2xl bg-secondary text-secondary-foreground">{icon}</div>
      </CardContent>
    </Card>
  );
}
