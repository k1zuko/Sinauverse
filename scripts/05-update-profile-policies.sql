-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Service role can insert profiles" ON public.profiles;

-- Create new policies that allow profile creation
CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Allow authenticated users to insert profiles (needed for registration)
CREATE POLICY "Authenticated users can insert profiles" ON public.profiles
    FOR INSERT TO authenticated WITH CHECK (true);

-- Allow anonymous users to insert profiles during registration
CREATE POLICY "Anonymous users can insert profiles during registration" ON public.profiles
    FOR INSERT TO anon WITH CHECK (true);
