/**
 * DataIntegrityMonitor - Component to display and manage data integrity alerts
 * Shows active validation issues and allows admins to resolve them
 */

import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, Clock, Trash2, Eye } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useDataValidation, useValidationAlerts } from '@/hooks/useDataValidation';

interface DataIntegrityMonitorProps {
  supabase: any;
  open: boolean;
  onClose: () => void;
}

/**
 * Severity color mapping for visual consistency
 */
const SEVERITY_COLORS = {
  critical: 'bg-red-100 text-red-800 border-red-300',
  high: 'bg-orange-100 text-orange-800 border-orange-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-blue-100 text-blue-800 border-blue-300',
};

const SEVERITY_BADGES = {
  critical: 'destructive',
  high: 'default',
  medium: 'secondary',
  low: 'outline',
};

export function DataIntegrityMonitor({
  supabase,
  open,
  onClose,
}: DataIntegrityMonitorProps) {
  const { status, runNow, isRunning } = useDataValidation(supabase, false);
  const { alerts, activeCount, reload, resolve } = useValidationAlerts(supabase);
  const [selectedAlert, setSelectedAlert] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [resolving, setResolving] = useState(false);

  /**
   * Handle manual validation trigger
   */
  const handleRunValidation = async () => {
    await runNow();
    await reload();
  };

  /**
   * Handle alert resolution
   */
  const handleResolveAlert = async () => {
    if (!selectedAlert) return;

    setResolving(true);
    try {
      await resolve(selectedAlert.id, resolutionNotes);
      setSelectedAlert(null);
      setResolutionNotes('');
    } finally {
      setResolving(false);
    }
  };

  /**
   * Format timestamp for display
   */
  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleString('pt-BR');
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-yellow-600" />
            Data Integrity Monitor
          </DialogTitle>
          <DialogDescription>
            Monitor and resolve data consistency issues in critical hospital operations
          </DialogDescription>
        </DialogHeader>

        {/* Validation Status Summary */}
        <div className="grid grid-cols-4 gap-2">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Active Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{activeCount}</div>
              <p className="text-xs text-muted-foreground">requires attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Last Validation</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm">
                {status.lastRun
                  ? formatTime(status.lastRun.toISOString()).split(' ')[1]
                  : 'Never'}
              </div>
              <p className="text-xs text-muted-foreground">today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Failed Checks</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{status.failedValidators.length}</div>
              <p className="text-xs text-muted-foreground">of {status.results.length}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{status.alertCount}</div>
              <p className="text-xs text-muted-foreground">found</p>
            </CardContent>
          </Card>
        </div>

        {/* Control Buttons */}
        <div className="flex gap-2">
          <Button onClick={handleRunValidation} disabled={isRunning} className="gap-2">
            {isRunning ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Running Validation...
              </>
            ) : (
              <>
                <CheckCircle className="w-4 h-4" />
                Run Now
              </>
            )}
          </Button>
          <Button variant="outline" onClick={reload}>
            Reload Alerts
          </Button>
        </div>

        {/* Validation Results */}
        {status.results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Recent Validation Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {status.results.map((result) => (
                <div
                  key={result.validator}
                  className={`p-2 border rounded ${
                    result.passed
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-sm">{result.validator}</span>
                    <Badge variant={result.passed ? 'default' : 'destructive'}>
                      {result.passed ? 'PASSED' : `${result.issues.length} ISSUES`}
                    </Badge>
                  </div>
                  {result.issues.length > 0 && (
                    <p className="text-xs text-red-700 mt-1">
                      {result.issues[0]}...
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Active Alerts List */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Active Alerts ({activeCount})
            </CardTitle>
            <CardDescription>
              {activeCount === 0
                ? 'All data integrity checks are passing'
                : 'Review and resolve these data consistency issues'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 max-h-60 overflow-y-auto">
            {alerts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No active alerts
              </p>
            ) : (
              alerts.map((alert) => (
                <Alert
                  key={alert.id}
                  className={SEVERITY_COLORS[alert.severity as keyof typeof SEVERITY_COLORS] || 'border-gray-300'}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>
                    <div className="flex items-center justify-between">
                      <span>{alert.validator}</span>
                      <Badge variant={SEVERITY_BADGES[alert.severity as keyof typeof SEVERITY_BADGES]}>
                        {alert.severity?.toUpperCase()}
                      </Badge>
                    </div>
                  </AlertTitle>
                  <AlertDescription className="space-y-2">
                    <p>{alert.description}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Clock className="w-3 h-3" />
                      {formatTime(alert.created_at)}
                      <span>|</span>
                      <span>Affected: {alert.affected_records} records</span>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => {
                        setSelectedAlert(alert);
                        setResolutionNotes('');
                      }}
                      className="gap-1 h-7 text-xs"
                    >
                      <Eye className="w-3 h-3" />
                      Review & Resolve
                    </Button>
                  </AlertDescription>
                </Alert>
              ))
            )}
          </CardContent>
        </Card>

        {/* Validation Notes */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>What This Monitor Does</AlertTitle>
          <AlertDescription className="space-y-1 text-xs">
            <p>
              🛏️ <strong>Bed Consistency:</strong> Ensures one bed cannot have two active patients
            </p>
            <p>
              💊 <strong>Medication Chain:</strong> Verifies all dispensations have entry records
            </p>
            <p>
              👩‍⚕️ <strong>Shift Conflicts:</strong> Detects nurses assigned to overlapping shifts
            </p>
            <p>
              👤 <strong>Patient Admissions:</strong> Prevents duplicate admissions same day
            </p>
          </AlertDescription>
        </Alert>
      </DialogContent>

      {/* Alert Resolution Dialog */}
      {selectedAlert && (
        <Dialog
          open={!!selectedAlert}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSelectedAlert(null);
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Resolve Data Integrity Alert</DialogTitle>
              <DialogDescription>
                Review the alert details and add resolution notes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-sm">Alert Details</h4>
                <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                  <p>
                    <strong>Validator:</strong> {selectedAlert.validator}
                  </p>
                  <p>
                    <strong>Severity:</strong>{' '}
                    <Badge variant={SEVERITY_BADGES[selectedAlert.severity as keyof typeof SEVERITY_BADGES]}>
                      {selectedAlert.severity?.toUpperCase()}
                    </Badge>
                  </p>
                  <p>
                    <strong>Description:</strong> {selectedAlert.description}
                  </p>
                  <p>
                    <strong>Affected Records:</strong> {selectedAlert.affected_records}
                  </p>
                  <p>
                    <strong>Created:</strong> {formatTime(selectedAlert.created_at)}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Resolution Notes</label>
                <Textarea
                  placeholder="Describe the action taken to resolve this issue..."
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  className="mt-2 h-20"
                />
              </div>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setSelectedAlert(null)}
                  disabled={resolving}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleResolveAlert}
                  disabled={resolving || !resolutionNotes.trim()}
                  className="gap-2"
                >
                  {resolving ? (
                    <>
                      <Clock className="w-4 h-4 animate-spin" />
                      Resolving...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Mark as Resolved
                    </>
                  )}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
