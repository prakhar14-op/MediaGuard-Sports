import { Router } from "express";
import { exec } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import { validateHuntRequest } from "../middleware/validate.js";
import wrapAsync from "../utils/wrapAsync.js";
import ExpressError from "../utils/ExpressError.js";

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PAYLOAD_PATH = path.join(__dirname, "../../assets/suspects/spider_payload.json");

router.post(
  "/hunt",
  validateHuntRequest,
  wrapAsync(async (req, res) => {
    const { official_video_url } = req.body;
    console.log(`\n🚨 [Hunt] New hunt triggered → ${official_video_url}`);

    // Read the pre-generated spider payload (Spider runs separately as Python process)
    if (!fs.existsSync(PAYLOAD_PATH)) {
      throw new ExpressError(
        404,
        "Spider payload not found. Run spider.py first to generate threat data."
      );
    }

    const threatMapData = JSON.parse(fs.readFileSync(PAYLOAD_PATH, "utf-8"));

    res.json({
      success: true,
      status: 200,
      message: "Hunt completed. Suspects secured.",
      data: threatMapData,
    });
  })
);

export default router;
