-- Insert demo quiz that can be used for testing
INSERT INTO public.quizzes (id, title, description, creator_id, is_public) VALUES
('demo-quiz-001', 'Demo Quiz - Pengetahuan Umum', 'Quiz demo untuk mencoba fitur platform', '00000000-0000-0000-0000-000000000000', true);

-- Insert demo questions
INSERT INTO public.questions (id, quiz_id, question_text, time_limit, points, order_index) VALUES
('demo-q1', 'demo-quiz-001', 'Apa ibu kota Indonesia?', 20, 1000, 1),
('demo-q2', 'demo-quiz-001', 'Berapa hasil dari 15 + 27?', 20, 1000, 2),
('demo-q3', 'demo-quiz-001', 'Planet mana yang paling dekat dengan Matahari?', 25, 1000, 3),
('demo-q4', 'demo-quiz-001', 'Siapa penemu lampu pijar?', 25, 1000, 4),
('demo-q5', 'demo-quiz-001', 'Berapa jumlah benua di dunia?', 20, 1000, 5);

-- Insert answer options for demo questions
-- Question 1: Ibu kota Indonesia
INSERT INTO public.answer_options (question_id, option_text, is_correct, option_index) VALUES
('demo-q1', 'Bandung', false, 0),
('demo-q1', 'Jakarta', true, 1),
('demo-q1', 'Surabaya', false, 2),
('demo-q1', 'Medan', false, 3);

-- Question 2: 15 + 27
INSERT INTO public.answer_options (question_id, option_text, is_correct, option_index) VALUES
('demo-q2', '41', false, 0),
('demo-q2', '42', true, 1),
('demo-q2', '43', false, 2),
('demo-q2', '44', false, 3);

-- Question 3: Planet terdekat Matahari
INSERT INTO public.answer_options (question_id, option_text, is_correct, option_index) VALUES
('demo-q3', 'Venus', false, 0),
('demo-q3', 'Mars', false, 1),
('demo-q3', 'Merkurius', true, 2),
('demo-q3', 'Bumi', false, 3);

-- Question 4: Penemu lampu pijar
INSERT INTO public.answer_options (question_id, option_text, is_correct, option_index) VALUES
('demo-q4', 'Albert Einstein', false, 0),
('demo-q4', 'Thomas Edison', true, 1),
('demo-q4', 'Nikola Tesla', false, 2),
('demo-q4', 'Alexander Bell', false, 3);

-- Question 5: Jumlah benua
INSERT INTO public.answer_options (question_id, option_text, is_correct, option_index) VALUES
('demo-q5', '5', false, 0),
('demo-q5', '6', false, 1),
('demo-q5', '7', true, 2),
('demo-q5', '8', false, 3);
