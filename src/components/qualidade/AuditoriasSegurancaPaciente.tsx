import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Eye, Pencil, FileText, ClipboardList, CheckCircle, XCircle, MinusCircle, Stethoscope } from "lucide-react";
import { SectionHeader, ActionButton } from "@/components/ui/action-buttons";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Types
type TipoAuditoria = 
  | "comunicacao_efetiva"
  | "lesao_pressao"
  | "queda"
  | "higiene_maos"
  | "avaliacao_prontuarios_enfermeiros";

interface AuditoriaSeguranca {
  id: string;
  tipo: TipoAuditoria;
  data_auditoria: string;
  setor: string;
  auditor_id: string;
  auditor_nome: string;
  paciente_iniciais?: string;
  paciente_ra?: string;
  numero_prontuario?: string;
  score_risco?: string;
  possui_lpp?: boolean;
  grau_lpp?: string;
  apresentou_queda?: boolean;
  notificacao_aberta?: string;
  profissional_auditado?: string;
  mes_avaliacao?: string;
  unidade_atendimento?: string;
  satisfacao_geral?: number;
  respostas: Record<string, string | number>;
  observacoes?: string;
  created_at: string;
}

// Audit type configurations
const tiposAuditoria: { value: TipoAuditoria; label: string; icon: React.ElementType }[] = [
  { value: "comunicacao_efetiva", label: "Comunicação Efetiva", icon: FileText },
  { value: "lesao_pressao", label: "Prevenção de Lesão por Pressão", icon: Stethoscope },
  { value: "queda", label: "Prevenção de Queda", icon: ClipboardList },
  { value: "higiene_maos", label: "Higiene das Mãos", icon: CheckCircle },
  { value: "avaliacao_prontuarios_enfermeiros", label: "Avaliação de Prontuários (Enfermeiros)", icon: FileText },
];

// Sector options for each audit type
const setoresPorTipo: Record<TipoAuditoria, string[]> = {
  comunicacao_efetiva: ["Internação", "Urgência", "Laboratório", "Raio-x", "Consultórios Médicos"],
  lesao_pressao: ["Isolamento", "Pediatria", "Enfermaria Masculina", "Enfermaria Feminina", "Medicação", "Urgência"],
  queda: ["Recepção", "Classificação 1", "Classificação 2", "Urgência", "Isolamento", "Enfermaria Masculina", "Enfermaria Feminina", "Pediatria", "Medicação"],
  higiene_maos: ["Classificação 1", "Classificação 2", "Urgência", "Sutura", "Isolamento", "Medicação", "Consultórios Médicos", "Internação"],
  avaliacao_prontuarios_enfermeiros: ["Emergência (observação vermelha)", "Internação (observação amarela)", "Observação sem leito"],
};

// Checklist items for each audit type
const checklistItems: Record<TipoAuditoria, { section: string; items: { id: string; label: string; options: string[] }[] }[]> = {
  comunicacao_efetiva: [
    {
      section: "Avaliação de Comunicação",
      items: [
        { id: "lab_valor_critico", label: "O laboratório comunicou o setor do resultado de valor crítico e registrou em sua planilha interna de controle?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "registro_priorizacao_rx", label: "Foi realizado o registro de comunicação de priorização de análise médica do raio-x?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "registro_valor_critico_lab", label: "Foi registrado o resultado de valor crítico do exame laboratorial no prontuário do paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "registro_alteracao_rx", label: "Foi registrado a alteração crítica do exame de raio-x?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "conhece_receptor_critico", label: "O colaborador sabe quem pode receber o resultado de valor crítico e a comunicação de priorização análise do raio-x?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "transferencia_interna", label: "Foi realizado o preenchimento completo e correto do formulário de transferência interna entre os setores da unidade?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "transferencia_externa", label: "Foi realizado o preenchimento completo e correto do formulário de transferência externa?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "sbar_internacao", label: "As transferências de cuidados são realizadas por meio do método SBAR em todas as trocas de plantão (12/12 horas) no setor de internação e todos os campos preenchido corretamente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "sbar_urgencia", label: "As transferências de cuidados são realizadas por meio do método SBAR em todas as trocas de plantão (12/12 horas) no setor de urgência e todos os campos preenchido corretamente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "siglario", label: "Os profissionais seguem o siglário institucional, utilizando apenas siglas padronizadas nos registros e comunicações internas?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "caderno_passagem_plantao", label: "O corpo clínico utiliza o caderno institucional para registrar a passagem de plantão entre turnos nos casos de pacientes não internados em continuidade de atendimento?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "conhece_protocolo", label: "Há evidências de que o profissional conhece, entende e executa as diretrizes descritas no Protocolo de Comunicação Efetiva?", options: ["conforme", "nao_conforme"] },
      ],
    },
  ],
  lesao_pressao: [
    {
      section: "Avaliação com Paciente",
      items: [
        { id: "risco_lpp_admissao", label: "Avaliado o risco de LPP na admissão do paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "fatores_risco_beira_leito", label: "Paciente com fatores de risco de LPP identificados a beira leito?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "fatores_risco_prontuario", label: "Pacientes com fatores de risco de LPP identificados em Prontuário?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "ferramenta_braden", label: "Foi utilizado ferramenta estruturada (Braden - Adulto/BradenQ - neonatal e pediátrico) para classificação de risco?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "prescricao_enfermagem_risco", label: "Prescrição de enfermagem de acordo com o risco do paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "reavaliacao_risco", label: "Enfermeiro realiza reavaliação do Risco conforme score de risco?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "mudanca_decubito", label: "Mudança de decúbito conforme o risco do paciente (4/4h para risco leve e moderado 2/2h para risco alto e muito alto)", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "uso_coxins", label: "Paciente possui uso de coxins para proteção de proeminências ósseas (calcanhar, escapular, sacral)?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "educacao_mobilidade", label: "Paciente ou familiares foram educados para otimização da mobilidade?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      ],
    },
    {
      section: "Avaliação com Colaborador",
      items: [
        { id: "colab_protocolo", label: "Conhece o protocolo institucional?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "colab_notifica", label: "Conhece e/ou notifica os casos de Lesão por Pressão da unidade?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "colab_educacao", label: "Colaborador realiza educação com o paciente e familiares?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "colab_barreiras", label: "Colaborador conhece as barreiras de prevenção?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "colab_registro_pele", label: "Registra no prontuário as condições da pele do paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      ],
    },
  ],
  queda: [
    {
      section: "Avaliação com Paciente",
      items: [
        { id: "risco_queda_admissao", label: "Paciente com risco de Queda identificado na admissão (possui pulseira preta)?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "risco_queda_beira_leito", label: "Paciente com Risco de Queda identificados a beira leito?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "risco_queda_prontuario", label: "Pacientes com Risco de Queda identificados em Prontuário?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "ferramenta_morse", label: "Foi utilizado ferramenta estruturada (Morse/Humpty Dumpty) para classificação de risco?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "prescricao_enfermagem", label: "Prescrição de enfermagem de acordo com o risco do paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "reavaliacao_diaria", label: "Enfermeiro realiza reavaliação do Risco diariamente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "grades_cama", label: "As camas possuem grades de proteção nas laterais com rodízios com trava? Testar o funcionamento.", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "educacao_risco", label: "Paciente ou familiares foram educados quanto ao risco e barreiras de prevenção?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "registro_cuidados", label: "Existe registro em prontuário quanto aos cuidados com o paciente, bem como as orientações realizadas?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "campainha_funcionando", label: "Leito do paciente possui campainha ao alcance do paciente e funcionando?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      ],
    },
    {
      section: "Avaliação com Colaborador",
      items: [
        { id: "colab_protocolo", label: "Conhece o protocolo institucional?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "colab_notifica", label: "Conhece e/ou notifica os casos de Queda da unidade?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "colab_educacao", label: "Colaborador realizam educação com o paciente e familiares?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "colab_barreiras", label: "Colaborador conhece as barreiras de prevenção de queda?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      ],
    },
  ],
  higiene_maos: [
    {
      section: "Avaliação (5 Momentos)",
      items: [
        { id: "antes_contato", label: "Colaborador realiza a higienização das mãos (lavagem ou solução alcoólica) antes do contato com o paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "antes_procedimento", label: "Colaborador realiza a higienização das mãos (lavagem ou solução alcoólica) antes de realizar procedimento asséptico com o paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "apos_fluidos", label: "Colaborador realiza a higienização das mãos (lavagem ou solução alcoólica) após risco de exposição a fluidos corporais?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "apos_contato", label: "Colaborador realiza a higienização das mãos (lavagem ou solução alcoólica) após contato com o paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "apos_areas_proximas", label: "Colaborador realiza a higienização das mãos (lavagem ou solução alcoólica) após contato com as áreas próximas ao paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "educacao_paciente", label: "Pacientes foram educados sobre a importância da higienização das mãos?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      ],
    },
    {
      section: "Avaliação com Colaborador",
      items: [
        { id: "colab_protocolo", label: "Conhece o protocolo institucional?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "colab_educacao", label: "Colaborador realiza educação com o paciente e familiares?", options: ["conforme", "nao_conforme", "nao_aplica"] },
        { id: "sem_adornos", label: "Profissional não está utilizando adornos que comprometem a higienização das mãos, como anéis, relógios e pulseiras?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      ],
    },
  ],
  avaliacao_prontuarios_enfermeiros: [
    {
      section: "Classificação e Protocolos",
      items: [
        { id: "classificacao_manchester", label: "A classificação do paciente foi realizada de forma adequada, contendo todos os sinais vitais registrados, seguindo corretamente o Protocolo de Manchester?", options: ["sim_completo", "parcial_sem_manchester", "parcial_sem_sinais", "nao_conforme", "nao_aplica"] },
        { id: "protocolo_sepse_dor", label: "Considerando os sintomas apresentados e sinais vitais, havia indicação de abertura de Protocolo de Sepse ou Protocolo de Dor Torácica?", options: ["sim_aberto", "sim_nao_aberto", "nao_abriu_indevido", "nao_aberto"] },
        { id: "dupla_checagem", label: "Medicamentos de alta vigilância apresenta dupla checagem (carimbo e assinatura)", options: ["sim", "nao", "nao_aplica"] },
        { id: "evolucao_anexada", label: "Possui evolução da sala de medicação anexada a prescrição médica?", options: ["sim", "nao", "nao_aplica"] },
        { id: "evolucao_preenchida", label: "Evolução da sala de medicação preenchida corretamente?", options: ["sim_completo", "parcial", "nao", "nao_aplica"] },
        { id: "assinatura_carimbo_classificacao", label: "A classificação de risco possui assinatura e carimbo do enfermeiro responsável?", options: ["sim_completo", "parcial", "nao"] },
        { id: "aprazamento", label: "Aprazamento da prescrição médica correta?", options: ["sim", "nao", "nao_aplica"] },
        { id: "checagem_medicamentos", label: "A checagem dos medicamentos administrados na sala de medicação, contem assinatura e carimbo?", options: ["sim", "nao", "nao_aplica"] },
      ],
    },
    {
      section: "Avaliação Qualitativa (Escala 0-10)",
      items: [
        { id: "historico_enfermagem", label: "Como você avalia o Histórico de Enfermagem? (Avaliação inicial completa do paciente na admissão)", options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "nao_aplica"] },
        { id: "diagnostico_enfermagem", label: "Como você avalia a descrição do Diagnóstico de Enfermagem?", options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "nao_aplica"] },
        { id: "prescricao_enfermagem", label: "Como você avalia a Prescrição de Enfermagem? (Plano de cuidados individualizado)", options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "nao_aplica"] },
        { id: "evolucao_enfermagem", label: "Como você avalia a descrição da Evolução de Enfermagem?", options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "nao_aplica"] },
        { id: "orientacao_alta", label: "Como você avalia a descrição da orientação de alta de enfermagem?", options: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "nao_aplica"] },
      ],
    },
  ],
};

// Score options for queda audit
const scoreRiscoQueda = [
  { value: "sem_risco_adulto", label: "Sem Risco (0 - 24 pontos) adulto" },
  { value: "baixo_risco_adulto", label: "Baixo Risco (25 - 50 pontos) adulto" },
  { value: "alto_risco_adulto", label: "Alto Risco (Maior/igual 51 pontos) adulto" },
  { value: "baixo_risco_pediatrico", label: "Baixo Risco (7 a 11 pontos) pediátrico" },
  { value: "alto_risco_pediatrico", label: "Alto Risco (12 a 22 pontos) pediátrico" },
];

// LPP grades
const grausLPP = [
  { value: "grau_1", label: "Grau I" },
  { value: "grau_2", label: "Grau II" },
  { value: "grau_3", label: "Grau III" },
  { value: "grau_4", label: "Grau IV" },
  { value: "nao_aplica", label: "Não se aplica" },
];

// Professional types for hygiene audit
const profissionaisAuditados = [
  { value: "auxiliar_tecnico", label: "Auxiliar/Técnico de Enfermagem" },
  { value: "enfermeiro", label: "Enfermeiro" },
  { value: "medico", label: "Médico" },
  { value: "outro", label: "Outro" },
];

// Likert scale labels
const likertLabels: Record<string, string> = {
  "0": "0 - Registro inexistente",
  "1": "1 - Registro insuficiente, sem utilidade clínica",
  "2": "2 - Registro muito ruim",
  "3": "3 - Registro ruim",
  "4": "4 - Registro insatisfatório",
  "5": "5 - Registro medíocre (mínimo aceitável)",
  "6": "6 - Registro regular",
  "7": "7 - Registro satisfatório",
  "8": "8 - Registro bom",
  "9": "9 - Registro muito bom",
  "nao_aplica": "Não se aplica",
};

interface Props {
  currentUser: { id: string; nome: string };
}

export const AuditoriasSegurancaPaciente = ({ currentUser }: Props) => {
  const { toast } = useToast();
  const [auditorias, setAuditorias] = useState<AuditoriaSeguranca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<TipoAuditoria | "todos">("todos");
  
  // Dynamic config from DB
  const [dynamicTipos, setDynamicTipos] = useState<{ value: string; label: string; icon: React.ElementType }[]>([]);
  const [dynamicSetores, setDynamicSetores] = useState<Record<string, string[]>>({});
  const [dynamicChecklist, setDynamicChecklist] = useState<Record<string, { section: string; items: { id: string; label: string; options: string[] }[] }[]>>({});
  const [configLoaded, setConfigLoaded] = useState(false);

  // Dialog states
  const [novaAuditoriaDialog, setNovaAuditoriaDialog] = useState(false);
  const [detalhesDialog, setDetalhesDialog] = useState(false);
  const [selectedAuditoria, setSelectedAuditoria] = useState<AuditoriaSeguranca | null>(null);
  const [editingAuditoriaId, setEditingAuditoriaId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [tipoSelecionado, setTipoSelecionado] = useState<TipoAuditoria | null>(null);
  const [formData, setFormData] = useState({
    data_auditoria: format(new Date(), "yyyy-MM-dd"),
    setor: "",
    paciente_iniciais: "",
    paciente_ra: "",
    numero_prontuario: "",
    score_risco: "",
    possui_lpp: false,
    grau_lpp: "",
    apresentou_queda: false,
    notificacao_aberta: "",
    profissional_auditado: "",
    mes_avaliacao: "",
    unidade_atendimento: "",
    satisfacao_geral: 5,
    observacoes: "",
  });
  const [respostas, setRespostas] = useState<Record<string, string>>({});

  useEffect(() => {
    loadConfig();
    loadAuditorias();
  }, []);

  const iconMap: Record<string, React.ElementType> = {
    FileText, Stethoscope, ClipboardList, CheckCircle,
  };

  const loadConfig = async () => {
    const [fRes, sRes, pRes] = await Promise.all([
      supabase.from("auditoria_formularios_config").select("*").eq("ativo", true).order("ordem"),
      supabase.from("auditoria_secoes_config").select("*").order("ordem"),
      supabase.from("auditoria_perguntas_config").select("*").eq("ativo", true).order("ordem"),
    ]);

    if (fRes.data && sRes.data && pRes.data) {
      const tipos = fRes.data.map((f: any) => ({
        value: f.tipo as TipoAuditoria,
        label: f.nome,
        icon: iconMap[f.icone] || FileText,
      }));
      setDynamicTipos(tipos);

      const setoresMap: Record<string, string[]> = {};
      fRes.data.forEach((f: any) => { setoresMap[f.tipo] = f.setores || []; });
      setDynamicSetores(setoresMap);

      const checklistMap: Record<string, { section: string; items: { id: string; label: string; options: string[] }[] }[]> = {};
      fRes.data.forEach((f: any) => {
        const formSecoes = sRes.data.filter((s: any) => s.formulario_id === f.id);
        checklistMap[f.tipo] = formSecoes.map((s: any) => ({
          section: s.nome,
          items: pRes.data
            .filter((p: any) => p.secao_id === s.id)
            .map((p: any) => ({ id: p.codigo, label: p.label, options: p.opcoes })),
        }));
      });
      setDynamicChecklist(checklistMap);
      setConfigLoaded(true);
    } else {
      // Fallback to hardcoded
      setDynamicTipos(tiposAuditoria);
      setDynamicSetores(setoresPorTipo);
      setDynamicChecklist(checklistItems);
      setConfigLoaded(true);
    }
  };

  // Use dynamic or fallback
  const activeTipos = configLoaded ? dynamicTipos : tiposAuditoria;
  const activeSetores = configLoaded ? dynamicSetores : setoresPorTipo;
  const activeChecklist = configLoaded ? dynamicChecklist : checklistItems;

  const loadAuditorias = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from("auditorias_seguranca_paciente")
      .select("*")
      .order("created_at", { ascending: false });
    
    if (data) {
      setAuditorias(data as AuditoriaSeguranca[]);
    }
    setIsLoading(false);
  };

  const handleSelectTipo = (tipo: TipoAuditoria) => {
    setTipoSelecionado(tipo);
    setRespostas({});
    setFormData({
      data_auditoria: format(new Date(), "yyyy-MM-dd"),
      setor: "",
      paciente_iniciais: "",
      paciente_ra: "",
      numero_prontuario: "",
      score_risco: "",
      possui_lpp: false,
      grau_lpp: "",
      apresentou_queda: false,
      notificacao_aberta: "",
      profissional_auditado: "",
      mes_avaliacao: "",
      unidade_atendimento: "",
      satisfacao_geral: 5,
      observacoes: "",
    });
  };

  const handleRespostaChange = (itemId: string, value: string) => {
    setRespostas(prev => ({ ...prev, [itemId]: value }));
  };

  const handleEdit = (auditoria: AuditoriaSeguranca) => {
    setEditingAuditoriaId(auditoria.id);
    setTipoSelecionado(auditoria.tipo);
    setFormData({
      data_auditoria: auditoria.data_auditoria,
      setor: auditoria.setor,
      paciente_iniciais: auditoria.paciente_iniciais || "",
      paciente_ra: auditoria.paciente_ra || "",
      numero_prontuario: auditoria.numero_prontuario || "",
      score_risco: auditoria.score_risco || "",
      possui_lpp: auditoria.possui_lpp || false,
      grau_lpp: auditoria.grau_lpp || "",
      apresentou_queda: auditoria.apresentou_queda || false,
      notificacao_aberta: auditoria.notificacao_aberta || "",
      profissional_auditado: auditoria.profissional_auditado || "",
      mes_avaliacao: auditoria.mes_avaliacao || "",
      unidade_atendimento: auditoria.unidade_atendimento || "",
      satisfacao_geral: auditoria.satisfacao_geral || 5,
      observacoes: auditoria.observacoes || "",
    });
    setRespostas(auditoria.respostas as Record<string, string>);
    setNovaAuditoriaDialog(true);
  };

  const handleSubmit = async () => {
    if (!tipoSelecionado || !formData.setor || !formData.data_auditoria) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios", variant: "destructive" });
      return;
    }

    // Check if all checklist items are answered
    const allItems = (activeChecklist[tipoSelecionado] || []).flatMap(section => section.items);
    const unansweredItems = allItems.filter(item => !respostas[item.id]);
    if (unansweredItems.length > 0) {
      toast({ 
        title: "Erro", 
        description: `Responda todos os itens do checklist. Faltam ${unansweredItems.length} itens.`, 
        variant: "destructive" 
      });
      return;
    }

    setIsSubmitting(true);

    const payload = {
      tipo: tipoSelecionado,
      data_auditoria: formData.data_auditoria,
      setor: formData.setor,
      auditor_id: currentUser.id,
      auditor_nome: currentUser.nome,
      paciente_iniciais: formData.paciente_iniciais || null,
      paciente_ra: formData.paciente_ra || null,
      numero_prontuario: formData.numero_prontuario || null,
      score_risco: formData.score_risco || null,
      possui_lpp: tipoSelecionado === "lesao_pressao" ? formData.possui_lpp : null,
      grau_lpp: formData.grau_lpp || null,
      apresentou_queda: tipoSelecionado === "queda" ? formData.apresentou_queda : null,
      notificacao_aberta: formData.notificacao_aberta || null,
      profissional_auditado: formData.profissional_auditado || null,
      mes_avaliacao: formData.mes_avaliacao || null,
      unidade_atendimento: formData.unidade_atendimento || null,
      satisfacao_geral: tipoSelecionado === "avaliacao_prontuarios_enfermeiros" ? formData.satisfacao_geral : null,
      respostas,
      observacoes: formData.observacoes || null,
    };

    let error;
    if (editingAuditoriaId) {
      const result = await supabase
        .from("auditorias_seguranca_paciente")
        .update(payload)
        .eq("id", editingAuditoriaId);
      error = result.error;
    } else {
      const result = await supabase
        .from("auditorias_seguranca_paciente")
        .insert(payload);
      error = result.error;
    }

    if (error) {
      toast({ title: "Erro", description: "Falha ao salvar auditoria", variant: "destructive" });
    } else {
      toast({ title: "Sucesso", description: editingAuditoriaId ? "Auditoria atualizada com sucesso" : "Auditoria registrada com sucesso" });
      setNovaAuditoriaDialog(false);
      setTipoSelecionado(null);
      setEditingAuditoriaId(null);
      loadAuditorias();
    }
    setIsSubmitting(false);
  };

  const getConformidadeStats = (auditoria: AuditoriaSeguranca) => {
    const respostas = auditoria.respostas as Record<string, string>;
    const values = Object.values(respostas);
    const conforme = values.filter(v => v === "conforme" || v === "sim" || v === "sim_completo" || v === "sim_aberto").length;
    const naoConforme = values.filter(v => v === "nao_conforme" || v === "nao" || v === "sim_nao_aberto").length;
    const total = values.filter(v => v !== "nao_aplica").length;
    return { conforme, naoConforme, total, percentual: total > 0 ? ((conforme / total) * 100).toFixed(1) : "0" };
  };

  const filteredAuditorias = auditorias.filter(a => {
    const matchSearch = searchTerm === "" ||
      a.setor.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.auditor_nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.paciente_iniciais?.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchTipo = tipoFilter === "todos" || a.tipo === tipoFilter;
    return matchSearch && matchTipo;
  });

  const exportToExcel = () => {
    const data = filteredAuditorias.map(a => {
      const stats = getConformidadeStats(a);
      return {
        Tipo: activeTipos.find(t => t.value === a.tipo)?.label || a.tipo,
        Data: format(new Date(a.data_auditoria), "dd/MM/yyyy"),
        Setor: a.setor,
        Auditor: a.auditor_nome,
        "Paciente": a.paciente_iniciais || "-",
        "Conformidade (%)": stats.percentual + "%",
        Observações: a.observacoes || "",
      };
    });
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Auditorias");
    XLSX.writeFile(wb, `auditorias-seguranca-${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  };

  const exportToPDF = async () => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const { doc, logoImg } = await createStandardPdf('Auditorias de Segurança do Paciente');
    
    autoTable(doc, {
      startY: 32,
      head: [["Tipo", "Data", "Setor", "Auditor", "Conformidade"]],
      body: filteredAuditorias.map(a => {
        const stats = getConformidadeStats(a);
        return [
          activeTipos.find(t => t.value === a.tipo)?.label || a.tipo,
          format(new Date(a.data_auditoria), "dd/MM/yyyy"),
          a.setor,
          a.auditor_nome,
          stats.percentual + "%",
        ];
      }),
      styles: { fontSize: 8 },
      margin: { bottom: 28 },
    });
    savePdfWithFooter(doc, 'Auditorias de Segurança do Paciente', `auditorias-seguranca-${format(new Date(), "yyyy-MM-dd")}`, logoImg);
  };

  const renderFormFields = () => {
    if (!tipoSelecionado) return null;

    return (
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        {/* Common fields */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="data">Data da Auditoria *</Label>
            <Input
              id="data"
              type="date"
              value={formData.data_auditoria}
              onChange={(e) => setFormData(prev => ({ ...prev, data_auditoria: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="setor">Setor *</Label>
            <Select value={formData.setor} onValueChange={(v) => setFormData(prev => ({ ...prev, setor: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {(activeSetores[tipoSelecionado] || []).map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Patient-specific fields */}
        {(tipoSelecionado === "lesao_pressao" || tipoSelecionado === "queda") && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Iniciais do Paciente</Label>
              <Input
                value={formData.paciente_iniciais}
                onChange={(e) => setFormData(prev => ({ ...prev, paciente_iniciais: e.target.value }))}
                placeholder="Ex: J.S."
              />
            </div>
            <div>
              <Label>RA do Paciente</Label>
              <Input
                value={formData.paciente_ra}
                onChange={(e) => setFormData(prev => ({ ...prev, paciente_ra: e.target.value }))}
                placeholder="Número do RA"
              />
            </div>
          </div>
        )}

        {/* Score de risco for queda */}
        {tipoSelecionado === "queda" && (
          <div>
            <Label>Score de Risco (Morse/Humpty Dumpty)</Label>
            <Select value={formData.score_risco} onValueChange={(v) => setFormData(prev => ({ ...prev, score_risco: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o score" />
              </SelectTrigger>
              <SelectContent>
                {scoreRiscoQueda.map(s => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Professional type for higiene_maos */}
        {tipoSelecionado === "higiene_maos" && (
          <div>
            <Label>Profissional Auditado</Label>
            <Select value={formData.profissional_auditado} onValueChange={(v) => setFormData(prev => ({ ...prev, profissional_auditado: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                {profissionaisAuditados.map(p => (
                  <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Avaliação de prontuários specific fields */}
        {tipoSelecionado === "avaliacao_prontuarios_enfermeiros" && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Mês de Avaliação</Label>
                <Input
                  value={formData.mes_avaliacao}
                  onChange={(e) => setFormData(prev => ({ ...prev, mes_avaliacao: e.target.value }))}
                  placeholder="Ex: Janeiro/2026"
                />
              </div>
              <div>
                <Label>Iniciais do Paciente</Label>
                <Input
                  value={formData.paciente_iniciais}
                  onChange={(e) => setFormData(prev => ({ ...prev, paciente_iniciais: e.target.value }))}
                />
              </div>
              <div>
                <Label>Nº Prontuário</Label>
                <Input
                  value={formData.numero_prontuario}
                  onChange={(e) => setFormData(prev => ({ ...prev, numero_prontuario: e.target.value }))}
                />
              </div>
            </div>
            <div>
              <Label>Unidade de Atendimento</Label>
              <Select value={formData.unidade_atendimento} onValueChange={(v) => setFormData(prev => ({ ...prev, unidade_atendimento: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {setoresPorTipo.avaliacao_prontuarios_enfermeiros.map(u => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        {/* Checklist sections */}
        {(activeChecklist[tipoSelecionado] || []).map((section, idx) => (
          <Card key={idx} className="border-l-4 border-l-primary">
            <CardHeader className="py-3">
              <CardTitle className="text-base">{section.section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.items.map((item) => (
                <div key={item.id} className="space-y-2">
                  <Label className="text-sm leading-relaxed">{item.label}</Label>
                  <RadioGroup
                    value={respostas[item.id] || ""}
                    onValueChange={(v) => handleRespostaChange(item.id, v)}
                    className="flex flex-wrap gap-4"
                  >
                    {item.options.map((opt) => {
                      const label = opt === "conforme" ? "Conforme" :
                        opt === "nao_conforme" ? "Não Conforme" :
                        opt === "nao_aplica" ? "Não se aplica" :
                        opt === "sim" ? "Sim" :
                        opt === "nao" ? "Não" :
                        opt === "sim_completo" ? "Sim, completo" :
                        opt === "parcial" ? "Parcialmente" :
                        opt === "parcial_sem_manchester" ? "Parcial (sem Manchester)" :
                        opt === "parcial_sem_sinais" ? "Parcial (sem sinais vitais)" :
                        opt === "sim_aberto" ? "Sim, foi aberto corretamente" :
                        opt === "sim_nao_aberto" ? "Sim, porém não foi aberto" :
                        opt === "nao_abriu_indevido" ? "Não, porém abriu protocolo" :
                        opt === "nao_aberto" ? "Não, não foi aberto" :
                        likertLabels[opt] || opt;

                      return (
                        <div key={opt} className="flex items-center space-x-2">
                          <RadioGroupItem value={opt} id={`${item.id}-${opt}`} />
                          <Label htmlFor={`${item.id}-${opt}`} className="text-sm font-normal cursor-pointer">
                            {label}
                          </Label>
                        </div>
                      );
                    })}
                  </RadioGroup>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {/* LPP specific questions */}
        {tipoSelecionado === "lesao_pressao" && (
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Informações sobre LPP</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Paciente auditado com Lesão por Pressão?</Label>
                <RadioGroup
                  value={formData.possui_lpp ? "sim" : "nao"}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, possui_lpp: v === "sim" }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="lpp-sim" />
                    <Label htmlFor="lpp-sim">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="lpp-nao" />
                    <Label htmlFor="lpp-nao">Não</Label>
                  </div>
                </RadioGroup>
              </div>
              {formData.possui_lpp && (
                <div>
                  <Label>Qual o grau da LPP?</Label>
                  <Select value={formData.grau_lpp} onValueChange={(v) => setFormData(prev => ({ ...prev, grau_lpp: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o grau" />
                    </SelectTrigger>
                    <SelectContent>
                      {grausLPP.map(g => (
                        <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Queda specific questions */}
        {tipoSelecionado === "queda" && (
          <Card className="border-l-4 border-l-orange-500">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Informações sobre Queda</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Paciente auditado apresentou queda durante internação?</Label>
                <RadioGroup
                  value={formData.apresentou_queda ? "sim" : "nao"}
                  onValueChange={(v) => setFormData(prev => ({ ...prev, apresentou_queda: v === "sim" }))}
                  className="flex gap-4"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="sim" id="queda-sim" />
                    <Label htmlFor="queda-sim">Sim</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="nao" id="queda-nao" />
                    <Label htmlFor="queda-nao">Não</Label>
                  </div>
                </RadioGroup>
              </div>
              {formData.apresentou_queda && (
                <div className="space-y-2">
                  <Label>Foi aberto notificação de incidentes?</Label>
                  <RadioGroup
                    value={formData.notificacao_aberta}
                    onValueChange={(v) => setFormData(prev => ({ ...prev, notificacao_aberta: v }))}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="notif-sim" />
                      <Label htmlFor="notif-sim">Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="notif-nao" />
                      <Label htmlFor="notif-nao">Não</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao_aplica" id="notif-na" />
                      <Label htmlFor="notif-na">Não se aplica</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Satisfação geral for avaliação prontuários */}
        {tipoSelecionado === "avaliacao_prontuarios_enfermeiros" && (
          <Card className="border-l-4 border-l-blue-500">
            <CardHeader className="py-3">
              <CardTitle className="text-base">Satisfação Geral</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label>No geral, qual é o seu nível de satisfação com a qualidade das informações deste prontuário? (1-10)</Label>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-muted-foreground">Extremamente insatisfeito</span>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    value={formData.satisfacao_geral}
                    onChange={(e) => setFormData(prev => ({ ...prev, satisfacao_geral: parseInt(e.target.value) }))}
                    className="flex-1"
                  />
                  <span className="text-sm text-muted-foreground">Extremamente satisfeito</span>
                  <Badge variant="outline" className="ml-2">{formData.satisfacao_geral}</Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Observações */}
        <div>
          <Label>Observações, não conformidades ou ações de melhoria</Label>
          <Textarea
            value={formData.observacoes}
            onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
            placeholder="Registre suas observações..."
            rows={4}
          />
        </div>
      </div>
    );
  };

  if (isLoading) {
    return <LoadingState message="Carregando auditorias..." />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <SearchInput
          value={searchTerm}
          onChange={setSearchTerm}
          placeholder="Buscar..."
          className="w-[250px]"
        />
        <Select value={tipoFilter} onValueChange={(v) => setTipoFilter(v as TipoAuditoria | "todos")}>
          <SelectTrigger className="w-[280px]">
            <SelectValue placeholder="Tipo de auditoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos os tipos</SelectItem>
            {activeTipos.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="ml-auto flex gap-2">
          <ExportDropdown onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
          <Button onClick={() => setNovaAuditoriaDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Auditoria
          </Button>
        </div>
      </div>

      {filteredAuditorias.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="Nenhuma auditoria encontrada"
          description="Registre auditorias de segurança do paciente"
          action={{ label: "Nova Auditoria", onClick: () => setNovaAuditoriaDialog(true) }}
        />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Conformidade</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAuditorias.map(a => {
                  const stats = getConformidadeStats(a);
                  const percentNum = parseFloat(stats.percentual);
                  return (
                    <TableRow key={a.id}>
                      <TableCell>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {activeTipos.find(t => t.value === a.tipo)?.label || a.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell>{format(new Date(a.data_auditoria), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{a.setor}</TableCell>
                      <TableCell>{a.auditor_nome}</TableCell>
                      <TableCell>{a.paciente_iniciais || "-"}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${percentNum >= 80 ? 'bg-green-500' : percentNum >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${stats.percentual}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{stats.percentual}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="icon" variant="ghost" onClick={() => handleEdit(a)} title="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={() => {
                          setSelectedAuditoria(a);
                          setDetalhesDialog(true);
                        }} title="Visualizar">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Nova Auditoria Dialog */}
      <Dialog open={novaAuditoriaDialog} onOpenChange={(open) => {
        setNovaAuditoriaDialog(open);
        if (!open) { setTipoSelecionado(null); setEditingAuditoriaId(null); }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {tipoSelecionado 
                ? (editingAuditoriaId ? "Editar — " : "") + (activeTipos.find(t => t.value === tipoSelecionado)?.label || "")
                : "Nova Auditoria de Segurança do Paciente"
              }
            </DialogTitle>
            <DialogDescription>
              {tipoSelecionado 
                ? "Preencha todos os campos do formulário de auditoria"
                : "Selecione o tipo de auditoria que deseja realizar"
              }
            </DialogDescription>
          </DialogHeader>

          {!tipoSelecionado ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
              {activeTipos.map(tipo => (
                <Card 
                  key={tipo.value} 
                  className="cursor-pointer hover:border-primary transition-colors"
                  onClick={() => handleSelectTipo(tipo.value as TipoAuditoria)}
                >
                  <CardContent className="flex items-center gap-4 py-4">
                    <div className="p-3 rounded-lg bg-primary/10">
                      <tipo.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-medium">{tipo.label}</h4>
                      <p className="text-sm text-muted-foreground">
                        {(activeChecklist[tipo.value as TipoAuditoria] || []).reduce((acc: number, s: any) => acc + s.items.length, 0)} itens
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <>
              {renderFormFields()}
              <DialogFooter className="mt-4">
                <Button variant="outline" onClick={() => setTipoSelecionado(null)}>
                  Voltar
                </Button>
                <Button onClick={handleSubmit} disabled={isSubmitting}>
                  {isSubmitting ? "Salvando..." : editingAuditoriaId ? "Atualizar Auditoria" : "Salvar Auditoria"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Detalhes Dialog */}
      <Dialog open={detalhesDialog} onOpenChange={setDetalhesDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Detalhes da Auditoria
            </DialogTitle>
          </DialogHeader>
          {selectedAuditoria && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-muted-foreground">Tipo</Label>
                  <p className="font-medium">{activeTipos.find(t => t.value === selectedAuditoria.tipo)?.label}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Data</Label>
                  <p className="font-medium">{format(new Date(selectedAuditoria.data_auditoria), "dd/MM/yyyy")}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Setor</Label>
                  <p className="font-medium">{selectedAuditoria.setor}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground">Auditor</Label>
                  <p className="font-medium">{selectedAuditoria.auditor_nome}</p>
                </div>
                {selectedAuditoria.paciente_iniciais && (
                  <div>
                    <Label className="text-muted-foreground">Paciente</Label>
                    <p className="font-medium">{selectedAuditoria.paciente_iniciais}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Respostas do Checklist</h4>
                <div className="space-y-2">
                  {Object.entries(selectedAuditoria.respostas as Record<string, string>).map(([key, value]) => {
                    const allItems = (activeChecklist[selectedAuditoria.tipo] || checklistItems[selectedAuditoria.tipo] || []).flatMap((s: any) => s.items) || [];
                    const item = allItems.find(i => i.id === key);
                    const displayValue = value === "conforme" ? "Conforme" :
                      value === "nao_conforme" ? "Não Conforme" :
                      value === "nao_aplica" ? "Não se aplica" :
                      value === "sim" ? "Sim" :
                      value === "nao" ? "Não" :
                      likertLabels[value] || value;
                    
                    return (
                      <div key={key} className="flex items-start justify-between py-2 border-b last:border-0">
                        <span className="text-sm flex-1 pr-4">{item?.label || key}</span>
                        <Badge 
                          variant={value === "conforme" || value === "sim" || value === "sim_completo" ? "default" : 
                            value === "nao_conforme" || value === "nao" ? "destructive" : "secondary"}
                          className="shrink-0"
                        >
                          {displayValue}
                        </Badge>
                      </div>
                    );
                  })}
                </div>
              </div>

              {selectedAuditoria.observacoes && (
                <div className="border-t pt-4">
                  <Label className="text-muted-foreground">Observações</Label>
                  <p className="mt-1 text-sm">{selectedAuditoria.observacoes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuditoriasSegurancaPaciente;
