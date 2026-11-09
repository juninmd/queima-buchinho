// Planejador de release: commits semânticos desde a última tag `lembretes-v*` → próxima versão.
import { execSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';

export const PREFIX = 'lembretes-v';
const BREAKING = /^\w+(\([^)]*\))?!:/;

/** feat → minor, fix/perf → patch, `!` ou "BREAKING CHANGE" → major; chore/docs/ci não geram release. */
export function bumpFor(commits) {
  let level = 0;
  for (const { subject, body = '' } of commits) {
    if (BREAKING.test(subject) || /BREAKING[ -]CHANGE/.test(body)) return 3;
    if (/^feat(\(|:|!)/.test(subject)) level = Math.max(level, 2);
    else if (/^(fix|perf)(\(|:|!)/.test(subject)) level = Math.max(level, 1);
  }
  return level;
}

export function nextVersion(last, level, initial = '0.1.0') {
  if (!last) return level ? initial : null;
  if (!level) return null;
  const [a, b, c] = last.split('.').map(Number);
  return level === 3 ? `${a + 1}.0.0` : level === 2 ? `${a}.${b + 1}.0` : `${a}.${b}.${c + 1}`;
}

function gitCommits(range) {
  const out = execSync(`git log ${range} --format=%s%x1f%b%x1e -- lembretes`, { encoding: 'utf8' });
  return out.split('\x1e').map((e) => e.trim()).filter(Boolean).map((e) => { const [subject, body] = e.split('\x1f'); return { subject, body }; });
}

if (process.argv[1]?.endsWith('plan.mjs')) {
  const tags = execSync(`git tag --list "${PREFIX}[0-9]*" --sort=-v:refname`, { encoding: 'utf8' }).split('\n').filter(Boolean);
  const last = tags[0]?.slice(PREFIX.length);
  const commits = gitCommits(tags[0] ? `${tags[0]}..HEAD` : 'HEAD');
  const version = nextVersion(last, bumpFor(commits));
  const notes = commits.map((c) => `- ${c.subject}`).join('\n');
  const lines = [`release=${Boolean(version)}`, `version=${version ?? ''}`, `tag=${version ? PREFIX + version : ''}`];
  console.log(lines.join('\n'), '\n---\n' + notes);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, lines.join('\n') + `\nnotes<<EOF\n${notes}\nEOF\n`);
}
