import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useImportedBIData, BIDadosMes } from '@/hooks/useImportedBIData';
import { Upload, Trash2, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface BIDataImportProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const BIDataImport: React.FC<BIDataImportProps> = ({ open, onOpenChange }) => {
  const { toast } = useToast();
  const { importarMes, dados, deletarMes } = useImportedBIData();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [jsonText, setJsonText] = useState('');
  
  const [form, setForm] = useState<Partial<BIDadosMes>>({
    mes: format(new Date(), 'yyyy-MM'),
    ano: new Date().getFullYear(),
    mes_numero: new Date().getMonth() + 1,
    
    // Operacionais
    ocupacao_leitos: 85,
    taxa_mortalidade: 2.5,
    tempo_medio_internacao: 5,
    eficiencia_operacional: 92,
    
    // Financeiros
    receita_total: 250000,
    custos_totais: 180000,
    resultado_operacional: 70000,
    margem_operacional: 28,
    
    // Qualidade
    conformidade_protocolos: 94,
    tempo_resposta_chamados: 120,
    incidentes_reportados: 3,
    satisfacao_paciente: 88,
    
    // RH
    total_colaboradores: 145,
    absenteismo: 2.8,
    rotatividade: 8.5,
    treinamentos_realizados: 12,
  });

  const handleImport = async () => {
    try {
      setIsSubmitting(true);
      
      if (!form.mes) {
        toast({
          title: 'Erro',
          description: 'Selecione um mês',
          variant: 'destructive',
        });
        return;
      }

      // Validar que todos os campos obrigatórios estão preenchidos
      const requiredFields = [
        'ocupacao_leitos', 'taxa_mortalidade', 'tempo_medio_internacao', 'eficiencia_operacional',
        'receita_total', 'custos_totais', 'resultado_operacional', 'margem_operacional',
        'conformidade_protocolos', 'tempo_resposta_chamados', 'incidentes_reportados', 'satisfacao_paciente',
        'total_colaboradores', 'absenteismo', 'rotatividade', 'treinamentos_realizados',
      ];

      for (const field of requiredFields) {
        if (form[field as keyof BIDadosMes] === undefined || form[field as keyof BIDadosMes] === null) {
          toast({
            title: 'Erro',
            description: `Campo ${field} não preenchido`,
            variant: 'destructive',
          });
          return;
        }
      }

      const dadosCompletos: BIDadosMes = {
        mes: form.mes,
        ano: form.ano || new Date().getFullYear(),
        mes_numero: form.mes_numero || new Date().getMonth() + 1,
        ocupacao_leitos: Number(form.ocupacao_leitos),
        taxa_mortalidade: Number(form.taxa_mortalidade),
        tempo_medio_internacao: Number(form.tempo_medio_internacao),
        eficiencia_operacional: Number(form.eficiencia_operacional),
        receita_total: Number(form.receita_total),
        custos_totais: Number(form.custos_totais),
        resultado_operacional: Number(form.resultado_operacional),
        margem_operacional: Number(form.margem_operacional),
        conformidade_protocolos: Number(form.conformidade_protocolos),
        tempo_resposta_chamados: Number(form.tempo_resposta_chamados),
        incidentes_reportados: Number(form.incidentes_reportados),
        satisfacao_paciente: Number(form.satisfacao_paciente),
        total_colaboradores: Number(form.total_colaboradores),
        absenteismo: Number(form.absenteismo),
        rotatividade: Number(form.rotatividade),
        treinamentos_realizados: Number(form.treinamentos_realizados),
        createdAt: new Date().toISOString(),
      };

      importarMes(dadosCompletos);
      
      toast({
        title: 'Sucesso',
        description: `Dados de ${form.mes} importados com sucesso!`,
      });

      setForm({
        mes: format(new Date(), 'yyyy-MM'),
        ano: new Date().getFullYear(),
        mes_numero: new Date().getMonth() + 1,
        ocupacao_leitos: 85,
        taxa_mortalidade: 2.5,
        tempo_medio_internacao: 5,
        eficiencia_operacional: 92,
        receita_total: 250000,
        custos_totais: 180000,
        resultado_operacional: 70000,
        margem_operacional: 28,
        conformidade_protocolos: 94,
        tempo_resposta_chamados: 120,
        incidentes_reportados: 3,
        satisfacao_paciente: 88,
        total_colaboradores: 145,
        absenteismo: 2.8,
        rotatividade: 8.5,
        treinamentos_realizados: 12,
      });
      
      setJsonText('');
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao importar dados',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImportJson = () => {
    try {
      const parsed = JSON.parse(jsonText) as BIDadosMes;
      importarMes(parsed);
      toast({
        title: 'Sucesso',
        description: 'Dados importados via JSON',
      });
      setJsonText('');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'JSON inválido',
        variant: 'destructive',
      });
    }
  };

  const updateFormField = (field: keyof BIDadosMes, value: any) => {
    setForm(prev => ({
      ...prev,
      [field]: value,
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Importar Dados BI do V3
          </DialogTitle>
          <DialogDescription>
            Insira os dados mensais do sistema V3 para atualizar o BI
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Dados Já Importados */}
          {dados.length > 0 && (
            <div>
              <Label className="text-base font-semibold">Dados Importados</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
                {dados.map(d => (
                  <Card key={d.mes} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <div>
                          <p className="font-medium">{d.mes}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {d.receita_total.toLocaleString('pt-BR')}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => {
                          deletarMes(d.mes);
                          toast({ title: 'Deletado', description: `Dados de ${d.mes} removidos` });
                        }}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Formulário de Importação */}
          <div className="space-y-4 pt-4">
            <Label className="text-base font-semibold">Importar Novo Mês</Label>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Mês *</Label>
                <Input
                  type="month"
                  value={form.mes || ''}
                  onChange={e => {
                    const [year, month] = e.target.value.split('-');
                    updateFormField('mes', e.target.value);
                    updateFormField('ano', parseInt(year));
                    updateFormField('mes_numero', parseInt(month));
                  }}
                />
              </div>

              {/* Operacionais */}
              <div>
                <Label>Ocupação de Leitos (%)*</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.ocupacao_leitos || ''}
                  onChange={e => updateFormField('ocupacao_leitos', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Taxa de Mortalidade (%)*</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.taxa_mortalidade || ''}
                  onChange={e => updateFormField('taxa_mortalidade', parseFloat(e.target.value))}
                />
              </div>

              <div>
                <Label>Tempo Médio de Internação (dias)*</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.tempo_medio_internacao || ''}
                  onChange={e => updateFormField('tempo_medio_internacao', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Eficiência Operacional (%)*</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.eficiencia_operacional || ''}
                  onChange={e => updateFormField('eficiencia_operacional', parseFloat(e.target.value))}
                />
              </div>

              {/* Financeiros */}
              <div>
                <Label>Receita Total (R$)*</Label>
                <Input
                  type="number"
                  value={form.receita_total || ''}
                  onChange={e => updateFormField('receita_total', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Custos Totais (R$)*</Label>
                <Input
                  type="number"
                  value={form.custos_totais || ''}
                  onChange={e => updateFormField('custos_totais', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Resultado Operacional (R$)*</Label>
                <Input
                  type="number"
                  value={form.resultado_operacional || ''}
                  onChange={e => updateFormField('resultado_operacional', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Margem Operacional (%)*</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.margem_operacional || ''}
                  onChange={e => updateFormField('margem_operacional', parseFloat(e.target.value))}
                />
              </div>

              {/* Qualidade */}
              <div>
                <Label>Conformidade de Protocolos (%)*</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.conformidade_protocolos || ''}
                  onChange={e => updateFormField('conformidade_protocolos', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Tempo de Resposta a Chamados (min)*</Label>
                <Input
                  type="number"
                  value={form.tempo_resposta_chamados || ''}
                  onChange={e => updateFormField('tempo_resposta_chamados', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Incidentes Reportados *</Label>
                <Input
                  type="number"
                  value={form.incidentes_reportados || ''}
                  onChange={e => updateFormField('incidentes_reportados', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Satisfação do Paciente (%)*</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.satisfacao_paciente || ''}
                  onChange={e => updateFormField('satisfacao_paciente', parseFloat(e.target.value))}
                />
              </div>

              {/* RH */}
              <div>
                <Label>Total de Colaboradores *</Label>
                <Input
                  type="number"
                  value={form.total_colaboradores || ''}
                  onChange={e => updateFormField('total_colaboradores', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Absenteísmo (%)*</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.absenteismo || ''}
                  onChange={e => updateFormField('absenteismo', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Rotatividade (%)*</Label>
                <Input
                  type="number"
                  step="0.1"
                  value={form.rotatividade || ''}
                  onChange={e => updateFormField('rotatividade', parseFloat(e.target.value))}
                />
              </div>
              <div>
                <Label>Treinamentos Realizados *</Label>
                <Input
                  type="number"
                  value={form.treinamentos_realizados || ''}
                  onChange={e => updateFormField('treinamentos_realizados', parseFloat(e.target.value))}
                />
              </div>
            </div>
          </div>

          {/* Opção de JSON */}
          <div className="space-y-2 border-t pt-4">
            <Label className="text-base font-semibold">Ou Cole JSON Completo</Label>
            <Textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder='{"mes": "2026-03", "ocupacao_leitos": 85, ...}'
              rows={4}
            />
            <Button
              variant="outline"
              onClick={handleImportJson}
              disabled={!jsonText.trim()}
              className="w-full"
            >
              Importar via JSON
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleImport} disabled={isSubmitting}>
            {isSubmitting ? 'Importando...' : 'Importar Dados'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
