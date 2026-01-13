import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Calendar, 
  Plus, 
  Users, 
  ListTodo, 
  Loader2, 
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { MinhaAgenda } from "./MinhaAgenda";
import { AgendaColaboradores } from "./AgendaColaboradores";
import { NovoItemDialog } from "./NovoItemDialog";

export const AgendaModule = () => {
  const { toast } = useToast();
  const { userId, isAdmin, isGestor } = useUserRole();
  const [isLoading, setIsLoading] = useState(true);
  const [pendentesCount, setPendentesCount] = useState(0);
  const [novoItemDialogOpen, setNovoItemDialogOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (userId) {
      fetchPendentesCount();
    }
  }, [userId]);

  const fetchPendentesCount = async () => {
    try {
      const { data, error } = await supabase.rpc('get_tarefas_pendentes_count', {
        _user_id: userId
      });
      
      if (error) throw error;
      setPendentesCount(data || 0);
    } catch (error) {
      console.error("Error fetching pendentes count:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    fetchPendentesCount();
  };

  const handleItemCreated = () => {
    setNovoItemDialogOpen(false);
    handleRefresh();
    toast({ title: "Sucesso", description: "Item criado com sucesso!" });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Calendar className="h-6 w-6" />
            Agenda
          </h2>
          <p className="text-muted-foreground">
            Gerencie suas tarefas, reuniões e anotações
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Atualizar
          </Button>
          <Button onClick={() => setNovoItemDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Anotação
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-2xl font-bold text-orange-500">{pendentesCount}</p>
              </div>
              <AlertCircle className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-2xl font-bold text-primary">-</p>
              </div>
              <Clock className="h-8 w-8 text-primary opacity-50" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold text-green-500">-</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="minha-agenda">
        <TabsList>
          <TabsTrigger value="minha-agenda">
            <ListTodo className="h-4 w-4 mr-2" />
            Minha Agenda
          </TabsTrigger>
          {(isAdmin || isGestor) && (
            <TabsTrigger value="colaboradores">
              <Users className="h-4 w-4 mr-2" />
              Agenda de Colaboradores
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="minha-agenda" className="mt-4">
          <MinhaAgenda key={refreshKey} />
        </TabsContent>

        {(isAdmin || isGestor) && (
          <TabsContent value="colaboradores" className="mt-4">
            <AgendaColaboradores key={refreshKey} onAtribuirTarefa={() => setNovoItemDialogOpen(true)} />
          </TabsContent>
        )}
      </Tabs>

      <NovoItemDialog 
        open={novoItemDialogOpen} 
        onOpenChange={setNovoItemDialogOpen}
        onSuccess={handleItemCreated}
      />
    </div>
  );
};
