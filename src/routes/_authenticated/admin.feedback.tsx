import { useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, Link, redirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { Activity, ArrowLeft, CalendarDays, LogOut, MessageSquareText, ShieldCheck, Star } from "lucide-react";
import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const fmtDate = (v: string | null, time = false) =>
  v ? new Date(v).toLocaleString([], { year: "numeric", month: "short", day: "numeric", ...(time ? { hour: "2-digit", minute: "2-digit" } : {}) }) : "—";

function AdminFeedbackPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fetchData = useServerFn(getAdminFeedback);
  const query = useQuery({ queryKey: ["unistretch", "admin-dashboard"], queryFn: () => fetchData() });
  const feedback = query.data?.reviews ?? [];
  const usage = query.data?.usage ?? [];
  const bookings = query.data?.bookings ?? [];
  const average = feedback.length ? feedback.reduce((s, r) => s + r.rating, 0) / feedback.length : 0;
  const activeWeek = usage.filter((u) => u.weekSessions > 0).length;
  const upcoming = bookings.filter((b) => new Date(b.appointmentTime).getTime() > Date.now()).length;

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/", replace: true });
  }

  const empty = (text: string) => <p className="rounded-3xl bg-muted p-8 text-center text-sm text-muted-foreground">{text}</p>;

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
              <p className="text-sm text-muted-foreground">Dashboard</p>
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
          <h1 className="mt-3 text-4xl font-black">Admin dashboard</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">Feedback, member activity and doctor appointments in one place.</p>
        </div>

        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Metric title="Reviews" value={String(feedback.length)} icon={<MessageSquareText className="size-5" />} />
          <Metric title="Avg rating" value={average ? average.toFixed(1) : "—"} icon={<Star className="size-5" />} />
          <Metric title="Active this week" value={`${activeWeek}/${usage.length}`} icon={<Activity className="size-5" />} />
          <Metric title="Upcoming visits" value={String(upcoming)} icon={<CalendarDays className="size-5" />} />
        </div>

        {query.isLoading ? <p className="text-sm text-muted-foreground">Loading…</p> : null}
        {query.isError ? <p className="rounded-2xl bg-destructive/10 p-4 text-sm font-semibold text-destructive">Admin data could not be loaded.</p> : null}

        <Tabs defaultValue="feedback">
          <TabsList className="rounded-2xl">
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="usage">Usage</TabsTrigger>
            <TabsTrigger value="bookings">Appointments</TabsTrigger>
          </TabsList>

          <TabsContent value="feedback">
            <Card className="rounded-3xl border-border shadow-[var(--shadow-card)]">
              <CardHeader><CardTitle>Latest feedback</CardTitle></CardHeader>
              <CardContent>
                {feedback.length === 0 ? empty("No feedback yet") : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Reviewer</TableHead><TableHead>Rating</TableHead><TableHead>Suggestion</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {feedback.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-bold">{r.reviewer}</TableCell>
                          <TableCell><span className="inline-flex items-center gap-1 font-bold"><Star className="size-4 fill-warning text-warning" /> {r.rating}/5</span></TableCell>
                          <TableCell className="max-w-xl whitespace-normal leading-6">{r.feedback}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(r.createdAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="usage">
            <Card className="rounded-3xl border-border shadow-[var(--shadow-card)]">
              <CardHeader><CardTitle>Member activity & streaks</CardTitle></CardHeader>
              <CardContent>
                {usage.length === 0 ? empty("No members yet") : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Member</TableHead><TableHead>Streak</TableHead><TableHead>Points</TableHead><TableHead>Sessions (7d)</TableHead><TableHead>Total sessions</TableHead><TableHead>Last stretch</TableHead><TableHead>Joined</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {usage.map((u) => (
                        <TableRow key={u.id}>
                          <TableCell className="font-bold">{u.name}</TableCell>
                          <TableCell>{u.streakDays} days</TableCell>
                          <TableCell>{u.points}</TableCell>
                          <TableCell>{u.weekSessions > 0 ? <Badge className="rounded-full">{u.weekSessions}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                          <TableCell>{u.totalSessions}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(u.lastStretchAt, true)}</TableCell>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{fmtDate(u.joinedAt)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bookings">
            <Card className="rounded-3xl border-border shadow-[var(--shadow-card)]">
              <CardHeader><CardTitle>Doctor appointments</CardTitle></CardHeader>
              <CardContent>
                {bookings.length === 0 ? empty("No appointments yet") : (
                  <Table>
                    <TableHeader><TableRow><TableHead>Patient</TableHead><TableHead>Doctor</TableHead><TableHead>Specialty</TableHead><TableHead>Appointment</TableHead><TableHead>Status</TableHead><TableHead>Notes</TableHead></TableRow></TableHeader>
                    <TableBody>
                      {bookings.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-bold">{b.patient}</TableCell>
                          <TableCell>{b.doctor}</TableCell>
                          <TableCell>{b.specialty}</TableCell>
                          <TableCell className="whitespace-nowrap">{fmtDate(b.appointmentTime, true)}</TableCell>
                          <TableCell><Badge variant="secondary" className="rounded-full capitalize">{b.status}</Badge></TableCell>
                          <TableCell className="max-w-xs whitespace-normal text-muted-foreground">{b.notes || "—"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </section>
    </main>
  );
}

function Metric({ title, value, icon }: { title: string; value: string; icon: ReactNode }) {
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
