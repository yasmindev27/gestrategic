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
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      avaliacoes_historico: {
        Row: {
          acao: string
          avaliacao_id: string | null
          created_at: string
          dados_anteriores: Json | null
          dados_novos: Json | null
          executado_por: string | null
          id: string
          prontuario_id: string
        }
        Insert: {
          acao: string
          avaliacao_id?: string | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          executado_por?: string | null
          id?: string
          prontuario_id: string
        }
        Update: {
          acao?: string
          avaliacao_id?: string | null
          created_at?: string
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          executado_por?: string | null
          id?: string
          prontuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_historico_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes_prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      avaliacoes_prontuarios: {
        Row: {
          acolhimento_triagem: string | null
          acolhimento_triagem_obs: string | null
          atendimento_medico: string | null
          atendimento_medico_obs: string | null
          avaliador_id: string
          comentarios_finais: string | null
          created_at: string
          data_conclusao: string | null
          data_inicio: string
          documentacao_medica_cfm: string | null
          documentacao_medica_cfm_obs: string | null
          enfermagem_medicacao: string | null
          enfermagem_medicacao_obs: string | null
          id: string
          identificacao_paciente: string | null
          identificacao_paciente_obs: string | null
          is_finalizada: boolean
          numero_prontuario: string | null
          observacoes: string | null
          paciente_internado: string | null
          paciente_internado_obs: string | null
          paciente_nome: string | null
          prontuario_id: string
          resultado_final: string | null
          saida_prontuario_id: string | null
          status: string
          unidade_setor: string | null
          updated_at: string
        }
        Insert: {
          acolhimento_triagem?: string | null
          acolhimento_triagem_obs?: string | null
          atendimento_medico?: string | null
          atendimento_medico_obs?: string | null
          avaliador_id: string
          comentarios_finais?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string
          documentacao_medica_cfm?: string | null
          documentacao_medica_cfm_obs?: string | null
          enfermagem_medicacao?: string | null
          enfermagem_medicacao_obs?: string | null
          id?: string
          identificacao_paciente?: string | null
          identificacao_paciente_obs?: string | null
          is_finalizada?: boolean
          numero_prontuario?: string | null
          observacoes?: string | null
          paciente_internado?: string | null
          paciente_internado_obs?: string | null
          paciente_nome?: string | null
          prontuario_id: string
          resultado_final?: string | null
          saida_prontuario_id?: string | null
          status?: string
          unidade_setor?: string | null
          updated_at?: string
        }
        Update: {
          acolhimento_triagem?: string | null
          acolhimento_triagem_obs?: string | null
          atendimento_medico?: string | null
          atendimento_medico_obs?: string | null
          avaliador_id?: string
          comentarios_finais?: string | null
          created_at?: string
          data_conclusao?: string | null
          data_inicio?: string
          documentacao_medica_cfm?: string | null
          documentacao_medica_cfm_obs?: string | null
          enfermagem_medicacao?: string | null
          enfermagem_medicacao_obs?: string | null
          id?: string
          identificacao_paciente?: string | null
          identificacao_paciente_obs?: string | null
          is_finalizada?: boolean
          numero_prontuario?: string | null
          observacoes?: string | null
          paciente_internado?: string | null
          paciente_internado_obs?: string | null
          paciente_nome?: string | null
          prontuario_id?: string
          resultado_final?: string | null
          saida_prontuario_id?: string | null
          status?: string
          unidade_setor?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "avaliacoes_prontuarios_prontuario_id_fkey"
            columns: ["prontuario_id"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "avaliacoes_prontuarios_saida_prontuario_id_fkey"
            columns: ["saida_prontuario_id"]
            isOneToOne: false
            referencedRelation: "saida_prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      cadastros_inconsistentes: {
        Row: {
          created_at: string
          descricao: string
          id: string
          numero_prontuario: string | null
          prontuario_id: string | null
          registrado_por: string
          resolvido_em: string | null
          resolvido_por: string | null
          status: string
          tipo_inconsistencia: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          numero_prontuario?: string | null
          prontuario_id?: string | null
          registrado_por: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          tipo_inconsistencia: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          numero_prontuario?: string | null
          prontuario_id?: string | null
          registrado_por?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          status?: string
          tipo_inconsistencia?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cadastros_inconsistentes_prontuario_id_fkey"
            columns: ["prontuario_id"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      logs_acesso: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          id: string
          ip_address: string | null
          modulo: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
          modulo: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          id?: string
          ip_address?: string | null
          modulo?: string
          user_id?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          full_name: string
          id: string
          setor: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          full_name: string
          id?: string
          setor?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          full_name?: string
          id?: string
          setor?: string | null
          telefone?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      prontuarios: {
        Row: {
          created_at: string
          created_by: string | null
          data_atendimento: string | null
          id: string
          numero_prontuario: string
          observacoes: string | null
          paciente_cpf: string | null
          paciente_nome: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_atendimento?: string | null
          id?: string
          numero_prontuario: string
          observacoes?: string | null
          paciente_cpf?: string | null
          paciente_nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_atendimento?: string | null
          id?: string
          numero_prontuario?: string
          observacoes?: string | null
          paciente_cpf?: string | null
          paciente_nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      saida_prontuarios: {
        Row: {
          conferido_nir_em: string | null
          conferido_nir_por: string | null
          created_at: string
          existe_fisicamente: boolean | null
          id: string
          numero_prontuario: string
          observacao_classificacao: string | null
          observacao_nir: string | null
          prontuario_id: string | null
          registrado_recepcao_em: string | null
          registrado_recepcao_por: string | null
          status: string
          updated_at: string
          validado_classificacao_em: string | null
          validado_classificacao_por: string | null
        }
        Insert: {
          conferido_nir_em?: string | null
          conferido_nir_por?: string | null
          created_at?: string
          existe_fisicamente?: boolean | null
          id?: string
          numero_prontuario: string
          observacao_classificacao?: string | null
          observacao_nir?: string | null
          prontuario_id?: string | null
          registrado_recepcao_em?: string | null
          registrado_recepcao_por?: string | null
          status?: string
          updated_at?: string
          validado_classificacao_em?: string | null
          validado_classificacao_por?: string | null
        }
        Update: {
          conferido_nir_em?: string | null
          conferido_nir_por?: string | null
          created_at?: string
          existe_fisicamente?: boolean | null
          id?: string
          numero_prontuario?: string
          observacao_classificacao?: string | null
          observacao_nir?: string | null
          prontuario_id?: string | null
          registrado_recepcao_em?: string | null
          registrado_recepcao_por?: string | null
          status?: string
          updated_at?: string
          validado_classificacao_em?: string | null
          validado_classificacao_por?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "saida_prontuarios_prontuario_id_fkey"
            columns: ["prontuario_id"]
            isOneToOne: false
            referencedRelation: "prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
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
      get_prontuario_status: {
        Args: { p_prontuario_id: string }
        Returns: {
          avaliacao_status: string
          fluxo_status: string
          id: string
          numero_prontuario: string
          paciente_nome: string
          prontuario_status: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      has_any_role: {
        Args: {
          _roles: Database["public"]["Enums"]["app_role"][]
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      app_role:
        | "admin"
        | "gestor"
        | "funcionario"
        | "recepcao"
        | "classificacao"
        | "nir"
        | "faturamento"
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
      app_role: [
        "admin",
        "gestor",
        "funcionario",
        "recepcao",
        "classificacao",
        "nir",
        "faturamento",
      ],
    },
  },
} as const
