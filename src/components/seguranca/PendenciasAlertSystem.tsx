import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Pendencia {
  id: string;
  descricao: string;
  registrado_por_nome: string;
  data_hora_registro: string;
  status: string;
}

interface Notificacao {
  id: string;
  pendencia_id: string;
  titulo: string;
  mensagem: string;
  lida: boolean;
  respondida: boolean;
  created_at: string;
}

export function PendenciasAlertSystem() {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [alertDialogOpen, setAlertDialogOpen] = useState(false);
  const [currentPendencia, setCurrentPendencia] = useState<Pendencia | null>(null);
  const [observacao, setObservacao] = useState('');
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');

  const loadPendencias = useCallback(async () => {
    if (!userId) return;
    
    const { data } = await supabase
      .from('passagem_plantao_pendencias')
      .select('*')
      .eq('destinatario_id', userId)
      .eq('status', 'pendente')
      .order('data_hora_registro', { ascending: false });
    
    if (data) setPendencias(data as Pendencia[]);
  }, [userId]);

  const loadNotificacoes = useCallback(async () => {
    if (!userId) return;
    
    const { data } = await supabase
      .from('notificacoes_pendencias')
      .select('*')
      .eq('destinatario_id', userId)
      .eq('respondida', false)
      .order('created_at', { ascending: false });
    
    if (data) setNotificacoes(data as Notificacao[]);
  }, [userId]);

  // Get current user
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name')
          .eq('user_id', user.id)
          .single();
        setUserName(profile?.full_name || user.email || '');
      }
    };
    getUser();
  }, []);

  // Load data and set up polling
  useEffect(() => {
    if (!userId) return;
    
    loadPendencias();
    loadNotificacoes();

    // Poll every 30 seconds for new notifications
    const interval = setInterval(() => {
      loadPendencias();
      loadNotificacoes();
    }, 30000);

    return () => clearInterval(interval);
  }, [userId, loadPendencias, loadNotificacoes]);

  // Subscribe to realtime notifications
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel('pendencias-notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes_pendencias',
          filter: `destinatario_id=eq.${userId}`,
        },
        () => {
          loadNotificacoes();
          loadPendencias();
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, loadNotificacoes, loadPendencias]);

  // Show alert dialog when there are unread notifications
  useEffect(() => {
    const unread = notificacoes.filter(n => !n.lida);
    if (unread.length > 0 && !alertDialogOpen && pendencias.length > 0) {
      // Show alert for the first unread
      const notif = unread[0];
      const pendencia = pendencias.find(p => p.id === notif.pendencia_id);
      if (pendencia) {
        setCurrentPendencia(pendencia);
        setAlertDialogOpen(true);
        // Mark as read
        supabase.from('notificacoes_pendencias').update({ lida: true }).eq('id', notif.id).then();
      }
    }
  }, [notificacoes, pendencias, alertDialogOpen]);

  // Show periodic toast reminders for pending items
  useEffect(() => {
    if (pendencias.length === 0) return;

    const reminderInterval = setInterval(() => {
      if (pendencias.length > 0 && !alertDialogOpen) {
        toast.warning(
          `⚠️ Você tem ${pendencias.length} pendência(s) de plantão aguardando resolução!`,
          {
            duration: 8000,
            action: {
              label: 'Ver',
              onClick: () => {
                if (pendencias[0]) {
                  setCurrentPendencia(pendencias[0]);
                  setAlertDialogOpen(true);
                }
              },
            },
          }
        );
      }
    }, 120000); // Remind every 2 minutes

    return () => clearInterval(reminderInterval);
  }, [pendencias, alertDialogOpen]);

  const handleResolver = async () => {
    if (!currentPendencia || !userId) return;

    const now = new Date().toISOString();

    await supabase.from('passagem_plantao_pendencias').update({
      status: 'resolvida',
      data_hora_resolucao: now,
      resolvido_por_id: userId,
      resolvido_por_nome: userName,
    }).eq('id', currentPendencia.id);

    // Mark related notification as responded
    await supabase.from('notificacoes_pendencias').update({
      respondida: true,
    }).eq('pendencia_id', currentPendencia.id);

    toast.success('Pendência resolvida com sucesso!');
    setAlertDialogOpen(false);
    setCurrentPendencia(null);
    setObservacao('');
    loadPendencias();
    loadNotificacoes();
  };

  const handleProxima = () => {
    setAlertDialogOpen(false);
    setCurrentPendencia(null);
    // Show next pendencia if any
    setTimeout(() => {
      const remaining = pendencias.filter(p => p.id !== currentPendencia?.id);
      if (remaining.length > 0) {
        setCurrentPendencia(remaining[0]);
        setAlertDialogOpen(true);
      }
    }, 500);
  };

  if (pendencias.length === 0) return null;

  return (
    <>
      {/* Floating badge indicator */}
      <div className="fixed bottom-20 right-6 z-50">
        <Button
          onClick={() => {
            if (pendencias[0]) {
              setCurrentPendencia(pendencias[0]);
              setAlertDialogOpen(true);
            }
          }}
          className="rounded-full h-14 w-14 p-0 shadow-lg animate-pulse bg-destructive hover:bg-destructive/90"
        >
          <div className="relative">
            <AlertTriangle className="h-6 w-6 text-destructive-foreground" />
            <span className="absolute -top-2 -right-2 bg-primary text-primary-foreground text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {pendencias.length}
            </span>
          </div>
        </Button>
      </div>

      {/* Alert Dialog */}
      <Dialog open={alertDialogOpen} onOpenChange={setAlertDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Pendência de Plantão — Ação Obrigatória
            </DialogTitle>
          </DialogHeader>

          {currentPendencia && (
            <div className="space-y-4">
              <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4 space-y-2">
                <p className="font-medium text-foreground">{currentPendencia.descricao}</p>
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Registrada: {format(new Date(currentPendencia.data_hora_registro), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                  </span>
                  <span>Por: {currentPendencia.registrado_por_nome}</span>
                </div>
                <Badge variant="destructive" className="text-xs">
                  Aguardando resolução
                </Badge>
              </div>

              <p className="text-sm text-muted-foreground">
                Restam <strong>{pendencias.length}</strong> pendência(s) para resolver.
              </p>
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={handleProxima}>
              Ver Próxima
            </Button>
            <Button onClick={handleResolver} className="gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Marcar como Resolvida
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
