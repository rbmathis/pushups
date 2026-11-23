const fs = require("fs");
const path = require("path");

const snapshotPath = path.join(__dirname, "demo", "pushups.db");
const demoPath = path.join(__dirname, "data", "demo.db");

function prepareDemoDatabase(source, destination) {
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  try {
    fs.copyFileSync(source, destination, fs.constants.COPYFILE_EXCL);
    return true;
  } catch (error) {
    if (error.code === "EEXIST") return false;
    throw error;
  }
}

if (require.main === module) {
  try {
    const created = prepareDemoDatabase(snapshotPath, demoPath);
    console.log(`${created ? "Created" : "Using existing"} demo database at ${demoPath}`);
    process.env.DB_PATH = demoPath;
    require("./src/server");
  } catch (error) {
    console.error(`Failed to prepare demo database: ${error.message}`);
    process.exitCode = 1;
  }
}

module.exports = { prepareDemoDatabase };
