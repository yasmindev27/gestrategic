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
import { Plus, Eye, Pencil, FileText, ClipboardList, CheckCircle, XCircle, MinusCircle, Stethoscope, Download } from "lucide-react";
import { SectionHeader, ActionButton } from "@/components/ui/action-buttons";
import { SearchInput } from "@/components/ui/search-input";
import { LoadingState } from "@/components/ui/loading-state";
import { EmptyState } from "@/components/ui/empty-state";
import { ExportDropdown } from "@/components/ui/export-dropdown";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// Types
type TipoAuditoria = "seguranca_paciente";

interface AuditoriaSeguranca {
  id: string;
  tipo: string;
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

// Sector options
const setoresOpcoes = [
  "Enfermaria Masculina",
  "Enfermaria Feminina",
  "Enfermaria Pediátrica",
  "Isolamento",
  "Urgência",
  "Medicação",
  "Recepção",
  "Classificação 1",
  "Classificação 2",
  "Sutura",
  "Consultórios Médicos",
  "Laboratório",
  "Raio-x",
];

// Unified checklist: 6 International Patient Safety Goals
const checklistUnificado: { section: string; items: { id: string; label: string; options: string[] }[] }[] = [
  {
    section: "Meta 1 – Identificação Correta do Paciente",
    items: [
      { id: "m1_pulseira_legivel", label: "Paciente com pulseira de identificação legível?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_pulseira_dados", label: "Pulseira contém nome completo, data de nascimento e nome da mãe?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_orientado_importancia", label: "Paciente orientado quanto à importância da identificação?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_documentos_identificados", label: "Documentos de prontuário estão identificados corretamente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_identificado_beira_leito", label: "Paciente identificado à beira do leito contendo nome completo e data de nascimento?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_conferencia_procedimentos", label: "Colaboradores conferem as informações antes de procedimentos?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_paciente_declara", label: "Paciente declara o nome completo e data de nascimento antes de procedimentos?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_conhece_protocolo", label: "Conhece o protocolo institucional?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_dois_identificadores", label: "Conhece os dois identificadores obrigatórios?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_nome_social", label: "Conhece sobre nome social?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_homonimos", label: "Conhece fluxo sobre pacientes homônimos?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_desconhecido", label: "Conhece sobre paciente desconhecido?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_confere_antes", label: "Confere as informações antes de procedimentos?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m1_acesso_protocolo", label: "Possui fácil acesso ao protocolo?", options: ["conforme", "nao_conforme", "nao_aplica"] },
    ],
  },
  {
    section: "Meta 2 – Segurança da Cadeia Medicamentosa",
    items: [
      { id: "m2_conhece_alta_vigilancia", label: "Profissional conhece a relação de medicamentos de alta vigilância?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m2_relacao_disponivel", label: "A relação está disponível na unidade em local de fácil acesso?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m2_dupla_checagem_admin", label: "Na administração de medicamentos de alta vigilância é realizada a dupla checagem?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m2_dupla_checagem_dispensa", label: "Na dispensação do medicamento de alta vigilância é realizada a dupla checagem?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m2_armazenados_seguranca", label: "Os medicamentos de alta vigilância são armazenados com segurança?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m2_etiqueta_vermelha", label: "Os medicamentos de alta vigilância estão identificados com etiqueta vermelha?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m2_treze_certos", label: "Conhece os 13 certos?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m2_metodo_identificacao", label: "Conhece o método de identificação dos medicamentos de alta vigilância?", options: ["conforme", "nao_conforme", "nao_aplica"] },
    ],
  },
  {
    section: "Meta 3 – Prevenção de Lesão por Pressão",
    items: [
      { id: "m3_risco_lpp_admissao", label: "Avaliado o risco de LPP na admissão do paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_fatores_risco_beira_leito", label: "Paciente com fatores de risco de LPP identificados à beira leito?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_fatores_risco_prontuario", label: "Pacientes com fatores de risco de LPP identificados em Prontuário?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_ferramenta_braden", label: "Foi utilizado ferramenta estruturada (Braden Adulto/BradenQ) para classificação de risco?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_prescricao_enfermagem_risco", label: "Prescrição de enfermagem de acordo com o risco do paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_reavaliacao_risco", label: "Enfermeiro realiza reavaliação do risco conforme score?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_mudanca_decubito", label: "Mudança de decúbito conforme o risco do paciente (4/4h leve/moderado; 2/2h alto/muito alto)?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_uso_coxins", label: "Paciente possui uso de coxins para proteção de proeminências ósseas?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_educacao_mobilidade", label: "Paciente ou familiares foram educados para otimização da mobilidade?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_colab_notifica", label: "Conhece e/ou notifica os casos de Lesão de Pressão da unidade?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_colab_educacao", label: "Colaborador realiza educação com o paciente e familiares?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_colab_barreiras", label: "Colaborador conhece as barreiras de prevenção?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m3_colab_registro_pele", label: "Registra no prontuário as condições da pele do paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
    ],
  },
  {
    section: "Meta 4 – Comunicação Efetiva",
    items: [
      { id: "m4_lab_valor_critico", label: "O laboratório comunicou o setor do resultado de valor crítico e registrou em sua planilha?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m4_registro_priorizacao_rx", label: "Foi realizado o registro de comunicação de priorização de análise médica do raio-x?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m4_registro_valor_critico_lab", label: "Foi registrado o resultado de valor crítico do exame laboratorial no prontuário?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m4_registro_alteracao_rx", label: "Foi registrado a alteração crítica do exame de raio-x?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m4_conhece_receptor_critico", label: "O colaborador sabe quem pode receber o resultado de valor crítico e a comunicação de priorização?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m4_transferencia_interna", label: "Foi realizado o preenchimento completo e correto do formulário de transferência interna?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m4_transferencia_externa", label: "Foi realizado o preenchimento completo e correto do formulário de transferência externa?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m4_sbar_internacao", label: "As transferências de cuidados são realizadas pelo método SBAR no setor de internação (12/12h)?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m4_sbar_urgencia", label: "As transferências de cuidados são realizadas pelo método SBAR no setor de urgência (12/12h)?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m4_siglario", label: "Os profissionais seguem o siglário institucional, utilizando apenas siglas padronizadas?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m4_caderno_passagem_plantao", label: "O corpo clínico utiliza o caderno institucional para passagem de plantão de pacientes não internados?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m4_conhece_protocolo", label: "Há evidências de que o profissional conhece e executa as diretrizes do Protocolo de Comunicação Efetiva?", options: ["conforme", "nao_conforme"] },
    ],
  },
  {
    section: "Meta 5 – Higiene das Mãos",
    items: [
      { id: "m5_antes_contato", label: "Colaborador realiza a higienização das mãos antes do contato com o paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m5_antes_procedimento", label: "Colaborador realiza a higienização das mãos antes de procedimento asséptico?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m5_apos_fluidos", label: "Colaborador realiza a higienização das mãos após risco de exposição a fluidos corporais?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m5_apos_contato", label: "Colaborador realiza a higienização das mãos após contato com o paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m5_apos_areas_proximas", label: "Colaborador realiza a higienização das mãos após contato com áreas próximas ao paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m5_educacao_paciente", label: "Pacientes foram educados sobre a importância da higienização das mãos?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m5_sem_adornos", label: "Profissional não está utilizando adornos que comprometem a higienização (anéis, relógios, pulseiras)?", options: ["conforme", "nao_conforme", "nao_aplica"] },
    ],
  },
  {
    section: "Meta 6 – Prevenção de Queda",
    items: [
      { id: "m6_risco_queda_admissao", label: "Paciente com risco de Queda identificado na admissão (pulseira preta)?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m6_risco_queda_beira_leito", label: "Paciente com Risco de Queda identificado à beira leito?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m6_risco_queda_prontuario", label: "Pacientes com Risco de Queda identificados em Prontuário?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m6_ferramenta_morse", label: "Foi utilizado ferramenta estruturada (Morse/Humpty Dumpty) para classificação de risco?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m6_prescricao_enfermagem", label: "Prescrição de enfermagem de acordo com o risco do paciente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m6_reavaliacao_diaria", label: "Enfermeiro realiza reavaliação do Risco diariamente?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m6_grades_cama", label: "As camas possuem grades de proteção nas laterais com rodízios com trava?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m6_educacao_risco", label: "Paciente ou familiares foram educados quanto ao risco e barreiras de prevenção?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m6_registro_cuidados", label: "Existe registro em prontuário dos cuidados e orientações realizadas?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m6_campainha_funcionando", label: "Leito do paciente possui campainha ao alcance do paciente e funcionando?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m6_colab_notifica", label: "Conhece e/ou notifica os casos de Queda da unidade?", options: ["conforme", "nao_conforme", "nao_aplica"] },
      { id: "m6_colab_barreiras", label: "Colaborador conhece as barreiras de prevenção de queda?", options: ["conforme", "nao_conforme", "nao_aplica"] },
    ],
  },
];

// Score options for risk
const scoreRiscoQueda = [
  { value: "sem_risco_adulto", label: "Sem Risco (0 - 24 pontos) adulto" },
  { value: "baixo_risco_adulto", label: "Baixo Risco (25 - 50 pontos) adulto" },
  { value: "alto_risco_adulto", label: "Alto Risco (≥51 pontos) adulto" },
  { value: "baixo_risco_pediatrico", label: "Baixo Risco (7 a 11 pontos) pediátrico" },
  { value: "alto_risco_pediatrico", label: "Alto Risco (12 a 22 pontos) pediátrico" },
];

// Score options for Braden (LPP)
const scoreRiscoBraden = [
  { value: "sem_risco_braden", label: "Sem Risco (≥19 pontos) - Braden Adulto" },
  { value: "baixo_risco_braden", label: "Baixo Risco (15 a 18 pontos) - Braden Adulto" },
  { value: "moderado_risco_braden", label: "Risco Moderado (13 a 14 pontos) - Braden Adulto" },
  { value: "alto_risco_braden", label: "Alto Risco (10 a 12 pontos) - Braden Adulto" },
  { value: "muito_alto_risco_braden", label: "Muito Alto Risco (≤9 pontos) - Braden Adulto" },
  { value: "sem_risco_bradenq", label: "Sem Risco (≥25 pontos) - BradenQ Pediátrico" },
  { value: "baixo_risco_bradenq", label: "Baixo Risco (21 a 24 pontos) - BradenQ Pediátrico" },
  { value: "moderado_risco_bradenq", label: "Risco Moderado (17 a 20 pontos) - BradenQ Pediátrico" },
  { value: "alto_risco_bradenq", label: "Alto Risco (≤16 pontos) - BradenQ Pediátrico" },
];

// LPP grades
const grausLPP = [
  { value: "grau_1", label: "Grau I" },
  { value: "grau_2", label: "Grau II" },
  { value: "grau_3", label: "Grau III" },
  { value: "grau_4", label: "Grau IV" },
  { value: "nao_aplica", label: "Não se aplica" },
];

// Professional types
const profissionaisAuditados = [
  { value: "auxiliar_tecnico", label: "Auxiliar/Técnico de Enfermagem" },
  { value: "enfermeiro", label: "Enfermeiro" },
  { value: "medico", label: "Médico" },
  { value: "outro", label: "Outro" },
];

interface Props {
  currentUser: { id: string; nome: string };
}

export const AuditoriasSegurancaPaciente = ({ currentUser }: Props) => {
  const { toast } = useToast();
  const [auditorias, setAuditorias] = useState<AuditoriaSeguranca[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Dialog states
  const [novaAuditoriaDialog, setNovaAuditoriaDialog] = useState(false);
  const [detalhesDialog, setDetalhesDialog] = useState(false);
  const [selectedAuditoria, setSelectedAuditoria] = useState<AuditoriaSeguranca | null>(null);
  const [editingAuditoriaId, setEditingAuditoriaId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    data_auditoria: format(new Date(), "yyyy-MM-dd"),
    setor: "",
    paciente_iniciais: "",
    paciente_ra: "",
    numero_prontuario: "",
    score_risco: "",
    score_risco_braden: "",
    possui_lpp: false,
    grau_lpp: "",
    apresentou_queda: false,
    notificacao_aberta: "",
    profissional_auditado: "",
    observacoes: "",
  });
  const [respostas, setRespostas] = useState<Record<string, string>>({});

  useEffect(() => {
    loadAuditorias();
  }, []);

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

  const resetForm = () => {
    setRespostas({});
    setFormData({
      data_auditoria: format(new Date(), "yyyy-MM-dd"),
      setor: "",
      paciente_iniciais: "",
      paciente_ra: "",
      numero_prontuario: "",
      score_risco: "",
      score_risco_braden: "",
      possui_lpp: false,
      grau_lpp: "",
      apresentou_queda: false,
      notificacao_aberta: "",
      profissional_auditado: "",
      observacoes: "",
    });
  };

  const handleRespostaChange = (itemId: string, value: string) => {
    setRespostas(prev => ({ ...prev, [itemId]: value }));
  };

  const handleEdit = (auditoria: AuditoriaSeguranca) => {
    setEditingAuditoriaId(auditoria.id);
    setFormData({
      data_auditoria: auditoria.data_auditoria,
      setor: auditoria.setor,
      paciente_iniciais: auditoria.paciente_iniciais || "",
      paciente_ra: auditoria.paciente_ra || "",
      numero_prontuario: auditoria.numero_prontuario || "",
      score_risco: auditoria.score_risco || "",
      score_risco_braden: (auditoria.respostas as any)?.score_risco_braden || "",
      possui_lpp: auditoria.possui_lpp || false,
      grau_lpp: auditoria.grau_lpp || "",
      apresentou_queda: auditoria.apresentou_queda || false,
      notificacao_aberta: auditoria.notificacao_aberta || "",
      profissional_auditado: auditoria.profissional_auditado || "",
      observacoes: auditoria.observacoes || "",
    });
    setRespostas(auditoria.respostas as Record<string, string>);
    setNovaAuditoriaDialog(true);
  };

  const handleSubmit = async () => {
    if (!formData.setor || !formData.data_auditoria) {
      toast({ title: "Erro", description: "Preencha os campos obrigatórios (Data e Setor)", variant: "destructive" });
      return;
    }

    if (!formData.paciente_iniciais || !formData.paciente_ra || !formData.numero_prontuario) {
      toast({ title: "Erro", description: "Preencha os dados do paciente (Iniciais, RA e Nº Prontuário)", variant: "destructive" });
      return;
    }

    // Check if all checklist items are answered
    const allItems = checklistUnificado.flatMap(section => section.items);
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
      tipo: "seguranca_paciente",
      data_auditoria: formData.data_auditoria,
      setor: formData.setor,
      auditor_id: currentUser.id,
      auditor_nome: currentUser.nome,
      paciente_iniciais: formData.paciente_iniciais || null,
      paciente_ra: formData.paciente_ra || null,
      numero_prontuario: formData.numero_prontuario || null,
      score_risco: formData.score_risco || null,
      possui_lpp: formData.possui_lpp,
      grau_lpp: formData.grau_lpp || null,
      apresentou_queda: formData.apresentou_queda,
      notificacao_aberta: formData.notificacao_aberta || null,
      profissional_auditado: formData.profissional_auditado || null,
      unidade_atendimento: formData.setor,
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
      setEditingAuditoriaId(null);
      resetForm();
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
    return matchSearch;
  });

  const exportToExcel = () => {
    const data = filteredAuditorias.map(a => {
      const stats = getConformidadeStats(a);
      return {
        Data: format(new Date(a.data_auditoria), "dd/MM/yyyy"),
        Setor: a.setor,
        Auditor: a.auditor_nome,
        "Paciente": a.paciente_iniciais || "-",
        "RA": a.paciente_ra || "-",
        "Nº Prontuário": a.numero_prontuario || "-",
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
      head: [["Data", "Setor", "Auditor", "Paciente", "Conformidade"]],
      body: filteredAuditorias.map(a => {
        const stats = getConformidadeStats(a);
        return [
          format(new Date(a.data_auditoria), "dd/MM/yyyy"),
          a.setor,
          a.auditor_nome,
          a.paciente_iniciais || "-",
          stats.percentual + "%",
        ];
      }),
      styles: { fontSize: 8 },
      margin: { bottom: 28 },
    });
    savePdfWithFooter(doc, 'Auditorias de Segurança do Paciente', `auditorias-seguranca-${format(new Date(), "yyyy-MM-dd")}`, logoImg);
  };

  const exportSingleAuditoriaPDF = async (auditoria: AuditoriaSeguranca) => {
    const { createStandardPdf, savePdfWithFooter } = await import('@/lib/export-utils');
    const tipoLabel = "Auditoria de Segurança do Paciente";
    const { doc, logoImg } = await createStandardPdf(tipoLabel);
    const stats = getConformidadeStats(auditoria);
    const pageWidth = doc.internal.pageSize.width;

    let y = 32;

    // Info header table
    const infoRows: string[][] = [
      ["Data da Auditoria", format(new Date(auditoria.data_auditoria), "dd/MM/yyyy")],
      ["Setor", auditoria.setor],
      ["Auditor", auditoria.auditor_nome],
    ];
    if (auditoria.paciente_iniciais) infoRows.push(["Paciente (Iniciais)", auditoria.paciente_iniciais]);
    if (auditoria.paciente_ra) infoRows.push(["RA do Paciente", auditoria.paciente_ra]);
    if (auditoria.numero_prontuario) infoRows.push(["Nº Prontuário", auditoria.numero_prontuario]);
    if (auditoria.score_risco) {
      const scoreLabel = scoreRiscoQueda.find(s => s.value === auditoria.score_risco)?.label || auditoria.score_risco;
      infoRows.push(["Score de Risco", scoreLabel]);
    }
    if (auditoria.profissional_auditado) {
      const profLabel = profissionaisAuditados.find(p => p.value === auditoria.profissional_auditado)?.label || auditoria.profissional_auditado;
      infoRows.push(["Profissional Auditado", profLabel]);
    }
    if (auditoria.unidade_atendimento) infoRows.push(["Unidade de Atendimento", auditoria.unidade_atendimento]);
    if (auditoria.possui_lpp) {
      infoRows.push(["Possui LPP?", "Sim"]);
      if (auditoria.grau_lpp) {
        const grauLabel = grausLPP.find(g => g.value === auditoria.grau_lpp)?.label || auditoria.grau_lpp;
        infoRows.push(["Grau LPP", grauLabel]);
      }
    }
    if (auditoria.apresentou_queda) {
      infoRows.push(["Apresentou Queda?", "Sim"]);
      if (auditoria.notificacao_aberta) {
        infoRows.push(["Notificação Aberta?", auditoria.notificacao_aberta === "sim" ? "Sim" : auditoria.notificacao_aberta === "nao" ? "Não" : "Não se aplica"]);
      }
    }
    infoRows.push(["Conformidade Geral", `${stats.percentual}% (${stats.conforme}/${stats.total})`]);

    autoTable(doc, {
      startY: y,
      body: infoRows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 55 } },
      margin: { bottom: 30 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;

    // Use unified checklist for new audits, or try to match old structure
    const sections = checklistUnificado;
    const resps = auditoria.respostas as Record<string, string>;

    for (const section of sections) {
      const sectionBody = section.items.map(item => {
        const val = resps[item.id] || "-";
        const displayValue = val === "conforme" ? "✓ Conforme" :
          val === "nao_conforme" ? "✗ Não Conforme" :
          val === "nao_aplica" ? "N/A" :
          val === "sim" ? "✓ Sim" :
          val === "nao" ? "✗ Não" : val;
        return [item.label, displayValue];
      });

      if (y > doc.internal.pageSize.height - 60) {
        doc.addPage();
        y = 32;
      }

      autoTable(doc, {
        startY: y,
        head: [[section.section, "Resposta"]],
        body: sectionBody,
        theme: 'striped',
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [30, 58, 95], fontSize: 9 },
        columnStyles: { 0: { cellWidth: 120 }, 1: { cellWidth: 50, halign: 'center' } },
        margin: { bottom: 30 },
      });
      y = (doc as any).lastAutoTable.finalY + 4;
    }

    // Observations
    if (auditoria.observacoes) {
      if (y > doc.internal.pageSize.height - 50) { doc.addPage(); y = 32; }
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text("Observações:", 14, y + 4);
      doc.setFont('helvetica', 'normal');
      const obsLines = doc.splitTextToSize(auditoria.observacoes, pageWidth - 28);
      doc.text(obsLines, 14, y + 10);
    }

    const fileName = `auditoria-seguranca_paciente-${auditoria.setor}-${format(new Date(auditoria.data_auditoria), "dd-MM-yyyy")}`;
    savePdfWithFooter(doc, tipoLabel, fileName, logoImg);
  };

  const renderFormFields = () => {
    return (
      <div className="space-y-6 max-h-[60vh] overflow-y-auto pr-2">
        {/* Top fields: Data + Setor */}
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
                <SelectValue placeholder="Selecione o setor" />
              </SelectTrigger>
              <SelectContent>
                {setoresOpcoes.map(s => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Patient fields */}
        <div className="grid grid-cols-3 gap-4">
          <div>
            <Label>Paciente (Iniciais) *</Label>
            <Input
              value={formData.paciente_iniciais}
              onChange={(e) => setFormData(prev => ({ ...prev, paciente_iniciais: e.target.value }))}
              placeholder="Ex: P.M.O"
            />
          </div>
          <div>
            <Label>RA do Paciente *</Label>
            <Input
              value={formData.paciente_ra}
              onChange={(e) => setFormData(prev => ({ ...prev, paciente_ra: e.target.value }))}
              placeholder="Número do RA"
            />
          </div>
          <div>
            <Label>Nº Prontuário *</Label>
            <Input
              value={formData.numero_prontuario}
              onChange={(e) => setFormData(prev => ({ ...prev, numero_prontuario: e.target.value }))}
              placeholder="Número do prontuário"
            />
          </div>
        </div>


        {/* Checklist sections - All 6 Metas */}
        {checklistUnificado.map((section, idx) => (
          <Card key={idx} className="border-l-4 border-l-primary">
            <CardHeader className="py-3">
              <CardTitle className="text-base">{section.section}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {section.section.includes("Meta 5") && (
                <div className="space-y-2">
                  <Label>Profissional Auditado</Label>
                  <Select value={formData.profissional_auditado} onValueChange={(v) => setFormData(prev => ({ ...prev, profissional_auditado: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o profissional" />
                    </SelectTrigger>
                    <SelectContent>
                      {profissionaisAuditados.map(p => (
                        <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              {section.section.includes("Meta 6") && (
                <div className="space-y-2">
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
                        opt === "nao_aplica" ? "Não se aplica" : opt;

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

        {/* LPP specific */}
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

        {/* Queda specific */}
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
          placeholder="Buscar por setor, auditor ou paciente..."
          className="w-[300px]"
        />
        <div className="ml-auto flex gap-2">
          <ExportDropdown onExportExcel={exportToExcel} onExportPDF={exportToPDF} />
          <Button onClick={() => { resetForm(); setNovaAuditoriaDialog(true); }}>
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
          action={{ label: "Nova Auditoria", onClick: () => { resetForm(); setNovaAuditoriaDialog(true); } }}
        />
      ) : (
        <Card>
          <CardContent className="pt-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Auditor</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>RA</TableHead>
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
                      <TableCell>{format(new Date(a.data_auditoria), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{a.setor}</TableCell>
                      <TableCell>{a.auditor_nome}</TableCell>
                      <TableCell>{a.paciente_iniciais || "-"}</TableCell>
                      <TableCell>{a.paciente_ra || "-"}</TableCell>
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
                        <Button size="icon" variant="ghost" onClick={() => exportSingleAuditoriaPDF(a)} title="Exportar PDF">
                          <Download className="h-4 w-4" />
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
        if (!open) { setEditingAuditoriaId(null); resetForm(); }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>
              {editingAuditoriaId ? "Editar Auditoria de Segurança do Paciente" : "Nova Auditoria de Segurança do Paciente"}
            </DialogTitle>
            <DialogDescription>
              Formulário unificado com as 6 Metas Internacionais de Segurança do Paciente
            </DialogDescription>
          </DialogHeader>

          {renderFormFields()}
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setNovaAuditoriaDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Salvando..." : editingAuditoriaId ? "Atualizar Auditoria" : "Salvar Auditoria"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Detalhes Dialog */}
      <Dialog open={detalhesDialog} onOpenChange={setDetalhesDialog}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes da Auditoria</DialogTitle>
          </DialogHeader>
          {selectedAuditoria && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
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
                {selectedAuditoria.paciente_ra && (
                  <div>
                    <Label className="text-muted-foreground">RA do Paciente</Label>
                    <p className="font-medium">{selectedAuditoria.paciente_ra}</p>
                  </div>
                )}
                {selectedAuditoria.numero_prontuario && (
                  <div>
                    <Label className="text-muted-foreground">Nº Prontuário</Label>
                    <p className="font-medium">{selectedAuditoria.numero_prontuario}</p>
                  </div>
                )}
                {selectedAuditoria.score_risco && (
                  <div>
                    <Label className="text-muted-foreground">Score de Risco</Label>
                    <p className="font-medium">{scoreRiscoQueda.find(s => s.value === selectedAuditoria.score_risco)?.label || selectedAuditoria.score_risco}</p>
                  </div>
                )}
                {selectedAuditoria.profissional_auditado && (
                  <div>
                    <Label className="text-muted-foreground">Profissional Auditado</Label>
                    <p className="font-medium">{profissionaisAuditados.find(p => p.value === selectedAuditoria.profissional_auditado)?.label || selectedAuditoria.profissional_auditado}</p>
                  </div>
                )}
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Respostas do Checklist</h4>
                {checklistUnificado.map((section, idx) => {
                  const resps = selectedAuditoria.respostas as Record<string, string>;
                  const sectionHasAnswers = section.items.some(item => resps[item.id]);
                  if (!sectionHasAnswers) return null;
                  
                  return (
                    <div key={idx} className="mb-4">
                      <h5 className="text-sm font-semibold text-primary mb-2">{section.section}</h5>
                      <div className="space-y-1">
                        {section.items.map(item => {
                          const value = resps[item.id];
                          if (!value) return null;
                          const displayValue = value === "conforme" ? "Conforme" :
                            value === "nao_conforme" ? "Não Conforme" :
                            value === "nao_aplica" ? "Não se aplica" : value;
                          
                          return (
                            <div key={item.id} className="flex items-start justify-between py-2 border-b last:border-0">
                              <span className="text-sm flex-1 pr-4">{item.label}</span>
                              <Badge 
                                variant={value === "conforme" ? "default" : 
                                  value === "nao_conforme" ? "destructive" : "secondary"}
                                className="shrink-0"
                              >
                                {displayValue}
                              </Badge>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
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
