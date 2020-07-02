const fs = require('fs');
// eslint-disable-next-line prettier/prettier
const readAllLines = (file) => fs.readFileSync(file, 'utf-8').toString('utf8').split(/\r?\n/);
const writeAllLines = (file, lines) => fs.writeFileSync(file, lines.join('\n'), 'utf8');

function processDts(file, original, final) {
  const lines = readAllLines(file);
  const originalLines = readAllLines(original).slice(0, -1);
  const updated = [
    ...originalLines.slice(0, -1),
    '',
    '// ========== POC Types===========',
    '',
    ...lines.slice(1, -1).map((line) => line.replace('declare ', '')),
    '}'
  ];
  writeAllLines(final, updated);
}

function processMjs(file) {
  let lines = readAllLines(file);
  const prepend = [
    "import ES2019 from 'es-abstract/es2019.js';",
    "import { GetIntrinsic, MakeIntrinsicClass } from './intrinsicclass.mjs'",
    '',
    'const Temporal = {',
    "  get DateTime() { return GetIntrinsic('%Temporal.DateTime%'); },",
    "  get Absolute() { return GetIntrinsic('%Temporal.Absolute%'); },",
    "  get TimeZone() { return GetIntrinsic('%Temporal.TimeZone%'); },",
    "  get Calendar() { return GetIntrinsic('%Temporal.Calendar%'); },",
    "  get Duration() { return GetIntrinsic('%Temporal.Duration%'); },",
    '};'
  ];
  const append = ['', "MakeIntrinsicClass(LocalDateTime, 'Temporal.LocalDateTime');"];
  const updated = [...prepend, ...lines.slice(2), ...append];
  writeAllLines(file, updated);
}

function processTests(file) {
  const lines = readAllLines(file);
  const updated = lines
    .filter((line) => {
      if (line.includes('// @ts')) return false;
      if (line.includes('eslint-disable-next-line @typescript-eslint')) return false;
      if (line.includes('const it = itOriginal')) return false;
      if (line.includes('import { LocalDateTime }')) return false;
      return true;
    })
    .map((line) => {
      if (line.includes('import { Temporal }')) return "import * as Temporal from 'proposal-temporal';";
      if (line.includes(': itOriginal')) return line.replace(': itOriginal', '');
      if (line.includes('const { Absolute, DateTime')) {
        return line.replace('const { Absolute, DateTime', 'const { Absolute, DateTime, LocalDateTime');
      }
      return line;
    });
  writeAllLines(file, updated);
}

processDts('./polyfill/lib/poc/LocalDateTime.d.ts', './polyfill/index.d.ts', './polyfill/poc.d.ts');
processMjs('./polyfill/lib/localdatetime.mjs');
processTests('./polyfill/test/localdatetime.mjs');