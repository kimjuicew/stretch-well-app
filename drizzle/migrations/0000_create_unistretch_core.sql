CREATE TABLE public.profiles (
  id uuid PRIMARY KEY,
  display_name text,
  reminder_interval_minutes integer NOT NULL DEFAULT 45 CHECK (reminder_interval_minutes IN (30, 45, 60)),
  streak_points integer NOT NULL DEFAULT 0 CHECK (streak_points >= 0),
  current_streak_days integer NOT NULL DEFAULT 0 CHECK (current_streak_days >= 0),
  last_stretch_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id);
CREATE POLICY "Users can create their own profile"
ON public.profiles FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

CREATE TABLE public.stretch_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  minutes_sitting integer NOT NULL DEFAULT 45 CHECK (minutes_sitting >= 0 AND minutes_sitting <= 720),
  stretch_type text NOT NULL DEFAULT 'guided',
  points_awarded integer NOT NULL DEFAULT 10 CHECK (points_awarded >= 0 AND points_awarded <= 100),
  completed_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.stretch_sessions TO authenticated;
GRANT ALL ON public.stretch_sessions TO service_role;
ALTER TABLE public.stretch_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own stretch sessions"
ON public.stretch_sessions FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own stretch sessions"
ON public.stretch_sessions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.doctor_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  doctor_name text NOT NULL CHECK (char_length(doctor_name) <= 120),
  specialty text NOT NULL CHECK (char_length(specialty) <= 120),
  appointment_time timestamptz NOT NULL,
  notes text CHECK (notes IS NULL OR char_length(notes) <= 500),
  status text NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.doctor_bookings TO authenticated;
GRANT ALL ON public.doctor_bookings TO service_role;
ALTER TABLE public.doctor_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own doctor bookings"
ON public.doctor_bookings FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own doctor bookings"
ON public.doctor_bookings FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own doctor bookings"
ON public.doctor_bookings FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.app_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  feedback text NOT NULL CHECK (char_length(trim(feedback)) >= 5 AND char_length(feedback) <= 600),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_reviews TO authenticated;
GRANT ALL ON public.app_reviews TO service_role;
ALTER TABLE public.app_reviews ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own reviews"
ON public.app_reviews FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own reviews"
ON public.app_reviews FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own reviews"
ON public.app_reviews FOR UPDATE TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_app_reviews_updated_at
BEFORE UPDATE ON public.app_reviews
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX stretch_sessions_user_completed_idx ON public.stretch_sessions (user_id, completed_at DESC);
CREATE INDEX doctor_bookings_user_time_idx ON public.doctor_bookings (user_id, appointment_time DESC);
CREATE INDEX app_reviews_user_created_idx ON public.app_reviews (user_id, created_at DESC);