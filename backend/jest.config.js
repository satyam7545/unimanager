const { createDefaultPreset } = require("ts-jest");

const tsJestTransformCfg = createDefaultPreset().transform;

/** @type {import("jest").Config} **/
module.exports = {
  testEnvironment: "node",
  testMatch: ["<rootDir>/src/**/*.test.ts"],
  modulePathIgnorePatterns: ["<rootDir>/dist/"],
  transform: {
    ...tsJestTransformCfg,
  },
};