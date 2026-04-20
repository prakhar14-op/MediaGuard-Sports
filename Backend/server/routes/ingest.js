import { Router } from "express";
import { validateIngestRequest } from "../middleware/validate.js";
import wrapAsync from "../utils/wrapAsync.js";
import { ingestAsset, getAssets, getAssetById } from "../controllers/archivistController.js";

const router = Router();

router.post("/ingest", validateIngestRequest, wrapAsync(ingestAsset));
router.get("/ingest", wrapAsync(getAssets));
router.get("/ingest/:id", wrapAsync(getAssetById));

export default router;
