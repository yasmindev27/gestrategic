import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { UserCog, Loader2, RefreshCw, Users, Briefcase, Building2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Gestor {
  user_id: string;
  full_name: string;
  cargo: string | null;
  setor: string | null;
}

interface Cargo {
  id: string;
  nome: string;
}

interface Setor {
  id: string;
  nome: string;
}

interface GestorCargo {
  id: string;
  gestor_user_id: string;
  cargo_id: string;
  cargo_nome?: string;
}

interface GestorSetor {
  id: string;
  gestor_user_id: string;
  setor_id: string;
  setor_nome?: string;
}

export const GestoresVinculacao = () => {
  const { toast } = useToast();
  const [gestores, setGestores] = useState<Gestor[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [gestorCargos, setGestorCargos] = useState<GestorCargo[]>([]);
  const [gestorSetores, setGestorSetores] = useState<GestorSetor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedGestor, setSelectedGestor] = useState<Gestor | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Selection states
  const [selectedCargos, setSelectedCargos] = useState<string[]>([]);
  const [selectedSetores, setSelectedSetores] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      // Fetch gestores (users with role 'gestor')
      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "gestor");

      if (rolesError) throw rolesError;

      const gestorIds = roles?.map(r => r.user_id) || [];

      if (gestorIds.length > 0) {
        const { data: profiles, error: profilesError } = await supabase
          .from("profiles")
          .select("user_id, full_name, cargo, setor")
          .in("user_id", gestorIds);

        if (profilesError) throw profilesError;
        setGestores(profiles || []);
      } else {
        setGestores([]);
      }

      // Fetch cargos
      const { data: cargosData, error: cargosError } = await supabase
        .from("cargos")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (cargosError) throw cargosError;
      setCargos(cargosData || []);

      // Fetch setores
      const { data: setoresData, error: setoresError } = await supabase
        .from("setores")
        .select("id, nome")
        .eq("ativo", true)
        .order("nome");

      if (setoresError) throw setoresError;
      setSetores(setoresData || []);

      // Fetch gestor_cargos
      const { data: gcData, error: gcError } = await supabase
        .from("gestor_cargos")
        .select("*");

      if (gcError) throw gcError;
      setGestorCargos(gcData || []);

      // Fetch gestor_setores
      const { data: gsData, error: gsError } = await supabase
        .from("gestor_setores")
        .select("*");

      if (gsError) throw gsError;
      setGestorSetores(gsData || []);

    } catch (error) {
      console.error("Error fetching data:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar dados.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const openVinculacaoDialog = (gestor: Gestor) => {
    setSelectedGestor(gestor);
    
    // Get current vinculations
    const currentCargos = gestorCargos
      .filter(gc => gc.gestor_user_id === gestor.user_id)
      .map(gc => gc.cargo_id);
    
    const currentSetores = gestorSetores
      .filter(gs => gs.gestor_user_id === gestor.user_id)
      .map(gs => gs.setor_id);
    
    setSelectedCargos(currentCargos);
    setSelectedSetores(currentSetores);
    setDialogOpen(true);
  };

  const handleSaveVinculacao = async () => {
    if (!selectedGestor) return;

    setIsSubmitting(true);
    try {
      // Delete existing vinculations
      await supabase
        .from("gestor_cargos")
        .delete()
        .eq("gestor_user_id", selectedGestor.user_id);

      await supabase
        .from("gestor_setores")
        .delete()
        .eq("gestor_user_id", selectedGestor.user_id);

      // Insert new cargo vinculations
      if (selectedCargos.length > 0) {
        const cargoInserts = selectedCargos.map(cargoId => ({
          gestor_user_id: selectedGestor.user_id,
          cargo_id: cargoId,
        }));

        const { error: cargoError } = await supabase
          .from("gestor_cargos")
          .insert(cargoInserts);

        if (cargoError) throw cargoError;
      }

      // Insert new setor vinculations
      if (selectedSetores.length > 0) {
        const setorInserts = selectedSetores.map(setorId => ({
          gestor_user_id: selectedGestor.user_id,
          setor_id: setorId,
        }));

        const { error: setorError } = await supabase
          .from("gestor_setores")
          .insert(setorInserts);

        if (setorError) throw setorError;
      }

      toast({ title: "Sucesso", description: "Vinculações atualizadas com sucesso." });
      setDialogOpen(false);
      fetchData();
    } catch (error: unknown) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao salvar vinculações.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getGestorVinculacoes = (gestorUserId: string) => {
    const vinculadosCargos = gestorCargos
      .filter(gc => gc.gestor_user_id === gestorUserId)
      .map(gc => cargos.find(c => c.id === gc.cargo_id)?.nome)
      .filter(Boolean);

    const vinculadosSetores = gestorSetores
      .filter(gs => gs.gestor_user_id === gestorUserId)
      .map(gs => setores.find(s => s.id === gs.setor_id)?.nome)
      .filter(Boolean);

    return { cargos: vinculadosCargos, setores: vinculadosSetores };
  };

  const toggleCargo = (cargoId: string) => {
    setSelectedCargos(prev => 
      prev.includes(cargoId)
        ? prev.filter(id => id !== cargoId)
        : [...prev, cargoId]
    );
  };

  const toggleSetor = (setorId: string) => {
    setSelectedSetores(prev =>
      prev.includes(setorId)
        ? prev.filter(id => id !== setorId)
        : [...prev, setorId]
    );
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Vinculação de Gestores
            </CardTitle>
            <CardDescription>
              Define quais cargos e setores cada gestor pode gerenciar
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={fetchData} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : gestores.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhum usuário com perfil Gestor encontrado.</p>
            <p className="text-sm mt-2">
              Atribua o perfil "Gestor" a um usuário na aba Usuários primeiro.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Gestor</TableHead>
                <TableHead>Cargo/Setor Próprio</TableHead>
                <TableHead>Cargos que Gerencia</TableHead>
                <TableHead>Setores que Gerencia</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {gestores.map((gestor) => {
                const vinculacoes = getGestorVinculacoes(gestor.user_id);
                return (
                  <TableRow key={gestor.user_id}>
                    <TableCell className="font-medium">{gestor.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {gestor.cargo || "-"} / {gestor.setor || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vinculacoes.cargos.length > 0 ? (
                          vinculacoes.cargos.map((cargo, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {cargo}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Nenhum</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {vinculacoes.setores.length > 0 ? (
                          vinculacoes.setores.map((setor, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {setor}
                            </Badge>
                          ))
                        ) : (
                          <span className="text-muted-foreground text-sm">Nenhum</span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openVinculacaoDialog(gestor)}
                      >
                        <UserCog className="h-4 w-4 mr-2" />
                        Configurar
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Vinculação Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configurar Vinculação do Gestor</DialogTitle>
            <DialogDescription>
              Defina quais cargos e setores o gestor <strong>{selectedGestor?.full_name}</strong> pode gerenciar.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid grid-cols-2 gap-6 py-4">
            {/* Cargos */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Cargos sob Gestão
              </Label>
              <ScrollArea className="h-64 border rounded-md p-3">
                <div className="space-y-2">
                  {cargos.map((cargo) => (
                    <div key={cargo.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`cargo-${cargo.id}`}
                        checked={selectedCargos.includes(cargo.id)}
                        onCheckedChange={() => toggleCargo(cargo.id)}
                      />
                      <label
                        htmlFor={`cargo-${cargo.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {cargo.nome}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {selectedCargos.length} cargo(s) selecionado(s)
              </p>
            </div>

            {/* Setores */}
            <div className="space-y-3">
              <Label className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Setores sob Gestão
              </Label>
              <ScrollArea className="h-64 border rounded-md p-3">
                <div className="space-y-2">
                  {setores.map((setor) => (
                    <div key={setor.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`setor-${setor.id}`}
                        checked={selectedSetores.includes(setor.id)}
                        onCheckedChange={() => toggleSetor(setor.id)}
                      />
                      <label
                        htmlFor={`setor-${setor.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {setor.nome}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <p className="text-xs text-muted-foreground">
                {selectedSetores.length} setor(es) selecionado(s)
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveVinculacao} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar Vinculações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
};
