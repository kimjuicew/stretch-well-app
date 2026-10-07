import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  AlarmClock,
  ArrowRight,
  CalendarCheck,
  CheckCircle2,
  Clock3,
  Flame,
  HeartPulse,
  LogOut,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  TimerReset,
  UserRound,
  Video,
} from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { z } from "zod";

import wellnessImage from "@/assets/unistretch-wellness.jpg";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

const authSchema = z.object({
  username: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be 30 characters or less")
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, or underscores only"),
  password: z.string().min(8, "Password must be at least 8 characters").max(72),
});

const bookingSchema = z.object({
  doctorName: z.string().trim().min(1, "Choose a doctor"),
  specialty: z.string().trim().min(1, "Choose a specialty"),
  appointmentTime: z.string().trim().min(1, "Choose a time"),
  notes: z.string().trim().max(500, "Notes must be 500 characters or less").optional(),
});

const reviewSchema = z.object({
  rating: z.number().int().min(1, "Choose a star rating").max(5),
  feedback: z
    .string()
    .trim()
    .min(5, "Please add at least 5 characters")
    .max(600, "Feedback must be 600 characters or less"),
});

type Profile = Tables<"profiles">;
type Booking = Tables<"doctor_bookings">;
type Review = Tables<"app_reviews">;

type SessionUser = {
  id: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
  };
};

const stretchVideos = [
  {
    title: "Neck reset",
    minutes: "3 min",
    tag: "Neck & shoulder",
    description: "Slow side bends and chin tucks to reduce screen posture tension.",
    accent: "bg-trust/15 text-trust",
  },
  {
    title: "Lower back flow",
    minutes: "5 min",
    tag: "Lumbar care",
    description: "Seated cat-cow, hip hinge, and gentle twists for long sitting blocks.",
    accent: "bg-success/15 text-success",
  },
  {
    title: "Wrist break",
    minutes: "2 min",
    tag: "Keyboard relief",
    description: "Forearm glides and palm stretches for typing-heavy workdays.",
    accent: "bg-event/20 text-event-foreground",
  },
];

const doctors = [
  {
    name: "Dr. Maya Chen",
    specialty: "Physiotherapy",
    next: "Today, 15:30",
    iso: "2026-10-06T15:30:00+07:00",
  },
  {
    name: "Dr. Arin Patel",
    specialty: "Ergonomics consult",
    next: "Tomorrow, 10:00",
    iso: "2026-10-07T10:00:00+07:00",
  },
  {
    name: "Dr. Nicha Wong",
    specialty: "Rehab medicine",
    next: "Fri, 13:00",
    iso: "2026-10-09T13:00:00+07:00",
  },
];

const eventHighlights = ["Posture screening", "Desk setup check", "Mini stretch class"];

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "UniStretch — Office Syndrome Wellness Prototype" },
      {
        name: "description",
        content:
          "UniStretch helps office workers track sitting time, earn stretch streak points, watch guided videos, book online doctors, and review the app.",
      },
      { property: "og:title", content: "UniStretch — Office Syndrome Wellness Prototype" },
      {
        property: "og:description",
        content:
          "A connected prototype for sitting reminders, stretch videos, online doctor booking, health event announcements, streak points, and app feedback.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: UniStretchApp,
});

function UniStretchApp() {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authError, setAuthError] = useState("");
  const [authNotice, setAuthNotice] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [secondsSitting, setSecondsSitting] = useState(42 * 60);
  const [isRunning, setIsRunning] = useState(true);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [selectedDoctor, setSelectedDoctor] = useState<(typeof doctors)[number]>(
    doctors[0] ?? {
      name: "Dr. Maya Chen",
      specialty: "Physiotherapy",
      next: "Today, 15:30",
      iso: "2026-10-06T15:30:00+07:00",
    },
  );
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUser(data.user as SessionUser | null);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || event === "USER_UPDATED" || event === "INITIAL_SESSION") {
        setUser((session?.user as SessionUser | null) ?? null);
        queryClient.invalidateQueries({ queryKey: ["unistretch"] });
      }
      if (event === "SIGNED_OUT") {
        setUser(null);
        queryClient.clear();
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [queryClient]);

  useEffect(() => {
    if (!user) return;
    const defaultName =
      user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email?.split("@")[0] ?? "Member";
    ensureProfile(user.id, defaultName).then(() => {
      queryClient.invalidateQueries({ queryKey: ["unistretch", "profile", user.id] });
    });
  }, [queryClient, user]);

  const profileQuery = useQuery({
    queryKey: ["unistretch", "profile", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const bookingsQuery = useQuery({
    queryKey: ["unistretch", "bookings", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("doctor_bookings")
        .select("*")
        .eq("user_id", user.id)
        .order("appointment_time", { ascending: true })
        .limit(3);
      if (error) throw error;
      return data;
    },
  });

  const reviewsQuery = useQuery({
    queryKey: ["unistretch", "reviews", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("app_reviews")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(2);
      if (error) throw error;
      return data;
    },
  });

  const adminRoleQuery = useQuery({
    queryKey: ["unistretch", "admin-role", user?.id],
    enabled: Boolean(user?.id),
    queryFn: async () => {
      if (!user) return false;
      const { data, error } = await supabase.rpc("has_role", {
        _user_id: user.id,
        _role: "admin",
      });
      if (error) throw error;
      return data;
    },
  });

  const profile = profileQuery.data;
  const reminderMinutes = profile?.reminder_interval_minutes ?? 45;
  const sittingMinutes = Math.floor(secondsSitting / 60);
  const sittingProgress = Math.min(100, (secondsSitting / (reminderMinutes * 60)) * 100);
  const isReminderDue = secondsSitting >= reminderMinutes * 60 && (!snoozedUntil || Date.now() > snoozedUntil);
  const streakPoints = profile?.streak_points ?? 120;
  const currentStreak = profile?.current_streak_days ?? 3;

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => setSecondsSitting((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const completeStretchMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to save streak points.");
      const now = new Date().toISOString();
      const nextPoints = (profile?.streak_points ?? 0) + 10;
      const lastStretch = profile?.last_stretch_at ? new Date(profile.last_stretch_at) : null;
      const today = new Date();
      const isSameDay = lastStretch?.toDateString() === today.toDateString();
      const yesterday = new Date(today);
      yesterday.setDate(today.getDate() - 1);
      const isYesterday = lastStretch?.toDateString() === yesterday.toDateString();
      const nextStreak = isSameDay
        ? profile?.current_streak_days ?? 1
        : isYesterday
          ? (profile?.current_streak_days ?? 0) + 1
          : 1;

      const { error: sessionError } = await supabase.from("stretch_sessions").insert({
        user_id: user.id,
        minutes_sitting: sittingMinutes,
        stretch_type: "guided reset",
        points_awarded: 10,
      });
      if (sessionError) throw sessionError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          streak_points: nextPoints,
          current_streak_days: nextStreak,
          last_stretch_at: now,
        })
        .eq("id", user.id);
      if (profileError) throw profileError;
      return { nextPoints, nextStreak };
    },
    onSuccess: () => {
      setSecondsSitting(0);
      setSnoozedUntil(null);
      queryClient.invalidateQueries({ queryKey: ["unistretch", "profile", user?.id] });
    },
  });

  const updateReminderMutation = useMutation({
    mutationFn: async (minutes: number) => {
      if (!user) throw new Error("Please sign in to save reminder settings.");
      const { error } = await supabase
        .from("profiles")
        .update({ reminder_interval_minutes: minutes })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["unistretch", "profile", user?.id] }),
  });

  const bookingMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to book a doctor.");
      const parsed = bookingSchema.parse({
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        appointmentTime: selectedDoctor.iso,
        notes: bookingNotes,
      });
      const { error } = await supabase.from("doctor_bookings").insert({
        user_id: user.id,
        doctor_name: parsed.doctorName,
        specialty: parsed.specialty,
        appointment_time: parsed.appointmentTime,
        notes: parsed.notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBookingNotes("");
      setBookingMessage("Your online appointment is confirmed.");
      queryClient.invalidateQueries({ queryKey: ["unistretch", "bookings", user?.id] });
    },
    onError: (error) => setBookingMessage(error instanceof Error ? error.message : "Booking failed."),
  });

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to send feedback.");
      const parsed = reviewSchema.parse({ rating: reviewRating, feedback: reviewFeedback });
      const { error } = await supabase.from("app_reviews").insert({
        user_id: user.id,
        rating: parsed.rating,
        feedback: parsed.feedback,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReviewRating(0);
      setReviewFeedback("");
      setReviewError("");
      setReviewMessage("Thanks for helping improve UniStretch.");
      queryClient.invalidateQueries({ queryKey: ["unistretch", "reviews", user?.id] });
    },
    onError: (error) => {
      const message = error instanceof z.ZodError ? error.errors[0]?.message : undefined;
      setReviewError(message ?? (error instanceof Error ? error.message : "Review failed."));
    },
  });

  const formattedTime = useMemo(() => formatDuration(secondsSitting), [secondsSitting]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAuthError("");
    setAuthNotice("");

    try {
      const parsed = authSchema.parse({ username, password });
      const syntheticEmail = `${parsed.username}@app.local`;
      if (authMode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: syntheticEmail,
          password: parsed.password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: parsed.username, username: parsed.username },
          },
        });
        if (error) throw error;
        if (data.user) await ensureProfile(data.user.id, parsed.username, parsed.username);
        setAuthNotice("Account created. You can now use your username to sign in.");
        return;
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: syntheticEmail,
        password: parsed.password,
      });
      if (error) throw error;
      if (data.user) {
        await ensureProfile(data.user.id, parsed.username, parsed.username);
      }
      setIsAuthDialogOpen(false);
    } catch (error) {
      const message = error instanceof z.ZodError ? error.errors[0]?.message : undefined;
      setAuthError(message ?? (error instanceof Error ? error.message : "Authentication failed."));
    }
  }

  async function handleGoogleSignIn() {
    setAuthError("");
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
      extraParams: { prompt: "select_account" },
    });
    if (result.error) setAuthError(String(result.error.message ?? result.error));
  }

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
  }

  function requireSignedIn() {
    if (user) return true;
    setIsAuthDialogOpen(true);
    return false;
  }

  function handleCompleteStretch() {
    if (!requireSignedIn()) return;
    completeStretchMutation.mutate();
  }

  function handleBooking() {
    setBookingMessage("");
    if (!requireSignedIn()) return;
    bookingMutation.mutate();
  }

  function handleReview() {
    setReviewError("");
    setReviewMessage("");
    if (!requireSignedIn()) return;
    reviewMutation.mutate();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background text-foreground">
      <section className="relative border-b border-border bg-[image:var(--gradient-hero)]">
        <div className="absolute inset-x-0 top-0 h-2 bg-[image:var(--gradient-strip)]" />
        <div className="mx-auto grid min-h-[92vh] max-w-7xl gap-8 px-4 pb-10 pt-6 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="flex flex-col justify-between gap-10">
            <header className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex size-11 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
                  <Activity className="size-5" />
                </div>
                <div>
                  <p className="text-xl font-bold">UniStretch</p>
                  <p className="text-xs font-medium uppercase text-muted-foreground">OfficeCheck prototype</p>
                </div>
              </div>
              {user ? (
                <div className="flex items-center gap-2">
                  {adminRoleQuery.data ? (
                    <Button asChild variant="soft" size="sm">
                      <Link to="/admin/feedback">Admin feedback</Link>
                    </Button>
                  ) : null}
                  <Badge variant="secondary" className="hidden gap-1 rounded-full px-3 py-1 sm:inline-flex">
                    <UserRound className="size-3" /> {profile?.display_name ?? user.email}
                  </Badge>
                  <Button variant="ghost" size="sm" onClick={handleSignOut} aria-label="Sign out">
                    <LogOut className="size-4" />
                  </Button>
                </div>
              ) : (
                <Button variant="soft" size="sm" onClick={() => setIsAuthDialogOpen(true)}>
                  Login / Sign up
                </Button>
              )}
            </header>

            <div className="max-w-2xl space-y-7">
              <Badge className="gap-2 rounded-full bg-event text-event-foreground shadow-[var(--shadow-soft)]">
                <Sparkles className="size-3.5" /> Health check up event this Friday
              </Badge>
              <div className="space-y-5">
                <h1 className="max-w-3xl text-5xl font-black leading-[0.95] sm:text-6xl lg:text-7xl">
                  Move before office syndrome moves in.
                </h1>
                <p className="max-w-xl text-lg leading-8 text-muted-foreground">
                  UniStretch tracks long sitting, sends stretch reminders, rewards healthy streaks,
                  and connects office workers with guided videos and online doctors.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="hero" size="xl" onClick={() => setIsAuthDialogOpen(true)}>
                  Start healthy streak <ArrowRight className="size-4" />
                </Button>
                <Button variant="outline" size="xl" onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}>
                  Book online doctor
                </Button>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {eventHighlights.map((item) => (
                <div key={item} className="rounded-2xl border border-border bg-surface/80 p-4 shadow-[var(--shadow-card)] backdrop-blur">
                  <CheckCircle2 className="mb-3 size-5 text-success" />
                  <p className="text-sm font-semibold">{item}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="relative flex items-end">
            <div className="relative w-full overflow-hidden rounded-[2rem] border border-border bg-surface shadow-[var(--shadow-elevated)]">
              <img
                src={wellnessImage}
                alt="Office workers stretching with an online physiotherapist consultation"
                width={1280}
                height={912}
                className="h-[34rem] w-full object-cover"
              />
              <div className="absolute bottom-5 left-5 right-5 rounded-3xl border border-border bg-surface/90 p-5 shadow-[var(--shadow-card)] backdrop-blur-xl">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-muted-foreground">Sitting timer</p>
                    <p className="text-3xl font-black">{formattedTime}</p>
                  </div>
                  <div className="flex size-14 items-center justify-center rounded-2xl bg-warning text-warning-foreground">
                    <AlarmClock className="size-7" />
                  </div>
                </div>
                <Progress value={sittingProgress} className="mt-4 h-3 bg-muted" />
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[1fr_0.75fr] lg:px-8">
        <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Clock3 className="size-6 text-primary" /> Sitting reminder
              </CardTitle>
              <p className="mt-2 text-sm text-muted-foreground">Your prototype alert reacts to the saved reminder interval.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="soft" size="icon" onClick={() => setIsRunning((value) => !value)} aria-label={isRunning ? "Pause timer" : "Start timer"}>
                {isRunning ? <Pause className="size-4" /> : <Play className="size-4" />}
              </Button>
              <Button variant="soft" size="icon" onClick={() => setSecondsSitting(0)} aria-label="Reset timer">
                <RotateCcw className="size-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="rounded-3xl bg-muted p-6 text-center">
              <p className="text-sm font-semibold text-muted-foreground">Current sitting block</p>
              <p className="mt-3 text-6xl font-black tabular-nums">{formattedTime}</p>
              <p className="mt-2 text-sm text-muted-foreground">Target break every {reminderMinutes} minutes</p>
            </div>
            <div className="space-y-4">
              <div className={cn("rounded-3xl border p-5", isReminderDue ? "border-warning bg-warning/15" : "border-border bg-surface-soft")}>
                <div className="flex items-start gap-3">
                  <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", isReminderDue ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground")}>
                    {isReminderDue ? <TimerReset className="size-5" /> : <ShieldCheck className="size-5" />}
                  </div>
                  <div>
                    <p className="font-bold">{isReminderDue ? "Time to stand and stretch" : "You are inside a healthy sitting block"}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {isReminderDue
                        ? "Take a two-minute reset now or snooze once if you are in a meeting."
                        : "UniStretch will nudge you when your sitting block becomes too long."}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="wellness" onClick={handleCompleteStretch} disabled={completeStretchMutation.isPending}>
                    Complete stretch +10 pts
                  </Button>
                  <Button variant="soft" onClick={() => setSnoozedUntil(Date.now() + 5 * 60 * 1000)}>
                    Snooze 5 min
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {[30, 45, 60].map((minutes) => (
                  <Button
                    key={minutes}
                    variant={reminderMinutes === minutes ? "default" : "soft"}
                    onClick={() => (user ? updateReminderMutation.mutate(minutes) : setIsAuthDialogOpen(true))}
                  >
                    {minutes} min
                  </Button>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Flame className="size-6 text-event-foreground" /> Streak motivation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-3xl bg-[image:var(--gradient-points)] p-6 text-primary-foreground shadow-[var(--shadow-soft)]">
              <p className="text-sm font-semibold opacity-90">Total points</p>
              <p className="mt-2 text-5xl font-black">{streakPoints}</p>
              <p className="mt-3 text-sm opacity-90">{currentStreak} day active stretch streak</p>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {["Mon", "Tue", "Wed", "Thu", "Fri"].map((day, index) => (
                <div
                  key={day}
                  className={cn(
                    "rounded-2xl border p-3 text-center text-sm font-bold",
                    index < Math.min(currentStreak, 5) ? "border-success bg-success/15 text-success" : "border-border bg-muted text-muted-foreground",
                  )}
                >
                  {day}
                </div>
              ))}
            </div>
            <p className="text-sm leading-6 text-muted-foreground">
              Every completed guided stretch saves to the database and adds points for motivation.
            </p>
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Guided stretch clips</p>
            <h2 className="mt-2 text-3xl font-black">Quick relief videos</h2>
          </div>
          <Badge variant="outline" className="hidden rounded-full px-3 py-1 sm:inline-flex">
            <Video className="mr-1 size-3" /> Prototype library
          </Badge>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {stretchVideos.map((video) => (
            <Card key={video.title} className="overflow-hidden rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
              <div className="aspect-video bg-[image:var(--gradient-video)] p-5">
                <div className="flex h-full items-center justify-center rounded-3xl border border-border bg-surface/70 backdrop-blur">
                  <div className="flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
                    <Play className="size-7 fill-current" />
                  </div>
                </div>
              </div>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge className={cn("rounded-full", video.accent)}>{video.tag}</Badge>
                  <span className="text-sm font-bold text-muted-foreground">{video.minutes}</span>
                </div>
                <h3 className="text-xl font-black">{video.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{video.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="booking" className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:px-8">
        <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <HeartPulse className="size-6 text-destructive" /> Health check up event
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-3xl bg-event p-5 text-event-foreground">
              <p className="text-sm font-bold uppercase opacity-80">Company wellness announcement</p>
              <h3 className="mt-2 text-3xl font-black">Ergo Day: Posture + Spine Screening</h3>
              <p className="mt-3 leading-7">
                Friday, 09:00–16:00. Join a desk setup check, posture scan, and 10-minute consult for office syndrome risk.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              {eventHighlights.map((item) => (
                <div key={item} className="rounded-2xl bg-muted p-4 text-sm font-semibold">
                  {item}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Stethoscope className="size-6 text-primary" /> Online doctor booking
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              {doctors.map((doctor) => (
                <Button
                  key={doctor.name}
                  type="button"
                  variant="soft"
                  onClick={() => setSelectedDoctor(doctor)}
                  className={cn(
                    "h-auto min-h-32 whitespace-normal rounded-3xl border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                    selectedDoctor.name === doctor.name ? "border-primary bg-primary/10" : "border-border bg-surface-soft hover:bg-muted",
                  )}
                >
                  <span className="block w-full">
                    <span className="block font-black">{doctor.name}</span>
                    <span className="mt-1 block text-sm text-muted-foreground">{doctor.specialty}</span>
                    <span className="mt-3 block text-sm font-bold text-primary">{doctor.next}</span>
                  </span>
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="booking-notes">Notes for the doctor</Label>
              <Textarea
                id="booking-notes"
                value={bookingNotes}
                maxLength={500}
                onChange={(event) => setBookingNotes(event.target.value)}
                placeholder="Example: neck pain after long meetings"
                className="min-h-24 rounded-2xl"
              />
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Button variant="hero" onClick={handleBooking} disabled={bookingMutation.isPending}>
                <CalendarCheck className="size-4" /> Confirm appointment
              </Button>
              {bookingMessage ? <p className="text-sm font-semibold text-primary">{bookingMessage}</p> : null}
            </div>
            <BookingList bookings={bookingsQuery.data ?? []} />
          </CardContent>
        </Card>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-8 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:px-8">
        <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="text-2xl">Profile settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-3xl bg-muted p-5">
              <p className="text-sm font-semibold text-muted-foreground">Signed in as</p>
              <p className="mt-2 text-xl font-black">{user ? profile?.display_name ?? user.email : "Guest prototype"}</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Login to save reminder interval, streak points, bookings, and reviews to the database.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reminder interval</Label>
              <Select
                value={String(reminderMinutes)}
                onValueChange={(value) => (user ? updateReminderMutation.mutate(Number(value)) : setIsAuthDialogOpen(true))}
              >
                <SelectTrigger className="rounded-2xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 minutes</SelectItem>
                  <SelectItem value="45">45 minutes</SelectItem>
                  <SelectItem value="60">60 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Star className="size-6 text-warning" /> Review UniStretch
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex gap-2" aria-label="Choose rating">
              {[1, 2, 3, 4, 5].map((rating) => (
                <Button
                  key={rating}
                  type="button"
                  variant={rating <= reviewRating ? "rating" : "soft"}
                  size="icon"
                  onClick={() => setReviewRating(rating)}
                  aria-label={`${rating} star${rating > 1 ? "s" : ""}`}
                >
                  <Star className={cn("size-5", rating <= reviewRating ? "fill-current" : undefined)} />
                </Button>
              ))}
            </div>
            <div className="space-y-2">
              <Label htmlFor="review-feedback">Suggestions</Label>
              <Textarea
                id="review-feedback"
                value={reviewFeedback}
                maxLength={600}
                onChange={(event) => setReviewFeedback(event.target.value)}
                placeholder="Tell us what would make stretch reminders easier to follow"
                className="min-h-28 rounded-2xl"
              />
              <p className="text-xs text-muted-foreground">Validation: rating is required and feedback needs 5–600 characters.</p>
            </div>
            {reviewError ? <p className="rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{reviewError}</p> : null}
            {reviewMessage ? <p className="rounded-2xl bg-success/10 p-3 text-sm font-semibold text-success">{reviewMessage}</p> : null}
            <Button variant="hero" onClick={handleReview} disabled={reviewMutation.isPending}>
              Submit review
            </Button>
            <ReviewList reviews={reviewsQuery.data ?? []} />
          </CardContent>
        </Card>
      </section>

      <Dialog open={isAuthDialogOpen} onOpenChange={setIsAuthDialogOpen}>
        <DialogContent className="rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle>{authMode === "login" ? "Login to UniStretch" : "Create your UniStretch account"}</DialogTitle>
            <DialogDescription>
              Save streak points, reminder settings, bookings, and app reviews.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleAuthSubmit}>
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoCapitalize="none"
                autoComplete="username"
                value={username}
                maxLength={30}
                onChange={(event) => setUsername(event.target.value.toLowerCase())}
                className="rounded-2xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="rounded-2xl" />
            </div>
            {authError ? <p className="rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{authError}</p> : null}
            {authNotice ? <p className="rounded-2xl bg-success/10 p-3 text-sm font-semibold text-success">{authNotice}</p> : null}
            <Button className="w-full" variant="hero" type="submit">
              {authMode === "login" ? "Login" : "Sign up"}
            </Button>
          </form>
          <p className="text-center text-xs text-muted-foreground">Username accounts cannot use email password reset.</p>
          <Button variant="soft" onClick={handleGoogleSignIn}>
            Continue with Google
          </Button>
          <Button variant="ghost" onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}>
            {authMode === "login" ? "Need an account? Sign up" : "Already have an account? Login"}
          </Button>
        </DialogContent>
      </Dialog>
    </main>
  );
}

async function ensureProfile(userId: string, fallbackName: string, username?: string) {
  const profileInput = username
    ? { id: userId, display_name: fallbackName, username }
    : { id: userId, display_name: fallbackName };
  const { error } = await supabase.from("profiles").upsert(
    profileInput,
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

function BookingList({ bookings }: { bookings: Booking[] }) {
  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">No saved appointments yet.</p>;
  }

  return (
    <div className="space-y-2">
      {bookings.map((booking) => (
        <div key={booking.id} className="flex items-center justify-between gap-3 rounded-2xl bg-muted p-3 text-sm">
          <div>
            <p className="font-bold">{booking.doctor_name}</p>
            <p className="text-muted-foreground">{booking.specialty}</p>
          </div>
          <p className="text-right font-semibold">{new Date(booking.appointment_time).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
        </div>
      ))}
    </div>
  );
}

function ReviewList({ reviews }: { reviews: Review[] }) {
  if (reviews.length === 0) {
    return <p className="text-sm text-muted-foreground">Your latest saved reviews will appear here.</p>;
  }

  return (
    <div className="space-y-2">
      {reviews.map((review) => (
        <div key={review.id} className="rounded-2xl bg-muted p-3">
          <div className="flex gap-1 text-warning">
            {Array.from({ length: review.rating }).map((_, index) => (
              <Star key={index} className="size-4 fill-current" />
            ))}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{review.feedback}</p>
        </div>
      ))}
    </div>
  );
}

function formatDuration(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}
