/**
 * Edge Case and Stress Tests
 * Tests for boundary conditions and edge cases
 */
const request = require("supertest");
const express = require("express");
const pushupRoutes = require("../src/routes/pushups");
const {
  createTestDatabase,
  closeTestDatabase,
  insertTestData,
  clearTestData,
  daysAgo,
  today,
} = require("./setup");

describe("Edge Cases", () => {
  let app;
  let db;

  beforeAll(async () => {
    db = await createTestDatabase();
    app = express();
    app.use(express.json());
    app.locals.db = db;
    app.use("/api", pushupRoutes);
    app.use((err, req, res, next) => {
      res.status(err.status || 500).json({
        error: err.message || "Internal server error",
        status: err.status || 500,
      });
    });
  });

  afterAll(async () => {
    await closeTestDatabase(db);
  });

  beforeEach(async () => {
    await clearTestData(db);
  });

  describe("High Volume Data", () => {
    test("should handle 100 pushup entries", async () => {
      // Insert 100 entries
      const entries = Array.from({ length: 100 }, (_, i) => ({
        count: 10,
        timestamp: today(),
      }));
      await insertTestData(db, entries);

      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body.allTimeStats.totalPushups).toBe(1000);
    });

    test("should handle entries spread across many days", async () => {
      // Insert entries for 30 different days
      const entries = Array.from({ length: 30 }, (_, i) => ({
        count: 50,
        timestamp: daysAgo(i),
      }));
      await insertTestData(db, entries);

      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body.allTimeStats.totalDays).toBe(30);
      expect(response.body.allTimeStats.totalPushups).toBe(1500);
    });

    test("should handle rapid sequential requests", async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        request(app)
          .post("/api/pushups")
          .send({ count: i + 1 }),
      );

      const responses = await Promise.all(promises);

      responses.forEach((response, i) => {
        expect(response.status).toBe(201);
        expect(response.body.count).toBe(i + 1);
      });

      // Verify total
      const stats = await request(app).get("/api/statistics");
      expect(stats.body.allTimeStats.totalPushups).toBe(55); // 1+2+3+...+10
    });
  });

  describe("Date Boundary Conditions", () => {
    test("should handle entries at midnight boundary", async () => {
      const midnight = new Date();
      midnight.setHours(0, 0, 0, 0);

      await insertTestData(db, [
        {
          count: 25,
          timestamp: midnight.toISOString().replace("Z", "").split(".")[0],
        },
      ]);

      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body.allTimeStats.totalPushups).toBe(25);
    });

    test("should handle entries near end of day", async () => {
      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);

      await insertTestData(db, [
        {
          count: 30,
          timestamp: endOfDay.toISOString().replace("Z", "").split(".")[0],
        },
      ]);

      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body.allTimeStats.totalPushups).toBe(30);
    });
  });

  describe("Empty and Zero States", () => {
    test("should handle empty database gracefully", async () => {
      const stats = await request(app).get("/api/statistics").expect(200);
      const history = await request(app).get("/api/history").expect(200);

      expect(stats.body.dailyTotal.total).toBe(0);
      expect(stats.body.allTimeStats.totalPushups).toBe(0);
      expect(stats.body.currentStreak.currentStreak).toBe(0);
      expect(history.body).toEqual([]);
    });

    test("should return valid structure even with no data", async () => {
      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body).toHaveProperty("dailyTotal");
      expect(response.body).toHaveProperty("sevenDayAverage");
      expect(response.body).toHaveProperty("thirtyDayAverage");
      expect(response.body).toHaveProperty("currentStreak");
      expect(response.body).toHaveProperty("allTimeStats");
      expect(response.body).toHaveProperty("lastPushupDate");
    });
  });

  describe("Streak Calculations", () => {
    test("should calculate streak of 1 for today only", async () => {
      await insertTestData(db, [{ count: 25, timestamp: today() }]);

      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body.currentStreak.currentStreak).toBe(1);
    });

    test("should calculate streak across consecutive days", async () => {
      await insertTestData(db, [
        { count: 25, timestamp: today() },
        { count: 25, timestamp: daysAgo(1) },
        { count: 25, timestamp: daysAgo(2) },
        { count: 25, timestamp: daysAgo(3) },
        { count: 25, timestamp: daysAgo(4) },
      ]);

      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body.currentStreak.currentStreak).toBe(5);
    });

    test("should break streak on gap", async () => {
      await insertTestData(db, [
        { count: 25, timestamp: today() },
        { count: 25, timestamp: daysAgo(1) },
        // Gap at day 2
        { count: 25, timestamp: daysAgo(3) },
        { count: 25, timestamp: daysAgo(4) },
      ]);

      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body.currentStreak.currentStreak).toBe(2);
    });

    test("should handle multiple entries per day in streak", async () => {
      await insertTestData(db, [
        { count: 10, timestamp: today() },
        { count: 20, timestamp: today() },
        { count: 30, timestamp: today() },
        { count: 25, timestamp: daysAgo(1) },
      ]);

      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body.currentStreak.currentStreak).toBe(2);
    });
  });

  describe("Average Calculations", () => {
    test("should calculate 7-day average correctly", async () => {
      // 70 pushups over 7 days = 10 average
      await insertTestData(db, [
        { count: 10, timestamp: today() },
        { count: 10, timestamp: daysAgo(1) },
        { count: 10, timestamp: daysAgo(2) },
        { count: 10, timestamp: daysAgo(3) },
        { count: 10, timestamp: daysAgo(4) },
        { count: 10, timestamp: daysAgo(5) },
        { count: 10, timestamp: daysAgo(6) },
      ]);

      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body.sevenDayAverage.average).toBe(10);
      expect(response.body.sevenDayAverage.daysWithPushups).toBe(7);
      expect(response.body.sevenDayAverage.totalPushups).toBe(70);
    });

    test("should handle partial week correctly", async () => {
      // Only 3 days of data
      await insertTestData(db, [
        { count: 30, timestamp: today() },
        { count: 30, timestamp: daysAgo(1) },
        { count: 30, timestamp: daysAgo(2) },
      ]);

      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body.sevenDayAverage.average).toBe(12.86);
      expect(response.body.sevenDayAverage.daysWithPushups).toBe(3);
    });

    test("should exclude data older than 7 days from 7-day average", async () => {
      await insertTestData(db, [
        { count: 50, timestamp: today() },
        { count: 100, timestamp: daysAgo(10) }, // Outside window
      ]);

      const response = await request(app).get("/api/statistics").expect(200);

      expect(response.body.sevenDayAverage.totalPushups).toBe(50);
    });
  });

  describe("History Endpoint", () => {
    test("should return dates in ascending order", async () => {
      await insertTestData(db, [
        { count: 30, timestamp: daysAgo(2) },
        { count: 20, timestamp: today() },
        { count: 25, timestamp: daysAgo(1) },
      ]);

      const response = await request(app)
        .get("/api/history?days=7")
        .expect(200);

      if (response.body.length >= 2) {
        for (let i = 1; i < response.body.length; i++) {
          const prevDate = new Date(response.body[i - 1].date);
          const currDate = new Date(response.body[i].date);
          expect(currDate.getTime()).toBeGreaterThanOrEqual(prevDate.getTime());
        }
      }
    });

    test("should aggregate multiple entries per day", async () => {
      await insertTestData(db, [
        { count: 10, timestamp: today() },
        { count: 20, timestamp: today() },
        { count: 30, timestamp: today() },
      ]);

      const response = await request(app)
        .get("/api/history?days=1")
        .expect(200);

      if (response.body.length > 0) {
        expect(response.body[0].total).toBe(60);
      }
    });

    test("should handle days = 1 correctly", async () => {
      await insertTestData(db, [
        { count: 100, timestamp: today() },
        { count: 200, timestamp: daysAgo(2) },
      ]);

      const response = await request(app)
        .get("/api/history?days=1")
        .expect(200);

      // Should only include today's data
      const totalInResponse = response.body.reduce(
        (sum, entry) => sum + entry.total,
        0,
      );
      expect(totalInResponse).toBe(100);
    });

    test("should handle days = 365 correctly", async () => {
      await insertTestData(db, [
        { count: 50, timestamp: today() },
        { count: 50, timestamp: daysAgo(200) },
        { count: 50, timestamp: daysAgo(300) },
      ]);

      const response = await request(app)
        .get("/api/history?days=365")
        .expect(200);

      const totalInResponse = response.body.reduce(
        (sum, entry) => sum + entry.total,
        0,
      );
      expect(totalInResponse).toBe(150);
    });
  });

  describe("Concurrent Operations", () => {
    test("should handle concurrent POST requests", async () => {
      const requests = Array.from({ length: 5 }, () =>
        request(app).post("/api/pushups").send({ count: 20 }),
      );

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(201);
        expect(response.body.count).toBe(20);
      });

      const stats = await request(app).get("/api/statistics");
      expect(stats.body.allTimeStats.totalPushups).toBe(100);
    });

    test("should handle concurrent GET and POST", async () => {
      await insertTestData(db, [{ count: 100, timestamp: today() }]);

      const requests = [
        request(app).get("/api/statistics"),
        request(app).post("/api/pushups").send({ count: 50 }),
        request(app).get("/api/history"),
      ];

      const responses = await Promise.all(requests);

      expect(responses[0].status).toBe(200);
      expect(responses[1].status).toBe(201);
      expect(responses[2].status).toBe(200);
    });
  });
});
