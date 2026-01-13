import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Calendar, Users } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Colaborador {
  user_id: string;
  full_name: string;
  cargo: string | null;
  setor: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  preSelectedUser?: Colaborador | null;
}

export const NovoItemDialog = ({ open, onOpenChange, onSuccess, preSelectedUser }: Props) => {
  const { toast } = useToast();
  const { userId, isAdmin, isGestor } = useUserRole();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);

  const [formData, setFormData] = useState({
    tipo: "tarefa",
    titulo: "",
    descricao: "",
    data_inicio: "",
    hora: "",
    prioridade: "media",
  });

  useEffect(() => {
    if (open) {
      fetchColaboradores();
      // Reset form
      setFormData({
        tipo: "tarefa",
        titulo: "",
        descricao: "",
        data_inicio: new Date().toISOString().split("T")[0],
        hora: "",
        prioridade: "media",
      });
      
      if (preSelectedUser) {
        setSelectedUsers([preSelectedUser.user_id]);
      } else {
        setSelectedUsers([userId || ""]);
      }
    }
  }, [open, preSelectedUser, userId]);

  const fetchColaboradores = async () => {
    setIsLoadingUsers(true);
    try {
      if (isAdmin) {
        const { data, error } = await supabase
          .from("profiles")
          .select("user_id, full_name, cargo, setor")
          .order("full_name");

        if (error) throw error;
        setColaboradores(data || []);
      } else if (isGestor) {
        const { data, error } = await supabase.rpc("get_usuarios_sob_gestao", {
          _gestor_id: userId
        });

        if (error) throw error;
        
        // Also include self
        const { data: selfData } = await supabase
          .from("profiles")
          .select("user_id, full_name, cargo, setor")
          .eq("user_id", userId)
          .single();

        const allUsers = [...(data || [])];
        if (selfData && !allUsers.find(u => u.user_id === selfData.user_id)) {
          allUsers.unshift(selfData);
        }
        
        setColaboradores(allUsers);
      } else {
        // Regular user can only assign to self
        const { data } = await supabase
          .from("profiles")
          .select("user_id, full_name, cargo, setor")
          .eq("user_id", userId)
          .single();

        if (data) {
          setColaboradores([data]);
        }
      }
    } catch (error) {
      console.error("Error fetching colaboradores:", error);
    } finally {
      setIsLoadingUsers(false);
    }
  };

  const toggleUser = (userId: string) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSubmit = async () => {
    if (!formData.titulo.trim()) {
      toast({
        title: "Erro",
        description: "O título é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.data_inicio) {
      toast({
        title: "Erro",
        description: "A data é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    if (selectedUsers.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um destinatário.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Create the agenda item
      const { data: item, error: itemError } = await supabase
        .from("agenda_items")
        .insert({
          tipo: formData.tipo,
          titulo: formData.titulo,
          descricao: formData.descricao || null,
          data_inicio: formData.data_inicio,
          hora: formData.hora || null,
          prioridade: formData.prioridade,
          criado_por: userId,
        })
        .select()
        .single();

      if (itemError) throw itemError;

      // Add destinatários
      const destinatarios = selectedUsers.map(uid => ({
        agenda_item_id: item.id,
        usuario_id: uid,
      }));

      const { error: destError } = await supabase
        .from("agenda_destinatarios")
        .insert(destinatarios);

      if (destError) throw destError;

      onSuccess();
    } catch (error: unknown) {
      console.error("Error creating item:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar item.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            {formData.tipo === "tarefa" ? "Nova Tarefa" : formData.tipo === "reuniao" ? "Nova Reunião" : "Nova Anotação"}
          </DialogTitle>
          <DialogDescription>
            Crie um novo item na agenda
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Tipo *</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value) => setFormData({ ...formData, tipo: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tarefa">Tarefa</SelectItem>
                <SelectItem value="reuniao">Reunião</SelectItem>
                <SelectItem value="anotacao">Anotação</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Título *</Label>
            <Input
              value={formData.titulo}
              onChange={(e) => setFormData({ ...formData, titulo: e.target.value })}
              placeholder="Título do item"
            />
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={formData.descricao}
              onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
              placeholder="Descrição detalhada (opcional)"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data *</Label>
              <Input
                type="date"
                value={formData.data_inicio}
                onChange={(e) => setFormData({ ...formData, data_inicio: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Hora</Label>
              <Input
                type="time"
                value={formData.hora}
                onChange={(e) => setFormData({ ...formData, hora: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select
              value={formData.prioridade}
              onValueChange={(value) => setFormData({ ...formData, prioridade: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="baixa">Baixa</SelectItem>
                <SelectItem value="media">Média</SelectItem>
                <SelectItem value="alta">Alta</SelectItem>
                <SelectItem value="urgente">Urgente</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Destinatário(s) *
            </Label>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-4">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
            ) : (
              <ScrollArea className="h-40 border rounded-md p-3">
                <div className="space-y-2">
                  {colaboradores.map((colab) => (
                    <div key={colab.user_id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`user-${colab.user_id}`}
                        checked={selectedUsers.includes(colab.user_id)}
                        onCheckedChange={() => toggleUser(colab.user_id)}
                      />
                      <label
                        htmlFor={`user-${colab.user_id}`}
                        className="text-sm cursor-pointer flex-1"
                      >
                        <span className="font-medium">{colab.full_name}</span>
                        {(colab.cargo || colab.setor) && (
                          <span className="text-muted-foreground ml-2">
                            ({colab.cargo || "-"} • {colab.setor || "-"})
                          </span>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            )}
            <p className="text-xs text-muted-foreground">
              {selectedUsers.length} destinatário(s) selecionado(s)
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Criar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
