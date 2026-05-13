const express = require("express");
const fs = require("fs/promises");
const path = require("path");

const app = express();
const port = process.env.PORT || 3000;
const dataFile = path.join(__dirname, "data", "site.json");
const messagesFile = path.join(__dirname, "data", "messages.json");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

async function readJson(filePath, fallback) {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw);
  } catch (error) {
    if (error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

async function writeJson(filePath, value) {
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

app.get("/", async (req, res, next) => {
  try {
    const site = await readJson(dataFile, {});
    res.render("index", {
      site,
      submitted: req.query.submitted === "1"
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/site", async (req, res, next) => {
  try {
    const site = await readJson(dataFile, {});
    res.json(site);
  } catch (error) {
    next(error);
  }
});

app.post("/contact", async (req, res, next) => {
  try {
    const { name = "", email = "", message = "" } = req.body;
    const payload = {
      name: name.trim(),
      email: email.trim(),
      message: message.trim(),
      createdAt: new Date().toISOString()
    };

    if (!payload.name || !payload.email || !payload.message) {
      return res.status(400).send("Missing required fields.");
    }

    const messages = await readJson(messagesFile, []);
    messages.unshift(payload);
    await writeJson(messagesFile, messages);
    res.redirect("/?submitted=1#contact");
  } catch (error) {
    next(error);
  }
});

app.use((error, req, res, next) => {
  console.error(error);
  res.status(500).send("Server error");
});

app.listen(port, () => {
  console.log(`Site running on http://localhost:${port}`);
});
