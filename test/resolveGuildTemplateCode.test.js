'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
require('../src'); // DataResolver sits in a require cycle; load the package entry first
const { resolveGuildTemplateCode } = require('../src/util/DataResolver');

test('resolveGuildTemplateCode', () => {
  assert.equal(resolveGuildTemplateCode('https://discord.new/abc'), 'abc');
});
