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
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      admin_invites: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          id: string
          invited_by: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          id?: string
          invited_by: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          id?: string
          invited_by?: string
        }
        Relationships: []
      }
      admin_users: {
        Row: {
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          ai_summary: string | null
          author_image: string | null
          author_image_alt: string | null
          author_name: string | null
          category: string
          content: string
          cover_image: string | null
          cover_image_alt: string | null
          created_at: string
          draft_page_rows: Json | null
          excerpt: string | null
          id: string
          lead_magnet_asset_id: string | null
          lead_magnet_cover_id: string | null
          meta_description: string | null
          meta_title: string | null
          og_image: string | null
          og_image_alt: string | null
          page_rows: Json
          published_at: string | null
          slug: string
          status: string
          tags: string[] | null
          title: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          author_image?: string | null
          author_image_alt?: string | null
          author_name?: string | null
          category?: string
          content?: string
          cover_image?: string | null
          cover_image_alt?: string | null
          created_at?: string
          draft_page_rows?: Json | null
          excerpt?: string | null
          id?: string
          lead_magnet_asset_id?: string | null
          lead_magnet_cover_id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          og_image_alt?: string | null
          page_rows?: Json
          published_at?: string | null
          slug: string
          status?: string
          tags?: string[] | null
          title: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          author_image?: string | null
          author_image_alt?: string | null
          author_name?: string | null
          category?: string
          content?: string
          cover_image?: string | null
          cover_image_alt?: string | null
          created_at?: string
          draft_page_rows?: Json | null
          excerpt?: string | null
          id?: string
          lead_magnet_asset_id?: string | null
          lead_magnet_cover_id?: string | null
          meta_description?: string | null
          meta_title?: string | null
          og_image?: string | null
          og_image_alt?: string | null
          page_rows?: Json
          published_at?: string | null
          slug?: string
          status?: string
          tags?: string[] | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "blog_posts_lead_magnet_asset_id_fkey"
            columns: ["lead_magnet_asset_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blog_posts_lead_magnet_cover_id_fkey"
            columns: ["lead_magnet_cover_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id"]
          },
        ]
      }
      cms_pages: {
        Row: {
          ai_summary: string | null
          created_at: string
          draft_page_rows: Json | null
          id: string
          meta_description: string | null
          meta_title: string | null
          page_rows: Json
          slug: string
          status: string
          template_type: string
          title: string
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          created_at?: string
          draft_page_rows?: Json | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          page_rows?: Json
          slug: string
          status?: string
          template_type?: string
          title: string
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          created_at?: string
          draft_page_rows?: Json | null
          id?: string
          meta_description?: string | null
          meta_title?: string | null
          page_rows?: Json
          slug?: string
          status?: string
          template_type?: string
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          company: string | null
          created_at: string
          email: string
          id: string
          message: string | null
          name: string
          subscribed_to_marketing: boolean
        }
        Insert: {
          company?: string | null
          created_at?: string
          email: string
          id?: string
          message?: string | null
          name: string
          subscribed_to_marketing?: boolean
        }
        Update: {
          company?: string | null
          created_at?: string
          email?: string
          id?: string
          message?: string | null
          name?: string
          subscribed_to_marketing?: boolean
        }
        Relationships: []
      }
      email_campaigns: {
        Row: {
          created_at: string
          html_content: string
          id: string
          recipient_count: number | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          html_content?: string
          id?: string
          recipient_count?: number | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          html_content?: string
          id?: string
          recipient_count?: number | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_send_log: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          message_id: string | null
          metadata: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email: string
          status: string
          template_name: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          message_id?: string | null
          metadata?: Json | null
          recipient_email?: string
          status?: string
          template_name?: string
        }
        Relationships: []
      }
      email_send_state: {
        Row: {
          auth_email_ttl_minutes: number
          batch_size: number
          id: number
          retry_after_until: string | null
          send_delay_ms: number
          transactional_email_ttl_minutes: number
          updated_at: string
        }
        Insert: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Update: {
          auth_email_ttl_minutes?: number
          batch_size?: number
          id?: number
          retry_after_until?: string | null
          send_delay_ms?: number
          transactional_email_ttl_minutes?: number
          updated_at?: string
        }
        Relationships: []
      }
      email_unsubscribe_tokens: {
        Row: {
          created_at: string
          email: string
          id: string
          token: string
          used_at: string | null
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          token: string
          used_at?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          token?: string
          used_at?: string | null
        }
        Relationships: []
      }
      global_widgets: {
        Row: {
          created_at: string
          data: Json
          id: string
          name: string
          type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data?: Json
          id?: string
          name: string
          type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: Json
          id?: string
          name?: string
          type?: string
          updated_at?: string
        }
        Relationships: []
      }
      leads: {
        Row: {
          company_university: string
          created_at: string
          download_history: string[]
          email: string
          full_name: string
          id: string
          marketing_consent: boolean
          title: string
          updated_at: string
        }
        Insert: {
          company_university: string
          created_at?: string
          download_history?: string[]
          email: string
          full_name: string
          id?: string
          marketing_consent?: boolean
          title: string
          updated_at?: string
        }
        Update: {
          company_university?: string
          created_at?: string
          download_history?: string[]
          email?: string
          full_name?: string
          id?: string
          marketing_consent?: boolean
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      media_assets: {
        Row: {
          alt_text: string
          bucket: string
          created_at: string
          description: string
          folder_id: string | null
          id: string
          mime_type: string | null
          seo_metadata: Json
          size_bytes: number | null
          storage_path: string
          title: string
          updated_at: string
        }
        Insert: {
          alt_text?: string
          bucket?: string
          created_at?: string
          description?: string
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          seo_metadata?: Json
          size_bytes?: number | null
          storage_path: string
          title?: string
          updated_at?: string
        }
        Update: {
          alt_text?: string
          bucket?: string
          created_at?: string
          description?: string
          folder_id?: string | null
          id?: string
          mime_type?: string | null
          seo_metadata?: Json
          size_bytes?: number | null
          storage_path?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      media_folders: {
        Row: {
          created_at: string
          id: string
          name: string
          parent_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          parent_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          parent_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "media_folders_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "media_folders"
            referencedColumns: ["id"]
          },
        ]
      }
      page_revisions: {
        Row: {
          content: Json
          created_at: string
          created_by: string | null
          entity_ref: string
          entity_type: string
          id: string
          label: string | null
          version: number
        }
        Insert: {
          content: Json
          created_at?: string
          created_by?: string | null
          entity_ref: string
          entity_type: string
          id?: string
          label?: string | null
          version: number
        }
        Update: {
          content?: Json
          created_at?: string
          created_by?: string | null
          entity_ref?: string
          entity_type?: string
          id?: string
          label?: string | null
          version?: number
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          display_name: string | null
          id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          display_name?: string | null
          id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      site_content: {
        Row: {
          content: Json
          draft_content: Json | null
          id: string
          section_key: string
          updated_at: string
        }
        Insert: {
          content?: Json
          draft_content?: Json | null
          id?: string
          section_key: string
          updated_at?: string
        }
        Update: {
          content?: Json
          draft_content?: Json | null
          id?: string
          section_key?: string
          updated_at?: string
        }
        Relationships: []
      }
      suppressed_emails: {
        Row: {
          created_at: string
          email: string
          id: string
          metadata: Json | null
          reason: string
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          metadata?: Json | null
          reason: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          metadata?: Json | null
          reason?: string
        }
        Relationships: []
      }
      unified_analytics_logs: {
        Row: {
          browser: string | null
          category: string
          country: string | null
          created_at: string
          device: string | null
          duration_seconds: number | null
          entity_name: string
          id: string
          ip_hash: string | null
          is_bot: boolean
          path: string
          referrer: string | null
          scroll_depth: number | null
          search_engine: string | null
          source: string
          stitched_email: string | null
          user_agent: string
          visitor_id: string | null
        }
        Insert: {
          browser?: string | null
          category?: string
          country?: string | null
          created_at?: string
          device?: string | null
          duration_seconds?: number | null
          entity_name?: string
          id?: string
          ip_hash?: string | null
          is_bot?: boolean
          path: string
          referrer?: string | null
          scroll_depth?: number | null
          search_engine?: string | null
          source?: string
          stitched_email?: string | null
          user_agent?: string
          visitor_id?: string | null
        }
        Update: {
          browser?: string | null
          category?: string
          country?: string | null
          created_at?: string
          device?: string | null
          duration_seconds?: number | null
          entity_name?: string
          id?: string
          ip_hash?: string | null
          is_bot?: boolean
          path?: string
          referrer?: string | null
          scroll_depth?: number | null
          search_engine?: string | null
          source?: string
          stitched_email?: string | null
          user_agent?: string
          visitor_id?: string | null
        }
        Relationships: []
      }
    }
    Views: {
      site_content_public: {
        Row: {
          content: Json | null
          draft_content: Json | null
          id: string | null
          section_key: string | null
          updated_at: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      delete_email: {
        Args: { message_id: number; queue_name: string }
        Returns: boolean
      }
      enqueue_email: {
        Args: { payload: Json; queue_name: string }
        Returns: number
      }
      get_site_content_public_rows: {
        Args: never
        Returns: {
          content: Json
          draft_content: Json
          id: string
          section_key: string
          updated_at: string
        }[]
      }
      is_admin: { Args: { _user_id: string }; Returns: boolean }
      move_to_dlq: {
        Args: {
          dlq_name: string
          message_id: number
          payload: Json
          source_queue: string
        }
        Returns: number
      }
      read_email_batch: {
        Args: { batch_size: number; queue_name: string; vt: number }
        Returns: {
          message: Json
          msg_id: number
          read_ct: number
        }[]
      }
      restore_page_revision: {
        Args: { _revision_id: string }
        Returns: undefined
      }
      snapshot_page_revision: {
        Args: {
          _content: Json
          _entity_ref: string
          _entity_type: string
          _label?: string
        }
        Returns: undefined
      }
      stitch_visitor_to_email: {
        Args: { _email: string; _visitor_id: string }
        Returns: number
      }
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
