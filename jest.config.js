module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    testMatch: ['**/tests/**/*.test.ts'],
    coverageThreshold: {
        global: { lines: 70, functions: 70 }
    },
};
