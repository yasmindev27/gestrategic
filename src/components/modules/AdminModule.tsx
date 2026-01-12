import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { 
  Shield, 
  Users, 
  Search,
  AlertCircle,
  Loader2,
  UserCog,
  History,
  Settings
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface UserWithRole {
  id: string;
  user_id: string;
  full_name: string;
  email?: string;
  cargo: string | null;
  setor: string | null;
  role: AppRole;
  role_id: string;
}

interface LogEntry {
  id: string;
  user_id: string | null;
  acao: string;
  modulo: string;
  detalhes: unknown;
  created_at: string;
}

const roleLabels: Record<AppRole, string> = {
  admin: "Administrador",
  gestor: "Gestor",
  funcionario: "Funcionário",
  recepcao: "Recepção",
  classificacao: "Classificação",
  nir: "NIR",
  faturamento: "Faturamento",
};

const roleColors: Record<AppRole, string> = {
  admin: "bg-destructive text-destructive-foreground",
  gestor: "bg-primary text-primary-foreground",
  funcionario: "bg-secondary text-secondary-foreground",
  recepcao: "bg-info text-info-foreground",
  classificacao: "bg-warning text-warning-foreground",
  nir: "bg-accent text-accent-foreground",
  faturamento: "bg-success text-success-foreground",
};

export const AdminModule = () => {
  const { isAdmin } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchLogs();
      logAction("acesso", "admin");
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      // Fetch profiles with roles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, user_id, full_name, cargo, setor");

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase
        .from("user_roles")
        .select("id, user_id, role");

      if (rolesError) throw rolesError;

      // Combine data
      const usersWithRoles: UserWithRole[] = (profiles || []).map(profile => {
        const userRole = roles?.find(r => r.user_id === profile.user_id);
        return {
          id: profile.id,
          user_id: profile.user_id,
          full_name: profile.full_name,
          cargo: profile.cargo,
          setor: profile.setor,
          role: userRole?.role || "funcionario",
          role_id: userRole?.id || "",
        };
      });

      setUsers(usersWithRoles);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar usuários.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from("logs_acesso")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error("Error fetching logs:", error);
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;
    
    setIsSubmitting(true);
    try {
      if (selectedUser.role_id) {
        // Update existing role
        const { error } = await supabase
          .from("user_roles")
          .update({ role: newRole })
          .eq("id", selectedUser.role_id);

        if (error) throw error;
      } else {
        // Insert new role
        const { error } = await supabase
          .from("user_roles")
          .insert({
            user_id: selectedUser.user_id,
            role: newRole,
          });

        if (error) throw error;
      }

      await logAction("alterar_role", "admin", { 
        user_id: selectedUser.user_id,
        nome: selectedUser.full_name,
        role_anterior: selectedUser.role,
        novo_role: newRole
      });

      toast({
        title: "Sucesso",
        description: `Perfil de ${selectedUser.full_name} atualizado para ${roleLabels[newRole]}.`,
      });

      setEditDialogOpen(false);
      setSelectedUser(null);
      setNewRole("");
      fetchUsers();
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar perfil.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredUsers = users.filter(
    u => u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (u.cargo?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  if (!isAdmin) {
    return (
      <Card className="border-destructive">
        <CardContent className="pt-6">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <span>Apenas administradores podem acessar este módulo.</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Administração</h2>
          <p className="text-muted-foreground">Gerenciamento de usuários e sistema</p>
        </div>
      </div>

      <Tabs defaultValue="usuarios">
        <TabsList>
          <TabsTrigger value="usuarios">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History className="h-4 w-4 mr-2" />
            Logs de Acesso
          </TabsTrigger>
          <TabsTrigger value="configuracoes">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4 mt-4">
          {/* Search */}
          <Card>
            <CardContent className="pt-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou cargo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card>
            <CardHeader>
              <CardTitle>Usuários do Sistema</CardTitle>
              <CardDescription>
                Gerencie os perfis de acesso dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredUsers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum usuário encontrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nome</TableHead>
                      <TableHead>Cargo</TableHead>
                      <TableHead>Setor</TableHead>
                      <TableHead>Perfil de Acesso</TableHead>
                      <TableHead>Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell className="font-medium">{user.full_name}</TableCell>
                        <TableCell>{user.cargo || "-"}</TableCell>
                        <TableCell>{user.setor || "-"}</TableCell>
                        <TableCell>
                          <Badge className={roleColors[user.role]}>
                            {roleLabels[user.role]}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedUser(user);
                              setNewRole(user.role);
                              setEditDialogOpen(true);
                            }}
                          >
                            <UserCog className="h-4 w-4 mr-1" />
                            Alterar Perfil
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="logs" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Acesso</CardTitle>
              <CardDescription>
                Últimas 100 ações registradas no sistema
              </CardDescription>
            </CardHeader>
            <CardContent>
              {logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Nenhum log registrado.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Módulo</TableHead>
                      <TableHead>Ação</TableHead>
                      <TableHead>Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell>
                          {format(new Date(log.created_at), "dd/MM/yy HH:mm:ss", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.modulo}</Badge>
                        </TableCell>
                        <TableCell>{log.acao}</TableCell>
                        <TableCell className="max-w-xs truncate text-muted-foreground text-sm">
                          {log.detalhes ? JSON.stringify(log.detalhes) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="configuracoes" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Configurações do Sistema</CardTitle>
              <CardDescription>
                Configurações gerais da aplicação
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Configurações adicionais em desenvolvimento.</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Role Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Alterar Perfil de Acesso</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div>
              <label className="text-sm font-medium">Usuário</label>
              <Input value={selectedUser?.full_name || ""} disabled />
            </div>
            <div>
              <label className="text-sm font-medium">Perfil Atual</label>
              <div className="mt-1">
                <Badge className={selectedUser ? roleColors[selectedUser.role] : ""}>
                  {selectedUser ? roleLabels[selectedUser.role] : ""}
                </Badge>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium">Novo Perfil</label>
              <Select value={newRole} onValueChange={(value) => setNewRole(value as AppRole)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {(Object.entries(roleLabels) as [AppRole, string][]).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleUpdateRole}
              disabled={!newRole || newRole === selectedUser?.role || isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Shield className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
