/**
 * 🔔 Hook para Notificações com Sonner
 * Feedback imediato ao usuário após ações (save, delete, etc)
 */

import { toast } from "sonner";

interface ToastOptions {
  duration?: number;
  description?: string;
}

/**
 * Hook para mostrar notificação de sucesso
 */
export const useToastSuccess = () => {
  return (message: string, options?: ToastOptions) => {
    toast.success(message, {
      duration: options?.duration || 3000,
      description: options?.description,
    });
  };
};

/**
 * Hook para mostrar notificação de erro
 */
export const useToastError = () => {
  return (message: string, options?: ToastOptions) => {
    toast.error(message, {
      duration: options?.duration || 4000,
      description: options?.description,
    });
  };
};

/**
 * Hook para mostrar notificação de informação
 */
export const useToastInfo = () => {
  return (message: string, options?: ToastOptions) => {
    toast.info(message, {
      duration: options?.duration || 3000,
      description: options?.description,
    });
  };
};

/**
 * Hook para mostrar notificação de aviso
 */
export const useToastWarning = () => {
  return (message: string, options?: ToastOptions) => {
    toast.warning(message, {
      duration: options?.duration || 3500,
      description: options?.description,
    });
  };
};

/**
 * Hook consolidado com todos os tipos
 */
export const useToast = () => {
  return {
    success: useToastSuccess(),
    error: useToastError(),
    info: useToastInfo(),
    warning: useToastWarning(),
  };
};

/**
 * Funções diretas (não-hook) para uso fora de componentes React
 */
export const showToast = {
  success: (message: string, options?: ToastOptions) =>
    toast.success(message, {
      duration: options?.duration || 3000,
      description: options?.description,
    }),

  error: (message: string, options?: ToastOptions) =>
    toast.error(message, {
      duration: options?.duration || 4000,
      description: options?.description,
    }),

  info: (message: string, options?: ToastOptions) =>
    toast.info(message, {
      duration: options?.duration || 3000,
      description: options?.description,
    }),

  warning: (message: string, options?: ToastOptions) =>
    toast.warning(message, {
      duration: options?.duration || 3500,
      description: options?.description,
    }),
};
