import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  ClipboardCheck, Plus, Search, Clock, Users, TrendingUp, Timer, Thermometer
} from 'lucide-react';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';
import { ChecklistSinaisVitais } from './ChecklistSinaisVitais';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { toast } from 'sonner';

interface Classificacao {
  id: string;
  paciente: string;
  idade: string;
  sexo: string;
  queixaPrincipal: string;
  cor: 'vermelho' | 'laranja' | 'amarelo' | 'verde' | 'azul';
  sinaisVitais: string;
  enfermeiro: string;
  horaClassificacao: string;
  dataClassificacao: string;
  tempoEspera?: string;
  observacoes?: string;
}

const COR_CONFIG: Record<string, { label: string; descricao: string; tempo: string; classe: string }> = {
  vermelho: { label: 'Emergência', descricao: 'Atendimento imediato', tempo: '0 min', classe: 'bg-red-600 text-white' },
  laranja: { label: 'Muito Urgente', descricao: 'Até 10 minutos', tempo: '10 min', classe: 'bg-orange-500 text-white' },
  amarelo: { label: 'Urgente', descricao: 'Até 60 minutos', tempo: '60 min', classe: 'bg-yellow-400 text-yellow-900' },
  verde: { label: 'Pouco Urgente', descricao: 'Até 120 minutos', tempo: '120 min', classe: 'bg-green-500 text-white' },
  azul: { label: 'Não Urgente', descricao: 'Até 240 minutos', tempo: '240 min', classe: 'bg-blue-500 text-white' },
};

export function ClassificacaoArea() {
  const [classificacoes, setClassificacoes] = useLocalStorage<Classificacao[]>('enf-classificacao-registros', []);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroCor, setFiltroCor] = useState('todas');
  const [form, setForm] = useState({
    paciente: '', idade: '', sexo: 'M', queixaPrincipal: '', cor: 'verde' as Classificacao['cor'],
    sinaisVitais: '', enfermeiro: '', observacoes: ''
  });

  const hoje = new Date().toISOString().split('T')[0];
  const classificacoesHoje = classificacoes.filter(c => c.dataClassificacao === hoje);

  const filtradas = classificacoes.filter(c => {
    const matchBusca = c.paciente.toLowerCase().includes(busca.toLowerCase());
    const matchCor = filtroCor === 'todas' || c.cor === filtroCor;
    return matchBusca && matchCor;
  });

  const handleAdd = () => {
    if (!form.paciente || !form.queixaPrincipal || !form.enfermeiro) {
      toast.error('Paciente, queixa e enfermeiro são obrigatórios');
      return;
    }
    const now = new Date();
    const nova: Classificacao = {
      id: crypto.randomUUID(),
      ...form,
      horaClassificacao: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      dataClassificacao: now.toISOString().split('T')[0],
    };
    setClassificacoes([nova, ...classificacoes]);
    setForm({ paciente: '', idade: '', sexo: 'M', queixaPrincipal: '', cor: 'verde', sinaisVitais: '', enfermeiro: '', observacoes: '' });
    setDialogOpen(false);
    toast.success('Classificação registrada');
  };

  const countByCor = (cor: string) => classificacoesHoje.filter(c => c.cor === cor).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5 text-primary" />
            Classificação de Risco — Protocolo Manchester
          </h2>
          <p className="text-sm text-muted-foreground">Triagem e classificação de risco dos pacientes conforme protocolo Manchester</p>
        </div>
      </div>

      <Tabs defaultValue="classificacao">
        <TabsList>
          <TabsTrigger value="classificacao" className="gap-1"><ClipboardCheck className="h-4 w-4" />Classificação</TabsTrigger>
          <TabsTrigger value="sinais-vitais" className="gap-1"><Thermometer className="h-4 w-4" />Sinais Vitais</TabsTrigger>
        </TabsList>

        <TabsContent value="classificacao" className="mt-4 space-y-4">
      {/* Painel de cores */}
      <div className="grid grid-cols-5 gap-2">
        {Object.entries(COR_CONFIG).map(([cor, cfg]) => (
          <Card key={cor} className="overflow-hidden cursor-pointer hover:shadow-md transition-shadow" onClick={() => setFiltroCor(filtroCor === cor ? 'todas' : cor)}>
            <div className={`${cfg.classe} p-3 text-center ${filtroCor === cor ? 'ring-2 ring-ring ring-offset-2' : ''}`}>
              <p className="text-xs font-semibold">{cfg.label}</p>
              <p className="text-3xl font-bold">{countByCor(cor)}</p>
              <p className="text-xs opacity-80">{cfg.tempo}</p>
            </div>
          </Card>
        ))}
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Users className="h-8 w-8 text-primary opacity-70" />
          <div><p className="text-sm text-muted-foreground">Classificados Hoje</p><p className="text-2xl font-bold">{classificacoesHoje.length}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Timer className="h-8 w-8 text-destructive opacity-70" />
          <div><p className="text-sm text-muted-foreground">Emergências</p><p className="text-2xl font-bold">{countByCor('vermelho') + countByCor('laranja')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <TrendingUp className="h-8 w-8 text-warning opacity-70" />
          <div><p className="text-sm text-muted-foreground">Urgentes</p><p className="text-2xl font-bold">{countByCor('amarelo')}</p></div>
        </CardContent></Card>
        <Card><CardContent className="p-4 flex items-center gap-3">
          <Clock className="h-8 w-8 text-success opacity-70" />
          <div><p className="text-sm text-muted-foreground">Não Urgentes</p><p className="text-2xl font-bold">{countByCor('verde') + countByCor('azul')}</p></div>
        </CardContent></Card>
      </div>

      {/* Ações */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar paciente..." value={busca} onChange={e => setBusca(e.target.value)} className="pl-9" />
        </div>
        {filtroCor !== 'todas' && (
          <Button variant="outline" onClick={() => setFiltroCor('todas')}>Limpar Filtro</Button>
        )}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-1" />Nova Classificação</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader><DialogTitle>Classificação de Risco</DialogTitle></DialogHeader>
            <div className="space-y-3">
              <div><Label>Paciente</Label><Input value={form.paciente} onChange={e => setForm(p => ({ ...p, paciente: e.target.value }))} /></div>
              <div className="grid grid-cols-3 gap-3">
                <div><Label>Idade</Label><Input value={form.idade} onChange={e => setForm(p => ({ ...p, idade: e.target.value }))} placeholder="Ex: 45 anos" /></div>
                <div><Label>Sexo</Label>
                  <Select value={form.sexo} onValueChange={v => setForm(p => ({ ...p, sexo: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="M">Masculino</SelectItem>
                      <SelectItem value="F">Feminino</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Classificação</Label>
                  <Select value={form.cor} onValueChange={v => setForm(p => ({ ...p, cor: v as Classificacao['cor'] }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vermelho">🔴 Emergência</SelectItem>
                      <SelectItem value="laranja">🟠 Muito Urgente</SelectItem>
                      <SelectItem value="amarelo">🟡 Urgente</SelectItem>
                      <SelectItem value="verde">🟢 Pouco Urgente</SelectItem>
                      <SelectItem value="azul">🔵 Não Urgente</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div><Label>Queixa Principal</Label><Textarea value={form.queixaPrincipal} onChange={e => setForm(p => ({ ...p, queixaPrincipal: e.target.value }))} /></div>
              <div><Label>Sinais Vitais</Label><Input value={form.sinaisVitais} onChange={e => setForm(p => ({ ...p, sinaisVitais: e.target.value }))} placeholder="PA, FC, FR, Tax, SpO2" /></div>
              <div><Label>Enfermeiro Classificador</Label><Input value={form.enfermeiro} onChange={e => setForm(p => ({ ...p, enfermeiro: e.target.value }))} /></div>
              <div><Label>Observações</Label><Textarea value={form.observacoes} onChange={e => setForm(p => ({ ...p, observacoes: e.target.value }))} /></div>
              <Button onClick={handleAdd} className="w-full">Registrar Classificação</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabela */}
      <div className="rounded-md border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cor</TableHead>
              <TableHead>Paciente</TableHead>
              <TableHead>Idade</TableHead>
              <TableHead>Queixa</TableHead>
              <TableHead>Sinais Vitais</TableHead>
              <TableHead>Enfermeiro</TableHead>
              <TableHead>Hora</TableHead>
              <TableHead>Data</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtradas.length === 0 ? (
              <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground py-8">Nenhuma classificação encontrada</TableCell></TableRow>
            ) : filtradas.map(c => (
              <TableRow key={c.id}>
                <TableCell><Badge className={COR_CONFIG[c.cor].classe}>{COR_CONFIG[c.cor].label}</Badge></TableCell>
                <TableCell className="font-medium">{c.paciente}</TableCell>
                <TableCell>{c.idade}</TableCell>
                <TableCell className="max-w-[200px] truncate">{c.queixaPrincipal}</TableCell>
                <TableCell className="text-sm">{c.sinaisVitais || '—'}</TableCell>
                <TableCell>{c.enfermeiro}</TableCell>
                <TableCell className="font-mono">{c.horaClassificacao}</TableCell>
                <TableCell>{c.dataClassificacao}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
        </TabsContent>

        <TabsContent value="sinais-vitais" className="mt-4">
          <ChecklistSinaisVitais storageKey="enf-sinais-vitais-classificacao" setor="Classificação" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
