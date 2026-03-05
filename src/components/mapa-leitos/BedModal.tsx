import React, { useState, useEffect, useMemo } from 'react';
import { X, Save, Trash2, ArrowRightLeft } from 'lucide-react';
import { differenceInYears } from 'date-fns';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Bed, Patient, MotivoAlta, SECTORS } from '@/types/bed';

interface BedModalProps {
  bed: Bed | null;
  isOpen: boolean;
  onClose: () => void;
  onSave?: (bed: Bed, patient: Patient | null, isDischarge?: boolean) => void;
  sectorBeds?: Bed[];
  allBeds?: Bed[];
  onTransfer?: (fromBed: Bed, toBed: Bed) => void;
}

const emptyPatient: Patient = {
  nome: '',
  hipoteseDiagnostica: '',
  condutasOutros: '',
  observacao: '',
  dataNascimento: '',
  dataInternacao: '',
  susFacil: '',
  numeroSusFacil: '',
  cti: '',
  motivoAlta: '',
  estabelecimentoTransferencia: '',
};

export function BedModal({ bed, isOpen, onClose, onSave, sectorBeds = [], allBeds = [], onTransfer }: BedModalProps) {
  const [patient, setPatient] = useState<Patient>(emptyPatient);
  const [selectedTransferBed, setSelectedTransferBed] = useState<string>('');

  useEffect(() => {
    if (bed?.patient) {
      setPatient(bed.patient);
    } else {
      setPatient(emptyPatient);
    }
    setSelectedTransferBed('');
  }, [bed]);

  const calculatedAge = useMemo(() => {
    if (!patient.dataNascimento) return null;
    const birthDate = new Date(patient.dataNascimento);
    const today = new Date();
    return differenceInYears(today, birthDate);
  }, [patient.dataNascimento]);

  const handleChange = (field: keyof Patient, value: string) => {
    setPatient((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    if (!bed || !onSave) return;
    
    if (patient.motivoAlta === 'transferencia' && patient.estabelecimentoTransferencia.trim() === '') {
      return;
    }
    
    const hasData = patient.nome.trim() !== '';
    
    onSave(bed, hasData ? patient : null);
    onClose();
  };

  const handleDischarge = () => {
    if (!bed || !onSave) return;
    
    if (patient.motivoAlta === 'transferencia' && patient.estabelecimentoTransferencia.trim() === '') {
      return;
    }
    
    onSave(bed, { ...patient, dataAlta: new Date().toISOString() }, true);
    onClose();
  };

  const handleClearBed = () => {
    if (!bed || !onSave) return;
    onSave(bed, null);
    onClose();
  };

  const handleTransfer = () => {
    if (!bed || !selectedTransferBed || !onTransfer) return;
    const targetBed = [...sectorBeds, ...allBeds].find(b => b.id === selectedTransferBed);
    if (targetBed) {
      onTransfer(bed, targetBed);
      onClose();
    }
  };

  // Same-sector empty beds
  const sameSectorBeds = sectorBeds.filter(
    b => b.id !== bed?.id && b.patient === null
  );
  // Other sectors empty beds (all sectors except current)
  const otherSectorBeds = allBeds.filter(
    b => b.sector !== bed?.sector && b.patient === null
  );
  // Group other sector beds by sector
  const otherSectorGroups = otherSectorBeds.reduce<Record<string, Bed[]>>((acc, b) => {
    if (!acc[b.sector]) acc[b.sector] = [];
    acc[b.sector].push(b);
    return acc;
  }, {});
  const availableBedsForTransfer = [...sameSectorBeds, ...otherSectorBeds];

  if (!bed) return null;

  const isOccupied = bed.patient !== null;
  const bedLabel = typeof bed.number === 'string' ? bed.number : `Leito ${String(bed.number).padStart(2, '0')}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{bedLabel}</span>
            {isOccupied && (
              <span className="text-sm font-normal text-hospital-green">Ocupado</span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {onSave ? (
            <>
              {/* Full edit form for NIR/Admin */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Paciente *</Label>
                  <Input
                    id="nome"
                    value={patient.nome}
                    onChange={(e) => handleChange('nome', e.target.value)}
                    placeholder="Nome completo"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dataNascimento">Data de Nascimento</Label>
                  <div className="flex gap-2">
                    <Input
                      id="dataNascimento"
                      type="date"
                      value={patient.dataNascimento}
                      onChange={(e) => handleChange('dataNascimento', e.target.value)}
                      className="flex-1"
                    />
                    {calculatedAge !== null && (
                      <div className="flex items-center px-3 bg-muted rounded-md text-sm">
                        {calculatedAge} anos
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="dataInternacao">Data de Internação</Label>
                  <Input
                    id="dataInternacao"
                    type="date"
                    value={patient.dataInternacao}
                    onChange={(e) => handleChange('dataInternacao', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>SUS Fácil</Label>
                  <RadioGroup
                    value={patient.susFacil}
                    onValueChange={(value) => handleChange('susFacil', value)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="susFacilSim" />
                      <Label htmlFor="susFacilSim">Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="susFacilNao" />
                      <Label htmlFor="susFacilNao">Não</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              {patient.susFacil === 'sim' && (
                <div className="space-y-2">
                  <Label htmlFor="numeroSusFacil">Número SUS Fácil</Label>
                  <Input
                    id="numeroSusFacil"
                    value={patient.numeroSusFacil}
                    onChange={(e) => handleChange('numeroSusFacil', e.target.value)}
                    placeholder="Número do SUS Fácil"
                  />
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CTI</Label>
                  <RadioGroup
                    value={patient.cti}
                    onValueChange={(value) => handleChange('cti', value)}
                    className="flex gap-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="sim" id="ctiSim" />
                      <Label htmlFor="ctiSim">Sim</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="nao" id="ctiNao" />
                      <Label htmlFor="ctiNao">Não</Label>
                    </div>
                  </RadioGroup>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="hipoteseDiagnostica">Hipótese Diagnóstica</Label>
                <Textarea
                  id="hipoteseDiagnostica"
                  value={patient.hipoteseDiagnostica}
                  onChange={(e) => handleChange('hipoteseDiagnostica', e.target.value)}
                  placeholder="Descreva a hipótese diagnóstica"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="condutasOutros">Condutas / Outros</Label>
                <Textarea
                  id="condutasOutros"
                  value={patient.condutasOutros}
                  onChange={(e) => handleChange('condutasOutros', e.target.value)}
                  placeholder="Condutas adotadas e outras informações"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacao">Observações</Label>
                <Textarea
                  id="observacao"
                  value={patient.observacao}
                  onChange={(e) => handleChange('observacao', e.target.value)}
                  placeholder="Observações adicionais"
                  rows={2}
                />
              </div>

              {isOccupied && (
                <>
                  <div className="border-t pt-4">
                    <h3 className="font-semibold mb-4">Alta do Paciente</h3>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Motivo da Alta</Label>
                        <Select
                          value={patient.motivoAlta}
                          onValueChange={(value) => handleChange('motivoAlta', value as MotivoAlta)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o motivo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="alta-melhorada">Alta Melhorada</SelectItem>
                            <SelectItem value="evasao">Evasão</SelectItem>
                            <SelectItem value="transferencia">Transferência</SelectItem>
                            <SelectItem value="obito">Óbito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {patient.motivoAlta === 'transferencia' && (
                        <div className="space-y-2">
                          <Label htmlFor="estabelecimentoTransferencia">Estabelecimento de Transferência *</Label>
                          <Input
                            id="estabelecimentoTransferencia"
                            value={patient.estabelecimentoTransferencia}
                            onChange={(e) => handleChange('estabelecimentoTransferencia', e.target.value)}
                            placeholder="Nome do estabelecimento"
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {availableBedsForTransfer.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4" />
                        Transferir para outro leito
                      </h3>
                      <div className="flex gap-2">
                        <Select
                          value={selectedTransferBed}
                          onValueChange={setSelectedTransferBed}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o leito" />
                          </SelectTrigger>
                          <SelectContent>
                            {sameSectorBeds.length > 0 && (
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Mesmo setor</div>
                            )}
                            {sameSectorBeds.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                Leito {typeof b.number === 'string' ? b.number : String(b.number).padStart(2, '0')}
                              </SelectItem>
                            ))}
                            {Object.entries(otherSectorGroups).map(([sectorId, beds]) => {
                              const sectorConfig = SECTORS.find(s => s.id === sectorId);
                              return beds.length > 0 ? (
                                <React.Fragment key={sectorId}>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1">{sectorConfig?.name || sectorId}</div>
                                  {beds.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>
                                      Leito {typeof b.number === 'string' ? b.number : String(b.number).padStart(2, '0')} ({sectorConfig?.name || sectorId})
                                    </SelectItem>
                                  ))}
                                </React.Fragment>
                              ) : null;
                            })}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleTransfer}
                          disabled={!selectedTransferBed}
                          variant="outline"
                        >
                          <ArrowRightLeft className="w-4 h-4 mr-2" />
                          Transferir
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              {/* Read-only view for Enfermagem */}
              {isOccupied ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted-foreground">Paciente</p>
                      <p className="font-semibold">{patient.nome || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Idade</p>
                      <p className="font-semibold">{calculatedAge !== null ? `${calculatedAge} anos` : '-'}</p>
                    </div>
                  </div>
                  {patient.hipoteseDiagnostica && (
                    <div>
                      <p className="text-xs text-muted-foreground">Hipótese Diagnóstica</p>
                      <p className="text-sm">{patient.hipoteseDiagnostica}</p>
                    </div>
                  )}
                  {patient.condutasOutros && (
                    <div>
                      <p className="text-xs text-muted-foreground">Condutas</p>
                      <p className="text-sm">{patient.condutasOutros}</p>
                    </div>
                  )}
                  {patient.observacao && (
                    <div>
                      <p className="text-xs text-muted-foreground">Observações</p>
                      <p className="text-sm">{patient.observacao}</p>
                    </div>
                  )}

                  {/* Transfer section for enfermagem */}
                  {availableBedsForTransfer.length > 0 && (
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <ArrowRightLeft className="w-4 h-4" />
                        Transferir para outro leito
                      </h3>
                      <div className="flex gap-2">
                        <Select
                          value={selectedTransferBed}
                          onValueChange={setSelectedTransferBed}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Selecione o leito" />
                          </SelectTrigger>
                          <SelectContent>
                            {sameSectorBeds.length > 0 && (
                              <div className="px-2 py-1 text-xs font-semibold text-muted-foreground">Mesmo setor</div>
                            )}
                            {sameSectorBeds.map((b) => (
                              <SelectItem key={b.id} value={b.id}>
                                Leito {typeof b.number === 'string' ? b.number : String(b.number).padStart(2, '0')}
                              </SelectItem>
                            ))}
                            {Object.entries(otherSectorGroups).map(([sectorId, beds]) => {
                              const sectorConfig = SECTORS.find(s => s.id === sectorId);
                              return beds.length > 0 ? (
                                <React.Fragment key={sectorId}>
                                  <div className="px-2 py-1 text-xs font-semibold text-muted-foreground border-t mt-1 pt-1">{sectorConfig?.name || sectorId}</div>
                                  {beds.map((b) => (
                                    <SelectItem key={b.id} value={b.id}>
                                      Leito {typeof b.number === 'string' ? b.number : String(b.number).padStart(2, '0')} ({sectorConfig?.name || sectorId})
                                    </SelectItem>
                                  ))}
                                </React.Fragment>
                              ) : null;
                            })}
                          </SelectContent>
                        </Select>
                        <Button
                          onClick={handleTransfer}
                          disabled={!selectedTransferBed}
                          variant="outline"
                        >
                          <ArrowRightLeft className="w-4 h-4 mr-2" />
                          Transferir
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">Leito disponível</p>
              )}
            </>
          )}
        </div>

        <div className="flex justify-between gap-4 pt-4 border-t">
          <div className="flex gap-2">
            {onSave && isOccupied && (
              <>
                <Button variant="destructive" onClick={handleClearBed}>
                  <Trash2 className="w-4 h-4 mr-2" />
                  Limpar
                </Button>
                {patient.motivoAlta && (
                  <Button 
                    variant="outline" 
                    onClick={handleDischarge}
                    disabled={patient.motivoAlta === 'transferencia' && !patient.estabelecimentoTransferencia.trim()}
                  >
                    Registrar Alta
                  </Button>
                )}
              </>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              {onSave ? 'Cancelar' : 'Fechar'}
            </Button>
            {onSave && (
              <Button onClick={handleSave}>
                <Save className="w-4 h-4 mr-2" />
                Salvar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
