export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      achievements: {
        Row: {
          description_bm: string
          description_en: string
          icon: string
          id: string
          name_bm: string
          name_en: string
          rarity: string
          requirement_key: string
          requirement_value: number
          sort_order: number
        }
        Insert: {
          description_bm: string
          description_en: string
          icon?: string
          id: string
          name_bm: string
          name_en: string
          rarity?: string
          requirement_key: string
          requirement_value?: number
          sort_order?: number
        }
        Update: {
          description_bm?: string
          description_en?: string
          icon?: string
          id?: string
          name_bm?: string
          name_en?: string
          rarity?: string
          requirement_key?: string
          requirement_value?: number
          sort_order?: number
        }
        Relationships: []
      }
      artifact_quiz_questions: {
        Row: {
          id: string
          artifact_id: string
          prompt_bm: string
          prompt_en: string
          options_bm: Json
          options_en: Json
          correct_index: number
          difficulty: number
          sort_order: number
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          artifact_id: string
          prompt_bm: string
          prompt_en: string
          options_bm: Json
          options_en: Json
          correct_index: number
          difficulty?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          artifact_id?: string
          prompt_bm?: string
          prompt_en?: string
          options_bm?: Json
          options_en?: Json
          correct_index?: number
          difficulty?: number
          sort_order?: number
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "artifact_quiz_questions_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      artifacts: {
        Row: {
          category: string
          description_bm: string
          description_en: string
          era_bm: string
          era_en: string
          icon: string
          id: string
          image_url: string | null
          image_url_2: string | null
          image_url_3: string | null
          material_bm: string
          material_en: string
          name_bm: string
          name_en: string
          origin_bm: string
          origin_en: string
          sort_order: number
        }
        Insert: {
          category: string
          description_bm: string
          description_en: string
          era_bm: string
          era_en: string
          icon?: string
          id: string
          image_url?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          material_bm: string
          material_en: string
          name_bm: string
          name_en: string
          origin_bm: string
          origin_en: string
          sort_order?: number
        }
        Update: {
          category?: string
          description_bm?: string
          description_en?: string
          era_bm?: string
          era_en?: string
          icon?: string
          id?: string
          image_url?: string | null
          image_url_2?: string | null
          image_url_3?: string | null
          material_bm?: string
          material_en?: string
          name_bm?: string
          name_en?: string
          origin_bm?: string
          origin_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      categories: {
        Row: {
          id: string
          name_bm: string
          name_en: string
          icon: string
          sort_order: number
        }
        Insert: {
          id: string
          name_bm: string
          name_en: string
          icon?: string
          sort_order?: number
        }
        Update: {
          id?: string
          name_bm?: string
          name_en?: string
          icon?: string
          sort_order?: number
        }
        Relationships: []
      }
      badges: {
        Row: {
          description_bm: string
          description_en: string
          icon: string
          id: string
          name_bm: string
          name_en: string
          rarity: string
          sort_order: number
        }
        Insert: {
          description_bm: string
          description_en: string
          icon?: string
          id: string
          name_bm: string
          name_en: string
          rarity?: string
          sort_order?: number
        }
        Update: {
          description_bm?: string
          description_en?: string
          icon?: string
          id?: string
          name_bm?: string
          name_en?: string
          rarity?: string
          sort_order?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          language_pref: string
          role: string
          username: string
        }
        Insert: {
          created_at?: string
          id: string
          language_pref?: string
          role?: string
          username: string
        }
        Update: {
          created_at?: string
          id?: string
          language_pref?: string
          role?: string
          username?: string
        }
        Relationships: []
      }
      quests: {
        Row: {
          category: string | null
          description_bm: string
          description_en: string
          exp_reward: number
          id: string
          name_bm: string
          name_en: string
          sort_order: number
          type: string
        }
        Insert: {
          category?: string | null
          description_bm: string
          description_en: string
          exp_reward: number
          id: string
          name_bm: string
          name_en: string
          sort_order?: number
          type: string
        }
        Update: {
          category?: string | null
          description_bm?: string
          description_en?: string
          exp_reward?: number
          id?: string
          name_bm?: string
          name_en?: string
          sort_order?: number
          type?: string
        }
        Relationships: []
      }
      redemptions: {
        Row: {
          id: string
          points_spent: number
          redeemed_at: string
          souvenir_id: string
          user_id: string
        }
        Insert: {
          id?: string
          points_spent: number
          redeemed_at?: string
          souvenir_id: string
          user_id: string
        }
        Update: {
          id?: string
          points_spent?: number
          redeemed_at?: string
          souvenir_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "redemptions_souvenir_id_fkey"
            columns: ["souvenir_id"]
            isOneToOne: false
            referencedRelation: "souvenirs"
            referencedColumns: ["id"]
          },
        ]
      }
      souvenirs: {
        Row: {
          cost_points: number
          icon: string
          id: string
          name_bm: string
          name_en: string
          sort_order: number
        }
        Insert: {
          cost_points: number
          icon?: string
          id: string
          name_bm: string
          name_en: string
          sort_order?: number
        }
        Update: {
          cost_points?: number
          icon?: string
          id?: string
          name_bm?: string
          name_en?: string
          sort_order?: number
        }
        Relationships: []
      }
      unique_quest_templates: {
        Row: {
          badge_id: string | null
          description_bm: string
          description_en: string
          id: string
          name_bm: string
          name_en: string
          penalty_exp: number
          reward_multiplier: number
          sort_order: number
          target_category: string
          target_count: number
          trigger_artifact_id: string
        }
        Insert: {
          badge_id?: string | null
          description_bm: string
          description_en: string
          id: string
          name_bm: string
          name_en: string
          penalty_exp?: number
          reward_multiplier?: number
          sort_order?: number
          target_category: string
          target_count?: number
          trigger_artifact_id: string
        }
        Update: {
          badge_id?: string | null
          description_bm?: string
          description_en?: string
          id?: string
          name_bm?: string
          name_en?: string
          penalty_exp?: number
          reward_multiplier?: number
          sort_order?: number
          target_category?: string
          target_count?: number
          trigger_artifact_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "unique_quest_templates_trigger_artifact_id_fkey"
            columns: ["trigger_artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_achievements: {
        Row: {
          achievement_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          achievement_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          achievement_id?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_achievements_achievement_id_fkey"
            columns: ["achievement_id"]
            isOneToOne: false
            referencedRelation: "achievements"
            referencedColumns: ["id"]
          },
        ]
      }
      user_artifact_progress: {
        Row: {
          artifact_id: string
          exp_earned: number
          is_hard_mode: boolean
          quiz_completed_at: string | null
          quiz_correct_count: number | null
          quiz_total_questions: number | null
          scanned_at: string
          user_id: string
        }
        Insert: {
          artifact_id: string
          exp_earned?: number
          is_hard_mode?: boolean
          quiz_completed_at?: string | null
          quiz_correct_count?: number | null
          quiz_total_questions?: number | null
          scanned_at?: string
          user_id: string
        }
        Update: {
          artifact_id?: string
          exp_earned?: number
          is_hard_mode?: boolean
          quiz_completed_at?: string | null
          quiz_correct_count?: number | null
          quiz_total_questions?: number | null
          scanned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_artifact_progress_artifact_id_fkey"
            columns: ["artifact_id"]
            isOneToOne: false
            referencedRelation: "artifacts"
            referencedColumns: ["id"]
          },
        ]
      }
      user_badges: {
        Row: {
          badge_id: string
          earned_at: string
          user_id: string
        }
        Insert: {
          badge_id: string
          earned_at?: string
          user_id: string
        }
        Update: {
          badge_id?: string
          earned_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
        ]
      }
      user_progress: {
        Row: {
          current_level: number
          discount_points: number
          total_exp: number
          updated_at: string
          user_id: string
        }
        Insert: {
          current_level?: number
          discount_points?: number
          total_exp?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          current_level?: number
          discount_points?: number
          total_exp?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_quests: {
        Row: {
          completed_at: string
          quest_id: string
          user_id: string
        }
        Insert: {
          completed_at?: string
          quest_id: string
          user_id: string
        }
        Update: {
          completed_at?: string
          quest_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_quests_quest_id_fkey"
            columns: ["quest_id"]
            isOneToOne: false
            referencedRelation: "quests"
            referencedColumns: ["id"]
          },
        ]
      }
      user_unique_quests: {
        Row: {
          correct_scans: number
          created_at: string
          status: string
          template_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          correct_scans?: number
          created_at?: string
          status: string
          template_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          correct_scans?: number
          created_at?: string
          status?: string
          template_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_unique_quests_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "unique_quest_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
