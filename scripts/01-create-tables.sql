-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table (extends Supabase auth.users)
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quizzes table
CREATE TABLE public.quizzes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    cover_image TEXT,
    creator_id UUID REFERENCES public.profiles(id) NOT NULL,
    is_public BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Questions table
CREATE TABLE public.questions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    quiz_id UUID REFERENCES public.quizzes(id) ON DELETE CASCADE NOT NULL,
    question_text TEXT NOT NULL,
    question_type TEXT DEFAULT 'multiple_choice' CHECK (question_type IN ('multiple_choice', 'true_false')),
    time_limit INTEGER DEFAULT 20,
    points INTEGER DEFAULT 1000,
    order_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Answer options table
CREATE TABLE public.answer_options (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    question_id UUID REFERENCES public.questions(id) ON DELETE CASCADE NOT NULL,
    option_text TEXT NOT NULL,
    is_correct BOOLEAN DEFAULT false,
    option_index INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Game rooms table
CREATE TABLE public.game_rooms (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_code TEXT UNIQUE NOT NULL,
    quiz_id UUID REFERENCES public.quizzes(id) NOT NULL,
    host_id UUID REFERENCES public.profiles(id) NOT NULL,
    status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'playing', 'finished')),
    current_question INTEGER DEFAULT 0,
    max_players INTEGER DEFAULT 50,
    is_solo BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    started_at TIMESTAMP WITH TIME ZONE,
    finished_at TIMESTAMP WITH TIME ZONE
);

-- Game participants table
CREATE TABLE public.game_participants (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id),
    nickname TEXT NOT NULL,
    score INTEGER DEFAULT 0,
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(room_id, user_id),
    UNIQUE(room_id, nickname)
);

-- Game answers table
CREATE TABLE public.game_answers (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    room_id UUID REFERENCES public.game_rooms(id) ON DELETE CASCADE NOT NULL,
    participant_id UUID REFERENCES public.game_participants(id) ON DELETE CASCADE NOT NULL,
    question_id UUID REFERENCES public.questions(id) NOT NULL,
    selected_option_id UUID REFERENCES public.answer_options(id),
    is_correct BOOLEAN,
    points_earned INTEGER DEFAULT 0,
    answer_time FLOAT, -- Time taken to answer in seconds
    answered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.answer_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.game_answers ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Users can insert their own profile" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id);

-- Quizzes policies
CREATE POLICY "Public quizzes are viewable by everyone" ON public.quizzes
    FOR SELECT USING (is_public = true OR creator_id = auth.uid());

CREATE POLICY "Users can create quizzes" ON public.quizzes
    FOR INSERT WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Users can update their own quizzes" ON public.quizzes
    FOR UPDATE USING (auth.uid() = creator_id);

CREATE POLICY "Users can delete their own quizzes" ON public.quizzes
    FOR DELETE USING (auth.uid() = creator_id);

-- Questions policies
CREATE POLICY "Questions are viewable by quiz viewers" ON public.questions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.quizzes 
            WHERE quizzes.id = questions.quiz_id 
            AND (quizzes.is_public = true OR quizzes.creator_id = auth.uid())
        )
    );

CREATE POLICY "Quiz creators can manage questions" ON public.questions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.quizzes 
            WHERE quizzes.id = questions.quiz_id 
            AND quizzes.creator_id = auth.uid()
        )
    );

-- Answer options policies
CREATE POLICY "Answer options are viewable by question viewers" ON public.answer_options
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.questions 
            JOIN public.quizzes ON quizzes.id = questions.quiz_id
            WHERE questions.id = answer_options.question_id 
            AND (quizzes.is_public = true OR quizzes.creator_id = auth.uid())
        )
    );

CREATE POLICY "Quiz creators can manage answer options" ON public.answer_options
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.questions 
            JOIN public.quizzes ON quizzes.id = questions.quiz_id
            WHERE questions.id = answer_options.question_id 
            AND quizzes.creator_id = auth.uid()
        )
    );

-- Game rooms policies
CREATE POLICY "Game rooms are viewable by participants" ON public.game_rooms
    FOR SELECT USING (
        host_id = auth.uid() OR 
        EXISTS (
            SELECT 1 FROM public.game_participants 
            WHERE game_participants.room_id = game_rooms.id 
            AND game_participants.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can create game rooms" ON public.game_rooms
    FOR INSERT WITH CHECK (auth.uid() = host_id);

CREATE POLICY "Hosts can update their game rooms" ON public.game_rooms
    FOR UPDATE USING (auth.uid() = host_id);

-- Game participants policies
CREATE POLICY "Game participants are viewable by room members" ON public.game_participants
    FOR SELECT USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM public.game_rooms 
            WHERE game_rooms.id = game_participants.room_id 
            AND (game_rooms.host_id = auth.uid() OR 
                 EXISTS (SELECT 1 FROM public.game_participants gp2 
                        WHERE gp2.room_id = game_rooms.id AND gp2.user_id = auth.uid()))
        )
    );

CREATE POLICY "Users can join games" ON public.game_participants
    FOR INSERT WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

-- Game answers policies
CREATE POLICY "Game answers are viewable by participants" ON public.game_answers
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.game_participants 
            WHERE game_participants.id = game_answers.participant_id 
            AND game_participants.user_id = auth.uid()
        ) OR
        EXISTS (
            SELECT 1 FROM public.game_rooms 
            WHERE game_rooms.id = game_answers.room_id 
            AND game_rooms.host_id = auth.uid()
        )
    );

CREATE POLICY "Participants can submit answers" ON public.game_answers
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.game_participants 
            WHERE game_participants.id = game_answers.participant_id 
            AND game_participants.user_id = auth.uid()
        )
    );
