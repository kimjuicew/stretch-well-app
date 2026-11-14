import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Activity,
  ArrowRight,
  CalendarCheck,
  CalendarDays,
  Clock3,
  Flame,
  Gift,
  Ticket,
  Coffee,
  HeartPulse,
  House,
  LogOut,
  MapPin,
  MessageCircle,
  Pause,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  TimerReset,
  UserRound,
} from "lucide-react";
import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";

import wellnessImage from "@/assets/unistretch-wellness.jpg";
import sportMassagePoster from "@/assets/sport-massage-poster.jpg";
import { StretchStepGuide } from "@/components/stretch-step-guide";
import { FirstLoginTour, type AppTab } from "@/components/first-login-tour";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
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

const REMINDER_OPTIONS = [30, 45, 60];
const HOSPITAL_NAME = "Thammasat Hospital";
const WEEKDAY_HOURS = "Mon–Fri · 09:00–16:00";
const WEEKEND_HOURS = "Sat–Sun · 09:00–16:00";
const APPOINTMENT_SLOTS = ["09:00", "10:00", "11:00", "13:00", "14:00", "15:00", "16:00"];
const BANGKOK_TZ = "Asia/Bangkok";
const INSURANCE_TAG = "[Student insurance]";
const SITTING_TIMER_KEY = "unistretch:sitting-timer:v1";
const APP_PREFERENCES_KEY = "unistretch:app-preferences:v1";
const ACTIVE_BOOKING_STATUSES = new Set(["booked", "confirmed", "pending"]);
const isActiveBookingStatus = (status: string) => ACTIVE_BOOKING_STATUSES.has(status.trim().toLowerCase());

type AppLanguage = "en" | "th";
type ReminderSound = "chime" | "bell" | "aggressive" | "kims-buzzer";

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
    tag: "Neck",
    description: "Slow side bends and chin tucks to reduce screen posture tension.",
    accent: "bg-trust/15 text-trust",
    youtubeId: "2NOsE-VPpkE",
    guideIndex: 0,
  },
  {
    title: "Lower back flow",
    minutes: "5 min",
    tag: "Back",
    description: "Seated cat-cow, hip hinge, and gentle twists for long sitting blocks.",
    accent: "bg-success/15 text-success",
    youtubeId: "0wAw1-1MHa4",
    guideIndex: 1,
  },
  {
    title: "Wrist break",
    minutes: "2 min",
    tag: "Wrist",
    description: "Forearm glides and palm stretches for typing-heavy workdays.",
    accent: "bg-event/20 text-event-foreground",
    youtubeId: "fdD7CgN5FGg",
    guideIndex: 2,
  },
  {
    title: "Desk neck release",
    minutes: "4 min",
    tag: "Neck",
    description: "A gentle neck and shoulder routine for a work or study break.",
    accent: "bg-trust/15 text-trust",
    youtubeId: "FRNtLrMf-1A",
    guideIndex: null,
  },
  {
    title: "Upper back desk reset",
    minutes: "5 min",
    tag: "Back",
    description: "A short guided routine for upper-back tension from desk work.",
    accent: "bg-success/15 text-success",
    youtubeId: "TMDX7hdQKSY",
    guideIndex: null,
  },
  {
    title: "Hip flexor stretch",
    minutes: "7 min",
    tag: "Hip",
    description: "Gentle hip flexor stretches for people who spend long periods sitting.",
    accent: "bg-warning/20 text-warning-foreground",
    youtubeId: "B5eAei_ISG4",
    guideIndex: null,
  },
  {
    title: "Shoulder mobility",
    minutes: "9 min",
    tag: "Shoulder",
    description: "A guided routine for stiff shoulders and rounded desk posture.",
    accent: "bg-event/20 text-event-foreground",
    youtubeId: "8jqmWDjjERM",
    guideIndex: null,
  },
];

const videoFilters = ["All", ...new Set(stretchVideos.map((video) => video.tag))];

const doctors = [
  {
    name: "Dr. Princess Chen",
    specialty: "Physiotherapy",
    availability: WEEKDAY_HOURS,
    initials: "PC",
    photo: "/__l5e/assets-v1/b75e2d91-c5ff-4b84-9079-518c0ffd23b2/doctor-profile-one.jpg",
  },
  {
    name: "Dr. Ryu Patel",
    specialty: "Ergonomics consult",
    availability: WEEKDAY_HOURS,
    initials: "RP",
    photo: "/__l5e/assets-v1/e9cfb4d4-da2b-49bf-8afe-328acd845e56/doctor-profile-two.jpg",
  },
  {
    name: "Dr. Owen Wong",
    specialty: "Rehab medicine",
    availability: WEEKEND_HOURS,
    initials: "OW",
    photo: "/__l5e/assets-v1/488b717b-bd09-4fad-b551-31328d9e6fcf/doctor-profile-three.jpg",
  },
];

const rewardPreviews = [
  { id: "drink", title: "Healthy drink voucher", points: 100, icon: Coffee, description: "A refreshing reward for your next stretch milestone." },
  { id: "wellness", title: "Wellness class pass", points: 250, icon: Ticket, description: "Make time for a guided wellness session." },
  { id: "desk", title: "Desk wellness kit", points: 500, icon: Gift, description: "A little extra care for your everyday workspace." },
  { id: "consult", title: "Wellness consult", points: 750, icon: HeartPulse, description: "Practical guidance for a more comfortable workday." },
  { id: "day-off", title: "Wellness day pass", points: 1000, icon: Sparkles, description: "A full day focused on your wellbeing." },
];

type BookableDay = { key: string; label: string };

function getBookableDays(from: number, weekendsOnly = false, count = 10): BookableDay[] {
  const keyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: BANGKOK_TZ, year: "numeric", month: "2-digit", day: "2-digit" });
  const labelFormat = new Intl.DateTimeFormat("en-GB", { timeZone: BANGKOK_TZ, weekday: "short", day: "numeric", month: "short" });
  const weekdayFormat = new Intl.DateTimeFormat("en-US", { timeZone: BANGKOK_TZ, weekday: "short" });
  const days: BookableDay[] = [];
  for (let offset = 0; days.length < count && offset < 35; offset++) {
    const date = new Date(from + offset * 24 * 60 * 60 * 1000);
    const weekday = weekdayFormat.format(date);
    if (weekendsOnly ? weekday !== "Sat" && weekday !== "Sun" : weekday === "Sat" || weekday === "Sun") continue;
    days.push({ key: keyFormat.format(date), label: labelFormat.format(date).replace(",", "") });
  }
  return days;
}

function parseCalendarDay(dayKey: string | null) {
  if (!dayKey) return undefined;
  const [year, month, day] = dayKey.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  return new Date(year, month - 1, day);
}

function formatCalendarDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

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
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [accountMessage, setAccountMessage] = useState("");
  const [accountError, setAccountError] = useState("");
  const [isAccountSaving, setIsAccountSaving] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [reminderSound, setReminderSound] = useState<ReminderSound>("chime");
  const [language, setLanguage] = useState<AppLanguage>("en");
  const [preferencesHydrated, setPreferencesHydrated] = useState(false);
  const [guestReminderMinutes, setGuestReminderMinutes] = useState(45);
  const [secondsSitting, setSecondsSitting] = useState(0);
  const [isRunning, setIsRunning] = useState(true);
  const [timerHydrated, setTimerHydrated] = useState(false);
  const [isReminderDialogOpen, setIsReminderDialogOpen] = useState(false);
  const [snoozedUntil, setSnoozedUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [streakCelebration, setStreakCelebration] = useState<number | null>(null);
  const lastTimerTickRef = useRef(Date.now());
  const reminderWasActiveRef = useRef(false);
  const [selectedDoctor, setSelectedDoctor] = useState<(typeof doctors)[number]>(
    doctors[0] ?? {
      name: "Dr. Princess Chen",
      specialty: "Physiotherapy",
      availability: WEEKDAY_HOURS,
      initials: "PC",
      photo: "/__l5e/assets-v1/b75e2d91-c5ff-4b84-9079-518c0ffd23b2/doctor-profile-one.jpg",
    },
  );
  const [bookingNotes, setBookingNotes] = useState("");
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookableDays, setBookableDays] = useState<BookableDay[]>([]);
  const [appointmentDay, setAppointmentDay] = useState<string | null>(null);
  const [appointmentSlot, setAppointmentSlot] = useState<string | null>(null);
  const [isAppointmentCalendarOpen, setIsAppointmentCalendarOpen] = useState(false);
  const [useStudentInsurance, setUseStudentInsurance] = useState(true);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [reviewError, setReviewError] = useState("");
  const [reviewMessage, setReviewMessage] = useState("");
  const [isAuthDialogOpen, setIsAuthDialogOpen] = useState(false);
  const [selectedReward, setSelectedReward] = useState<(typeof rewardPreviews)[number] | null>(null);
  const [isRewardCatalogOpen, setIsRewardCatalogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<AppTab>("home");
  const [videoFilter, setVideoFilter] = useState("All");
  const [guideDetailIndex, setGuideDetailIndex] = useState<number | null>(null);
  const [exercise, setExercise] = useState<{ videoIndex: number; startedAt: number } | null>(null);
  const [tourReplayToken, setTourReplayToken] = useState(0);

  const openTab = useCallback((id: AppTab, targetId: string = id) => {
    setActiveTab(id);
    window.setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 0);
  }, []);

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
    try {
      const saved = window.localStorage.getItem(APP_PREFERENCES_KEY);
      if (saved) {
        const preferences = JSON.parse(saved) as { soundEnabled?: unknown; reminderSound?: unknown; language?: unknown };
        if (typeof preferences.soundEnabled === "boolean") setSoundEnabled(preferences.soundEnabled);
        if (["chime", "bell", "aggressive", "kims-buzzer"].includes(String(preferences.reminderSound))) {
          setReminderSound(preferences.reminderSound as ReminderSound);
        }
        if (preferences.language === "en" || preferences.language === "th") setLanguage(preferences.language);
      }
    } catch { /* Ignore invalid browser storage. */ }
    setPreferencesHydrated(true);
    try {
      const savedTimer = window.localStorage.getItem(SITTING_TIMER_KEY);
      if (savedTimer) {
        const timer = JSON.parse(savedTimer) as { seconds?: number; running?: boolean; updatedAt?: number };
        const elapsed = timer.running && typeof timer.updatedAt === "number" ? Math.max(0, Math.floor((Date.now() - timer.updatedAt) / 1000)) : 0;
        lastTimerTickRef.current = Date.now();
        if (typeof timer.seconds === "number") setSecondsSitting(Math.max(0, timer.seconds + elapsed));
        if (typeof timer.running === "boolean") setIsRunning(timer.running);
      }
    } catch { /* Ignore invalid browser storage. */ }
    setTimerHydrated(true);
  }, []);

  useEffect(() => {
    if (!preferencesHydrated) return;
    try {
      window.localStorage.setItem(APP_PREFERENCES_KEY, JSON.stringify({ soundEnabled, reminderSound, language }));
    } catch { /* Preferences remain available for this session. */ }
    document.documentElement.lang = language;
  }, [preferencesHydrated, soundEnabled, reminderSound, language]);

  useEffect(() => {
    if (!timerHydrated) return;
    try {
      window.localStorage.setItem(SITTING_TIMER_KEY, JSON.stringify({ seconds: secondsSitting, running: isRunning, updatedAt: Date.now() }));
    } catch { /* Timer remains available for this session. */ }
  }, [timerHydrated, secondsSitting, isRunning]);

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
        .order("appointment_time", { ascending: true });
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
  const isThai = language === "th";
  const reminderMinutes = profile?.reminder_interval_minutes ?? guestReminderMinutes;
  const sittingMinutes = Math.floor(secondsSitting / 60);
  const isReminderDue = secondsSitting >= reminderMinutes * 60 && (!snoozedUntil || Date.now() > snoozedUntil);
  const activeExercise = exercise ? stretchVideos[exercise.videoIndex] : null;
  const exerciseRequiredSeconds = activeExercise ? Number.parseInt(activeExercise.minutes, 10) * 60 : 0;
  const exerciseElapsedSeconds = exercise ? Math.floor((now - exercise.startedAt) / 1000) : 0;
  const exerciseRemainingSeconds = Math.max(0, exerciseRequiredSeconds - exerciseElapsedSeconds);
  const exerciseDone = exerciseRequiredSeconds > 0 && exerciseRemainingSeconds === 0;
  const streakPoints = profile?.streak_points ?? (user ? 0 : 120);
  const currentStreak = profile?.current_streak_days ?? (user ? 0 : 3);

  useEffect(() => {
    if (!timerHydrated || !isRunning) return;
    lastTimerTickRef.current = Date.now();
    const timer = window.setInterval(() => {
      const tickAt = Date.now();
      const elapsed = Math.max(1, Math.floor((tickAt - lastTimerTickRef.current) / 1000));
      lastTimerTickRef.current = tickAt;
      setSecondsSitting((value) => value + elapsed);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning, timerHydrated]);

  useEffect(() => {
    if (!exercise) return;
    const tick = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(tick);
  }, [exercise]);

  useEffect(() => {
    const reminderActive = isReminderDue && !exercise;
    if (reminderActive) {
      setIsReminderDialogOpen(true);
      if (!reminderWasActiveRef.current && soundEnabled) playReminderSound(reminderSound);
    }
    reminderWasActiveRef.current = reminderActive;
  }, [isReminderDue, exercise, soundEnabled, reminderSound]);

  useEffect(() => {
    if (activeTab === "booking") setBookableDays(getBookableDays(Date.now(), selectedDoctor.name === "Dr. Owen Wong"));
  }, [activeTab, selectedDoctor.name]);

  useEffect(() => {
    setDisplayNameDraft(profile?.display_name ?? user?.user_metadata?.full_name ?? user?.user_metadata?.name ?? "");
  }, [profile?.display_name, user?.id, user?.user_metadata?.full_name, user?.user_metadata?.name]);

  const activeDay = appointmentDay && bookableDays.some((day) => day.key === appointmentDay)
    ? appointmentDay
    : bookableDays[0]?.key ?? null;
  const slotOptions = activeDay ? APPOINTMENT_SLOTS.map((time) => {
    const iso = `${activeDay}T${time}:00+07:00`;
    const startsAt = new Date(iso).getTime();
    const isPast = startsAt < Date.now() + 30 * 60 * 1000;
    const isTaken = (bookingsQuery.data ?? []).some((booking) =>
      isActiveBookingStatus(booking.status) && booking.doctor_name === selectedDoctor.name &&
      new Date(booking.appointment_time).getTime() === startsAt,
    );
    return { time, iso, isPast, isTaken };
  }) : [];
  const selectedSlotIso = slotOptions.find((slot) => slot.time === appointmentSlot && !slot.isPast && !slot.isTaken)?.iso ?? null;
  const filteredStretchVideos = stretchVideos.map((video, index) => ({ video, index }))
    .filter(({ video }) => videoFilter === "All" || video.tag === videoFilter);
  const guideDetailVideo = guideDetailIndex === null ? null : stretchVideos[guideDetailIndex] ?? null;

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
    onSuccess: (result) => {
      setSecondsSitting(0);
      setSnoozedUntil(null);
      setExercise(null);
      setIsReminderDialogOpen(false);
      setStreakCelebration(result.nextStreak);
      window.setTimeout(() => setStreakCelebration(null), 2600);
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
      if (!selectedSlotIso) throw new Error("Choose an available date and time.");
      const parsed = bookingSchema.parse({
        doctorName: selectedDoctor.name,
        specialty: selectedDoctor.specialty,
        appointmentTime: selectedSlotIso,
        notes: bookingNotes,
      });
      const notes = [useStudentInsurance ? INSURANCE_TAG : "", parsed.notes ?? ""].filter(Boolean).join(" ");
      const { error } = await supabase.from("doctor_bookings").insert({
        user_id: user.id,
        doctor_name: parsed.doctorName,
        specialty: parsed.specialty,
        appointment_time: parsed.appointmentTime,
        notes: notes || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setBookingNotes("");
      setAppointmentSlot(null);
      setBookingMessage("");
      queryClient.invalidateQueries({ queryKey: ["unistretch", "bookings", user?.id] });
      openTab("booking", "my-appointments");
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
    setIsReminderDialogOpen(false);
    const startedAt = Date.now();
    setNow(startedAt);
    setExercise({ videoIndex: 0, startedAt });
    openTab("stretch", "exercise");
  }

  function handleFinishExercise() {
    if (!exercise || !exerciseDone) return;
    if (user) {
      completeStretchMutation.mutate();
    } else {
      setIsAuthDialogOpen(true);
    }
  }

  function handleBooking() {
    setBookingMessage("");
    if (!requireSignedIn()) return;
    bookingMutation.mutate();
  }

  async function handleSaveDisplayName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!user) return;
    setAccountError("");
    setAccountMessage("");
    setIsAccountSaving(true);
    const displayName = displayNameDraft.trim();
    if (!displayName) {
      setAccountError(isThai ? "กรุณาระบุชื่อที่แสดง" : "Display name cannot be empty.");
      setIsAccountSaving(false);
      return;
    }
    const { error } = await supabase.from("profiles").update({ display_name: displayName }).eq("id", user.id);
    if (error) setAccountError(error.message);
    else {
      setAccountMessage(isThai ? "บันทึกชื่อแล้ว" : "Display name saved.");
      queryClient.invalidateQueries({ queryKey: ["unistretch", "profile", user.id] });
    }
    setIsAccountSaving(false);
  }

  async function handleChangePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccountError("");
    setAccountMessage("");
    if (newPassword.length < 8) {
      setAccountError(isThai ? "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร" : "Password must be at least 8 characters.");
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setAccountError(isThai ? "รหัสผ่านไม่ตรงกัน" : "Passwords do not match.");
      return;
    }
    setIsAccountSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setIsAccountSaving(false);
    if (error) setAccountError(error.message);
    else {
      setNewPassword("");
      setConfirmNewPassword("");
      setAccountMessage(isThai ? "เปลี่ยนรหัสผ่านแล้ว" : "Password updated.");
    }
  }

  function handleReview() {
    setReviewError("");
    setReviewMessage("");
    if (!requireSignedIn()) return;
    reviewMutation.mutate();
  }

  return (
    <main className="min-h-screen overflow-hidden bg-background pb-28 text-foreground">
      <section id="home" className={cn("relative scroll-mt-4 border-b border-border bg-[image:var(--gradient-hero)]", activeTab !== "home" && "hidden")}>
        <div className="absolute inset-x-0 top-0 h-2 bg-[image:var(--gradient-strip)]" />
        <div className={cn("mx-auto grid max-w-7xl gap-8 px-4 pt-5 sm:px-6 lg:px-8 lg:pt-6", user ? "pb-5" : "min-h-[80vh] pb-10 lg:grid-cols-[1.05fr_0.95fr]")}>
          <div className="flex flex-col justify-between gap-7 lg:gap-10">
            <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border border-surface/70 bg-surface/70 p-2.5 shadow-[var(--shadow-card)] backdrop-blur-xl sm:p-3 lg:border-transparent lg:bg-transparent lg:p-0 lg:shadow-none">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-[var(--shadow-soft)]">
                  <Activity className="size-5" />
                </div>
                <div className="min-w-0">
                  <p className="truncate text-lg font-extrabold sm:text-xl">UniStretch</p>
                  <p className="truncate text-[10px] font-bold uppercase text-muted-foreground sm:text-xs">OfficeCheck prototype</p>
                </div>
              </div>
              {user ? (
                <div className="flex shrink-0 items-center gap-1 sm:gap-2">
                  {adminRoleQuery.data ? (
                    <Button asChild variant="soft" size="sm">
                      <Link to="/admin/feedback">Admin feedback</Link>
                    </Button>
                  ) : null}
                  <Badge variant="secondary" className="hidden gap-1 rounded-full px-3 py-1 md:inline-flex">
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

            {!user && (
            <div className="max-w-2xl space-y-5 sm:space-y-7">
              <div className="space-y-4 sm:space-y-5">
                <h1 className="max-w-3xl text-4xl font-black leading-[1.06] sm:text-6xl lg:text-7xl lg:leading-[0.95]">
                  Move before office syndrome <span className="text-primary">moves in.</span>
                </h1>
                <p className="max-w-xl text-[15px] font-medium leading-7 text-muted-foreground sm:text-lg sm:leading-8">
                  UniStretch tracks long sitting, sends stretch reminders, rewards healthy streaks,
                  and connects office workers with guided videos and online doctors.
                </p>
              </div>
              <div className="grid gap-3 sm:flex sm:flex-row">
                <Button className="h-14 rounded-2xl text-base" variant="hero" size="xl" onClick={() => (user ? openTab("home", "timer") : setIsAuthDialogOpen(true))}>
                  Start healthy streak <ArrowRight className="size-4" />
                </Button>
                <Button className="h-12 rounded-2xl bg-surface/60 backdrop-blur" variant="outline" size="xl" onClick={() => openTab("booking")}>
                  Book online doctor
                </Button>
              </div>

            </div>
            )}
          </div>

          {!user && <div className="relative hidden items-end lg:flex">
            <div className="relative w-full overflow-hidden rounded-[2rem] border border-border bg-surface shadow-[var(--shadow-elevated)]">
              <img
                src={wellnessImage}
                alt="Office workers stretching with an online physiotherapist consultation"
                width={1280}
                height={912}
                className="h-[34rem] w-full object-cover"
              />

            </div>
          </div>}
        </div>
      </section>

      {user && (
        <section id="user-dashboard" className={cn("mx-auto max-w-7xl px-4 pt-6 sm:px-6 lg:px-8", activeTab !== "home" && "hidden")}>
          <div className="mb-5 flex items-center gap-3">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary"><UserRound className="size-6" /></div>
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-black">{profile?.display_name ?? user.email?.split("@")[0] ?? "Member"}</h1>
            </div>
          </div>
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {[
              { label: "Stretch points", value: profile?.streak_points ?? 0, icon: Sparkles },
              { label: "Day streak", value: profile?.current_streak_days ?? 0, icon: Flame },
              { label: "Upcoming appointments", value: (bookingsQuery.data ?? []).filter((booking) => isActiveBookingStatus(booking.status) && new Date(booking.appointment_time).getTime() > now).length, icon: CalendarCheck },
              { label: "Last stretch", value: profile?.last_stretch_at ? new Date(profile.last_stretch_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "Not yet", icon: Activity },
            ].map(({ label, value, icon: Icon }) => (
              <div key={label} className="rounded-2xl border border-border bg-surface/80 p-4 shadow-[var(--shadow-card)] backdrop-blur-xl">
                <Icon className="mb-3 size-5 text-primary" />
                <dd className="text-2xl font-black tabular-nums">{value}</dd>
                <dt className="mt-1 text-sm font-medium text-muted-foreground">{label}</dt>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className={cn("mx-auto flex max-w-7xl scroll-mt-20 gap-2 overflow-x-auto px-4 pt-5 sm:px-6 lg:px-8", activeTab !== "home" && "hidden")} aria-label="Home sections">
        {[{ id: "timer", label: "Timer" }, { id: "streak", label: "Streak" }, { id: "rewards", label: "Rewards" }, { id: "health-event", label: "Event" }].map(({ id, label }) => <Button key={id} size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{label}</Button>)}
      </div>
      <section id="timer" className={cn("mx-auto max-w-7xl scroll-mt-20 px-4 py-8 sm:px-6 lg:px-8", activeTab !== "home" && "hidden")}>
        <div className="grid gap-6 lg:grid-cols-[1fr_0.75fr]">
        <Card className="rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Clock3 className="size-6 text-primary" /> Sitting reminder
              </CardTitle>
            </div>
            <div className="flex gap-2">
              <Button variant="soft" size="sm" className="h-11 w-28 justify-center rounded-2xl" onClick={() => setIsRunning((value) => !value)} aria-label={isRunning ? "Pause timer" : "Start timer"}>
                {isRunning ? <><Pause className="size-4" /> Pause</> : <><Play className="size-4" /> Start</>}
              </Button>
              <Button variant="soft" size="sm" className="h-11 w-28 justify-center rounded-2xl" onClick={() => { setSecondsSitting(0); setSnoozedUntil(null); setIsReminderDialogOpen(false); }} aria-label="Reset timer">
                <RotateCcw className="size-4" /> Reset
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
              <div className={cn("rounded-3xl border p-5", isReminderDue ? "border-warning bg-warning text-warning-foreground" : "border-border bg-surface-soft")}>
                <div className="flex items-start gap-3">
                  <div className={cn("flex size-11 shrink-0 items-center justify-center rounded-2xl", isReminderDue ? "bg-warning text-warning-foreground" : "bg-success text-success-foreground")}>
                    {isReminderDue ? <TimerReset className="size-5" /> : <ShieldCheck className="size-5" />}
                  </div>
                  <div>
                    <p className="font-bold">{isReminderDue ? "Time to stand and stretch" : "You are inside a healthy sitting block"}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {isReminderDue
                        ? "Take a short stretch break now."
                        : "UniStretch will nudge you when your sitting block becomes too long."}
                    </p>
                  </div>
                </div>
                {isReminderDue ? <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="wellness" onClick={handleCompleteStretch}>Start stretch <ArrowRight className="size-4" /></Button>
                  <Button variant="soft" onClick={() => { setSnoozedUntil(Date.now() + 5 * 60 * 1000); setIsReminderDialogOpen(false); }}>Snooze 5 min</Button>
                </div> : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card id="streak" className="scroll-mt-20 rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl">
              <Flame className="size-6 text-event-foreground" /> Your movement
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex min-h-52 flex-col items-start rounded-3xl bg-[image:var(--gradient-points)] p-5 text-primary-foreground shadow-[var(--shadow-soft)]">
                <p className="text-sm font-semibold opacity-90">Points collected</p>
                <p className="mt-2 text-5xl font-black">{streakPoints}</p>
                <p className="mt-1 text-sm opacity-90">Ready for future rewards</p>
                <Button variant="ghost" size="sm" className="mt-auto px-2 text-primary-foreground" onClick={() => openTab("stretch")}>Start a stretch <ArrowRight className="size-4" /></Button>
              </div>
              <div className="relative flex min-h-52 flex-col justify-center overflow-hidden rounded-3xl border border-warning/50 bg-gradient-to-br from-amber-100 via-yellow-200 to-orange-300 p-5 text-amber-950 dark:from-amber-950 dark:via-yellow-900 dark:to-orange-950 dark:text-amber-50">
                <div className="pointer-events-none absolute -right-5 -top-7 size-40 rounded-full bg-red-500/20 blur-2xl" />
                <p className="relative text-sm font-semibold">Current rhythm</p>
                <p className="relative mt-2 flex items-center gap-2 text-4xl font-black"><Flame className="streak-flame size-9 fill-orange-400 text-red-600 dark:text-orange-300" /> {currentStreak} <span className="text-xl">days</span></p>
                <p className="relative mt-2 text-sm">Complete a stretch to keep it going.</p>
                <div className="streak-meter relative mt-4 h-3 overflow-hidden rounded-full bg-red-950/15"><div className="streak-meter-fill h-full rounded-full" style={{ width: `${Math.min(100, Math.max(12, currentStreak * 12))}%` }} /></div>
              </div>
            </div>
            <div id="rewards" className="scroll-mt-20 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-bold"><Gift className="size-4 text-primary" /> Rewards to look forward to</h3>
                <Button variant="ghost" size="sm" className="px-2 text-primary" onClick={() => setIsRewardCatalogOpen(true)}>More rewards</Button>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                {rewardPreviews.slice(0, 3).map((reward) => {
                  const Icon = reward.icon;
                  return <button key={reward.id} type="button" onClick={() => setSelectedReward(reward)} className="flex items-center gap-3 rounded-2xl border border-border bg-surface-soft p-3 text-left transition hover:border-primary/40">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground"><Icon className="size-5" /></span>
                    <span className="min-w-0"><span className="block font-bold">{reward.title}</span><span className="text-sm text-primary">{reward.points} points</span></span>
                    <ArrowRight className="size-4 shrink-0" />
                  </button>;
                })}
              </div>
            </div>
          </CardContent>
        </Card>
        </div>
      </section>

      <section id="health-event" className={cn("mx-auto max-w-7xl px-4 pb-8 sm:px-6 lg:px-8", activeTab !== "home" && "hidden")}>
        <Card className="overflow-hidden rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="flex items-center gap-2 text-2xl"><HeartPulse className="size-6 text-primary" /> Campus wellness event</CardTitle></CardHeader>
          <CardContent className="grid gap-5 md:grid-cols-2 md:items-center">
            <img src={sportMassagePoster} alt="Sport Massage by AHS Nuadnaja event poster" className="w-full rounded-2xl object-cover" />
            <div className="space-y-4">
              <div>
                <p className="text-sm font-bold uppercase text-primary">Campus announcement</p>
                <h3 className="mt-2 text-2xl font-black">Sport Massage by AHS Nuadnaja</h3>
              </div>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div className="rounded-2xl bg-surface-soft p-3"><dt className="font-bold text-muted-foreground">When</dt><dd className="mt-1">28 October 2026 · 09:00–11:45</dd></div>
                <div className="rounded-2xl bg-surface-soft p-3"><dt className="font-bold text-muted-foreground">Who</dt><dd className="mt-1">University students and staff</dd></div>
                <div className="rounded-2xl bg-surface-soft p-3 sm:col-span-2"><dt className="font-bold text-muted-foreground">Where</dt><dd className="mt-1">Main Stadium, Thammasat University · Room MS112, Main Stadium Building</dd></div>
                <div className="rounded-2xl bg-surface-soft p-3 sm:col-span-2"><dt className="font-bold text-muted-foreground">What</dt><dd className="mt-1">Relaxing massage for the arms, legs, neck, shoulders, and back.</dd></div>
              </dl>
              <Button asChild variant="wellness" className="w-full sm:w-auto">
                <a href="https://docs.google.com/forms/d/e/1FAIpQLSfng49J5x2Dj4u-1eDPEpWgI0IeZwMKTmFUxypjD_Eg75BAyQ/viewform" target="_blank" rel="noreferrer">Register <ArrowRight className="size-4" /></a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section id="stretch" className={cn("mx-auto min-h-[calc(100vh-6rem)] max-w-7xl scroll-mt-20 px-4 py-6 sm:px-6 md:py-8 lg:px-8", activeTab !== "stretch" && "hidden")}>
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-bold uppercase text-primary">Guided stretch clips</p>
            <h2 className="mt-2 text-3xl font-black">Quick relief videos</h2>
          </div>
        </div>
        {exercise && activeExercise ? (
          <Card id="exercise" className="mb-6 scroll-mt-24 rounded-3xl border-primary/40 bg-primary/5 shadow-[var(--shadow-card)]">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Activity className="size-6 text-primary" /> Exercise in progress
              </CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Follow {activeExercise.title} ({activeExercise.minutes}) to the end — +10 pts unlock when the exercise timer finishes.
              </p>
            </CardHeader>
            <CardContent className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
              <div className="aspect-video overflow-hidden rounded-2xl bg-muted">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${activeExercise.youtubeId}?autoplay=1&rel=0`}
                  title={`${activeExercise.title} guided stretch exercise`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <div className="flex flex-col justify-center gap-4 rounded-2xl bg-muted p-5">
                <div>
                  <p className="text-sm font-semibold text-muted-foreground">Exercise timer</p>
                  <p className="mt-1 text-4xl font-black tabular-nums">{formatDuration(exerciseRemainingSeconds)}</p>
                  <p className="mt-1 text-sm text-muted-foreground">remaining</p>
                </div>
                <Progress value={Math.min(100, (exerciseElapsedSeconds / exerciseRequiredSeconds) * 100)} className="h-2.5 bg-background" />
                <Button variant="hero" onClick={handleFinishExercise} disabled={!exerciseDone || completeStretchMutation.isPending}>
                  {completeStretchMutation.isPending
                    ? "Saving points..."
                    : exerciseDone
                      ? "Finish — earn +10 pts"
                      : `Finish in ${formatDuration(exerciseRemainingSeconds)}`}
                </Button>
                <Button variant="ghost" onClick={() => setExercise(null)}>
                  Cancel exercise
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}
        <div className="mb-5 flex flex-wrap gap-2" role="group" aria-label="Filter stretches by body area">
          {videoFilters.map((filter) => <Button key={filter} size="sm" variant={videoFilter === filter ? "wellness" : "outline"} aria-pressed={videoFilter === filter} onClick={() => setVideoFilter(filter)}>{filter}</Button>)}
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {filteredStretchVideos.map(({ video, index }) => (
            <Card key={video.title} className="overflow-hidden rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
              <div className="aspect-video overflow-hidden bg-muted">
                <iframe
                  className="h-full w-full"
                  src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
                  title={`${video.title} guided stretch video`}
                  loading="lazy"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
              <CardContent className="space-y-3 p-5">
                <div className="flex items-center justify-between gap-2">
                  <Badge className={cn("rounded-full", video.accent)}>{video.tag}</Badge>
                  <span className="text-sm font-bold text-muted-foreground">{video.minutes}</span>
                </div>
                <h3 className="text-xl font-black">{video.title}</h3>
                <p className="text-sm leading-6 text-muted-foreground">{video.description}</p>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => setGuideDetailIndex(index)}>Details</Button>
                  <Button variant={exercise?.videoIndex === index ? "soft" : "wellness"} onClick={() => {
                    const startedAt = Date.now();
                    setNow(startedAt);
                    setIsReminderDialogOpen(false);
                    setExercise({ videoIndex: index, startedAt });
                    openTab("stretch", "exercise");
                  }}>{exercise?.videoIndex === index ? "Restart exercise" : "Do this exercise"}</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Dialog open={guideDetailIndex !== null} onOpenChange={(open) => { if (!open) setGuideDetailIndex(null); }}>
        <DialogContent className="max-h-[90vh] overflow-y-auto rounded-3xl border-border bg-card sm:max-w-4xl">
          <DialogHeader>
            <DialogTitle>{guideDetailVideo?.title ?? "Stretch details"}</DialogTitle>
            <DialogDescription>{guideDetailVideo?.description}</DialogDescription>
          </DialogHeader>
          {guideDetailVideo ? <div className="space-y-5">
            <div className="aspect-video overflow-hidden rounded-2xl bg-muted">
              <iframe className="h-full w-full" src={`https://www.youtube-nocookie.com/embed/${guideDetailVideo.youtubeId}`} title={`${guideDetailVideo.title} video`} loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen />
            </div>
            {guideDetailVideo.guideIndex !== null ? <StretchStepGuide key={guideDetailVideo.guideIndex} initialIndex={guideDetailVideo.guideIndex} showSelector={false} /> : <p className="rounded-2xl bg-muted p-4 text-sm text-muted-foreground">Follow the video at a comfortable pace. Stop if you feel pain or dizziness.</p>}
            <Button variant="wellness" onClick={() => {
              const startedAt = Date.now();
              setNow(startedAt);
              setIsReminderDialogOpen(false);
              setExercise({ videoIndex: guideDetailIndex!, startedAt });
              setGuideDetailIndex(null);
              openTab("stretch", "exercise");
            }}>Do this exercise <ArrowRight className="size-4" /></Button>
          </div> : null}
        </DialogContent>
      </Dialog>

      <div className={cn("mx-auto flex max-w-7xl scroll-mt-20 gap-2 overflow-x-auto px-4 pt-5 sm:px-6 lg:px-8", activeTab !== "booking" && "hidden")} aria-label="Doctor sections">
        {[{ id: "doctor-list", label: "Doctors" }, { id: "book-appointment", label: "Book" }, { id: "my-appointments", label: "My appointments" }].map(({ id, label }) => <Button key={id} size="sm" variant="outline" className="shrink-0 rounded-full" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{label}</Button>)}
      </div>
      <section id="booking" className={cn("mx-auto min-h-[calc(100vh-6rem)] max-w-7xl scroll-mt-20 px-4 py-6 sm:px-6 md:py-8 lg:px-8", activeTab !== "booking" && "hidden")}>
        <div className="grid gap-6">
        <Card id="doctor-list" className="scroll-mt-20 rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl"><Stethoscope className="size-6 text-primary" /> Our doctors</CardTitle>
            <p className="text-sm text-muted-foreground">Choose a doctor to book an in-person appointment at {HOSPITAL_NAME}.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 md:grid-cols-3">
              {doctors.map((doctor) => {
                const selected = selectedDoctor.name === doctor.name;
                return <div key={doctor.name} className={cn("rounded-3xl border p-4 transition", selected ? "border-primary bg-primary/10" : "border-border bg-surface-soft")}>
                  <div className="flex items-center gap-3">
                    <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary text-lg font-black text-primary-foreground">{doctor.initials}<img src={doctor.photo} alt="" className="absolute inset-0 size-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div>
                    <div className="min-w-0"><p className="font-black">{doctor.name}</p><p className="text-sm text-muted-foreground">{doctor.specialty}</p><p className="mt-1 text-xs font-bold text-primary">{doctor.availability}</p></div>
                  </div>
                  <Button type="button" variant={selected ? "wellness" : "outline"} className="mt-4 w-full" onClick={() => { setSelectedDoctor(doctor); setAppointmentDay(null); setAppointmentSlot(null); }}><CalendarCheck className="size-4" /> Book appointment</Button>
                </div>;
              })}
            </div>
          </CardContent>
        </Card>

        <Card id="book-appointment" className="scroll-mt-20 rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-2xl"><CalendarCheck className="size-6 text-primary" /> Book an appointment</CardTitle>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="size-4" /> See a doctor in person at {HOSPITAL_NAME}.</p>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="flex items-center gap-3 rounded-2xl bg-muted p-3">
              <div className="relative flex size-12 items-center justify-center overflow-hidden rounded-full bg-primary font-black text-primary-foreground">{selectedDoctor.initials}<img src={selectedDoctor.photo} alt="" className="absolute inset-0 size-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /></div>
              <div><p className="font-black">{selectedDoctor.name}</p><p className="text-sm text-muted-foreground">{selectedDoctor.specialty} · {selectedDoctor.availability}</p></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>1. Choose a date</Label>
                <Popover open={isAppointmentCalendarOpen} onOpenChange={setIsAppointmentCalendarOpen}>
                  <PopoverTrigger asChild><Button type="button" variant="soft" className="w-full justify-between rounded-2xl">{bookableDays.find((day) => day.key === activeDay)?.label ?? "Choose a date"}<CalendarDays className="size-4" /></Button></PopoverTrigger>
                  <PopoverContent align="start" className="w-auto rounded-2xl p-2"><Calendar mode="single" selected={parseCalendarDay(activeDay)} defaultMonth={parseCalendarDay(activeDay) ?? new Date()} onSelect={(date) => { if (!date) return; setAppointmentDay(formatCalendarDay(date)); setAppointmentSlot(null); setIsAppointmentCalendarOpen(false); }} disabled={(date) => !bookableDays.some((day) => day.key === formatCalendarDay(date))} autoFocus /></PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>2. Choose a time</Label>
                <Select value={appointmentSlot ?? ""} onValueChange={setAppointmentSlot}>
                  <SelectTrigger className="w-full rounded-2xl"><SelectValue placeholder="Choose an available time" /></SelectTrigger>
                  <SelectContent>{slotOptions.map((slot) => <SelectItem key={slot.time} value={slot.time} disabled={slot.isPast || slot.isTaken}>{slot.time}{slot.isTaken ? " · Booked" : slot.isPast ? " · Passed" : ""}</SelectItem>)}</SelectContent>
                </Select>
                {slotOptions.length > 0 && slotOptions.every((slot) => slot.isPast || slot.isTaken) ? <p className="text-xs text-muted-foreground">No times left. Choose another date.</p> : null}
              </div>
            </div>
            <label className="flex cursor-pointer items-start gap-2 px-1 py-2 text-muted-foreground">
              <input type="checkbox" checked={useStudentInsurance} onChange={(event) => setUseStudentInsurance(event.target.checked)} className="mt-0.5 size-4 accent-primary" />
              <span><span className="flex items-center gap-1.5 text-sm font-medium text-foreground"><ShieldCheck className="size-3.5" /> Use student insurance</span><span className="block text-xs">See a doctor at {HOSPITAL_NAME} with your university student insurance.</span></span>
            </label>
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
            {selectedSlotIso ? <p className="rounded-2xl bg-muted p-3 text-sm font-semibold">{formatAppointment(selectedSlotIso)} · {selectedDoctor.name} · {HOSPITAL_NAME}</p> : null}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <Button variant="hero" onClick={handleBooking} disabled={bookingMutation.isPending || !selectedSlotIso}><CalendarCheck className="size-4" /> {bookingMutation.isPending ? "Booking…" : "Confirm appointment"}</Button>
              {bookingMessage ? <p role="alert" className="text-sm font-semibold text-destructive">{bookingMessage}</p> : null}
            </div>
          </CardContent>
        </Card>

        <Card id="my-appointments" className="scroll-mt-20 rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-2xl">My appointments</CardTitle></CardHeader>
          <CardContent><BookingList bookings={bookingsQuery.data ?? []} /></CardContent>
        </Card>
        </div>
      </section>

      <section id="profile" className={cn("mx-auto min-h-[calc(100vh-6rem)] max-w-7xl scroll-mt-20 px-4 py-6 sm:px-6 md:py-8 lg:px-8", activeTab !== "profile" && "hidden")}>
        <div className="mb-5 flex flex-wrap gap-2" aria-label="Profile sections">
          {[{ id: "profile-settings", label: isThai ? "บัญชี" : "Account" }, { id: "app-preferences", label: isThai ? "การตั้งค่า" : "Preferences" }, { id: "profile-help", label: isThai ? "ช่วยเหลือ" : "Help" }, { id: "review", label: isThai ? "รีวิว" : "Review" }].map(({ id, label }) => <Button key={id} size="sm" variant="soft" onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" })}>{label}</Button>)}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
        <Card id="profile-settings" className="scroll-mt-20 rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-2xl">{isThai ? "การตั้งค่าบัญชี" : "Account settings"}</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-3xl bg-muted p-5">
              <p className="text-sm font-semibold text-muted-foreground">{isThai ? "บัญชีที่ใช้อยู่" : "Signed in as"}</p>
              <p className="mt-2 text-xl font-black">{user ? profile?.display_name ?? user.user_metadata?.full_name ?? user.user_metadata?.name ?? user.email : isThai ? "ผู้ใช้ทั่วไป" : "Guest"}</p>
              {user?.email && !user.email.endsWith("@app.local") ? <p className="mt-1 text-sm text-muted-foreground">{user.email}</p> : null}
            </div>
            {user ? <>
              <form className="space-y-3" onSubmit={handleSaveDisplayName}>
                <div className="space-y-2"><Label htmlFor="profile-display-name">{isThai ? "ชื่อที่แสดง" : "Display name"}</Label><Input id="profile-display-name" value={displayNameDraft} maxLength={80} onChange={(event) => setDisplayNameDraft(event.target.value)} className="rounded-2xl" /></div>
                <Button type="submit" variant="outline" size="sm" className="rounded-xl" disabled={isAccountSaving}>{isThai ? "บันทึกชื่อ" : "Save name"}</Button>
              </form>
              <details className="rounded-2xl border border-border p-4"><summary className="cursor-pointer text-sm font-bold">{isThai ? "เปลี่ยนรหัสผ่าน" : "Change password"}</summary>
                <form className="mt-4 space-y-3" onSubmit={handleChangePassword}>
                  <div className="space-y-2"><Label htmlFor="new-password">{isThai ? "รหัสผ่านใหม่" : "New password"}</Label><Input id="new-password" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} className="rounded-2xl" /></div>
                  <div className="space-y-2"><Label htmlFor="confirm-new-password">{isThai ? "ยืนยันรหัสผ่านใหม่" : "Confirm new password"}</Label><Input id="confirm-new-password" type="password" autoComplete="new-password" value={confirmNewPassword} onChange={(event) => setConfirmNewPassword(event.target.value)} className="rounded-2xl" /></div>
                  <Button type="submit" variant="outline" size="sm" disabled={isAccountSaving}>{isThai ? "อัปเดตรหัสผ่าน" : "Update password"}</Button>
                </form>
              </details>
              <Button type="button" variant="ghost" className="text-destructive hover:text-destructive" onClick={handleSignOut}><LogOut className="size-4" /> {isThai ? "ออกจากระบบ" : "Sign out"}</Button>
            </> : <Button variant="soft" onClick={() => setIsAuthDialogOpen(true)}>{isThai ? "เข้าสู่ระบบ" : "Log in"}</Button>}
            {accountError ? <p role="alert" className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">{accountError}</p> : null}
            {accountMessage ? <p role="status" className="rounded-xl bg-success/10 p-3 text-sm text-success">{accountMessage}</p> : null}
          </CardContent>
        </Card>

        <Card id="app-preferences" className="scroll-mt-20 rounded-3xl border-border bg-card shadow-[var(--shadow-card)]">
          <CardHeader><CardTitle className="text-2xl">{isThai ? "การตั้งค่าแอป" : "App preferences"}</CardTitle></CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label>{isThai ? "ช่วงเวลาแจ้งเตือน" : "Reminder interval"}</Label>
              <Select value={String(reminderMinutes)} onValueChange={(value) => { const minutes = Number(value); if (user) updateReminderMutation.mutate(minutes); else setGuestReminderMinutes(minutes); }}>
                <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger>
                <SelectContent>{REMINDER_OPTIONS.map((minutes) => <SelectItem key={minutes} value={String(minutes)}>{minutes} {isThai ? "นาที" : "minutes"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <div><Label htmlFor="reminder-sound-toggle" className="cursor-pointer">{isThai ? "เสียงแจ้งเตือน" : "Reminder sound"}</Label><p className="mt-1 text-xs text-muted-foreground">{isThai ? "เล่นเสียงเมื่อถึงเวลาให้ยืดเหยียด" : "Play a sound when it is time to stretch."}</p></div>
                <Switch id="reminder-sound-toggle" checked={soundEnabled} onCheckedChange={setSoundEnabled} aria-label={isThai ? "เปิดเสียงแจ้งเตือน" : "Enable reminder sound"} />
              </div>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_auto]">
                <Select value={reminderSound} onValueChange={(value) => setReminderSound(value as ReminderSound)} disabled={!soundEnabled}>
                  <SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger><SelectContent>
                    <SelectItem value="aggressive">Aggressive</SelectItem><SelectItem value="chime">Gentle chime</SelectItem><SelectItem value="kims-buzzer">Kim's buzzer</SelectItem><SelectItem value="bell">Soft bell</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" className="rounded-2xl" disabled={!soundEnabled} onClick={() => playReminderSound(reminderSound)}>{isThai ? "ลองเสียง" : "Test sound"}</Button>
              </div>
            </div>
            <div className="space-y-2"><Label>{isThai ? "ภาษา" : "Language"}</Label><Select value={language} onValueChange={(value) => setLanguage(value as AppLanguage)}><SelectTrigger className="rounded-2xl"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="en">English</SelectItem><SelectItem value="th">ไทย</SelectItem></SelectContent></Select></div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><div><p className="font-semibold">{isThai ? "บทแนะนำแอป" : "App tutorial"}</p><p className="text-sm text-muted-foreground">{isThai ? "ทบทวนวิธีใช้แต่ละหน้าจอ" : "Review the quick guide to each screen."}</p></div><Button type="button" variant="soft" onClick={() => setTourReplayToken((token) => token + 1)}><Sparkles className="size-4" /> {isThai ? "ดู Tutorial อีกครั้ง" : "Show tutorial again"}</Button></div>
          </CardContent>
        </Card>

        <Card id="profile-help" className="scroll-mt-20 rounded-3xl border-border bg-card shadow-[var(--shadow-card)] lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-2xl"><MessageCircle className="size-5 text-primary" /> {isThai ? "ช่วยเหลือ" : "Help"}</CardTitle><p className="text-sm text-muted-foreground">{isThai ? "คำตอบสำหรับการใช้งาน UniStretch" : "Quick answers about using UniStretch."}</p></CardHeader>
          <CardContent className="space-y-3">
            <details className="rounded-2xl border border-border bg-surface-soft p-4"><summary className="cursor-pointer font-semibold">{isThai ? "ตั้งเวลาและเสียงเตือนได้ที่ไหน?" : "Where can I change reminder and sound settings?"}</summary><p className="mt-2 text-sm text-muted-foreground">{isThai ? "ไปที่ Profile > Preferences เพื่อปรับช่วงเวลา เปิดหรือปิดเสียง และทดลองเสียงแจ้งเตือน" : "Open Profile > Preferences to change the interval, toggle sound, and preview the alert."}</p></details>
            <details className="rounded-2xl border border-border bg-surface-soft p-4"><summary className="cursor-pointer font-semibold">{isThai ? "ทำอย่างไรจึงจะได้รับแต้ม?" : "How do I earn stretch points?"}</summary><p className="mt-2 text-sm text-muted-foreground">{isThai ? "เลือกคลิป กด Do this exercise ทำตามจนตัวจับเวลาหมด แล้วกด Finish เพื่อรับ 10 แต้ม" : "Choose a clip, press Do this exercise, finish its timer, then press Finish to earn 10 points."}</p></details>
            <details className="rounded-2xl border border-border bg-surface-soft p-4"><summary className="cursor-pointer font-semibold">{isThai ? "เลือกวันนัดหมายไม่ได้ ทำอย่างไร?" : "Why can’t I choose a date or time?"}</summary><p className="mt-2 text-sm text-muted-foreground">{isThai ? "ปฏิทินแสดงเฉพาะวันที่แพทย์เปิดให้จอง และเวลาที่ผ่านไปหรือมีผู้จองแล้วจะเลือกไม่ได้" : "Only dates matching the selected doctor’s schedule are available. Past or already-booked slots are disabled."}</p></details>
          </CardContent>
        </Card>

        <Card id="review" className="scroll-mt-20 rounded-3xl border-border bg-card shadow-[var(--shadow-card)] lg:col-span-2">
          <CardHeader><CardTitle className="flex items-center gap-2 text-2xl"><Star className="size-6 text-warning" /> {isThai ? "รีวิว UniStretch" : "Review UniStretch"}</CardTitle></CardHeader>
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
              <Label htmlFor="review-feedback">{isThai ? "ข้อเสนอแนะ" : "Suggestions"}</Label>
              <Textarea
                id="review-feedback"
                value={reviewFeedback}
                maxLength={600}
                onChange={(event) => setReviewFeedback(event.target.value)}
                placeholder={isThai ? "บอกเราได้ว่าอยากให้การเตือนยืดเหยียดดีขึ้นอย่างไร" : "Tell us what would make stretch reminders easier to follow"}
                className="min-h-28 rounded-2xl"
              />
            </div>
            {reviewError ? <p className="rounded-2xl bg-destructive/10 p-3 text-sm font-semibold text-destructive">{reviewError}</p> : null}
            {reviewMessage ? <p className="rounded-2xl bg-success/10 p-3 text-sm font-semibold text-success">{reviewMessage}</p> : null}
            <Button variant="hero" onClick={handleReview} disabled={reviewMutation.isPending}>
              {isThai ? "ส่งรีวิว" : "Submit review"}
            </Button>
            <ReviewList reviews={reviewsQuery.data ?? []} />
          </CardContent>
        </Card>
        </div>
      </section>

      <nav aria-label="App navigation" className="fixed inset-x-3 bottom-3 z-40 mx-auto grid max-w-2xl grid-cols-4 rounded-3xl border border-surface/80 bg-surface/90 p-1.5 shadow-[var(--shadow-mobile-nav)] backdrop-blur-xl sm:bottom-5 sm:p-2">
        {([
          { id: "home", label: isThai ? "หน้าหลัก" : "Home", icon: House },
          { id: "stretch", label: isThai ? "ยืดเหยียด" : "Stretch", icon: Activity },
          { id: "booking", label: isThai ? "แพทย์" : "Doctors", icon: Stethoscope },
          { id: "profile", label: isThai ? "โปรไฟล์" : "Profile", icon: UserRound },
        ] satisfies { id: AppTab; label: string; icon: typeof House }[]).map(({ id, label, icon: Icon }) => (
          <Button
            key={id}
            type="button"
            variant={id === activeTab ? "soft" : "ghost"}
            onClick={() => openTab(id)}
            aria-current={id === activeTab ? "page" : undefined}
            className="h-14 min-w-0 flex-col gap-1 rounded-2xl px-1 text-[10px] font-bold sm:flex-row sm:gap-2 sm:px-3 sm:text-sm"
          >
            <Icon className="size-5" />
            <span className="truncate">{label}</span>
          </Button>
        ))}
      </nav>

      <Dialog open={Boolean(selectedReward)} onOpenChange={(open) => { if (!open) setSelectedReward(null); }}>
        <DialogContent className="rounded-3xl border-border bg-card">
          <DialogHeader>
            <DialogTitle>{selectedReward?.title ?? "Reward details"}</DialogTitle>
            <DialogDescription>{selectedReward?.description}</DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-between gap-3 rounded-2xl bg-muted p-5">
            <span className="text-2xl font-black text-primary">{selectedReward?.points ?? 0} pts</span>
            <span className="text-sm text-muted-foreground">{isThai ? "แต้มสะสม" : "points collected"}</span>
          </div>
          <Button variant="soft" onClick={() => setSelectedReward(null)}>Close</Button>
        </DialogContent>
      </Dialog>

      <Dialog open={isRewardCatalogOpen} onOpenChange={setIsRewardCatalogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto rounded-3xl border-border bg-card">
          <DialogHeader><DialogTitle>{isThai ? "รางวัล" : "More rewards"}</DialogTitle></DialogHeader>
          <div className="space-y-2">{rewardPreviews.map((reward) => {
            const Icon = reward.icon;
            return <button key={reward.id} type="button" onClick={() => { setIsRewardCatalogOpen(false); setSelectedReward(reward); }} className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-border bg-surface-soft p-3 text-left hover:border-primary/50">
              <span className="flex size-10 items-center justify-center rounded-xl bg-accent text-accent-foreground"><Icon className="size-5" /></span><span><span className="block font-bold">{reward.title}</span><span className="text-xs text-muted-foreground">{reward.points} points</span></span><ArrowRight className="size-4" />
            </button>;
          })}</div>
        </DialogContent>
      </Dialog>

      <Dialog open={isReminderDialogOpen} onOpenChange={setIsReminderDialogOpen}>
        <DialogContent className="rounded-3xl border-2 border-warning bg-warning text-warning-foreground shadow-2xl">
          <DialogHeader><DialogTitle className="flex items-center gap-2"><TimerReset className="size-5" /> Time to stand and stretch</DialogTitle><DialogDescription className="text-warning-foreground">You have been sitting for {sittingMinutes} minutes. Take a short stretch break now.</DialogDescription></DialogHeader>
          <div className="flex flex-wrap gap-2"><Button variant="wellness" onClick={handleCompleteStretch}>Start stretch <ArrowRight className="size-4" /></Button><Button variant="soft" onClick={() => { setSnoozedUntil(Date.now() + 5 * 60 * 1000); setIsReminderDialogOpen(false); }}>Snooze 5 min</Button></div>
        </DialogContent>
      </Dialog>

      <Dialog open={streakCelebration !== null} onOpenChange={(open) => { if (!open) setStreakCelebration(null); }}>
        <DialogContent className="overflow-hidden rounded-3xl border border-warning/70 bg-gradient-to-br from-amber-100 via-yellow-200 to-orange-300 text-center text-amber-950 dark:from-amber-950 dark:via-yellow-900 dark:to-orange-950 dark:text-amber-50">
          <div className="streak-burst pointer-events-none absolute inset-0" />
          <DialogHeader><DialogTitle className="relative text-3xl">Stretch complete!</DialogTitle><DialogDescription className="relative text-amber-900 dark:text-amber-100">+10 points · Your {streakCelebration}-day streak is on fire!</DialogDescription></DialogHeader>
          <Flame className="streak-flame mx-auto size-20 fill-orange-500 text-red-600 dark:text-orange-300" />
        </DialogContent>
      </Dialog>

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

      <FirstLoginTour
        userId={user?.id}
        onNavigate={openTab}
        forceOpen={tourReplayToken > 0}
        replayToken={tourReplayToken}
        onClose={() => setTourReplayToken(0)}
      />
    </main>
  );
}

async function ensureProfile(userId: string, fallbackName: string, username?: string) {
  const { error } = await supabase.from("profiles").upsert(
    { id: userId, display_name: fallbackName, username: username ?? null },
    { onConflict: "id", ignoreDuplicates: true },
  );
  if (error) throw error;
}

function formatAppointment(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    timeZone: BANGKOK_TZ,
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function playReminderSound(sound: ReminderSound) {
  if (sound === "aggressive" || sound === "kims-buzzer") {
    if (typeof window === "undefined") return;
    try {
      const audio = new Audio(sound === "aggressive" ? "/aggressive-notification.m4a" : "/kims-buzzer-notification.m4a");
      audio.volume = 0.85;
      void audio.play().catch(() => undefined);
    } catch { /* Notification card remains available if audio cannot play. */ }
    return;
  }
  if (typeof window === "undefined" || typeof window.AudioContext === "undefined") return;
  try {
    const context = new window.AudioContext();
    const notes = sound === "chime" ? [660, 880, 1046.5] : [784, 587.3];
    const start = context.currentTime;
    notes.forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * (sound === "chime" ? 0.16 : 0.22);
      oscillator.type = sound === "chime" ? "sine" : "triangle";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.12, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.42);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.44);
    });
    window.setTimeout(() => void context.close(), 1200);
  } catch { /* Notification card remains available if audio cannot play. */ }
}

function BookingList({ bookings }: { bookings: Booking[] }) {
  const [filter, setFilter] = useState<"upcoming" | "past">("upcoming");
  if (bookings.length === 0) {
    return <p className="text-sm text-muted-foreground">No saved appointments yet.</p>;
  }

  const startsAt = (booking: Booking) => new Date(booking.appointment_time).getTime();
  const upcoming = bookings.filter((booking) => isActiveBookingStatus(booking.status) && startsAt(booking) > Date.now()).sort((a, b) => startsAt(a) - startsAt(b));
  const past = bookings.filter((booking) => !upcoming.includes(booking)).sort((a, b) => startsAt(b) - startsAt(a));
  const visible = filter === "upcoming" ? upcoming : past;

  return (
    <div className="space-y-2">
      <div className="flex gap-2" role="group" aria-label="Filter appointments">
        <Button size="sm" variant={filter === "upcoming" ? "wellness" : "outline"} aria-pressed={filter === "upcoming"} onClick={() => setFilter("upcoming")}>Upcoming <span className="ml-1 opacity-75">{upcoming.length}</span></Button>
        <Button size="sm" variant={filter === "past" ? "wellness" : "outline"} aria-pressed={filter === "past"} onClick={() => setFilter("past")}>Past <span className="ml-1 opacity-75">{past.length}</span></Button>
      </div>
      {visible.length === 0 ? <p className="py-2 text-sm text-muted-foreground">No {filter} appointments.</p> : null}
      {visible.map((booking) => (
        <div key={booking.id} className={cn("flex flex-col justify-between gap-2 rounded-2xl bg-muted p-3 text-sm sm:flex-row sm:items-center", filter === "past" && "opacity-75")}>
          <div>
            <p className="font-bold">{booking.doctor_name}</p>
            <p className="text-muted-foreground">{booking.specialty}</p>
            <p className="text-xs text-muted-foreground">{HOSPITAL_NAME}</p>
            {booking.notes?.replace(INSURANCE_TAG, "").trim() ? <p className="mt-1 text-xs text-muted-foreground">{booking.notes.replace(INSURANCE_TAG, "").trim()}</p> : null}
          </div>
          <div className="sm:text-right"><p className="font-semibold">{formatAppointment(booking.appointment_time)}</p><p className="text-xs text-muted-foreground">{booking.status}</p></div>
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
