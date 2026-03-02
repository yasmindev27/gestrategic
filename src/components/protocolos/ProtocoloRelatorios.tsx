import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Search, FileText, Loader2 } from 'lucide-react';
import { useProtocoloAtendimentos, TipoProtocolo } from '@/hooks/useProtocoloAtendimentos';
import { format } from 'date-fns';
import { ExportDropdown } from '@/components/ui/export-dropdown';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface Props {
  tipo: TipoProtocolo;
  titulo: string;
  onBack: () => void;
}

const tipoLabels: Record<string, string> = {
  dor_toracica: 'Dor Torácica',
  sepse_adulto: 'Sepse Adulto',
  sepse_pediatrico: 'Sepse Pediátrico',
};

export const ProtocoloRelatorios = ({ tipo, titulo, onBack }: Props) => {
  const { data: atendimentos, isLoading } = useProtocoloAtendimentos(tipo);
  const [search, setSearch] = useState('');

  const filtered = (atendimentos || []).filter((a: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      a.patient_name?.toLowerCase().includes(s) ||
      a.record_number?.toLowerCase().includes(s) ||
      a.competency?.toLowerCase().includes(s)
    );
  });

  const exportExcel = () => {
    const data = filtered.map((a: any) => ({
      'Prontuário': a.record_number || '-',
      'Paciente': a.patient_name || '-',
      'Chegada': a.arrival_time ? format(new Date(a.arrival_time), 'dd/MM/yyyy HH:mm') : '-',
      'Tempo Porta-ECG (min)': a.porta_ecg_minutes ?? '-',
      'Dentro da Meta': a.within_target ? 'Sim' : 'Não',
      'Competência': a.competency || '-',
      'Classificação de Risco': a.risk_classification || '-',
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Relatório');
    XLSX.writeFile(wb, `relatorio_${tipo}_${format(new Date(), 'ddMMyyyy')}.xlsx`);
  };

  const exportPDF = () => {
    const doc = new jsPDF('landscape');
    doc.setFontSize(14);
    doc.text(`Relatório - ${tipoLabels[tipo]}`, 14, 20);
    doc.setFontSize(10);
    doc.text(`Total: ${filtered.length} atendimentos`, 14, 28);

    autoTable(doc, {
      startY: 34,
      head: [['Prontuário', 'Paciente', 'Chegada', 'Tempo (min)', 'Meta', 'Competência', 'Risco']],
      body: filtered.map((a: any) => [
        a.record_number || '-',
        a.patient_name || '-',
        a.arrival_time ? format(new Date(a.arrival_time), 'dd/MM/yyyy HH:mm') : '-',
        a.porta_ecg_minutes ?? '-',
        a.within_target ? 'Sim' : 'Não',
        a.competency || '-',
        a.risk_classification || '-',
      ]),
      styles: { fontSize: 7 },
      headStyles: { fillColor: [59, 130, 246] },
    });
    doc.save(`relatorio_${tipo}_${format(new Date(), 'ddMMyyyy')}.pdf`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Relatórios — {tipoLabels[tipo]}</h2>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <CardTitle className="text-base">Atendimentos Registrados</CardTitle>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar paciente ou prontuário..."
                  className="pl-8 w-64"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <ExportDropdown onExportExcel={exportExcel} onExportPDF={exportPDF} disabled={filtered.length === 0} />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-3 opacity-40" />
              <p>Nenhum atendimento encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prontuário</TableHead>
                  <TableHead>Paciente</TableHead>
                  <TableHead>Chegada</TableHead>
                  <TableHead>Tempo (min)</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead>Competência</TableHead>
                  <TableHead>Classificação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((a: any) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.record_number || '-'}</TableCell>
                    <TableCell>{a.patient_name || '-'}</TableCell>
                    <TableCell className="text-sm">
                      {a.arrival_time ? format(new Date(a.arrival_time), 'dd/MM/yyyy HH:mm') : '-'}
                    </TableCell>
                    <TableCell>
                      <span className={a.porta_ecg_minutes != null && a.porta_ecg_minutes <= 10 ? 'text-emerald-600 font-medium' : a.porta_ecg_minutes != null ? 'text-destructive font-medium' : ''}>
                        {a.porta_ecg_minutes ?? '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={a.within_target ? 'default' : 'destructive'}>
                        {a.within_target ? 'Sim' : 'Não'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.competency || '-'}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{a.risk_classification || '-'}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
