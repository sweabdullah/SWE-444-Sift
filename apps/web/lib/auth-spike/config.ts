import type { PrismaClient } from "@sift/db";
import { createAuthConfig, createSignOutAttempt } from "@/lib/auth/config";

export const SPIKE_MAX_AGE = 60 * 60 * 24;
export const SPIKE_COOKIE = "sift.auth-spike.session-token";
export const SPIKE_BASE_PATH = "/api/auth-spike";
export function spikeEnabled(env: { NODE_ENV?: string; SIFT_AUTH_SPIKE?: string } = process.env) {
  return env.NODE_ENV === "development" && env.SIFT_AUTH_SPIKE === "1";
}
function options(enabled: () => boolean) {
  return {
    enabled,
    basePath: SPIKE_BASE_PATH,
    cookieName: SPIKE_COOKIE,
    signInPage: "/en/auth-spike",
    maxAge: SPIKE_MAX_AGE,
  };
}
export function createSpikeConfig(db: PrismaClient, enabled = spikeEnabled) {
  return createAuthConfig(db, options(enabled));
}
export function createSpikeSignOutAttempt(db: PrismaClient, enabled = spikeEnabled) {
  return createSignOutAttempt(db, options(enabled));
}
