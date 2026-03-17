import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  ShieldAlert, Plus, Search, Printer, FileDown, Clock, CheckCircle2, AlertTriangle, Package
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

interface RegistroCarrinho {
  id: string;
  dataHora: string;
  lacreRetirado: string;
  motivo: 'verificacao_mensal' | 'auditoria' | 'reposicao' | 'urgencia';
  observacao: string;
  lacreColocado: string;
  responsavel: string;
  coren: string;
  itensVerificados: Record<string, boolean>;
}

// Itens padrão do carrinho de urgência conforme protocolo hospitalar
const ITENS_CARRINHO = [
  {
    categoria: 'Medicamentos - Via Aérea e Ventilação',
    itens: [
      { codigo: 'MED-01', descricao: 'Adrenalina 1mg/mL - Ampola', qtdMinima: 10 },
      { codigo: 'MED-02', descricao: 'Atropina 0,25mg/mL - Ampola', qtdMinima: 10 },
      { codigo: 'MED-03', descricao: 'Amiodarona 50mg/mL - Ampola', qtdMinima: 6 },
      { codigo: 'MED-04', descricao: 'Lidocaína 2% s/ vasoconstrictor - Frasco', qtdMinima: 2 },
      { codigo: 'MED-05', descricao: 'Adenosina 3mg/mL - Ampola', qtdMinima: 6 },
    ]
  },
  {
    categoria: 'Medicamentos - Sedação e Analgesia',
    itens: [
      { codigo: 'MED-06', descricao: 'Midazolam 5mg/mL - Ampola', qtdMinima: 5 },
      { codigo: 'MED-07', descricao: 'Fentanil 50mcg/mL - Ampola', qtdMinima: 5 },
      { codigo: 'MED-08', descricao: 'Etomidato 2mg/mL - Ampola', qtdMinima: 3 },
      { codigo: 'MED-09', descricao: 'Succinilcolina 100mg - Frasco', qtdMinima: 3 },
      { codigo: 'MED-10', descricao: 'Rocurônio 10mg/mL - Frasco', qtdMinima: 3 },
    ]
  },
  {
    categoria: 'Medicamentos - Suporte Hemodinâmico',
    itens: [
      { codigo: 'MED-11', descricao: 'Noradrenalina 2mg/mL - Ampola', qtdMinima: 5 },
      { codigo: 'MED-12', descricao: 'Dobutamina 250mg - Ampola', qtdMinima: 3 },
      { codigo: 'MED-13', descricao: 'Furosemida 10mg/mL - Ampola', qtdMinima: 10 },
      { codigo: 'MED-14', descricao: 'Gluconato de Cálcio 10% - Ampola', qtdMinima: 5 },
      { codigo: 'MED-15', descricao: 'Bicarbonato de Sódio 8,4% - Ampola', qtdMinima: 10 },
    ]
  },
  {
    categoria: 'Soluções',
    itens: [
      { codigo: 'SOL-01', descricao: 'SF 0,9% 250mL', qtdMinima: 4 },
      { codigo: 'SOL-02', descricao: 'SF 0,9% 500mL', qtdMinima: 2 },
      { codigo: 'SOL-03', descricao: 'SG 5% 250mL', qtdMinima: 2 },
      { codigo: 'SOL-04', descricao: 'Ringer Lactato 500mL', qtdMinima: 2 },
      { codigo: 'SOL-05', descricao: 'Água destilada 10mL - Ampola', qtdMinima: 20 },
    ]
  },
  {
    categoria: 'Materiais - Via Aérea',
    itens: [
      { codigo: 'MAT-01', descricao: 'Tubo orotraqueal nº 7.0', qtdMinima: 1 },
      { codigo: 'MAT-02', descricao: 'Tubo orotraqueal nº 7.5', qtdMinima: 1 },
      { codigo: 'MAT-03', descricao: 'Tubo orotraqueal nº 8.0', qtdMinima: 1 },
      { codigo: 'MAT-04', descricao: 'Cânula de Guedel (kit tamanhos)', qtdMinima: 1 },
      { codigo: 'MAT-05', descricao: 'Laringoscópio com lâminas 3 e 4', qtdMinima: 1 },
      { codigo: 'MAT-06', descricao: 'Guia/Fio-guia para IOT', qtdMinima: 1 },
      { codigo: 'MAT-07', descricao: 'Máscara laríngea nº 3 e 4', qtdMinima: 1 },
      { codigo: 'MAT-08', descricao: 'Ambu adulto com reservatório', qtdMinima: 1 },
    ]
  },
  {
    categoria: 'Materiais - Acesso Vascular',
    itens: [
      { codigo: 'MAT-09', descricao: 'Jelco nº 14, 16, 18, 20', qtdMinima: 2 },
      { codigo: 'MAT-10', descricao: 'Seringa 10mL', qtdMinima: 10 },
      { codigo: 'MAT-11', descricao: 'Seringa 20mL', qtdMinima: 5 },
      { codigo: 'MAT-12', descricao: 'Equipo macrogotas', qtdMinima: 4 },
      { codigo: 'MAT-13', descricao: 'Equipo microgotas', qtdMinima: 2 },
      { codigo: 'MAT-14', descricao: 'Torneira 3 vias', qtdMinima: 3 },
    ]
  },
  {
    categoria: 'Equipamentos',
    itens: [
      { codigo: 'EQP-01', descricao: 'Desfibrilador/Cardioversor (testado)', qtdMinima: 1 },
      { codigo: 'EQP-02', descricao: 'Pás/Eletrodos de desfibrilação', qtdMinima: 1 },
      { codigo: 'EQP-03', descricao: 'Monitor multiparâmetro (funcional)', qtdMinima: 1 },
      { codigo: 'EQP-04', descricao: 'Oxímetro de pulso', qtdMinima: 1 },
      { codigo: 'EQP-05', descricao: 'Tábua de massagem cardíaca', qtdMinima: 1 },
    ]
  },
];

const MOTIVOS = [
  { value: 'verificacao_mensal', label: 'Verificação Mensal' },
  { value: 'auditoria', label: 'Auditoria' },
  { value: 'reposicao', label: 'Reposição' },
  { value: 'urgencia', label: 'Urgência' },
];

export function ChecklistCarrinhoUrgencia() {
  const [registros, setRegistros] = useLocalStorage<RegistroCarrinho[]>('enf-checklist-carrinho', []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [detalhesOpen, setDetalhesOpen] = useState<string | null>(null);

  const [form, setForm] = useState({
    lacreRetirado: '',
    motivo: 'verificacao_mensal' as RegistroCarrinho['motivo'],
    observacao: '',
    lacreColocado: '',
    responsavel: '',
    coren: '',
    itensVerificados: {} as Record<string, boolean>,
  });

  const todosItens = ITENS_CARRINHO.flatMap(cat => cat.itens);
  const totalItens = todosItens.length;
  const itensChecados = Object.values(form.itensVerificados).filter(Boolean).length;

  const handleMarcarTodos = (categoria: string) => {
    const itensCat = ITENS_CARRINHO.find(c => c.categoria === categoria)?.itens || [];
    const novos = { ...form.itensVerificados };
    const todosJaMarcados = itensCat.every(i => novos[i.codigo]);
    itensCat.forEach(i => { novos[i.codigo] = !todosJaMarcados; });
    setForm(p => ({ ...p, itensVerificados: novos }));
  };

  const handleSalvar = () => {
    if (!form.responsavel || !form.coren || !form.lacreColocado) {
      toast.error('Responsável, COREN e nº do lacre colocado são obrigatórios');
      return;
    }
    if (itensChecados < totalItens) {
      const confirmar = confirm(`Atenção: ${totalItens - itensChecados} itens NÃO foram verificados. Deseja continuar mesmo assim?`);
      if (!confirmar) return;
    }
    const novo: RegistroCarrinho = {
      id: crypto.randomUUID(),
      dataHora: new Date().toLocaleString('pt-BR'),
      ...form,
    };
    setRegistros([novo, ...registros]);
    setForm({
      lacreRetirado: '', motivo: 'verificacao_mensal', observacao: '',
      lacreColocado: '', responsavel: '', coren: '', itensVerificados: {},
    });
    setDialogOpen(false);
    toast.success('Checklist do carrinho registrado com sucesso');
  };

  const registrosFiltrados = registros.filter(r =>
    r.responsavel.toLowerCase().includes(busca.toLowerCase()) ||
    r.lacreColocado.includes(busca) ||
    r.lacreRetirado.includes(busca)
  );

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-destructive" />
            Checklist do Carrinho de Urgência
          </h3>
          <p className="text-sm text-muted-foreground">POP SURG 020 — Controle de lacres, verificação e reposição de materiais</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <CheckCircle2 className="h-8 w-8 text-success opacity-70" />
          <div><p className="text-sm text-muted-foreground">Verificações</p><p className="text-2xl font-bold">{registros.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Última Verificação</p><p className="text-sm font-medium">{registros[0]?.dataHora || '—'}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-warning opacity-70" />
          <div><p className="text-sm text-muted-foreground">Urgências</p><p className="text-2xl font-bold">{registros.filter(r => r.motivo === 'urgencia').length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Package className="h-8 w-8 text-info opacity-70" />
          <div><p className="text-sm text-muted-foreground">Total de Itens</p><p className="text-2xl font-bold">{totalItens}</p></div>
        </CardContent></Card>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar por responsável ou lacre..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Nova Verificação</Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-destructive" />
                Checklist do Carrinho de Urgência — POP SURG 020
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {/* Cabeçalho do registro */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div>
                      <Label>Data/Hora</Label>
                      <Input value={new Date().toLocaleString('pt-BR')} disabled className="bg-muted" />
                    </div>
                    <div>
                      <Label>Nº Lacre Retirado</Label>
                      <Input value={form.lacreRetirado} onChange={e => setForm(p => ({ ...p, lacreRetirado: e.target.value }))} placeholder="000000" />
                    </div>
                    <div>
                      <Label>Motivo</Label>
                      <Select value={form.motivo} onValueChange={v => setForm(p => ({ ...p, motivo: v as any }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {MOTIVOS.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Nº Lacre Colocado</Label>
                      <Input value={form.lacreColocado} onChange={e => setForm(p => ({ ...p, lacreColocado: e.target.value }))} placeholder="000000" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Checklist por categorias */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">Itens Verificados: {itensChecados}/{totalItens}</p>
                  <div className="h-2 w-48 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${totalItens > 0 ? (itensChecados / totalItens) * 100 : 0}%` }}
                    />
                  </div>
                </div>

                {ITENS_CARRINHO.map(cat => {
                  const catChecados = cat.itens.filter(i => form.itensVerificados[i.codigo]).length;
                  const todosChecados = catChecados === cat.itens.length;
                  return (
                    <Card key={cat.categoria}>
                      <CardHeader className="py-3 px-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-sm">{cat.categoria}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant={todosChecados ? 'default' : 'secondary'} className={todosChecados ? 'bg-green-600' : ''}>
                              {catChecados}/{cat.itens.length}
                            </Badge>
                            <Button size="sm" variant="outline" onClick={() => handleMarcarTodos(cat.categoria)} className="text-xs h-7">
                              {todosChecados ? 'Desmarcar' : 'Marcar todos'}
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 pb-3">
                        <div className="space-y-1">
                          {cat.itens.map(item => (
                            <div key={item.codigo} className="flex items-center gap-3 p-1.5 rounded hover:bg-muted/50">
                              <Checkbox
                                checked={!!form.itensVerificados[item.codigo]}
                                onCheckedChange={() => {
                                  setForm(p => ({
                                    ...p,
                                    itensVerificados: { ...p.itensVerificados, [item.codigo]: !p.itensVerificados[item.codigo] }
                                  }));
                                }}
                              />
                              <span className="font-mono text-xs text-muted-foreground w-16">{item.codigo}</span>
                              <span className={`flex-1 text-sm ${form.itensVerificados[item.codigo] ? 'text-muted-foreground line-through' : ''}`}>
                                {item.descricao}
                              </span>
                              <span className="text-xs text-muted-foreground">Mín: {item.qtdMinima}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              {/* Rodapé */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div><Label>Observação</Label><Textarea value={form.observacao} onChange={e => setForm(p => ({ ...p, observacao: e.target.value }))} placeholder="Itens em falta, validades vencidas, equipamentos com defeito..." /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><Label>Responsável (Nome completo)</Label><Input value={form.responsavel} onChange={e => setForm(p => ({ ...p, responsavel: e.target.value }))} /></div>
                    <div><Label>COREN / Carimbo</Label><Input value={form.coren} onChange={e => setForm(p => ({ ...p, coren: e.target.value }))} placeholder="COREN-MG 000000 ENF" /></div>
                  </div>
                  <Button onClick={handleSalvar} className="w-full" size="lg">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Finalizar Verificação e Lacrar
                  </Button>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Histórico */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Data/Hora</TableHead>
              <TableHead>Lacre Retirado</TableHead>
              <TableHead>Motivo</TableHead>
              <TableHead>Observação</TableHead>
              <TableHead>Lacre Colocado</TableHead>
              <TableHead>Responsável</TableHead>
              <TableHead>COREN</TableHead>
              <TableHead>Itens</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {registrosFiltrados.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma verificação registrada</TableCell></TableRow>
            ) : registrosFiltrados.map(r => {
              const checados = Object.values(r.itensVerificados).filter(Boolean).length;
              return (
                <TableRow key={r.id} className="cursor-pointer hover:bg-muted/50" onClick={() => setDetalhesOpen(detalhesOpen === r.id ? null : r.id)}>
                  <TableCell className="font-mono text-sm">{r.dataHora}</TableCell>
                  <TableCell className="font-mono">{r.lacreRetirado || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={r.motivo === 'urgencia' ? 'border-destructive text-destructive' : ''}>
                      {MOTIVOS.find(m => m.value === r.motivo)?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="max-w-[200px] truncate">{r.observacao || '—'}</TableCell>
                  <TableCell className="font-mono">{r.lacreColocado}</TableCell>
                  <TableCell>{r.responsavel}</TableCell>
                  <TableCell className="text-sm">{r.coren}</TableCell>
                  <TableCell>
                    <Badge className={checados === totalItens ? 'bg-green-600' : 'bg-yellow-500'}>
                      {checados}/{totalItens}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
