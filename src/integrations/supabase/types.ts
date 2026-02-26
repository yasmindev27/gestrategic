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
      achados_auditoria: {
        Row: {
          auditoria_id: string
          created_at: string
          descricao: string
          evidencia: string | null
          gravidade: string | null
          id: string
          registrado_por: string | null
          registrado_por_nome: string
          requisito_referencia: string | null
          status: string
          tipo_achado: string
          updated_at: string
        }
        Insert: {
          auditoria_id: string
          created_at?: string
          descricao: string
          evidencia?: string | null
          gravidade?: string | null
          id?: string
          registrado_por?: string | null
          registrado_por_nome: string
          requisito_referencia?: string | null
          status?: string
          tipo_achado: string
          updated_at?: string
        }
        Update: {
          auditoria_id?: string
          created_at?: string
          descricao?: string
          evidencia?: string | null
          gravidade?: string | null
          id?: string
          registrado_por?: string | null
          registrado_por_nome?: string
          requisito_referencia?: string | null
          status?: string
          tipo_achado?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "achados_auditoria_auditoria_id_fkey"
            columns: ["auditoria_id"]
            isOneToOne: false
            referencedRelation: "auditorias_qualidade"
            referencedColumns: ["id"]
          },
        ]
      }
      acoes_incidentes: {
        Row: {
          analise_id: string | null
          created_at: string
          data_conclusao: string | null
          descricao: string
          id: string
          incidente_id: string
          observacoes: string | null
          prazo: string
          registrado_por: string | null
          registrado_por_nome: string
          responsavel_id: string | null
          responsavel_nome: string
          status: string
          tipo_acao: string
          updated_at: string
        }
        Insert: {
          analise_id?: string | null
          created_at?: string
          data_conclusao?: string | null
          descricao: string
          id?: string
          incidente_id: string
          observacoes?: string | null
          prazo: string
          registrado_por?: string | null
          registrado_por_nome: string
          responsavel_id?: string | null
          responsavel_nome: string
          status?: string
          tipo_acao: string
          updated_at?: string
        }
        Update: {
          analise_id?: string | null
          created_at?: string
          data_conclusao?: string | null
          descricao?: string
          id?: string
          incidente_id?: string
          observacoes?: string | null
          prazo?: string
          registrado_por?: string | null
          registrado_por_nome?: string
          responsavel_id?: string | null
          responsavel_nome?: string
          status?: string
          tipo_acao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "acoes_incidentes_analise_id_fkey"
            columns: ["analise_id"]
            isOneToOne: false
            referencedRelation: "analises_incidentes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "acoes_incidentes_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes_nsp"
            referencedColumns: ["id"]
          },
        ]
      }
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
      alertas_seguranca: {
        Row: {
          atendido_em: string | null
          atendido_por: string | null
          atendido_por_nome: string | null
          created_at: string
          desfecho: string | null
          id: string
          observacao: string | null
          setor: string
          status: string
          tipo: string
          updated_at: string
          usuario_id: string
          usuario_nome: string
        }
        Insert: {
          atendido_em?: string | null
          atendido_por?: string | null
          atendido_por_nome?: string | null
          created_at?: string
          desfecho?: string | null
          id?: string
          observacao?: string | null
          setor: string
          status?: string
          tipo?: string
          updated_at?: string
          usuario_id: string
          usuario_nome: string
        }
        Update: {
          atendido_em?: string | null
          atendido_por?: string | null
          atendido_por_nome?: string | null
          created_at?: string
          desfecho?: string | null
          id?: string
          observacao?: string | null
          setor?: string
          status?: string
          tipo?: string
          updated_at?: string
          usuario_id?: string
          usuario_nome?: string
        }
        Relationships: []
      }
      analises_incidentes: {
        Row: {
          analisado_por: string | null
          analisado_por_nome: string
          causas_identificadas: string | null
          created_at: string
          data_analise: string
          descricao_analise: string
          fatores_contribuintes: string | null
          id: string
          incidente_id: string
          tipo_analise: string
          updated_at: string
        }
        Insert: {
          analisado_por?: string | null
          analisado_por_nome: string
          causas_identificadas?: string | null
          created_at?: string
          data_analise?: string
          descricao_analise: string
          fatores_contribuintes?: string | null
          id?: string
          incidente_id: string
          tipo_analise: string
          updated_at?: string
        }
        Update: {
          analisado_por?: string | null
          analisado_por_nome?: string
          causas_identificadas?: string | null
          created_at?: string
          data_analise?: string
          descricao_analise?: string
          fatores_contribuintes?: string | null
          id?: string
          incidente_id?: string
          tipo_analise?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "analises_incidentes_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes_nsp"
            referencedColumns: ["id"]
          },
        ]
      }
      asos_seguranca: {
        Row: {
          cargo_atual: string | null
          cargo_novo: string | null
          colaborador_nome: string
          colaborador_user_id: string | null
          created_at: string
          crm: string | null
          data_exame: string
          data_validade: string | null
          exames_realizados: string | null
          id: string
          medico_nome: string | null
          observacoes: string | null
          registrado_por: string | null
          registrado_por_nome: string
          restricoes: string | null
          resultado: string
          riscos_ocupacionais: string | null
          setor: string | null
          status: string
          tipo_aso: string
          updated_at: string
        }
        Insert: {
          cargo_atual?: string | null
          cargo_novo?: string | null
          colaborador_nome: string
          colaborador_user_id?: string | null
          created_at?: string
          crm?: string | null
          data_exame: string
          data_validade?: string | null
          exames_realizados?: string | null
          id?: string
          medico_nome?: string | null
          observacoes?: string | null
          registrado_por?: string | null
          registrado_por_nome: string
          restricoes?: string | null
          resultado?: string
          riscos_ocupacionais?: string | null
          setor?: string | null
          status?: string
          tipo_aso: string
          updated_at?: string
        }
        Update: {
          cargo_atual?: string | null
          cargo_novo?: string | null
          colaborador_nome?: string
          colaborador_user_id?: string | null
          created_at?: string
          crm?: string | null
          data_exame?: string
          data_validade?: string | null
          exames_realizados?: string | null
          id?: string
          medico_nome?: string | null
          observacoes?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string
          restricoes?: string | null
          resultado?: string
          riscos_ocupacionais?: string | null
          setor?: string | null
          status?: string
          tipo_aso?: string
          updated_at?: string
        }
        Relationships: []
      }
      assistencia_social_atendimentos: {
        Row: {
          created_at: string
          data_atendimento: string
          descricao: string
          id: string
          motivo: string
          observacoes: string | null
          paciente_id: string
          profissional_id: string | null
          profissional_nome: string
          status: string
          tipo_atendimento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_atendimento?: string
          descricao: string
          id?: string
          motivo: string
          observacoes?: string | null
          paciente_id: string
          profissional_id?: string | null
          profissional_nome: string
          status?: string
          tipo_atendimento: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_atendimento?: string
          descricao?: string
          id?: string
          motivo?: string
          observacoes?: string | null
          paciente_id?: string
          profissional_id?: string | null
          profissional_nome?: string
          status?: string
          tipo_atendimento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistencia_social_atendimentos_paciente_id_fkey"
            columns: ["paciente_id"]
            isOneToOne: false
            referencedRelation: "assistencia_social_pacientes"
            referencedColumns: ["id"]
          },
        ]
      }
      assistencia_social_documentos: {
        Row: {
          arquivo_url: string
          atendimento_id: string
          created_at: string
          id: string
          nome_arquivo: string
          tamanho_bytes: number | null
          tipo_documento: string
          uploaded_by: string | null
          uploaded_by_nome: string
        }
        Insert: {
          arquivo_url: string
          atendimento_id: string
          created_at?: string
          id?: string
          nome_arquivo: string
          tamanho_bytes?: number | null
          tipo_documento: string
          uploaded_by?: string | null
          uploaded_by_nome: string
        }
        Update: {
          arquivo_url?: string
          atendimento_id?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          tamanho_bytes?: number | null
          tipo_documento?: string
          uploaded_by?: string | null
          uploaded_by_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistencia_social_documentos_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "assistencia_social_atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      assistencia_social_encaminhamentos: {
        Row: {
          atendimento_id: string
          created_at: string
          data_encaminhamento: string
          data_retorno: string | null
          destino: string | null
          id: string
          motivo: string
          observacoes: string | null
          registrado_por: string | null
          registrado_por_nome: string
          status: string
          tipo_encaminhamento: string
          updated_at: string
        }
        Insert: {
          atendimento_id: string
          created_at?: string
          data_encaminhamento?: string
          data_retorno?: string | null
          destino?: string | null
          id?: string
          motivo: string
          observacoes?: string | null
          registrado_por?: string | null
          registrado_por_nome: string
          status?: string
          tipo_encaminhamento: string
          updated_at?: string
        }
        Update: {
          atendimento_id?: string
          created_at?: string
          data_encaminhamento?: string
          data_retorno?: string | null
          destino?: string | null
          id?: string
          motivo?: string
          observacoes?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string
          status?: string
          tipo_encaminhamento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "assistencia_social_encaminhamentos_atendimento_id_fkey"
            columns: ["atendimento_id"]
            isOneToOne: false
            referencedRelation: "assistencia_social_atendimentos"
            referencedColumns: ["id"]
          },
        ]
      }
      assistencia_social_pacientes: {
        Row: {
          cns: string | null
          cpf: string | null
          created_at: string
          created_by: string | null
          data_nascimento: string | null
          endereco: string | null
          id: string
          nome_completo: string
          numero_prontuario: string | null
          observacoes: string | null
          setor_atendimento: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          cns?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          id?: string
          nome_completo: string
          numero_prontuario?: string | null
          observacoes?: string | null
          setor_atendimento: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          cns?: string | null
          cpf?: string | null
          created_at?: string
          created_by?: string | null
          data_nascimento?: string | null
          endereco?: string | null
          id?: string
          nome_completo?: string
          numero_prontuario?: string | null
          observacoes?: string | null
          setor_atendimento?: string
          telefone?: string | null
          updated_at?: string
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
      ativos: {
        Row: {
          categoria: string
          created_at: string
          created_by: string | null
          criticidade: string
          data_aquisicao: string | null
          data_garantia_fim: string | null
          descricao: string | null
          fabricante: string | null
          id: string
          modelo: string | null
          nome: string
          numero_patrimonio: string | null
          numero_serie: string | null
          observacoes: string | null
          setor_localizacao: string | null
          setor_responsavel: string
          status: string
          updated_at: string
          valor_aquisicao: number | null
          vida_util_meses: number | null
        }
        Insert: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          criticidade?: string
          data_aquisicao?: string | null
          data_garantia_fim?: string | null
          descricao?: string | null
          fabricante?: string | null
          id?: string
          modelo?: string | null
          nome: string
          numero_patrimonio?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          setor_localizacao?: string | null
          setor_responsavel: string
          status?: string
          updated_at?: string
          valor_aquisicao?: number | null
          vida_util_meses?: number | null
        }
        Update: {
          categoria?: string
          created_at?: string
          created_by?: string | null
          criticidade?: string
          data_aquisicao?: string | null
          data_garantia_fim?: string | null
          descricao?: string | null
          fabricante?: string | null
          id?: string
          modelo?: string | null
          nome?: string
          numero_patrimonio?: string | null
          numero_serie?: string | null
          observacoes?: string | null
          setor_localizacao?: string | null
          setor_responsavel?: string
          status?: string
          updated_at?: string
          valor_aquisicao?: number | null
          vida_util_meses?: number | null
        }
        Relationships: []
      }
      ativos_disponibilidade: {
        Row: {
          ativo_id: string
          created_at: string
          data: string
          horas_operacionais: number
          horas_parado: number
          id: string
          motivo_parada: string | null
          registrado_por: string | null
          registrado_por_nome: string | null
          setor: string
        }
        Insert: {
          ativo_id: string
          created_at?: string
          data: string
          horas_operacionais?: number
          horas_parado?: number
          id?: string
          motivo_parada?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string | null
          setor: string
        }
        Update: {
          ativo_id?: string
          created_at?: string
          data?: string
          horas_operacionais?: number
          horas_parado?: number
          id?: string
          motivo_parada?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string | null
          setor?: string
        }
        Relationships: [
          {
            foreignKeyName: "ativos_disponibilidade_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_formularios_config: {
        Row: {
          ativo: boolean | null
          created_at: string
          icone: string | null
          id: string
          nome: string
          ordem: number | null
          setores: string[] | null
          tipo: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
          setores?: string[] | null
          tipo: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          setores?: string[] | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      auditoria_perguntas_config: {
        Row: {
          ativo: boolean | null
          codigo: string
          created_at: string
          id: string
          label: string
          opcoes: string[]
          ordem: number | null
          secao_id: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          codigo: string
          created_at?: string
          id?: string
          label: string
          opcoes?: string[]
          ordem?: number | null
          secao_id: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          codigo?: string
          created_at?: string
          id?: string
          label?: string
          opcoes?: string[]
          ordem?: number | null
          secao_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_perguntas_config_secao_id_fkey"
            columns: ["secao_id"]
            isOneToOne: false
            referencedRelation: "auditoria_secoes_config"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_secoes_config: {
        Row: {
          created_at: string
          formulario_id: string
          id: string
          nome: string
          ordem: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          formulario_id: string
          id?: string
          nome: string
          ordem?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          formulario_id?: string
          id?: string
          nome?: string
          ordem?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditoria_secoes_config_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "auditoria_formularios_config"
            referencedColumns: ["id"]
          },
        ]
      }
      auditoria_temporalidade: {
        Row: {
          created_at: string
          created_by: string | null
          data_fato: string
          data_registro: string
          delay_horas: number | null
          descricao: string
          id: string
          justificado: boolean | null
          justificativa_id: string | null
          limite_horas: number
          modulo: string
          registro_id: string | null
          setor: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_fato: string
          data_registro: string
          delay_horas?: number | null
          descricao: string
          id?: string
          justificado?: boolean | null
          justificativa_id?: string | null
          limite_horas?: number
          modulo: string
          registro_id?: string | null
          setor: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_fato?: string
          data_registro?: string
          delay_horas?: number | null
          descricao?: string
          id?: string
          justificado?: boolean | null
          justificativa_id?: string | null
          limite_horas?: number
          modulo?: string
          registro_id?: string | null
          setor?: string
        }
        Relationships: []
      }
      auditorias_qualidade: {
        Row: {
          auditor: string
          created_at: string
          created_by: string | null
          created_by_nome: string
          data_auditoria: string
          escopo: string | null
          id: string
          observacoes: string | null
          resultado: string | null
          setor_auditado: string
          status: string
          tipo_auditoria: string
          titulo: string
          updated_at: string
        }
        Insert: {
          auditor: string
          created_at?: string
          created_by?: string | null
          created_by_nome: string
          data_auditoria: string
          escopo?: string | null
          id?: string
          observacoes?: string | null
          resultado?: string | null
          setor_auditado: string
          status?: string
          tipo_auditoria: string
          titulo: string
          updated_at?: string
        }
        Update: {
          auditor?: string
          created_at?: string
          created_by?: string | null
          created_by_nome?: string
          data_auditoria?: string
          escopo?: string | null
          id?: string
          observacoes?: string | null
          resultado?: string | null
          setor_auditado?: string
          status?: string
          tipo_auditoria?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      auditorias_seguranca_paciente: {
        Row: {
          apresentou_queda: boolean | null
          auditor_id: string
          auditor_nome: string
          created_at: string | null
          data_auditoria: string
          grau_lpp: string | null
          id: string
          mes_avaliacao: string | null
          notificacao_aberta: string | null
          numero_prontuario: string | null
          observacoes: string | null
          paciente_iniciais: string | null
          paciente_ra: string | null
          possui_lpp: boolean | null
          profissional_auditado: string | null
          respostas: Json
          satisfacao_geral: number | null
          score_risco: string | null
          setor: string
          tipo: string
          unidade_atendimento: string | null
          updated_at: string | null
        }
        Insert: {
          apresentou_queda?: boolean | null
          auditor_id: string
          auditor_nome: string
          created_at?: string | null
          data_auditoria: string
          grau_lpp?: string | null
          id?: string
          mes_avaliacao?: string | null
          notificacao_aberta?: string | null
          numero_prontuario?: string | null
          observacoes?: string | null
          paciente_iniciais?: string | null
          paciente_ra?: string | null
          possui_lpp?: boolean | null
          profissional_auditado?: string | null
          respostas?: Json
          satisfacao_geral?: number | null
          score_risco?: string | null
          setor: string
          tipo: string
          unidade_atendimento?: string | null
          updated_at?: string | null
        }
        Update: {
          apresentou_queda?: boolean | null
          auditor_id?: string
          auditor_nome?: string
          created_at?: string | null
          data_auditoria?: string
          grau_lpp?: string | null
          id?: string
          mes_avaliacao?: string | null
          notificacao_aberta?: string | null
          numero_prontuario?: string | null
          observacoes?: string | null
          paciente_iniciais?: string | null
          paciente_ra?: string | null
          possui_lpp?: boolean | null
          profissional_auditado?: string | null
          respostas?: Json
          satisfacao_geral?: number | null
          score_risco?: string | null
          setor?: string
          tipo?: string
          unidade_atendimento?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      avaliacoes_desempenho: {
        Row: {
          acoes_desenvolvimento: Json | null
          avaliador: string
          cargo: string | null
          colaborador: string
          created_at: string
          data_avaliacao: string
          feedback: string | null
          id: string
          medias_categorias: Json | null
          nota_geral: number | null
          oportunidades: string | null
          pontos_fortes: string | null
          registrado_por: string | null
          scores: Json
          updated_at: string
        }
        Insert: {
          acoes_desenvolvimento?: Json | null
          avaliador: string
          cargo?: string | null
          colaborador: string
          created_at?: string
          data_avaliacao?: string
          feedback?: string | null
          id?: string
          medias_categorias?: Json | null
          nota_geral?: number | null
          oportunidades?: string | null
          pontos_fortes?: string | null
          registrado_por?: string | null
          scores?: Json
          updated_at?: string
        }
        Update: {
          acoes_desenvolvimento?: Json | null
          avaliador?: string
          cargo?: string | null
          colaborador?: string
          created_at?: string
          data_avaliacao?: string
          feedback?: string | null
          id?: string
          medias_categorias?: Json | null
          nota_geral?: number | null
          oportunidades?: string | null
          pontos_fortes?: string | null
          registrado_por?: string | null
          scores?: Json
          updated_at?: string
        }
        Relationships: []
      }
      avaliacoes_experiencia: {
        Row: {
          acoes_adequacao: string | null
          assiduidade: string
          avaliador_id: string | null
          avaliador_nome: string
          colaborador_nome: string
          competencias_ajustes: string | null
          competencias_destaque: string | null
          created_at: string
          data_admissao: string
          data_avaliacao: string
          data_termino_experiencia: string | null
          disciplina: string
          funcao: string | null
          id: string
          iniciativa: string
          outros_comentarios: string | null
          periodo_avaliacao: string
          produtividade: string
          responsabilidade: string
          resultado: string
          setor: string | null
          updated_at: string
        }
        Insert: {
          acoes_adequacao?: string | null
          assiduidade: string
          avaliador_id?: string | null
          avaliador_nome: string
          colaborador_nome: string
          competencias_ajustes?: string | null
          competencias_destaque?: string | null
          created_at?: string
          data_admissao: string
          data_avaliacao?: string
          data_termino_experiencia?: string | null
          disciplina: string
          funcao?: string | null
          id?: string
          iniciativa: string
          outros_comentarios?: string | null
          periodo_avaliacao: string
          produtividade: string
          responsabilidade: string
          resultado: string
          setor?: string | null
          updated_at?: string
        }
        Update: {
          acoes_adequacao?: string | null
          assiduidade?: string
          avaliador_id?: string | null
          avaliador_nome?: string
          colaborador_nome?: string
          competencias_ajustes?: string | null
          competencias_destaque?: string | null
          created_at?: string
          data_admissao?: string
          data_avaliacao?: string
          data_termino_experiencia?: string | null
          disciplina?: string
          funcao?: string | null
          id?: string
          iniciativa?: string
          outros_comentarios?: string | null
          periodo_avaliacao?: string
          produtividade?: string
          responsabilidade?: string
          resultado?: string
          setor?: string | null
          updated_at?: string
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
          avaliador_id: string | null
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
          prontuario_id: string | null
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
          avaliador_id?: string | null
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
          prontuario_id?: string | null
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
          avaliador_id?: string | null
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
          prontuario_id?: string | null
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
          paciente_nome: string | null
          prontuario_id: string | null
          registrado_por: string | null
          resolvido_em: string | null
          resolvido_por: string | null
          resolvido_por_nome: string | null
          status: string
          tipo_inconsistencia: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          numero_prontuario?: string | null
          paciente_nome?: string | null
          prontuario_id?: string | null
          registrado_por?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          resolvido_por_nome?: string | null
          status?: string
          tipo_inconsistencia: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          numero_prontuario?: string | null
          paciente_nome?: string | null
          prontuario_id?: string | null
          registrado_por?: string | null
          resolvido_em?: string | null
          resolvido_por?: string | null
          resolvido_por_nome?: string | null
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
      chat_conversas: {
        Row: {
          created_at: string
          criado_por: string
          descricao: string | null
          id: string
          nome: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por: string
          descricao?: string | null
          id?: string
          nome: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string
          descricao?: string | null
          id?: string
          nome?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_mensagens: {
        Row: {
          arquivo_url: string | null
          conteudo: string
          conversa_id: string
          created_at: string
          editado: boolean | null
          excluido: boolean | null
          id: string
          remetente_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          conteudo: string
          conversa_id: string
          created_at?: string
          editado?: boolean | null
          excluido?: boolean | null
          id?: string
          remetente_id: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          conteudo?: string
          conversa_id?: string
          created_at?: string
          editado?: boolean | null
          excluido?: boolean | null
          id?: string
          remetente_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_mensagens_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "chat_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_mensagens_lidas: {
        Row: {
          id: string
          lido_em: string
          mensagem_id: string
          user_id: string
        }
        Insert: {
          id?: string
          lido_em?: string
          mensagem_id: string
          user_id: string
        }
        Update: {
          id?: string
          lido_em?: string
          mensagem_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_mensagens_lidas_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "chat_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_moderacao_logs: {
        Row: {
          acao_tomada: string
          conteudo_original: string | null
          created_at: string
          detalhes: Json | null
          id: string
          mensagem_id: string | null
          tipo_violacao: string
          user_id: string
        }
        Insert: {
          acao_tomada: string
          conteudo_original?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          mensagem_id?: string | null
          tipo_violacao: string
          user_id: string
        }
        Update: {
          acao_tomada?: string
          conteudo_original?: string | null
          created_at?: string
          detalhes?: Json | null
          id?: string
          mensagem_id?: string | null
          tipo_violacao?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_moderacao_logs_mensagem_id_fkey"
            columns: ["mensagem_id"]
            isOneToOne: false
            referencedRelation: "chat_mensagens"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_participantes: {
        Row: {
          adicionado_por: string | null
          conversa_id: string
          created_at: string
          id: string
          user_id: string
        }
        Insert: {
          adicionado_por?: string | null
          conversa_id: string
          created_at?: string
          id?: string
          user_id: string
        }
        Update: {
          adicionado_por?: string | null
          conversa_id?: string
          created_at?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_participantes_conversa_id_fkey"
            columns: ["conversa_id"]
            isOneToOne: false
            referencedRelation: "chat_conversas"
            referencedColumns: ["id"]
          },
        ]
      }
      colaboradores_restaurante: {
        Row: {
          ativo: boolean
          cargo: string | null
          created_at: string
          created_by: string | null
          id: string
          matricula: string | null
          nome: string
          setor: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          matricula?: string | null
          nome: string
          setor?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cargo?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          matricula?: string | null
          nome?: string
          setor?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      controle_vigencia: {
        Row: {
          arquivo_url: string | null
          bloqueio_operacional: boolean | null
          categoria: string
          created_at: string
          created_by: string | null
          data_emissao: string | null
          data_validade: string
          descricao: string
          id: string
          referencia_id: string | null
          referencia_nome: string | null
          setor_responsavel: string | null
          tipo_documento: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          bloqueio_operacional?: boolean | null
          categoria: string
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_validade: string
          descricao: string
          id?: string
          referencia_id?: string | null
          referencia_nome?: string | null
          setor_responsavel?: string | null
          tipo_documento: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          bloqueio_operacional?: boolean | null
          categoria?: string
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_validade?: string
          descricao?: string
          id?: string
          referencia_id?: string | null
          referencia_nome?: string | null
          setor_responsavel?: string | null
          tipo_documento?: string
          updated_at?: string
        }
        Relationships: []
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
      disc_results: {
        Row: {
          cargo_atual: string
          created_at: string
          created_by: string | null
          experiencia_lideranca: string
          formacao: string
          id: string
          leadership_score: number
          nome_completo: string
          perfil_predominante: string
          perfil_secundario: string
          score_c: number
          score_d: number
          score_i: number
          score_s: number
          setor: string
          tempo_atuacao: string
        }
        Insert: {
          cargo_atual: string
          created_at?: string
          created_by?: string | null
          experiencia_lideranca: string
          formacao: string
          id?: string
          leadership_score?: number
          nome_completo: string
          perfil_predominante: string
          perfil_secundario: string
          score_c?: number
          score_d?: number
          score_i?: number
          score_s?: number
          setor: string
          tempo_atuacao: string
        }
        Update: {
          cargo_atual?: string
          created_at?: string
          created_by?: string | null
          experiencia_lideranca?: string
          formacao?: string
          id?: string
          leadership_score?: number
          nome_completo?: string
          perfil_predominante?: string
          perfil_secundario?: string
          score_c?: number
          score_d?: number
          score_i?: number
          score_s?: number
          setor?: string
          tempo_atuacao?: string
        }
        Relationships: []
      }
      enfermagem_configuracoes: {
        Row: {
          chave: string
          created_at: string
          descricao: string | null
          id: string
          updated_at: string
          valor: string
        }
        Insert: {
          chave: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor: string
        }
        Update: {
          chave?: string
          created_at?: string
          descricao?: string | null
          id?: string
          updated_at?: string
          valor?: string
        }
        Relationships: []
      }
      enfermagem_escalas: {
        Row: {
          created_at: string
          created_by: string
          data_plantao: string
          hora_fim: string
          hora_inicio: string
          id: string
          observacoes: string | null
          profissional_id: string
          profissional_nome: string
          profissional_saude_id: string | null
          setor: string
          status: string
          tipo_plantao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          data_plantao: string
          hora_fim: string
          hora_inicio: string
          id?: string
          observacoes?: string | null
          profissional_id: string
          profissional_nome: string
          profissional_saude_id?: string | null
          setor: string
          status?: string
          tipo_plantao: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          data_plantao?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          observacoes?: string | null
          profissional_id?: string
          profissional_nome?: string
          profissional_saude_id?: string | null
          setor?: string
          status?: string
          tipo_plantao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enfermagem_escalas_profissional_saude_id_fkey"
            columns: ["profissional_saude_id"]
            isOneToOne: false
            referencedRelation: "profissionais_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      enfermagem_trocas: {
        Row: {
          aceitante_id: string | null
          aceitante_nome: string | null
          aprovador_id: string | null
          aprovador_nome: string | null
          created_at: string
          data_aprovacao: string | null
          escala_id: string
          id: string
          justificativa_rejeicao: string | null
          motivo_oferta: string | null
          ofertante_id: string
          ofertante_nome: string
          requer_aprovacao: boolean
          status: string
          updated_at: string
        }
        Insert: {
          aceitante_id?: string | null
          aceitante_nome?: string | null
          aprovador_id?: string | null
          aprovador_nome?: string | null
          created_at?: string
          data_aprovacao?: string | null
          escala_id: string
          id?: string
          justificativa_rejeicao?: string | null
          motivo_oferta?: string | null
          ofertante_id: string
          ofertante_nome: string
          requer_aprovacao?: boolean
          status?: string
          updated_at?: string
        }
        Update: {
          aceitante_id?: string | null
          aceitante_nome?: string | null
          aprovador_id?: string | null
          aprovador_nome?: string | null
          created_at?: string
          data_aprovacao?: string | null
          escala_id?: string
          id?: string
          justificativa_rejeicao?: string | null
          motivo_oferta?: string | null
          ofertante_id?: string
          ofertante_nome?: string
          requer_aprovacao?: boolean
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "enfermagem_trocas_escala_id_fkey"
            columns: ["escala_id"]
            isOneToOne: false
            referencedRelation: "enfermagem_escalas"
            referencedColumns: ["id"]
          },
        ]
      }
      enfermagem_trocas_historico: {
        Row: {
          acao: string
          created_at: string
          detalhes: Json | null
          executado_por: string
          executado_por_nome: string
          id: string
          troca_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: Json | null
          executado_por: string
          executado_por_nome: string
          id?: string
          troca_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: Json | null
          executado_por?: string
          executado_por_nome?: string
          id?: string
          troca_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "enfermagem_trocas_historico_troca_id_fkey"
            columns: ["troca_id"]
            isOneToOne: false
            referencedRelation: "enfermagem_trocas"
            referencedColumns: ["id"]
          },
        ]
      }
      entregas_prontuarios: {
        Row: {
          created_at: string
          data_hora: string
          entregador_id: string
          entregador_nome: string
          id: string
          observacao: string | null
          responsavel_recebimento_id: string | null
          responsavel_recebimento_nome: string
          setor_destino: string
          setor_origem: string
        }
        Insert: {
          created_at?: string
          data_hora?: string
          entregador_id: string
          entregador_nome: string
          id?: string
          observacao?: string | null
          responsavel_recebimento_id?: string | null
          responsavel_recebimento_nome: string
          setor_destino: string
          setor_origem: string
        }
        Update: {
          created_at?: string
          data_hora?: string
          entregador_id?: string
          entregador_nome?: string
          id?: string
          observacao?: string | null
          responsavel_recebimento_id?: string | null
          responsavel_recebimento_nome?: string
          setor_destino?: string
          setor_origem?: string
        }
        Relationships: []
      }
      entregas_prontuarios_itens: {
        Row: {
          created_at: string
          entrega_id: string
          id: string
          saida_prontuario_id: string
        }
        Insert: {
          created_at?: string
          entrega_id: string
          id?: string
          saida_prontuario_id: string
        }
        Update: {
          created_at?: string
          entrega_id?: string
          id?: string
          saida_prontuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "entregas_prontuarios_itens_entrega_id_fkey"
            columns: ["entrega_id"]
            isOneToOne: false
            referencedRelation: "entregas_prontuarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entregas_prontuarios_itens_saida_prontuario_id_fkey"
            columns: ["saida_prontuario_id"]
            isOneToOne: false
            referencedRelation: "saida_prontuarios"
            referencedColumns: ["id"]
          },
        ]
      }
      epis_seguranca: {
        Row: {
          ca_numero: string | null
          created_at: string
          data_entrega: string
          data_validade: string | null
          id: string
          observacao: string | null
          quantidade: number
          registrado_por: string
          registrado_por_nome: string
          status: string
          tipo_epi: string
          updated_at: string
          usuario_id: string
          usuario_nome: string
        }
        Insert: {
          ca_numero?: string | null
          created_at?: string
          data_entrega: string
          data_validade?: string | null
          id?: string
          observacao?: string | null
          quantidade?: number
          registrado_por: string
          registrado_por_nome: string
          status?: string
          tipo_epi: string
          updated_at?: string
          usuario_id: string
          usuario_nome: string
        }
        Update: {
          ca_numero?: string | null
          created_at?: string
          data_entrega?: string
          data_validade?: string | null
          id?: string
          observacao?: string | null
          quantidade?: number
          registrado_por?: string
          registrado_por_nome?: string
          status?: string
          tipo_epi?: string
          updated_at?: string
          usuario_id?: string
          usuario_nome?: string
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
      escalas_medicos: {
        Row: {
          created_at: string
          created_by: string | null
          data_plantao: string
          hora_fim: string
          hora_inicio: string
          id: string
          observacoes: string | null
          profissional_id: string
          setor: string
          status: string
          tipo_plantao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_plantao: string
          hora_fim: string
          hora_inicio: string
          id?: string
          observacoes?: string | null
          profissional_id: string
          setor: string
          status?: string
          tipo_plantao?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_plantao?: string
          hora_fim?: string
          hora_inicio?: string
          id?: string
          observacoes?: string | null
          profissional_id?: string
          setor?: string
          status?: string
          tipo_plantao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "escalas_medicos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      ferramentas_modulo: {
        Row: {
          codigo: string
          created_at: string | null
          descricao: string | null
          id: string
          modulo_id: string | null
          nome: string
          ordem: number | null
        }
        Insert: {
          codigo: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          modulo_id?: string | null
          nome: string
          ordem?: number | null
        }
        Update: {
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          id?: string
          modulo_id?: string | null
          nome?: string
          ordem?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "ferramentas_modulo_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_campos: {
        Row: {
          created_at: string
          formulario_id: string
          id: string
          label: string
          obrigatorio: boolean | null
          opcoes: string[] | null
          ordem: number
          tipo: string
        }
        Insert: {
          created_at?: string
          formulario_id: string
          id?: string
          label: string
          obrigatorio?: boolean | null
          opcoes?: string[] | null
          ordem?: number
          tipo: string
        }
        Update: {
          created_at?: string
          formulario_id?: string
          id?: string
          label?: string
          obrigatorio?: boolean | null
          opcoes?: string[] | null
          ordem?: number
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "formulario_campos_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_permissoes: {
        Row: {
          created_at: string
          formulario_id: string
          id: string
          tipo_permissao: string
          valor: string | null
        }
        Insert: {
          created_at?: string
          formulario_id: string
          id?: string
          tipo_permissao: string
          valor?: string | null
        }
        Update: {
          created_at?: string
          formulario_id?: string
          id?: string
          tipo_permissao?: string
          valor?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "formulario_permissoes_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      formulario_respostas: {
        Row: {
          created_at: string
          formulario_id: string
          id: string
          respondido_em: string
          respondido_por: string | null
          respostas: Json
        }
        Insert: {
          created_at?: string
          formulario_id: string
          id?: string
          respondido_em?: string
          respondido_por?: string | null
          respostas?: Json
        }
        Update: {
          created_at?: string
          formulario_id?: string
          id?: string
          respondido_em?: string
          respondido_por?: string | null
          respostas?: Json
        }
        Relationships: [
          {
            foreignKeyName: "formulario_respostas_formulario_id_fkey"
            columns: ["formulario_id"]
            isOneToOne: false
            referencedRelation: "formularios"
            referencedColumns: ["id"]
          },
        ]
      }
      formularios: {
        Row: {
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          prazo: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          prazo?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          prazo?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      gerencia_fornecedores: {
        Row: {
          ativo: boolean
          cnpj: string
          created_at: string
          created_by: string | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string
          created_at?: string
          created_by?: string | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      gerencia_notas_fiscais: {
        Row: {
          ano: number
          cnpj: string
          competencia: string
          created_at: string
          created_by: string | null
          data_envio: string | null
          data_recebimento: string | null
          fornecedor_id: string | null
          fornecedor_nome: string
          id: string
          numero_nf: string
          observacao: string | null
          status: string
          status_pagamento: string
          updated_at: string
          valor_nota: number
        }
        Insert: {
          ano?: number
          cnpj?: string
          competencia: string
          created_at?: string
          created_by?: string | null
          data_envio?: string | null
          data_recebimento?: string | null
          fornecedor_id?: string | null
          fornecedor_nome: string
          id?: string
          numero_nf?: string
          observacao?: string | null
          status?: string
          status_pagamento?: string
          updated_at?: string
          valor_nota?: number
        }
        Update: {
          ano?: number
          cnpj?: string
          competencia?: string
          created_at?: string
          created_by?: string | null
          data_envio?: string | null
          data_recebimento?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string
          id?: string
          numero_nf?: string
          observacao?: string | null
          status?: string
          status_pagamento?: string
          updated_at?: string
          valor_nota?: number
        }
        Relationships: [
          {
            foreignKeyName: "gerencia_notas_fiscais_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "gerencia_fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      gerencia_planos_acao: {
        Row: {
          created_at: string
          created_by: string | null
          data_conclusao: string | null
          data_criacao: string
          descricao: string | null
          id: string
          observacoes: string | null
          prazo: string
          prioridade: string
          responsavel_id: string | null
          responsavel_nome: string
          setor: string
          status: string
          titulo: string
          ultima_atualizacao_em: string | null
          ultima_atualizacao_por: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_criacao?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          prazo: string
          prioridade?: string
          responsavel_id?: string | null
          responsavel_nome: string
          setor: string
          status?: string
          titulo: string
          ultima_atualizacao_em?: string | null
          ultima_atualizacao_por?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_conclusao?: string | null
          data_criacao?: string
          descricao?: string | null
          id?: string
          observacoes?: string | null
          prazo?: string
          prioridade?: string
          responsavel_id?: string | null
          responsavel_nome?: string
          setor?: string
          status?: string
          titulo?: string
          ultima_atualizacao_em?: string | null
          ultima_atualizacao_por?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      gerencia_planos_historico: {
        Row: {
          acao: string
          created_at: string
          detalhes: string | null
          executado_por: string | null
          executado_por_nome: string
          id: string
          plano_id: string
        }
        Insert: {
          acao: string
          created_at?: string
          detalhes?: string | null
          executado_por?: string | null
          executado_por_nome: string
          id?: string
          plano_id: string
        }
        Update: {
          acao?: string
          created_at?: string
          detalhes?: string | null
          executado_por?: string | null
          executado_por_nome?: string
          id?: string
          plano_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "gerencia_planos_historico_plano_id_fkey"
            columns: ["plano_id"]
            isOneToOne: false
            referencedRelation: "gerencia_planos_acao"
            referencedColumns: ["id"]
          },
        ]
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
      incidentes_nsp: {
        Row: {
          categoria_operacional: string | null
          classificacao_risco: string
          created_at: string
          data_ocorrencia: string
          descricao: string
          id: string
          local_ocorrencia: string
          notificacao_anonima: boolean | null
          notificador_id: string | null
          notificador_nome: string | null
          numero_notificacao: string
          observacoes: string | null
          paciente_envolvido: boolean | null
          paciente_nome: string | null
          paciente_prontuario: string | null
          setor: string
          setor_origem: string | null
          status: string
          tipo_incidente: string
          updated_at: string
        }
        Insert: {
          categoria_operacional?: string | null
          classificacao_risco: string
          created_at?: string
          data_ocorrencia: string
          descricao: string
          id?: string
          local_ocorrencia: string
          notificacao_anonima?: boolean | null
          notificador_id?: string | null
          notificador_nome?: string | null
          numero_notificacao: string
          observacoes?: string | null
          paciente_envolvido?: boolean | null
          paciente_nome?: string | null
          paciente_prontuario?: string | null
          setor: string
          setor_origem?: string | null
          status?: string
          tipo_incidente: string
          updated_at?: string
        }
        Update: {
          categoria_operacional?: string | null
          classificacao_risco?: string
          created_at?: string
          data_ocorrencia?: string
          descricao?: string
          id?: string
          local_ocorrencia?: string
          notificacao_anonima?: boolean | null
          notificador_id?: string | null
          notificador_nome?: string | null
          numero_notificacao?: string
          observacoes?: string | null
          paciente_envolvido?: boolean | null
          paciente_nome?: string | null
          paciente_prontuario?: string | null
          setor?: string
          setor_origem?: string | null
          status?: string
          tipo_incidente?: string
          updated_at?: string
        }
        Relationships: []
      }
      justificativas_atraso: {
        Row: {
          acao_corretiva: string
          aprovado_em: string | null
          aprovado_por: string | null
          aprovado_por_nome: string | null
          auditoria_id: string
          created_at: string
          id: string
          motivo: string
          observacao_gerencia: string | null
          prazo_correcao: string | null
          responsavel_id: string | null
          responsavel_nome: string
          status: string
          updated_at: string
        }
        Insert: {
          acao_corretiva: string
          aprovado_em?: string | null
          aprovado_por?: string | null
          aprovado_por_nome?: string | null
          auditoria_id: string
          created_at?: string
          id?: string
          motivo: string
          observacao_gerencia?: string | null
          prazo_correcao?: string | null
          responsavel_id?: string | null
          responsavel_nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          acao_corretiva?: string
          aprovado_em?: string | null
          aprovado_por?: string | null
          aprovado_por_nome?: string | null
          auditoria_id?: string
          created_at?: string
          id?: string
          motivo?: string
          observacao_gerencia?: string | null
          prazo_correcao?: string | null
          responsavel_id?: string | null
          responsavel_nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "justificativas_atraso_auditoria_id_fkey"
            columns: ["auditoria_id"]
            isOneToOne: false
            referencedRelation: "auditoria_temporalidade"
            referencedColumns: ["id"]
          },
        ]
      }
      justificativas_ponto: {
        Row: {
          cargo_funcao: string | null
          colaborador_nome: string
          colaborador_user_id: string | null
          created_at: string
          data_ocorrencia: string
          id: string
          jornada_contratual_entrada: string | null
          jornada_contratual_saida: string | null
          jornada_registrada_entrada: string | null
          jornada_registrada_saida: string | null
          justificativa: string | null
          matricula: string | null
          minutos_excedentes: number | null
          observacoes: string | null
          registrado_por: string | null
          registrado_por_nome: string | null
          setor: string | null
          status: string
          unidade: string
          updated_at: string
        }
        Insert: {
          cargo_funcao?: string | null
          colaborador_nome: string
          colaborador_user_id?: string | null
          created_at?: string
          data_ocorrencia: string
          id?: string
          jornada_contratual_entrada?: string | null
          jornada_contratual_saida?: string | null
          jornada_registrada_entrada?: string | null
          jornada_registrada_saida?: string | null
          justificativa?: string | null
          matricula?: string | null
          minutos_excedentes?: number | null
          observacoes?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string | null
          setor?: string | null
          status?: string
          unidade?: string
          updated_at?: string
        }
        Update: {
          cargo_funcao?: string | null
          colaborador_nome?: string
          colaborador_user_id?: string | null
          created_at?: string
          data_ocorrencia?: string
          id?: string
          jornada_contratual_entrada?: string | null
          jornada_contratual_saida?: string | null
          jornada_registrada_entrada?: string | null
          jornada_registrada_saida?: string | null
          justificativa?: string | null
          matricula?: string | null
          minutos_excedentes?: number | null
          observacoes?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string | null
          setor?: string | null
          status?: string
          unidade?: string
          updated_at?: string
        }
        Relationships: []
      }
      lms_inscricoes: {
        Row: {
          created_at: string
          data_conclusao: string | null
          id: string
          material_acessado_em: string | null
          nota: number | null
          setor: string | null
          status: string
          treinamento_id: string
          updated_at: string
          usuario_id: string
          usuario_nome: string
        }
        Insert: {
          created_at?: string
          data_conclusao?: string | null
          id?: string
          material_acessado_em?: string | null
          nota?: number | null
          setor?: string | null
          status?: string
          treinamento_id: string
          updated_at?: string
          usuario_id: string
          usuario_nome: string
        }
        Update: {
          created_at?: string
          data_conclusao?: string | null
          id?: string
          material_acessado_em?: string | null
          nota?: number | null
          setor?: string | null
          status?: string
          treinamento_id?: string
          updated_at?: string
          usuario_id?: string
          usuario_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_inscricoes_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "lms_treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_materiais: {
        Row: {
          created_at: string
          criado_por: string | null
          descricao: string | null
          id: string
          ordem: number | null
          tipo: string
          titulo: string
          treinamento_id: string
          updated_at: string
          url: string | null
        }
        Insert: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          tipo?: string
          titulo: string
          treinamento_id: string
          updated_at?: string
          url?: string | null
        }
        Update: {
          created_at?: string
          criado_por?: string | null
          descricao?: string | null
          id?: string
          ordem?: number | null
          tipo?: string
          titulo?: string
          treinamento_id?: string
          updated_at?: string
          url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_materiais_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "lms_treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_quiz_perguntas: {
        Row: {
          created_at: string
          id: string
          opcao_a: string
          opcao_b: string
          opcao_c: string
          opcao_d: string
          ordem: number | null
          pergunta: string
          resposta_correta: string
          treinamento_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          opcao_a: string
          opcao_b: string
          opcao_c: string
          opcao_d: string
          ordem?: number | null
          pergunta: string
          resposta_correta: string
          treinamento_id: string
        }
        Update: {
          created_at?: string
          id?: string
          opcao_a?: string
          opcao_b?: string
          opcao_c?: string
          opcao_d?: string
          ordem?: number | null
          pergunta?: string
          resposta_correta?: string
          treinamento_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_quiz_perguntas_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "lms_treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_tentativas_quiz: {
        Row: {
          acertos: number
          aprovado: boolean
          created_at: string
          id: string
          inscricao_id: string
          nota: number
          respostas: Json
          total_perguntas: number
          treinamento_id: string
          usuario_id: string
        }
        Insert: {
          acertos?: number
          aprovado?: boolean
          created_at?: string
          id?: string
          inscricao_id: string
          nota?: number
          respostas?: Json
          total_perguntas?: number
          treinamento_id: string
          usuario_id: string
        }
        Update: {
          acertos?: number
          aprovado?: boolean
          created_at?: string
          id?: string
          inscricao_id?: string
          nota?: number
          respostas?: Json
          total_perguntas?: number
          treinamento_id?: string
          usuario_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "lms_tentativas_quiz_inscricao_id_fkey"
            columns: ["inscricao_id"]
            isOneToOne: false
            referencedRelation: "lms_inscricoes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lms_tentativas_quiz_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "lms_treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
      lms_treinamentos: {
        Row: {
          ano: number | null
          carga_horaria: string | null
          competencia: string | null
          created_at: string
          criado_por: string | null
          data_limite: string | null
          descricao: string | null
          id: string
          indicador_competencia: string | null
          instrutor: string | null
          mes_planejado: number | null
          metodo_identificacao: string | null
          nota_minima_aprovacao: number | null
          objetivo: string | null
          publico_alvo: string | null
          setor_responsavel: string | null
          setores_alvo: string[] | null
          status: string
          tipo_treinamento: string
          titulo: string
          updated_at: string
        }
        Insert: {
          ano?: number | null
          carga_horaria?: string | null
          competencia?: string | null
          created_at?: string
          criado_por?: string | null
          data_limite?: string | null
          descricao?: string | null
          id?: string
          indicador_competencia?: string | null
          instrutor?: string | null
          mes_planejado?: number | null
          metodo_identificacao?: string | null
          nota_minima_aprovacao?: number | null
          objetivo?: string | null
          publico_alvo?: string | null
          setor_responsavel?: string | null
          setores_alvo?: string[] | null
          status?: string
          tipo_treinamento?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          ano?: number | null
          carga_horaria?: string | null
          competencia?: string | null
          created_at?: string
          criado_por?: string | null
          data_limite?: string | null
          descricao?: string | null
          id?: string
          indicador_competencia?: string | null
          instrutor?: string | null
          mes_planejado?: number | null
          metodo_identificacao?: string | null
          nota_minima_aprovacao?: number | null
          objetivo?: string | null
          publico_alvo?: string | null
          setor_responsavel?: string | null
          setores_alvo?: string[] | null
          status?: string
          tipo_treinamento?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
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
      logs_permissoes: {
        Row: {
          acao: string
          created_at: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          entidade_id: string | null
          entidade_tipo: string | null
          id: string
          user_id: string | null
        }
        Insert: {
          acao: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          user_id?: string | null
        }
        Update: {
          acao?: string
          created_at?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          entidade_id?: string | null
          entidade_tipo?: string | null
          id?: string
          user_id?: string | null
        }
        Relationships: []
      }
      manutencoes_execucoes: {
        Row: {
          ativo_id: string
          created_at: string
          custo_real: number | null
          data_execucao: string
          descricao: string
          executado_por: string | null
          executado_por_nome: string
          id: string
          observacoes: string | null
          pecas_utilizadas: string | null
          preventiva_id: string | null
          resultado: string | null
          setor: string
          tempo_parada_horas: number | null
          tipo: string
        }
        Insert: {
          ativo_id: string
          created_at?: string
          custo_real?: number | null
          data_execucao?: string
          descricao: string
          executado_por?: string | null
          executado_por_nome: string
          id?: string
          observacoes?: string | null
          pecas_utilizadas?: string | null
          preventiva_id?: string | null
          resultado?: string | null
          setor: string
          tempo_parada_horas?: number | null
          tipo?: string
        }
        Update: {
          ativo_id?: string
          created_at?: string
          custo_real?: number | null
          data_execucao?: string
          descricao?: string
          executado_por?: string | null
          executado_por_nome?: string
          id?: string
          observacoes?: string | null
          pecas_utilizadas?: string | null
          preventiva_id?: string | null
          resultado?: string | null
          setor?: string
          tempo_parada_horas?: number | null
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_execucoes_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "manutencoes_execucoes_preventiva_id_fkey"
            columns: ["preventiva_id"]
            isOneToOne: false
            referencedRelation: "manutencoes_preventivas"
            referencedColumns: ["id"]
          },
        ]
      }
      manutencoes_preventivas: {
        Row: {
          ativo_id: string
          certificado_calibracao: string | null
          created_at: string
          created_by: string | null
          custo_estimado: number | null
          data_vencimento_calibracao: string | null
          descricao: string | null
          id: string
          observacoes: string | null
          periodicidade_dias: number
          prioridade: string
          proxima_execucao: string
          requer_calibracao: boolean | null
          responsavel_id: string | null
          responsavel_nome: string
          setor: string
          status: string
          tipo: string
          tipo_manutencao: string
          titulo: string
          ultima_execucao: string | null
          updated_at: string
        }
        Insert: {
          ativo_id: string
          certificado_calibracao?: string | null
          created_at?: string
          created_by?: string | null
          custo_estimado?: number | null
          data_vencimento_calibracao?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          periodicidade_dias?: number
          prioridade?: string
          proxima_execucao: string
          requer_calibracao?: boolean | null
          responsavel_id?: string | null
          responsavel_nome: string
          setor: string
          status?: string
          tipo?: string
          tipo_manutencao?: string
          titulo: string
          ultima_execucao?: string | null
          updated_at?: string
        }
        Update: {
          ativo_id?: string
          certificado_calibracao?: string | null
          created_at?: string
          created_by?: string | null
          custo_estimado?: number | null
          data_vencimento_calibracao?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          periodicidade_dias?: number
          prioridade?: string
          proxima_execucao?: string
          requer_calibracao?: boolean | null
          responsavel_id?: string | null
          responsavel_nome?: string
          setor?: string
          status?: string
          tipo?: string
          tipo_manutencao?: string
          titulo?: string
          ultima_execucao?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "manutencoes_preventivas_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
        ]
      }
      modulos_sistema: {
        Row: {
          ativo: boolean | null
          categoria: string | null
          codigo: string
          created_at: string | null
          descricao: string | null
          icone: string | null
          id: string
          nome: string
          ordem: number | null
        }
        Insert: {
          ativo?: boolean | null
          categoria?: string | null
          codigo: string
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome: string
          ordem?: number | null
        }
        Update: {
          ativo?: boolean | null
          categoria?: string | null
          codigo?: string
          created_at?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          nome?: string
          ordem?: number | null
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
      notificacoes_seguranca: {
        Row: {
          created_at: string
          descricao: string
          id: string
          prioridade: string
          resolvido_em: string | null
          resolvido_por: string | null
          resolvido_por_nome: string | null
          responsavel_notificado: string | null
          ronda_id: string | null
          setor: string
          status: string
          tipo_notificacao: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          prioridade?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          resolvido_por_nome?: string | null
          responsavel_notificado?: string | null
          ronda_id?: string | null
          setor: string
          status?: string
          tipo_notificacao: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          prioridade?: string
          resolvido_em?: string | null
          resolvido_por?: string | null
          resolvido_por_nome?: string | null
          responsavel_notificado?: string | null
          ronda_id?: string | null
          setor?: string
          status?: string
          tipo_notificacao?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "notificacoes_seguranca_ronda_id_fkey"
            columns: ["ronda_id"]
            isOneToOne: false
            referencedRelation: "rondas_seguranca"
            referencedColumns: ["id"]
          },
        ]
      }
      nsp_action_plans: {
        Row: {
          analise_critica: string | null
          ano: number
          created_at: string
          fator_causa: string | null
          id: string
          indicator_id: string | null
          mes: string
          plano_acao: string | null
          prazo: string | null
          responsavel: string | null
          status: string
          updated_at: string
        }
        Insert: {
          analise_critica?: string | null
          ano: number
          created_at?: string
          fator_causa?: string | null
          id?: string
          indicator_id?: string | null
          mes: string
          plano_acao?: string | null
          prazo?: string | null
          responsavel?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          analise_critica?: string | null
          ano?: number
          created_at?: string
          fator_causa?: string | null
          id?: string
          indicator_id?: string | null
          mes?: string
          plano_acao?: string | null
          prazo?: string | null
          responsavel?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "nsp_action_plans_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "nsp_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      nsp_indicators: {
        Row: {
          ano: number
          categoria: string
          created_at: string
          id: string
          indicador: string
          mes: string
          meta: number | null
          subcategoria: string | null
          unidade_medida: string
          updated_at: string
          valor_numero: number | null
          valor_percentual: number | null
        }
        Insert: {
          ano: number
          categoria: string
          created_at?: string
          id?: string
          indicador: string
          mes: string
          meta?: number | null
          subcategoria?: string | null
          unidade_medida?: string
          updated_at?: string
          valor_numero?: number | null
          valor_percentual?: number | null
        }
        Update: {
          ano?: number
          categoria?: string
          created_at?: string
          id?: string
          indicador?: string
          mes?: string
          meta?: number | null
          subcategoria?: string | null
          unidade_medida?: string
          updated_at?: string
          valor_numero?: number | null
          valor_percentual?: number | null
        }
        Relationships: []
      }
      pedidos_compra: {
        Row: {
          aprovado_em: string | null
          aprovado_por: string | null
          arquivo_nome: string | null
          arquivo_url: string | null
          ativo_id: string | null
          created_at: string
          data_estimada_entrega: string | null
          encaminhado_almoxarifado: boolean | null
          encaminhado_em: string | null
          id: string
          item_descricao: string | null
          item_nome: string
          justificativa: string
          observacoes_gerencia: string | null
          produto_id: string | null
          quantidade_solicitada: number
          setor_solicitante: string
          solicitante_id: string | null
          solicitante_nome: string
          status: string
          unidade_medida: string | null
          updated_at: string
          urgencia: string
        }
        Insert: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          ativo_id?: string | null
          created_at?: string
          data_estimada_entrega?: string | null
          encaminhado_almoxarifado?: boolean | null
          encaminhado_em?: string | null
          id?: string
          item_descricao?: string | null
          item_nome: string
          justificativa: string
          observacoes_gerencia?: string | null
          produto_id?: string | null
          quantidade_solicitada?: number
          setor_solicitante: string
          solicitante_id?: string | null
          solicitante_nome: string
          status?: string
          unidade_medida?: string | null
          updated_at?: string
          urgencia?: string
        }
        Update: {
          aprovado_em?: string | null
          aprovado_por?: string | null
          arquivo_nome?: string | null
          arquivo_url?: string | null
          ativo_id?: string | null
          created_at?: string
          data_estimada_entrega?: string | null
          encaminhado_almoxarifado?: boolean | null
          encaminhado_em?: string | null
          id?: string
          item_descricao?: string | null
          item_nome?: string
          justificativa?: string
          observacoes_gerencia?: string | null
          produto_id?: string | null
          quantidade_solicitada?: number
          setor_solicitante?: string
          solicitante_id?: string | null
          solicitante_nome?: string
          status?: string
          unidade_medida?: string | null
          updated_at?: string
          urgencia?: string
        }
        Relationships: [
          {
            foreignKeyName: "pedidos_compra_ativo_id_fkey"
            columns: ["ativo_id"]
            isOneToOne: false
            referencedRelation: "ativos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "pedidos_compra_produto_id_fkey"
            columns: ["produto_id"]
            isOneToOne: false
            referencedRelation: "produtos"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_sistema: {
        Row: {
          ativo: boolean | null
          cor: string | null
          created_at: string | null
          created_by: string | null
          descricao: string | null
          icone: string | null
          id: string
          is_master: boolean | null
          is_sistema: boolean | null
          nome: string
          ordem: number | null
          updated_at: string | null
        }
        Insert: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          is_master?: boolean | null
          is_sistema?: boolean | null
          nome: string
          ordem?: number | null
          updated_at?: string | null
        }
        Update: {
          ativo?: boolean | null
          cor?: string | null
          created_at?: string | null
          created_by?: string | null
          descricao?: string | null
          icone?: string | null
          id?: string
          is_master?: boolean | null
          is_sistema?: boolean | null
          nome?: string
          ordem?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      permissoes_ferramenta: {
        Row: {
          created_at: string | null
          ferramenta_id: string | null
          id: string
          perfil_id: string | null
          permitido: boolean | null
        }
        Insert: {
          created_at?: string | null
          ferramenta_id?: string | null
          id?: string
          perfil_id?: string | null
          permitido?: boolean | null
        }
        Update: {
          created_at?: string | null
          ferramenta_id?: string | null
          id?: string
          perfil_id?: string | null
          permitido?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_ferramenta_ferramenta_id_fkey"
            columns: ["ferramenta_id"]
            isOneToOne: false
            referencedRelation: "ferramentas_modulo"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissoes_ferramenta_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_perfil: {
        Row: {
          comportamento_sem_acesso: string | null
          created_at: string | null
          id: string
          modulo_id: string | null
          perfil_id: string | null
          pode_acessar: boolean | null
          pode_visualizar: boolean | null
          updated_at: string | null
        }
        Insert: {
          comportamento_sem_acesso?: string | null
          created_at?: string | null
          id?: string
          modulo_id?: string | null
          perfil_id?: string | null
          pode_acessar?: boolean | null
          pode_visualizar?: boolean | null
          updated_at?: string | null
        }
        Update: {
          comportamento_sem_acesso?: string | null
          created_at?: string | null
          id?: string
          modulo_id?: string | null
          perfil_id?: string | null
          pode_acessar?: boolean | null
          pode_visualizar?: boolean | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_perfil_modulo_id_fkey"
            columns: ["modulo_id"]
            isOneToOne: false
            referencedRelation: "modulos_sistema"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "permissoes_perfil_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_acao_auditoria: {
        Row: {
          achado_id: string
          created_at: string
          data_conclusao: string | null
          descricao: string
          eficacia_verificada: boolean | null
          id: string
          observacoes: string | null
          prazo: string
          registrado_por: string | null
          registrado_por_nome: string
          responsavel_nome: string
          status: string
          updated_at: string
        }
        Insert: {
          achado_id: string
          created_at?: string
          data_conclusao?: string | null
          descricao: string
          eficacia_verificada?: boolean | null
          id?: string
          observacoes?: string | null
          prazo: string
          registrado_por?: string | null
          registrado_por_nome: string
          responsavel_nome: string
          status?: string
          updated_at?: string
        }
        Update: {
          achado_id?: string
          created_at?: string
          data_conclusao?: string | null
          descricao?: string
          eficacia_verificada?: boolean | null
          id?: string
          observacoes?: string | null
          prazo?: string
          registrado_por?: string | null
          registrado_por_nome?: string
          responsavel_nome?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_acao_auditoria_achado_id_fkey"
            columns: ["achado_id"]
            isOneToOne: false
            referencedRelation: "achados_auditoria"
            referencedColumns: ["id"]
          },
        ]
      }
      porta_ecg_atendimentos: {
        Row: {
          action_plan: string | null
          age: number
          arrival_time: string
          competence_month: number
          competence_year: number
          conducts: string[] | null
          created_at: string
          created_by: string | null
          delay_reason: string | null
          delay_reason_other: string | null
          door_to_ecg_minutes: number
          ecg_time: string
          first_doctor_time: string | null
          goal_minutes: number
          id: string
          initial_diagnosis: string | null
          medical_report: string | null
          observations: string | null
          patient_name: string | null
          record_number: string
          risk_classification: string
          sex: string
          updated_at: string
          within_goal: boolean
        }
        Insert: {
          action_plan?: string | null
          age?: number
          arrival_time: string
          competence_month: number
          competence_year: number
          conducts?: string[] | null
          created_at?: string
          created_by?: string | null
          delay_reason?: string | null
          delay_reason_other?: string | null
          door_to_ecg_minutes?: number
          ecg_time: string
          first_doctor_time?: string | null
          goal_minutes?: number
          id?: string
          initial_diagnosis?: string | null
          medical_report?: string | null
          observations?: string | null
          patient_name?: string | null
          record_number: string
          risk_classification?: string
          sex?: string
          updated_at?: string
          within_goal?: boolean
        }
        Update: {
          action_plan?: string | null
          age?: number
          arrival_time?: string
          competence_month?: number
          competence_year?: number
          conducts?: string[] | null
          created_at?: string
          created_by?: string | null
          delay_reason?: string | null
          delay_reason_other?: string | null
          door_to_ecg_minutes?: number
          ecg_time?: string
          first_doctor_time?: string | null
          goal_minutes?: number
          id?: string
          initial_diagnosis?: string | null
          medical_report?: string | null
          observations?: string | null
          patient_name?: string | null
          record_number?: string
          risk_classification?: string
          sex?: string
          updated_at?: string
          within_goal?: boolean
        }
        Relationships: []
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
      profissionais_documentos: {
        Row: {
          arquivo_url: string
          created_at: string
          id: string
          nome_arquivo: string
          observacao: string | null
          profissional_id: string
          tipo_documento: string
          uploaded_by: string | null
          uploaded_by_nome: string
        }
        Insert: {
          arquivo_url: string
          created_at?: string
          id?: string
          nome_arquivo: string
          observacao?: string | null
          profissional_id: string
          tipo_documento: string
          uploaded_by?: string | null
          uploaded_by_nome: string
        }
        Update: {
          arquivo_url?: string
          created_at?: string
          id?: string
          nome_arquivo?: string
          observacao?: string | null
          profissional_id?: string
          tipo_documento?: string
          uploaded_by?: string | null
          uploaded_by_nome?: string
        }
        Relationships: [
          {
            foreignKeyName: "profissionais_documentos_profissional_id_fkey"
            columns: ["profissional_id"]
            isOneToOne: false
            referencedRelation: "profissionais_saude"
            referencedColumns: ["id"]
          },
        ]
      }
      profissionais_saude: {
        Row: {
          created_at: string
          created_by: string | null
          email: string | null
          especialidade: string | null
          id: string
          nome: string
          observacoes: string | null
          registro_profissional: string | null
          status: string
          telefone: string | null
          tipo: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          especialidade?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          registro_profissional?: string | null
          status?: string
          telefone?: string | null
          tipo: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          email?: string | null
          especialidade?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          registro_profissional?: string | null
          status?: string
          telefone?: string | null
          tipo?: string
          updated_at?: string
          user_id?: string | null
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
      protocolo_atendimentos: {
        Row: {
          achados_clinicos: Json | null
          achados_neurologicos: Json | null
          action_plan: string | null
          admin_observations: string | null
          age: number | null
          arrival_time: string
          assinatura_enfermeiro: string | null
          assinatura_farmacia: string | null
          assinatura_medico: string | null
          atb_profissional: string | null
          atb1_data: string | null
          atb1_dose: string | null
          atb1_horario_inicio: string | null
          atb1_nome: string | null
          atb2_data: string | null
          atb2_dose: string | null
          atb2_horario_inicio: string | null
          atb2_nome: string | null
          attachment_path: string | null
          choque_lactato2_data_hora: string | null
          choque_lactato3_data_hora: string | null
          choque_lactato3_medicamento: string | null
          choque_lactato3_medicamento_data_hora: string | null
          choque_lactato3_necessita: boolean | null
          choque_reposicao_data_hora: string | null
          choque_reposicao_medicamento: string | null
          choque_septico: boolean | null
          choque_vasopressor_data_hora: string | null
          choque_vasopressor_medicamento: string | null
          competency: string
          conduct_high_risk: boolean | null
          conduct_low_risk: boolean | null
          conduct_medication: boolean | null
          conduct_moderate_risk: boolean | null
          conduct_monitoring: boolean | null
          conduct_observation: boolean | null
          conduct_oxygen: boolean | null
          conduct_referral: boolean | null
          conduct_transfer: boolean | null
          created_at: string
          created_by: string | null
          delay_reason: string | null
          delay_reason_other: string | null
          destination_hospital: string | null
          destino_instituicao_nome: string | null
          destino_paciente: string | null
          disfuncao_consciencia: boolean | null
          disfuncao_pa_baixa: boolean | null
          disfuncao_sato2_baixa: boolean | null
          ecg_time: string | null
          first_doctor_time: string | null
          foco_abdominal: boolean | null
          foco_corrente_sanguinea_cateter: boolean | null
          foco_pele_partes_moles: boolean | null
          foco_pulmonar: boolean | null
          foco_sem_foco_definido: boolean | null
          foco_urinario: boolean | null
          id: string
          initial_diagnosis: string | null
          investigation_name: string | null
          investigation_status: string | null
          kit_sepse_coletado: boolean | null
          lab_villac_horario_chamado: string | null
          lab_villac_horario_coleta: string | null
          medical_report: string | null
          necessidade_uti: boolean | null
          pain_association: string | null
          pain_characteristic: string | null
          pain_duration: string | null
          pain_irradiation: string | null
          pain_location: string | null
          pain_onset_date: string | null
          pain_onset_time: string | null
          pain_referral: string | null
          patient_name: string | null
          porta_ecg_minutes: number | null
          protocol_opened_at: string | null
          protocol_opened_by_sector: string | null
          record_number: string
          risk_classification: string | null
          samu_arrival_time: string | null
          sepse_horario: string | null
          sepse_medico: string | null
          sepse_motivo: string | null
          sepse_suspeita: boolean | null
          sex: string | null
          sirs_bilirrubina: boolean | null
          sirs_celulas_jovens: boolean | null
          sirs_creatinina: boolean | null
          sirs_fc_alta: boolean | null
          sirs_fr_alta: boolean | null
          sirs_lactato: boolean | null
          sirs_leucocitose: boolean | null
          sirs_leucopenia: boolean | null
          sirs_plaquetas: boolean | null
          sirs_temp_alta: boolean | null
          sirs_temp_baixa: boolean | null
          thrombolysis_complication: boolean | null
          thrombolysis_conduct: string | null
          thrombolysis_time: string | null
          thrombolysis_type: string | null
          tipo_protocolo: string
          troponin_sample1_collection_time: string | null
          troponin_sample1_collector: string | null
          troponin_sample1_release_time: string | null
          troponin_sample1_result: string | null
          troponin_sample2_collection_time: string | null
          troponin_sample2_collector: string | null
          troponin_sample2_release_time: string | null
          troponin_sample2_result: string | null
          troponin_sample3_collection_time: string | null
          troponin_sample3_collector: string | null
          troponin_sample3_release_time: string | null
          troponin_sample3_result: string | null
          updated_at: string
          updated_by: string | null
          vital_fc: number | null
          vital_fr: number | null
          vital_pa: string | null
          vital_spo2: number | null
          vital_temperatura: number | null
          within_target: boolean | null
        }
        Insert: {
          achados_clinicos?: Json | null
          achados_neurologicos?: Json | null
          action_plan?: string | null
          admin_observations?: string | null
          age?: number | null
          arrival_time: string
          assinatura_enfermeiro?: string | null
          assinatura_farmacia?: string | null
          assinatura_medico?: string | null
          atb_profissional?: string | null
          atb1_data?: string | null
          atb1_dose?: string | null
          atb1_horario_inicio?: string | null
          atb1_nome?: string | null
          atb2_data?: string | null
          atb2_dose?: string | null
          atb2_horario_inicio?: string | null
          atb2_nome?: string | null
          attachment_path?: string | null
          choque_lactato2_data_hora?: string | null
          choque_lactato3_data_hora?: string | null
          choque_lactato3_medicamento?: string | null
          choque_lactato3_medicamento_data_hora?: string | null
          choque_lactato3_necessita?: boolean | null
          choque_reposicao_data_hora?: string | null
          choque_reposicao_medicamento?: string | null
          choque_septico?: boolean | null
          choque_vasopressor_data_hora?: string | null
          choque_vasopressor_medicamento?: string | null
          competency?: string
          conduct_high_risk?: boolean | null
          conduct_low_risk?: boolean | null
          conduct_medication?: boolean | null
          conduct_moderate_risk?: boolean | null
          conduct_monitoring?: boolean | null
          conduct_observation?: boolean | null
          conduct_oxygen?: boolean | null
          conduct_referral?: boolean | null
          conduct_transfer?: boolean | null
          created_at?: string
          created_by?: string | null
          delay_reason?: string | null
          delay_reason_other?: string | null
          destination_hospital?: string | null
          destino_instituicao_nome?: string | null
          destino_paciente?: string | null
          disfuncao_consciencia?: boolean | null
          disfuncao_pa_baixa?: boolean | null
          disfuncao_sato2_baixa?: boolean | null
          ecg_time?: string | null
          first_doctor_time?: string | null
          foco_abdominal?: boolean | null
          foco_corrente_sanguinea_cateter?: boolean | null
          foco_pele_partes_moles?: boolean | null
          foco_pulmonar?: boolean | null
          foco_sem_foco_definido?: boolean | null
          foco_urinario?: boolean | null
          id?: string
          initial_diagnosis?: string | null
          investigation_name?: string | null
          investigation_status?: string | null
          kit_sepse_coletado?: boolean | null
          lab_villac_horario_chamado?: string | null
          lab_villac_horario_coleta?: string | null
          medical_report?: string | null
          necessidade_uti?: boolean | null
          pain_association?: string | null
          pain_characteristic?: string | null
          pain_duration?: string | null
          pain_irradiation?: string | null
          pain_location?: string | null
          pain_onset_date?: string | null
          pain_onset_time?: string | null
          pain_referral?: string | null
          patient_name?: string | null
          porta_ecg_minutes?: number | null
          protocol_opened_at?: string | null
          protocol_opened_by_sector?: string | null
          record_number: string
          risk_classification?: string | null
          samu_arrival_time?: string | null
          sepse_horario?: string | null
          sepse_medico?: string | null
          sepse_motivo?: string | null
          sepse_suspeita?: boolean | null
          sex?: string | null
          sirs_bilirrubina?: boolean | null
          sirs_celulas_jovens?: boolean | null
          sirs_creatinina?: boolean | null
          sirs_fc_alta?: boolean | null
          sirs_fr_alta?: boolean | null
          sirs_lactato?: boolean | null
          sirs_leucocitose?: boolean | null
          sirs_leucopenia?: boolean | null
          sirs_plaquetas?: boolean | null
          sirs_temp_alta?: boolean | null
          sirs_temp_baixa?: boolean | null
          thrombolysis_complication?: boolean | null
          thrombolysis_conduct?: string | null
          thrombolysis_time?: string | null
          thrombolysis_type?: string | null
          tipo_protocolo: string
          troponin_sample1_collection_time?: string | null
          troponin_sample1_collector?: string | null
          troponin_sample1_release_time?: string | null
          troponin_sample1_result?: string | null
          troponin_sample2_collection_time?: string | null
          troponin_sample2_collector?: string | null
          troponin_sample2_release_time?: string | null
          troponin_sample2_result?: string | null
          troponin_sample3_collection_time?: string | null
          troponin_sample3_collector?: string | null
          troponin_sample3_release_time?: string | null
          troponin_sample3_result?: string | null
          updated_at?: string
          updated_by?: string | null
          vital_fc?: number | null
          vital_fr?: number | null
          vital_pa?: string | null
          vital_spo2?: number | null
          vital_temperatura?: number | null
          within_target?: boolean | null
        }
        Update: {
          achados_clinicos?: Json | null
          achados_neurologicos?: Json | null
          action_plan?: string | null
          admin_observations?: string | null
          age?: number | null
          arrival_time?: string
          assinatura_enfermeiro?: string | null
          assinatura_farmacia?: string | null
          assinatura_medico?: string | null
          atb_profissional?: string | null
          atb1_data?: string | null
          atb1_dose?: string | null
          atb1_horario_inicio?: string | null
          atb1_nome?: string | null
          atb2_data?: string | null
          atb2_dose?: string | null
          atb2_horario_inicio?: string | null
          atb2_nome?: string | null
          attachment_path?: string | null
          choque_lactato2_data_hora?: string | null
          choque_lactato3_data_hora?: string | null
          choque_lactato3_medicamento?: string | null
          choque_lactato3_medicamento_data_hora?: string | null
          choque_lactato3_necessita?: boolean | null
          choque_reposicao_data_hora?: string | null
          choque_reposicao_medicamento?: string | null
          choque_septico?: boolean | null
          choque_vasopressor_data_hora?: string | null
          choque_vasopressor_medicamento?: string | null
          competency?: string
          conduct_high_risk?: boolean | null
          conduct_low_risk?: boolean | null
          conduct_medication?: boolean | null
          conduct_moderate_risk?: boolean | null
          conduct_monitoring?: boolean | null
          conduct_observation?: boolean | null
          conduct_oxygen?: boolean | null
          conduct_referral?: boolean | null
          conduct_transfer?: boolean | null
          created_at?: string
          created_by?: string | null
          delay_reason?: string | null
          delay_reason_other?: string | null
          destination_hospital?: string | null
          destino_instituicao_nome?: string | null
          destino_paciente?: string | null
          disfuncao_consciencia?: boolean | null
          disfuncao_pa_baixa?: boolean | null
          disfuncao_sato2_baixa?: boolean | null
          ecg_time?: string | null
          first_doctor_time?: string | null
          foco_abdominal?: boolean | null
          foco_corrente_sanguinea_cateter?: boolean | null
          foco_pele_partes_moles?: boolean | null
          foco_pulmonar?: boolean | null
          foco_sem_foco_definido?: boolean | null
          foco_urinario?: boolean | null
          id?: string
          initial_diagnosis?: string | null
          investigation_name?: string | null
          investigation_status?: string | null
          kit_sepse_coletado?: boolean | null
          lab_villac_horario_chamado?: string | null
          lab_villac_horario_coleta?: string | null
          medical_report?: string | null
          necessidade_uti?: boolean | null
          pain_association?: string | null
          pain_characteristic?: string | null
          pain_duration?: string | null
          pain_irradiation?: string | null
          pain_location?: string | null
          pain_onset_date?: string | null
          pain_onset_time?: string | null
          pain_referral?: string | null
          patient_name?: string | null
          porta_ecg_minutes?: number | null
          protocol_opened_at?: string | null
          protocol_opened_by_sector?: string | null
          record_number?: string
          risk_classification?: string | null
          samu_arrival_time?: string | null
          sepse_horario?: string | null
          sepse_medico?: string | null
          sepse_motivo?: string | null
          sepse_suspeita?: boolean | null
          sex?: string | null
          sirs_bilirrubina?: boolean | null
          sirs_celulas_jovens?: boolean | null
          sirs_creatinina?: boolean | null
          sirs_fc_alta?: boolean | null
          sirs_fr_alta?: boolean | null
          sirs_lactato?: boolean | null
          sirs_leucocitose?: boolean | null
          sirs_leucopenia?: boolean | null
          sirs_plaquetas?: boolean | null
          sirs_temp_alta?: boolean | null
          sirs_temp_baixa?: boolean | null
          thrombolysis_complication?: boolean | null
          thrombolysis_conduct?: string | null
          thrombolysis_time?: string | null
          thrombolysis_type?: string | null
          tipo_protocolo?: string
          troponin_sample1_collection_time?: string | null
          troponin_sample1_collector?: string | null
          troponin_sample1_release_time?: string | null
          troponin_sample1_result?: string | null
          troponin_sample2_collection_time?: string | null
          troponin_sample2_collector?: string | null
          troponin_sample2_release_time?: string | null
          troponin_sample2_result?: string | null
          troponin_sample3_collection_time?: string | null
          troponin_sample3_collector?: string | null
          troponin_sample3_release_time?: string | null
          troponin_sample3_result?: string | null
          updated_at?: string
          updated_by?: string | null
          vital_fc?: number | null
          vital_fr?: number | null
          vital_pa?: string | null
          vital_spo2?: number | null
          vital_temperatura?: number | null
          within_target?: boolean | null
        }
        Relationships: []
      }
      protocolo_settings: {
        Row: {
          created_at: string
          id: string
          meta_minutos: number
          tipo_protocolo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          meta_minutos?: number
          tipo_protocolo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          meta_minutos?: number
          tipo_protocolo?: string
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
      reunioes: {
        Row: {
          ata_gerada: Json | null
          created_at: string
          criado_por: string
          gravacao_url: string | null
          hora_encerramento: string | null
          hora_inicio: string | null
          id: string
          participantes: string[] | null
          pauta: string | null
          status: string
          titulo: string
          transcricao: string | null
          updated_at: string
        }
        Insert: {
          ata_gerada?: Json | null
          created_at?: string
          criado_por: string
          gravacao_url?: string | null
          hora_encerramento?: string | null
          hora_inicio?: string | null
          id?: string
          participantes?: string[] | null
          pauta?: string | null
          status?: string
          titulo: string
          transcricao?: string | null
          updated_at?: string
        }
        Update: {
          ata_gerada?: Json | null
          created_at?: string
          criado_por?: string
          gravacao_url?: string | null
          hora_encerramento?: string | null
          hora_inicio?: string | null
          id?: string
          participantes?: string[] | null
          pauta?: string | null
          status?: string
          titulo?: string
          transcricao?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      rh_movimentacoes_setor: {
        Row: {
          aprovado_por: string | null
          cargo: string
          colaborador_matricula: string | null
          colaborador_nome: string
          created_at: string
          data_mudanca: string
          id: string
          motivo: string | null
          observacoes: string | null
          registrado_por: string | null
          registrado_por_nome: string
          setor_anterior: string
          setor_novo: string
          updated_at: string
        }
        Insert: {
          aprovado_por?: string | null
          cargo: string
          colaborador_matricula?: string | null
          colaborador_nome: string
          created_at?: string
          data_mudanca?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          registrado_por?: string | null
          registrado_por_nome: string
          setor_anterior: string
          setor_novo: string
          updated_at?: string
        }
        Update: {
          aprovado_por?: string | null
          cargo?: string
          colaborador_matricula?: string | null
          colaborador_nome?: string
          created_at?: string
          data_mudanca?: string
          id?: string
          motivo?: string | null
          observacoes?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string
          setor_anterior?: string
          setor_novo?: string
          updated_at?: string
        }
        Relationships: []
      }
      rh_ocorrencias_disciplinares: {
        Row: {
          arquivo_url: string | null
          cargo: string | null
          colaborador_matricula: string | null
          colaborador_nome: string
          created_at: string
          data_assinatura: string | null
          data_ocorrencia: string
          descricao: string | null
          dias_suspensao: number | null
          id: string
          motivo_clt: string
          observacoes: string | null
          registrado_por: string | null
          registrado_por_nome: string
          setor: string | null
          status_assinatura: string
          testemunha_1: string | null
          testemunha_2: string | null
          tipo_ocorrencia: string
          updated_at: string
        }
        Insert: {
          arquivo_url?: string | null
          cargo?: string | null
          colaborador_matricula?: string | null
          colaborador_nome: string
          created_at?: string
          data_assinatura?: string | null
          data_ocorrencia?: string
          descricao?: string | null
          dias_suspensao?: number | null
          id?: string
          motivo_clt: string
          observacoes?: string | null
          registrado_por?: string | null
          registrado_por_nome: string
          setor?: string | null
          status_assinatura?: string
          testemunha_1?: string | null
          testemunha_2?: string | null
          tipo_ocorrencia: string
          updated_at?: string
        }
        Update: {
          arquivo_url?: string | null
          cargo?: string | null
          colaborador_matricula?: string | null
          colaborador_nome?: string
          created_at?: string
          data_assinatura?: string | null
          data_ocorrencia?: string
          descricao?: string | null
          dias_suspensao?: number | null
          id?: string
          motivo_clt?: string
          observacoes?: string | null
          registrado_por?: string | null
          registrado_por_nome?: string
          setor?: string | null
          status_assinatura?: string
          testemunha_1?: string | null
          testemunha_2?: string | null
          tipo_ocorrencia?: string
          updated_at?: string
        }
        Relationships: []
      }
      riscos_operacionais: {
        Row: {
          acao_tomada: string | null
          categoria: string
          chamado_id: string | null
          created_at: string
          data_ocorrencia: string
          data_resolucao: string | null
          descricao: string
          equipamento_nome: string | null
          equipamento_patrimonio: string | null
          id: string
          impacto_estimado: string | null
          incidente_id: string | null
          registrado_por: string
          registrado_por_nome: string
          resolvido_por: string | null
          resolvido_por_nome: string | null
          setor_afetado: string | null
          severidade: string
          status: string
          tipo_risco: string
          updated_at: string
        }
        Insert: {
          acao_tomada?: string | null
          categoria: string
          chamado_id?: string | null
          created_at?: string
          data_ocorrencia?: string
          data_resolucao?: string | null
          descricao: string
          equipamento_nome?: string | null
          equipamento_patrimonio?: string | null
          id?: string
          impacto_estimado?: string | null
          incidente_id?: string | null
          registrado_por: string
          registrado_por_nome: string
          resolvido_por?: string | null
          resolvido_por_nome?: string | null
          setor_afetado?: string | null
          severidade?: string
          status?: string
          tipo_risco: string
          updated_at?: string
        }
        Update: {
          acao_tomada?: string | null
          categoria?: string
          chamado_id?: string | null
          created_at?: string
          data_ocorrencia?: string
          data_resolucao?: string | null
          descricao?: string
          equipamento_nome?: string | null
          equipamento_patrimonio?: string | null
          id?: string
          impacto_estimado?: string | null
          incidente_id?: string | null
          registrado_por?: string
          registrado_por_nome?: string
          resolvido_por?: string | null
          resolvido_por_nome?: string | null
          setor_afetado?: string | null
          severidade?: string
          status?: string
          tipo_risco?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "riscos_operacionais_chamado_id_fkey"
            columns: ["chamado_id"]
            isOneToOne: false
            referencedRelation: "chamados"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "riscos_operacionais_incidente_id_fkey"
            columns: ["incidente_id"]
            isOneToOne: false
            referencedRelation: "incidentes_nsp"
            referencedColumns: ["id"]
          },
        ]
      }
      rondas_seguranca: {
        Row: {
          checklist: Json
          created_at: string
          data_ronda: string
          hora_ronda: string
          id: string
          observacoes: string | null
          responsavel_id: string
          responsavel_nome: string
          setor: string
          status: string
          updated_at: string
        }
        Insert: {
          checklist?: Json
          created_at?: string
          data_ronda?: string
          hora_ronda?: string
          id?: string
          observacoes?: string | null
          responsavel_id: string
          responsavel_nome: string
          setor: string
          status?: string
          updated_at?: string
        }
        Update: {
          checklist?: Json
          created_at?: string
          data_ronda?: string
          hora_ronda?: string
          id?: string
          observacoes?: string | null
          responsavel_id?: string
          responsavel_nome?: string
          setor?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      rouparia_categorias: {
        Row: {
          ativo: boolean | null
          created_at: string
          descricao: string | null
          estoque_minimo: number | null
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number | null
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          created_at?: string
          descricao?: string | null
          estoque_minimo?: number | null
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      rouparia_itens: {
        Row: {
          ativo: boolean | null
          categoria_id: string
          codigo_barras: string
          created_at: string
          descricao: string | null
          id: string
          quantidade_atual: number
          updated_at: string
        }
        Insert: {
          ativo?: boolean | null
          categoria_id: string
          codigo_barras: string
          created_at?: string
          descricao?: string | null
          id?: string
          quantidade_atual?: number
          updated_at?: string
        }
        Update: {
          ativo?: boolean | null
          categoria_id?: string
          codigo_barras?: string
          created_at?: string
          descricao?: string | null
          id?: string
          quantidade_atual?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "rouparia_itens_categoria_id_fkey"
            columns: ["categoria_id"]
            isOneToOne: false
            referencedRelation: "rouparia_categorias"
            referencedColumns: ["id"]
          },
        ]
      }
      rouparia_movimentacoes: {
        Row: {
          created_at: string
          id: string
          item_id: string
          observacao: string | null
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          registrado_por: string
          registrado_por_nome: string
          responsavel_devolucao: string | null
          responsavel_retirada: string | null
          setor_destino: string | null
          setor_origem: string | null
          tipo_movimentacao: string
        }
        Insert: {
          created_at?: string
          id?: string
          item_id: string
          observacao?: string | null
          quantidade: number
          quantidade_anterior: number
          quantidade_nova: number
          registrado_por: string
          registrado_por_nome: string
          responsavel_devolucao?: string | null
          responsavel_retirada?: string | null
          setor_destino?: string | null
          setor_origem?: string | null
          tipo_movimentacao: string
        }
        Update: {
          created_at?: string
          id?: string
          item_id?: string
          observacao?: string | null
          quantidade?: number
          quantidade_anterior?: number
          quantidade_nova?: number
          registrado_por?: string
          registrado_por_nome?: string
          responsavel_devolucao?: string | null
          responsavel_retirada?: string | null
          setor_destino?: string | null
          setor_origem?: string | null
          tipo_movimentacao?: string
        }
        Relationships: [
          {
            foreignKeyName: "rouparia_movimentacoes_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "rouparia_itens"
            referencedColumns: ["id"]
          },
        ]
      }
      saida_prontuarios: {
        Row: {
          cadastro_conferido: boolean | null
          checklist_validacao: Json | null
          conferido_nir_em: string | null
          conferido_nir_por: string | null
          created_at: string
          data_atendimento: string | null
          existe_fisicamente: boolean | null
          id: string
          is_folha_avulsa: boolean | null
          nascimento_mae: string | null
          numero_prontuario: string | null
          observacao_classificacao: string | null
          observacao_nir: string | null
          paciente_nome: string | null
          pendencia_resolvida_em: string | null
          pendencia_resolvida_por: string | null
          possui_carimbo_medico: boolean | null
          prontuario_id: string | null
          registrado_recepcao_em: string | null
          registrado_recepcao_por: string | null
          status: string
          updated_at: string
          validado_classificacao_em: string | null
          validado_classificacao_por: string | null
        }
        Insert: {
          cadastro_conferido?: boolean | null
          checklist_validacao?: Json | null
          conferido_nir_em?: string | null
          conferido_nir_por?: string | null
          created_at?: string
          data_atendimento?: string | null
          existe_fisicamente?: boolean | null
          id?: string
          is_folha_avulsa?: boolean | null
          nascimento_mae?: string | null
          numero_prontuario?: string | null
          observacao_classificacao?: string | null
          observacao_nir?: string | null
          paciente_nome?: string | null
          pendencia_resolvida_em?: string | null
          pendencia_resolvida_por?: string | null
          possui_carimbo_medico?: boolean | null
          prontuario_id?: string | null
          registrado_recepcao_em?: string | null
          registrado_recepcao_por?: string | null
          status?: string
          updated_at?: string
          validado_classificacao_em?: string | null
          validado_classificacao_por?: string | null
        }
        Update: {
          cadastro_conferido?: boolean | null
          checklist_validacao?: Json | null
          conferido_nir_em?: string | null
          conferido_nir_por?: string | null
          created_at?: string
          data_atendimento?: string | null
          existe_fisicamente?: boolean | null
          id?: string
          is_folha_avulsa?: boolean | null
          nascimento_mae?: string | null
          numero_prontuario?: string | null
          observacao_classificacao?: string | null
          observacao_nir?: string | null
          paciente_nome?: string | null
          pendencia_resolvida_em?: string | null
          pendencia_resolvida_por?: string | null
          possui_carimbo_medico?: boolean | null
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
      sciras_antimicrobianos: {
        Row: {
          antimicrobiano: string
          created_at: string
          cultura_id: string | null
          data_fim: string | null
          data_inicio: string
          dias_uso: number | null
          dose: string
          id: string
          indicacao: string | null
          justificativa: string | null
          numero_prontuario: string | null
          paciente_nome: string
          prescrito_por: string | null
          registrado_por: string
          registrado_por_nome: string
          setor: string
          status: string | null
          updated_at: string
          via_administracao: string
        }
        Insert: {
          antimicrobiano: string
          created_at?: string
          cultura_id?: string | null
          data_fim?: string | null
          data_inicio: string
          dias_uso?: number | null
          dose: string
          id?: string
          indicacao?: string | null
          justificativa?: string | null
          numero_prontuario?: string | null
          paciente_nome: string
          prescrito_por?: string | null
          registrado_por: string
          registrado_por_nome: string
          setor: string
          status?: string | null
          updated_at?: string
          via_administracao: string
        }
        Update: {
          antimicrobiano?: string
          created_at?: string
          cultura_id?: string | null
          data_fim?: string | null
          data_inicio?: string
          dias_uso?: number | null
          dose?: string
          id?: string
          indicacao?: string | null
          justificativa?: string | null
          numero_prontuario?: string | null
          paciente_nome?: string
          prescrito_por?: string | null
          registrado_por?: string
          registrado_por_nome?: string
          setor?: string
          status?: string | null
          updated_at?: string
          via_administracao?: string
        }
        Relationships: [
          {
            foreignKeyName: "sciras_antimicrobianos_cultura_id_fkey"
            columns: ["cultura_id"]
            isOneToOne: false
            referencedRelation: "sciras_culturas"
            referencedColumns: ["id"]
          },
        ]
      }
      sciras_culturas: {
        Row: {
          created_at: string
          data_coleta: string
          id: string
          mecanismo_resistencia: string | null
          microrganismo_isolado: string | null
          multirresistente: boolean | null
          numero_prontuario: string | null
          observacoes: string | null
          paciente_nome: string
          perfil_sensibilidade: Json | null
          registrado_por: string
          registrado_por_nome: string
          resultado: string | null
          setor: string
          tipo_material: string
          updated_at: string
          vigilancia_iras_id: string | null
        }
        Insert: {
          created_at?: string
          data_coleta: string
          id?: string
          mecanismo_resistencia?: string | null
          microrganismo_isolado?: string | null
          multirresistente?: boolean | null
          numero_prontuario?: string | null
          observacoes?: string | null
          paciente_nome: string
          perfil_sensibilidade?: Json | null
          registrado_por: string
          registrado_por_nome: string
          resultado?: string | null
          setor: string
          tipo_material: string
          updated_at?: string
          vigilancia_iras_id?: string | null
        }
        Update: {
          created_at?: string
          data_coleta?: string
          id?: string
          mecanismo_resistencia?: string | null
          microrganismo_isolado?: string | null
          multirresistente?: boolean | null
          numero_prontuario?: string | null
          observacoes?: string | null
          paciente_nome?: string
          perfil_sensibilidade?: Json | null
          registrado_por?: string
          registrado_por_nome?: string
          resultado?: string | null
          setor?: string
          tipo_material?: string
          updated_at?: string
          vigilancia_iras_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sciras_culturas_vigilancia_iras_id_fkey"
            columns: ["vigilancia_iras_id"]
            isOneToOne: false
            referencedRelation: "sciras_vigilancia_iras"
            referencedColumns: ["id"]
          },
        ]
      }
      sciras_indicadores_diarios: {
        Row: {
          created_at: string
          cvc_dia: number
          data_registro: string
          id: string
          ipcs_novas: number
          itu_novas: number
          pacientes_dia: number
          pav_novas: number
          registrado_por: string
          registrado_por_nome: string
          setor: string
          svd_dia: number
          updated_at: string
          vm_dia: number
        }
        Insert: {
          created_at?: string
          cvc_dia?: number
          data_registro: string
          id?: string
          ipcs_novas?: number
          itu_novas?: number
          pacientes_dia?: number
          pav_novas?: number
          registrado_por: string
          registrado_por_nome: string
          setor: string
          svd_dia?: number
          updated_at?: string
          vm_dia?: number
        }
        Update: {
          created_at?: string
          cvc_dia?: number
          data_registro?: string
          id?: string
          ipcs_novas?: number
          itu_novas?: number
          pacientes_dia?: number
          pav_novas?: number
          registrado_por?: string
          registrado_por_nome?: string
          setor?: string
          svd_dia?: number
          updated_at?: string
          vm_dia?: number
        }
        Relationships: []
      }
      sciras_notificacoes_epidemiologicas: {
        Row: {
          created_at: string
          data_notificacao: string
          data_notificacao_externa: string | null
          descricao: string
          desfecho: string | null
          doenca_agravo: string
          id: string
          medidas_controle: string | null
          notificado_anvisa: boolean | null
          notificado_vigilancia_municipal: boolean | null
          notificador_id: string
          notificador_nome: string
          numero_notificacao: string
          numero_prontuario: string | null
          paciente_nome: string | null
          setor: string
          status: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_notificacao?: string
          data_notificacao_externa?: string | null
          descricao: string
          desfecho?: string | null
          doenca_agravo: string
          id?: string
          medidas_controle?: string | null
          notificado_anvisa?: boolean | null
          notificado_vigilancia_municipal?: boolean | null
          notificador_id: string
          notificador_nome: string
          numero_notificacao: string
          numero_prontuario?: string | null
          paciente_nome?: string | null
          setor: string
          status?: string | null
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_notificacao?: string
          data_notificacao_externa?: string | null
          descricao?: string
          desfecho?: string | null
          doenca_agravo?: string
          id?: string
          medidas_controle?: string | null
          notificado_anvisa?: boolean | null
          notificado_vigilancia_municipal?: boolean | null
          notificador_id?: string
          notificador_nome?: string
          numero_notificacao?: string
          numero_prontuario?: string | null
          paciente_nome?: string | null
          setor?: string
          status?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      sciras_vigilancia_iras: {
        Row: {
          classificacao_gravidade: string | null
          created_at: string
          data_infeccao: string
          data_instalacao_dispositivo: string | null
          data_internacao: string | null
          data_nascimento: string | null
          data_remocao_dispositivo: string | null
          dispositivo_invasivo: string | null
          id: string
          leito: string | null
          microrganismo: string | null
          notificador_id: string | null
          notificador_nome: string | null
          numero_notificacao: string
          numero_prontuario: string | null
          observacoes: string | null
          paciente_nome: string
          perfil_resistencia: string | null
          setor: string
          sitio_infeccao: string
          status: string | null
          tipo_iras: string
          updated_at: string
        }
        Insert: {
          classificacao_gravidade?: string | null
          created_at?: string
          data_infeccao: string
          data_instalacao_dispositivo?: string | null
          data_internacao?: string | null
          data_nascimento?: string | null
          data_remocao_dispositivo?: string | null
          dispositivo_invasivo?: string | null
          id?: string
          leito?: string | null
          microrganismo?: string | null
          notificador_id?: string | null
          notificador_nome?: string | null
          numero_notificacao: string
          numero_prontuario?: string | null
          observacoes?: string | null
          paciente_nome: string
          perfil_resistencia?: string | null
          setor: string
          sitio_infeccao: string
          status?: string | null
          tipo_iras: string
          updated_at?: string
        }
        Update: {
          classificacao_gravidade?: string | null
          created_at?: string
          data_infeccao?: string
          data_instalacao_dispositivo?: string | null
          data_internacao?: string | null
          data_nascimento?: string | null
          data_remocao_dispositivo?: string | null
          dispositivo_invasivo?: string | null
          id?: string
          leito?: string | null
          microrganismo?: string | null
          notificador_id?: string | null
          notificador_nome?: string | null
          numero_notificacao?: string
          numero_prontuario?: string | null
          observacoes?: string | null
          paciente_nome?: string
          perfil_resistencia?: string | null
          setor?: string
          sitio_infeccao?: string
          status?: string | null
          tipo_iras?: string
          updated_at?: string
        }
        Relationships: []
      }
      seg_patrimonial_conflitos: {
        Row: {
          created_at: string
          descricao: string
          desfecho: string | null
          grau_agressividade: string
          id: string
          nome_envolvido: string
          registrado_por: string
          registrado_por_nome: string
          setor: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao: string
          desfecho?: string | null
          grau_agressividade?: string
          id?: string
          nome_envolvido: string
          registrado_por: string
          registrado_por_nome: string
          setor: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          desfecho?: string | null
          grau_agressividade?: string
          id?: string
          nome_envolvido?: string
          registrado_por?: string
          registrado_por_nome?: string
          setor?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      seg_patrimonial_danos: {
        Row: {
          created_at: string
          descricao: string
          encaminhado_manutencao: boolean | null
          foto_url: string | null
          id: string
          local_dano: string
          registrado_por: string
          registrado_por_nome: string
          status: string
          tipo_dano: string
          updated_at: string
          urgencia: string
        }
        Insert: {
          created_at?: string
          descricao: string
          encaminhado_manutencao?: boolean | null
          foto_url?: string | null
          id?: string
          local_dano: string
          registrado_por: string
          registrado_por_nome: string
          status?: string
          tipo_dano: string
          updated_at?: string
          urgencia?: string
        }
        Update: {
          created_at?: string
          descricao?: string
          encaminhado_manutencao?: boolean | null
          foto_url?: string | null
          id?: string
          local_dano?: string
          registrado_por?: string
          registrado_por_nome?: string
          status?: string
          tipo_dano?: string
          updated_at?: string
          urgencia?: string
        }
        Relationships: []
      }
      seg_patrimonial_passagem_plantao: {
        Row: {
          created_at: string
          id: string
          lido_em: string | null
          lido_por: string | null
          lido_por_nome: string | null
          pontos_atencao: string | null
          relato: string
          turno_entrada: string
          turno_saida: string
          usuario_saida_id: string
          usuario_saida_nome: string
        }
        Insert: {
          created_at?: string
          id?: string
          lido_em?: string | null
          lido_por?: string | null
          lido_por_nome?: string | null
          pontos_atencao?: string | null
          relato: string
          turno_entrada: string
          turno_saida: string
          usuario_saida_id: string
          usuario_saida_nome: string
        }
        Update: {
          created_at?: string
          id?: string
          lido_em?: string | null
          lido_por?: string | null
          lido_por_nome?: string | null
          pontos_atencao?: string | null
          relato?: string
          turno_entrada?: string
          turno_saida?: string
          usuario_saida_id?: string
          usuario_saida_nome?: string
        }
        Relationships: []
      }
      seg_patrimonial_rondas: {
        Row: {
          created_at: string
          detalhes_infraestrutura: string | null
          id: string
          infraestrutura_ok: boolean | null
          observacoes: string | null
          setor: string
          usuario_id: string
          usuario_nome: string
        }
        Insert: {
          created_at?: string
          detalhes_infraestrutura?: string | null
          id?: string
          infraestrutura_ok?: boolean | null
          observacoes?: string | null
          setor: string
          usuario_id: string
          usuario_nome: string
        }
        Update: {
          created_at?: string
          detalhes_infraestrutura?: string | null
          id?: string
          infraestrutura_ok?: boolean | null
          observacoes?: string | null
          setor?: string
          usuario_id?: string
          usuario_nome?: string
        }
        Relationships: []
      }
      seg_patrimonial_visitantes: {
        Row: {
          created_at: string
          documento: string | null
          hora_entrada: string
          hora_saida: string | null
          id: string
          nome_visitante: string
          numero_prontuario: string | null
          paciente_nome: string
          parentesco: string | null
          registrado_por: string
          registrado_por_nome: string
          setor_leito: string
        }
        Insert: {
          created_at?: string
          documento?: string | null
          hora_entrada?: string
          hora_saida?: string | null
          id?: string
          nome_visitante: string
          numero_prontuario?: string | null
          paciente_nome: string
          parentesco?: string | null
          registrado_por: string
          registrado_por_nome: string
          setor_leito: string
        }
        Update: {
          created_at?: string
          documento?: string | null
          hora_entrada?: string
          hora_saida?: string | null
          id?: string
          nome_visitante?: string
          numero_prontuario?: string | null
          paciente_nome?: string
          parentesco?: string | null
          registrado_por?: string
          registrado_por_nome?: string
          setor_leito?: string
        }
        Relationships: []
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
          entregue: boolean
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
          entregue?: boolean
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
          entregue?: boolean
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
      tentativas_duplicidade_refeicoes: {
        Row: {
          colaborador_nome: string
          created_at: string
          data_tentativa: string
          hora_tentativa: string
          id: string
          registro_original_id: string | null
          tipo_pessoa: string
          tipo_refeicao: string
          visitante_cpf_hash: string | null
        }
        Insert: {
          colaborador_nome: string
          created_at?: string
          data_tentativa: string
          hora_tentativa: string
          id?: string
          registro_original_id?: string | null
          tipo_pessoa: string
          tipo_refeicao: string
          visitante_cpf_hash?: string | null
        }
        Update: {
          colaborador_nome?: string
          created_at?: string
          data_tentativa?: string
          hora_tentativa?: string
          id?: string
          registro_original_id?: string | null
          tipo_pessoa?: string
          tipo_refeicao?: string
          visitante_cpf_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "tentativas_duplicidade_refeicoes_registro_original_id_fkey"
            columns: ["registro_original_id"]
            isOneToOne: false
            referencedRelation: "refeicoes_registros"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencia_coordenadas: {
        Row: {
          created_at: string
          id: string
          latitude: number
          longitude: number
          registrado_em: string
          solicitacao_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          latitude: number
          longitude: number
          registrado_em?: string
          solicitacao_id: string
        }
        Update: {
          created_at?: string
          id?: string
          latitude?: number
          longitude?: number
          registrado_em?: string
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferencia_coordenadas_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "transferencia_solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencia_intercorrencias: {
        Row: {
          created_at: string
          descricao: string
          id: string
          registrado_por: string | null
          registrado_por_nome: string
          solicitacao_id: string
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          registrado_por?: string | null
          registrado_por_nome: string
          solicitacao_id: string
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          registrado_por?: string | null
          registrado_por_nome?: string
          solicitacao_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transferencia_intercorrencias_solicitacao_id_fkey"
            columns: ["solicitacao_id"]
            isOneToOne: false
            referencedRelation: "transferencia_solicitacoes"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencia_solicitacoes: {
        Row: {
          created_at: string
          destino: string
          hora_chegada: string | null
          hora_saida: string | null
          id: string
          km_rodados: number | null
          motivo: string | null
          motorista_nome: string | null
          paciente_nome: string
          prioridade: string
          setor_origem: string
          solicitado_por: string | null
          solicitado_por_nome: string
          status: string
          updated_at: string
          veiculo_id: string | null
          veiculo_placa: string | null
          veiculo_tipo: string | null
        }
        Insert: {
          created_at?: string
          destino: string
          hora_chegada?: string | null
          hora_saida?: string | null
          id?: string
          km_rodados?: number | null
          motivo?: string | null
          motorista_nome?: string | null
          paciente_nome: string
          prioridade?: string
          setor_origem: string
          solicitado_por?: string | null
          solicitado_por_nome: string
          status?: string
          updated_at?: string
          veiculo_id?: string | null
          veiculo_placa?: string | null
          veiculo_tipo?: string | null
        }
        Update: {
          created_at?: string
          destino?: string
          hora_chegada?: string | null
          hora_saida?: string | null
          id?: string
          km_rodados?: number | null
          motivo?: string | null
          motorista_nome?: string | null
          paciente_nome?: string
          prioridade?: string
          setor_origem?: string
          solicitado_por?: string | null
          solicitado_por_nome?: string
          status?: string
          updated_at?: string
          veiculo_id?: string | null
          veiculo_placa?: string | null
          veiculo_tipo?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transferencia_solicitacoes_veiculo_id_fkey"
            columns: ["veiculo_id"]
            isOneToOne: false
            referencedRelation: "transferencia_veiculos"
            referencedColumns: ["id"]
          },
        ]
      }
      transferencia_veiculos: {
        Row: {
          created_at: string
          id: string
          motorista_nome: string
          placa: string
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          motorista_nome: string
          placa: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          motorista_nome?: string
          placa?: string
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      uniformes_seguranca: {
        Row: {
          created_at: string
          data_devolucao: string | null
          data_entrega: string
          id: string
          observacao: string | null
          quantidade: number
          registrado_por: string
          registrado_por_nome: string
          status: string
          tamanho: string
          tipo_uniforme: string
          updated_at: string
          usuario_id: string
          usuario_nome: string
        }
        Insert: {
          created_at?: string
          data_devolucao?: string | null
          data_entrega: string
          id?: string
          observacao?: string | null
          quantidade?: number
          registrado_por: string
          registrado_por_nome: string
          status?: string
          tamanho: string
          tipo_uniforme: string
          updated_at?: string
          usuario_id: string
          usuario_nome: string
        }
        Update: {
          created_at?: string
          data_devolucao?: string | null
          data_entrega?: string
          id?: string
          observacao?: string | null
          quantidade?: number
          registrado_por?: string
          registrado_por_nome?: string
          status?: string
          tamanho?: string
          tipo_uniforme?: string
          updated_at?: string
          usuario_id?: string
          usuario_nome?: string
        }
        Relationships: []
      }
      upa_action_plans: {
        Row: {
          analise_critica: string | null
          ano: number
          created_at: string
          fator_causa: string | null
          id: string
          indicator_id: string | null
          mes: string
          plano_acao: string | null
          prazo: string | null
          responsavel: string | null
          status: string
          updated_at: string
        }
        Insert: {
          analise_critica?: string | null
          ano: number
          created_at?: string
          fator_causa?: string | null
          id?: string
          indicator_id?: string | null
          mes: string
          plano_acao?: string | null
          prazo?: string | null
          responsavel?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          analise_critica?: string | null
          ano?: number
          created_at?: string
          fator_causa?: string | null
          id?: string
          indicator_id?: string | null
          mes?: string
          plano_acao?: string | null
          prazo?: string | null
          responsavel?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "upa_action_plans_indicator_id_fkey"
            columns: ["indicator_id"]
            isOneToOne: false
            referencedRelation: "upa_indicators"
            referencedColumns: ["id"]
          },
        ]
      }
      upa_indicators: {
        Row: {
          ano: number
          categoria: string
          created_at: string
          id: string
          indicador: string
          mes: string
          meta: number | null
          subcategoria: string | null
          unidade_medida: string
          updated_at: string
          valor_numero: number | null
          valor_percentual: number | null
        }
        Insert: {
          ano: number
          categoria: string
          created_at?: string
          id?: string
          indicador: string
          mes: string
          meta?: number | null
          subcategoria?: string | null
          unidade_medida?: string
          updated_at?: string
          valor_numero?: number | null
          valor_percentual?: number | null
        }
        Update: {
          ano?: number
          categoria?: string
          created_at?: string
          id?: string
          indicador?: string
          mes?: string
          meta?: number | null
          subcategoria?: string | null
          unidade_medida?: string
          updated_at?: string
          valor_numero?: number | null
          valor_percentual?: number | null
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
      usuario_perfil: {
        Row: {
          created_at: string | null
          created_by: string | null
          id: string
          perfil_id: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          perfil_id?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          id?: string
          perfil_id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "usuario_perfil_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_sistema"
            referencedColumns: ["id"]
          },
        ]
      }
      vacinas_seguranca: {
        Row: {
          created_at: string
          data_aplicacao: string
          data_proxima_dose: string | null
          dose: string | null
          id: string
          local_aplicacao: string | null
          lote: string | null
          observacao: string | null
          registrado_por: string
          registrado_por_nome: string
          status: string
          tipo_vacina: string
          updated_at: string
          usuario_id: string
          usuario_nome: string
        }
        Insert: {
          created_at?: string
          data_aplicacao: string
          data_proxima_dose?: string | null
          dose?: string | null
          id?: string
          local_aplicacao?: string | null
          lote?: string | null
          observacao?: string | null
          registrado_por: string
          registrado_por_nome: string
          status?: string
          tipo_vacina: string
          updated_at?: string
          usuario_id: string
          usuario_nome: string
        }
        Update: {
          created_at?: string
          data_aplicacao?: string
          data_proxima_dose?: string | null
          dose?: string | null
          id?: string
          local_aplicacao?: string | null
          lote?: string | null
          observacao?: string | null
          registrado_por?: string
          registrado_por_nome?: string
          status?: string
          tipo_vacina?: string
          updated_at?: string
          usuario_id?: string
          usuario_nome?: string
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
      escala_dia_view: {
        Row: {
          data_plantao: string | null
          de_plantao_agora: boolean | null
          especialidade: string | null
          hora_fim: string | null
          hora_inicio: string | null
          id: string | null
          nome: string | null
          observacoes: string | null
          registro_profissional: string | null
          setor: string | null
          status: string | null
          tipo_plantao: string | null
          tipo_profissional: string | null
        }
        Relationships: []
      }
      lms_quiz_perguntas_aluno: {
        Row: {
          created_at: string | null
          id: string | null
          opcao_a: string | null
          opcao_b: string | null
          opcao_c: string | null
          opcao_d: string | null
          ordem: number | null
          pergunta: string | null
          treinamento_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          opcao_a?: string | null
          opcao_b?: string | null
          opcao_c?: string | null
          opcao_d?: string | null
          ordem?: number | null
          pergunta?: string | null
          treinamento_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          opcao_a?: string | null
          opcao_b?: string | null
          opcao_c?: string | null
          opcao_d?: string | null
          ordem?: number | null
          pergunta?: string | null
          treinamento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lms_quiz_perguntas_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "lms_treinamentos"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      buscar_colaborador_totem: {
        Args: { _matricula: string }
        Returns: {
          id: string
          matricula: string
          nome: string
          pode_registrar: boolean
        }[]
      }
      buscar_usuario_por_matricula: {
        Args: { _matricula: string }
        Returns: {
          user_id: string
        }[]
      }
      corrigir_quiz: {
        Args: { _respostas: Json; _treinamento_id: string }
        Returns: {
          acertos: number
          nota: number
          total: number
        }[]
      }
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
      is_chat_participant: {
        Args: { _conversa_id: string; _user_id: string }
        Returns: boolean
      }
      obter_permissoes_usuario: { Args: { _user_id: string }; Returns: Json }
      pode_ver_formulario: {
        Args: { _formulario_id: string; _user_id: string }
        Returns: boolean
      }
      usuario_pode_acessar_modulo: {
        Args: { _modulo_codigo: string; _user_id: string }
        Returns: Json
      }
      usuario_pode_usar_ferramenta: {
        Args: {
          _ferramenta_codigo: string
          _modulo_codigo: string
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
        | "ti"
        | "manutencao"
        | "engenharia_clinica"
        | "laboratorio"
        | "restaurante"
        | "rh_dp"
        | "assistencia_social"
        | "qualidade"
        | "nsp"
        | "seguranca"
        | "enfermagem"
        | "medicos"
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
        "assistencia_social",
        "qualidade",
        "nsp",
        "seguranca",
        "enfermagem",
        "medicos",
      ],
    },
  },
} as const
