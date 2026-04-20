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
  sentinel_report:  Joi.string().min(1).required(),
  platform:         Joi.string().valid(...PLATFORMS).required(),
  account_handle:   Joi.string().min(1).required(),
  video_title:      Joi.string().min(1).required(),
  thumbnail_url:    Joi.string().uri().optional(),
  description:      Joi.string().max(500).optional(),
  country:          Joi.string().length(2).uppercase().optional(),
}).options({ abortEarly: false });

export const enforceRequestSchema = Joi.object({
  target_account:     Joi.string().min(1).required(),
  platform:           Joi.string().valid(...PLATFORMS).required(),
  confidence_score:   Joi.string().min(1).required(),
  adjudicator_ruling: Joi.string().min(1).required(),
}).options({ abortEarly: false });

export const brokerRequestSchema = Joi.object({
  target_account:          Joi.string().min(1).required(),
  platform:                Joi.string().valid(...PLATFORMS).required(),
  copyright_holder_share:  Joi.number().integer().min(1).max(99).default(30),
  adjudicator_ruling:      Joi.string().min(1).required(),
}).options({ abortEarly: false });
