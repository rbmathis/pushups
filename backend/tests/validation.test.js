/**
 * Controller Validation Tests
 * Tests for input validation logic in the controller
 */
const express = require("express");
const request = require("supertest");
const pushupRoutes = require("../src/routes/pushups");
const {
  createTestDatabase,
  closeTestDatabase,
  clearTestData,
} = require("./setup");

describe("Controller Validation", () => {
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

  describe("Count Validation", () => {
    describe("Type Coercion", () => {
      test("should accept integer strings", async () => {
        const response = await request(app)
          .post("/api/pushups")
          .send({ count: "100" })
          .expect(201);
        expect(parseInt(response.body.count, 10)).toBe(100);
      });

      test("should reject floating point strings", async () => {
        await request(app)
          .post("/api/pushups")
          .send({ count: "100.5" })
          .expect(400);
      });

      test("should accept strings with spaces (trimmed by Number())", async () => {
        // JavaScript Number() trims whitespace automatically
        const response = await request(app)
          .post("/api/pushups")
          .send({ count: " 100 " })
          .expect(201);
        expect(parseInt(response.body.count, 10)).toBe(100);
      });

      test("should reject mixed alphanumeric", async () => {
        await request(app)
          .post("/api/pushups")
          .send({ count: "100abc" })
          .expect(400);
      });

      test("should coerce boolean true to 1", async () => {
        // JavaScript Number(true) === 1
        const response = await request(app)
          .post("/api/pushups")
          .send({ count: true })
          .expect(201);
        // The count might be returned as boolean or number depending on JSON serialization
        expect(Number(response.body.count)).toBe(1);
      });

      test("should reject boolean false (coerces to 0)", async () => {
        // Number(false) === 0, which fails the > 0 validation
        await request(app)
          .post("/api/pushups")
          .send({ count: false })
          .expect(400);
      });

      test("should reject undefined", async () => {
        await request(app)
          .post("/api/pushups")
          .send({ count: undefined })
          .expect(400);
      });
    });

    describe("Boundary Values", () => {
      test("should accept count = 1 (minimum)", async () => {
        const response = await request(app)
          .post("/api/pushups")
          .send({ count: 1 })
          .expect(201);
        expect(response.body.count).toBe(1);
      });

      test("should accept count = 1000 (maximum)", async () => {
        const response = await request(app)
          .post("/api/pushups")
          .send({ count: 1000 })
          .expect(201);
        expect(response.body.count).toBe(1000);
      });

      test("should reject count = 0", async () => {
        const response = await request(app)
          .post("/api/pushups")
          .send({ count: 0 })
          .expect(400);
        expect(response.body.details).toBe("Count must be greater than 0");
      });

      test("should reject count = 1001", async () => {
        const response = await request(app)
          .post("/api/pushups")
          .send({ count: 1001 })
          .expect(400);
        expect(response.body.details).toBe("Count must be 1000 or less");
      });

      test("should reject count = -1", async () => {
        const response = await request(app)
          .post("/api/pushups")
          .send({ count: -1 })
          .expect(400);
        expect(response.body.details).toBe("Count must be greater than 0");
      });
    });

    describe("Special Values", () => {
      test("should reject Infinity", async () => {
        await request(app)
          .post("/api/pushups")
          .send({ count: Infinity })
          .expect(400);
      });

      test("should reject NaN", async () => {
        await request(app)
          .post("/api/pushups")
          .send({ count: NaN })
          .expect(400);
      });

      test("should reject very large numbers", async () => {
        await request(app)
          .post("/api/pushups")
          .send({ count: 999999999 })
          .expect(400);
      });
    });
  });

  describe("Days Validation", () => {
    describe("Valid Values", () => {
      test("should accept days = 1", async () => {
        await request(app).get("/api/history?days=1").expect(200);
      });

      test("should accept days = 365", async () => {
        await request(app).get("/api/history?days=365").expect(200);
      });

      test("should accept days = 30", async () => {
        await request(app).get("/api/history?days=30").expect(200);
      });

      test("should default to 90 when days is empty", async () => {
        await request(app).get("/api/history?days=").expect(200);
      });

      test("should default to 90 when days is missing", async () => {
        await request(app).get("/api/history").expect(200);
      });
    });

    describe("Invalid Values", () => {
      test("should reject days = 0", async () => {
        const response = await request(app)
          .get("/api/history?days=0")
          .expect(400);
        expect(response.body.details).toBe("Days must be greater than 0");
      });

      test("should reject days = -1", async () => {
        const response = await request(app)
          .get("/api/history?days=-1")
          .expect(400);
        expect(response.body.details).toBe("Days must be greater than 0");
      });

      test("should reject days = 366", async () => {
        const response = await request(app)
          .get("/api/history?days=366")
          .expect(400);
        expect(response.body.details).toBe("Days must be 365 or less");
      });

      test("should reject days = 7.5", async () => {
        const response = await request(app)
          .get("/api/history?days=7.5")
          .expect(400);
        expect(response.body.details).toBe("Days must be an integer");
      });

      test('should reject days = "abc"', async () => {
        const response = await request(app)
          .get("/api/history?days=abc")
          .expect(400);
        expect(response.body.details).toBe("Days must be a valid number");
      });
    });
  });

  describe("Error Response Format", () => {
    test("should include error message", async () => {
      const response = await request(app)
        .post("/api/pushups")
        .send({ count: 0 })
        .expect(400);

      expect(response.body).toHaveProperty("error");
      expect(typeof response.body.error).toBe("string");
    });

    test("should include status code", async () => {
      const response = await request(app)
        .post("/api/pushups")
        .send({ count: 0 })
        .expect(400);

      expect(response.body).toHaveProperty("status");
      expect(response.body.status).toBe(400);
    });

    test("should include details when available", async () => {
      const response = await request(app)
        .post("/api/pushups")
        .send({ count: 0 })
        .expect(400);

      expect(response.body).toHaveProperty("details");
      expect(typeof response.body.details).toBe("string");
    });
  });
});
