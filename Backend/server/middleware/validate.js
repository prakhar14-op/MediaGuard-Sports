import ExpressError from "../utils/ExpressError.js";
import {
  huntRequestSchema,
  ingestRequestSchema,
  adjudicateRequestSchema,
  enforceRequestSchema,
  brokerRequestSchema,
  batchScanSchema,
  batchAdjudicateSchema,
  batchEnforceSchema,
  batchBrokerSchema,
} from "../schemas/Schema.js";

const runValidation = (schema, data) => {
  const { error } = schema.validate(data, { abortEarly: false });
  if (error) throw new ExpressError(400, error.details.map((d) => d.message).join(", "));
};

export const validateHuntRequest = (req, _res, next) => {
  runValidation(huntRequestSchema, req.body);
  next();
};

export const validateIngestRequest = (req, _res, next) => {
  runValidation(ingestRequestSchema, req.body);
  next();
};

export const validateAdjudicateRequest = (req, _res, next) => {
  runValidation(adjudicateRequestSchema, req.body);
  next();
};

export const validateEnforceRequest = (req, _res, next) => {
  runValidation(enforceRequestSchema, req.body);
  next();
};

export const validateBrokerRequest = (req, _res, next) => {
  runValidation(brokerRequestSchema, req.body);
  next();
};

export const validateBatchScan = (req, _res, next) => {
  runValidation(batchScanSchema, req.body);
  next();
};

export const validateBatchAdjudicate = (req, _res, next) => {
  runValidation(batchAdjudicateSchema, req.body);
  next();
};

export const validateBatchEnforce = (req, _res, next) => {
  runValidation(batchEnforceSchema, req.body);
  next();
};

export const validateBatchBroker = (req, _res, next) => {
  runValidation(batchBrokerSchema, req.body);
  next();
};
