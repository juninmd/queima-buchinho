// `ai` >= 6 é ESM-only; o Jest (CJS via ts-jest) não consegue carregá-lo, nem para automock.
// Mock manual de pacote em node_modules: Jest usa isso automaticamente (sem precisar
// registrar em moduleNameMapper) sempre que algum teste chamar jest.mock('ai').
export const generateObject = jest.fn();
export const generateText = jest.fn();
