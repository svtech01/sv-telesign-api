import express from "express";
import multer from "multer";
import fs from "fs";

// Utils and Services
import { telesignService } from "../services/telesignService.js";
import { processCSV } from "../services/telesignProcessor.js";
import { dbService } from "../services/dbService.js";

const router = express.Router();

router.post("/upload", async (req, res) => {
  try {

    console.log("Request body: ", req.body)

    if (!req.body?.fileUrl) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await processCSV(req.body.fileUrl, {
      concurrency: 10,
      delayMs: 100,
      batchSize: req.body?.validation_limit || 50,
      mode: req.body?.validation_mode || 'real',
      liveStatus: req.body?.live_status,
      append: req.body?.clear_previous
    });

    res.json(result);

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post("/lookup", async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ error: "Phone is required" });

    const lookup = await telesignService.phoneIdLookup(phone);
    res.json({ success: true, lookup });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const { contact } = req.body;

    if (!contact) return res.status(404).json({ error: "Contact not found" });

    const otp = await telesignService.sendOtp(contact.phoneNumber);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { attemptId, code } = req.body;

    if (!attemptId) return res.status(404).json({ error: "Attempt not found..." });

    const result = await telesignService.verifyOtp(attempt.telesignReferenceId, code);

    res.json({ success: true, result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/credits", async (req, res) => {
  try {
    const credits = await dbService.getCredits();
    res.json(credits);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
