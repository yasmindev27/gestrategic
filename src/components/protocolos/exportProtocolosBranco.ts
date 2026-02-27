import { createStandardPdf, savePdfWithFooter } from '@/lib/export-utils';
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, BorderStyle, AlignmentType, HeadingLevel } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

// ─── Helpers ────────────────────────────────────────────────────────────────

function pdfBlankRow(doc: any, y: number, label: string, width: number = 80): number {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text(label, 14, y);
  doc.setFont('helvetica', 'normal');
  doc.setDrawColor(180);
  doc.line(14 + doc.getTextWidth(label) + 2, y, 14 + width, y);
  return y + 7;
}

function pdfCheckboxRow(doc: any, y: number, items: string[], cols: number = 3): number {
  const colW = 60;
  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = 14 + col * colW;
    const cy = y + row * 6;
    doc.rect(x, cy - 3, 3, 3);
    doc.setFontSize(8);
    doc.text(item, x + 5, cy);
  });
  return y + Math.ceil(items.length / cols) * 6 + 2;
}

function pdfSectionTitle(doc: any, y: number, title: string): number {
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(title, 14, y);
  doc.setDrawColor(41, 128, 185);
  doc.setLineWidth(0.5);
  doc.line(14, y + 1, doc.internal.pageSize.width - 14, y + 1);
  doc.setLineWidth(0.2);
  return y + 8;
}

function checkNewPage(doc: any, y: number, needed: number = 40): number {
  if (y + needed > doc.internal.pageSize.height - 30) {
    doc.addPage();
    return 32;
  }
  return y;
}

// ─── Word helpers ───────────────────────────────────────────────────────────

function wordSection(title: string): Paragraph {
  return new Paragraph({
    text: title,
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 300, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: '2980b9' } },
  });
}

function wordField(label: string): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 20 }),
      new TextRun({ text: '______________________________', size: 20, color: '999999' }),
    ],
  });
}

function wordCheckboxList(items: string[]): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: items.flatMap((item, i) => [
      new TextRun({ text: `☐ ${item}`, size: 18 }),
      ...(i < items.length - 1 ? [new TextRun({ text: '   ', size: 18 })] : []),
    ]),
  });
}

// ─── Dor Torácica ───────────────────────────────────────────────────────────

export async function exportDorToracicaPDF() {
  const title = 'Protocolo Dor Torácica — Formulário em Branco';
  const { doc, logoImg } = await createStandardPdf(title);
  let y = 36;

  y = pdfSectionTitle(doc, y, 'Identificação');
  y = pdfBlankRow(doc, y, 'Competência:');
  y = pdfBlankRow(doc, y, 'Nº Prontuário:');
  y = pdfBlankRow(doc, y, 'Nome do Paciente:');
  y = pdfBlankRow(doc, y, 'Sexo:          Idade:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Indicador Protocolo Dor Torácica (Meta ≤ 10 min)');
  y = pdfBlankRow(doc, y, 'Hora de Chegada:');
  y = pdfBlankRow(doc, y, 'Hora do ECG:');
  y = pdfBlankRow(doc, y, 'Tempo Porta-ECG:');
  y = pdfBlankRow(doc, y, 'Classificação de Risco:');
  y = pdfBlankRow(doc, y, '1º Atendimento Médico:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Avaliação da Dor');
  y = pdfBlankRow(doc, y, 'Localização:');
  y = pdfBlankRow(doc, y, 'Característica:');
  y = pdfBlankRow(doc, y, 'Irradiação:');
  y = pdfBlankRow(doc, y, 'Associação:');
  y = pdfBlankRow(doc, y, 'Data Início:');
  y = pdfBlankRow(doc, y, 'Hora Início:');
  y = pdfBlankRow(doc, y, 'Duração:');
  y = pdfBlankRow(doc, y, 'Encaminhamento:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Condutas');
  y = pdfCheckboxRow(doc, y, [
    'Medicação', 'Oxigênio', 'Monitorização', 'Encaminhamento',
    'Observação', 'Transferência', 'Alto Risco', 'Médio Risco', 'Baixo Risco',
  ]);

  y = checkNewPage(doc, y, 50);
  y = pdfSectionTitle(doc, y, 'Troponina — Amostra 1');
  y = pdfBlankRow(doc, y, 'Horário Coleta:');
  y = pdfBlankRow(doc, y, 'Resultado:');
  y = pdfBlankRow(doc, y, 'Horário Liberação:');
  y = pdfBlankRow(doc, y, 'Responsável Coleta:');

  y = checkNewPage(doc, y, 50);
  y = pdfSectionTitle(doc, y, 'Troponina — Amostra 2');
  y = pdfBlankRow(doc, y, 'Horário Coleta:');
  y = pdfBlankRow(doc, y, 'Resultado:');
  y = pdfBlankRow(doc, y, 'Horário Liberação:');
  y = pdfBlankRow(doc, y, 'Responsável Coleta:');

  y = checkNewPage(doc, y, 50);
  y = pdfSectionTitle(doc, y, 'Troponina — Amostra 3');
  y = pdfBlankRow(doc, y, 'Horário Coleta:');
  y = pdfBlankRow(doc, y, 'Resultado:');
  y = pdfBlankRow(doc, y, 'Horário Liberação:');
  y = pdfBlankRow(doc, y, 'Responsável Coleta:');

  y = checkNewPage(doc, y, 50);
  y = pdfSectionTitle(doc, y, 'Trombólise');
  y = pdfBlankRow(doc, y, 'Tipo (Unidade / SAMU):');
  y = pdfBlankRow(doc, y, 'Horário:');
  y = pdfBlankRow(doc, y, 'Complicação:');
  y = pdfBlankRow(doc, y, 'Conduta:');
  y = pdfBlankRow(doc, y, 'Horário chegada SAMU:');
  y = pdfBlankRow(doc, y, 'Hospital destino:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Observações');
  y = pdfBlankRow(doc, y, 'Diagnóstico Inicial:', 170);
  y += 4;
  y = pdfBlankRow(doc, y, 'Relatório Médico:', 170);

  savePdfWithFooter(doc, title, 'protocolo_dor_toracica_branco', logoImg);
}

export async function exportDorToracicaWord() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: 'Protocolo Dor Torácica — Formulário em Branco', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, size: 18, color: '888888' })] }),

        wordSection('Identificação'),
        wordField('Competência'), wordField('Nº Prontuário'), wordField('Nome do Paciente'),
        wordField('Sexo'), wordField('Idade'),

        wordSection('Indicador Protocolo Dor Torácica (Meta ≤ 10 min)'),
        wordField('Hora de Chegada'), wordField('Hora do ECG'), wordField('Tempo Porta-ECG'),
        wordField('Classificação de Risco'), wordField('1º Atendimento Médico'),

        wordSection('Avaliação da Dor'),
        wordField('Localização'), wordField('Característica'), wordField('Irradiação'),
        wordField('Associação'), wordField('Data Início'), wordField('Hora Início'),
        wordField('Duração'), wordField('Encaminhamento'),

        wordSection('Condutas'),
        wordCheckboxList(['Medicação', 'Oxigênio', 'Monitorização', 'Encaminhamento', 'Observação', 'Transferência', 'Alto Risco', 'Médio Risco', 'Baixo Risco']),

        wordSection('Troponina — Amostra 1'),
        wordField('Horário Coleta'), wordField('Resultado'), wordField('Horário Liberação'), wordField('Responsável Coleta'),
        wordSection('Troponina — Amostra 2'),
        wordField('Horário Coleta'), wordField('Resultado'), wordField('Horário Liberação'), wordField('Responsável Coleta'),
        wordSection('Troponina — Amostra 3'),
        wordField('Horário Coleta'), wordField('Resultado'), wordField('Horário Liberação'), wordField('Responsável Coleta'),

        wordSection('Trombólise'),
        wordField('Tipo (Unidade / SAMU)'), wordField('Horário'), wordField('Complicação'),
        wordField('Conduta'), wordField('Horário chegada SAMU'), wordField('Hospital destino'),

        wordSection('Observações'),
        wordField('Diagnóstico Inicial'), wordField('Relatório Médico'),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `protocolo_dor_toracica_branco_${format(new Date(), 'yyyy-MM-dd')}.docx`);
}

// ─── Sepse Adulto ───────────────────────────────────────────────────────────

export async function exportSepseAdultoPDF() {
  const title = 'Protocolo Sepse Adulto — Formulário em Branco';
  const { doc, logoImg } = await createStandardPdf(title);
  let y = 36;

  y = pdfSectionTitle(doc, y, 'Identificação');
  y = pdfBlankRow(doc, y, 'Competência:');
  y = pdfBlankRow(doc, y, 'Nº Prontuário:');
  y = pdfBlankRow(doc, y, 'Nome do Paciente:');
  y = pdfBlankRow(doc, y, 'Sexo:          Idade:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Indicador (Meta ≤ 1h)');
  y = pdfBlankRow(doc, y, 'Hora de Chegada:');
  y = pdfBlankRow(doc, y, 'Hora do ECG:');
  y = pdfBlankRow(doc, y, 'Tempo Porta-ECG:');
  y = pdfBlankRow(doc, y, 'Classificação de Risco:');
  y = pdfBlankRow(doc, y, '1º Atendimento Médico:');
  y = pdfBlankRow(doc, y, 'Médico Responsável:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Critérios SIRS');
  y = pdfCheckboxRow(doc, y, [
    'Temp > 38,3°C', 'Temp < 36°C', 'FC > 90 bpm', 'FR > 20 irpm',
    'Leucocitose', 'Leucopenia', 'Células jovens > 10%', 'Plaquetas < 100.000',
    'Lactato > 2', 'Bilirrubina > 2', 'Creatinina > 2',
  ], 3);

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Disfunção Orgânica');
  y = pdfCheckboxRow(doc, y, ['PA sistólica < 90', 'SatO2 < 90%', 'Alteração consciência'], 3);

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Sinais Vitais');
  y = pdfBlankRow(doc, y, 'PA:');
  y = pdfBlankRow(doc, y, 'FC:');
  y = pdfBlankRow(doc, y, 'FR:');
  y = pdfBlankRow(doc, y, 'SpO2:');
  y = pdfBlankRow(doc, y, 'Temperatura:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Suspeita de Sepse');
  y = pdfCheckboxRow(doc, y, ['Sim', 'Não'], 2);
  y = pdfBlankRow(doc, y, 'Motivo:');
  y = pdfBlankRow(doc, y, 'Horário:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Foco Infeccioso');
  y = pdfCheckboxRow(doc, y, ['Pulmonar', 'Urinário', 'Abdominal', 'Pele/Partes Moles', 'Corrente Sanguínea/Cateter', 'Sem foco definido'], 3);

  y = checkNewPage(doc, y, 50);
  y = pdfSectionTitle(doc, y, 'Kit Sepse / Laboratório');
  y = pdfCheckboxRow(doc, y, ['Kit Sepse coletado'], 1);
  y = pdfBlankRow(doc, y, 'Lab Villac — Horário chamado:');
  y = pdfBlankRow(doc, y, 'Lab Villac — Horário coleta:');

  y = checkNewPage(doc, y, 50);
  y = pdfSectionTitle(doc, y, 'Antibioticoterapia');
  y = pdfBlankRow(doc, y, 'ATB 1 — Nome:');
  y = pdfBlankRow(doc, y, 'ATB 1 — Data:');
  y = pdfBlankRow(doc, y, 'ATB 1 — Dose:');
  y = pdfBlankRow(doc, y, 'ATB 1 — Horário Início:');
  y += 3;
  y = pdfBlankRow(doc, y, 'ATB 2 — Nome:');
  y = pdfBlankRow(doc, y, 'ATB 2 — Data:');
  y = pdfBlankRow(doc, y, 'ATB 2 — Dose:');
  y = pdfBlankRow(doc, y, 'ATB 2 — Horário Início:');
  y = pdfBlankRow(doc, y, 'Profissional:');

  y = checkNewPage(doc, y, 60);
  y = pdfSectionTitle(doc, y, 'Choque Séptico');
  y = pdfCheckboxRow(doc, y, ['Choque séptico', 'Necessidade UTI'], 2);
  y = pdfBlankRow(doc, y, 'Reposição volêmica — Data/Hora:');
  y = pdfBlankRow(doc, y, 'Reposição volêmica — Medicamento:');
  y = pdfBlankRow(doc, y, 'Vasopressor — Data/Hora:');
  y = pdfBlankRow(doc, y, 'Vasopressor — Medicamento:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Destino / Assinaturas');
  y = pdfBlankRow(doc, y, 'Destino do Paciente:');
  y = pdfBlankRow(doc, y, 'Assinatura Enfermeiro:');
  y = pdfBlankRow(doc, y, 'Assinatura Médico:');
  y = pdfBlankRow(doc, y, 'Assinatura Farmácia:');

  savePdfWithFooter(doc, title, 'protocolo_sepse_adulto_branco', logoImg);
}

export async function exportSepseAdultoWord() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: 'Protocolo Sepse Adulto — Formulário em Branco', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, size: 18, color: '888888' })] }),

        wordSection('Identificação'),
        wordField('Competência'), wordField('Nº Prontuário'), wordField('Nome do Paciente'),
        wordField('Sexo'), wordField('Idade'),

        wordSection('Indicador (Meta ≤ 1h)'),
        wordField('Hora de Chegada'), wordField('Hora do ECG'), wordField('Tempo Porta-ECG'),
        wordField('Classificação de Risco'), wordField('1º Atendimento Médico'), wordField('Médico Responsável'),

        wordSection('Critérios SIRS'),
        wordCheckboxList(['Temp > 38,3°C', 'Temp < 36°C', 'FC > 90 bpm', 'FR > 20 irpm', 'Leucocitose', 'Leucopenia', 'Células jovens > 10%', 'Plaquetas < 100.000', 'Lactato > 2', 'Bilirrubina > 2', 'Creatinina > 2']),

        wordSection('Disfunção Orgânica'),
        wordCheckboxList(['PA sistólica < 90', 'SatO2 < 90%', 'Alteração consciência']),

        wordSection('Sinais Vitais'),
        wordField('PA'), wordField('FC'), wordField('FR'), wordField('SpO2'), wordField('Temperatura'),

        wordSection('Suspeita de Sepse'),
        wordCheckboxList(['Sim', 'Não']),
        wordField('Motivo'), wordField('Horário'),

        wordSection('Foco Infeccioso'),
        wordCheckboxList(['Pulmonar', 'Urinário', 'Abdominal', 'Pele/Partes Moles', 'Corrente Sanguínea/Cateter', 'Sem foco definido']),

        wordSection('Kit Sepse / Laboratório'),
        wordCheckboxList(['Kit Sepse coletado']),
        wordField('Lab Villac — Horário chamado'), wordField('Lab Villac — Horário coleta'),

        wordSection('Antibioticoterapia'),
        wordField('ATB 1 — Nome'), wordField('ATB 1 — Data'), wordField('ATB 1 — Dose'), wordField('ATB 1 — Horário Início'),
        wordField('ATB 2 — Nome'), wordField('ATB 2 — Data'), wordField('ATB 2 — Dose'), wordField('ATB 2 — Horário Início'),
        wordField('Profissional'),

        wordSection('Choque Séptico'),
        wordCheckboxList(['Choque séptico', 'Necessidade UTI']),
        wordField('Reposição volêmica — Data/Hora'), wordField('Reposição volêmica — Medicamento'),
        wordField('Vasopressor — Data/Hora'), wordField('Vasopressor — Medicamento'),

        wordSection('Destino / Assinaturas'),
        wordField('Destino do Paciente'), wordField('Assinatura Enfermeiro'),
        wordField('Assinatura Médico'), wordField('Assinatura Farmácia'),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `protocolo_sepse_adulto_branco_${format(new Date(), 'yyyy-MM-dd')}.docx`);
}

// ─── Sepse Pediátrico ───────────────────────────────────────────────────────

export async function exportSepsePediatricoPDF() {
  const title = 'Protocolo Sepse Pediátrico — Formulário em Branco';
  const { doc, logoImg } = await createStandardPdf(title);
  let y = 36;

  y = pdfSectionTitle(doc, y, 'Identificação');
  y = pdfBlankRow(doc, y, 'Competência:');
  y = pdfBlankRow(doc, y, 'Nº Prontuário:');
  y = pdfBlankRow(doc, y, 'Nome do Paciente:');
  y = pdfBlankRow(doc, y, 'Sexo:          Idade:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Indicador (Meta ≤ 1h)');
  y = pdfBlankRow(doc, y, 'Hora de Chegada:');
  y = pdfBlankRow(doc, y, 'Hora do ECG:');
  y = pdfBlankRow(doc, y, 'Tempo Porta-ECG:');
  y = pdfBlankRow(doc, y, 'Classificação de Risco:');
  y = pdfBlankRow(doc, y, '1º Atendimento Médico:');
  y = pdfBlankRow(doc, y, 'Médico Responsável:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Sinais Vitais');
  y = pdfBlankRow(doc, y, 'PA:');
  y = pdfBlankRow(doc, y, 'FC:');
  y = pdfBlankRow(doc, y, 'FR:');
  y = pdfBlankRow(doc, y, 'SpO2:');
  y = pdfBlankRow(doc, y, 'Temperatura:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Achados Clínicos');
  y = pdfCheckboxRow(doc, y, ['Desidratação', 'Dor abdominal', 'Disúria', 'Feridas cutâneas', 'Desaturação', 'Alteração de perfusão', 'Palidez cutânea'], 3);

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Achados Neurológicos');
  y = pdfCheckboxRow(doc, y, ['Irritabilidade', 'Agitação', 'Choro inapropriado', 'Sonolência', 'Pobre interação com familiares', 'Letargia'], 3);

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Suspeita de Sepse');
  y = pdfCheckboxRow(doc, y, ['Sim', 'Não'], 2);
  y = pdfBlankRow(doc, y, 'Motivo:');
  y = pdfBlankRow(doc, y, 'Horário:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Foco Infeccioso');
  y = pdfCheckboxRow(doc, y, ['Pulmonar', 'Urinário', 'Abdominal', 'Pele/Partes Moles', 'Corrente Sanguínea/Cateter', 'Sem foco definido'], 3);

  y = checkNewPage(doc, y, 50);
  y = pdfSectionTitle(doc, y, 'Kit Sepse / Laboratório');
  y = pdfCheckboxRow(doc, y, ['Kit Sepse coletado'], 1);
  y = pdfBlankRow(doc, y, 'Lab Villac — Horário chamado:');
  y = pdfBlankRow(doc, y, 'Lab Villac — Horário coleta:');

  y = checkNewPage(doc, y, 50);
  y = pdfSectionTitle(doc, y, 'Antibioticoterapia');
  y = pdfBlankRow(doc, y, 'ATB 1 — Nome:');
  y = pdfBlankRow(doc, y, 'ATB 1 — Data:');
  y = pdfBlankRow(doc, y, 'ATB 1 — Dose:');
  y = pdfBlankRow(doc, y, 'ATB 1 — Horário Início:');
  y += 3;
  y = pdfBlankRow(doc, y, 'ATB 2 — Nome:');
  y = pdfBlankRow(doc, y, 'ATB 2 — Data:');
  y = pdfBlankRow(doc, y, 'ATB 2 — Dose:');
  y = pdfBlankRow(doc, y, 'ATB 2 — Horário Início:');
  y = pdfBlankRow(doc, y, 'Profissional:');

  y = checkNewPage(doc, y, 60);
  y = pdfSectionTitle(doc, y, 'Choque Séptico');
  y = pdfCheckboxRow(doc, y, ['Choque séptico', 'Necessidade UTI'], 2);
  y = pdfBlankRow(doc, y, 'Reposição volêmica — Data/Hora:');
  y = pdfBlankRow(doc, y, 'Reposição volêmica — Medicamento:');
  y = pdfBlankRow(doc, y, 'Vasopressor — Data/Hora:');
  y = pdfBlankRow(doc, y, 'Vasopressor — Medicamento:');

  y = checkNewPage(doc, y);
  y = pdfSectionTitle(doc, y, 'Destino / Assinaturas');
  y = pdfBlankRow(doc, y, 'Destino do Paciente:');
  y = pdfBlankRow(doc, y, 'Assinatura Enfermeiro:');
  y = pdfBlankRow(doc, y, 'Assinatura Médico:');
  y = pdfBlankRow(doc, y, 'Assinatura Farmácia:');

  savePdfWithFooter(doc, title, 'protocolo_sepse_pediatrico_branco', logoImg);
}

export async function exportSepsePediatricoWord() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: 'Protocolo Sepse Pediátrico — Formulário em Branco', heading: HeadingLevel.HEADING_1, spacing: { after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: `Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, size: 18, color: '888888' })] }),

        wordSection('Identificação'),
        wordField('Competência'), wordField('Nº Prontuário'), wordField('Nome do Paciente'),
        wordField('Sexo'), wordField('Idade'),

        wordSection('Indicador (Meta ≤ 1h)'),
        wordField('Hora de Chegada'), wordField('Hora do ECG'), wordField('Tempo Porta-ECG'),
        wordField('Classificação de Risco'), wordField('1º Atendimento Médico'), wordField('Médico Responsável'),

        wordSection('Sinais Vitais'),
        wordField('PA'), wordField('FC'), wordField('FR'), wordField('SpO2'), wordField('Temperatura'),

        wordSection('Achados Clínicos'),
        wordCheckboxList(['Desidratação', 'Dor abdominal', 'Disúria', 'Feridas cutâneas', 'Desaturação', 'Alteração de perfusão', 'Palidez cutânea']),

        wordSection('Achados Neurológicos'),
        wordCheckboxList(['Irritabilidade', 'Agitação', 'Choro inapropriado', 'Sonolência', 'Pobre interação com familiares', 'Letargia']),

        wordSection('Suspeita de Sepse'),
        wordCheckboxList(['Sim', 'Não']),
        wordField('Motivo'), wordField('Horário'),

        wordSection('Foco Infeccioso'),
        wordCheckboxList(['Pulmonar', 'Urinário', 'Abdominal', 'Pele/Partes Moles', 'Corrente Sanguínea/Cateter', 'Sem foco definido']),

        wordSection('Kit Sepse / Laboratório'),
        wordCheckboxList(['Kit Sepse coletado']),
        wordField('Lab Villac — Horário chamado'), wordField('Lab Villac — Horário coleta'),

        wordSection('Antibioticoterapia'),
        wordField('ATB 1 — Nome'), wordField('ATB 1 — Data'), wordField('ATB 1 — Dose'), wordField('ATB 1 — Horário Início'),
        wordField('ATB 2 — Nome'), wordField('ATB 2 — Data'), wordField('ATB 2 — Dose'), wordField('ATB 2 — Horário Início'),
        wordField('Profissional'),

        wordSection('Choque Séptico'),
        wordCheckboxList(['Choque séptico', 'Necessidade UTI']),
        wordField('Reposição volêmica — Data/Hora'), wordField('Reposição volêmica — Medicamento'),
        wordField('Vasopressor — Data/Hora'), wordField('Vasopressor — Medicamento'),

        wordSection('Destino / Assinaturas'),
        wordField('Destino do Paciente'), wordField('Assinatura Enfermeiro'),
        wordField('Assinatura Médico'), wordField('Assinatura Farmácia'),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `protocolo_sepse_pediatrico_branco_${format(new Date(), 'yyyy-MM-dd')}.docx`);
}
