import { Router } from "express";
import { validateHuntRequest } from "../middleware/validate.js";
import wrapAsync from "../utils/wrapAsync.js";
import { runSwarm } from "../controllers/swarmController.js";

const router = Router();

router.post("/swarm/run", validateHuntRequest, wrapAsync(runSwarm));

export default router;
