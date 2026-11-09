import { describe, expect, it } from 'vitest';
import { bumpFor, nextVersion } from './plan.mjs';

const c = (subject, body = '') => ({ subject, body });
describe('plan', () => {
  it('feat → minor', () => expect(nextVersion('1.2.3', bumpFor([c('feat(ui): x'), c('fix: y')]))).toBe('1.3.0'));
  it('fix → patch', () => expect(nextVersion('1.2.3', bumpFor([c('fix: y'), c('chore: z')]))).toBe('1.2.4'));
  it('breaking (!) → major', () => expect(nextVersion('1.2.3', bumpFor([c('feat!: x')]))).toBe('2.0.0'));
  it('BREAKING CHANGE no corpo → major', () => expect(nextVersion('1.2.3', bumpFor([c('fix: y', 'BREAKING CHANGE: api')]))).toBe('2.0.0'));
  it('só chore/docs/ci → sem release', () => expect(nextVersion('1.2.3', bumpFor([c('chore: a'), c('docs: b'), c('ci: c')]))).toBeNull());
  it('sem tag anterior → versão inicial', () => expect(nextVersion(undefined, bumpFor([c('feat: a')]))).toBe('0.1.0'));
});
