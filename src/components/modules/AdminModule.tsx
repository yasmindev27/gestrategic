import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useLogAccess } from "@/hooks/useLogAccess";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
  Settings,
  UserPlus,
  Pencil,
  Trash2,
  Eye,
  EyeOff,
  RefreshCw,
  Briefcase,
  Building2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Database } from "@/integrations/supabase/types";
import { CargosManager } from "@/components/admin/CargosManager";
import { SetoresManager } from "@/components/admin/SetoresManager";
import { GestoresVinculacao } from "@/components/admin/GestoresVinculacao";
import { PermissoesManager } from "@/components/admin/PermissoesManager";

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
  ti: "TI",
  manutencao: "Manutenção",
  engenharia_clinica: "Engenharia Clínica",
  laboratorio: "Laboratório",
  restaurante: "Restaurante",
  rh_dp: "RH/DP",
  assistencia_social: "Assistência Social",
  qualidade: "Qualidade",
  nsp: "NSP",
  seguranca: "Segurança do Trabalho",
};

// Roles disponíveis para seleção (exclui "funcionario" que é o padrão)
const selectableRoles = Object.entries(roleLabels).filter(
  ([key]) => key !== "funcionario"
) as [AppRole, string][];

const roleColors: Record<AppRole, string> = {
  admin: "bg-destructive text-destructive-foreground",
  gestor: "bg-primary text-primary-foreground",
  funcionario: "bg-secondary text-secondary-foreground",
  recepcao: "bg-blue-500 text-white",
  classificacao: "bg-yellow-500 text-black",
  nir: "bg-accent text-accent-foreground",
  faturamento: "bg-green-500 text-white",
  ti: "bg-purple-500 text-white",
  manutencao: "bg-orange-500 text-white",
  engenharia_clinica: "bg-teal-500 text-white",
  laboratorio: "bg-pink-500 text-white",
  restaurante: "bg-amber-600 text-white",
  rh_dp: "bg-indigo-500 text-white",
  assistencia_social: "bg-rose-500 text-white",
  qualidade: "bg-emerald-600 text-white",
  nsp: "bg-sky-600 text-white",
  seguranca: "bg-yellow-600 text-white",
};

export const AdminModule = () => {
  const { isAdmin, isLoading: isLoadingRole } = useUserRole();
  const { logAction } = useLogAccess();
  const { toast } = useToast();
  
  const [users, setUsers] = useState<UserWithRole[]>([]);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [cargosOptions, setCargosOptions] = useState<{ id: string; nome: string }[]>([]);
  const [setoresOptions, setSetoresOptions] = useState<{ id: string; nome: string }[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Dialog states
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editUserDialogOpen, setEditUserDialogOpen] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState<UserWithRole | null>(null);
  const [newRole, setNewRole] = useState<AppRole | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Form states for creating/editing user
  const [formData, setFormData] = useState({
    email: "",
    matricula: "",
    password: "",
    full_name: "",
    cargo: "",
    setor: "",
    role: "funcionario" as AppRole,
  });
  const [loginType, setLoginType] = useState<"email" | "matricula">("email");

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchLogs();
      fetchCargosSetores();
      logAction("acesso", "admin");
    }
  }, [isAdmin]);

  const fetchCargosSetores = async () => {
    try {
      const [cargosRes, setoresRes] = await Promise.all([
        supabase.from("cargos").select("id, nome").eq("ativo", true).order("nome"),
        supabase.from("setores").select("id, nome").eq("ativo", true).order("nome"),
      ]);

      if (cargosRes.error) throw cargosRes.error;
      if (setoresRes.error) throw setoresRes.error;

      setCargosOptions(cargosRes.data || []);
      setSetoresOptions(setoresRes.data || []);
    } catch (error) {
      console.error("Error fetching cargos/setores:", error);
      toast({
        title: "Erro",
        description: "Erro ao carregar cargos e setores.",
        variant: "destructive",
      });
    }
  };

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

  const resetFormData = () => {
    setFormData({
      email: "",
      matricula: "",
      password: "",
      full_name: "",
      cargo: "",
      setor: "",
      role: "funcionario",
    });
    setShowPassword(false);
    setLoginType("email");
  };

  const openCreateUserDialog = () => {
    resetFormData();
    fetchCargosSetores();
    setCreateDialogOpen(true);
  };

  const handleCreateUser = async () => {
    if (!formData.full_name) {
      toast({
        title: "Erro",
        description: "Nome completo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (loginType === "email" && !formData.email) {
      toast({
        title: "Erro",
        description: "Email é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    if (loginType === "matricula" && !formData.matricula) {
      toast({
        title: "Erro",
        description: "Matrícula é obrigatória.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify(formData),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao criar usuário");
      }

      toast({
        title: "Sucesso",
        description: `Usuário ${formData.full_name} criado com sucesso.`,
      });

      setCreateDialogOpen(false);
      resetFormData();
      fetchUsers();
    } catch (error: unknown) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao criar usuário.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({
            user_id: selectedUser.user_id,
            full_name: formData.full_name || undefined,
            cargo: formData.cargo,
            setor: formData.setor,
            password: formData.password || undefined,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao editar usuário");
      }

      toast({
        title: "Sucesso",
        description: "Usuário atualizado com sucesso.",
      });

      setEditUserDialogOpen(false);
      setSelectedUser(null);
      resetFormData();
      fetchUsers();
    } catch (error: unknown) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao editar usuário.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete-user`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionData.session?.access_token}`,
          },
          body: JSON.stringify({ user_id: selectedUser.user_id }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao excluir usuário");
      }

      toast({
        title: "Sucesso",
        description: `Usuário ${selectedUser.full_name} excluído com sucesso.`,
      });

      setDeleteDialogOpen(false);
      setSelectedUser(null);
      fetchUsers();
    } catch (error: unknown) {
      console.error("Error:", error);
      toast({
        title: "Erro",
        description: error instanceof Error ? error.message : "Erro ao excluir usuário.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const openEditUserDialog = (user: UserWithRole) => {
    setSelectedUser(user);
    setFormData({
      email: "",
      matricula: "",
      password: "",
      full_name: user.full_name,
      cargo: user.cargo || "",
      setor: user.setor || "",
      role: user.role,
    });
    fetchCargosSetores();
    setEditUserDialogOpen(true);
  };

  const filteredUsers = users.filter(
    u => u.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
         (u.cargo?.toLowerCase() || "").includes(searchTerm.toLowerCase())
  );

  if (isLoadingRole) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

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
        <TabsList className="flex-wrap h-auto gap-1">
          <TabsTrigger value="usuarios">
            <Users className="h-4 w-4 mr-2" />
            Usuários
          </TabsTrigger>
          <TabsTrigger value="permissoes">
            <Shield className="h-4 w-4 mr-2" />
            Permissões
          </TabsTrigger>
          <TabsTrigger value="cargos">
            <Briefcase className="h-4 w-4 mr-2" />
            Cargos
          </TabsTrigger>
          <TabsTrigger value="setores">
            <Building2 className="h-4 w-4 mr-2" />
            Setores
          </TabsTrigger>
          <TabsTrigger value="gestores">
            <UserCog className="h-4 w-4 mr-2" />
            Gestores
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History className="h-4 w-4 mr-2" />
            Logs
          </TabsTrigger>
          <TabsTrigger value="configuracoes">
            <Settings className="h-4 w-4 mr-2" />
            Configurações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="usuarios" className="space-y-4 mt-4">
          {/* Search and Add Button */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex gap-4 items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome ou cargo..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={() => fetchUsers()} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                  Atualizar
                </Button>
                <Button onClick={openCreateUserDialog}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Novo Usuário
                </Button>
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
                      <TableHead className="text-right">Ações</TableHead>
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
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => {
                                setSelectedUser(user);
                                setNewRole(user.role);
                                setEditDialogOpen(true);
                              }}
                            >
                              <Shield className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => openEditUserDialog(user)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              onClick={() => {
                                setSelectedUser(user);
                                setDeleteDialogOpen(true);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissoes" className="space-y-4 mt-4">
          <PermissoesManager />
        </TabsContent>

        <TabsContent value="cargos" className="space-y-4 mt-4">
          <CargosManager />
        </TabsContent>

        <TabsContent value="setores" className="space-y-4 mt-4">
          <SetoresManager />
        </TabsContent>

        <TabsContent value="gestores" className="space-y-4 mt-4">
          <GestoresVinculacao />
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
                  {selectableRoles.map(([value, label]) => (
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

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Novo Usuário</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar um novo usuário no sistema. A senha padrão é 123456.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="create-name">Nome Completo *</Label>
              <Input
                id="create-name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome completo do usuário"
              />
            </div>
            
            {/* Login Type Selector */}
            <div className="space-y-2">
              <Label>Tipo de Acesso *</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={loginType === "email" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setLoginType("email");
                    setFormData({ ...formData, matricula: "" });
                  }}
                >
                  Email
                </Button>
                <Button
                  type="button"
                  variant={loginType === "matricula" ? "default" : "outline"}
                  size="sm"
                  className="flex-1"
                  onClick={() => {
                    setLoginType("matricula");
                    setFormData({ ...formData, email: "" });
                  }}
                >
                  Matrícula
                </Button>
              </div>
            </div>
            
            {loginType === "email" ? (
              <div className="space-y-2">
                <Label htmlFor="create-email">Email *</Label>
                <Input
                  id="create-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@exemplo.com"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="create-matricula">Matrícula *</Label>
                <Input
                  id="create-matricula"
                  value={formData.matricula}
                  onChange={(e) => setFormData({ ...formData, matricula: e.target.value })}
                  placeholder="Ex: 12345"
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="create-password">Senha (opcional, padrão: 123456)</Label>
              <div className="relative">
                <Input
                  id="create-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Deixe vazio para usar 123456"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="create-cargo">Cargo *</Label>
                <Select
                  value={formData.cargo}
                  onValueChange={(value) => setFormData({ ...formData, cargo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cargosOptions.map((cargo) => (
                      <SelectItem key={cargo.id} value={cargo.nome}>
                        {cargo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-setor">Setor *</Label>
                <Select
                  value={formData.setor}
                  onValueChange={(value) => setFormData({ ...formData, setor: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {setoresOptions.map((setor) => (
                      <SelectItem key={setor.id} value={setor.nome}>
                        {setor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Perfil de Acesso</Label>
              <Select 
                value={formData.role} 
                onValueChange={(value) => setFormData({ ...formData, role: value as AppRole })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  {selectableRoles.map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateUser}
              disabled={
                !formData.full_name || 
                (loginType === "email" && !formData.email) || 
                (loginType === "matricula" && !formData.matricula) || 
                isSubmitting
              }
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Criar Usuário
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit User Dialog */}
      <Dialog open={editUserDialogOpen} onOpenChange={setEditUserDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Editar Usuário</DialogTitle>
            <DialogDescription>
              Altere os dados do usuário. Deixe a senha em branco para manter a atual.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nome Completo</Label>
              <Input
                id="edit-name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Nome completo do usuário"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-password">Nova Senha (opcional)</Label>
              <div className="relative">
                <Input
                  id="edit-password"
                  type={showPassword ? "text" : "password"}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Deixe em branco para manter"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-0 top-0 h-full px-3"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-cargo">Cargo</Label>
                <Select
                  value={formData.cargo}
                  onValueChange={(value) => setFormData({ ...formData, cargo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o cargo" />
                  </SelectTrigger>
                  <SelectContent>
                    {cargosOptions.map((cargo) => (
                      <SelectItem key={cargo.id} value={cargo.nome}>
                        {cargo.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-setor">Setor</Label>
                <Select
                  value={formData.setor}
                  onValueChange={(value) => setFormData({ ...formData, setor: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o setor" />
                  </SelectTrigger>
                  <SelectContent>
                    {setoresOptions.map((setor) => (
                      <SelectItem key={setor.id} value={setor.nome}>
                        {setor.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditUserDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditUser}
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Pencil className="h-4 w-4 mr-2" />
              )}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Confirmation */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Usuário</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{selectedUser?.full_name}</strong>?
              Esta ação não pode ser desfeita e todos os dados associados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isSubmitting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteUser}
              disabled={isSubmitting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4 mr-2" />
              )}
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
