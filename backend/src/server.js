import dotenv from "dotenv";
import "./db.js";
import app from "./app.js"; // Ensure the .js extension is included

// Load environment variables
dotenv.config();

const port = process.env.PORT || 3001;

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
