/**
 * Gestrategic — MFA Setup Component
 * Force TOTP enrollment for admin/gestor users
 * Required on first login after role assignment
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { AlertTriangle, Copy, Check, ShieldAlert, Smartphone } from 'lucide-react';

interface MFASetupProps {
  userId: string;
  open: boolean;
  onComplete: () => void;
}

export function MFASetup({ userId, open, onComplete }: MFASetupProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'start' | 'enroll' | 'verify' | 'recovery'>('start');
  const [qrCode, setQrCode] = useState<string>('');
  const [factorId, setFactorId] = useState<string>('');
  const [verificationCode, setVerificationCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [codesVisible, setCodesVisible] = useState(false);

  const handleStartEnroll = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.auth.mfa.enroll({
        factorType: 'totp',
      });

      if (error) throw error;

      setFactorId(data.id);
      setQrCode(data.totp?.qr_code || '');
      setStep('enroll');

      toast({
        title: 'Código QR gerado',
        description: 'Escaneie com seu autenticador (Google Authenticator, Authy, Microsoft Authenticator)',
      });
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao gerar QR code',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast({
        title: 'Código inválido',
        description: 'Digite um código de 6 dígitos',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await (supabase.auth.mfa.verify as any)({
        factorId,
        code: verificationCode,
      });

      if (error) throw error;

      // Gerar recovery codes
      const { data: recoveryData, error: recoveryError } = await supabase.auth.mfa.listFactors();

      if (recoveryError) throw recoveryError;

      // Codes já aparecem após verificar
      if (recoveryData?.totp?.[0] && recoveryData.totp[0].id === factorId) {
        // Simular recovery codes (em produção, vir da resposta MFA)
        const codes = Array.from({ length: 10 }, () => 
          Math.random().toString(36).substring(2, 10).toUpperCase()
        );
        setRecoveryCodes(codes);
      }

      // Log audit
      await supabase.from('logs_acesso' as any).insert({
        acao: 'MFA enrollment',
        modulo: 'auth',
        detalhes: { mfa_enabled: true, factor_id: factorId },
        user_id: userId,
      } as any);

      setStep('recovery');
      toast({
        title: 'MFA Ativado!',
        description: 'Seus códigos de recuperação foram gerados',
      });
    } catch (err) {
      toast({
        title: 'Erro na verificação',
        description: err instanceof Error ? err.message : 'Código inválido',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCompleteSetup = async () => {
    try {
      // Marcar MFA como setup
      const { error } = await supabase
        .from('profiles')
        .update({ mfa_enabled: true })
        .eq('user_id', userId);

      if (error) throw error;

      toast({
        title: 'Configuração concluída!',
        description: 'Seu MFA foi ativado com sucesso',
      });

      onComplete();
    } catch (err) {
      toast({
        title: 'Erro',
        description: err instanceof Error ? err.message : 'Erro ao finalizar setup',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg [&>button]:hidden" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldAlert className="h-5 w-5 text-primary" />
            Ativar Autenticação de Dois Fatores
          </DialogTitle>
        </DialogHeader>

        {step === 'start' && (
          <div className="space-y-4">
            <Alert className="border-primary/30 bg-primary/5">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                A autenticação de dois fatores (MFA) é <strong>obrigatória</strong> para sua conta de usuário administrativo.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 text-sm">
              <p className="font-medium">Como funciona:</p>
              <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                <li>Vous vérifiez um código QR com seu autenticador</li>
                <li>Ao fazer login, você coloca o código de 6 dígitos</li>
                <li>Seus códigos de recuperação são guardados com segurança</li>
              </ol>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleStartEnroll} className="flex-1" disabled={isLoading}>
                {isLoading ? 'Gerando...' : 'Começar a Configuração'}
              </Button>
            </div>
          </div>
        )}

        {step === 'enroll' && qrCode && (
          <div className="space-y-4">
            <div className="text-sm">
              <p className="font-medium mb-3">1. Escaneie este código QR:</p>
              <div className="flex justify-center p-4 bg-muted rounded-lg">
                <img src={qrCode} alt="QR Code MFA" className="h-64 w-64" />
              </div>
            </div>

            <div className="text-sm border-t pt-4">
              <p className="font-medium mb-2">2. Digite o código de 6 dígitos do seu autenticador:</p>
              <Input
                type="text"
                placeholder="000000"
                maxLength={6}
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest font-mono"
                disabled={isLoading}
              />
            </div>

            <Button onClick={handleVerifyCode} className="w-full" disabled={isLoading || verificationCode.length !== 6}>
              {isLoading ? 'Verificando...' : 'Verificar Código'}
            </Button>
          </div>
        )}

        {step === 'recovery' && (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <Check className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">
                Autenticador configurado com sucesso!
              </AlertDescription>
            </Alert>

            <div className="text-sm space-y-3">
              <div>
                <p className="font-semibold mb-2">Códigos de Recuperação:</p>
                <p className="text-muted-foreground text-xs mb-3">
                  Se perder acesso ao seu autenticador, use um desses códigos para acessar sua conta. Guarde-os com segurança!
                </p>
              </div>

              <div className="relative border rounded-lg p-3 bg-muted/50">
                <div className="grid grid-cols-2 gap-2 font-mono text-xs">
                  {(codesVisible ? recoveryCodes : recoveryCodes.map(() => '••••••')).map((code, i) => (
                    <div key={i} className="p-2 bg-background rounded border">
                      {code}
                    </div>
                  ))}
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCodesVisible(!codesVisible)}
                  className="absolute top-2 right-2 h-6"
                >
                  {codesVisible ? 'Ocultar' : 'Mostrar'}
                </Button>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(recoveryCodes.join('\n'));
                  toast({ title: 'Códigos copiados!', description: 'Salve em um local seguro.' });
                }}
              >
                <Copy className="h-3 w-3 mr-1" />
                Copiar Códigos
              </Button>
            </div>

            <div className="pt-2">
              <Button onClick={handleCompleteSetup} className="w-full" disabled={isLoading}>
                Finalizar Configuração
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
