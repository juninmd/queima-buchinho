module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    collectCoverage: true,
    coverageDirectory: 'coverage',
    testMatch: ['**/tests/**/*.test.ts'],
    moduleNameMapper: {
        // @ai-sdk/openai-compatible >= 3 é ESM-only e nenhum teste precisa do real:
        // sempre substituído. `ai` já tem mock manual em __mocks__/ai.ts (convenção
        // nativa do Jest p/ pacotes de node_modules, usada quando algum teste chama jest.mock('ai')).
        '^@ai-sdk/openai-compatible$': '<rootDir>/tests/__mocks__/ai-sdk-openai-compatible.ts'
    },
    coverageThreshold: {
        global: { lines: 70, functions: 70 }
    },
    transform: {
        '^.+\\.tsx?$': ['ts-jest', { diagnostics: false }]
    }
};
