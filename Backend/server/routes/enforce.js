import { Router } from "express";
import { validateEnforceRequest, validateBatchEnforce } from "../middleware/validate.js";
import wrapAsync from "../utils/wrapAsync.js";
import {
  enforceIncident,
  approveDMCA,
  rejectDMCA,
  batchEnforce,
  getDMCARecords,
  getDMCAById,
} from "../controllers/enforcerController.js";

const router = Router();

router.post("/enforce",              validateEnforceRequest, wrapAsync(enforceIncident));
router.post("/enforce/batch",        validateBatchEnforce,   wrapAsync(batchEnforce));
router.patch("/enforce/:id/approve", wrapAsync(approveDMCA));
router.patch("/enforce/:id/reject",  wrapAsync(rejectDMCA));
router.get("/enforce",               wrapAsync(getDMCARecords));
router.get("/enforce/:id",           wrapAsync(getDMCAById));

export default router;
