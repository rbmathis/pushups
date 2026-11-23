const express = require("express");
const request = require("supertest");
const model = require("../src/db/model");
const pushupRoutes = require("../src/routes/pushups");
const {
  createTestDatabase,
  closeTestDatabase,
  insertTestData,
  clearTestData,
  today,
} = require("./setup");

function run(db, sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (error) {
      if (error) reject(error);
      else resolve(this);
    });
  });
}

describe("Analytics and administration", () => {
  let app;
  let db;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = express();
    app.use(express.json());
    app.locals.db = db;
    app.use("/api", pushupRoutes);
  });

  beforeEach(() => clearTestData(db));
  afterAll(() => closeTestDatabase(db));

  test("returns time-of-day buckets", async () => {
    await insertTestData(db, [
      { count: 1, timestamp: "2026-11-23T05:00:00" },
      { count: 2, timestamp: "2026-11-23T06:00:00" },
      { count: 3, timestamp: "2026-11-23T12:00:00" },
      { count: 4, timestamp: "2026-11-23T17:00:00" },
      { count: 5, timestamp: "2026-11-23T21:00:00" },
    ]);

    const response = await request(app).get("/api/timeofday").expect(200);

    expect(response.body).toEqual({
      morning: 2,
      afternoon: 3,
      evening: 4,
      night: 6,
    });
  });

  test("returns daily cards with custom start date", async () => {
    await insertTestData(db, [
      { count: 10, timestamp: "2026-11-20T08:00:00" },
      { count: 20, timestamp: "2026-11-21T13:00:00" },
      { count: 30, timestamp: "2026-11-23T18:00:00" },
    ]);

    const response = await request(app)
      .get("/api/dailycards?since=2026-11-20")
      .expect(200);

    expect(response.body.since).toBe("2026-11-20");
    expect(response.body.totals.allTime).toBe(60);
    expect(response.body.today.total).toBe(30);
    expect(response.body.averages).toHaveProperty("perDay");
  });

  test("supports admin create, list, update, and delete", async () => {
    const created = await request(app)
      .post("/api/admin/entries")
      .send({ count: 25, timestamp: "2026-11-22T10:00:00" })
      .expect(201);

    expect(created.body.message).toBe("Entry created successfully");
    const id = created.body.id;

    const listed = await request(app).get("/api/admin/entries").expect(200);
    expect(listed.body.entries).toHaveLength(1);

    const updated = await request(app)
      .put(`/api/admin/entries/${id}`)
      .send({ count: 30, timestamp: "2026-11-22T11:00:00" })
      .expect(200);
    expect(updated.body.count).toBe(30);

    await request(app)
      .put(`/api/admin/entries/${id}`)
      .send({})
      .expect(200);

    await request(app)
      .delete(`/api/admin/entries/${id}`)
      .expect(200);
    await request(app).delete(`/api/admin/entries/${id}`).expect(404);
  });

  test("rejects invalid admin input and missing entries", async () => {
    await request(app)
      .post("/api/admin/entries")
      .send({ count: 10 })
      .expect(400);
    await request(app)
      .put("/api/admin/entries/nope")
      .send({ count: 10 })
      .expect(400);
    await request(app)
      .delete("/api/admin/entries/nope")
      .expect(400);
    await request(app)
      .put("/api/admin/entries/999")
      .send({ count: 10 })
      .expect(404);
  });

  test("calculates session and set averages", async () => {
    await run(
      db,
      "INSERT INTO pushups (count, timestamp, created_at, session_id) VALUES (?, ?, ?, ?)",
      [10, today(), new Date().toISOString(), "session-a"],
    );
    await run(
      db,
      "INSERT INTO pushups (count, timestamp, created_at, session_id) VALUES (?, ?, ?, ?)",
      [30, today(), new Date().toISOString(), "session-a"],
    );
    await run(
      db,
      "INSERT INTO pushups (count, timestamp, created_at, session_id) VALUES (?, ?, ?, ?)",
      [20, today(), new Date().toISOString(), "session-b"],
    );

    await expect(model.getAvgPerSession(db)).resolves.toEqual({
      totalSessions: 2,
      avgPerSession: 30,
    });
    await expect(model.getAvgPerSet(db)).resolves.toEqual({
      totalSets: 3,
      avgPerSet: 20,
    });
  });

  test("uses and counts streak forgiveness tokens", async () => {
    await run(
      db,
      "INSERT INTO streak_forgiveness (earned_date, created_at) VALUES (?, ?)",
      ["2026-11-23", new Date().toISOString()],
    );
    await run(
      db,
      "INSERT INTO streak_forgiveness (earned_date, used_date, created_at) VALUES (?, ?, ?)",
      ["2026-11-22", "2026-11-22", new Date().toISOString()],
    );

    await expect(model.getLifelinesEarned(db)).resolves.toBe(1);
    await expect(
      model.useStreakForgivenessIfAvailable(db, "2026-11-23"),
    ).resolves.toBe(true);
    await expect(
      model.useStreakForgivenessIfAvailable(db, "2026-11-23"),
    ).resolves.toBe(false);
    await expect(model.getLifelinesEarned(db)).resolves.toBe(0);
  });

  test("updates and deletes model entries", async () => {
    const entry = await model.logPushup(db, 10, today());

    await expect(
      model.updateEntry(db, entry.id, { count: 15 }),
    ).resolves.toMatchObject({ id: entry.id, count: 15 });
    await expect(model.updateEntry(db, 999, { count: 15 })).resolves.toBeNull();
    await expect(model.deleteEntry(db, entry.id)).resolves.toBe(true);
    await expect(model.deleteEntry(db, entry.id)).resolves.toBe(false);
  });
});
