import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Types
export interface PerfilSistema {
  id: string;
  nome: string;
  descricao: string | null;
  cor: string;
  icone: string;
  is_sistema: boolean;
  is_master: boolean;
  ordem: number;
  ativo: boolean;
  created_at: string;
}

export interface ModuloSistema {
  id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  icone: string | null;
  categoria: string | null;
  ordem: number;
  ativo: boolean;
}

export interface FerramentaModulo {
  id: string;
  modulo_id: string;
  codigo: string;
  nome: string;
  descricao: string | null;
  ordem: number;
}

export interface PermissaoPerfil {
  id: string;
  perfil_id: string;
  modulo_id: string;
  pode_visualizar: boolean;
  pode_acessar: boolean;
  comportamento_sem_acesso: "ocultar" | "desabilitar";
}

export interface PermissaoFerramenta {
  id: string;
  perfil_id: string;
  ferramenta_id: string;
  permitido: boolean;
}

export interface UsuarioPerfil {
  id: string;
  user_id: string;
  perfil_id: string;
  created_at: string;
}

// Hook para buscar perfis
export function usePerfis() {
  return useQuery({
    queryKey: ["perfis-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("perfis_sistema")
        .select("*")
        .order("ordem");
      
      if (error) throw error;
      return data as PerfilSistema[];
    },
  });
}

// Hook para buscar módulos
export function useModulos() {
  return useQuery({
    queryKey: ["modulos-sistema"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("modulos_sistema")
        .select("*")
        .order("ordem");
      
      if (error) throw error;
      return data as ModuloSistema[];
    },
  });
}

// Hook para buscar ferramentas
export function useFerramentas() {
  return useQuery({
    queryKey: ["ferramentas-modulo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferramentas_modulo")
        .select("*")
        .order("ordem");
      
      if (error) throw error;
      return data as FerramentaModulo[];
    },
  });
}

// Hook para buscar permissões de um perfil
export function usePermissoesPerfil(perfilId: string | null) {
  return useQuery({
    queryKey: ["permissoes-perfil", perfilId],
    queryFn: async () => {
      if (!perfilId) return { modulos: [], ferramentas: [] };
      
      const [permModulos, permFerramentas] = await Promise.all([
        supabase
          .from("permissoes_perfil")
          .select("*")
          .eq("perfil_id", perfilId),
        supabase
          .from("permissoes_ferramenta")
          .select("*")
          .eq("perfil_id", perfilId),
      ]);
      
      if (permModulos.error) throw permModulos.error;
      if (permFerramentas.error) throw permFerramentas.error;
      
      return {
        modulos: permModulos.data as PermissaoPerfil[],
        ferramentas: permFerramentas.data as PermissaoFerramenta[],
      };
    },
    enabled: !!perfilId,
  });
}

// Hook para buscar usuários vinculados a perfis
export function useUsuariosPerfil() {
  return useQuery({
    queryKey: ["usuarios-perfil"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("usuario_perfil")
        .select("*");
      
      if (error) throw error;
      return data as UsuarioPerfil[];
    },
  });
}

// Hook para salvar permissão de módulo
export function useSalvarPermissaoModulo() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: {
      perfilId: string;
      moduloId: string;
      podeVisualizar: boolean;
      podeAcessar: boolean;
      comportamento: "ocultar" | "desabilitar";
    }) => {
      const { data: existing } = await supabase
        .from("permissoes_perfil")
        .select("id")
        .eq("perfil_id", params.perfilId)
        .eq("modulo_id", params.moduloId)
        .single();
      
      if (existing) {
        const { error } = await supabase
          .from("permissoes_perfil")
          .update({
            pode_visualizar: params.podeVisualizar,
            pode_acessar: params.podeAcessar,
            comportamento_sem_acesso: params.comportamento,
          })
          .eq("id", existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("permissoes_perfil")
          .insert({
            perfil_id: params.perfilId,
            modulo_id: params.moduloId,
            pode_visualizar: params.podeVisualizar,
            pode_acessar: params.podeAcessar,
            comportamento_sem_acesso: params.comportamento,
          });
        
        if (error) throw error;
      }
      
      // Log da alteração
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("logs_permissoes").insert({
          user_id: user.id,
          acao: existing ? "alterar_permissao_modulo" : "criar_permissao_modulo",
          entidade_tipo: "permissao_perfil",
          entidade_id: params.moduloId,
          dados_novos: params,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes-perfil"] });
      toast({ title: "Permissão salva com sucesso" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao salvar permissão", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

// Hook para salvar permissão de ferramenta
export function useSalvarPermissaoFerramenta() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: {
      perfilId: string;
      ferramentaId: string;
      permitido: boolean;
    }) => {
      const { data: existing } = await supabase
        .from("permissoes_ferramenta")
        .select("id")
        .eq("perfil_id", params.perfilId)
        .eq("ferramenta_id", params.ferramentaId)
        .single();
      
      if (existing) {
        const { error } = await supabase
          .from("permissoes_ferramenta")
          .update({ permitido: params.permitido })
          .eq("id", existing.id);
        
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("permissoes_ferramenta")
          .insert({
            perfil_id: params.perfilId,
            ferramenta_id: params.ferramentaId,
            permitido: params.permitido,
          });
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes-perfil"] });
    },
  });
}

// Hook para criar novo perfil
export function useCriarPerfil() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: {
      nome: string;
      descricao?: string;
      cor?: string;
      icone?: string;
      clonarDe?: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      // Criar perfil
      const { data: novoPerfil, error } = await supabase
        .from("perfis_sistema")
        .insert({
          nome: params.nome,
          descricao: params.descricao,
          cor: params.cor || "#6b7280",
          icone: params.icone || "Shield",
          is_sistema: false,
          created_by: user?.id,
        })
        .select()
        .single();
      
      if (error) throw error;
      
      // Se clonar de outro perfil, copiar permissões
      if (params.clonarDe) {
        const [permModulos, permFerramentas] = await Promise.all([
          supabase
            .from("permissoes_perfil")
            .select("*")
            .eq("perfil_id", params.clonarDe),
          supabase
            .from("permissoes_ferramenta")
            .select("*")
            .eq("perfil_id", params.clonarDe),
        ]);
        
        if (permModulos.data?.length) {
          await supabase.from("permissoes_perfil").insert(
            permModulos.data.map((p) => ({
              perfil_id: novoPerfil.id,
              modulo_id: p.modulo_id,
              pode_visualizar: p.pode_visualizar,
              pode_acessar: p.pode_acessar,
              comportamento_sem_acesso: p.comportamento_sem_acesso,
            }))
          );
        }
        
        if (permFerramentas.data?.length) {
          await supabase.from("permissoes_ferramenta").insert(
            permFerramentas.data.map((p) => ({
              perfil_id: novoPerfil.id,
              ferramenta_id: p.ferramenta_id,
              permitido: p.permitido,
            }))
          );
        }
      }
      
      // Log
      if (user) {
        await supabase.from("logs_permissoes").insert({
          user_id: user.id,
          acao: "criar_perfil",
          entidade_tipo: "perfil",
          entidade_id: novoPerfil.id,
          dados_novos: params,
        });
      }
      
      return novoPerfil;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis-sistema"] });
      toast({ title: "Perfil criado com sucesso" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao criar perfil", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

// Hook para excluir perfil (apenas não-sistema)
export function useExcluirPerfil() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (perfilId: string) => {
      // Verificar se é perfil do sistema
      const { data: perfil } = await supabase
        .from("perfis_sistema")
        .select("is_sistema, nome")
        .eq("id", perfilId)
        .single();
      
      if (perfil?.is_sistema) {
        throw new Error("Não é possível excluir perfis do sistema");
      }
      
      const { error } = await supabase
        .from("perfis_sistema")
        .delete()
        .eq("id", perfilId);
      
      if (error) throw error;
      
      // Log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("logs_permissoes").insert({
          user_id: user.id,
          acao: "excluir_perfil",
          entidade_tipo: "perfil",
          entidade_id: perfilId,
          dados_anteriores: { nome: perfil?.nome },
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["perfis-sistema"] });
      toast({ title: "Perfil excluído com sucesso" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao excluir perfil", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

// Hook para vincular usuário a perfil
export function useVincularUsuarioPerfil() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: {
      userId: string;
      perfilId: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      
      const { error } = await supabase
        .from("usuario_perfil")
        .insert({
          user_id: params.userId,
          perfil_id: params.perfilId,
          created_by: user?.id,
        });
      
      if (error) throw error;
      
      // Log
      if (user) {
        await supabase.from("logs_permissoes").insert({
          user_id: user.id,
          acao: "vincular_usuario",
          entidade_tipo: "usuario_perfil",
          dados_novos: params,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios-perfil"] });
      toast({ title: "Usuário vinculado ao perfil" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao vincular usuário", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

// Hook para desvincular usuário de perfil
export function useDesvincularUsuarioPerfil() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: {
      userId: string;
      perfilId: string;
    }) => {
      const { error } = await supabase
        .from("usuario_perfil")
        .delete()
        .eq("user_id", params.userId)
        .eq("perfil_id", params.perfilId);
      
      if (error) throw error;
      
      // Log
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("logs_permissoes").insert({
          user_id: user.id,
          acao: "desvincular_usuario",
          entidade_tipo: "usuario_perfil",
          dados_anteriores: params,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["usuarios-perfil"] });
      toast({ title: "Usuário desvinculado do perfil" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao desvincular usuário", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}

// Hook para marcar/desmarcar todas as permissões de um módulo
export function useMarcarTodasPermissoes() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  
  return useMutation({
    mutationFn: async (params: {
      perfilId: string;
      moduloId: string;
      marcar: boolean;
    }) => {
      // Atualizar permissão do módulo
      const { data: existing } = await supabase
        .from("permissoes_perfil")
        .select("id")
        .eq("perfil_id", params.perfilId)
        .eq("modulo_id", params.moduloId)
        .single();
      
      if (existing) {
        await supabase
          .from("permissoes_perfil")
          .update({
            pode_visualizar: params.marcar,
            pode_acessar: params.marcar,
          })
          .eq("id", existing.id);
      } else {
        await supabase.from("permissoes_perfil").insert({
          perfil_id: params.perfilId,
          modulo_id: params.moduloId,
          pode_visualizar: params.marcar,
          pode_acessar: params.marcar,
        });
      }
      
      // Buscar ferramentas do módulo
      const { data: ferramentas } = await supabase
        .from("ferramentas_modulo")
        .select("id")
        .eq("modulo_id", params.moduloId);
      
      if (ferramentas?.length) {
        // Deletar permissões existentes
        await supabase
          .from("permissoes_ferramenta")
          .delete()
          .eq("perfil_id", params.perfilId)
          .in("ferramenta_id", ferramentas.map((f) => f.id));
        
        // Inserir novas permissões
        await supabase.from("permissoes_ferramenta").insert(
          ferramentas.map((f) => ({
            perfil_id: params.perfilId,
            ferramenta_id: f.id,
            permitido: params.marcar,
          }))
        );
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["permissoes-perfil"] });
      toast({ title: "Permissões atualizadas" });
    },
    onError: (error) => {
      toast({ 
        title: "Erro ao atualizar permissões", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });
}
