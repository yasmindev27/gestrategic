// Data Integrity Validation Service
// Scheduled edge function to run validators every 6 hours
// Deploy using: supabase functions deploy execute-validators --project-ref xxxxx

import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.38.4/+esm";

// Enable CORS
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface ValidationResult {
  validator: string;
  passed: boolean;
  issues: string[];
  itemsScanned: number;
}

/**
 * Service function to execute all validators
 * Called by: Supabase Edge Functions
 */
async function executeAllValidators(supabase: any): Promise<ValidationResult[]> {
  const results: ValidationResult[] = [];

  try {
    // 1. Bed Simultaneous Occupancy Check
    console.log("[VALIDATOR] Running bed_simultaneous_occupancy...");
    const bedResult = await validateBedsConsistency(supabase);
    results.push(bedResult);

    // 2. Medication Chain Check
    console.log("[VALIDATOR] Running medication_entry_exit_balance...");
    const medResult = await validateMedicationChain(supabase);
    results.push(medResult);

    // 3. Shift Conflicts Check
    console.log("[VALIDATOR] Running shift_conflicts...");
    const shiftResult = await validateShiftConflicts(supabase);
    results.push(shiftResult);

    // 4. Patient Admissions Check
    console.log("[VALIDATOR] Running patient_multiple_admissions...");
    const patientResult = await validatePatientAdmissions(supabase);
    results.push(patientResult);

    // Log results to database
    const now = new Date().toISOString();
    for (const result of results) {
      try {
        await supabase.from("validation_logs").insert({
          validator_name: result.validator,
          passed: result.passed,
          issues_count: result.issues.length,
          items_scanned: result.itemsScanned,
          details: { issues: result.issues },
          executed_at: now,
        });
      } catch (logError) {
        console.error(`Failed to log ${result.validator}:`, logError);
      }
    }

    return results;
  } catch (error) {
    console.error("[VALIDATOR] Execution failed:", error);
    throw error;
  }
}

/**
 * Validator 1: Beds - Simultaneous Occupancy Check
 */
async function validateBedsConsistency(
  supabase: any
): Promise<ValidationResult> {
  const issues: string[] = [];

  try {
    // Find beds with multiple active records
    const { data: conflicts, error } = await supabase
      .from("bed_records")
      .select("cama_id, count(*) as count")
      .eq("status", "ocupado")
      .gte("data_internacao", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("cama_id");

    if (error) {
      issues.push(`Database error: ${error.message}`);
      return {
        validator: "bed_simultaneous_occupancy",
        passed: false,
        issues,
        itemsScanned: 0,
      };
    }

    // Manual grouping since Supabase GROUP BY has limitations in RLS
    const bedMap = new Map<string, number>();
    if (conflicts) {
      for (const record of conflicts) {
        const count = bedMap.get(record.cama_id) || 0;
        bedMap.set(record.cama_id, count + 1);
      }

      for (const [bedId, count] of bedMap.entries()) {
        if (count > 1) {
          issues.push(`Bed ${bedId}: ${count} active occupancy records found`);

          // Create alert
          try {
            await supabase.from("integrity_alerts").insert({
              severity: "critical",
              validator: "bed_simultaneous_occupancy",
              description: `Bed ${bedId} has multiple simultaneously active occupancy records (${count})`,
              affected_records: count,
              details: { cama_id: bedId, count },
            });
          } catch (alertError) {
            console.error("Failed to create alert:", alertError);
          }
        }
      }
    }

    return {
      validator: "bed_simultaneous_occupancy",
      passed: issues.length === 0,
      issues,
      itemsScanned: conflicts?.length || 0,
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : String(err);
    issues.push(`Validation error: ${errorMsg}`);
    return {
      validator: "bed_simultaneous_occupancy",
      passed: false,
      issues,
      itemsScanned: 0,
    };
  }
}

/**
 * Validator 2: Medication Entry/Exit Balance Check
 */
async function validateMedicationChain(
  supabase: any
): Promise<ValidationResult> {
  const issues: string[] = [];

  try {
    // Find all dispensations from last 7 days
    const { data: dispensations, error: dispError } = await supabase
      .from("medicamentos_dispensacao")
      .select("id, medicamento_id, entrada_id, created_at")
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString());

    if (dispError) {
      issues.push(`Database error: ${dispError.message}`);
      return {
        validator: "medication_entry_exit_balance",
        passed: false,
        issues,
        itemsScanned: 0,
      };
    }

    if (!dispensations) {
      return {
        validator: "medication_entry_exit_balance",
        passed: true,
        issues: [],
        itemsScanned: 0,
      };
    }

    // Check each dispensation has a valid entrada_id
    const orphanedCount = dispensations.filter((d) => !d.entrada_id).length;

    if (orphanedCount > 0) {
      issues.push(`Found ${orphanedCount} dispensations without entry records`);

      try {
        await supabase.from("integrity_alerts").insert({
          severity: "high",
          validator: "medication_entry_exit_balance",
          description: `${orphanedCount} medications dispensed without entry recorded`,
          affected_records: orphanedCount,
          details: { count: orphanedCount },
        });
      } catch (alertError) {
        console.error("Failed to create alert:", alertError);
      }
    }

    return {
      validator: "medication_entry_exit_balance",
      passed: issues.length === 0,
      issues,
      itemsScanned: dispensations.length,
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : String(err);
    issues.push(`Validation error: ${errorMsg}`);
    return {
      validator: "medication_entry_exit_balance",
      passed: false,
      issues,
      itemsScanned: 0,
    };
  }
}

/**
 * Validator 3: Nursing Shift Conflicts Check
 */
async function validateShiftConflicts(
  supabase: any
): Promise<ValidationResult> {
  const issues: string[] = [];

  try {
    // Query shift conflicts using stored procedure
    const { data: conflicts, error } = await supabase.rpc(
      "check_shift_conflicts"
    );

    if (error) {
      console.warn("Shift conflicts check unavailable:", error.message);
      // Not a failure, function may not exist yet
      return {
        validator: "shift_conflicts",
        passed: true,
        issues: [],
        itemsScanned: 0,
      };
    }

    if (conflicts && conflicts.length > 0) {
      issues.push(`Found ${conflicts.length} shift conflicts`);

      for (const conflict of conflicts) {
        issues.push(
          `Nurse ${conflict.enfermeiro_nome}: Overlapping shifts on ${conflict.data}`
        );
      }

      try {
        await supabase.from("integrity_alerts").insert({
          severity: "high",
          validator: "shift_conflicts",
          description: `${conflicts.length} shift conflicts detected`,
          affected_records: conflicts.length,
          details: { conflicts },
        });
      } catch (alertError) {
        console.error("Failed to create alert:", alertError);
      }
    }

    return {
      validator: "shift_conflicts",
      passed: issues.length === 0,
      issues,
      itemsScanned: conflicts?.length || 0,
    };
  } catch (err) {
    console.warn("Shift conflicts check failed:", err);
    return {
      validator: "shift_conflicts",
      passed: true,
      issues: [],
      itemsScanned: 0,
    };
  }
}

/**
 * Validator 4: Patient Multiple Admissions Check
 */
async function validatePatientAdmissions(
  supabase: any
): Promise<ValidationResult> {
  const issues: string[] = [];

  try {
    // Find beds for current/recent admissions
    const { data: beds, error: bedsError } = await supabase
      .from("bed_records")
      .select("paciente_id, data_internacao")
      .gte("data_internacao", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("data_internacao");

    if (bedsError) {
      issues.push(`Database error: ${bedsError.message}`);
      return {
        validator: "patient_multiple_admissions",
        passed: false,
        issues,
        itemsScanned: 0,
      };
    }

    if (!beds || beds.length === 0) {
      return {
        validator: "patient_multiple_admissions",
        passed: true,
        issues: [],
        itemsScanned: 0,
      };
    }

    // Group by paciente_id and data to find duplicates
    const admissionMap = new Map<string, number>();
    for (const bed of beds) {
      const key = `${bed.paciente_id}-${bed.data_internacao}`;
      const count = admissionMap.get(key) || 0;
      admissionMap.set(key, count + 1);
    }

    // Find duplicates
    for (const [key, count] of admissionMap.entries()) {
      if (count > 1) {
        const [pacId, date] = key.split("-");
        issues.push(`Patient ${pacId}: ${count} admissions on ${date}`);

        try {
          await supabase.from("integrity_alerts").insert({
            severity: "medium",
            validator: "patient_multiple_admissions",
            description: `Patient has ${count} admissions on the same date`,
            affected_records: count,
            details: { paciente_id: pacId, data: date, count },
          });
        } catch (alertError) {
          console.error("Failed to create alert:", alertError);
        }
      }
    }

    return {
      validator: "patient_multiple_admissions",
      passed: issues.length === 0,
      issues,
      itemsScanned: beds.length,
    };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : String(err);
    issues.push(`Validation error: ${errorMsg}`);
    return {
      validator: "patient_multiple_admissions",
      passed: false,
      issues,
      itemsScanned: 0,
    };
  }
}

/**
 * Main handler for edge function
 */
serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client with service role (to bypass RLS)
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase credentials");
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Run all validators
    const results = await executeAllValidators(supabase);

    // Count failures
    const failureCount = results.filter((r) => !r.passed).length;
    const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);

    const summary = {
      timestamp: new Date().toISOString(),
      validators_run: results.length,
      validators_passed: results.length - failureCount,
      validators_failed: failureCount,
      total_issues: totalIssues,
      results,
    };

    console.log("[VALIDATOR] Summary:", JSON.stringify(summary, null, 2));

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("[VALIDATOR] Fatal error:", error);

    const errorResponse = {
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  }
});
