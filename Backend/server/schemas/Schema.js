import Joi from "joi";

const PLATFORMS = ["YouTube", "TikTok", "Twitter", "Instagram", "Telegram", "Reddit", "Other"];

export const huntRequestSchema = Joi.object({
  official_video_url: Joi.string().uri().required().messages({
    "string.uri": "official_video_url must be a valid URL",
    "any.required": "official_video_url is required",
  }),
}).options({ abortEarly: false });

export const ingestRequestSchema = Joi.object({
  official_video_url: Joi.string().uri().required().messages({
    "string.uri": "official_video_url must be a valid URL",
    "any.required": "official_video_url is required",
  }),
}).options({ abortEarly: false });

export const adjudicateRequestSchema = Joi.object({
  incident_id:      Joi.string().min(1).required(),
  sentinel_report:  Joi.string().min(1).required(),
  platform:         Joi.string().valid(...PLATFORMS).required(),
  account_handle:   Joi.string().min(1).required(),
  video_title:      Joi.string().min(1).required(),
  thumbnail_url:    Joi.string().uri().optional(),
  description:      Joi.string().max(500).optional(),
  country:          Joi.string().length(2).uppercase().optional(),
  confidence_score: Joi.number().min(0).max(100).optional(),
}).options({ abortEarly: false });

export const enforceRequestSchema = Joi.object({
  incident_id:      Joi.string().min(1).required(),
  target_account:   Joi.string().min(1).required(),
  platform:         Joi.string().valid(...PLATFORMS).required(),
  video_title:      Joi.string().min(1).required(),
  video_url:        Joi.string().uri().optional().allow(""),
  confidence_score: Joi.number().min(0).max(100).required(),
  classification:   Joi.string().valid("SEVERE PIRACY", "FAIR USE / FAN CONTENT").required(),
  justification:    Joi.string().min(1).required(),
  integrity_hash:   Joi.string().optional().allow(""),
}).options({ abortEarly: false });

export const brokerRequestSchema = Joi.object({
  incident_id:            Joi.string().min(1).required(),
  target_account:         Joi.string().min(1).required(),
  platform:               Joi.string().valid(...PLATFORMS).required(),
  video_title:            Joi.string().min(1).required(),
  video_url:              Joi.string().uri().optional().allow(""),
  justification:          Joi.string().min(1).required(),
  view_count:             Joi.number().integer().min(0).default(0),
  risk_score:             Joi.number().integer().min(0).max(100).default(30),
}).options({ abortEarly: false });
