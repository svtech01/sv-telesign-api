import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const VerificationAttempt = sequelize.define("VerificationAttempt", {
  telesignReferenceId: DataTypes.STRING,
  telesignStatus: DataTypes.STRING,
  otpExpiresAt: DataTypes.DATE,
  status: DataTypes.STRING,
  attemptsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  maxAttempts: { type: DataTypes.INTEGER, defaultValue: 3 },
  errorCode: DataTypes.STRING,
  errorMessage: DataTypes.STRING,
});
