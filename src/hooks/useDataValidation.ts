/**
 * useDataValidation - Hook for periodic data integrity checks
 * Runs validators in background and alerts on issues
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  runAllValidations,
  getValidationStatus,
  type ValidationResult,
} from '@/lib/data-validators';

interface ValidationStatus {
  isRunning: boolean;
  lastRun: Date | null;
  results: ValidationResult[];
  alertCount: number;
  failedValidators: string[];
}

export function useDataValidation(supabase: any, enabled: boolean = true) {
  const { toast } = useToast();
  const [status, setStatus] = useState<ValidationStatus>({
    isRunning: false,
    lastRun: null,
    results: [],
    alertCount: 0,
    failedValidators: [],
  });

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRunRef = useRef<Date | null>(null);

  /**
   * Execute all validations and handle results
   */
  const runValidations = useCallback(async () => {
    if (!supabase) return;

    try {
      setStatus((prev) => ({ ...prev, isRunning: true }));

      const results = await runAllValidations(supabase);

      // Separate passed and failed
      const failedValidators = results
        .filter((r) => !r.passed)
        .map((r) => r.validator);

      const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);

      setStatus({
        isRunning: false,
        lastRun: new Date(),
        results,
        alertCount: totalIssues,
        failedValidators,
      });

      lastRunRef.current = new Date();

      // Show alerts for critical issues
      const criticalIssues = results.filter((r) => r.issues.length > 0);

      if (criticalIssues.length > 0) {
        // Show one toast per critical validator
        for (const result of criticalIssues) {
          if (result.issues.length > 0) {
            toast({
              title: `Data Integrity Alert: ${result.validator}`,
              description: result.issues.slice(0, 2).join(' | '),
              variant: 'destructive',
            });
          }
        }
      } else {
        toast({
          title: 'Data Validation Complete',
          description: `All validators passed. ${results.length} checks completed.`,
        });
      }
    } catch (error) {
      console.error('Data validation failed:', error);
      toast({
        title: 'Validation Error',
        description: `Failed to run data validators: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    }
  }, [supabase, toast]);

  /**
   * Set up periodic validation (default: every 6 hours)
   */
  useEffect(() => {
    if (!enabled || !supabase) return;

    // Run on mount
    runValidations();

    // Set up interval (6 hours = 21600000 ms)
    const VALIDATION_INTERVAL = 6 * 60 * 60 * 1000; // 6 hours
    intervalRef.current = setInterval(() => {
      runValidations();
    }, VALIDATION_INTERVAL);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, supabase, runValidations]);

  /**
   * Manual trigger for validations
   */
  const runNow = useCallback(async () => {
    await runValidations();
  }, [runValidations]);

  return {
    status,
    runNow,
    isRunning: status.isRunning,
    lastRun: status.lastRun,
    hasFails: status.failedValidators.length > 0,
  };
}

/**
 * useValidationAlerts - Hook to track and resolve integrity alerts
 */
export function useValidationAlerts(supabase: any) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { toast } = useToast();

  /**
   * Load active alerts from database
   */
  const loadAlerts = useCallback(async () => {
    if (!supabase) return;

    try {
      setIsLoading(true);

      const { data: activeAlerts, error } = await supabase
        .from('integrity_alerts')
        .select('*')
        .is('resolved_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setAlerts(activeAlerts || []);
    } catch (error) {
      console.error('Failed to load alerts:', error);
      toast({
        title: 'Alert Loading Error',
        description: `Could not load validation alerts: ${error instanceof Error ? error.message : 'Unknown error'}`,
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [supabase, toast]);

  /**
   * Resolve an alert (mark as handled)
   */
  const resolveAlert = useCallback(
    async (alertId: string, notes?: string) => {
      if (!supabase) return;

      try {
        const { error } = await supabase
          .from('integrity_alerts')
          .update({
            resolved_at: new Date().toISOString(),
            resolution_notes: notes,
          })
          .eq('id', alertId);

        if (error) throw error;

        // Remove from local state
        setAlerts((prev) => prev.filter((a) => a.id !== alertId));

        toast({
          title: 'Alert Resolved',
          description: 'The data integrity alert has been marked as resolved.',
        });
      } catch (error) {
        console.error('Failed to resolve alert:', error);
        toast({
          title: 'Resolution Error',
          description: `Could not resolve alert: ${error instanceof Error ? error.message : 'Unknown error'}`,
          variant: 'destructive',
        });
      }
    },
    [supabase, toast]
  );

  // Load alerts on mount
  useEffect(() => {
    loadAlerts();

    // Reload every 30 minutes
    const interval = setInterval(loadAlerts, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, [loadAlerts]);

  return {
    alerts,
    isLoading,
    activeCount: alerts.filter((a) => !a.resolved_at).length,
    reload: loadAlerts,
    resolve: resolveAlert,
  };
}
