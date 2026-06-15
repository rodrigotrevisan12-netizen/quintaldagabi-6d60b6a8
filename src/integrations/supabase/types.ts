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
      dog_allergies: {
        Row: {
          created_at: string
          description: string
          dog_id: string
          id: string
          severity: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          dog_id: string
          id?: string
          severity?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          dog_id?: string
          id?: string
          severity?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_allergies_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_behavior: {
        Row: {
          compat_females: boolean
          compat_large: boolean
          compat_males: boolean
          compat_medium: boolean
          compat_small: boolean
          created_at: string
          dog_id: string
          notes: string | null
          traits: Database["public"]["Enums"]["behavior_trait"][]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          compat_females?: boolean
          compat_large?: boolean
          compat_males?: boolean
          compat_medium?: boolean
          compat_small?: boolean
          created_at?: string
          dog_id: string
          notes?: string | null
          traits?: Database["public"]["Enums"]["behavior_trait"][]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          compat_females?: boolean
          compat_large?: boolean
          compat_males?: boolean
          compat_medium?: boolean
          compat_small?: boolean
          created_at?: string
          dog_id?: string
          notes?: string | null
          traits?: Database["public"]["Enums"]["behavior_trait"][]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_behavior_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: true
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_behavior_history: {
        Row: {
          compat_females: boolean | null
          compat_large: boolean | null
          compat_males: boolean | null
          compat_medium: boolean | null
          compat_small: boolean | null
          created_at: string
          created_by: string | null
          dog_id: string
          event_date: string
          id: string
          notes: string | null
          traits: Database["public"]["Enums"]["behavior_trait"][]
        }
        Insert: {
          compat_females?: boolean | null
          compat_large?: boolean | null
          compat_males?: boolean | null
          compat_medium?: boolean | null
          compat_small?: boolean | null
          created_at?: string
          created_by?: string | null
          dog_id: string
          event_date?: string
          id?: string
          notes?: string | null
          traits?: Database["public"]["Enums"]["behavior_trait"][]
        }
        Update: {
          compat_females?: boolean | null
          compat_large?: boolean | null
          compat_males?: boolean | null
          compat_medium?: boolean | null
          compat_small?: boolean | null
          created_at?: string
          created_by?: string | null
          dog_id?: string
          event_date?: string
          id?: string
          notes?: string | null
          traits?: Database["public"]["Enums"]["behavior_trait"][]
        }
        Relationships: [
          {
            foreignKeyName: "dog_behavior_history_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_dewormings: {
        Row: {
          applied_date: string
          created_at: string
          dog_id: string
          id: string
          next_due_date: string | null
          notes: string | null
          product: string | null
          updated_at: string
        }
        Insert: {
          applied_date: string
          created_at?: string
          dog_id: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          product?: string | null
          updated_at?: string
        }
        Update: {
          applied_date?: string
          created_at?: string
          dog_id?: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          product?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_dewormings_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_diet_restrictions: {
        Row: {
          created_at: string
          description: string
          dog_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          dog_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          dog_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_diet_restrictions_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_flea_treatments: {
        Row: {
          applied_date: string
          created_at: string
          dog_id: string
          id: string
          next_due_date: string | null
          notes: string | null
          product: string | null
          updated_at: string
        }
        Insert: {
          applied_date: string
          created_at?: string
          dog_id: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          product?: string | null
          updated_at?: string
        }
        Update: {
          applied_date?: string
          created_at?: string
          dog_id?: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          product?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_flea_treatments_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_medical_history: {
        Row: {
          created_at: string
          description: string
          dog_id: string
          event_date: string
          id: string
          updated_at: string
          vet_name: string | null
        }
        Insert: {
          created_at?: string
          description: string
          dog_id: string
          event_date: string
          id?: string
          updated_at?: string
          vet_name?: string | null
        }
        Update: {
          created_at?: string
          description?: string
          dog_id?: string
          event_date?: string
          id?: string
          updated_at?: string
          vet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_medical_history_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_medications: {
        Row: {
          active: boolean
          created_at: string
          dog_id: string
          dose: string | null
          frequency: string | null
          id: string
          name: string
          notes: string | null
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          dog_id: string
          dose?: string | null
          frequency?: string | null
          id?: string
          name: string
          notes?: string | null
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          dog_id?: string
          dose?: string | null
          frequency?: string | null
          id?: string
          name?: string
          notes?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_medications_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dog_vaccines: {
        Row: {
          applied_date: string
          batch: string | null
          created_at: string
          dog_id: string
          id: string
          next_due_date: string | null
          notes: string | null
          updated_at: string
          vaccine_type: string
          vet_name: string | null
        }
        Insert: {
          applied_date: string
          batch?: string | null
          created_at?: string
          dog_id: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string
          vaccine_type: string
          vet_name?: string | null
        }
        Update: {
          applied_date?: string
          batch?: string | null
          created_at?: string
          dog_id?: string
          id?: string
          next_due_date?: string | null
          notes?: string | null
          updated_at?: string
          vaccine_type?: string
          vet_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dog_vaccines_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      dogs: {
        Row: {
          birth_date: string | null
          breed: string | null
          created_at: string
          created_by: string | null
          id: string
          microchip: string | null
          name: string
          neutered: boolean | null
          notes: string | null
          photo_url: string | null
          plan: string | null
          sex: Database["public"]["Enums"]["dog_sex"] | null
          size: Database["public"]["Enums"]["dog_size"] | null
          tutor_id: string
          unit_id: string | null
          updated_at: string
          vet_name: string | null
          vet_phone: string | null
          weight_kg: number | null
        }
        Insert: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          microchip?: string | null
          name: string
          neutered?: boolean | null
          notes?: string | null
          photo_url?: string | null
          plan?: string | null
          sex?: Database["public"]["Enums"]["dog_sex"] | null
          size?: Database["public"]["Enums"]["dog_size"] | null
          tutor_id: string
          unit_id?: string | null
          updated_at?: string
          vet_name?: string | null
          vet_phone?: string | null
          weight_kg?: number | null
        }
        Update: {
          birth_date?: string | null
          breed?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          microchip?: string | null
          name?: string
          neutered?: boolean | null
          notes?: string | null
          photo_url?: string | null
          plan?: string | null
          sex?: Database["public"]["Enums"]["dog_sex"] | null
          size?: Database["public"]["Enums"]["dog_size"] | null
          tutor_id?: string
          unit_id?: string | null
          updated_at?: string
          vet_name?: string | null
          vet_phone?: string | null
          weight_kg?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "dogs_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dogs_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          default_unit_id: string | null
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_unit_id?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_unit_id?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_default_unit_id_fkey"
            columns: ["default_unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_authorized_pickups: {
        Row: {
          created_at: string
          document: string | null
          id: string
          name: string
          phone: string | null
          relationship: string | null
          tutor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document?: string | null
          id?: string
          name: string
          phone?: string | null
          relationship?: string | null
          tutor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document?: string | null
          id?: string
          name?: string
          phone?: string | null
          relationship?: string | null
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_authorized_pickups_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      tutor_emergency_contacts: {
        Row: {
          created_at: string
          id: string
          name: string
          phone: string | null
          relationship: string | null
          tutor_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          phone?: string | null
          relationship?: string | null
          tutor_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
          relationship?: string | null
          tutor_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tutor_emergency_contacts_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
        ]
      }
      tutors: {
        Row: {
          address_city: string | null
          address_complement: string | null
          address_neighborhood: string | null
          address_number: string | null
          address_state: string | null
          address_street: string | null
          address_zip: string | null
          birth_date: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          email: string | null
          full_name: string
          id: string
          notes: string | null
          phone: string | null
          rg: string | null
          unit_id: string | null
          updated_at: string
          user_id: string | null
          whatsapp: string | null
        }
        Insert: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name: string
          id?: string
          notes?: string | null
          phone?: string | null
          rg?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Update: {
          address_city?: string | null
          address_complement?: string | null
          address_neighborhood?: string | null
          address_number?: string | null
          address_state?: string | null
          address_street?: string | null
          address_zip?: string | null
          birth_date?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          email?: string | null
          full_name?: string
          id?: string
          notes?: string | null
          phone?: string | null
          rg?: string | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
          whatsapp?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tutors_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      units: {
        Row: {
          address: string | null
          city: string | null
          created_at: string
          id: string
          is_active: boolean
          name: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          address?: string | null
          city?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          unit_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          unit_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role: "admin" | "funcionario" | "tutor"
      behavior_trait:
        | "sociavel"
        | "dominante"
        | "medroso"
        | "reativo"
        | "agressivo"
        | "ansioso"
      dog_sex: "macho" | "femea"
      dog_size: "mini" | "pequeno" | "medio" | "grande" | "gigante"
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
    Enums: {
      app_role: ["admin", "funcionario", "tutor"],
      behavior_trait: [
        "sociavel",
        "dominante",
        "medroso",
        "reativo",
        "agressivo",
        "ansioso",
      ],
      dog_sex: ["macho", "femea"],
      dog_size: ["mini", "pequeno", "medio", "grande", "gigante"],
    },
  },
} as const
