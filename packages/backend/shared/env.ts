/**
 * Required-env helpers shared across Lambda handlers.
 *
 * Background: many handlers used to read `process.env.FOO || ''` at module
 * scope. A misconfigured deploy (env var missing or unset) would silently
 * propagate the empty string into downstream API calls (`fetch(..., apiKey: '')`)
 * or DynamoDB commands (`TableName: ''`). The Lambda would appear healthy —
 * cold-start fine, requests reach the handler — but every operation would
 * fail in a confusing, deep-stack way (Google rejects with HTTP 400, DDB
 * throws ResourceNotFoundException, etc.).
 *
 * `requireEnv` flips that: a missing var throws during cold-start init.
 * CloudWatch shows it as an INIT_REPORT failure with a clear message
 * naming the variable, and the Lambda stays in a failed state until it's
 * fixed. Loud, immediate, debuggable.
 *
 * Call at module top-level so the throw runs once on cold start, not on
 * every invocation.
 */

export class MissingEnvError extends Error {
  constructor(name: string) {
    super(
      `Required environment variable ${name} is missing or empty. ` +
        `Check the Lambda's resource.ts / backend.ts wiring.`,
    );
    this.name = "MissingEnvError";
  }
}

/**
 * Read a required env var. Throws `MissingEnvError` if unset or empty string.
 */
export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new MissingEnvError(name);
  }
  return value;
}
