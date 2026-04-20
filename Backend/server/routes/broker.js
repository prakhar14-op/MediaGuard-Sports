import { Router } from "express";
import { validateBrokerRequest } from "../middleware/validate.js";
import wrapAsync from "../utils/wrapAsync.js";
import {
  brokerIncident,
  activateContract,
  disputeContract,
  batchBroker,
  getContracts,
  getContractById,
} from "../controllers/brokerController.js";

const router = Router();

router.post("/broker",               validateBrokerRequest, wrapAsync(brokerIncident));
router.post("/broker/batch",         wrapAsync(batchBroker));
router.patch("/broker/:id/activate", wrapAsync(activateContract));
router.patch("/broker/:id/dispute",  wrapAsync(disputeContract));
router.get("/broker",                wrapAsync(getContracts));
router.get("/broker/:id",            wrapAsync(getContractById));

export default router;
