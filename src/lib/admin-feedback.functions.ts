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

    const { data: reviews, error: reviewError } = await context.supabase
      .from("app_reviews")
      .select("id, user_id, rating, feedback, created_at")
      .order("created_at", { ascending: false });

    if (reviewError) throw reviewError;

    const userIds = [...new Set((reviews ?? []).map((review) => review.user_id))];
    const { data: profiles, error: profileError } = userIds.length
      ? await context.supabase.from("profiles").select("id, display_name").in("id", userIds)
      : { data: [], error: null };

    if (profileError) throw profileError;

    const names = new Map((profiles ?? []).map((profile) => [profile.id, profile.display_name]));
    return (reviews ?? []).map((review) => ({
      id: review.id,
      rating: review.rating,
      feedback: review.feedback,
      createdAt: review.created_at,
      reviewer: names.get(review.user_id) ?? "UniStretch member",
    }));
  });
