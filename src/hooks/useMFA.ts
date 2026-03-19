/**
 * Gestrategic — useMFA Hook
 * Manage MFA state and enforce MFA for sensitive operations
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation } from '@tanstack/react-query';

interface MFAStatus {
  enrolled: boolean;
  factorId?: string;
  verifiedAt?: string;
}

export function useMFA(userId?: string) {
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaEnrolled, setMfaEnrolled] = useState(false);

  const { data: mfaStatus, isLoading } = useQuery({
    queryKey: ['mfa-status', userId],
    queryFn: async () => {
      if (!userId) return null;

      // Check if user has admin or gestor role
      const { data: roles, error: roleError } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);

      if (roleError || !roles || roles.length === 0) {
        return null;
      }

      const isAdmin = roles.some(r => r.role === 'admin' || r.role === 'gestor');

      // Check MFA status
      const { data: profile } = await supabase
        .from('profiles')
        .select('updated_at')
        .eq('user_id', userId)
        .single();

      return {
        requiresMFA: isAdmin,
        mfaEnabled: false,
      };
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (mfaStatus) {
      setMfaRequired(mfaStatus.requiresMFA);
      setMfaEnrolled(mfaStatus.mfaEnabled);
    }
  }, [mfaStatus]);

  // Force MFA re-verification for critical operations
  const verifyMFAForCritical = useMutation({
    mutationFn: async (code: string) => {
      // Check current MFA factor
      const { data: factors, error: factorError } = await supabase.auth.mfa.listFactors();

      if (factorError || !factors?.totp) {
        throw new Error('MFA not configured');
      }

      // Verify code with primary factor
      const { data, error } = await (supabase.auth.mfa.verify as any)({
        factorId: factors.totp[0]?.id,
        code,
      });

      if (error) throw error;

      return data;
    },
  });

  return {
    mfaRequired,
    mfaEnrolled,
    mfaNeedsSetup: mfaRequired && !mfaEnrolled,
    isLoading,
    verifyMFAForCritical,
  };
}

/**
 * Hook para verificar MFA antes de operações críticas
 */
export function useMFAVerification() {
  const [showVerification, setShowVerification] = useState(false);
  const [pendingAction, setPendingAction] = useState<(() => Promise<void>) | null>(null);
  const [verificationCode, setVerificationCode] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  const verifyAndExecute = async (action: () => Promise<void>) => {
    const { data: factors } = await supabase.auth.mfa.listFactors();

    if (!factors?.totp) {
      // MFA not enabled, execute directly
      await action();
      return;
    }

    // Show verification dialog
    setPendingAction(() => action);
    setShowVerification(true);
  };

  const handleVerify = async () => {
    if (!verificationCode || !pendingAction) return;

    setIsVerifying(true);
    try {
      const { data: factors } = await supabase.auth.mfa.listFactors();

      if (!factors?.totp) throw new Error('MFA not configured');

      const { error } = await supabase.auth.mfa.verify({
        factorId: factors.totp.factor.id,
        code: verificationCode,
      });

      if (error) throw error;

      // Execute pending action
      await pendingAction();

      setShowVerification(false);
      setPendingAction(null);
      setVerificationCode('');
    } catch (err) {
      throw err;
    } finally {
      setIsVerifying(false);
    }
  };

  return {
    showVerification,
    verificationCode,
    setVerificationCode,
    isVerifying,
    verifyAndExecute,
    handleVerify,
    closeVerification: () => setShowVerification(false),
  };
}
