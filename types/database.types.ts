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
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      approval_thresholds: {
        Row: {
          approver_role: string
          company_id: string
          context: Database["public"]["Enums"]["approval_context"]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approver_role: string
          company_id: string
          context: Database["public"]["Enums"]["approval_context"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number
          sort_order: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approver_role?: string
          company_id?: string
          context?: Database["public"]["Enums"]["approval_context"]
          created_at?: string
          created_by?: string | null
          id?: string
          is_active?: boolean
          max_amount?: number | null
          min_amount?: number
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "approval_thresholds_approver_role_fkey"
            columns: ["approver_role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "approval_thresholds_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_thresholds_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "approval_thresholds_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attachments: {
        Row: {
          created_at: string
          deleted_at: string | null
          event_id: string
          file_name: string
          file_size: number | null
          id: string
          mime_type: string | null
          storage_path: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          event_id: string
          file_name: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          event_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          mime_type?: string | null
          storage_path?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "attachments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attachments_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          changed_fields: string[] | null
          company_id: string | null
          created_at: string
          id: string
          ip_address: unknown
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string
          user_agent: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          changed_fields?: string[] | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name: string
          user_agent?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          changed_fields?: string[] | null
          company_id?: string | null
          created_at?: string
          id?: string
          ip_address?: unknown
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_template_items: {
        Row: {
          category: string | null
          id: string
          is_mandatory: boolean
          label: string
          sort_order: number
          template_id: string
        }
        Insert: {
          category?: string | null
          id?: string
          is_mandatory?: boolean
          label: string
          sort_order?: number
          template_id: string
        }
        Update: {
          category?: string | null
          id?: string
          is_mandatory?: boolean
          label?: string
          sort_order?: number
          template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "checklist_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      checklist_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"] | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          is_active: boolean
          max_participants: number | null
          min_participants: number | null
          name: string
          training_id: string | null
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"] | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          is_active?: boolean
          max_participants?: number | null
          min_participants?: number | null
          name: string
          training_id?: string | null
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"] | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          is_active?: boolean
          max_participants?: number | null
          min_participants?: number | null
          name?: string
          training_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "checklist_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "checklist_templates_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          province: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name: string
          province?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          name?: string
          province?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cities_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      companies: {
        Row: {
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          settings: Json
          updated_at: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      cost_categories: {
        Row: {
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          sort_order?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cost_categories_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_categories_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cost_categories_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          created_at: string
          created_by: string | null
          customer_id: string
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          job_title: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          customer_id: string
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          customer_id?: string
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          job_title?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_contacts_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          address: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          industry: string | null
          is_active: boolean
          name: string
          notes: string | null
          npwp: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          address?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          name: string
          notes?: string | null
          npwp?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          address?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          industry?: string | null
          is_active?: boolean
          name?: string
          notes?: string | null
          npwp?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          deleted_at: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          event_id: string
          file_name: string
          file_size: number | null
          id: string
          is_mandatory: boolean
          mime_type: string | null
          storage_path: string
          uploaded_by: string
          verification_note: string | null
          verification_status: Database["public"]["Enums"]["document_verification_status"]
          verified_at: string | null
          verified_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          document_type: Database["public"]["Enums"]["document_type"]
          event_id: string
          file_name: string
          file_size?: number | null
          id?: string
          is_mandatory?: boolean
          mime_type?: string | null
          storage_path: string
          uploaded_by: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["document_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          document_type?: Database["public"]["Enums"]["document_type"]
          event_id?: string
          file_name?: string
          file_size?: number | null
          id?: string
          is_mandatory?: boolean
          mime_type?: string | null
          storage_path?: string
          uploaded_by?: string
          verification_note?: string | null
          verification_status?: Database["public"]["Enums"]["document_verification_status"]
          verified_at?: string | null
          verified_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          total_quantity: number
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          total_quantity?: number
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          total_quantity?: number
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment_assignments: {
        Row: {
          condition_on_return: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          equipment_id: string
          event_id: string
          id: string
          quantity: number
          returned_at: string | null
          status: Database["public"]["Enums"]["equipment_assignment_status"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          condition_on_return?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          equipment_id: string
          event_id: string
          id?: string
          quantity?: number
          returned_at?: string | null
          status?: Database["public"]["Enums"]["equipment_assignment_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          condition_on_return?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          equipment_id?: string
          event_id?: string
          id?: string
          quantity?: number
          returned_at?: string | null
          status?: Database["public"]["Enums"]["equipment_assignment_status"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "equipment_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_equipment_id_fkey"
            columns: ["equipment_id"]
            isOneToOne: false
            referencedRelation: "equipment"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "equipment_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_budget_items: {
        Row: {
          cost_category_id: string
          created_at: string
          created_by: string | null
          event_budget_id: string
          id: string
          planned_amount: number
        }
        Insert: {
          cost_category_id: string
          created_at?: string
          created_by?: string | null
          event_budget_id: string
          id?: string
          planned_amount: number
        }
        Update: {
          cost_category_id?: string
          created_at?: string
          created_by?: string | null
          event_budget_id?: string
          id?: string
          planned_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_budget_items_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_budget_items_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_budget_items_event_budget_id_fkey"
            columns: ["event_budget_id"]
            isOneToOne: false
            referencedRelation: "event_budgets"
            referencedColumns: ["id"]
          },
        ]
      }
      event_budgets: {
        Row: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          event_id: string
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["event_budget_status"]
          submitted_at: string | null
          submitted_by: string | null
          total_amount: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          event_id: string
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["event_budget_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          event_id?: string
          id?: string
          rejection_reason?: string | null
          status?: Database["public"]["Enums"]["event_budget_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          total_amount?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_budgets_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_budgets_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_budgets_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_budgets_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_budgets_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_change_requests: {
        Row: {
          approved_at: string | null
          approved_by: string | null
          cost_impact_note: string | null
          created_at: string
          event_id: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string
          rejection_reason: string | null
          requested_by: string
          status: Database["public"]["Enums"]["change_request_status"]
        }
        Insert: {
          approved_at?: string | null
          approved_by?: string | null
          cost_impact_note?: string | null
          created_at?: string
          event_id: string
          field_name: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason: string
          rejection_reason?: string | null
          requested_by: string
          status?: Database["public"]["Enums"]["change_request_status"]
        }
        Update: {
          approved_at?: string | null
          approved_by?: string | null
          cost_impact_note?: string | null
          created_at?: string
          event_id?: string
          field_name?: string
          id?: string
          new_value?: string | null
          old_value?: string | null
          reason?: string
          rejection_reason?: string | null
          requested_by?: string
          status?: Database["public"]["Enums"]["change_request_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_change_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_change_requests_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_change_requests_requested_by_fkey"
            columns: ["requested_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      event_checklists: {
        Row: {
          category: string | null
          created_at: string
          deleted_at: string | null
          done_at: string | null
          done_by: string | null
          event_id: string
          id: string
          is_done: boolean
          is_mandatory: boolean
          label: string
          sort_order: number
        }
        Insert: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          done_at?: string | null
          done_by?: string | null
          event_id: string
          id?: string
          is_done?: boolean
          is_mandatory?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          category?: string | null
          created_at?: string
          deleted_at?: string | null
          done_at?: string | null
          done_by?: string | null
          event_id?: string
          id?: string
          is_done?: boolean
          is_mandatory?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "event_checklists_done_by_fkey"
            columns: ["done_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_checklists_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          deleted_at: string | null
          event_id: string
          id: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          deleted_at?: string | null
          event_id: string
          id?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          deleted_at?: string | null
          event_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_comments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_issues: {
        Row: {
          assignee_user_id: string | null
          category: Database["public"]["Enums"]["issue_category"]
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string | null
          event_id: string
          id: string
          resolution: string | null
          resolved_at: string | null
          root_cause: string | null
          severity: Database["public"]["Enums"]["issue_severity"]
          status: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at: string
        }
        Insert: {
          assignee_user_id?: string | null
          category: Database["public"]["Enums"]["issue_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          event_id: string
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          title: string
          updated_at?: string
        }
        Update: {
          assignee_user_id?: string | null
          category?: Database["public"]["Enums"]["issue_category"]
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string | null
          event_id?: string
          id?: string
          resolution?: string | null
          resolved_at?: string | null
          root_cause?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"]
          status?: Database["public"]["Enums"]["issue_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "event_issues_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_issues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_issues_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_number_counters: {
        Row: {
          last_number: number
          year: number
        }
        Insert: {
          last_number?: number
          year: number
        }
        Update: {
          last_number?: number
          year?: number
        }
        Relationships: []
      }
      event_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          event_id: string
          from_status: Database["public"]["Enums"]["event_status"] | null
          id: string
          metadata: Json
          reason: string | null
          to_status: Database["public"]["Enums"]["event_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          event_id: string
          from_status?: Database["public"]["Enums"]["event_status"] | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_status: Database["public"]["Enums"]["event_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          event_id?: string
          from_status?: Database["public"]["Enums"]["event_status"] | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_status?: Database["public"]["Enums"]["event_status"]
        }
        Relationships: [
          {
            foreignKeyName: "event_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_status_history_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      event_status_transitions: {
        Row: {
          from_status: Database["public"]["Enums"]["event_status"]
          to_status: Database["public"]["Enums"]["event_status"]
        }
        Insert: {
          from_status: Database["public"]["Enums"]["event_status"]
          to_status: Database["public"]["Enums"]["event_status"]
        }
        Update: {
          from_status?: Database["public"]["Enums"]["event_status"]
          to_status?: Database["public"]["Enums"]["event_status"]
        }
        Relationships: []
      }
      event_tasks: {
        Row: {
          assignee_user_id: string
          blocked_reason: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_date: string
          event_id: string
          id: string
          is_mandatory: boolean
          overdue_notified_at: string | null
          priority: Database["public"]["Enums"]["task_priority"]
          sort_order: number
          status: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assignee_user_id: string
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date: string
          event_id: string
          id?: string
          is_mandatory?: boolean
          overdue_notified_at?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assignee_user_id?: string
          blocked_reason?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_date?: string
          event_id?: string
          id?: string
          is_mandatory?: boolean
          overdue_notified_at?: string | null
          priority?: Database["public"]["Enums"]["task_priority"]
          sort_order?: number
          status?: Database["public"]["Enums"]["task_status"]
          title?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "event_tasks_assignee_user_id_fkey"
            columns: ["assignee_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "event_tasks_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      events: {
        Row: {
          approved_at: string | null
          backup_pic_user_id: string | null
          cancellation_category:
            | Database["public"]["Enums"]["cancellation_category"]
            | null
          cancellation_reason: string | null
          city_id: string | null
          closed_at: string | null
          company_id: string
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_reference: string | null
          deleted_at: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"] | null
          description: string | null
          duration_days: number | null
          end_date: string | null
          end_time: string | null
          event_code: string | null
          event_name: string
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          is_promotional: boolean
          is_rush: boolean
          location_name: string | null
          location_type: Database["public"]["Enums"]["location_type"] | null
          participant_count: number | null
          payment_term: Database["public"]["Enums"]["payment_term"] | null
          pic_assigned_at: string | null
          pic_assigned_by: string | null
          pic_user_id: string | null
          po_number: string | null
          po_status: Database["public"]["Enums"]["po_status"]
          possible_duplicate: boolean
          priority: Database["public"]["Enums"]["event_priority"]
          progress_percentage: number
          rejection_reason: string | null
          responsibility_note: string | null
          revenue_recognized_amount: number | null
          revision_note: string | null
          sales_team_id: string | null
          sales_user_id: string
          sales_value: number | null
          special_requirements: string | null
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"]
          submitted_at: string | null
          training_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          approved_at?: string | null
          backup_pic_user_id?: string | null
          cancellation_category?:
            | Database["public"]["Enums"]["cancellation_category"]
            | null
          cancellation_reason?: string | null
          city_id?: string | null
          closed_at?: string | null
          company_id: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_reference?: string | null
          deleted_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"] | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          end_time?: string | null
          event_code?: string | null
          event_name: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          is_promotional?: boolean
          is_rush?: boolean
          location_name?: string | null
          location_type?: Database["public"]["Enums"]["location_type"] | null
          participant_count?: number | null
          payment_term?: Database["public"]["Enums"]["payment_term"] | null
          pic_assigned_at?: string | null
          pic_assigned_by?: string | null
          pic_user_id?: string | null
          po_number?: string | null
          po_status?: Database["public"]["Enums"]["po_status"]
          possible_duplicate?: boolean
          priority?: Database["public"]["Enums"]["event_priority"]
          progress_percentage?: number
          rejection_reason?: string | null
          responsibility_note?: string | null
          revenue_recognized_amount?: number | null
          revision_note?: string | null
          sales_team_id?: string | null
          sales_user_id: string
          sales_value?: number | null
          special_requirements?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          submitted_at?: string | null
          training_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          approved_at?: string | null
          backup_pic_user_id?: string | null
          cancellation_category?:
            | Database["public"]["Enums"]["cancellation_category"]
            | null
          cancellation_reason?: string | null
          city_id?: string | null
          closed_at?: string | null
          company_id?: string
          completed_at?: string | null
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          customer_id?: string | null
          customer_reference?: string | null
          deleted_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"] | null
          description?: string | null
          duration_days?: number | null
          end_date?: string | null
          end_time?: string | null
          event_code?: string | null
          event_name?: string
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          is_promotional?: boolean
          is_rush?: boolean
          location_name?: string | null
          location_type?: Database["public"]["Enums"]["location_type"] | null
          participant_count?: number | null
          payment_term?: Database["public"]["Enums"]["payment_term"] | null
          pic_assigned_at?: string | null
          pic_assigned_by?: string | null
          pic_user_id?: string | null
          po_number?: string | null
          po_status?: Database["public"]["Enums"]["po_status"]
          possible_duplicate?: boolean
          priority?: Database["public"]["Enums"]["event_priority"]
          progress_percentage?: number
          rejection_reason?: string | null
          responsibility_note?: string | null
          revenue_recognized_amount?: number | null
          revision_note?: string | null
          sales_team_id?: string | null
          sales_user_id?: string
          sales_value?: number | null
          special_requirements?: string | null
          start_date?: string | null
          start_time?: string | null
          status?: Database["public"]["Enums"]["event_status"]
          submitted_at?: string | null
          training_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "events_backup_pic_user_id_fkey"
            columns: ["backup_pic_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "customer_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_pic_assigned_by_fkey"
            columns: ["pic_assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_pic_user_id_fkey"
            columns: ["pic_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_sales_team_id_fkey"
            columns: ["sales_team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_sales_user_id_fkey"
            columns: ["sales_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "events_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_status_history: {
        Row: {
          changed_at: string
          changed_by: string | null
          expense_id: string
          from_status: Database["public"]["Enums"]["expense_status"] | null
          id: string
          metadata: Json
          reason: string | null
          to_status: Database["public"]["Enums"]["expense_status"]
        }
        Insert: {
          changed_at?: string
          changed_by?: string | null
          expense_id: string
          from_status?: Database["public"]["Enums"]["expense_status"] | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_status: Database["public"]["Enums"]["expense_status"]
        }
        Update: {
          changed_at?: string
          changed_by?: string | null
          expense_id?: string
          from_status?: Database["public"]["Enums"]["expense_status"] | null
          id?: string
          metadata?: Json
          reason?: string | null
          to_status?: Database["public"]["Enums"]["expense_status"]
        }
        Relationships: [
          {
            foreignKeyName: "expense_status_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expense_status_history_expense_id_fkey"
            columns: ["expense_id"]
            isOneToOne: false
            referencedRelation: "expenses"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          cost_category_id: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          description: string
          event_id: string
          expense_date: string
          id: string
          justification_note: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: Database["public"]["Enums"]["expense_payment_method"]
          receipt_document_id: string | null
          rejection_reason: string | null
          required_approver_role: string | null
          required_tier_rank: number | null
          status: Database["public"]["Enums"]["expense_status"]
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        Insert: {
          amount: number
          cost_category_id: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          description: string
          event_id: string
          expense_date: string
          id?: string
          justification_note?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method: Database["public"]["Enums"]["expense_payment_method"]
          receipt_document_id?: string | null
          rejection_reason?: string | null
          required_approver_role?: string | null
          required_tier_rank?: number | null
          status?: Database["public"]["Enums"]["expense_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Update: {
          amount?: number
          cost_category_id?: string
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          decided_by?: string | null
          description?: string
          event_id?: string
          expense_date?: string
          id?: string
          justification_note?: string | null
          paid_at?: string | null
          paid_by?: string | null
          payment_method?: Database["public"]["Enums"]["expense_payment_method"]
          receipt_document_id?: string | null
          rejection_reason?: string | null
          required_approver_role?: string | null
          required_tier_rank?: number | null
          status?: Database["public"]["Enums"]["expense_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          updated_at?: string
          updated_by?: string | null
          vendor_id?: string | null
          vendor_name?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "expenses_cost_category_id_fkey"
            columns: ["cost_category_id"]
            isOneToOne: false
            referencedRelation: "cost_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_paid_by_fkey"
            columns: ["paid_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_receipt_document_id_fkey"
            columns: ["receipt_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_required_approver_role_fkey"
            columns: ["required_approver_role"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["name"]
          },
          {
            foreignKeyName: "expenses_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_vendor_id_fkey"
            columns: ["vendor_id"]
            isOneToOne: false
            referencedRelation: "vendors"
            referencedColumns: ["id"]
          },
        ]
      }
      financial_closings: {
        Row: {
          actual_cost: number
          closed_at: string
          closed_by: string
          event_id: string
          gross_margin_pct: number | null
          gross_profit: number
          id: string
          margin_health:
            | Database["public"]["Enums"]["margin_health_band"]
            | null
          negative_margin_explanation: string | null
          reopened_at: string | null
          reopened_by: string | null
          reopened_reason: string | null
          revenue_recognized: number
        }
        Insert: {
          actual_cost: number
          closed_at?: string
          closed_by: string
          event_id: string
          gross_margin_pct?: number | null
          gross_profit: number
          id?: string
          margin_health?:
            | Database["public"]["Enums"]["margin_health_band"]
            | null
          negative_margin_explanation?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          reopened_reason?: string | null
          revenue_recognized: number
        }
        Update: {
          actual_cost?: number
          closed_at?: string
          closed_by?: string
          event_id?: string
          gross_margin_pct?: number | null
          gross_profit?: number
          id?: string
          margin_health?:
            | Database["public"]["Enums"]["margin_health_band"]
            | null
          negative_margin_explanation?: string | null
          reopened_at?: string | null
          reopened_by?: string | null
          reopened_reason?: string | null
          revenue_recognized?: number
        }
        Relationships: [
          {
            foreignKeyName: "financial_closings_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_closings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "financial_closings_reopened_by_fkey"
            columns: ["reopened_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invited_emails: {
        Row: {
          consumed_at: string | null
          email: string
          full_name: string | null
          invited_at: string
          invited_by: string | null
          roles: string[]
          team_id: string | null
        }
        Insert: {
          consumed_at?: string | null
          email: string
          full_name?: string | null
          invited_at?: string
          invited_by?: string | null
          roles?: string[]
          team_id?: string | null
        }
        Update: {
          consumed_at?: string | null
          email?: string
          full_name?: string | null
          invited_at?: string
          invited_by?: string | null
          roles?: string[]
          team_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "invited_emails_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invited_emails_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_deliveries: {
        Row: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at: string
          error: string | null
          id: string
          notification_id: string
          sent_at: string | null
          status: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Insert: {
          channel: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error?: string | null
          id?: string
          notification_id: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Update: {
          channel?: Database["public"]["Enums"]["notification_channel"]
          created_at?: string
          error?: string | null
          id?: string
          notification_id?: string
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notification_delivery_status"]
        }
        Relationships: [
          {
            foreignKeyName: "notification_deliveries_notification_id_fkey"
            columns: ["notification_id"]
            isOneToOne: false
            referencedRelation: "notifications"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          entity_id: string | null
          entity_type: string | null
          id: string
          is_read: boolean
          link_url: string | null
          priority: Database["public"]["Enums"]["notification_priority"]
          read_at: string | null
          recipient_user_id: string
          title: string
          type: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          recipient_user_id: string
          title: string
          type: string
        }
        Update: {
          body?: string | null
          created_at?: string
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          is_read?: boolean
          link_url?: string | null
          priority?: Database["public"]["Enums"]["notification_priority"]
          read_at?: string | null
          recipient_user_id?: string
          title?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_recipient_user_id_fkey"
            columns: ["recipient_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participant_attendance: {
        Row: {
          attendance_date: string
          id: string
          is_present: boolean
          participant_id: string
          recorded_at: string
          recorded_by: string | null
        }
        Insert: {
          attendance_date: string
          id?: string
          is_present?: boolean
          participant_id: string
          recorded_at?: string
          recorded_by?: string | null
        }
        Update: {
          attendance_date?: string
          id?: string
          is_present?: boolean
          participant_id?: string
          recorded_at?: string
          recorded_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "participant_attendance_participant_id_fkey"
            columns: ["participant_id"]
            isOneToOne: false
            referencedRelation: "participants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participant_attendance_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      participants: {
        Row: {
          billing_customer_id: string | null
          billing_status: Database["public"]["Enums"]["participant_billing_status"]
          certificate_number: string | null
          certificate_status: string | null
          company_name: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          event_id: string
          full_name: string
          id: string
          job_title: string | null
          nik: string | null
          payment_status: Database["public"]["Enums"]["participant_payment_status"]
          phone: string | null
          registration_status: string
          unit_price: number | null
        }
        Insert: {
          billing_customer_id?: string | null
          billing_status?: Database["public"]["Enums"]["participant_billing_status"]
          certificate_number?: string | null
          certificate_status?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          event_id: string
          full_name: string
          id?: string
          job_title?: string | null
          nik?: string | null
          payment_status?: Database["public"]["Enums"]["participant_payment_status"]
          phone?: string | null
          registration_status?: string
          unit_price?: number | null
        }
        Update: {
          billing_customer_id?: string | null
          billing_status?: Database["public"]["Enums"]["participant_billing_status"]
          certificate_number?: string | null
          certificate_status?: string | null
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          event_id?: string
          full_name?: string
          id?: string
          job_title?: string | null
          nik?: string | null
          payment_status?: Database["public"]["Enums"]["participant_payment_status"]
          phone?: string | null
          registration_status?: string
          unit_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "participants_billing_customer_id_fkey"
            columns: ["billing_customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "participants_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          code: string
          created_at: string
          description: string | null
          id: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          company_id: string
          created_at: string
          created_by: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean
          job_title: string | null
          notification_prefs: Json
          phone: string | null
          team_id: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          email: string
          full_name: string
          id: string
          is_active?: boolean
          job_title?: string | null
          notification_prefs?: Json
          phone?: string | null
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean
          job_title?: string | null
          notification_prefs?: Json
          phone?: string | null
          team_id?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_team_id_fkey"
            columns: ["team_id"]
            isOneToOne: false
            referencedRelation: "teams"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "profiles_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      task_template_items: {
        Row: {
          days_before_event: number
          description: string | null
          id: string
          is_mandatory: boolean
          priority: Database["public"]["Enums"]["task_priority"]
          sort_order: number
          template_id: string
          title: string
        }
        Insert: {
          days_before_event?: number
          description?: string | null
          id?: string
          is_mandatory?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          sort_order?: number
          template_id: string
          title: string
        }
        Update: {
          days_before_event?: number
          description?: string | null
          id?: string
          is_mandatory?: boolean
          priority?: Database["public"]["Enums"]["task_priority"]
          sort_order?: number
          template_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_template_items_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "task_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      task_templates: {
        Row: {
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"] | null
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          is_active: boolean
          name: string
        }
        Insert: {
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"] | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          is_active?: boolean
          name: string
        }
        Update: {
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          delivery_mode?: Database["public"]["Enums"]["delivery_mode"] | null
          event_type?: Database["public"]["Enums"]["event_type"] | null
          id?: string
          is_active?: boolean
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "task_templates_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "task_templates_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teams: {
        Row: {
          company_id: string
          created_at: string
          deleted_at: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          company_id: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          company_id?: string
          created_at?: string
          deleted_at?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teams_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_assignments: {
        Row: {
          assignment_date_end: string | null
          assignment_date_start: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          event_id: string
          fee: number | null
          id: string
          notes: string | null
          role: Database["public"]["Enums"]["trainer_assignment_role"]
          status: Database["public"]["Enums"]["trainer_assignment_status"]
          trainer_id: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          assignment_date_end?: string | null
          assignment_date_start?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_id: string
          fee?: number | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["trainer_assignment_role"]
          status?: Database["public"]["Enums"]["trainer_assignment_status"]
          trainer_id: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          assignment_date_end?: string | null
          assignment_date_start?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          event_id?: string
          fee?: number | null
          id?: string
          notes?: string | null
          role?: Database["public"]["Enums"]["trainer_assignment_role"]
          status?: Database["public"]["Enums"]["trainer_assignment_status"]
          trainer_id?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainer_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_assignments_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_assignments_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_assignments_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_specialties: {
        Row: {
          trainer_id: string
          training_id: string
        }
        Insert: {
          trainer_id: string
          training_id: string
        }
        Update: {
          trainer_id?: string
          training_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_specialties_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "trainers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainer_specialties_training_id_fkey"
            columns: ["training_id"]
            isOneToOne: false
            referencedRelation: "trainings"
            referencedColumns: ["id"]
          },
        ]
      }
      trainers: {
        Row: {
          certification_expires_at: string | null
          certification_name: string | null
          city_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          rate_card: number | null
          rating: number | null
          trainer_type: Database["public"]["Enums"]["trainer_type"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          certification_expires_at?: string | null
          certification_name?: string | null
          city_id?: string | null
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          rate_card?: number | null
          rating?: number | null
          trainer_type?: Database["public"]["Enums"]["trainer_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          certification_expires_at?: string | null
          certification_name?: string | null
          city_id?: string | null
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean
          notes?: string | null
          phone?: string | null
          rate_card?: number | null
          rating?: number | null
          trainer_type?: Database["public"]["Enums"]["trainer_type"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainers_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainers_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainers_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainers_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainings: {
        Row: {
          category: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          has_certification: boolean
          id: string
          is_active: boolean
          name: string
          standard_duration_days: number | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          code: string
          company_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          has_certification?: boolean
          id?: string
          is_active?: boolean
          name: string
          standard_duration_days?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          code?: string
          company_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          has_certification?: boolean
          id?: string
          is_active?: boolean
          name?: string
          standard_duration_days?: number | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainings_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trainings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          assigned_at: string
          assigned_by: string | null
          role_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          assigned_by?: string | null
          role_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          assigned_by?: string | null
          role_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      vendors: {
        Row: {
          category: string | null
          company_id: string
          contact_name: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          id: string
          is_active: boolean
          name: string
          npwp: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          category?: string | null
          company_id: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name: string
          npwp?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          category?: string | null
          company_id?: string
          contact_name?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean
          name?: string
          npwp?: string | null
          phone?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "vendors_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vendors_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      venue_bookings: {
        Row: {
          cancellation_policy: string | null
          confirmation_number: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          estimated_cost: number | null
          event_id: string
          id: string
          notes: string | null
          status: Database["public"]["Enums"]["venue_booking_status"]
          updated_at: string
          updated_by: string | null
          venue_id: string
        }
        Insert: {
          cancellation_policy?: string | null
          confirmation_number?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estimated_cost?: number | null
          event_id: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["venue_booking_status"]
          updated_at?: string
          updated_by?: string | null
          venue_id: string
        }
        Update: {
          cancellation_policy?: string | null
          confirmation_number?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          estimated_cost?: number | null
          event_id?: string
          id?: string
          notes?: string | null
          status?: Database["public"]["Enums"]["venue_booking_status"]
          updated_at?: string
          updated_by?: string | null
          venue_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "venue_bookings_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bookings_event_id_fkey"
            columns: ["event_id"]
            isOneToOne: false
            referencedRelation: "events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bookings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venue_bookings_venue_id_fkey"
            columns: ["venue_id"]
            isOneToOne: false
            referencedRelation: "venues"
            referencedColumns: ["id"]
          },
        ]
      }
      venues: {
        Row: {
          address: string | null
          capacity: number | null
          city_id: string | null
          company_id: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          reference_price: number | null
          updated_at: string
          updated_by: string | null
          venue_type: string | null
        }
        Insert: {
          address?: string | null
          capacity?: number | null
          city_id?: string | null
          company_id: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name: string
          notes?: string | null
          reference_price?: number | null
          updated_at?: string
          updated_by?: string | null
          venue_type?: string | null
        }
        Update: {
          address?: string | null
          capacity?: number | null
          city_id?: string | null
          company_id?: string
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          id?: string
          is_active?: boolean
          name?: string
          notes?: string | null
          reference_price?: number | null
          updated_at?: string
          updated_by?: string | null
          venue_type?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "venues_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_company_id_fkey"
            columns: ["company_id"]
            isOneToOne: false
            referencedRelation: "companies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "venues_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_change_request: {
        Args: {
          p_approve: boolean
          p_rejection_reason?: string
          p_request_id: string
        }
        Returns: {
          approved_at: string | null
          approved_by: string | null
          cost_impact_note: string | null
          created_at: string
          event_id: string
          field_name: string
          id: string
          new_value: string | null
          old_value: string | null
          reason: string
          rejection_reason: string | null
          requested_by: string
          status: Database["public"]["Enums"]["change_request_status"]
        }
        SetofOptions: {
          from: "*"
          to: "event_change_requests"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      apply_financial_closing: {
        Args: { p_event_id: string; p_negative_margin_explanation?: string }
        Returns: {
          actual_cost: number
          closed_at: string
          closed_by: string
          event_id: string
          gross_margin_pct: number | null
          gross_profit: number
          id: string
          margin_health:
            | Database["public"]["Enums"]["margin_health_band"]
            | null
          negative_margin_explanation: string | null
          reopened_at: string | null
          reopened_by: string | null
          reopened_reason: string | null
          revenue_recognized: number
        }
        SetofOptions: {
          from: "*"
          to: "financial_closings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      assign_pic: {
        Args: {
          p_backup_pic_user_id?: string
          p_event_id: string
          p_pic_user_id: string
          p_responsibility_note?: string
        }
        Returns: {
          approved_at: string | null
          backup_pic_user_id: string | null
          cancellation_category:
            | Database["public"]["Enums"]["cancellation_category"]
            | null
          cancellation_reason: string | null
          city_id: string | null
          closed_at: string | null
          company_id: string
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_reference: string | null
          deleted_at: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"] | null
          description: string | null
          duration_days: number | null
          end_date: string | null
          end_time: string | null
          event_code: string | null
          event_name: string
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          is_promotional: boolean
          is_rush: boolean
          location_name: string | null
          location_type: Database["public"]["Enums"]["location_type"] | null
          participant_count: number | null
          payment_term: Database["public"]["Enums"]["payment_term"] | null
          pic_assigned_at: string | null
          pic_assigned_by: string | null
          pic_user_id: string | null
          po_number: string | null
          po_status: Database["public"]["Enums"]["po_status"]
          possible_duplicate: boolean
          priority: Database["public"]["Enums"]["event_priority"]
          progress_percentage: number
          rejection_reason: string | null
          responsibility_note: string | null
          revenue_recognized_amount: number | null
          revision_note: string | null
          sales_team_id: string | null
          sales_user_id: string
          sales_value: number | null
          special_requirements: string | null
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"]
          submitted_at: string | null
          training_id: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      can_view_bi_analytics: { Args: never; Returns: boolean }
      can_view_event_financials: {
        Args: { p_event_id: string }
        Returns: boolean
      }
      check_overdue_tasks: { Args: never; Returns: undefined }
      compute_budget_variance: {
        Args: { p_event_id: string }
        Returns: {
          actual_amount: number
          band: string
          budgeted_amount: number
          cost_category_id: string
          cost_category_name: string
          variance_amount: number
          variance_pct: number
        }[]
      }
      compute_event_costs: {
        Args: { p_event_id: string }
        Returns: {
          actual_cost: number
          pending_cost: number
          projected_cost: number
        }[]
      }
      compute_event_revenue:
        | { Args: { p_event_id: string }; Returns: number }
        | {
            Args: { p_event_id: string; p_skip_auth: boolean }
            Returns: number
          }
      create_notification: {
        Args: {
          p_body: string
          p_entity_id: string
          p_entity_type: string
          p_link_url: string
          p_priority?: Database["public"]["Enums"]["notification_priority"]
          p_recipient_user_id: string
          p_title: string
          p_type: string
        }
        Returns: undefined
      }
      custom_access_token_hook: { Args: { event: Json }; Returns: Json }
      deactivate_city: {
        Args: { p_city_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          name: string
          province: string | null
        }
        SetofOptions: {
          from: "*"
          to: "cities"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deactivate_customer: {
        Args: { p_customer_id: string }
        Returns: {
          address: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          industry: string | null
          is_active: boolean
          name: string
          notes: string | null
          npwp: string | null
          phone: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "customers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deactivate_equipment: {
        Args: { p_equipment_id: string }
        Returns: {
          category: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          total_quantity: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "equipment"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deactivate_event: {
        Args: { p_event_id: string }
        Returns: {
          approved_at: string | null
          backup_pic_user_id: string | null
          cancellation_category:
            | Database["public"]["Enums"]["cancellation_category"]
            | null
          cancellation_reason: string | null
          city_id: string | null
          closed_at: string | null
          company_id: string
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_reference: string | null
          deleted_at: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"] | null
          description: string | null
          duration_days: number | null
          end_date: string | null
          end_time: string | null
          event_code: string | null
          event_name: string
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          is_promotional: boolean
          is_rush: boolean
          location_name: string | null
          location_type: Database["public"]["Enums"]["location_type"] | null
          participant_count: number | null
          payment_term: Database["public"]["Enums"]["payment_term"] | null
          pic_assigned_at: string | null
          pic_assigned_by: string | null
          pic_user_id: string | null
          po_number: string | null
          po_status: Database["public"]["Enums"]["po_status"]
          possible_duplicate: boolean
          priority: Database["public"]["Enums"]["event_priority"]
          progress_percentage: number
          rejection_reason: string | null
          responsibility_note: string | null
          revenue_recognized_amount: number | null
          revision_note: string | null
          sales_team_id: string | null
          sales_user_id: string
          sales_value: number | null
          special_requirements: string | null
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"]
          submitted_at: string | null
          training_id: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deactivate_trainer: {
        Args: { p_trainer_id: string }
        Returns: {
          certification_expires_at: string | null
          certification_name: string | null
          city_id: string | null
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          email: string | null
          full_name: string
          id: string
          is_active: boolean
          notes: string | null
          phone: string | null
          rate_card: number | null
          rating: number | null
          trainer_type: Database["public"]["Enums"]["trainer_type"]
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "trainers"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deactivate_training: {
        Args: { p_training_id: string }
        Returns: {
          category: string | null
          code: string
          company_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          has_certification: boolean
          id: string
          is_active: boolean
          name: string
          standard_duration_days: number | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "trainings"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      deactivate_venue: {
        Args: { p_venue_id: string }
        Returns: {
          address: string | null
          capacity: number | null
          city_id: string | null
          company_id: string
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          id: string
          is_active: boolean
          name: string
          notes: string | null
          reference_price: number | null
          updated_at: string
          updated_by: string | null
          venue_type: string | null
        }
        SetofOptions: {
          from: "*"
          to: "venues"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_budget: {
        Args: {
          p_approve: boolean
          p_budget_id: string
          p_rejection_reason?: string
        }
        Returns: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          event_id: string
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["event_budget_status"]
          submitted_at: string | null
          submitted_by: string | null
          total_amount: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "event_budgets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      decide_expense: {
        Args: {
          p_approve: boolean
          p_expense_id: string
          p_rejection_reason?: string
        }
        Returns: {
          amount: number
          cost_category_id: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          description: string
          event_id: string
          expense_date: string
          id: string
          justification_note: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: Database["public"]["Enums"]["expense_payment_method"]
          receipt_document_id: string | null
          rejection_reason: string | null
          required_approver_role: string | null
          required_tier_rank: number | null
          status: Database["public"]["Enums"]["expense_status"]
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expenses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      find_checklist_template: { Args: { p_event_id: string }; Returns: string }
      generate_event_checklist: {
        Args: { p_event_id: string }
        Returns: undefined
      }
      generate_event_code: { Args: never; Returns: string }
      get_cost_benchmark: {
        Args: {
          p_delivery_mode?: string
          p_event_type?: string
          p_training_id?: string
        }
        Returns: {
          avg_amount: number
          category_code: string
          category_name: string
          cost_category_id: string
          max_amount: number
          min_amount: number
          sample_count: number
          total_amount: number
        }[]
      }
      get_cost_estimator: {
        Args: {
          p_delivery_mode?: string
          p_event_type?: string
          p_participant_count?: number
          p_training_id?: string
        }
        Returns: Json
      }
      get_customer_profitability: {
        Args: never
        Returns: {
          customer_id: string
          customer_name: string
          gross_profit: number
          margin_pct: number
          total_cost: number
          total_events: number
          total_revenue: number
        }[]
      }
      get_financial_forecasting:
        | {
            Args: never
            Returns: {
              gross_profit: number
              margin_pct: number
              month_period: string
              total_cost: number
              total_events: number
              total_revenue: number
            }[]
          }
        | {
            Args: { p_delivery_mode?: string; p_event_type?: string }
            Returns: {
              gross_profit: number
              margin_pct: number
              month_period: string
              total_cost: number
              total_events: number
              total_revenue: number
            }[]
          }
      get_training_profitability:
        | {
            Args: never
            Returns: {
              gross_profit: number
              margin_pct: number
              total_cost: number
              total_events: number
              total_revenue: number
              training_code: string
              training_id: string
              training_name: string
            }[]
          }
        | {
            Args: {
              p_delivery_mode?: string
              p_event_type?: string
              p_training_id?: string
            }
            Returns: {
              gross_profit: number
              margin_pct: number
              total_cost: number
              total_events: number
              total_revenue: number
              training_code: string
              training_id: string
              training_name: string
            }[]
          }
      has_any_role: { Args: { rs: string[] }; Returns: boolean }
      has_role: { Args: { r: string }; Returns: boolean }
      log_participant_export: {
        Args: { p_count: number; p_event_id: string }
        Returns: undefined
      }
      mark_expense_paid: {
        Args: { p_expense_id: string }
        Returns: {
          amount: number
          cost_category_id: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          description: string
          event_id: string
          expense_date: string
          id: string
          justification_note: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: Database["public"]["Enums"]["expense_payment_method"]
          receipt_document_id: string | null
          rejection_reason: string | null
          required_approver_role: string | null
          required_tier_rank: number | null
          status: Database["public"]["Enums"]["expense_status"]
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expenses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      mark_expense_under_review: {
        Args: { p_expense_id: string }
        Returns: {
          amount: number
          cost_category_id: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          description: string
          event_id: string
          expense_date: string
          id: string
          justification_note: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: Database["public"]["Enums"]["expense_payment_method"]
          receipt_document_id: string | null
          rejection_reason: string | null
          required_approver_role: string | null
          required_tier_rank: number | null
          status: Database["public"]["Enums"]["expense_status"]
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expenses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      notify_event_status_change: {
        Args: {
          p_event: Database["public"]["Tables"]["events"]["Row"]
          p_from_status: Database["public"]["Enums"]["event_status"]
          p_reason: string
          p_to_status: Database["public"]["Enums"]["event_status"]
        }
        Returns: undefined
      }
      resolve_approval_tier: {
        Args: {
          p_amount: number
          p_company_id: string
          p_context: Database["public"]["Enums"]["approval_context"]
        }
        Returns: {
          approver_role: string
          company_id: string
          context: Database["public"]["Enums"]["approval_context"]
          created_at: string
          created_by: string | null
          id: string
          is_active: boolean
          max_amount: number | null
          min_amount: number
          sort_order: number
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "approval_thresholds"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      resolve_approver_max_rank: {
        Args: {
          p_company_id: string
          p_context: Database["public"]["Enums"]["approval_context"]
          p_user_id: string
        }
        Returns: number
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_event_budget: {
        Args: { p_budget_id: string }
        Returns: {
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          event_id: string
          id: string
          rejection_reason: string | null
          status: Database["public"]["Enums"]["event_budget_status"]
          submitted_at: string | null
          submitted_by: string | null
          total_amount: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        SetofOptions: {
          from: "*"
          to: "event_budgets"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      submit_expense: {
        Args: { p_expense_id: string }
        Returns: {
          amount: number
          cost_category_id: string
          created_at: string
          created_by: string | null
          decided_at: string | null
          decided_by: string | null
          description: string
          event_id: string
          expense_date: string
          id: string
          justification_note: string | null
          paid_at: string | null
          paid_by: string | null
          payment_method: Database["public"]["Enums"]["expense_payment_method"]
          receipt_document_id: string | null
          rejection_reason: string | null
          required_approver_role: string | null
          required_tier_rank: number | null
          status: Database["public"]["Enums"]["expense_status"]
          submitted_at: string | null
          submitted_by: string | null
          updated_at: string
          updated_by: string | null
          vendor_id: string | null
          vendor_name: string | null
        }
        SetofOptions: {
          from: "*"
          to: "expenses"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      transition_event_status: {
        Args: {
          p_cancellation_category?: Database["public"]["Enums"]["cancellation_category"]
          p_event_id: string
          p_metadata?: Json
          p_reason?: string
          p_to_status: Database["public"]["Enums"]["event_status"]
        }
        Returns: {
          approved_at: string | null
          backup_pic_user_id: string | null
          cancellation_category:
            | Database["public"]["Enums"]["cancellation_category"]
            | null
          cancellation_reason: string | null
          city_id: string | null
          closed_at: string | null
          company_id: string
          completed_at: string | null
          contact_id: string | null
          created_at: string
          created_by: string | null
          customer_id: string | null
          customer_reference: string | null
          deleted_at: string | null
          delivery_mode: Database["public"]["Enums"]["delivery_mode"] | null
          description: string | null
          duration_days: number | null
          end_date: string | null
          end_time: string | null
          event_code: string | null
          event_name: string
          event_type: Database["public"]["Enums"]["event_type"] | null
          id: string
          is_promotional: boolean
          is_rush: boolean
          location_name: string | null
          location_type: Database["public"]["Enums"]["location_type"] | null
          participant_count: number | null
          payment_term: Database["public"]["Enums"]["payment_term"] | null
          pic_assigned_at: string | null
          pic_assigned_by: string | null
          pic_user_id: string | null
          po_number: string | null
          po_status: Database["public"]["Enums"]["po_status"]
          possible_duplicate: boolean
          priority: Database["public"]["Enums"]["event_priority"]
          progress_percentage: number
          rejection_reason: string | null
          responsibility_note: string | null
          revenue_recognized_amount: number | null
          revision_note: string | null
          sales_team_id: string | null
          sales_user_id: string
          sales_value: number | null
          special_requirements: string | null
          start_date: string | null
          start_time: string | null
          status: Database["public"]["Enums"]["event_status"]
          submitted_at: string | null
          training_id: string | null
          updated_at: string
          updated_by: string | null
        }
        SetofOptions: {
          from: "*"
          to: "events"
          isOneToOne: true
          isSetofReturn: false
        }
      }
    }
    Enums: {
      approval_context: "EXPENSE" | "BUDGET"
      cancellation_category:
        | "CUSTOMER_CANCELLED"
        | "INTERNAL_CANCELLED"
        | "FORCE_MAJEURE"
        | "DUPLICATE"
        | "OTHER"
      change_request_status: "PENDING" | "APPROVED" | "REJECTED"
      delivery_mode: "OFFLINE" | "ONLINE" | "HYBRID"
      document_type:
        | "PROPOSAL"
        | "PO"
        | "INVOICE"
        | "ATTENDANCE"
        | "MATERIAL"
        | "CERTIFICATE"
        | "PHOTO"
        | "EVENT_REPORT"
        | "EXPENSE_RECEIPT"
        | "CONTRACT"
        | "OTHER"
      document_verification_status: "PENDING" | "VERIFIED" | "REJECTED"
      equipment_assignment_status:
        | "PLANNED"
        | "PREPARED"
        | "IN_USE"
        | "RETURNED"
      event_budget_status:
        | "DRAFT"
        | "SUBMITTED"
        | "APPROVED"
        | "REJECTED"
        | "SUPERSEDED"
      event_priority: "LOW" | "NORMAL" | "HIGH" | "URGENT"
      event_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "REVISION_REQUESTED"
        | "APPROVED"
        | "REJECTED"
        | "PIC_ASSIGNED"
        | "PREPARATION"
        | "READY"
        | "RUNNING"
        | "COMPLETED"
        | "POST_EVENT"
        | "FINANCIAL_CLOSING"
        | "CLOSED"
        | "CANCELLED"
        | "POSTPONED"
      event_type: "INHOUSE" | "PUBLIC" | "PRIVATE" | "CUSTOM"
      expense_payment_method:
        | "CASH_ADVANCE"
        | "REIMBURSEMENT"
        | "TRANSFER"
        | "COMPANY_CARD"
      expense_status:
        | "DRAFT"
        | "SUBMITTED"
        | "UNDER_REVIEW"
        | "APPROVED"
        | "REJECTED"
        | "PAID"
      issue_category:
        | "TRAINER"
        | "VENUE"
        | "PARTICIPANT"
        | "EQUIPMENT"
        | "MATERIAL"
        | "CUSTOMER"
        | "LOGISTIC"
        | "FINANCE"
        | "OTHER"
      issue_severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      issue_status: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
      location_type: "CLIENT_SITE" | "HOTEL" | "OFFICE" | "ONLINE" | "OTHER"
      margin_health_band: "GREEN" | "YELLOW" | "RED" | "NEGATIVE"
      notification_channel: "IN_APP" | "EMAIL" | "WHATSAPP"
      notification_delivery_status: "PENDING" | "SENT" | "FAILED"
      notification_priority: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
      participant_billing_status: "CONFIRMED" | "CANCELLED" | "WAIVED"
      participant_payment_status: "UNPAID" | "INVOICED" | "PARTIAL" | "PAID"
      payment_term: "DP" | "FULL_BEFORE" | "NET_14" | "NET_30" | "OTHER"
      po_status: "NO_PO" | "PO_PENDING" | "PO_RECEIVED" | "VERBAL_COMMITMENT"
      task_priority: "LOW" | "NORMAL" | "HIGH" | "CRITICAL"
      task_status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "DONE" | "CANCELLED"
      trainer_assignment_role: "MAIN" | "CO_TRAINER" | "ASSESSOR" | "BACKUP"
      trainer_assignment_status:
        | "REQUESTED"
        | "AVAILABLE"
        | "ASSIGNED"
        | "CONFIRMED"
        | "CANCELLED"
        | "REPLACED"
      trainer_type: "INTERNAL" | "ASSOCIATE" | "FREELANCE"
      venue_booking_status:
        | "INQUIRY"
        | "HOLD"
        | "BOOKED"
        | "CONFIRMED"
        | "CANCELLED"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      approval_context: ["EXPENSE", "BUDGET"],
      cancellation_category: [
        "CUSTOMER_CANCELLED",
        "INTERNAL_CANCELLED",
        "FORCE_MAJEURE",
        "DUPLICATE",
        "OTHER",
      ],
      change_request_status: ["PENDING", "APPROVED", "REJECTED"],
      delivery_mode: ["OFFLINE", "ONLINE", "HYBRID"],
      document_type: [
        "PROPOSAL",
        "PO",
        "INVOICE",
        "ATTENDANCE",
        "MATERIAL",
        "CERTIFICATE",
        "PHOTO",
        "EVENT_REPORT",
        "EXPENSE_RECEIPT",
        "CONTRACT",
        "OTHER",
      ],
      document_verification_status: ["PENDING", "VERIFIED", "REJECTED"],
      equipment_assignment_status: [
        "PLANNED",
        "PREPARED",
        "IN_USE",
        "RETURNED",
      ],
      event_budget_status: [
        "DRAFT",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
        "SUPERSEDED",
      ],
      event_priority: ["LOW", "NORMAL", "HIGH", "URGENT"],
      event_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "REVISION_REQUESTED",
        "APPROVED",
        "REJECTED",
        "PIC_ASSIGNED",
        "PREPARATION",
        "READY",
        "RUNNING",
        "COMPLETED",
        "POST_EVENT",
        "FINANCIAL_CLOSING",
        "CLOSED",
        "CANCELLED",
        "POSTPONED",
      ],
      event_type: ["INHOUSE", "PUBLIC", "PRIVATE", "CUSTOM"],
      expense_payment_method: [
        "CASH_ADVANCE",
        "REIMBURSEMENT",
        "TRANSFER",
        "COMPANY_CARD",
      ],
      expense_status: [
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "PAID",
      ],
      issue_category: [
        "TRAINER",
        "VENUE",
        "PARTICIPANT",
        "EQUIPMENT",
        "MATERIAL",
        "CUSTOMER",
        "LOGISTIC",
        "FINANCE",
        "OTHER",
      ],
      issue_severity: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      issue_status: ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"],
      location_type: ["CLIENT_SITE", "HOTEL", "OFFICE", "ONLINE", "OTHER"],
      margin_health_band: ["GREEN", "YELLOW", "RED", "NEGATIVE"],
      notification_channel: ["IN_APP", "EMAIL", "WHATSAPP"],
      notification_delivery_status: ["PENDING", "SENT", "FAILED"],
      notification_priority: ["LOW", "MEDIUM", "HIGH", "CRITICAL"],
      participant_billing_status: ["CONFIRMED", "CANCELLED", "WAIVED"],
      participant_payment_status: ["UNPAID", "INVOICED", "PARTIAL", "PAID"],
      payment_term: ["DP", "FULL_BEFORE", "NET_14", "NET_30", "OTHER"],
      po_status: ["NO_PO", "PO_PENDING", "PO_RECEIVED", "VERBAL_COMMITMENT"],
      task_priority: ["LOW", "NORMAL", "HIGH", "CRITICAL"],
      task_status: ["TODO", "IN_PROGRESS", "BLOCKED", "DONE", "CANCELLED"],
      trainer_assignment_role: ["MAIN", "CO_TRAINER", "ASSESSOR", "BACKUP"],
      trainer_assignment_status: [
        "REQUESTED",
        "AVAILABLE",
        "ASSIGNED",
        "CONFIRMED",
        "CANCELLED",
        "REPLACED",
      ],
      trainer_type: ["INTERNAL", "ASSOCIATE", "FREELANCE"],
      venue_booking_status: [
        "INQUIRY",
        "HOLD",
        "BOOKED",
        "CONFIRMED",
        "CANCELLED",
      ],
    },
  },
} as const
