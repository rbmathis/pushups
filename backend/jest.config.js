/**
 * Jest configuration for backend tests
 */
module.exports = {
  testEnvironment: "node",
  testMatch: ["**/tests/**/*.test.js"],
  collectCoverageFrom: [
    "src/**/*.js",
    "!src/server.js", // Exclude server startup
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  verbose: true,
  testTimeout: 30000,
  setupFilesAfterEnv: ["./tests/setup.js"],
  maxWorkers: 1, // Run tests serially to avoid database conflicts
};
