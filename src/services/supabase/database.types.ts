export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string;
          actor_id: string | null;
          created_at: string;
          entity_id: string;
          entity_type: string;
          id: string;
          metadata_json: Json | null;
          operation_id: string | null;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          action: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id: string;
          entity_type: string;
          id?: string;
          metadata_json?: Json | null;
          operation_id?: string | null;
          workspace_id: string;
        };
        Update: {
          action?: string;
          actor_id?: string | null;
          created_at?: string;
          entity_id?: string;
          entity_type?: string;
          id?: string;
          metadata_json?: Json | null;
          operation_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'audit_logs_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      collection_attempts: {
        Row: {
          attempted_at: string;
          created_at: string;
          customer_id: string;
          debt_id: string | null;
          id: string;
          template_type: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          attempted_at: string;
          created_at?: string;
          customer_id: string;
          debt_id?: string | null;
          id: string;
          template_type: string;
          workspace_id: string;
        };
        Update: {
          attempted_at?: string;
          created_at?: string;
          customer_id?: string;
          debt_id?: string | null;
          id?: string;
          template_type?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'collection_attempts_workspace_customer_fk';
            columns: ['workspace_id', 'customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'collection_attempts_workspace_debt_fk';
            columns: ['workspace_id', 'debt_id'];
            isOneToOne: false;
            referencedRelation: 'debts';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'collection_attempts_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      customers: {
        Row: {
          address: string | null;
          archived_at: string | null;
          created_at: string;
          deleted_at: string | null;
          id: string;
          name: string;
          notes: string | null;
          phone: string | null;
          updated_at: string;
          whatsapp: string | null;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          address?: string | null;
          archived_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id: string;
          name: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
          workspace_id: string;
        };
        Update: {
          address?: string | null;
          archived_at?: string | null;
          created_at?: string;
          deleted_at?: string | null;
          id?: string;
          name?: string;
          notes?: string | null;
          phone?: string | null;
          updated_at?: string;
          whatsapp?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'customers_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      debts: {
        Row: {
          canceled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          customer_id: string;
          description: string;
          due_date: string | null;
          id: string;
          notes: string | null;
          service_date: string;
          total_cents: number;
          updated_at: string;
          vehicle_id: string | null;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          canceled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          customer_id: string;
          description: string;
          due_date?: string | null;
          id: string;
          notes?: string | null;
          service_date: string;
          total_cents: number;
          updated_at?: string;
          vehicle_id?: string | null;
          workspace_id: string;
        };
        Update: {
          canceled_at?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          customer_id?: string;
          description?: string;
          due_date?: string | null;
          id?: string;
          notes?: string | null;
          service_date?: string;
          total_cents?: number;
          updated_at?: string;
          vehicle_id?: string | null;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'debts_workspace_customer_fk';
            columns: ['workspace_id', 'customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'debts_workspace_customer_vehicle_fk';
            columns: ['workspace_id', 'customer_id', 'vehicle_id'];
            isOneToOne: false;
            referencedRelation: 'vehicles';
            referencedColumns: ['workspace_id', 'customer_id', 'id'];
          },
          {
            foreignKeyName: 'debts_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      payment_reversals: {
        Row: {
          created_at: string;
          id: string;
          operation_id: string;
          payment_id: string;
          reason: string;
          reversed_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          id: string;
          operation_id: string;
          payment_id: string;
          reason: string;
          reversed_at: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          id?: string;
          operation_id?: string;
          payment_id?: string;
          reason?: string;
          reversed_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payment_reversals_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'payment_reversals_workspace_payment_fk';
            columns: ['workspace_id', 'payment_id'];
            isOneToOne: true;
            referencedRelation: 'payments';
            referencedColumns: ['workspace_id', 'id'];
          },
        ];
      };
      payments: {
        Row: {
          amount_cents: number;
          created_at: string;
          debt_id: string;
          id: string;
          notes: string | null;
          operation_id: string;
          paid_at: string;
          payment_method: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          amount_cents: number;
          created_at?: string;
          debt_id: string;
          id: string;
          notes?: string | null;
          operation_id: string;
          paid_at: string;
          payment_method: string;
          workspace_id: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          debt_id?: string;
          id?: string;
          notes?: string | null;
          operation_id?: string;
          paid_at?: string;
          payment_method?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'payments_workspace_debt_fk';
            columns: ['workspace_id', 'debt_id'];
            isOneToOne: false;
            referencedRelation: 'debts';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'payments_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      reminders: {
        Row: {
          created_at: string;
          debt_id: string;
          delivered_at: string | null;
          id: string;
          read_at: string | null;
          scheduled_at: string;
          status: string;
          type: string;
          updated_at: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          debt_id: string;
          delivered_at?: string | null;
          id: string;
          read_at?: string | null;
          scheduled_at: string;
          status?: string;
          type: string;
          updated_at?: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          debt_id?: string;
          delivered_at?: string | null;
          id?: string;
          read_at?: string | null;
          scheduled_at?: string;
          status?: string;
          type?: string;
          updated_at?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'reminders_workspace_debt_fk';
            columns: ['workspace_id', 'debt_id'];
            isOneToOne: false;
            referencedRelation: 'debts';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'reminders_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      settings: {
        Row: {
          key: string;
          updated_at: string;
          value_json: NonNullable<Json>;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          key: string;
          updated_at?: string;
          value_json: NonNullable<Json>;
          workspace_id: string;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value_json?: NonNullable<Json>;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'settings_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      vehicles: {
        Row: {
          archived_at: string | null;
          brand: string;
          color: string | null;
          created_at: string;
          customer_id: string;
          deleted_at: string | null;
          id: string;
          model: string;
          notes: string | null;
          plate: string | null;
          type: string;
          updated_at: string;
          workspace_id: string;
          year: number | null;
        };
        ComputedFields: never;
        Insert: {
          archived_at?: string | null;
          brand: string;
          color?: string | null;
          created_at?: string;
          customer_id: string;
          deleted_at?: string | null;
          id: string;
          model: string;
          notes?: string | null;
          plate?: string | null;
          type: string;
          updated_at?: string;
          workspace_id: string;
          year?: number | null;
        };
        Update: {
          archived_at?: string | null;
          brand?: string;
          color?: string | null;
          created_at?: string;
          customer_id?: string;
          deleted_at?: string | null;
          id?: string;
          model?: string;
          notes?: string | null;
          plate?: string | null;
          type?: string;
          updated_at?: string;
          workspace_id?: string;
          year?: number | null;
        };
        Relationships: [
          {
            foreignKeyName: 'vehicles_workspace_customer_fk';
            columns: ['workspace_id', 'customer_id'];
            isOneToOne: false;
            referencedRelation: 'customers';
            referencedColumns: ['workspace_id', 'id'];
          },
          {
            foreignKeyName: 'vehicles_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspace_members: {
        Row: {
          created_at: string;
          created_by: string;
          role: string;
          updated_at: string;
          user_id: string;
          workspace_id: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          role: string;
          updated_at?: string;
          user_id: string;
          workspace_id: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          role?: string;
          updated_at?: string;
          user_id?: string;
          workspace_id?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'workspace_members_workspace_id_fkey';
            columns: ['workspace_id'];
            isOneToOne: false;
            referencedRelation: 'workspaces';
            referencedColumns: ['id'];
          },
        ];
      };
      workspaces: {
        Row: {
          created_at: string;
          created_by: string;
          currency: string;
          id: string;
          name: string;
          timezone: string;
          updated_at: string;
        };
        ComputedFields: never;
        Insert: {
          created_at?: string;
          created_by: string;
          currency?: string;
          id: string;
          name: string;
          timezone: string;
          updated_at?: string;
        };
        Update: {
          created_at?: string;
          created_by?: string;
          currency?: string;
          id?: string;
          name?: string;
          timezone?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      cancel_debt: {
        Args: {
          p_canceled_at: string;
          p_debt_id: string;
          p_operation_id: string;
          p_reason: string;
          p_workspace_id: string;
        };
        Returns: {
          canceled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          customer_id: string;
          description: string;
          due_date: string | null;
          id: string;
          notes: string | null;
          service_date: string;
          total_cents: number;
          updated_at: string;
          vehicle_id: string | null;
          workspace_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'debts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_debt: {
        Args: {
          p_customer_id: string;
          p_debt_id: string;
          p_description: string;
          p_due_date: string;
          p_notes: string;
          p_operation_id: string;
          p_service_date: string;
          p_total_cents: number;
          p_vehicle_id: string;
          p_workspace_id: string;
        };
        Returns: {
          canceled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          customer_id: string;
          description: string;
          due_date: string | null;
          id: string;
          notes: string | null;
          service_date: string;
          total_cents: number;
          updated_at: string;
          vehicle_id: string | null;
          workspace_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'debts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      create_workspace: {
        Args: {
          p_currency?: string;
          p_name: string;
          p_operation_id: string;
          p_timezone: string;
          p_workspace_id: string;
        };
        Returns: string;
      };
      manage_workspace_member: {
        Args: {
          p_operation_id: string;
          p_remove?: boolean;
          p_role: string;
          p_user_id: string;
          p_workspace_id: string;
        };
        Returns: undefined;
      };
      register_payment: {
        Args: {
          p_amount_cents: number;
          p_debt_id: string;
          p_notes: string;
          p_operation_id: string;
          p_paid_at: string;
          p_payment_id: string;
          p_payment_method: string;
          p_workspace_id: string;
        };
        Returns: {
          amount_cents: number;
          created_at: string;
          debt_id: string;
          id: string;
          notes: string | null;
          operation_id: string;
          paid_at: string;
          payment_method: string;
          workspace_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'payments';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      reverse_payment: {
        Args: {
          p_operation_id: string;
          p_payment_id: string;
          p_reason: string;
          p_reversal_id: string;
          p_reversed_at: string;
          p_workspace_id: string;
        };
        Returns: {
          created_at: string;
          id: string;
          operation_id: string;
          payment_id: string;
          reason: string;
          reversed_at: string;
          workspace_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'payment_reversals';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
      update_debt: {
        Args: {
          p_debt_id: string;
          p_description: string;
          p_due_date: string;
          p_notes: string;
          p_operation_id: string;
          p_service_date: string;
          p_total_cents: number;
          p_vehicle_id: string;
          p_workspace_id: string;
        };
        Returns: {
          canceled_at: string | null;
          cancellation_reason: string | null;
          created_at: string;
          customer_id: string;
          description: string;
          due_date: string | null;
          id: string;
          notes: string | null;
          service_date: string;
          total_cents: number;
          updated_at: string;
          vehicle_id: string | null;
          workspace_id: string;
        };
        SetofOptions: {
          from: '*';
          to: 'debts';
          isOneToOne: true;
          isSetofReturn: false;
        };
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, 'public'>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Views'])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema['Tables'] & DefaultSchema['Views'])
    ? (DefaultSchema['Tables'] & DefaultSchema['Views'])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    keyof DefaultSchema['Tables'] | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables']
    : never) = never,
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions['schema']]['Tables'][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema['Tables']
    ? DefaultSchema['Tables'][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    keyof DefaultSchema['Enums'] | { schema: keyof DatabaseWithoutInternals },
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums']
    : never) = never,
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions['schema']]['Enums'][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema['Enums']
    ? DefaultSchema['Enums'][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    keyof DefaultSchema['CompositeTypes'] | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes']
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions['schema']]['CompositeTypes'][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema['CompositeTypes']
    ? DefaultSchema['CompositeTypes'][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {},
  },
} as const;
