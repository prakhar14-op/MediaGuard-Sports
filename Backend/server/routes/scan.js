import { Router } from "express";
import wrapAsync from "../utils/wrapAsync.js";
import {
  scanSuspect,
  batchScan,
  getIncidents,
  getIncidentById,
} from "../controllers/sentinelController.js";

const router = Router();

router.post("/scan",          wrapAsync(scanSuspect));
router.post("/scan/batch",    wrapAsync(batchScan));
router.get("/incidents",      wrapAsync(getIncidents));
router.get("/incidents/:id",  wrapAsync(getIncidentById));

export default router;
