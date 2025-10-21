import express from "express";
import multer from "multer";
import pLimit from "p-limit";

// Utils and Services
import { parseCSV } from "../utils/csvParser.js";
import { sanitizeRow } from "../utils/csvSanitizer.js";
import { telesignService } from "../services/telesignService.js";

// Models
import { Contact } from "../models/Contact.js";
import { VerificationAttempt } from "../models/VerificationAttempt.js";
import { PhoneLookupResult } from "../models/PhoneLookupResult.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

router.post("/upload", upload.single("file"), async (req, res) => {
  try {

    

    const result = await processCSVWithBatching(req.file.path, {
      concurrency: 10,
      delayMs: 100,
      batchSize: 50,
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
    const contact = await Contact.create({
      phoneNumber: phone,
      isValid: lookup.status.code === 300,
      phoneNumberE164: lookup.numbering?.cleansed_code,
      riskLevel: lookup.numbering?.risk?.level || "unknown",
    });

    await PhoneLookupResult.create({
      contactId: contact.id,
      originalNumber: phone,
      cleansedNumber: lookup.numbering?.cleansed_code,
      carrierName: lookup.carrier?.name,
      riskLevel: lookup.numbering?.risk?.level || "unknown",
    });

    res.json({ success: true, lookup, contact });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/send-otp", async (req, res) => {
  try {
    const { contactId } = req.body;
    const contact = await Contact.findByPk(contactId);
    if (!contact) return res.status(404).json({ error: "Contact not found" });

    const otp = await telesignService.sendOtp(contact.phoneNumber);
    const attempt = await VerificationAttempt.create({
      contactId,
      telesignReferenceId: otp.reference_id,
      telesignStatus: otp.status?.description,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      status: "sent",
    });

    res.json({ success: true, attempt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/verify-otp", async (req, res) => {
  try {
    const { attemptId, code } = req.body;
    const attempt = await VerificationAttempt.findByPk(attemptId);
    if (!attempt) return res.status(404).json({ error: "Attempt not found" });

    const result = await telesignService.verifyOtp(attempt.telesignReferenceId, code);
    attempt.status = result.verify.code_state === "VALID" ? "verified" : "failed";
    await attempt.save();

    res.json({ success: true, result, status: attempt.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
