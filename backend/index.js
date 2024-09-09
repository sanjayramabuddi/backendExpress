const express = require("express");
const rootRouter = require("./routes/index");
const cors = require("cors");
require("dotenv").config();
const PORT = process.env.PORT || 4000;

const app = express();
app.use(cors());
app.use(express.json());

const database = require("./db");
database();

app.use("/api/v1", rootRouter);

app.get("/", (req, res) => {
  res.send("Hello, World!");
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
