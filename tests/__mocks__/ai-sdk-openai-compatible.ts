// `@ai-sdk/openai-compatible` >= 3 é ESM-only e o Jest (CJS via ts-jest) não consegue
// carregá-lo nem para gerar automock. Mapeado via moduleNameMapper em jest.config.js.
export const createOpenAICompatible = () => () => ({ modelId: 'mock-model' });
