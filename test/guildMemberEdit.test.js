'use strict';

// Regression: editing your own nickname reaches a `process.emitWarning` deprecation notice. A `{ process }`
// destructure once left `process` undefined, so this common edit crashed with a TypeError before patching.
const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Client } = require('../src');

test('editing your own nickname patches via /members/@me and does not crash', async () => {
  const client = new Client();
  const me = '123456789012345678';
  client.user = { id: me };
  const guild = client.guilds._add({ id: '1', properties: { name: 'G' } });
  let patched;
  client.rest = {
    patch: async (route, opts) => {
      patched = { route, opts };
      return { user: { id: me, username: 'me' }, roles: [] };
    },
  };

  const member = await guild.members.edit(me, { nick: 'new' });
  assert.ok(member);
  assert.match(patched.route, /%40me/); // the sole-nickname endpoint (@me, URL-encoded)
  assert.equal(patched.opts.body.nick, 'new');
});
