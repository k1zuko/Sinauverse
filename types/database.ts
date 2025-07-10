export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string
          username: string
          full_name: string | null
          avatar_url: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          username: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          username?: string
          full_name?: string | null
          avatar_url?: string | null
          created_at?: string
          updated_at?: string
        }
      }
      quizzes: {
        Row: {
          id: string
          title: string
          description: string | null
          cover_image: string | null
          creator_id: string
          is_public: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          title: string
          description?: string | null
          cover_image?: string | null
          creator_id: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          title?: string
          description?: string | null
          cover_image?: string | null
          creator_id?: string
          is_public?: boolean
          created_at?: string
          updated_at?: string
        }
      }
      questions: {
        Row: {
          id: string
          quiz_id: string
          question_text: string
          question_type: string
          time_limit: number
          points: number
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          quiz_id: string
          question_text: string
          question_type?: string
          time_limit?: number
          points?: number
          order_index: number
          created_at?: string
        }
        Update: {
          id?: string
          quiz_id?: string
          question_text?: string
          question_type?: string
          time_limit?: number
          points?: number
          order_index?: number
          created_at?: string
        }
      }
      answer_options: {
        Row: {
          id: string
          question_id: string
          option_text: string
          is_correct: boolean
          option_index: number
          created_at: string
        }
        Insert: {
          id?: string
          question_id: string
          option_text: string
          is_correct?: boolean
          option_index: number
          created_at?: string
        }
        Update: {
          id?: string
          question_id?: string
          option_text?: string
          is_correct?: boolean
          option_index?: number
          created_at?: string
        }
      }
      game_rooms: {
        Row: {
          id: string
          room_code: string
          quiz_id: string
          host_id: string
          status: string
          current_question: number
          max_players: number
          is_solo: boolean
          created_at: string
          started_at: string | null
          finished_at: string | null
        }
        Insert: {
          id?: string
          room_code: string
          quiz_id: string
          host_id: string
          status?: string
          current_question?: number
          max_players?: number
          is_solo?: boolean
          created_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
        Update: {
          id?: string
          room_code?: string
          quiz_id?: string
          host_id?: string
          status?: string
          current_question?: number
          max_players?: number
          is_solo?: boolean
          created_at?: string
          started_at?: string | null
          finished_at?: string | null
        }
      }
      game_participants: {
        Row: {
          id: string
          room_id: string
          user_id: string | null
          nickname: string
          score: number
          joined_at: string
        }
        Insert: {
          id?: string
          room_id: string
          user_id?: string | null
          nickname: string
          score?: number
          joined_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          user_id?: string | null
          nickname?: string
          score?: number
          joined_at?: string
        }
      }
      game_answers: {
        Row: {
          id: string
          room_id: string
          participant_id: string
          question_id: string
          selected_option_id: string | null
          is_correct: boolean | null
          points_earned: number
          answer_time: number | null
          answered_at: string
        }
        Insert: {
          id?: string
          room_id: string
          participant_id: string
          question_id: string
          selected_option_id?: string | null
          is_correct?: boolean | null
          points_earned?: number
          answer_time?: number | null
          answered_at?: string
        }
        Update: {
          id?: string
          room_id?: string
          participant_id?: string
          question_id?: string
          selected_option_id?: string | null
          is_correct?: boolean | null
          points_earned?: number
          answer_time?: number | null
          answered_at?: string
        }
      }
    }
  }
}
