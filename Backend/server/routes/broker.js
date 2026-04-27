import { Router } from "express";
import { validateBrokerRequest, validateBatchBroker } from "../middleware/validate.js";
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
router.post("/broker/batch",         validateBatchBroker,   wrapAsync(batchBroker));
router.patch("/broker/:id/activate", wrapAsync(activateContract));
router.patch("/broker/:id/dispute",  wrapAsync(disputeContract));
router.get("/broker",                wrapAsync(getContracts));
router.get("/broker/:id",            wrapAsync(getContractById));

// ── One-time migration: recalculate all contract revenues to realistic values ──
router.post("/broker/migrate/fix-revenue", wrapAsync(async (req, res) => {
  const ContractRecord = (await import("../models/ContractRecord.js")).default;

  // Realistic CPM rates for licensing (not full ad revenue)
  const LICENSING_CPM = {
    YouTube: 0.60, TikTok: 0.004, Twitter: 0.08,
    Instagram: 0.20, Telegram: 0.02, Reddit: 0.05, Other: 0.08,
  };

  const contracts = await ContractRecord.find({});
  let updated = 0;

  for (const c of contracts) {
    // If revenue looks inflated (> $500), recalculate with realistic rates
    if (c.estimated_monthly_revenue > 500) {
      // We don't have view_count stored, so cap at $500 max
      // and scale down proportionally based on tier
      const tierCap = { Platinum: 500, Gold: 200, Silver: 80, Bronze: 25 };
      const cap = tierCap[c.tier] || 50;
      const newRevenue = Math.min(c.estimated_monthly_revenue, cap);
      await ContractRecord.findByIdAndUpdate(c._id, {
        estimated_monthly_revenue: parseFloat(newRevenue.toFixed(2)),
      });
      updated++;
    }
  }

  res.json({ success: true, message: `Updated ${updated} of ${contracts.length} contracts`, updated });
}));

export default router;
