import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const PhoneLookupResult = sequelize.define("PhoneLookupResult", {
  telesignReferenceId: DataTypes.STRING,
  originalNumber: DataTypes.STRING,
  cleansedNumber: DataTypes.STRING,
  countryIso2: DataTypes.STRING,
  carrierName: DataTypes.STRING,
  phoneTypeDescription: DataTypes.STRING,
  riskLevel: DataTypes.STRING,
  liveStatusCode: DataTypes.STRING,
  liveStatusDescription: DataTypes.STRING,
  isRoaming: DataTypes.BOOLEAN,
  roamingCountry: DataTypes.STRING,
});
