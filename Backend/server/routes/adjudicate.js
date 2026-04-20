import { Router } from "express";
import { validateAdjudicateRequest } from "../middleware/validate.js";
import wrapAsync from "../utils/wrapAsync.js";
import { adjudicateIncident, batchAdjudicate, getVerdict } from "../controllers/adjudicatorController.js";

const router = Router();

router.post("/adjudicate",         validateAdjudicateRequest, wrapAsync(adjudicateIncident));
router.post("/adjudicate/batch",   wrapAsync(batchAdjudicate));
router.get("/adjudicate/:id",      wrapAsync(getVerdict));

export default router;
