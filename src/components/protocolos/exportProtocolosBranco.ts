import { createStandardPdf, savePdfWithFooter } from '@/lib/export-utils';
import { Document, Packer, Paragraph, TextRun, BorderStyle, AlignmentType, HeadingLevel, TabStopPosition, TabStopType } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';
import jsPDF from 'jspdf';

// ─── PDF Helpers ────────────────────────────────────────────────────────────

const COLORS = {
  primary: [13, 33, 55] as [number, number, number],       // #0d2137
  accent: [45, 125, 210] as [number, number, number],      // #2d7dd2
  lightBg: [245, 248, 252] as [number, number, number],    // light blue-gray
  border: [200, 212, 226] as [number, number, number],     // soft border
  text: [30, 30, 30] as [number, number, number],
  muted: [120, 130, 145] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
};

function checkPage(doc: jsPDF, y: number, needed: number = 40): number {
  if (y + needed > doc.internal.pageSize.height - 30) {
    doc.addPage();
    return 36;
  }
  return y;
}

function drawSectionHeader(doc: jsPDF, y: number, title: string, icon?: string): number {
  y = checkPage(doc, y, 20);
  const pw = doc.internal.pageSize.width;

  // Background bar
  doc.setFillColor(...COLORS.primary);
  doc.roundedRect(14, y - 5, pw - 28, 9, 1, 1, 'F');

  // Title text
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.white);
  doc.text((icon ? `${icon}  ` : '') + title.toUpperCase(), 18, y + 1);
  doc.setTextColor(...COLORS.text);

  return y + 12;
}

function drawFieldRow(doc: jsPDF, y: number, fields: { label: string; width: number }[]): number {
  y = checkPage(doc, y, 14);
  const pw = doc.internal.pageSize.width;
  const margin = 14;
  const totalAvail = pw - margin * 2;

  // Calculate proportional widths
  const totalWeight = fields.reduce((s, f) => s + f.width, 0);
  let x = margin;

  fields.forEach((field) => {
    const w = (field.width / totalWeight) * totalAvail;

    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.muted);
    doc.text(field.label, x + 2, y);

    // Input box
    doc.setDrawColor(...COLORS.border);
    doc.setFillColor(...COLORS.lightBg);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, y + 2, w - 3, 8, 1, 1, 'FD');

    x += w;
  });

  return y + 15;
}

function drawCheckboxGroup(doc: jsPDF, y: number, items: string[], cols: number = 3): number {
  y = checkPage(doc, y, 10 + Math.ceil(items.length / cols) * 7);
  const pw = doc.internal.pageSize.width;
  const margin = 14;
  const colW = (pw - margin * 2) / cols;

  items.forEach((item, i) => {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = margin + col * colW;
    const cy = y + row * 7;

    // Checkbox square
    doc.setDrawColor(...COLORS.border);
    doc.setFillColor(...COLORS.white);
    doc.setLineWidth(0.3);
    doc.roundedRect(x + 2, cy - 2.5, 3.5, 3.5, 0.5, 0.5, 'FD');

    // Label
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.text);
    doc.text(item, x + 7.5, cy + 0.5);
  });

  return y + Math.ceil(items.length / cols) * 7 + 4;
}

function drawSubtitle(doc: jsPDF, y: number, text: string): number {
  y = checkPage(doc, y, 12);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(...COLORS.accent);
  doc.text(text, 16, y);
  doc.setTextColor(...COLORS.text);
  return y + 6;
}

function drawSeparator(doc: jsPDF, y: number): number {
  const pw = doc.internal.pageSize.width;
  doc.setDrawColor(...COLORS.border);
  doc.setLineWidth(0.2);
  doc.line(14, y, pw - 14, y);
  return y + 4;
}

function drawTextArea(doc: jsPDF, y: number, label: string, height: number = 18): number {
  y = checkPage(doc, y, height + 10);
  const pw = doc.internal.pageSize.width;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.muted);
  doc.text(label, 16, y);

  doc.setDrawColor(...COLORS.border);
  doc.setFillColor(...COLORS.lightBg);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y + 2, pw - 28, height, 1.5, 1.5, 'FD');

  return y + height + 6;
}

// ─── Word helpers ───────────────────────────────────────────────────────────

function wordSection(title: string): Paragraph {
  return new Paragraph({
    spacing: { before: 300, after: 120 },
    shading: { fill: '0d2137' },
    children: [
      new TextRun({ text: `  ${title.toUpperCase()}`, bold: true, size: 18, color: 'FFFFFF', font: 'Calibri' }),
    ],
  });
}

function wordFieldRow(fields: string[]): Paragraph {
  return new Paragraph({
    spacing: { after: 60 },
    children: fields.flatMap((f, i) => [
      new TextRun({ text: `${f}: `, bold: true, size: 18, color: '78828E', font: 'Calibri' }),
      new TextRun({ text: '________________________', size: 18, color: 'C8D4E2', font: 'Calibri' }),
      ...(i < fields.length - 1 ? [new TextRun({ text: '     ', size: 18 })] : []),
    ]),
  });
}

function wordCheckboxList(items: string[]): Paragraph {
  return new Paragraph({
    spacing: { after: 80 },
    children: items.flatMap((item, i) => [
      new TextRun({ text: `☐ ${item}`, size: 17, font: 'Calibri' }),
      ...(i < items.length - 1 ? [new TextRun({ text: '     ', size: 17 })] : []),
    ]),
  });
}

function wordSubtitle(text: string): Paragraph {
  return new Paragraph({
    spacing: { before: 160, after: 60 },
    children: [new TextRun({ text, bold: true, size: 18, color: '2d7dd2', font: 'Calibri' })],
  });
}

function wordTextArea(label: string): Paragraph {
  return new Paragraph({
    spacing: { after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 1, color: 'C8D4E2' } },
    children: [
      new TextRun({ text: `${label}: `, bold: true, size: 18, color: '78828E', font: 'Calibri' }),
      new TextRun({ text: '\n\n\n', size: 18 }),
    ],
  });
}

// ─── Dor Torácica ───────────────────────────────────────────────────────────

export async function exportDorToracicaPDF() {
  const title = 'Protocolo Dor Torácica — Formulário em Branco';
  const { doc, logoImg } = await createStandardPdf(title);
  let y = 36;

  y = drawSectionHeader(doc, y, 'Identificação do Paciente');
  y = drawFieldRow(doc, y, [{ label: 'Competência', width: 2 }, { label: 'Nº Prontuário', width: 2 }, { label: 'Nome do Paciente', width: 4 }]);
  y = drawFieldRow(doc, y, [{ label: 'Sexo', width: 2 }, { label: 'Idade', width: 1 }]);

  y = drawSectionHeader(doc, y, 'Indicador Protocolo Dor Torácica — Meta de 10 Minutos');
  y = drawFieldRow(doc, y, [{ label: 'Hora de Chegada', width: 2 }, { label: 'Hora do ECG', width: 2 }, { label: 'Tempo Porta-ECG', width: 2 }]);
  y = drawFieldRow(doc, y, [{ label: 'Classificação de Risco', width: 2 }, { label: '1º Atendimento Médico', width: 3 }]);

  y = drawSectionHeader(doc, y, 'Avaliação da Dor');
  y = drawFieldRow(doc, y, [{ label: 'Localização', width: 2 }, { label: 'Característica', width: 2 }, { label: 'Irradiação', width: 2 }]);
  y = drawFieldRow(doc, y, [{ label: 'Associação', width: 2 }, { label: 'Data Início', width: 1 }, { label: 'Hora Início', width: 1 }, { label: 'Duração', width: 1 }]);
  y = drawFieldRow(doc, y, [{ label: 'Encaminhamento', width: 3 }]);

  y = drawSectionHeader(doc, y, 'Condutas');
  y = drawCheckboxGroup(doc, y, [
    'Medicação', 'Oxigênio', 'Monitorização', 'Encaminhamento',
    'Observação', 'Transferência', 'Alto Risco', 'Médio Risco', 'Baixo Risco',
  ]);

  y = drawSectionHeader(doc, y, 'Troponina');
  ['Amostra 1', 'Amostra 2', 'Amostra 3'].forEach((label) => {
    y = drawSubtitle(doc, y, label);
    y = drawFieldRow(doc, y, [{ label: 'Horário Coleta', width: 2 }, { label: 'Resultado', width: 2 }, { label: 'Horário Liberação', width: 2 }, { label: 'Responsável', width: 2 }]);
  });

  y = drawSectionHeader(doc, y, 'Trombólise');
  y = drawFieldRow(doc, y, [{ label: 'Tipo (Unidade / SAMU)', width: 2 }, { label: 'Horário', width: 2 }]);
  y = drawCheckboxGroup(doc, y, ['Complicação'], 1);
  y = drawFieldRow(doc, y, [{ label: 'Conduta', width: 3 }]);
  y = drawFieldRow(doc, y, [{ label: 'Horário chegada SAMU', width: 2 }, { label: 'Hospital destino', width: 3 }]);

  y = drawSectionHeader(doc, y, 'Observações Clínicas');
  y = drawTextArea(doc, y, 'Diagnóstico Inicial', 15);
  y = drawTextArea(doc, y, 'Relatório Médico', 20);

  savePdfWithFooter(doc, title, 'protocolo_dor_toracica_branco', logoImg);
}

export async function exportDorToracicaWord() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: 'Protocolo Dor Torácica', heading: HeadingLevel.HEADING_1, spacing: { after: 40 } }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Formulário em Branco — Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, size: 17, color: '78828E', font: 'Calibri' })] }),

        wordSection('Identificação do Paciente'),
        wordFieldRow(['Competência', 'Nº Prontuário']),
        wordFieldRow(['Nome do Paciente']),
        wordFieldRow(['Sexo', 'Idade']),

        wordSection('Indicador Protocolo Dor Torácica — Meta de 10 Minutos'),
        wordFieldRow(['Hora de Chegada', 'Hora do ECG']),
        wordFieldRow(['Tempo Porta-ECG', 'Classificação de Risco']),
        wordFieldRow(['1º Atendimento Médico']),

        wordSection('Avaliação da Dor'),
        wordFieldRow(['Localização', 'Característica']),
        wordFieldRow(['Irradiação', 'Associação']),
        wordFieldRow(['Data Início', 'Hora Início', 'Duração']),
        wordFieldRow(['Encaminhamento']),

        wordSection('Condutas'),
        wordCheckboxList(['Medicação', 'Oxigênio', 'Monitorização', 'Encaminhamento', 'Observação', 'Transferência']),
        wordCheckboxList(['Alto Risco', 'Médio Risco', 'Baixo Risco']),

        wordSection('Troponina'),
        wordSubtitle('Amostra 1'),
        wordFieldRow(['Horário Coleta', 'Resultado']), wordFieldRow(['Horário Liberação', 'Responsável']),
        wordSubtitle('Amostra 2'),
        wordFieldRow(['Horário Coleta', 'Resultado']), wordFieldRow(['Horário Liberação', 'Responsável']),
        wordSubtitle('Amostra 3'),
        wordFieldRow(['Horário Coleta', 'Resultado']), wordFieldRow(['Horário Liberação', 'Responsável']),

        wordSection('Trombólise'),
        wordFieldRow(['Tipo (Unidade / SAMU)', 'Horário']),
        wordCheckboxList(['Complicação']),
        wordFieldRow(['Conduta']),
        wordFieldRow(['Horário chegada SAMU', 'Hospital destino']),

        wordSection('Observações Clínicas'),
        wordTextArea('Diagnóstico Inicial'),
        wordTextArea('Relatório Médico'),
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

  y = drawSectionHeader(doc, y, 'Identificação do Paciente');
  y = drawFieldRow(doc, y, [{ label: 'Competência', width: 2 }, { label: 'Nº Prontuário', width: 2 }, { label: 'Nome do Paciente', width: 4 }]);
  y = drawFieldRow(doc, y, [{ label: 'Sexo', width: 2 }, { label: 'Idade', width: 1 }]);

  y = drawSectionHeader(doc, y, 'Indicador — Meta de 1 Hora');
  y = drawFieldRow(doc, y, [{ label: 'Hora de Chegada', width: 2 }, { label: 'Hora do ECG', width: 2 }, { label: 'Tempo Porta-ECG', width: 2 }]);
  y = drawFieldRow(doc, y, [{ label: 'Classificação de Risco', width: 2 }, { label: '1º Atendimento Médico', width: 2 }, { label: 'Médico Responsável', width: 2 }]);

  y = drawSectionHeader(doc, y, 'Avaliação da Enfermagem');
  y = drawFieldRow(doc, y, [{ label: 'Enfermeiro(a) Responsável', width: 3 }, { label: 'COREN', width: 2 }]);
  y = drawFieldRow(doc, y, [{ label: 'Data/Hora Avaliação', width: 2 }, { label: 'Setor', width: 2 }]);
  y = drawCheckboxGroup(doc, y, [
    'Acesso venoso periférico', 'Acesso venoso central', 'Sonda vesical de demora',
    'Cateter nasoenteral', 'Ventilação mecânica', 'Oxigenoterapia',
    'Monitorização contínua', 'Balanço hídrico',
  ], 3);

  y = drawSectionHeader(doc, y, 'Critérios SIRS');
  y = drawCheckboxGroup(doc, y, [
    'Temp > 38,3°C', 'Temp < 36°C', 'FC > 90 bpm', 'FR > 20 irpm',
    'Leucocitose', 'Leucopenia', 'Células jovens > 10%', 'Plaquetas < 100.000',
    'Lactato > 2', 'Bilirrubina > 2', 'Creatinina > 2',
  ], 3);

  y = drawSectionHeader(doc, y, 'Disfunção Orgânica');
  y = drawCheckboxGroup(doc, y, ['PA sistólica < 90', 'SatO2 < 90%', 'Alteração consciência'], 3);

  y = drawSectionHeader(doc, y, 'Sinais Vitais');
  y = drawFieldRow(doc, y, [{ label: 'PA', width: 2 }, { label: 'FC', width: 1 }, { label: 'FR', width: 1 }, { label: 'SpO2', width: 1 }, { label: 'Temperatura', width: 1 }]);

  y = drawSectionHeader(doc, y, 'Suspeita de Sepse');
  y = drawCheckboxGroup(doc, y, ['Sim', 'Não'], 2);
  y = drawFieldRow(doc, y, [{ label: 'Motivo', width: 3 }, { label: 'Horário', width: 2 }]);

  y = drawSectionHeader(doc, y, 'Foco Infeccioso');
  y = drawCheckboxGroup(doc, y, ['Pulmonar', 'Urinário', 'Abdominal', 'Pele/Partes Moles', 'Corrente Sanguínea/Cateter', 'Sem foco definido'], 3);

  y = drawSectionHeader(doc, y, 'Exames Kit Sepse');
  y = drawCheckboxGroup(doc, y, ['Kit Sepse coletado'], 1);
  y = drawSubtitle(doc, y, 'Exames obrigatórios:');
  y = drawCheckboxGroup(doc, y, [
    '1. Hemograma e plaqueta', '2. Ureia e creatinina', '3. Sódio e potássio',
    '4. Tempo de protrombina', '5. Hemocultura 2 pares', '6. Bilirrubinas totais e frações',
    '7. PCR', '8. Glicemia', '9. Lactato',
  ], 3);
  y = drawSubtitle(doc, y, 'Complementares (se indicado):');
  y = drawCheckboxGroup(doc, y, ['Raio X tórax (suspeita PNM)', 'Gasometria (choque/insuf. resp.)', 'Culturas de outros sítios'], 3);
  y = drawFieldRow(doc, y, [{ label: 'Lab Villac — Horário chamado', width: 2 }, { label: 'Lab Villac — Horário coleta', width: 2 }]);

  y = drawSectionHeader(doc, y, 'Antibioticoterapia');
  y = drawSubtitle(doc, y, 'ATB 1');
  y = drawFieldRow(doc, y, [{ label: 'Nome', width: 3 }, { label: 'Data', width: 1 }, { label: 'Dose', width: 1 }, { label: 'Horário Início', width: 2 }]);
  y = drawSubtitle(doc, y, 'ATB 2');
  y = drawFieldRow(doc, y, [{ label: 'Nome', width: 3 }, { label: 'Data', width: 1 }, { label: 'Dose', width: 1 }, { label: 'Horário Início', width: 2 }]);
  y = drawFieldRow(doc, y, [{ label: 'Profissional Responsável', width: 3 }]);

  y = drawSectionHeader(doc, y, 'Choque Séptico');
  y = drawCheckboxGroup(doc, y, ['Choque séptico', 'Necessidade UTI'], 2);
  y = drawFieldRow(doc, y, [{ label: 'Reposição volêmica — Data/Hora', width: 2 }, { label: 'Reposição volêmica — Medicamento', width: 3 }]);
  y = drawFieldRow(doc, y, [{ label: 'Vasopressor — Data/Hora', width: 2 }, { label: 'Vasopressor — Medicamento', width: 3 }]);

  y = drawSectionHeader(doc, y, 'Destino e Assinaturas');
  y = drawFieldRow(doc, y, [{ label: 'Destino do Paciente', width: 3 }]);
  y = drawFieldRow(doc, y, [{ label: 'Assinatura Enfermeiro', width: 2 }, { label: 'Assinatura Médico', width: 2 }, { label: 'Assinatura Farmácia', width: 2 }]);

  savePdfWithFooter(doc, title, 'protocolo_sepse_adulto_branco', logoImg);
}

export async function exportSepseAdultoWord() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: 'Protocolo Sepse Adulto', heading: HeadingLevel.HEADING_1, spacing: { after: 40 } }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Formulário em Branco — Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, size: 17, color: '78828E', font: 'Calibri' })] }),

        wordSection('Identificação do Paciente'),
        wordFieldRow(['Competência', 'Nº Prontuário']),
        wordFieldRow(['Nome do Paciente']),
        wordFieldRow(['Sexo', 'Idade']),

        wordSection('Indicador — Meta de 1 Hora'),
        wordFieldRow(['Hora de Chegada', 'Hora do ECG']),
        wordFieldRow(['Tempo Porta-ECG', 'Classificação de Risco']),
        wordFieldRow(['1º Atendimento Médico', 'Médico Responsável']),

        wordSection('Avaliação da Enfermagem'),
        wordFieldRow(['Enfermeiro(a) Responsável', 'COREN']),
        wordFieldRow(['Data/Hora Avaliação', 'Setor']),
        wordCheckboxList(['Acesso venoso periférico', 'Acesso venoso central', 'Sonda vesical de demora']),
        wordCheckboxList(['Cateter nasoenteral', 'Ventilação mecânica', 'Oxigenoterapia']),
        wordCheckboxList(['Monitorização contínua', 'Balanço hídrico']),

        wordSection('Critérios SIRS'),
        wordCheckboxList(['Temp > 38,3°C', 'Temp < 36°C', 'FC > 90 bpm', 'FR > 20 irpm']),
        wordCheckboxList(['Leucocitose', 'Leucopenia', 'Células jovens > 10%', 'Plaquetas < 100.000']),
        wordCheckboxList(['Lactato > 2', 'Bilirrubina > 2', 'Creatinina > 2']),

        wordSection('Disfunção Orgânica'),
        wordCheckboxList(['PA sistólica < 90', 'SatO2 < 90%', 'Alteração consciência']),

        wordSection('Sinais Vitais'),
        wordFieldRow(['PA', 'FC', 'FR']),
        wordFieldRow(['SpO2', 'Temperatura']),

        wordSection('Suspeita de Sepse'),
        wordCheckboxList(['Sim', 'Não']),
        wordFieldRow(['Motivo', 'Horário']),

        wordSection('Foco Infeccioso'),
        wordCheckboxList(['Pulmonar', 'Urinário', 'Abdominal']),
        wordCheckboxList(['Pele/Partes Moles', 'Corrente Sanguínea/Cateter', 'Sem foco definido']),

        wordSection('Exames Kit Sepse'),
        wordCheckboxList(['Kit Sepse coletado']),
        wordCheckboxList(['1. Hemograma e plaqueta', '2. Ureia e creatinina', '3. Sódio e potássio']),
        wordCheckboxList(['4. Tempo de protrombina', '5. Hemocultura 2 pares', '6. Bilirrubinas totais e frações']),
        wordCheckboxList(['7. PCR', '8. Glicemia', '9. Lactato']),
        wordCheckboxList(['Raio X tórax (suspeita PNM)', 'Gasometria (choque/insuf. resp.)', 'Culturas de outros sítios']),
        wordFieldRow(['Lab Villac — Horário chamado', 'Lab Villac — Horário coleta']),

        wordSection('Antibioticoterapia'),
        wordSubtitle('ATB 1'),
        wordFieldRow(['Nome', 'Data']), wordFieldRow(['Dose', 'Horário Início']),
        wordSubtitle('ATB 2'),
        wordFieldRow(['Nome', 'Data']), wordFieldRow(['Dose', 'Horário Início']),
        wordFieldRow(['Profissional Responsável']),

        wordSection('Choque Séptico'),
        wordCheckboxList(['Choque séptico', 'Necessidade UTI']),
        wordFieldRow(['Reposição volêmica — Data/Hora', 'Medicamento']),
        wordFieldRow(['Vasopressor — Data/Hora', 'Medicamento']),

        wordSection('Destino e Assinaturas'),
        wordFieldRow(['Destino do Paciente']),
        wordFieldRow(['Assinatura Enfermeiro', 'Assinatura Médico']),
        wordFieldRow(['Assinatura Farmácia']),
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

  y = drawSectionHeader(doc, y, 'Identificação do Paciente');
  y = drawFieldRow(doc, y, [{ label: 'Competência', width: 2 }, { label: 'Nº Prontuário', width: 2 }, { label: 'Nome do Paciente', width: 4 }]);
  y = drawFieldRow(doc, y, [{ label: 'Sexo', width: 2 }, { label: 'Idade', width: 1 }]);

  y = drawSectionHeader(doc, y, 'Indicador — Meta ≤ 1h');
  y = drawFieldRow(doc, y, [{ label: 'Hora de Chegada', width: 2 }, { label: 'Hora do ECG', width: 2 }, { label: 'Tempo Porta-ECG', width: 2 }]);
  y = drawFieldRow(doc, y, [{ label: 'Classificação de Risco', width: 2 }, { label: '1º Atendimento Médico', width: 2 }, { label: 'Médico Responsável', width: 2 }]);

  y = drawSectionHeader(doc, y, 'Sinais Vitais');
  y = drawFieldRow(doc, y, [{ label: 'PA', width: 2 }, { label: 'FC', width: 1 }, { label: 'FR', width: 1 }, { label: 'SpO2', width: 1 }, { label: 'Temperatura', width: 1 }]);

  y = drawSectionHeader(doc, y, 'Achados Clínicos');
  y = drawCheckboxGroup(doc, y, ['Desidratação', 'Dor abdominal', 'Disúria', 'Feridas cutâneas', 'Desaturação', 'Alteração de perfusão', 'Palidez cutânea'], 3);

  y = drawSectionHeader(doc, y, 'Achados Neurológicos');
  y = drawCheckboxGroup(doc, y, ['Irritabilidade', 'Agitação', 'Choro inapropriado', 'Sonolência', 'Pobre interação com familiares', 'Letargia'], 3);

  y = drawSectionHeader(doc, y, 'Suspeita de Sepse');
  y = drawCheckboxGroup(doc, y, ['Sim', 'Não'], 2);
  y = drawFieldRow(doc, y, [{ label: 'Motivo', width: 3 }, { label: 'Horário', width: 2 }]);

  y = drawSectionHeader(doc, y, 'Foco Infeccioso');
  y = drawCheckboxGroup(doc, y, ['Pulmonar', 'Urinário', 'Abdominal', 'Pele/Partes Moles', 'Corrente Sanguínea/Cateter', 'Sem foco definido'], 3);

  y = drawSectionHeader(doc, y, 'Kit Sepse / Laboratório');
  y = drawCheckboxGroup(doc, y, ['Kit Sepse coletado'], 1);
  y = drawFieldRow(doc, y, [{ label: 'Lab Villac — Horário chamado', width: 2 }, { label: 'Lab Villac — Horário coleta', width: 2 }]);

  y = drawSectionHeader(doc, y, 'Antibioticoterapia');
  y = drawSubtitle(doc, y, 'ATB 1');
  y = drawFieldRow(doc, y, [{ label: 'Nome', width: 3 }, { label: 'Data', width: 1 }, { label: 'Dose', width: 1 }, { label: 'Horário Início', width: 2 }]);
  y = drawSubtitle(doc, y, 'ATB 2');
  y = drawFieldRow(doc, y, [{ label: 'Nome', width: 3 }, { label: 'Data', width: 1 }, { label: 'Dose', width: 1 }, { label: 'Horário Início', width: 2 }]);
  y = drawFieldRow(doc, y, [{ label: 'Profissional Responsável', width: 3 }]);

  y = drawSectionHeader(doc, y, 'Choque Séptico');
  y = drawCheckboxGroup(doc, y, ['Choque séptico', 'Necessidade UTI'], 2);
  y = drawFieldRow(doc, y, [{ label: 'Reposição volêmica — Data/Hora', width: 2 }, { label: 'Reposição volêmica — Medicamento', width: 3 }]);
  y = drawFieldRow(doc, y, [{ label: 'Vasopressor — Data/Hora', width: 2 }, { label: 'Vasopressor — Medicamento', width: 3 }]);

  y = drawSectionHeader(doc, y, 'Destino e Assinaturas');
  y = drawFieldRow(doc, y, [{ label: 'Destino do Paciente', width: 3 }]);
  y = drawFieldRow(doc, y, [{ label: 'Assinatura Enfermeiro', width: 2 }, { label: 'Assinatura Médico', width: 2 }, { label: 'Assinatura Farmácia', width: 2 }]);

  savePdfWithFooter(doc, title, 'protocolo_sepse_pediatrico_branco', logoImg);
}

export async function exportSepsePediatricoWord() {
  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({ text: 'Protocolo Sepse Pediátrico', heading: HeadingLevel.HEADING_1, spacing: { after: 40 } }),
        new Paragraph({ spacing: { after: 200 }, children: [new TextRun({ text: `Formulário em Branco — Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`, size: 17, color: '78828E', font: 'Calibri' })] }),

        wordSection('Identificação do Paciente'),
        wordFieldRow(['Competência', 'Nº Prontuário']),
        wordFieldRow(['Nome do Paciente']),
        wordFieldRow(['Sexo', 'Idade']),

        wordSection('Indicador — Meta ≤ 1h'),
        wordFieldRow(['Hora de Chegada', 'Hora do ECG']),
        wordFieldRow(['Tempo Porta-ECG', 'Classificação de Risco']),
        wordFieldRow(['1º Atendimento Médico', 'Médico Responsável']),

        wordSection('Sinais Vitais'),
        wordFieldRow(['PA', 'FC', 'FR']),
        wordFieldRow(['SpO2', 'Temperatura']),

        wordSection('Achados Clínicos'),
        wordCheckboxList(['Desidratação', 'Dor abdominal', 'Disúria', 'Feridas cutâneas']),
        wordCheckboxList(['Desaturação', 'Alteração de perfusão', 'Palidez cutânea']),

        wordSection('Achados Neurológicos'),
        wordCheckboxList(['Irritabilidade', 'Agitação', 'Choro inapropriado']),
        wordCheckboxList(['Sonolência', 'Pobre interação com familiares', 'Letargia']),

        wordSection('Suspeita de Sepse'),
        wordCheckboxList(['Sim', 'Não']),
        wordFieldRow(['Motivo', 'Horário']),

        wordSection('Foco Infeccioso'),
        wordCheckboxList(['Pulmonar', 'Urinário', 'Abdominal']),
        wordCheckboxList(['Pele/Partes Moles', 'Corrente Sanguínea/Cateter', 'Sem foco definido']),

        wordSection('Kit Sepse / Laboratório'),
        wordCheckboxList(['Kit Sepse coletado']),
        wordFieldRow(['Lab Villac — Horário chamado', 'Lab Villac — Horário coleta']),

        wordSection('Antibioticoterapia'),
        wordSubtitle('ATB 1'),
        wordFieldRow(['Nome', 'Data']), wordFieldRow(['Dose', 'Horário Início']),
        wordSubtitle('ATB 2'),
        wordFieldRow(['Nome', 'Data']), wordFieldRow(['Dose', 'Horário Início']),
        wordFieldRow(['Profissional Responsável']),

        wordSection('Choque Séptico'),
        wordCheckboxList(['Choque séptico', 'Necessidade UTI']),
        wordFieldRow(['Reposição volêmica — Data/Hora', 'Medicamento']),
        wordFieldRow(['Vasopressor — Data/Hora', 'Medicamento']),

        wordSection('Destino e Assinaturas'),
        wordFieldRow(['Destino do Paciente']),
        wordFieldRow(['Assinatura Enfermeiro', 'Assinatura Médico']),
        wordFieldRow(['Assinatura Farmácia']),
      ],
    }],
  });
  const blob = await Packer.toBlob(doc);
  saveAs(blob, `protocolo_sepse_pediatrico_branco_${format(new Date(), 'yyyy-MM-dd')}.docx`);
}
