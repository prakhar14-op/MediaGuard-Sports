/**
 * Evidence Vault Routes
 * Proxies to FastAPI evidence_vault endpoints.
 * Provides chain-of-custody, artifact access, and export.
 */
import { Router }    from "express";
import axios         from "axios";
import wrapAsync     from "../utils/wrapAsync.js";
import ExpressError  from "../utils/ExpressError.js";

const router        = Router();
const fastapiClient = axios.create({
  baseURL: process.env.FASTAPI_URL || "http://127.0.0.1:8001",
  timeout: 60_000,
});

// GET /api/evidence/:incident_id — evidence summary + record access
router.get("/evidence/:incident_id", wrapAsync(async (req, res) => {
  const actor = req.query.actor || "investigator";
  const { data } = await fastapiClient.get(
    `/evidence/${req.params.incident_id}`,
    { params: { actor } },
  );
  res.json(data);
}));

// GET /api/evidence/:incident_id/custody — full chain of custody
router.get("/evidence/:incident_id/custody", wrapAsync(async (req, res) => {
  const { data } = await fastapiClient.get(`/evidence/${req.params.incident_id}/custody`);
  res.json(data);
}));

// POST /api/evidence/:incident_id/export — export evidence bundle as ZIP
router.post("/evidence/:incident_id/export", wrapAsync(async (req, res) => {
  const { data } = await fastapiClient.post(`/evidence/${req.params.incident_id}/export`);
  res.json(data);
}));

// POST /api/evidence/:incident_id/sync — sync artifacts to GCS
router.post("/evidence/:incident_id/sync", wrapAsync(async (req, res) => {
  const { data } = await fastapiClient.post(`/evidence/${req.params.incident_id}/sync`);
  res.json(data);
}));

export default router;
