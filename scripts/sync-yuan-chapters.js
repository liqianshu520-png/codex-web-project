const fs = require("fs");
const path = require("path");
const cp = require("child_process");

const sourceDir = "C:\\Users\\liqianshu\\Desktop\\\u6e0a\u4e16\u754c\\novel\\chinese-novelist\\20260513-\u6e0a";

const repoRoot = path.resolve(__dirname, "..");
const remoteUrl = exec("git remote get-url origin", repoRoot).trim();
const gitUserName = exec("git config user.name", repoRoot).trim();
const gitUserEmail = exec("git config user.email", repoRoot).trim();
const syncRoot = path.join(process.env.LOCALAPPDATA, "codex-yuan-site-sync");
const chapterPrefix = "\u7b2c";
const chapterSuffix = "\u7ae0-";
const chapterFilter = new RegExp(`^${chapterPrefix}\\d+${chapterSuffix}.+\\.md$`, "u");
const chapterFilePattern = new RegExp(`^${chapterPrefix}(\\d+)${chapterSuffix}(.+)\\.md$`, "u");
const chapterStatLabel = "\u5df2\u6536\u5f55\u7ae0\u8282";

const targetChapterDir = path.join(syncRoot, "data", "novels", "yuan", "chapters");
const metaPath = path.join(syncRoot, "data", "novels", "yuan", "meta.json");
const sitePath = path.join(syncRoot, "data", "site.json");

if (!fs.existsSync(sourceDir)) {
  throw new Error(`Source chapter directory not found: ${sourceDir}`);
}

if (!fs.existsSync(syncRoot)) {
  exec(`git clone --branch main --single-branch "${remoteUrl}" "${syncRoot}"`, repoRoot);
} else {
  exec("git fetch origin main", syncRoot);
  exec("git reset --hard origin/main", syncRoot);
  exec("git clean -fd", syncRoot);
}

exec(`git config user.name "${gitUserName.replace(/"/g, '\\"')}"`, syncRoot);
exec(`git config user.email "${gitUserEmail.replace(/"/g, '\\"')}"`, syncRoot);

const sourceChapters = fs
  .readdirSync(sourceDir, { withFileTypes: true })
  .filter((entry) => entry.isFile() && chapterFilter.test(entry.name))
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b, "zh-CN", { numeric: true }));

if (sourceChapters.length === 0) {
  throw new Error(`No source chapters found in ${sourceDir}`);
}

fs.mkdirSync(targetChapterDir, { recursive: true });

for (const fileName of sourceChapters) {
  fs.copyFileSync(path.join(sourceDir, fileName), path.join(targetChapterDir, fileName));
}

const latestFile = sourceChapters[sourceChapters.length - 1];
const latestMatch = latestFile.match(chapterFilePattern);
if (!latestMatch) {
  throw new Error(`Unexpected chapter filename: ${latestFile}`);
}

const latestLabel = `${chapterPrefix}${latestMatch[1]}\u7ae0 ${latestMatch[2]}`;

const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
meta.latest = latestLabel;
writeJson(metaPath, meta);

const site = JSON.parse(fs.readFileSync(sitePath, "utf8"));
const chapterStat = site.stats.find((item) => item.label === chapterStatLabel);
if (!chapterStat) {
  throw new Error(`Could not find ${chapterStatLabel} in site.json`);
}
chapterStat.value = String(sourceChapters.length);
writeJson(sitePath, site);

exec("git add data/novels/yuan/chapters data/novels/yuan/meta.json data/site.json", syncRoot);

try {
  exec("git diff --cached --quiet", syncRoot);
  console.log("No chapter changes to sync.");
  process.exit(0);
} catch (error) {
  if (typeof error.status !== "number" || error.status === 0) {
    throw error;
  }
}

const commitMessage = `Sync yuan chapters through ${latestLabel}`;
exec(`git commit -m "${commitMessage.replace(/"/g, '\\"')}"`, syncRoot);
exec("git push origin main", syncRoot);

console.log(`Synced ${sourceChapters.length} chapters. Latest: ${latestLabel}`);

function exec(command, cwd) {
  return cp.execSync(command, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
