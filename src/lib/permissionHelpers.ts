import { supabase } from '@/integrations/supabase/client';
import { logger } from './logger';

/**
 * Valida se o usuário atual é admin
 * Retorna true se é admin, false caso contrário
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return false;

    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .eq('role', 'admin')
      .single();

    if (error && error.code !== 'PGRST116') {
      logger.error('Error checking admin status', { context: 'isCurrentUserAdmin', error });
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error('Error validating admin permissions', { context: 'isCurrentUserAdmin', error: error as Error });
    return false;
  }
}

/**
 * Avalia se o usuário tem um role específico
 */
export async function userHasRole(userId: string, role: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('id')
      .eq('user_id', userId)
      .eq('role', role as any)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      logger.error(`Error checking role`, { context: `userHasRole[${role}]`, error });
      return false;
    }

    return !!data;
  } catch (error) {
    logger.error('Error checking user role', { context: 'userHasRole', error: error as Error });
    return false;
  }
}

/**
 * Obtém todos os roles de um usuário
 */
export async function getUserRoles(userId: string): Promise<string[]> {
  try {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      logger.error('Error fetching user roles', { context: 'getUserRoles', error });
      return [];
    }

    return (data || []).map(r => r.role);
  } catch (error) {
    logger.error('Error getting user roles', { context: 'getUserRoles', error: error as Error });
    return [];
  }
}
