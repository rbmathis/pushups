const fs = require("fs");
const os = require("os");
const path = require("path");
const sqlite3 = require("sqlite3").verbose();
const { prepareDemoDatabase } = require("../start-demo");

describe("Demo database", () => {
  let directory;

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), "pushup-demo-test-"));
  });

  afterEach(() => {
    fs.rmSync(directory, { recursive: true, force: true });
  });

  test("copies a usable snapshot to a new local database", async () => {
    const source = path.join(__dirname, "..", "demo", "pushups.db");
    const destination = path.join(directory, "data", "demo.db");

    expect(prepareDemoDatabase(source, destination)).toBe(true);
    expect(fs.readFileSync(destination)).toEqual(fs.readFileSync(source));

    const db = new sqlite3.Database(destination, sqlite3.OPEN_READONLY);
    try {
      const row = await new Promise((resolve, reject) => {
        db.get("SELECT COUNT(*) AS entries FROM pushups", (error, result) =>
          error ? reject(error) : resolve(result),
        );
      });
      expect(row.entries).toBeGreaterThan(0);
    } finally {
      await new Promise((resolve, reject) =>
        db.close((error) => (error ? reject(error) : resolve())),
      );
    }
  });

  test("never overwrites an existing local database", () => {
    const source = path.join(directory, "snapshot.db");
    const destination = path.join(directory, "demo.db");
    fs.writeFileSync(source, "snapshot");
    fs.writeFileSync(destination, "existing data");

    expect(prepareDemoDatabase(source, destination)).toBe(false);
    expect(fs.readFileSync(destination, "utf8")).toBe("existing data");
  });

  test("reports a missing snapshot", () => {
    expect(() =>
      prepareDemoDatabase(
        path.join(directory, "missing.db"),
        path.join(directory, "demo.db"),
      ),
    ).toThrow();
  });
});
