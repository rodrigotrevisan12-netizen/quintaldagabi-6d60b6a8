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
      arrival_notifications: {
        Row: {
          arrived_at: string | null
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          dog_id: string | null
          eta_minutes: number
          id: string
          message: string | null
          purpose: string
          status: string
          tutor_id: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          arrived_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          dog_id?: string | null
          eta_minutes: number
          id?: string
          message?: string | null
          purpose?: string
          status?: string
          tutor_id: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          arrived_at?: string | null
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          dog_id?: string | null
          eta_minutes?: number
          id?: string
          message?: string | null
          purpose?: string
          status?: string
          tutor_id?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "arrival_notifications_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_notifications_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "arrival_notifications_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_tutor_balances"
            referencedColumns: ["tutor_id"]
          },
          {
            foreignKeyName: "arrival_notifications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_belongings: {
        Row: {
          created_at: string
          id: string
          item: string
          notes: string | null
          quantity: number
          returned: boolean
          stay_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          item: string
          notes?: string | null
          quantity?: number
          returned?: boolean
          stay_id: string
        }
        Update: {
          created_at?: string
          id?: string
          item?: string
          notes?: string | null
          quantity?: number
          returned?: boolean
          stay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boarding_belongings_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "boarding_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_daily_logs: {
        Row: {
          created_at: string
          fed_ok: boolean
          id: string
          log_date: string
          medication_ok: boolean
          mood: string | null
          notes: string | null
          recorded_by: string | null
          stay_id: string
        }
        Insert: {
          created_at?: string
          fed_ok?: boolean
          id?: string
          log_date?: string
          medication_ok?: boolean
          mood?: string | null
          notes?: string | null
          recorded_by?: string | null
          stay_id: string
        }
        Update: {
          created_at?: string
          fed_ok?: boolean
          id?: string
          log_date?: string
          medication_ok?: boolean
          mood?: string | null
          notes?: string | null
          recorded_by?: string | null
          stay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boarding_daily_logs_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "boarding_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_food: {
        Row: {
          brand: string | null
          created_at: string
          id: string
          meals_per_day: number | null
          notes: string | null
          portion_g: number | null
          source: string
          stay_id: string
          total_amount_g: number | null
        }
        Insert: {
          brand?: string | null
          created_at?: string
          id?: string
          meals_per_day?: number | null
          notes?: string | null
          portion_g?: number | null
          source?: string
          stay_id: string
          total_amount_g?: number | null
        }
        Update: {
          brand?: string | null
          created_at?: string
          id?: string
          meals_per_day?: number | null
          notes?: string | null
          portion_g?: number | null
          source?: string
          stay_id?: string
          total_amount_g?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "boarding_food_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "boarding_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_medications: {
        Row: {
          created_at: string
          dose: string | null
          frequency: string | null
          id: string
          medication: string
          notes: string | null
          schedule: string | null
          stay_id: string
        }
        Insert: {
          created_at?: string
          dose?: string | null
          frequency?: string | null
          id?: string
          medication: string
          notes?: string | null
          schedule?: string | null
          stay_id: string
        }
        Update: {
          created_at?: string
          dose?: string | null
          frequency?: string | null
          id?: string
          medication?: string
          notes?: string | null
          schedule?: string | null
          stay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "boarding_medications_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "boarding_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      boarding_stays: {
        Row: {
          check_in_at: string
          check_in_by: string | null
          check_out_at: string | null
          check_out_by: string | null
          created_at: string
          daily_rate: number
          dog_id: string
          expected_check_out_at: string
          id: string
          kennel: string | null
          notes: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          check_in_at: string
          check_in_by?: string | null
          check_out_at?: string | null
          check_out_by?: string | null
          created_at?: string
          daily_rate?: number
          dog_id: string
          expected_check_out_at: string
          id?: string
          kennel?: string | null
          notes?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          check_in_at?: string
          check_in_by?: string | null
          check_out_at?: string | null
          check_out_by?: string | null
          created_at?: string
          daily_rate?: number
          dog_id?: string
          expected_check_out_at?: string
          id?: string
          kennel?: string | null
          notes?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "boarding_stays_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "boarding_stays_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_messages: {
        Row: {
          attachment_name: string | null
          attachment_url: string | null
          author_id: string
          body: string
          created_at: string
          id: string
        }
        Insert: {
          attachment_name?: string | null
          attachment_url?: string | null
          author_id: string
          body: string
          created_at?: string
          id?: string
        }
        Update: {
          attachment_name?: string | null
          attachment_url?: string | null
          author_id?: string
          body?: string
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      daily_report_entries: {
        Row: {
          created_at: string
          description: string
          entry_type: Database["public"]["Enums"]["report_entry_type"]
          id: string
          notes: string | null
          occurred_at: string
          report_id: string
        }
        Insert: {
          created_at?: string
          description: string
          entry_type: Database["public"]["Enums"]["report_entry_type"]
          id?: string
          notes?: string | null
          occurred_at?: string
          report_id: string
        }
        Update: {
          created_at?: string
          description?: string
          entry_type?: Database["public"]["Enums"]["report_entry_type"]
          id?: string
          notes?: string | null
          occurred_at?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_entries_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_report_media: {
        Row: {
          caption: string | null
          created_at: string
          id: string
          media_type: Database["public"]["Enums"]["report_media_type"]
          media_url: string
          report_id: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["report_media_type"]
          media_url: string
          report_id: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          id?: string
          media_type?: Database["public"]["Enums"]["report_media_type"]
          media_url?: string
          report_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_report_media_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "daily_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_reports: {
        Row: {
          author_id: string | null
          created_at: string
          date: string
          dog_id: string
          id: string
          published: boolean
          published_at: string | null
          stay_id: string | null
          stay_type: string | null
          summary: string | null
          updated_at: string
        }
        Insert: {
          author_id?: string | null
          created_at?: string
          date: string
          dog_id: string
          id?: string
          published?: boolean
          published_at?: string | null
          stay_id?: string | null
          stay_type?: string | null
          summary?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string | null
          created_at?: string
          date?: string
          dog_id?: string
          id?: string
          published?: boolean
          published_at?: string | null
          stay_id?: string | null
          stay_type?: string | null
          summary?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_reports_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_schedule_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          id: string
          item_id: string
          new_status: Database["public"]["Enums"]["schedule_status"]
          note: string | null
          previous_status: Database["public"]["Enums"]["schedule_status"] | null
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          item_id: string
          new_status: Database["public"]["Enums"]["schedule_status"]
          note?: string | null
          previous_status?:
            | Database["public"]["Enums"]["schedule_status"]
            | null
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          id?: string
          item_id?: string
          new_status?: Database["public"]["Enums"]["schedule_status"]
          note?: string | null
          previous_status?:
            | Database["public"]["Enums"]["schedule_status"]
            | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_schedule_history_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "daily_schedule_items"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_schedule_items: {
        Row: {
          activity: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          date: string
          description: string | null
          end_time: string | null
          id: string
          location: string | null
          not_done_reason: string | null
          notes: string | null
          requires_confirmation: boolean
          requires_photo: boolean
          responsible_id: string | null
          start_time: string
          status: Database["public"]["Enums"]["schedule_status"]
          updated_at: string
        }
        Insert: {
          activity: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          date: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          not_done_reason?: string | null
          notes?: string | null
          requires_confirmation?: boolean
          requires_photo?: boolean
          responsible_id?: string | null
          start_time: string
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
        }
        Update: {
          activity?: string
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          date?: string
          description?: string | null
          end_time?: string | null
          id?: string
          location?: string | null
          not_done_reason?: string | null
          notes?: string | null
          requires_confirmation?: boolean
          requires_photo?: boolean
          responsible_id?: string | null
          start_time?: string
          status?: Database["public"]["Enums"]["schedule_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_schedule_items_responsible_id_fkey"
            columns: ["responsible_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_schedule_participants: {
        Row: {
          created_at: string
          dog_id: string
          id: string
          item_id: string
        }
        Insert: {
          created_at?: string
          dog_id: string
          id?: string
          item_id: string
        }
        Update: {
          created_at?: string
          dog_id?: string
          id?: string
          item_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daily_schedule_participants_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daily_schedule_participants_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "daily_schedule_items"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_schedule_photos: {
        Row: {
          created_at: string
          id: string
          item_id: string
          photo_url: string
          uploaded_by: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          photo_url: string
          uploaded_by?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          photo_url?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daily_schedule_photos_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "daily_schedule_items"
            referencedColumns: ["id"]
          },
        ]
      }
      daycare_activities: {
        Row: {
          activity_type: Database["public"]["Enums"]["daycare_activity_type"]
          created_at: string
          duration_min: number | null
          id: string
          notes: string | null
          performed_at: string
          recorded_by: string | null
          stay_id: string
        }
        Insert: {
          activity_type: Database["public"]["Enums"]["daycare_activity_type"]
          created_at?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          performed_at?: string
          recorded_by?: string | null
          stay_id: string
        }
        Update: {
          activity_type?: Database["public"]["Enums"]["daycare_activity_type"]
          created_at?: string
          duration_min?: number | null
          id?: string
          notes?: string | null
          performed_at?: string
          recorded_by?: string | null
          stay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daycare_activities_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "daycare_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      daycare_feedings: {
        Row: {
          amount: string | null
          created_at: string
          fed_at: string
          feeding_type: Database["public"]["Enums"]["daycare_feeding_type"]
          id: string
          notes: string | null
          recorded_by: string | null
          stay_id: string
        }
        Insert: {
          amount?: string | null
          created_at?: string
          fed_at?: string
          feeding_type: Database["public"]["Enums"]["daycare_feeding_type"]
          id?: string
          notes?: string | null
          recorded_by?: string | null
          stay_id: string
        }
        Update: {
          amount?: string | null
          created_at?: string
          fed_at?: string
          feeding_type?: Database["public"]["Enums"]["daycare_feeding_type"]
          id?: string
          notes?: string | null
          recorded_by?: string | null
          stay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daycare_feedings_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "daycare_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      daycare_medications: {
        Row: {
          created_at: string
          dose: string | null
          given_at: string
          id: string
          medication: string
          notes: string | null
          recorded_by: string | null
          stay_id: string
        }
        Insert: {
          created_at?: string
          dose?: string | null
          given_at?: string
          id?: string
          medication: string
          notes?: string | null
          recorded_by?: string | null
          stay_id: string
        }
        Update: {
          created_at?: string
          dose?: string | null
          given_at?: string
          id?: string
          medication?: string
          notes?: string | null
          recorded_by?: string | null
          stay_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "daycare_medications_stay_id_fkey"
            columns: ["stay_id"]
            isOneToOne: false
            referencedRelation: "daycare_stays"
            referencedColumns: ["id"]
          },
        ]
      }
      daycare_packages: {
        Row: {
          created_at: string
          days_per_week: number
          extra_day_price: number
          id: string
          is_active: boolean
          monthly_price: number
          name: string
          unit_id: string | null
        }
        Insert: {
          created_at?: string
          days_per_week: number
          extra_day_price?: number
          id?: string
          is_active?: boolean
          monthly_price?: number
          name: string
          unit_id?: string | null
        }
        Update: {
          created_at?: string
          days_per_week?: number
          extra_day_price?: number
          id?: string
          is_active?: boolean
          monthly_price?: number
          name?: string
          unit_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "daycare_packages_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      daycare_stays: {
        Row: {
          check_in_at: string
          check_in_by: string | null
          check_out_at: string | null
          check_out_by: string | null
          created_at: string
          dog_id: string
          drop_off_person: string | null
          id: string
          notes: string | null
          pickup_person: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          check_in_at?: string
          check_in_by?: string | null
          check_out_at?: string | null
          check_out_by?: string | null
          created_at?: string
          dog_id: string
          drop_off_person?: string | null
          id?: string
          notes?: string | null
          pickup_person?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          check_in_at?: string
          check_in_by?: string | null
          check_out_at?: string | null
          check_out_by?: string | null
          created_at?: string
          dog_id?: string
          drop_off_person?: string | null
          id?: string
          notes?: string | null
          pickup_person?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "daycare_stays_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "daycare_stays_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      document_signatures: {
        Row: {
          document_id: string
          id: string
          ip_address: string | null
          method: Database["public"]["Enums"]["signature_method"]
          signature_data: string
          signed_at: string
          signer_email: string | null
          signer_name: string
          signer_role: Database["public"]["Enums"]["signer_role"]
          signer_user_id: string | null
          user_agent: string | null
        }
        Insert: {
          document_id: string
          id?: string
          ip_address?: string | null
          method: Database["public"]["Enums"]["signature_method"]
          signature_data: string
          signed_at?: string
          signer_email?: string | null
          signer_name: string
          signer_role: Database["public"]["Enums"]["signer_role"]
          signer_user_id?: string | null
          user_agent?: string | null
        }
        Update: {
          document_id?: string
          id?: string
          ip_address?: string | null
          method?: Database["public"]["Enums"]["signature_method"]
          signature_data?: string
          signed_at?: string
          signer_email?: string | null
          signer_name?: string
          signer_role?: Database["public"]["Enums"]["signer_role"]
          signer_user_id?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "document_signatures_document_id_fkey"
            columns: ["document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
      document_templates: {
        Row: {
          body: string
          created_at: string
          id: string
          is_active: boolean
          title: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
          version: number
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_active?: boolean
          title: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          version?: number
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_active?: boolean
          title?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
          version?: number
        }
        Relationships: []
      }
      documents: {
        Row: {
          body: string
          cancelled_at: string | null
          created_at: string
          created_by: string | null
          dog_id: string | null
          id: string
          package_info: Json | null
          pdf_path: string | null
          reference_id: string | null
          reference_table: string | null
          sign_token: string
          signed_at: string | null
          status: Database["public"]["Enums"]["document_status"]
          template_id: string | null
          title: string
          tutor_id: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at: string
        }
        Insert: {
          body: string
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          dog_id?: string | null
          id?: string
          package_info?: Json | null
          pdf_path?: string | null
          reference_id?: string | null
          reference_table?: string | null
          sign_token?: string
          signed_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          template_id?: string | null
          title: string
          tutor_id: string
          type: Database["public"]["Enums"]["document_type"]
          updated_at?: string
        }
        Update: {
          body?: string
          cancelled_at?: string | null
          created_at?: string
          created_by?: string | null
          dog_id?: string | null
          id?: string
          package_info?: Json | null
          pdf_path?: string | null
          reference_id?: string | null
          reference_table?: string | null
          sign_token?: string
          signed_at?: string | null
          status?: Database["public"]["Enums"]["document_status"]
          template_id?: string | null
          title?: string
          tutor_id?: string
          type?: Database["public"]["Enums"]["document_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "document_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_tutor_balances"
            referencedColumns: ["tutor_id"]
          },
        ]
      }
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
      dog_stories: {
        Row: {
          caption: string | null
          created_at: string
          created_by: string | null
          dog_id: string
          expires_at: string
          id: string
          media_type: string
          media_url: string
        }
        Insert: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          dog_id: string
          expires_at?: string
          id?: string
          media_type: string
          media_url: string
        }
        Update: {
          caption?: string | null
          created_at?: string
          created_by?: string | null
          dog_id?: string
          expires_at?: string
          id?: string
          media_type?: string
          media_url?: string
        }
        Relationships: [
          {
            foreignKeyName: "dog_stories_dog_id_fkey"
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
          card_photo_url: string | null
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
          card_photo_url?: string | null
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
          card_photo_url?: string | null
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
          daycare_package_id: string | null
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
          daycare_package_id?: string | null
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
          daycare_package_id?: string | null
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
            foreignKeyName: "dogs_daycare_package_id_fkey"
            columns: ["daycare_package_id"]
            isOneToOne: false
            referencedRelation: "daycare_packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dogs_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dogs_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_tutor_balances"
            referencedColumns: ["tutor_id"]
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
      employees: {
        Row: {
          active: boolean
          created_at: string
          email: string | null
          full_name: string
          hired_at: string | null
          id: string
          job_role: Database["public"]["Enums"]["employee_role"]
          notes: string | null
          permissions: Json
          phone: string | null
          salary: number | null
          unit_id: string | null
          updated_at: string
          user_id: string | null
          work_schedule: string | null
        }
        Insert: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name: string
          hired_at?: string | null
          id?: string
          job_role?: Database["public"]["Enums"]["employee_role"]
          notes?: string | null
          permissions?: Json
          phone?: string | null
          salary?: number | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
          work_schedule?: string | null
        }
        Update: {
          active?: boolean
          created_at?: string
          email?: string | null
          full_name?: string
          hired_at?: string | null
          id?: string
          job_role?: Database["public"]["Enums"]["employee_role"]
          notes?: string | null
          permissions?: Json
          phone?: string | null
          salary?: number | null
          unit_id?: string | null
          updated_at?: string
          user_id?: string | null
          work_schedule?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employees_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_transactions: {
        Row: {
          amount: number
          created_at: string
          created_by: string | null
          description: string
          due_date: string | null
          expense_category:
            | Database["public"]["Enums"]["fin_expense_category"]
            | null
          id: string
          kind: Database["public"]["Enums"]["fin_kind"]
          notes: string | null
          paid_at: string | null
          payment_method: string | null
          reference_id: string | null
          reference_month: string | null
          reference_type: string | null
          revenue_category:
            | Database["public"]["Enums"]["fin_revenue_category"]
            | null
          status: Database["public"]["Enums"]["fin_status"]
          tutor_id: string | null
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by?: string | null
          description: string
          due_date?: string | null
          expense_category?:
            | Database["public"]["Enums"]["fin_expense_category"]
            | null
          id?: string
          kind: Database["public"]["Enums"]["fin_kind"]
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reference_id?: string | null
          reference_month?: string | null
          reference_type?: string | null
          revenue_category?:
            | Database["public"]["Enums"]["fin_revenue_category"]
            | null
          status?: Database["public"]["Enums"]["fin_status"]
          tutor_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string | null
          description?: string
          due_date?: string | null
          expense_category?:
            | Database["public"]["Enums"]["fin_expense_category"]
            | null
          id?: string
          kind?: Database["public"]["Enums"]["fin_kind"]
          notes?: string | null
          paid_at?: string | null
          payment_method?: string | null
          reference_id?: string | null
          reference_month?: string | null
          reference_type?: string | null
          revenue_category?:
            | Database["public"]["Enums"]["fin_revenue_category"]
            | null
          status?: Database["public"]["Enums"]["fin_status"]
          tutor_id?: string | null
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "financial_transactions_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "tutors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_transactions_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_tutor_balances"
            referencedColumns: ["tutor_id"]
          },
          {
            foreignKeyName: "financial_transactions_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      grooming_appointment_services: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          price: number
          service_id: string
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          price?: number
          service_id: string
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          price?: number
          service_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "grooming_appointment_services_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "grooming_appointments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grooming_appointment_services_service_id_fkey"
            columns: ["service_id"]
            isOneToOne: false
            referencedRelation: "grooming_services"
            referencedColumns: ["id"]
          },
        ]
      }
      grooming_appointments: {
        Row: {
          created_at: string
          dog_id: string
          duration_min: number
          finished_at: string | null
          groomer_id: string | null
          id: string
          notes: string | null
          scheduled_at: string
          started_at: string | null
          status: Database["public"]["Enums"]["grooming_status"]
          total_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          dog_id: string
          duration_min?: number
          finished_at?: string | null
          groomer_id?: string | null
          id?: string
          notes?: string | null
          scheduled_at: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["grooming_status"]
          total_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          dog_id?: string
          duration_min?: number
          finished_at?: string | null
          groomer_id?: string | null
          id?: string
          notes?: string | null
          scheduled_at?: string
          started_at?: string | null
          status?: Database["public"]["Enums"]["grooming_status"]
          total_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "grooming_appointments_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "grooming_appointments_groomer_id_fkey"
            columns: ["groomer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      grooming_photos: {
        Row: {
          appointment_id: string
          created_at: string
          id: string
          moment: Database["public"]["Enums"]["grooming_photo_moment"]
          storage_path: string
          uploaded_by: string | null
        }
        Insert: {
          appointment_id: string
          created_at?: string
          id?: string
          moment: Database["public"]["Enums"]["grooming_photo_moment"]
          storage_path: string
          uploaded_by?: string | null
        }
        Update: {
          appointment_id?: string
          created_at?: string
          id?: string
          moment?: Database["public"]["Enums"]["grooming_photo_moment"]
          storage_path?: string
          uploaded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "grooming_photos_appointment_id_fkey"
            columns: ["appointment_id"]
            isOneToOne: false
            referencedRelation: "grooming_appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      grooming_services: {
        Row: {
          base_price: number
          created_at: string
          duration_min: number
          id: string
          is_active: boolean
          name: string
          updated_at: string
        }
        Insert: {
          base_price?: number
          created_at?: string
          duration_min?: number
          id?: string
          is_active?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          base_price?: number
          created_at?: string
          duration_min?: number
          id?: string
          is_active?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      internal_communication_attachments: {
        Row: {
          comm_id: string
          created_at: string
          file_name: string | null
          file_url: string
          id: string
          mime_type: string | null
        }
        Insert: {
          comm_id: string
          created_at?: string
          file_name?: string | null
          file_url: string
          id?: string
          mime_type?: string | null
        }
        Update: {
          comm_id?: string
          created_at?: string
          file_name?: string | null
          file_url?: string
          id?: string
          mime_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "internal_communication_attachments_comm_id_fkey"
            columns: ["comm_id"]
            isOneToOne: false
            referencedRelation: "internal_communications"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_communication_reads: {
        Row: {
          comm_id: string
          id: string
          read_at: string
          user_id: string
        }
        Insert: {
          comm_id: string
          id?: string
          read_at?: string
          user_id: string
        }
        Update: {
          comm_id?: string
          id?: string
          read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_communication_reads_comm_id_fkey"
            columns: ["comm_id"]
            isOneToOne: false
            referencedRelation: "internal_communications"
            referencedColumns: ["id"]
          },
        ]
      }
      internal_communications: {
        Row: {
          author_id: string
          body: string
          comm_type: Database["public"]["Enums"]["comm_type"]
          created_at: string
          id: string
          is_broadcast: boolean
          priority: string
          recipient_id: string | null
          status: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          comm_type: Database["public"]["Enums"]["comm_type"]
          created_at?: string
          id?: string
          is_broadcast?: boolean
          priority?: string
          recipient_id?: string | null
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          comm_type?: Database["public"]["Enums"]["comm_type"]
          created_at?: string
          id?: string
          is_broadcast?: boolean
          priority?: string
          recipient_id?: string | null
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "internal_communications_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      occurrences: {
        Row: {
          category: string
          created_at: string
          created_by: string | null
          description: string
          dog_id: string | null
          id: string
          occurred_at: string
          resolution_notes: string | null
          resolved: boolean
          severity: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string
          created_at?: string
          created_by?: string | null
          description: string
          dog_id?: string | null
          id?: string
          occurred_at?: string
          resolution_notes?: string | null
          resolved?: boolean
          severity?: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string
          created_at?: string
          created_by?: string | null
          description?: string
          dog_id?: string | null
          id?: string
          occurred_at?: string
          resolution_notes?: string | null
          resolved?: boolean
          severity?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "occurrences_dog_id_fkey"
            columns: ["dog_id"]
            isOneToOne: false
            referencedRelation: "dogs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "occurrences_unit_id_fkey"
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
          must_set_password: boolean
          phone: string | null
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          default_unit_id?: string | null
          full_name?: string | null
          id: string
          must_set_password?: boolean
          phone?: string | null
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          default_unit_id?: string | null
          full_name?: string | null
          id?: string
          must_set_password?: boolean
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
      receipts: {
        Row: {
          amount: number
          created_at: string
          description: string
          id: string
          issued_at: string
          issued_by: string | null
          number: string
          payer_document: string | null
          payer_name: string
          transaction_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          description: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          number: string
          payer_document?: string | null
          payer_name: string
          transaction_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          description?: string
          id?: string
          issued_at?: string
          issued_by?: string | null
          number?: string
          payer_document?: string | null
          payer_name?: string
          transaction_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "receipts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "financial_transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          completed_at: string | null
          created_at: string
          created_by: string | null
          description: string | null
          due_date: string | null
          id: string
          priority: string
          status: string
          title: string
          unit_id: string | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title: string
          unit_id?: string | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          completed_at?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          priority?: string
          status?: string
          title?: string
          unit_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: false
            referencedRelation: "units"
            referencedColumns: ["id"]
          },
        ]
      }
      training_courses: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_onboarding: boolean
          order_index: number
          required: boolean
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_onboarding?: boolean
          order_index?: number
          required?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_onboarding?: boolean
          order_index?: number
          required?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      training_materials: {
        Row: {
          content: string | null
          course_id: string
          created_at: string
          file_url: string | null
          id: string
          material_type: Database["public"]["Enums"]["training_material_type"]
          order_index: number
          title: string
          updated_at: string
        }
        Insert: {
          content?: string | null
          course_id: string
          created_at?: string
          file_url?: string | null
          id?: string
          material_type: Database["public"]["Enums"]["training_material_type"]
          order_index?: number
          title: string
          updated_at?: string
        }
        Update: {
          content?: string | null
          course_id?: string
          created_at?: string
          file_url?: string | null
          id?: string
          material_type?: Database["public"]["Enums"]["training_material_type"]
          order_index?: number
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_materials_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
            referencedColumns: ["id"]
          },
        ]
      }
      training_progress: {
        Row: {
          certificate_code: string | null
          certificate_issued: boolean
          completed: boolean
          completed_at: string | null
          course_id: string
          created_at: string
          feedback: string | null
          id: string
          rating: number | null
          updated_at: string
          user_id: string
          views: number
        }
        Insert: {
          certificate_code?: string | null
          certificate_issued?: boolean
          completed?: boolean
          completed_at?: string | null
          course_id: string
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          updated_at?: string
          user_id: string
          views?: number
        }
        Update: {
          certificate_code?: string | null
          certificate_issued?: boolean
          completed?: boolean
          completed_at?: string | null
          course_id?: string
          created_at?: string
          feedback?: string | null
          id?: string
          rating?: number | null
          updated_at?: string
          user_id?: string
          views?: number
        }
        Relationships: [
          {
            foreignKeyName: "training_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "training_courses"
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
          {
            foreignKeyName: "tutor_authorized_pickups_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_tutor_balances"
            referencedColumns: ["tutor_id"]
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
          {
            foreignKeyName: "tutor_emergency_contacts_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_tutor_balances"
            referencedColumns: ["tutor_id"]
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
      unit_settings: {
        Row: {
          boarding_capacity: number
          created_at: string
          daycare_capacity: number
          daycare_daily_rate: number | null
          unit_id: string
          updated_at: string
        }
        Insert: {
          boarding_capacity?: number
          created_at?: string
          daycare_capacity?: number
          daycare_daily_rate?: number | null
          unit_id: string
          updated_at?: string
        }
        Update: {
          boarding_capacity?: number
          created_at?: string
          daycare_capacity?: number
          daycare_daily_rate?: number | null
          unit_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "unit_settings_unit_id_fkey"
            columns: ["unit_id"]
            isOneToOne: true
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
      dog_timeline_events: {
        Row: {
          dog_id: string | null
          event_at: string | null
          event_type: string | null
          payload: Json | null
          summary: string | null
        }
        Relationships: []
      }
      v_health_alerts: {
        Row: {
          days_remaining: number | null
          dog_id: string | null
          dog_name: string | null
          item: string | null
          kind: string | null
          next_due_date: string | null
          record_id: string | null
          status: string | null
          tutor_id: string | null
          tutor_name: string | null
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
            foreignKeyName: "dogs_tutor_id_fkey"
            columns: ["tutor_id"]
            isOneToOne: false
            referencedRelation: "v_tutor_balances"
            referencedColumns: ["tutor_id"]
          },
        ]
      }
      v_tutor_balances: {
        Row: {
          full_name: string | null
          last_due: string | null
          open_amount: number | null
          open_count: number | null
          tutor_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      default_unit_id: { Args: never; Returns: string }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      tutor_of_dog: { Args: { _dog_id: string }; Returns: string }
      upsert_service_charge: {
        Args: {
          _amount: number
          _category: Database["public"]["Enums"]["fin_revenue_category"]
          _description: string
          _due: string
          _ref_id: string
          _ref_type: string
          _tutor_id: string
          _unit_id: string
        }
        Returns: undefined
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
      comm_type:
        | "aviso"
        | "comunicado"
        | "solicitacao"
        | "ocorrencia"
        | "mensagem"
      daycare_activity_type:
        | "passeio"
        | "brincadeira"
        | "soneca"
        | "socializacao"
        | "treino"
        | "outra"
      daycare_feeding_type: "racao" | "petisco" | "umida" | "agua" | "outra"
      document_status: "draft" | "pending_signature" | "signed" | "cancelled"
      document_type:
        | "contrato_creche"
        | "contrato_hospedagem"
        | "contrato_banho_tosa"
        | "termo_responsabilidade"
        | "autorizacao_imagem"
        | "autorizacao_atendimento_veterinario"
        | "autorizacao_medicamentos"
      dog_sex: "macho" | "femea"
      dog_size: "mini" | "pequeno" | "medio" | "grande" | "gigante"
      employee_role:
        | "tosador"
        | "banhista"
        | "recepcionista"
        | "cuidador"
        | "gerente"
        | "veterinario"
        | "outro"
      fin_expense_category:
        | "salarios"
        | "produtos"
        | "aluguel"
        | "agua"
        | "energia"
        | "veterinario"
        | "outros"
        | "internet"
        | "contabilidade"
        | "sistema"
        | "marketing"
        | "pro_labore"
        | "seguros"
        | "impostos"
        | "outras_fixas"
        | "racao"
        | "petiscos"
        | "shampoo"
        | "condicionador"
        | "produtos_limpeza"
        | "medicamentos"
        | "lavanderia"
        | "materiais_descartaveis"
        | "outros_insumos"
      fin_kind: "receita" | "despesa"
      fin_revenue_category:
        | "creche"
        | "hospedagem"
        | "banho_tosa"
        | "outros_servicos"
      fin_status: "pendente" | "pago" | "recebido" | "cancelado" | "vencido"
      grooming_photo_moment: "before" | "after"
      grooming_status:
        | "scheduled"
        | "in_progress"
        | "done"
        | "cancelled"
        | "no_show"
      report_entry_type:
        | "alimentacao"
        | "hidratacao"
        | "brincadeira"
        | "passeio"
        | "descanso"
        | "comportamento"
      report_media_type: "photo" | "video"
      schedule_status: "pending" | "done" | "not_done"
      signature_method: "typed" | "drawn"
      signer_role: "admin" | "tutor"
      training_material_type:
        | "video"
        | "pdf"
        | "procedimento"
        | "checklist"
        | "foto"
        | "link"
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
      comm_type: [
        "aviso",
        "comunicado",
        "solicitacao",
        "ocorrencia",
        "mensagem",
      ],
      daycare_activity_type: [
        "passeio",
        "brincadeira",
        "soneca",
        "socializacao",
        "treino",
        "outra",
      ],
      daycare_feeding_type: ["racao", "petisco", "umida", "agua", "outra"],
      document_status: ["draft", "pending_signature", "signed", "cancelled"],
      document_type: [
        "contrato_creche",
        "contrato_hospedagem",
        "contrato_banho_tosa",
        "termo_responsabilidade",
        "autorizacao_imagem",
        "autorizacao_atendimento_veterinario",
        "autorizacao_medicamentos",
      ],
      dog_sex: ["macho", "femea"],
      dog_size: ["mini", "pequeno", "medio", "grande", "gigante"],
      employee_role: [
        "tosador",
        "banhista",
        "recepcionista",
        "cuidador",
        "gerente",
        "veterinario",
        "outro",
      ],
      fin_expense_category: [
        "salarios",
        "produtos",
        "aluguel",
        "agua",
        "energia",
        "veterinario",
        "outros",
        "internet",
        "contabilidade",
        "sistema",
        "marketing",
        "pro_labore",
        "seguros",
        "impostos",
        "outras_fixas",
        "racao",
        "petiscos",
        "shampoo",
        "condicionador",
        "produtos_limpeza",
        "medicamentos",
        "lavanderia",
        "materiais_descartaveis",
        "outros_insumos",
      ],
      fin_kind: ["receita", "despesa"],
      fin_revenue_category: [
        "creche",
        "hospedagem",
        "banho_tosa",
        "outros_servicos",
      ],
      fin_status: ["pendente", "pago", "recebido", "cancelado", "vencido"],
      grooming_photo_moment: ["before", "after"],
      grooming_status: [
        "scheduled",
        "in_progress",
        "done",
        "cancelled",
        "no_show",
      ],
      report_entry_type: [
        "alimentacao",
        "hidratacao",
        "brincadeira",
        "passeio",
        "descanso",
        "comportamento",
      ],
      report_media_type: ["photo", "video"],
      schedule_status: ["pending", "done", "not_done"],
      signature_method: ["typed", "drawn"],
      signer_role: ["admin", "tutor"],
      training_material_type: [
        "video",
        "pdf",
        "procedimento",
        "checklist",
        "foto",
        "link",
      ],
    },
  },
} as const
