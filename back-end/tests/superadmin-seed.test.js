const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('seed não sobrescreve a senha do super admin existente', () => {
  const source = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'index.ts'),
    'utf8'
  );

  const upsertStart = source.indexOf('await prisma.user.upsert({', source.indexOf("const superAdminEmail"));
  const upsertEnd = source.indexOf('  });', upsertStart) + '  });'.length;
  const upsertBlock = source.slice(upsertStart, upsertEnd);
  const updateBlock = upsertBlock.slice(
    upsertBlock.indexOf('update:'),
    upsertBlock.indexOf('create:')
  );

  assert.ok(upsertStart >= 0, 'upsert do super admin não encontrado');
  assert.doesNotMatch(updateBlock, /password\s*:/);
  assert.match(upsertBlock.slice(upsertBlock.indexOf('create:')), /password\s*:\s*superAdminPassword/);
});
