import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { FileText, ExternalLink, Download, CheckCircle2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import jsPDF from 'jspdf';

const GOOGLE_FORM_ID = '1FAIpQLSdkqNeQ1sU3waoPYsGi8dXDMiXZSQ38wwj35QPJFuvGufclJw';

// Meses disponíveis
const MESES = [
  'Janeiro/2026', 'Fevereiro/2026', 'Março/2026', 'Abril/2026',
  'Maio/2026', 'Junho/2026', 'Julho/2026', 'Agosto/2026',
  'Setembro/2026', 'Outubro/2026', 'Novembro/2026', 'Dezembro/2026',
];

// Unidades de Saúde do Google Forms
const UNIDADES_SAUDE = [
  'CAPS "Doca"', 'CAPS - Álcool e Drogas', 'CAPSi',
  'CRAM - Centro de Referência de Atendimento à Mulher',
  'Equipes de Atenção Primária Prisional (EAPP)', 'Equipe eMulti',
  'ESF Adão Pinto da Fonseca', 'ESF Antônio Ferreira',
  'ESF Antônio Moreira (Capão / Laressa Gabriela)', 'ESF Arthur Azafe',
  'ESF Ary Moreira (Novaes / Areias)',
  'ESF Comunidades Rurais (Gamas / Moreiras / Ripas / Faz. Paraná)',
  'ESF Dimas Guimarães', 'ESF Francisco Azevedo', 'ESF Frei Paulo',
  'ESF Jeferson Batista', 'ESF José Emídio', 'ESF José Eustáquio',
  'ESF José Geraldo Rezende (Ladinho)', 'ESF Julieta Luiza (Boa Vista / Barretos)',
  'ESF Maria Beatriz Lucas (B: Amaral)', 'ESF Maria de Lourdes F. Costa (B: Santa Sara)',
  'ESF Maria dos Anjos', 'ESF Maria dos Reis Braga (B: Belvedere)',
  'ESF Maria Luíza', 'ESF Maria Lusia de Oliveira (B: Araguaia)',
  'ESF Marisa', 'ESF Novo Horizonte', 'ESF Ordália Almeida',
  'ESF Santa Luzia', 'ESF São Geraldo', 'ESF São Sebastião',
  'Policlínica Municipal', 'Hospital São José',
  'ILPI - Lar Vicentino Padre Lauro', 'Saúde da Mulher',
  'Serviço Atenção Domiciliar (SAD)', 'Serviço de Saúde Privado',
  'Unidade Pronto Atendimento - UPA 24h',
];

const SEXOS = ['Masculino', 'Feminino'];

const FAIXAS_ETARIAS = [
  'Menor de 5 anos', '6 a 10 anos', '11 a 14 anos', '15 a 19 anos',
  '20 a 29 anos', '30 a 39 anos', '40 a 49 anos', '50 a 59 anos', '60 anos ou mais',
];

const DOENCAS_AGRAVOS = [
  'Acidente de Trabalho com Exposição Material Biológico',
  'Acidente de Trabalho - GERAL', 'Acidente por Animais Peçonhentos',
  'Atendimento Antirrábico', 'Chikungunya', 'Conjuntivite', 'Covid-19',
  'Coqueluche', 'Esquistossomose', 'Hanseníase', 'Hepatite aguda B',
  'Hepatite aguda C', 'Hepatite viral crônica', 'HIV', 'HIV - Gestante',
  'HIV - Criança menor de 5 anos', 'Intoxicação Exógena',
  'IST - Condiloma', 'IST - Displasia do colo uterino moderada (NIC II), acentuada (NIC III) e carcinoma in situ',
  'IST - Síndrome do corrimento cervical', 'IST - Síndrome do corrimento uretral masculino',
  'IST - Síndrome do corrimento vaginal', 'IST - Síndrome do desconforto ou dor pélvica na mulher',
  'IST - Síndrome úlcera genital feminino', 'Leishmaniose Tegumentar Americana',
  'Meningite', 'Sífilis adquirida', 'Sífilis congênita', 'Sífilis gestante',
  'Síndrome de Guillain-Barré', 'Síndrome úlcera genital masculino',
  'SRAG (Internado ou Óbito)', 'Toxoplasmose', 'Tuberculose', 'Varicela',
  'Violência Interpessoal/Autoprovocada', 'Zika Vírus',
];

// Entry IDs do Google Forms (precisam ser verificados/atualizados)
// Para encontrar: abra o Google Form → Inspecionar elemento → procure por "entry."
const ENTRY_IDS = {
  mes: 'entry.PLACEHOLDER_MES',
  unidade: 'entry.PLACEHOLDER_UNIDADE',
  paciente: 'entry.PLACEHOLDER_PACIENTE',
  sexo: 'entry.PLACEHOLDER_SEXO',
  faixa_etaria: 'entry.PLACEHOLDER_FAIXA',
  doenca: 'entry.PLACEHOLDER_DOENCA',
};

interface Props {
  userId: string;
  userName: string;
}

interface FormData {
  mes_preenchimento: string;
  unidade_saude: string;
  paciente_nome: string;
  sexo: string;
  faixa_etaria: string;
  doenca_agravo: string;
}

function gerarPDFComprovante(form: FormData, userName: string, numero: string): void {
  const doc = new jsPDF();
  const now = new Date();

  // Header
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text('COMPROVANTE DE NOTIFICAÇÃO COMPULSÓRIA', 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Portaria de Consolidação N°4/2017 | Res. SES MG N° 8.846/2023', 105, 28, { align: 'center' });

  // Linha separadora
  doc.setLineWidth(0.5);
  doc.line(15, 33, 195, 33);

  // Dados do registro
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Dados do Registro', 15, 42);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const fields = [
    ['Nº Notificação:', numero],
    ['Data/Hora do Envio:', format(now, "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })],
    ['Registrado por:', userName],
    ['Mês de Preenchimento:', form.mes_preenchimento],
    ['Unidade de Saúde:', form.unidade_saude],
    ['Nome do Paciente:', form.paciente_nome],
    ['Sexo Biológico:', form.sexo],
    ['Faixa Etária:', form.faixa_etaria],
    ['Doença/Agravo:', form.doenca_agravo],
  ];

  let y = 50;
  fields.forEach(([label, value]) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label, 15, y);
    doc.setFont('helvetica', 'normal');
    doc.text(value || '-', 70, y);
    y += 8;
  });

  // Status
  y += 5;
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  y += 10;

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('Status do Envio', 15, y);
  y += 8;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('✅ Dados salvos no sistema GEstratégic com sucesso.', 15, y);
  y += 7;
  doc.text('⚠️ Formulário pré-preenchido do Google Forms aberto para confirmação manual.', 15, y);
  y += 7;
  doc.text('📋 Este documento serve como evidência para auditoria ONA/LGPD.', 15, y);

  // Rodapé
  y += 20;
  doc.setLineWidth(0.3);
  doc.line(15, y, 195, y);
  y += 8;
  doc.setFontSize(8);
  doc.setTextColor(100);
  doc.text(`Documento gerado automaticamente pelo GEstratégic em ${format(now, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 105, y, { align: 'center' });
  doc.text('Este comprovante é parte do processo de notificação compulsória e deve ser arquivado.', 105, y + 5, { align: 'center' });

  doc.save(`comprovante-notificacao-${numero}.pdf`);
}

function gerarLinkPrePreenchido(form: FormData): string {
  const params = new URLSearchParams();
  // Nota: os entry IDs precisam ser configurados corretamente
  // Formato: https://docs.google.com/forms/d/e/FORM_ID/viewform?usp=pp_url&entry.XXX=valor
  Object.entries(ENTRY_IDS).forEach(([key, entryId]) => {
    const value = key === 'mes' ? form.mes_preenchimento
      : key === 'unidade' ? form.unidade_saude
      : key === 'paciente' ? form.paciente_nome
      : key === 'sexo' ? form.sexo
      : key === 'faixa_etaria' ? form.faixa_etaria
      : key === 'doenca' ? form.doenca_agravo : '';
    if (value) params.append(entryId, value);
  });
  return `https://docs.google.com/forms/d/e/${GOOGLE_FORM_ID}/viewform?usp=pp_url&${params.toString()}`;
}

export function NotificacaoCompulsoriaPrefeitura({ userId, userName }: Props) {
  const queryClient = useQueryClient();
  const [enviado, setEnviado] = useState(false);
  const [ultimoNumero, setUltimoNumero] = useState('');
  const [form, setForm] = useState<FormData>({
    mes_preenchimento: '',
    unidade_saude: 'Unidade Pronto Atendimento - UPA 24h',
    paciente_nome: '',
    sexo: '',
    faixa_etaria: '',
    doenca_agravo: '',
  });

  const submitMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const now = new Date();
      const numero = `EPI-${now.getFullYear()}-${String(Date.now()).slice(-5)}`;

      const descricao = `Notificação Compulsória Prefeitura | Sexo: ${data.sexo} | Faixa: ${data.faixa_etaria} | Mês: ${data.mes_preenchimento} | Unidade: ${data.unidade_saude}`;

      // Salvar no banco
      const { error } = await supabase.from('sciras_notificacoes_epidemiologicas').insert({
        numero_notificacao: 'temp',
        tipo: 'doenca_compulsoria',
        doenca_agravo: data.doenca_agravo,
        paciente_nome: data.paciente_nome || null,
        setor: data.unidade_saude,
        descricao,
        notificador_id: userId,
        notificador_nome: userName,
        status: 'aberta',
        notificado_vigilancia_municipal: true,
        notificado_anvisa: false,
      });
      if (error) throw error;

      // Registrar log de auditoria
      await supabase.from('logs_acesso').insert({
        user_id: userId,
        user_name: userName,
        action: 'NOTIFICACAO_COMPULSORIA_PREFEITURA',
        module: 'SCIH',
        target_record: numero,
        details: JSON.stringify({
          doenca_agravo: data.doenca_agravo,
          paciente_nome: data.paciente_nome,
          unidade_saude: data.unidade_saude,
          timestamp: now.toISOString(),
          google_forms_preenchido: true,
        }),
      });

      return numero;
    },
    onSuccess: (numero) => {
      queryClient.invalidateQueries({ queryKey: ['sciras-notificacoes-epi'] });
      setUltimoNumero(numero);
      setEnviado(true);

      // Gerar PDF
      gerarPDFComprovante(form, userName, numero);

      // Abrir Google Forms pré-preenchido
      const link = gerarLinkPrePreenchido(form);
      window.open(link, '_blank');

      toast.success('Notificação salva! Google Forms aberto para confirmação.');
    },
    onError: (err: any) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.mes_preenchimento || !form.unidade_saude || !form.paciente_nome || !form.sexo || !form.faixa_etaria || !form.doenca_agravo) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    submitMutation.mutate(form);
  };

  const resetForm = () => {
    setEnviado(false);
    setUltimoNumero('');
    setForm({
      mes_preenchimento: '',
      unidade_saude: 'Unidade Pronto Atendimento - UPA 24h',
      paciente_nome: '',
      sexo: '',
      faixa_etaria: '',
      doenca_agravo: '',
    });
  };

  if (enviado) {
    return (
      <Card className="border-success/30 bg-success/5">
        <CardContent className="p-6 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
          <h3 className="text-lg font-bold text-foreground">Notificação Registrada!</h3>
          <p className="text-sm text-muted-foreground">
            Nº <span className="font-mono font-bold">{ultimoNumero}</span>
          </p>
          <div className="flex flex-col gap-2 items-center">
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-success" /> Dados salvos no sistema
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <CheckCircle2 className="h-4 w-4 text-success" /> PDF comprovante baixado
            </p>
            <p className="text-sm text-muted-foreground flex items-center gap-1">
              <ExternalLink className="h-4 w-4 text-primary" /> Google Forms aberto para confirmação
            </p>
          </div>
          <div className="flex gap-2 justify-center pt-2">
            <Button variant="outline" onClick={() => {
              gerarPDFComprovante(form, userName, ultimoNumero);
            }}>
              <Download className="h-4 w-4 mr-2" /> Baixar PDF novamente
            </Button>
            <Button onClick={resetForm}>Nova Notificação</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Notificação Compulsória — Prefeitura
        </CardTitle>
        <CardDescription>
          Preencha aqui e o sistema salvará os dados + abrirá o Google Forms da Prefeitura pré-preenchido para envio.
          Um PDF comprovante será gerado automaticamente como evidência.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês de Preenchimento *</Label>
              <Select value={form.mes_preenchimento} onValueChange={v => setForm(p => ({ ...p, mes_preenchimento: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione o mês" /></SelectTrigger>
                <SelectContent>
                  {MESES.map(m => <SelectItem key={m} value={m}>{m}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Unidade de Saúde *</Label>
              <Select value={form.unidade_saude} onValueChange={v => setForm(p => ({ ...p, unidade_saude: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {UNIDADES_SAUDE.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Nome Completo do Paciente *</Label>
              <Input
                value={form.paciente_nome}
                onChange={e => setForm(p => ({ ...p, paciente_nome: e.target.value }))}
                placeholder="Nome do paciente"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label>Sexo Biológico *</Label>
              <Select value={form.sexo} onValueChange={v => setForm(p => ({ ...p, sexo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {SEXOS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Faixa Etária *</Label>
              <Select value={form.faixa_etaria} onValueChange={v => setForm(p => ({ ...p, faixa_etaria: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {FAIXAS_ETARIAS.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Agravo/Doença *</Label>
              <Select value={form.doenca_agravo} onValueChange={v => setForm(p => ({ ...p, doenca_agravo: v }))}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {DOENCAS_AGRAVOS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 mt-0.5 text-warning shrink-0" />
            <span>
              Ao enviar, o sistema salvará os dados internamente, gerará um PDF comprovante e abrirá o 
              Google Forms da Prefeitura já preenchido em uma nova aba. Você precisará apenas clicar 
              <strong> "Enviar"</strong> no Google Forms.
            </span>
          </div>

          <Button type="submit" disabled={submitMutation.isPending} className="w-full">
            {submitMutation.isPending ? 'Processando...' : '📋 Salvar e Abrir Google Forms'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
