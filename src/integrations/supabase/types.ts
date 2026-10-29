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
      alerts: {
        Row: {
          assigned_to: string | null
          comment: string | null
          created_at: string
          created_by: string | null
          farm_id: string
          id: string
          kind: Database["public"]["Enums"]["alert_kind"]
          l: number | null
          message: string | null
          p: number | null
          parcel_id: string
          photo_urls: string[]
          resolved_at: string | null
          resolved_by: string | null
          source_role: Database["public"]["Enums"]["app_role"] | null
          status: Database["public"]["Enums"]["alert_status"]
          tree_id: string | null
          type: Database["public"]["Enums"]["alert_kind"] | null
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          farm_id?: string
          id?: string
          kind: Database["public"]["Enums"]["alert_kind"]
          l?: number | null
          message?: string | null
          p?: number | null
          parcel_id: string
          photo_urls?: string[]
          resolved_at?: string | null
          resolved_by?: string | null
          source_role?: Database["public"]["Enums"]["app_role"] | null
          status?: Database["public"]["Enums"]["alert_status"]
          tree_id?: string | null
          type?: Database["public"]["Enums"]["alert_kind"] | null
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          comment?: string | null
          created_at?: string
          created_by?: string | null
          farm_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["alert_kind"]
          l?: number | null
          message?: string | null
          p?: number | null
          parcel_id?: string
          photo_urls?: string[]
          resolved_at?: string | null
          resolved_by?: string | null
          source_role?: Database["public"]["Enums"]["app_role"] | null
          status?: Database["public"]["Enums"]["alert_status"]
          tree_id?: string | null
          type?: Database["public"]["Enums"]["alert_kind"] | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "alerts_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "alerts_tree_id_fkey"
            columns: ["tree_id"]
            isOneToOne: false
            referencedRelation: "trees"
            referencedColumns: ["id"]
          },
        ]
      }
      conflict_log: {
        Row: {
          base_updated_at: string | null
          created_at: string
          id: string
          new_value: Json | null
          overwritten_by: string | null
          previous_value: Json | null
          record_id: string
          server_updated_at: string | null
          table_name: string
        }
        Insert: {
          base_updated_at?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          overwritten_by?: string | null
          previous_value?: Json | null
          record_id: string
          server_updated_at?: string | null
          table_name: string
        }
        Update: {
          base_updated_at?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          overwritten_by?: string | null
          previous_value?: Json | null
          record_id?: string
          server_updated_at?: string | null
          table_name?: string
        }
        Relationships: []
      }
      module_records: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string | null
          executed_at: string | null
          executed_by: string | null
          farm_id: string
          id: string
          kind: Database["public"]["Enums"]["module_kind"]
          parcel_id: string
          payload: Json
          scheduled_at: string | null
          status: Database["public"]["Enums"]["program_status"]
          total_cost: number
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          executed_at?: string | null
          executed_by?: string | null
          farm_id?: string
          id?: string
          kind: Database["public"]["Enums"]["module_kind"]
          parcel_id: string
          payload?: Json
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          total_cost?: number
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string | null
          executed_at?: string | null
          executed_by?: string | null
          farm_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["module_kind"]
          parcel_id?: string
          payload?: Json
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["program_status"]
          total_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "module_records_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      parcels: {
        Row: {
          created_at: string
          farm_id: string
          id: string
          metadata: Json
          name: string
          position: number
          rows_count: number
          status: Database["public"]["Enums"]["parcel_status"]
          trees_per_row: number
          type: Database["public"]["Enums"]["parcel_type"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          farm_id?: string
          id: string
          metadata?: Json
          name: string
          position: number
          rows_count?: number
          status?: Database["public"]["Enums"]["parcel_status"]
          trees_per_row?: number
          type: Database["public"]["Enums"]["parcel_type"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          farm_id?: string
          id?: string
          metadata?: Json
          name?: string
          position?: number
          rows_count?: number
          status?: Database["public"]["Enums"]["parcel_status"]
          trees_per_row?: number
          type?: Database["public"]["Enums"]["parcel_type"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      recommendations: {
        Row: {
          comment: string | null
          created_at: string
          created_by: string
          farm_id: string
          id: string
          kind: Database["public"]["Enums"]["reco_kind"]
          parcel_ids: string[]
          payload: Json
          photo_urls: string[]
          reviewed_at: string | null
          reviewed_by: string | null
          status: Database["public"]["Enums"]["reco_status"]
          title: string
          transferred_record_id: string | null
          updated_at: string
        }
        Insert: {
          comment?: string | null
          created_at?: string
          created_by: string
          farm_id?: string
          id?: string
          kind: Database["public"]["Enums"]["reco_kind"]
          parcel_ids?: string[]
          payload?: Json
          photo_urls?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["reco_status"]
          title: string
          transferred_record_id?: string | null
          updated_at?: string
        }
        Update: {
          comment?: string | null
          created_at?: string
          created_by?: string
          farm_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["reco_kind"]
          parcel_ids?: string[]
          payload?: Json
          photo_urls?: string[]
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: Database["public"]["Enums"]["reco_status"]
          title?: string
          transferred_record_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      task_executions: {
        Row: {
          actual_quantity: number | null
          actual_unit: string | null
          comment: string | null
          created_at: string
          duration_min: number | null
          executed_at: string
          executed_by: string
          farm_id: string
          id: string
          module_record_id: string | null
          photo_urls: string[]
          reject_reason: string | null
          rejected: boolean
          task_id: string | null
          weather_snapshot: Json | null
        }
        Insert: {
          actual_quantity?: number | null
          actual_unit?: string | null
          comment?: string | null
          created_at?: string
          duration_min?: number | null
          executed_at?: string
          executed_by: string
          farm_id?: string
          id?: string
          module_record_id?: string | null
          photo_urls?: string[]
          reject_reason?: string | null
          rejected?: boolean
          task_id?: string | null
          weather_snapshot?: Json | null
        }
        Update: {
          actual_quantity?: number | null
          actual_unit?: string | null
          comment?: string | null
          created_at?: string
          duration_min?: number | null
          executed_at?: string
          executed_by?: string
          farm_id?: string
          id?: string
          module_record_id?: string | null
          photo_urls?: string[]
          reject_reason?: string | null
          rejected?: boolean
          task_id?: string | null
          weather_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "task_executions_module_record_id_fkey"
            columns: ["module_record_id"]
            isOneToOne: false
            referencedRelation: "module_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_executions_task_id_fkey"
            columns: ["task_id"]
            isOneToOne: false
            referencedRelation: "tasks"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          assigned_to: string | null
          created_at: string
          created_by: string
          description: string | null
          due_date: string | null
          farm_id: string
          id: string
          kind: Database["public"]["Enums"]["task_kind"]
          linked_alert_id: string | null
          parcel_id: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          recurrence: Json | null
          reject_reason: string | null
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          created_by: string
          description?: string | null
          due_date?: string | null
          farm_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["task_kind"]
          linked_alert_id?: string | null
          parcel_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence?: Json | null
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          created_by?: string
          description?: string | null
          due_date?: string | null
          farm_id?: string
          id?: string
          kind?: Database["public"]["Enums"]["task_kind"]
          linked_alert_id?: string | null
          parcel_id?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          recurrence?: Json | null
          reject_reason?: string | null
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_linked_alert_id_fkey"
            columns: ["linked_alert_id"]
            isOneToOne: false
            referencedRelation: "alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      trees: {
        Row: {
          farm_id: string
          height_cm: number | null
          id: string
          l: number
          notes: string | null
          p: number
          parcel_id: string
          photo_urls: string[]
          pollinator: boolean
          trunk_mm: number | null
          updated_at: string
          updated_by: string | null
          vitality: Database["public"]["Enums"]["vitality"]
        }
        Insert: {
          farm_id?: string
          height_cm?: number | null
          id?: string
          l: number
          notes?: string | null
          p: number
          parcel_id: string
          photo_urls?: string[]
          pollinator?: boolean
          trunk_mm?: number | null
          updated_at?: string
          updated_by?: string | null
          vitality?: Database["public"]["Enums"]["vitality"]
        }
        Update: {
          farm_id?: string
          height_cm?: number | null
          id?: string
          l?: number
          notes?: string | null
          p?: number
          parcel_id?: string
          photo_urls?: string[]
          pollinator?: boolean
          trunk_mm?: number | null
          updated_at?: string
          updated_by?: string | null
          vitality?: Database["public"]["Enums"]["vitality"]
        }
        Relationships: [
          {
            foreignKeyName: "trees_parcel_id_fkey"
            columns: ["parcel_id"]
            isOneToOne: false
            referencedRelation: "parcels"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
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
      alert_kind: "fuite" | "tuyau" | "maladie" | "autre" | "casse"
      alert_status:
        | "ouvert"
        | "en_cours"
        | "resolu"
        | "vue"
        | "assignee"
        | "validee"
      app_role: "admin" | "executant" | "ingenieur"
      module_kind:
        | "pulverisation"
        | "phytosanitaire"
        | "recolte"
        | "analyse_sol"
        | "analyse_eau"
        | "irrigation"
        | "fertilisation"
      parcel_status: "sain" | "alerte" | "intervention"
      parcel_type: "olivier" | "nectarine" | "pommier" | "vide"
      program_status: "planifie" | "en_cours" | "execute" | "annule"
      reco_kind: "fertilisation" | "phytosanitaire" | "irrigation"
      reco_status: "envoyee" | "acceptee" | "rejetee" | "transferee"
      task_kind:
        | "generale"
        | "irrigation"
        | "fertilisation"
        | "pulverisation"
        | "maintenance"
        | "recolte"
        | "correction_anomalie"
      task_priority: "basse" | "normale" | "haute" | "urgente"
      task_status: "a_faire" | "en_cours" | "fait" | "rejete" | "annule"
      vitality: "sain" | "replante" | "faible" | "mort" | "oublie"
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
      alert_kind: ["fuite", "tuyau", "maladie", "autre", "casse"],
      alert_status: [
        "ouvert",
        "en_cours",
        "resolu",
        "vue",
        "assignee",
        "validee",
      ],
      app_role: ["admin", "executant", "ingenieur"],
      module_kind: [
        "pulverisation",
        "phytosanitaire",
        "recolte",
        "analyse_sol",
        "analyse_eau",
        "irrigation",
        "fertilisation",
      ],
      parcel_status: ["sain", "alerte", "intervention"],
      parcel_type: ["olivier", "nectarine", "pommier", "vide"],
      program_status: ["planifie", "en_cours", "execute", "annule"],
      reco_kind: ["fertilisation", "phytosanitaire", "irrigation"],
      reco_status: ["envoyee", "acceptee", "rejetee", "transferee"],
      task_kind: [
        "generale",
        "irrigation",
        "fertilisation",
        "pulverisation",
        "maintenance",
        "recolte",
        "correction_anomalie",
      ],
      task_priority: ["basse", "normale", "haute", "urgente"],
      task_status: ["a_faire", "en_cours", "fait", "rejete", "annule"],
      vitality: ["sain", "replante", "faible", "mort", "oublie"],
    },
  },
} as const
