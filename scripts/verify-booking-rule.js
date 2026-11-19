#!/usr/bin/env node

// Проверяет силу регрессионного теста: мутируем правило пересечения только в
// дочернем Node-процессе и ожидаем падение test/calendar.test.js.

const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const root = path.join(__dirname, '..');
const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'calendar-mutation-'));
const preload = path.join(tempDir, 'mutate-calendar.cjs');
const target = path.join(root, 'src', 'calendar.js');

fs.writeFileSync(
  preload,
  `const Module = require('node:module');
const fs = require('node:fs');
const target = ${JSON.stringify(target)};
const original = Module._extensions['.js'];
Module._extensions['.js'] = function(mod, filename) {
  if (filename === target) {
    const source = fs.readFileSync(filename, 'utf8');
    const mutated = source.replace(
      'return !intervals.some((iv) => overlaps(t, durationMinutes, iv.start, iv.duration));',
      'return true;'
    );
    if (mutated === source) throw new Error('Правило пересечения не найдено для мутации');
    mod._compile(mutated, filename);
    return;
  }
  original(mod, filename);
};
`,
);

try {
  const result = childProcess.spawnSync(process.execPath, ['--require', preload, '--test', 'test/calendar.test.js'], {
    cwd: root,
    encoding: 'utf8',
  });
  if (result.status === 0) {
    throw new Error('Мутированное правило пересечения не было обнаружено тестом');
  }
  process.stdout.write('Регрессионный тест обнаружил временно нарушенное правило пересечения.\n');
} finally {
  fs.rmSync(tempDir, { recursive: true, force: true });
}
