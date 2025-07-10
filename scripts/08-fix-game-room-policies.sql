-- Drop existing policies
DROP POLICY IF EXISTS "Users can create game rooms" ON public.game_rooms;
DROP POLICY IF EXISTS "Game rooms are viewable by participants" ON public.game_rooms;

-- Create more permissive policies for game rooms
CREATE POLICY "Anyone can create game rooms" ON public.game_rooms
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Game rooms are viewable by everyone" ON public.game_rooms
    FOR SELECT USING (true);

CREATE POLICY "Hosts can update their game rooms" ON public.game_rooms
    FOR UPDATE USING (auth.uid() = host_id);

CREATE POLICY "Hosts can delete their game rooms" ON public.game_rooms
    FOR DELETE USING (auth.uid() = host_id);

-- Also fix game participants policies
DROP POLICY IF EXISTS "Users can join games" ON public.game_participants;

CREATE POLICY "Anyone can join games" ON public.game_participants
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Game participants are viewable by everyone" ON public.game_participants
    FOR SELECT USING (true);
