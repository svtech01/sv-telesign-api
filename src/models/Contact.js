import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Contact = sequelize.define("Contact", {
  firstName: DataTypes.STRING,
  lastName: DataTypes.STRING,
  email: DataTypes.STRING,
  phoneNumber: DataTypes.STRING,
  phoneNumberE164: DataTypes.STRING,
  carrier: DataTypes.STRING,
  phoneType: DataTypes.STRING,
  countryCode: DataTypes.STRING,
  isValid: DataTypes.BOOLEAN,
  riskLevel: DataTypes.STRING,
  requiresReview: DataTypes.BOOLEAN,
  verificationStatus: DataTypes.STRING,
  isReachable: DataTypes.BOOLEAN,
  isRoaming: DataTypes.BOOLEAN,
});
