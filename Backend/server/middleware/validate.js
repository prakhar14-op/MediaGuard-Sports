/**
 * validate.js — MediaGuard Request Validators
 *
 * Each exported function is an Express middleware.
 * On failure → throws ExpressError(400, messages)
 * On success → calls next()
 */

import ExpressError from "../utils/ExpressError.js";
import {
  huntRequestSchema,
  ingestRequestSchema,
  adjudicateRequestSchema,
  enforceRequestSchema,
  brokerRequestSchema,
} from "../schemas/Schema.js";

// ─── Helper ─────────────────────────────────────────────────────
const runValidation = (schema, data) => {
  const { error } = schema.validate(data, { abortEarly: false });
  if (error) {
    const message = error.details.map((d) => d.message).join(", ");
    throw new ExpressError(400, message);
  }
};

// ─── 1. Hunt (Spider trigger) ────────────────────────────────────
export const validateHuntRequest = (req, res, next) => {
  console.log("🕷️  [Hunt] Validating request:", req.body);
  runValidation(huntRequestSchema, req.body);
  console.log("✅ [Hunt] Validation passed");
  next();
};

// ─── 2. Ingest (Archivist trigger) ───────────────────────────────
export const validateIngestRequest = (req, res, next) => {
  console.log("📦 [Ingest] Validating request:", req.body);
  runValidation(ingestRequestSchema, req.body);
  console.log("✅ [Ingest] Validation passed");
  next();
};

// ─── 3. Adjudicate (Adjudicator LLM trigger) ─────────────────────
export const validateAdjudicateRequest = (req, res, next) => {
  console.log("⚖️  [Adjudicate] Validating request:", req.body);
  runValidation(adjudicateRequestSchema, req.body);
  console.log("✅ [Adjudicate] Validation passed");
  next();
};

// ─── 4. Enforce (DMCA trigger) ───────────────────────────────────
export const validateEnforceRequest = (req, res, next) => {
  console.log("🔨 [Enforce] Validating request:", req.body);
  runValidation(enforceRequestSchema, req.body);
  console.log("✅ [Enforce] Validation passed");
  next();
};

// ─── 5. Broker (Smart contract trigger) ──────────────────────────
export const validateBrokerRequest = (req, res, next) => {
  console.log("💰 [Broker] Validating request:", req.body);
  runValidation(brokerRequestSchema, req.body);
  console.log("✅ [Broker] Validation passed");
  next();
};
