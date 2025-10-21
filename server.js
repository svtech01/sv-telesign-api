import express from "express";
import dotenv from "dotenv";
import path from 'path';
import telesignRoutes from "./src/routes/telesignRoutes.js";

dotenv.config();
const app = express();

app.use(express.json());
app.use("/api", telesignRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 5000;

(async () => {
  try {
    app.listen(PORT, () => console.log(`🚀 Server running on port http://127.0.0.1:${PORT}/`));
  } catch (error) {
    console.error("Database sync failed:", error);
  }
})();