export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      accounts: {
        Row: {
          annual_revenue: number | null
          billing_city: string | null
          billing_country: string | null
          billing_postal_code: string | null
          billing_state: string | null
          billing_street: string | null
          created_at: string | null
          custom_fields: Json | null
          deleted_at: string | null
          description: string | null
          domain: string | null
          employee_count: number | null
          id: string
          industry: Database["public"]["Enums"]["industry_enum"] | null
          lead_source: Database["public"]["Enums"]["lead_source_enum"] | null
          name: string
          organization_id: string
          owner_id: string
          shipping_city: string | null
          shipping_country: string | null
          shipping_postal_code: string | null
          shipping_state: string | null
          shipping_street: string | null
          status: Database["public"]["Enums"]["account_status_enum"] | null
          tags: string[] | null
          updated_at: string | null
          website: string | null
        }
        Insert: {
          annual_revenue?: number | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          billing_street?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_enum"] | null
          lead_source?: Database["public"]["Enums"]["lead_source_enum"] | null
          name: string
          organization_id: string
          owner_id: string
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          status?: Database["public"]["Enums"]["account_status_enum"] | null
          tags?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Update: {
          annual_revenue?: number | null
          billing_city?: string | null
          billing_country?: string | null
          billing_postal_code?: string | null
          billing_state?: string | null
          billing_street?: string | null
          created_at?: string | null
          custom_fields?: Json | null
          deleted_at?: string | null
          description?: string | null
          domain?: string | null
          employee_count?: number | null
          id?: string
          industry?: Database["public"]["Enums"]["industry_enum"] | null
          lead_source?: Database["public"]["Enums"]["lead_source_enum"] | null
          name?: string
          organization_id?: string
          owner_id?: string
          shipping_city?: string | null
          shipping_country?: string | null
          shipping_postal_code?: string | null
          shipping_state?: string | null
          shipping_street?: string | null
          status?: Database["public"]["Enums"]["account_status_enum"] | null
          tags?: string[] | null
          updated_at?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "accounts_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      activities: {
        Row: {
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          id: string
          location: string | null
          organization_id: string
          priority: string | null
          scheduled_datetime: string | null
          status: string
          subject: string
          type: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          organization_id: string
          priority?: string | null
          scheduled_datetime?: string | null
          status?: string
          subject: string
          type: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string | null
          deal_id?: string | null
          deleted_at?: string | null
          description?: string | null
          duration_minutes?: number | null
          id?: string
          location?: string | null
          organization_id?: string
          priority?: string | null
          scheduled_datetime?: string | null
          status?: string
          subject?: string
          type?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "active_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "active_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_insights: {
        Row: {
          action_taken: string | null
          confidence_score: number | null
          content: string
          created_at: string | null
          created_for: string
          data: Json | null
          deleted_at: string | null
          id: string
          is_dismissed: boolean | null
          is_read: boolean | null
          model_used: string | null
          organization_id: string
          related_id: string
          related_type: string
          source_data: Json | null
          title: string
          type: Database["public"]["Enums"]["ai_insight_type_enum"]
          updated_at: string | null
        }
        Insert: {
          action_taken?: string | null
          confidence_score?: number | null
          content: string
          created_at?: string | null
          created_for: string
          data?: Json | null
          deleted_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          model_used?: string | null
          organization_id: string
          related_id: string
          related_type: string
          source_data?: Json | null
          title: string
          type: Database["public"]["Enums"]["ai_insight_type_enum"]
          updated_at?: string | null
        }
        Update: {
          action_taken?: string | null
          confidence_score?: number | null
          content?: string
          created_at?: string | null
          created_for?: string
          data?: Json | null
          deleted_at?: string | null
          id?: string
          is_dismissed?: boolean | null
          is_read?: boolean | null
          model_used?: string | null
          organization_id?: string
          related_id?: string
          related_type?: string
          source_data?: Json | null
          title?: string
          type?: Database["public"]["Enums"]["ai_insight_type_enum"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_insights_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          department: string | null
          display_name: string
          email: string | null
          engagement_score: number | null
          first_name: string
          id: string
          last_name: string
          mobile_phone: string | null
          organization_id: string
          phone: string | null
          status: string
          title: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          display_name: string
          email?: string | null
          engagement_score?: number | null
          first_name: string
          id?: string
          last_name: string
          mobile_phone?: string | null
          organization_id: string
          phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          display_name?: string
          email?: string | null
          engagement_score?: number | null
          first_name?: string
          id?: string
          last_name?: string
          mobile_phone?: string | null
          organization_id?: string
          phone?: string | null
          status?: string
          title?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      deal_contacts: {
        Row: {
          contact_id: string
          created_at: string | null
          deal_id: string
          id: string
          is_primary: boolean | null
          role: string | null
        }
        Insert: {
          contact_id: string
          created_at?: string | null
          deal_id: string
          id?: string
          is_primary?: boolean | null
          role?: string | null
        }
        Update: {
          contact_id?: string
          created_at?: string | null
          deal_id?: string
          id?: string
          is_primary?: boolean | null
          role?: string | null
        }
        Relationships: []
      }
      deals: {
        Row: {
          actual_close_date: string | null
          amount: number | null
          coaching_notes: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          expected_close_date: string | null
          id: string
          name: string
          next_steps: string | null
          organization_id: string
          pipeline_stage_id: string | null
          primary_contact_id: string | null
          priority: string | null
          probability: number | null
          risk_score: number | null
          status: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          actual_close_date?: string | null
          amount?: number | null
          coaching_notes?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          name: string
          next_steps?: string | null
          organization_id: string
          pipeline_stage_id?: string | null
          primary_contact_id?: string | null
          priority?: string | null
          probability?: number | null
          risk_score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          actual_close_date?: string | null
          amount?: number | null
          coaching_notes?: string | null
          created_at?: string | null
          currency?: string | null
          deleted_at?: string | null
          description?: string | null
          expected_close_date?: string | null
          id?: string
          name?: string
          next_steps?: string | null
          organization_id?: string
          pipeline_stage_id?: string | null
          primary_contact_id?: string | null
          priority?: string | null
          probability?: number | null
          risk_score?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "active_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      email_integrations: {
        Row: {
          access_token_encrypted: string | null
          auto_sync_enabled: boolean | null
          created_at: string | null
          email_address: string
          id: string
          last_sync_at: string | null
          organization_id: string
          provider: string
          refresh_token_encrypted: string | null
          status: Database["public"]["Enums"]["integration_status_enum"] | null
          sync_cursor: string | null
          sync_errors: Json | null
          sync_frequency_minutes: number | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          access_token_encrypted?: string | null
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          email_address: string
          id?: string
          last_sync_at?: string | null
          organization_id: string
          provider: string
          refresh_token_encrypted?: string | null
          status?: Database["public"]["Enums"]["integration_status_enum"] | null
          sync_cursor?: string | null
          sync_errors?: Json | null
          sync_frequency_minutes?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          access_token_encrypted?: string | null
          auto_sync_enabled?: boolean | null
          created_at?: string | null
          email_address?: string
          id?: string
          last_sync_at?: string | null
          organization_id?: string
          provider?: string
          refresh_token_encrypted?: string | null
          status?: Database["public"]["Enums"]["integration_status_enum"] | null
          sync_cursor?: string | null
          sync_errors?: Json | null
          sync_frequency_minutes?: number | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_integrations_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      files: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          description: string | null
          file_size: number
          file_type: Database["public"]["Enums"]["file_type_enum"]
          filename: string
          id: string
          is_public: boolean | null
          mime_type: string
          organization_id: string
          original_filename: string
          related_id: string | null
          related_type: string | null
          storage_bucket: string
          storage_path: string
          tags: string[] | null
          updated_at: string | null
          uploaded_by: string
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          file_size: number
          file_type: Database["public"]["Enums"]["file_type_enum"]
          filename: string
          id?: string
          is_public?: boolean | null
          mime_type: string
          organization_id: string
          original_filename: string
          related_id?: string | null
          related_type?: string | null
          storage_bucket?: string
          storage_path: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by: string
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          description?: string | null
          file_size?: number
          file_type?: Database["public"]["Enums"]["file_type_enum"]
          filename?: string
          id?: string
          is_public?: boolean | null
          mime_type?: string
          organization_id?: string
          original_filename?: string
          related_id?: string | null
          related_type?: string | null
          storage_bucket?: string
          storage_path?: string
          tags?: string[] | null
          updated_at?: string | null
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "files_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          message: string
          organization_id: string
          read_at: string | null
          related_id: string | null
          related_type: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type_enum"]
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message: string
          organization_id: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title: string
          type: Database["public"]["Enums"]["notification_type_enum"]
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          message?: string
          organization_id?: string
          read_at?: string | null
          related_id?: string | null
          related_type?: string | null
          title?: string
          type?: Database["public"]["Enums"]["notification_type_enum"]
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      objections: {
        Row: {
          activity_id: string | null
          actual_response_used: string | null
          ai_response: string | null
          category: string | null
          confidence_score: number | null
          contact_id: string | null
          created_at: string | null
          created_by: string
          deal_id: string | null
          deleted_at: string | null
          id: string
          objection_text: string
          organization_id: string
          suggested_approach: string | null
          updated_at: string | null
          user_feedback: string | null
          was_helpful: boolean | null
        }
        Insert: {
          activity_id?: string | null
          actual_response_used?: string | null
          ai_response?: string | null
          category?: string | null
          confidence_score?: number | null
          contact_id?: string | null
          created_at?: string | null
          created_by: string
          deal_id?: string | null
          deleted_at?: string | null
          id?: string
          objection_text: string
          organization_id: string
          suggested_approach?: string | null
          updated_at?: string | null
          user_feedback?: string | null
          was_helpful?: boolean | null
        }
        Update: {
          activity_id?: string | null
          actual_response_used?: string | null
          ai_response?: string | null
          category?: string | null
          confidence_score?: number | null
          contact_id?: string | null
          created_at?: string | null
          created_by?: string
          deal_id?: string | null
          deleted_at?: string | null
          id?: string
          objection_text?: string
          organization_id?: string
          suggested_approach?: string | null
          updated_at?: string | null
          user_feedback?: string | null
          was_helpful?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "objections_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          domain: string | null
          id: string
          name: string
          settings: Json | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          domain?: string | null
          id?: string
          name: string
          settings?: Json | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          domain?: string | null
          id?: string
          name?: string
          settings?: Json | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      pipeline_stages: {
        Row: {
          color: string | null
          created_at: string | null
          deleted_at: string | null
          id: string
          is_final: boolean | null
          is_won: boolean | null
          name: string
          pipeline_id: string
          position: number
          probability: number | null
          updated_at: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_final?: boolean | null
          is_won?: boolean | null
          name: string
          pipeline_id: string
          position?: number
          probability?: number | null
          updated_at?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string | null
          deleted_at?: string | null
          id?: string
          is_final?: boolean | null
          is_won?: boolean | null
          name?: string
          pipeline_id?: string
          position?: number
          probability?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipeline_stages_pipeline_id_fkey"
            columns: ["pipeline_id"]
            isOneToOne: false
            referencedRelation: "pipelines"
            referencedColumns: ["id"]
          },
        ]
      }
      pipelines: {
        Row: {
          created_at: string | null
          created_by: string
          deleted_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_default: boolean | null
          name: string
          organization_id: string
          position: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          created_by: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name: string
          organization_id: string
          position?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string
          deleted_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_default?: boolean | null
          name?: string
          organization_id?: string
          position?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "pipelines_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          deleted_at: string | null
          display_name: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          last_name: string
          organization_id: string
          phone: string | null
          preferences: Json | null
          role: Database["public"]["Enums"]["user_role_enum"]
          timezone: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email: string
          first_name: string
          id: string
          is_active?: boolean | null
          last_login?: string | null
          last_name: string
          organization_id: string
          phone?: string | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role_enum"]
          timezone?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          deleted_at?: string | null
          display_name?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          last_name?: string
          organization_id?: string
          phone?: string | null
          preferences?: Json | null
          role?: Database["public"]["Enums"]["user_role_enum"]
          timezone?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "user_profiles_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      active_contacts: {
        Row: {
          created_at: string | null
          deleted_at: string | null
          department: string | null
          display_name: string | null
          email: string | null
          engagement_score: number | null
          first_name: string | null
          id: string | null
          last_name: string | null
          mobile_phone: string | null
          organization_id: string | null
          phone: string | null
          status: string | null
          title: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          engagement_score?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          mobile_phone?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          deleted_at?: string | null
          department?: string | null
          display_name?: string | null
          email?: string | null
          engagement_score?: number | null
          first_name?: string | null
          id?: string | null
          last_name?: string | null
          mobile_phone?: string | null
          organization_id?: string | null
          phone?: string | null
          status?: string | null
          title?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      active_deals: {
        Row: {
          actual_close_date: string | null
          amount: number | null
          coaching_notes: string | null
          created_at: string | null
          currency: string | null
          deleted_at: string | null
          description: string | null
          email: string | null
          expected_close_date: string | null
          first_name: string | null
          id: string | null
          last_name: string | null
          name: string | null
          next_steps: string | null
          organization_id: string | null
          primary_contact_id: string | null
          priority: string | null
          probability: number | null
          risk_score: number | null
          status: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "deals_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "active_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "deals_primary_contact_id_fkey"
            columns: ["primary_contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      upcoming_activities: {
        Row: {
          contact_id: string | null
          created_at: string | null
          deal_id: string | null
          deal_name: string | null
          deleted_at: string | null
          description: string | null
          duration_minutes: number | null
          first_name: string | null
          id: string | null
          last_name: string | null
          location: string | null
          organization_id: string | null
          priority: string | null
          scheduled_datetime: string | null
          status: string | null
          subject: string | null
          type: string | null
          updated_at: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "active_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "active_deals"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activities_deal_id_fkey"
            columns: ["deal_id"]
            isOneToOne: false
            referencedRelation: "deals"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      account_status_enum:
        | "active"
        | "inactive"
        | "prospect"
        | "customer"
        | "partner"
        | "competitor"
      activity_status_enum:
        | "pending"
        | "completed"
        | "cancelled"
        | "in_progress"
      activity_type_enum:
        | "email"
        | "call"
        | "meeting"
        | "note"
        | "task"
        | "follow_up"
        | "demo"
        | "presentation"
        | "proposal_sent"
        | "contract_sent"
        | "other"
      ai_insight_type_enum:
        | "persona_analysis"
        | "deal_coaching"
        | "objection_handling"
        | "win_loss_analysis"
        | "next_best_action"
        | "engagement_score"
        | "sentiment_analysis"
        | "risk_assessment"
      contact_status_enum:
        | "active"
        | "inactive"
        | "qualified"
        | "unqualified"
        | "do_not_contact"
      deal_stage_enum:
        | "lead"
        | "prospect"
        | "discovery"
        | "demo"
        | "proposal"
        | "negotiation"
        | "closed_won"
        | "closed_lost"
      deal_status_enum: "open" | "won" | "lost" | "on_hold" | "cancelled"
      file_type_enum:
        | "document"
        | "image"
        | "video"
        | "audio"
        | "spreadsheet"
        | "presentation"
        | "other"
      industry_enum:
        | "technology"
        | "healthcare"
        | "finance"
        | "education"
        | "retail"
        | "manufacturing"
        | "consulting"
        | "real_estate"
        | "media"
        | "government"
        | "non_profit"
        | "other"
      integration_status_enum:
        | "connected"
        | "disconnected"
        | "error"
        | "pending"
      lead_source_enum:
        | "website"
        | "email_campaign"
        | "social_media"
        | "referral"
        | "cold_call"
        | "trade_show"
        | "partner"
        | "other"
      notification_type_enum:
        | "deal_update"
        | "activity_reminder"
        | "ai_insight"
        | "system_alert"
        | "integration_error"
      priority_enum: "low" | "medium" | "high" | "urgent"
      user_role_enum: "admin" | "manager" | "sales_rep" | "support" | "viewer"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DefaultSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? (Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      Database[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
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
    | { schema: keyof Database },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof Database }
  ? Database[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      account_status_enum: [
        "active",
        "inactive",
        "prospect",
        "customer",
        "partner",
        "competitor",
      ],
      activity_status_enum: [
        "pending",
        "completed",
        "cancelled",
        "in_progress",
      ],
      activity_type_enum: [
        "email",
        "call",
        "meeting",
        "note",
        "task",
        "follow_up",
        "demo",
        "presentation",
        "proposal_sent",
        "contract_sent",
        "other",
      ],
      ai_insight_type_enum: [
        "persona_analysis",
        "deal_coaching",
        "objection_handling",
        "win_loss_analysis",
        "next_best_action",
        "engagement_score",
        "sentiment_analysis",
        "risk_assessment",
      ],
      contact_status_enum: [
        "active",
        "inactive",
        "qualified",
        "unqualified",
        "do_not_contact",
      ],
      deal_stage_enum: [
        "lead",
        "prospect",
        "discovery",
        "demo",
        "proposal",
        "negotiation",
        "closed_won",
        "closed_lost",
      ],
      deal_status_enum: ["open", "won", "lost", "on_hold", "cancelled"],
      file_type_enum: [
        "document",
        "image",
        "video",
        "audio",
        "spreadsheet",
        "presentation",
        "other",
      ],
      industry_enum: [
        "technology",
        "healthcare",
        "finance",
        "education",
        "retail",
        "manufacturing",
        "consulting",
        "real_estate",
        "media",
        "government",
        "non_profit",
        "other",
      ],
      integration_status_enum: [
        "connected",
        "disconnected",
        "error",
        "pending",
      ],
      lead_source_enum: [
        "website",
        "email_campaign",
        "social_media",
        "referral",
        "cold_call",
        "trade_show",
        "partner",
        "other",
      ],
      notification_type_enum: [
        "deal_update",
        "activity_reminder",
        "ai_insight",
        "system_alert",
        "integration_error",
      ],
      priority_enum: ["low", "medium", "high", "urgent"],
      user_role_enum: ["admin", "manager", "sales_rep", "support", "viewer"],
    },
  },
} as const
