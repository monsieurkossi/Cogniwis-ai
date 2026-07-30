-- Cogniwis MVP — Supabase schema.
-- Run in the Supabase SQL editor. Idempotent-ish (uses IF NOT EXISTS where possible).

-- =========================================================================
-- profiles
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT,
  activity TEXT,
  activity_duration TEXT,
  declared_objective TEXT,
  real_objective TEXT,
  archetype TEXT,
  oni_gender TEXT DEFAULT 'il',
  interaction_mode TEXT DEFAULT 'text',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- conversations
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  messages JSONB DEFAULT '[]'::jsonb,
  status TEXT DEFAULT 'active',
  recap TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- diagnostics
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.diagnostics (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id),
  cycle_number INTEGER DEFAULT 1,
  verdict TEXT,
  reframing TEXT,
  reasoning TEXT,
  global_score INTEGER,
  pillars JSONB,
  priority_pillar TEXT,
  active_rules JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =========================================================================
-- actions
-- =========================================================================
CREATE TABLE IF NOT EXISTS public.actions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  diagnostic_id UUID REFERENCES public.diagnostics(id),
  pillar TEXT NOT NULL,
  step_number INTEGER NOT NULL,
  total_steps INTEGER NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  deliverable TEXT,
  estimated_time TEXT,
  kpi_target TEXT,
  kpi_result TEXT,
  status TEXT DEFAULT 'pending',
  clients JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- =========================================================================
-- Row Level Security
-- =========================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnostics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users read own conversations" ON public.conversations;
CREATE POLICY "Users read own conversations" ON public.conversations
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own conversations" ON public.conversations;
CREATE POLICY "Users manage own conversations" ON public.conversations
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own diagnostics" ON public.diagnostics;
CREATE POLICY "Users read own diagnostics" ON public.diagnostics
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own diagnostics" ON public.diagnostics;
CREATE POLICY "Users manage own diagnostics" ON public.diagnostics
  FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users read own actions" ON public.actions;
CREATE POLICY "Users read own actions" ON public.actions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users manage own actions" ON public.actions;
CREATE POLICY "Users manage own actions" ON public.actions
  FOR ALL USING (auth.uid() = user_id);

-- =========================================================================
-- Auto-create profile row on new auth user
-- =========================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NULL))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
