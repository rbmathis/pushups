const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const sqlite3 = require("sqlite3").verbose();
const { verifyBackup } = require("../verify-deployment-backup");

const describeWindows = process.platform === "win32" ? describe : describe.skip;

describeWindows("Synology deployment script", () => {
  let directory;
  let nas;
  const script = path.join(__dirname, "..", "..", "deploy-to-synology.ps1");

  function runDeployment(input = "", deployScript = script) {
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-File", deployScript],
      {
        env: {
          ...process.env,
          PUSHUP_NAS_ROOT: nas,
          NODE_PATH: path.join(__dirname, "..", "node_modules"),
          PSModulePath: `${path.join(process.env.SystemRoot, "System32", "WindowsPowerShell", "v1.0", "Modules")};${process.env.PSModulePath || ""}`,
        },
        input,
        encoding: "utf8",
        timeout: 120000,
      },
    );
    if (result.error) throw result.error;
    return result;
  }

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "pushup-deploy-test-"));
    nas = path.join(directory, "nas");
    fs.mkdirSync(path.join(nas, "data"), { recursive: true });
    fs.writeFileSync(path.join(nas, "docker-compose.yml"), "old compose");
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test("backs up an offline WAL database, stages clean release inputs, and skips a confirmed release", async () => {
    const original = path.join(directory, "original.db");
    const db = new sqlite3.Database(original);
    try {
      await new Promise((resolve, reject) =>
        db.exec(
          "PRAGMA journal_mode=WAL; CREATE TABLE pushups (count INTEGER); INSERT INTO pushups VALUES (42);",
          (error) => (error ? reject(error) : resolve()),
        ),
      );
      for (const suffix of ["", "-wal", "-shm"]) {
        fs.copyFileSync(original + suffix, path.join(nas, "data", `pushups.db${suffix}`));
      }
    } finally {
      await new Promise((resolve, reject) =>
        db.close((error) => (error ? reject(error) : resolve())),
      );
    }

    const liveDb = path.join(nas, "data", "pushups.db");
    const before = fs.readFileSync(liveDb);
    const oldData = path.join(nas, "backend", "data");
    fs.mkdirSync(oldData, { recursive: true });
    fs.writeFileSync(path.join(oldData, "pushups.db"), "legacy database");
    const first = runDeployment("C\nC\n");
    if (first.status !== 0) throw new Error(`${first.stdout}\n${first.stderr}`);
    expect(first.status).toBe(0);
    expect(first.stdout).toContain("Backup integrity OK: 1 entries, 42 pushups.");
    expect(fs.readFileSync(liveDb)).toEqual(before);
    const compose = fs.readFileSync(path.join(nas, "docker-compose.yml"), "utf8");
    const statePath = path.join(nas, "deployment-releases", "state.json");
    const state = JSON.parse(fs.readFileSync(statePath, "utf8").replace(/^\uFEFF/, ""));
    expect(state.status).toBe("confirmed");
    expect(compose).toContain(`image: pushup-tracker-backend:sha256-${state.backendHash}`);
    expect(compose).toContain(`image: pushup-tracker-frontend:sha256-${state.frontendHash}`);
    expect(compose).toContain(`context: ./deployment-releases/${state.releaseId}/backend`);
    expect(compose).toContain(`context: ./deployment-releases/${state.releaseId}/frontend`);
    expect(compose).toContain("./data:/app/data");
    expect(compose).toContain("./backups:/app/backups");
    const release = path.join(nas, "deployment-releases", state.releaseId);
    expect(fs.readFileSync(path.join(release, "previous-compose.yml"), "utf8")).toBe("old compose");
    expect(fs.existsSync(path.join(release, "backend", "src", "server.js"))).toBe(true);
    expect(fs.existsSync(path.join(release, "backend", "data"))).toBe(false);
    expect(fs.existsSync(path.join(release, "frontend", "dist"))).toBe(false);
    expect(fs.readFileSync(path.join(oldData, "pushups.db"), "utf8")).toBe("legacy database");

    const backupRoot = path.join(nas, "backups");
    const backups = fs.readdirSync(backupRoot);
    expect(backups).toHaveLength(1);
    const backup = path.join(backupRoot, backups[0]);
    expect(fs.existsSync(path.join(backup, "pushups.db-wal"))).toBe(true);
    await expect(verifyBackup(backup)).resolves.toEqual({ entries: 1, pushups: 42 });

    const extra = path.join(release, "frontend", "src", "extra.js");
    const second = runDeployment();
    expect(second.status).toBe(0);
    expect(second.stdout).toContain("Inputs match the last operator-confirmed release");
    expect(fs.readdirSync(backupRoot)).toEqual(backups);

    fs.writeFileSync(extra, "local NAS file");
    const modifiedRelease = runDeployment("Q\n");
    expect(modifiedRelease.status).toBe(2);
    expect(modifiedRelease.stdout).toContain("staged release no longer matches");
    expect(fs.readFileSync(extra, "utf8")).toBe("local NAS file");

    fs.writeFileSync(path.join(nas, "docker-compose.yml"), "changed");
    const third = runDeployment("invalid\nc\nq\n");
    expect(third.status).toBe(2);
    expect(third.stdout).toContain("Tracked build inputs to stage");
    expect(third.stdout).toContain("Please enter C or Q.");
    expect(third.stdout).toContain("manual deployment and checks were not confirmed");
    expect(fs.readdirSync(backupRoot)).toHaveLength(2);
    const pending = JSON.parse(fs.readFileSync(statePath, "utf8").replace(/^\uFEFF/, ""));
    expect(pending.status).toBe("pending");
    const retry = runDeployment("Q\n");
    expect(retry.status).toBe(2);
    expect(retry.stdout).toContain("previous deployment was not confirmed");
  }, 120000);

  test("does not copy files if the project stop is not confirmed", () => {
    fs.copyFileSync(
      path.join(__dirname, "..", "demo", "pushups.db"),
      path.join(nas, "data", "pushups.db"),
    );
    const result = runDeployment("Q\n");
    expect(result.status).toBe(2);
    expect(result.stdout).toContain("Deployment cancelled");
    expect(fs.existsSync(path.join(nas, "backups"))).toBe(false);
    expect(fs.readFileSync(path.join(nas, "docker-compose.yml"), "utf8")).toBe("old compose");
  });

  test("does not deploy when the backup is not a valid database", () => {
    fs.writeFileSync(path.join(nas, "data", "pushups.db"), "not a database");
    const result = runDeployment("C\n");
    expect(result.status).not.toBe(0);
    expect(result.stderr).toContain("Backup verification failed");
    expect(fs.readFileSync(path.join(nas, "docker-compose.yml"), "utf8")).toBe("old compose");
  });

  test("changes only the frontend image tag when frontend inputs change", () => {
    fs.copyFileSync(
      path.join(__dirname, "..", "demo", "pushups.db"),
      path.join(nas, "data", "pushups.db"),
    );
    const root = path.join(__dirname, "..", "..");
    const fixture = path.join(directory, "source");
    fs.mkdirSync(fixture);
    const tracked = spawnSync("git", ["ls-files", "-z", "--", "backend/src", "frontend/src", "frontend/public",
      "backend/Dockerfile", "backend/package.json", "backend/package-lock.json", "backend/.dockerignore",
      "frontend/Dockerfile", "frontend/index.html", "frontend/nginx.conf", "frontend/package.json",
      "frontend/package-lock.json", "frontend/.dockerignore", "frontend/postcss.config.js",
      "frontend/tailwind.config.js", "frontend/vite.config.js", "docker-compose.yml"], { cwd: root, encoding: "utf8" });
    expect(tracked.status).toBe(0);
    for (const file of tracked.stdout.split("\0").filter(Boolean).concat([
      "deploy-to-synology.ps1", "backend/verify-deployment-backup.js",
    ])) {
      const target = path.join(fixture, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(root, file), target);
    }
    for (const args of [["init", "-q"], ["add", "."]]) {
      const result = spawnSync("git", args, { cwd: fixture, encoding: "utf8" });
      if (result.status !== 0) throw new Error(result.stderr);
    }
    const fixtureScript = path.join(fixture, "deploy-to-synology.ps1");
    const first = runDeployment("C\nC\n", fixtureScript);
    if (first.status !== 0) throw new Error(`${first.stdout}\n${first.stderr}`);
    const statePath = path.join(nas, "deployment-releases", "state.json");
    const readState = () => JSON.parse(fs.readFileSync(statePath, "utf8").replace(/^\uFEFF/, ""));
    const before = readState();
    fs.appendFileSync(path.join(fixture, "frontend", "src", "main.js"), "\n// changed\n");
    const second = runDeployment("C\nC\n", fixtureScript);
    if (second.status !== 0) throw new Error(`${second.stdout}\n${second.stderr}`);
    const after = readState();
    expect(after.backendHash).toBe(before.backendHash);
    expect(after.frontendHash).not.toBe(before.frontendHash);
    expect(after.releaseId).not.toBe(before.releaseId);
  }, 120000);
});
