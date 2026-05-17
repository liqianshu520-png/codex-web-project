const express = require("express");
const fs = require("fs/promises");
const path = require("path");
const multer = require("multer");

const app = express();
const port = process.env.PORT || 3000;

const dataFile = path.join(__dirname, "data", "site.json");
const messagesFile = path.join(__dirname, "data", "messages.json");
const novelMetaFile = path.join(__dirname, "data", "novels", "yuan", "meta.json");
const yuanChaptersDir = path.join(__dirname, "data", "novels", "yuan", "chapters");
const yuanGalleryDir = path.join(__dirname, "public", "uploads", "yuan");

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, yuanGalleryDir);
    },
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || "").toLowerCase();
      const base = path
        .basename(file.originalname || "image", ext)
        .replace(/[^\p{L}\p{N}\-_]+/gu, "-")
        .replace(/-+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48) || "image";
      cb(null, `${Date.now()}-${base}${ext}`);
    }
  }),
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    const byMime = /^image\/(png|jpe?g|webp|gif)$/i.test(file.mimetype || "");
    const byExt = [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(ext);
    if (byMime || byExt) {
      return cb(null, true);
    }
    cb(new Error("Only image uploads are allowed."));
  },
  limits: {
    fileSize: 50 * 1024 * 1024
  }
});

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

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderMarkdown(markdown) {
  const blocks = markdown
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const heading = block.match(/^(#{1,3})\s+(.+)$/);
      if (heading) {
        const level = heading[1].length;
        return `<h${level}>${escapeHtml(heading[2])}</h${level}>`;
      }

      return `<p>${escapeHtml(block).replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
}

function chapterTitleFromFile(fileName, fallbackIndex) {
  return path.basename(fileName, ".md").replace("-", " ") || `第${fallbackIndex + 1}章`;
}

async function ensureDirectories() {
  await fs.mkdir(yuanGalleryDir, { recursive: true });
}

async function getYuanGallery() {
  await ensureDirectories();
  const entries = await fs.readdir(yuanGalleryDir, { withFileTypes: true });
  const files = await Promise.all(
    entries
      .filter((entry) => entry.isFile() && [".png", ".jpg", ".jpeg", ".webp", ".gif"].includes(path.extname(entry.name).toLowerCase()))
      .map(async (entry) => {
        const absolutePath = path.join(yuanGalleryDir, entry.name);
        const stats = await fs.stat(absolutePath);
        return {
          name: entry.name,
          url: `/uploads/yuan/${encodeURIComponent(entry.name)}`,
          uploadedAt: stats.mtime.toISOString(),
          uploadedLabel: new Intl.DateTimeFormat("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            hour12: false,
            timeZone: "Asia/Shanghai"
          }).format(stats.mtime)
        };
      })
  );

  return files.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

async function getYuanNovel() {
  const [meta, chapterFiles] = await Promise.all([
    readJson(novelMetaFile, {}),
    fs.readdir(yuanChaptersDir)
  ]);

  const chapters = chapterFiles
    .filter((fileName) => fileName.toLowerCase().endsWith(".md"))
    .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }))
    .map((fileName, index) => ({
      index: index + 1,
      fileName,
      title: chapterTitleFromFile(fileName, index),
      url: `/novels/yuan/chapter/${index + 1}`
    }));

  return {
    ...meta,
    chapters,
    firstChapterUrl: chapters[0] ? chapters[0].url : "/novels/yuan"
  };
}

app.get("/", async (req, res, next) => {
  try {
    const [site, novel, gallery] = await Promise.all([
      readJson(dataFile, {}),
      getYuanNovel(),
      getYuanGallery()
    ]);

    res.render("index", {
      site,
      novel,
      gallery,
      submitted: req.query.submitted === "1",
      uploadSuccess: req.query.uploaded === "1",
      uploadError: req.query.uploadError || ""
    });
  } catch (error) {
    next(error);
  }
});

app.get("/novels/yuan", async (req, res, next) => {
  try {
    const novel = await getYuanNovel();
    if (!novel.chapters.length) {
      return res.redirect("/#novel");
    }
    res.redirect(novel.firstChapterUrl);
  } catch (error) {
    next(error);
  }
});

app.get("/novels/yuan/chapter/:chapter", async (req, res, next) => {
  try {
    const novel = await getYuanNovel();
    const chapterNumber = Number.parseInt(req.params.chapter, 10);
    const current = novel.chapters[chapterNumber - 1];

    if (!current) {
      return res.status(404).send("Chapter not found");
    }

    const markdown = await fs.readFile(path.join(yuanChaptersDir, current.fileName), "utf8");
    const bodyMarkdown = markdown.replace(/^#\s+.+(?:\r?\n)+/, "");
    const content = renderMarkdown(bodyMarkdown);

    res.render("reader", {
      novel,
      chapter: current,
      content,
      previous: novel.chapters[chapterNumber - 2],
      next: novel.chapters[chapterNumber]
    });
  } catch (error) {
    next(error);
  }
});

app.get("/api/site", async (req, res, next) => {
  try {
    const [site, novel, gallery] = await Promise.all([
      readJson(dataFile, {}),
      getYuanNovel(),
      getYuanGallery()
    ]);
    res.json({ ...site, novel, gallery });
  } catch (error) {
    next(error);
  }
});

app.post("/novels/yuan/gallery", (req, res, next) => {
  upload.single("image")(req, res, (error) => {
    if (error) {
      if (error.code === "LIMIT_FILE_SIZE") {
        return res.redirect("/?uploadError=size#gallery");
      }
      return res.redirect("/?uploadError=format#gallery");
    }

    if (!req.file) {
      return res.redirect("/?uploadError=missing#gallery");
    }

    return res.redirect("/?uploaded=1#gallery");
  });
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
  if (req.path === "/novels/yuan/gallery") {
    if (error && error.code === "LIMIT_FILE_SIZE") {
      return res.redirect("/?uploadError=size#gallery");
    }
    return res.redirect("/?uploadError=missing#gallery");
  }
  res.status(500).send("Server error");
});

ensureDirectories()
  .then(() => {
    app.listen(port, () => {
      console.log(`Site running on http://localhost:${port}`);
    });
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
