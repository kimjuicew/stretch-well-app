import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAdminFeedback = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: isAdmin, error: roleError } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleError) throw roleError;
    if (!isAdmin) throw new Error("Forbidden: Admin access required");

    const [reviewsRes, profilesRes, sessionsRes, bookingsRes] = await Promise.all([
      context.supabase.from("app_reviews").select("id, user_id, rating, feedback, created_at").order("created_at", { ascending: false }),
      context.supabase.from("profiles").select("id, display_name, username, streak_points, current_streak_days, last_stretch_at, created_at"),
      context.supabase.from("stretch_sessions").select("user_id, completed_at"),
      context.supabase.from("doctor_bookings").select("id, user_id, doctor_name, specialty, appointment_time, notes, status, created_at").order("appointment_time", { ascending: false }),
    ]);
    for (const r of [reviewsRes, profilesRes, sessionsRes, bookingsRes]) if (r.error) throw r.error;

    const profiles = profilesRes.data ?? [];
    const names = new Map(profiles.map((p) => [p.id, p.username ?? p.display_name ?? "UniStretch member"]));
    const sessions = sessionsRes.data ?? [];
    const weekAgo = Date.now() - 7 * 86400000;

    const reviews = (reviewsRes.data ?? []).map((r) => ({
      id: r.id, rating: r.rating, feedback: r.feedback, createdAt: r.created_at,
      reviewer: names.get(r.user_id) ?? "UniStretch member",
    }));

    const usage = profiles.map((p) => {
      const mine = sessions.filter((s) => s.user_id === p.id);
      return {
        id: p.id,
        name: names.get(p.id)!,
        points: p.streak_points,
        streakDays: p.current_streak_days,
        totalSessions: mine.length,
        weekSessions: mine.filter((s) => new Date(s.completed_at).getTime() >= weekAgo).length,
        lastStretchAt: p.last_stretch_at,
        joinedAt: p.created_at,
      };
    }).sort((a, b) => b.totalSessions - a.totalSessions);

    const bookings = (bookingsRes.data ?? []).map((b) => ({
      id: b.id, patient: names.get(b.user_id) ?? "UniStretch member", doctor: b.doctor_name,
      specialty: b.specialty, appointmentTime: b.appointment_time, notes: b.notes, status: b.status,
    }));

    return { reviews, usage, bookings };
  });
