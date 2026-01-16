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
      agenda_destinatarios: {
        Row: {
          agenda_item_id: string
          created_at: string | null
          id: string
          usuario_id: string
          visualizado: boolean | null
          visualizado_em: string | null
        }
        Insert: {
          agenda_item_id: string
          created_at?: string | null
          id?: string
          usuario_id: string
          visualizado?: boolean | null
          visualizado_em?: string | null
        }
        Update: {
          agenda_item_id?: string
          created_at?: string | null
          id?: string
          usuario_id?: string
          visualizado?: boolean | null
          visualizado_em?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "agenda_destinatarios_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "agenda_items"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_items: {
        Row: {
          created_at: string | null
          criado_por: string
          data_fim: string | null
          data_inicio: string
          descricao: string | null
          hora: string | null
          id: string
          prioridade: string | null
          status: string | null
          tipo: string
          titulo: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          criado_por: string
          data_fim?: string | null
          data_inicio: string
          descricao?: string | null
          hora?: string | null
          id?: string
          prioridade?: string | null
          status?: string | null
          tipo: string
          titulo: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          criado_por?: string
          data_fim?: string | null
          data_inicio?: string
          descricao?: string | null
          hora?: string | null
          id?: string
          prioridade?: string | null
          status?: string | null
          tipo?: string
          titulo?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      atestados: {
        Row: {
          arquivo_url: string | null
          cid: string | null
          created_at: string
          crm: string | null
          data_fim: string
          data_inicio: string
          dias_afastamento: number
          funcionario_nome: string
          funcionario_user_id: string
          id: string
          medico_nome: string | null
          observacao: string | null
          registrado_por: string
          status: string
          tipo: string
          updated_at: string
          validado_em: string | null
          validado_por: string | null
        }
        Insert: {
          arquivo_url?: string | null
          cid?: string | null
          created_at?: string
          crm?: string | null
          data_fim: string
          data_inicio: string
          dias_afastamento: number
          funcionario_nome: string
          funcionario_user_id: string
          id?: string
          medico_nome?: string | null
          observacao?: string | null
          registrado_por: string
          status?: string
          tipo: string
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Update: {
          arquivo_url?: string | null
          cid?: string | null
          created_at?: string
          crm?: string | null
          data_fim?: string
          data_inicio?: string
          dias_afastamento?: number
          funcionario_nome?: string
          funcionario_user_id?: string
          id?: string
          medico_nome?: string | null
          observacao?: string | null
          registrado_por?: string
          status?: string
          tipo?: string
          updated_at?: string
          validado_em?: string | null
          validado_por?: string | null
        }
        Relationships: []
      }
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
      banco_horas: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          created_at: string
          data: string
          funcionario_nome: string
          funcionario_user_id: string
          horas: number
          id: string
          motivo: string | null
          observacao: string | null
          registrado_por: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          data: string
          funcionario_nome: string
          funcionario_user_id: string
          horas: number
          id?: string
          motivo?: string | null
          observacao?: string | null
          registrado_por: string
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          data?: string
          funcionario_nome?: string
          funcionario_user_id?: string
          horas?: number
          id?: string
          motivo?: string | null
          observacao?: string | null
          registrado_por?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      bed_records: {
        Row: {
          bed_id: string
          bed_number: string
          condutas_outros: string | null
          created_at: string | null
          data_alta: string | null
          data_internacao: string | null
          data_nascimento: string | null
          enfermeiros: string | null
          estabelecimento_transferencia: string | null
          hipotese_diagnostica: string | null
          id: string
          medicos: string | null
          motivo_alta: string | null
          numero_sus_facil: string | null
          observacao: string | null
          patient_name: string | null
          regulador_nir: string | null
          sector: string
          shift_date: string
          shift_type: string
          sus_facil: string | null
          updated_at: string | null
        }
        Insert: {
          bed_id: string
          bed_number: string
          condutas_outros?: string | null
          created_at?: string | null
          data_alta?: string | null
          data_internacao?: string | null
          data_nascimento?: string | null
          enfermeiros?: string | null
          estabelecimento_transferencia?: string | null
          hipotese_diagnostica?: string | null
          id?: string
          medicos?: string | null
          motivo_alta?: string | null
          numero_sus_facil?: string | null
          observacao?: string | null
          patient_name?: string | null
          regulador_nir?: string | null
          sector: string
          shift_date: string
          shift_type: string
          sus_facil?: string | null
          updated_at?: string | null
        }
        Update: {
          bed_id?: string
          bed_number?: string
          condutas_outros?: string | null
          created_at?: string | null
          data_alta?: string | null
          data_internacao?: string | null
          data_nascimento?: string | null
          enfermeiros?: string | null
          estabelecimento_transferencia?: string | null
          hipotese_diagnostica?: string | null
          id?: string
          medicos?: string | null
          motivo_alta?: string | null
          numero_sus_facil?: string | null
          observacao?: string | null
          patient_name?: string | null
          regulador_nir?: string | null
          sector?: string
          shift_date?: string
          shift_type?: string
          sus_facil?: string | null
          updated_at?: string | null
        }
        Relationships: []
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
      cafe_litro_diario: {
        Row: {
          created_at: string
          data: string
          id: string
          observacao: string | null
          quantidade_litros: number
          registrado_por: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data: string
          id?: string
          observacao?: string | null
          quantidade_litros?: number
          registrado_por: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data?: string
          id?: string
          observacao?: string | null
          quantidade_litros?: number
          registrado_por?: string
          updated_at?: string
        }
        Relationships: []
      }
      cardapios: {
        Row: {
          created_at: string
          criado_por: string
          data: string
          descricao: string
          id: string
          observacoes: string | null
          tipo_refeicao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          data: string
          descricao: string
          id?: string
          observacoes?: string | null
          tipo_refeicao: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          data?: string
          descricao?: string
          id?: string
          observacoes?: string | null
          tipo_refeicao?: string
          updated_at?: string
        }
        Relationships: []
      }
      cargos: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      chamados: {
        Row: {
          atribuido_para: string | null
          categoria: string
          created_at: string
          data_abertura: string
          data_resolucao: string | null
          descricao: string
          id: string
          numero_chamado: string
          prazo_conclusao: string | null
          prioridade: string
          solicitante_id: string
          solicitante_nome: string
          solicitante_setor: string | null
          solucao: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          atribuido_para?: string | null
          categoria: string
          created_at?: string
          data_abertura?: string
          data_resolucao?: string | null
          descricao: string
          id?: string
          numero_chamado: string
          prazo_conclusao?: string | null
          prioridade?: string
          solicitante_id: string
          solicitante_nome: string
          solicitante_setor?: string | null
          solucao?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          atribuido_para?: string | null
          categoria?: string
          created_at?: string
          data_abertura?: string
          data_resolucao?: string | null
          descricao?: string
          id?: string
          numero_chamado?: string
          prazo_conclusao?: string | null
          prioridade?: string
          solicitante_id?: string
          solicitante_nome?: string
          solicitante_setor?: string | null
          solucao?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      chamados_comentarios: {
        Row: {
          chamado_id: string
          comentario: string
          created_at: string
          id: string
          usuario_id: string
          usuario_nome: string
        }
        Insert: {
          chamado_id: string
          comentario: string
          created_at?: string
          id?: string
          usuario_id: string
          usuario_nome: string
        }
        Update: {
          chamado_id?: string
          comentario?: string
          created_at?: string
          id?: string
          usuario_id?: string
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_comentarios_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
        ]
      }
      chamados_materiais: {
        Row: {
          chamado_id: string
          created_at: string
          id: string
          observacao: string | null
          produto_id: string
          quantidade: number
          registrado_por: string
        }
        Insert: {
          chamado_id: string
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id: string
          quantidade: number
          registrado_por: string
        }
        Update: {
          chamado_id?: string
          created_at?: string
          id?: string
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          registrado_por?: string
        }
        Relationships: [
          {
            foreignKeyName: "chamados_materiais_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chamados_materiais_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      daily_statistics: {
        Row: {
          admissions: number | null
          created_at: string | null
          date: string
          discharges: number | null
          id: string
          patients_by_sector: Json | null
          total_patients: number | null
          updated_at: string | null
        }
        Insert: {
          admissions?: number | null
          created_at?: string | null
          date: string
          discharges?: number | null
          id?: string
          patients_by_sector?: Json | null
          total_patients?: number | null
          updated_at?: string | null
        }
        Update: {
          admissions?: number | null
          created_at?: string | null
          date?: string
          discharges?: number | null
          id?: string
          patients_by_sector?: Json | null
          total_patients?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      escalas_laboratorio: {
        Row: {
          ano: number
          created_at: string
          created_by: string
          dia: number
          funcionario_id: string | null
          funcionario_nome: string
          id: string
          mes: number
          observacao: string | null
          turno: string
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          created_by: string
          dia: number
          funcionario_id?: string | null
          funcionario_nome: string
          id?: string
          mes: number
          observacao?: string | null
          turno: string
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          created_by?: string
          dia?: number
          funcionario_id?: string | null
          funcionario_nome?: string
          id?: string
          mes?: number
          observacao?: string | null
          turno?: string
          updated_at?: string
        }
        Relationships: []
      }
      gestor_cargos: {
        Row: {
          cargo_id: string
          created_at: string | null
          created_by: string | null
          gestor_user_id: string
          id: string
        }
        Insert: {
          cargo_id: string
          created_at?: string | null
          created_by?: string | null
          gestor_user_id: string
          id?: string
        }
        Update: {
          cargo_id?: string
          created_at?: string | null
          created_by?: string | null
          gestor_user_id?: string
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gestor_cargos_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      gestor_setores: {
        Row: {
          created_at: string | null
          created_by: string | null
          gestor_user_id: string
          id: string
          setor_id: string
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          gestor_user_id: string
          id?: string
          setor_id: string
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          gestor_user_id?: string
          id?: string
          setor_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gestor_setores_setor_id_fkey"
            columns: ["setor_id"]
            isOneToOne: false
            referencedRelation: "setores"
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
      movimentacoes_estoque: {
        Row: {
          created_at: string
          id: string
          motivo: string | null
          observacao: string | null
          produto_id: string
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          setor: string
          tipo: string
          usuario_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          produto_id: string
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          setor: string
          tipo: string
          usuario_id: string
        }
        Update: {
          created_at?: string
          id?: string
          motivo?: string | null
          observacao?: string | null
          produto_id?: string
          quantidade?: number
          quantidade_anterior?: number
          quantidade_nova?: number
          setor?: string
          tipo?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "movimentacoes_estoque_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      produtos: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          localizacao: string | null
          nome: string
          quantidade_atual: number | null
          quantidade_minima: number | null
          setor_responsavel: string
          unidade_medida: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          localizacao?: string | null
          nome: string
          quantidade_atual?: number | null
          quantidade_minima?: number | null
          setor_responsavel: string
          unidade_medida?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          localizacao?: string | null
          nome?: string
          quantidade_atual?: number | null
          quantidade_minima?: number | null
          setor_responsavel?: string
          unidade_medida?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          cargo: string | null
          created_at: string
          deve_trocar_senha: boolean | null
          full_name: string
          id: string
          matricula: string | null
          setor: string | null
          telefone: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          deve_trocar_senha?: boolean | null
          full_name: string
          id?: string
          matricula?: string | null
          setor?: string | null
          telefone?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          cargo?: string | null
          created_at?: string
          deve_trocar_senha?: boolean | null
          full_name?: string
          id?: string
          matricula?: string | null
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
      refeicoes_registros: {
        Row: {
          colaborador_nome: string
          colaborador_user_id: string | null
          created_at: string
          data_registro: string
          hora_registro: string
          id: string
          tipo_pessoa: string
          tipo_refeicao: string
          visitante_cpf_hash: string | null
        }
        Insert: {
          colaborador_nome: string
          colaborador_user_id?: string | null
          created_at?: string
          data_registro?: string
          hora_registro?: string
          id?: string
          tipo_pessoa: string
          tipo_refeicao: string
          visitante_cpf_hash?: string | null
        }
        Update: {
          colaborador_nome?: string
          colaborador_user_id?: string | null
          created_at?: string
          data_registro?: string
          hora_registro?: string
          id?: string
          tipo_pessoa?: string
          tipo_refeicao?: string
          visitante_cpf_hash?: string | null
        }
        Relationships: []
      }
      regulacao_sus_facil: {
        Row: {
          cid: string | null
          created_at: string
          created_by: string | null
          data_efetivacao: string | null
          data_resposta: string | null
          data_solicitacao: string
          estabelecimento_destino: string | null
          estabelecimento_origem: string | null
          hipotese_diagnostica: string | null
          id: string
          justificativa_negativa: string | null
          leito_destino: string | null
          medico_solicitante: string | null
          numero_solicitacao: string
          observacoes: string | null
          paciente_idade: number | null
          paciente_nome: string
          paciente_sexo: string | null
          prioridade: string | null
          procedimentos_necessarios: string | null
          quadro_clinico: string | null
          regulador_responsavel: string | null
          setor_destino: string | null
          status: string
          telefone_contato: string | null
          tipo: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          cid?: string | null
          created_at?: string
          created_by?: string | null
          data_efetivacao?: string | null
          data_resposta?: string | null
          data_solicitacao?: string
          estabelecimento_destino?: string | null
          estabelecimento_origem?: string | null
          hipotese_diagnostica?: string | null
          id?: string
          justificativa_negativa?: string | null
          leito_destino?: string | null
          medico_solicitante?: string | null
          numero_solicitacao: string
          observacoes?: string | null
          paciente_idade?: number | null
          paciente_nome: string
          paciente_sexo?: string | null
          prioridade?: string | null
          procedimentos_necessarios?: string | null
          quadro_clinico?: string | null
          regulador_responsavel?: string | null
          setor_destino?: string | null
          status?: string
          telefone_contato?: string | null
          tipo: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          cid?: string | null
          created_at?: string
          created_by?: string | null
          data_efetivacao?: string | null
          data_resposta?: string | null
          data_solicitacao?: string
          estabelecimento_destino?: string | null
          estabelecimento_origem?: string | null
          hipotese_diagnostica?: string | null
          id?: string
          justificativa_negativa?: string | null
          leito_destino?: string | null
          medico_solicitante?: string | null
          numero_solicitacao?: string
          observacoes?: string | null
          paciente_idade?: number | null
          paciente_nome?: string
          paciente_sexo?: string | null
          prioridade?: string | null
          procedimentos_necessarios?: string | null
          quadro_clinico?: string | null
          regulador_responsavel?: string | null
          setor_destino?: string | null
          status?: string
          telefone_contato?: string | null
          tipo?: string
          updated_at?: string
          updated_by?: string | null
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
          nascimento_mae: string | null
          numero_prontuario: string
          observacao_classificacao: string | null
          observacao_nir: string | null
          paciente_nome: string | null
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
          nascimento_mae?: string | null
          numero_prontuario: string
          observacao_classificacao?: string | null
          observacao_nir?: string | null
          paciente_nome?: string | null
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
          nascimento_mae?: string | null
          numero_prontuario?: string
          observacao_classificacao?: string | null
          observacao_nir?: string | null
          paciente_nome?: string | null
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
      setores: {
        Row: {
          ativo: boolean | null
          created_at: string | null
          descricao: string | null
          id: string
          nome: string
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome: string
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          created_at?: string | null
          descricao?: string | null
          id?: string
          nome?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      shift_configurations: {
        Row: {
          created_at: string | null
          enfermeiros: string | null
          id: string
          medicos: string | null
          regulador_nir: string | null
          shift_date: string
          shift_type: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          enfermeiros?: string | null
          id?: string
          medicos?: string | null
          regulador_nir?: string | null
          shift_date: string
          shift_type: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          enfermeiros?: string | null
          id?: string
          medicos?: string | null
          regulador_nir?: string | null
          shift_date?: string
          shift_type?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      solicitacoes_dieta: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          created_at: string
          data_fim: string | null
          data_inicio: string
          descricao_especifica: string | null
          horarios_refeicoes: string[] | null
          id: string
          observacoes: string | null
          paciente_data_nascimento: string | null
          paciente_nome: string | null
          quarto_leito: string | null
          restricoes_alimentares: string | null
          solicitante_id: string
          solicitante_nome: string
          status: string
          tem_acompanhante: boolean | null
          tipo_dieta: string
          updated_at: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          descricao_especifica?: string | null
          horarios_refeicoes?: string[] | null
          id?: string
          observacoes?: string | null
          paciente_data_nascimento?: string | null
          paciente_nome?: string | null
          quarto_leito?: string | null
          restricoes_alimentares?: string | null
          solicitante_id: string
          solicitante_nome: string
          status?: string
          tem_acompanhante?: boolean | null
          tipo_dieta: string
          updated_at?: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          descricao_especifica?: string | null
          horarios_refeicoes?: string[] | null
          id?: string
          observacoes?: string | null
          paciente_data_nascimento?: string | null
          paciente_nome?: string | null
          quarto_leito?: string | null
          restricoes_alimentares?: string | null
          solicitante_id?: string
          solicitante_nome?: string
          status?: string
          tem_acompanhante?: boolean | null
          tipo_dieta?: string
          updated_at?: string
        }
        Relationships: []
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
      valores_refeicoes: {
        Row: {
          atualizado_por: string | null
          created_at: string
          id: string
          tipo_refeicao: string
          updated_at: string
          valor: number
        }
        Insert: {
          atualizado_por?: string | null
          created_at?: string
          id?: string
          tipo_refeicao: string
          updated_at?: string
          valor?: number
        }
        Update: {
          atualizado_por?: string | null
          created_at?: string
          id?: string
          tipo_refeicao?: string
          updated_at?: string
          valor?: number
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      gestor_gerencia_usuario: {
        Args: { _gestor_id: string; _usuario_id: string }
        Returns: boolean
      }
      gestor_pode_atribuir: {
        Args: { _gestor_id: string; _usuario_id: string }
        Returns: boolean
      }
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
      get_tarefas_pendentes_count: {
        Args: { _user_id: string }
        Returns: number
      }
      get_user_names_by_ids: {
        Args: { _user_ids: string[] }
        Returns: {
          full_name: string
          user_id: string
        }[]
      }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["app_role"]
      }
      get_user_setor: { Args: { _user_id: string }; Returns: string }
      get_usuarios_sob_gestao: {
        Args: { _gestor_id: string }
        Returns: {
          cargo: string
          full_name: string
          setor: string
          user_id: string
        }[]
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
      is_agenda_creator: {
        Args: { _item_id: string; _user_id: string }
        Returns: boolean
      }
      is_agenda_recipient: {
        Args: { _item_id: string; _user_id: string }
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
        | "ti"
        | "manutencao"
        | "engenharia_clinica"
        | "laboratorio"
        | "restaurante"
        | "rh_dp"
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
        "ti",
        "manutencao",
        "engenharia_clinica",
        "laboratorio",
        "restaurante",
        "rh_dp",
      ],
    },
  },
} as const
