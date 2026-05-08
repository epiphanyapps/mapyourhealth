import { storage } from "./storage"

export type AppEnv = "prod" | "staging"

export const ENV_OVERRIDE_KEY = "envOverride"

/**
 * Read synchronously at module load (before Amplify.configure) — MMKV is sync,
 * so the picked outputs are available on the first JS tick.
 */
export function getEnvOverride(): AppEnv {
  const value = storage.getString(ENV_OVERRIDE_KEY)
  return value === "staging" ? "staging" : "prod"
}

export function setEnvOverride(env: AppEnv): void {
  if (env === "prod") {
    storage.delete(ENV_OVERRIDE_KEY)
  } else {
    storage.set(ENV_OVERRIDE_KEY, env)
  }
}
