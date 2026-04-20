import Joi from "joi";

// ─── 1. HUNT REQUEST ────────────────────────────────────────────
// POST /api/hunt  — React UI sends a YouTube/social URL to trigger the Spider
export const huntRequestSchema = Joi.object({
  official_video_url: Joi.string().uri().required().messages({
    "string.uri": "official_video_url must be a valid URL",
    "any.required": "official_video_url is required",
  }),
}).options({ abortEarly: false });

// ─── 2. INGEST REQUEST ──────────────────────────────────────────
// POST /api/ingest — Triggers the Archivist to fingerprint an official video
export const ingestRequestSchema = Joi.object({
  video_path: Joi.string().min(1).required().messages({
    "string.min": "video_path cannot be empty",
    "any.required": "video_path is required",
  }),
}).options({ abortEarly: false });

// ─── 3. ADJUDICATE REQUEST ──────────────────────────────────────
// POST /api/adjudicate — Sends a suspect's metadata to the Adjudicator LLM
export const adjudicateRequestSchema = Joi.object({
  sentinel_report: Joi.string().min(1).required().messages({
    "any.required": "sentinel_report is required",
  }),
  platform: Joi.string()
    .valid("YouTube", "TikTok", "Twitter", "Instagram", "Telegram", "Reddit", "Other")
    .required()
    .messages({
      "any.only": "platform must be YouTube, TikTok, Twitter, Instagram, Telegram, Reddit, or Other",
      "any.required": "platform is required",
    }),
  account_handle: Joi.string().min(1).required().messages({
    "any.required": "account_handle is required",
  }),
  video_title: Joi.string().min(1).required().messages({
    "any.required": "video_title is required",
  }),
  thumbnail_url: Joi.string().uri().optional().messages({
    "string.uri": "thumbnail_url must be a valid URL",
  }),
  description: Joi.string().max(500).optional(),
  country: Joi.string().length(2).uppercase().optional().messages({
    "string.length": "country must be a 2-letter ISO code (e.g. US, IN, GB)",
  }),
}).options({ abortEarly: false });

// ─── 4. ENFORCE ACTION ──────────────────────────────────────────
// POST /api/enforce — Triggers the Enforcer to issue a DMCA notice
export const enforceRequestSchema = Joi.object({
  target_account: Joi.string().min(1).required().messages({
    "any.required": "target_account is required",
  }),
  platform: Joi.string()
    .valid("YouTube", "TikTok", "Twitter", "Instagram", "Telegram", "Reddit", "Other")
    .required()
    .messages({
      "any.only": "platform must be YouTube, TikTok, Twitter, Instagram, Telegram, Reddit, or Other",
      "any.required": "platform is required",
    }),
  confidence_score: Joi.string().min(1).required().messages({
    "any.required": "confidence_score is required",
  }),
  adjudicator_ruling: Joi.string().min(1).required().messages({
    "any.required": "adjudicator_ruling is required",
  }),
}).options({ abortEarly: false });

// ─── 5. BROKER ACTION ───────────────────────────────────────────
// POST /api/broker — Triggers the Broker to deploy a rev-share smart contract
export const brokerRequestSchema = Joi.object({
  target_account: Joi.string().min(1).required().messages({
    "any.required": "target_account is required",
  }),
  platform: Joi.string()
    .valid("YouTube", "TikTok", "Twitter", "Instagram", "Telegram", "Reddit", "Other")
    .required()
    .messages({
      "any.only": "platform must be YouTube, TikTok, Twitter, Instagram, Telegram, Reddit, or Other",
      "any.required": "platform is required",
    }),
  copyright_holder_share: Joi.number().integer().min(1).max(99).default(30).messages({
    "number.min": "copyright_holder_share must be at least 1%",
    "number.max": "copyright_holder_share must be at most 99%",
  }),
  adjudicator_ruling: Joi.string().min(1).required().messages({
    "any.required": "adjudicator_ruling is required",
  }),
}).options({ abortEarly: false });
