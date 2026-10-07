ALTER TABLE public.profiles
ADD COLUMN username text;

CREATE UNIQUE INDEX profiles_username_normalized_idx
ON public.profiles (lower(username))
WHERE username IS NOT NULL;

ALTER TABLE public.profiles
ADD CONSTRAINT profiles_username_format
CHECK (username IS NULL OR username ~ '^[a-z0-9_]{3,30}$');