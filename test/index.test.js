import { test } from 'node:test';
import assert from 'node:assert/strict';
import { name, inject } from '../src/index.js';

test('module name is desktop', () => {
  assert.equal(name, 'desktop');
});

test('inject declares webServer dependency', () => {
  assert.ok(Array.isArray(inject));
  assert.ok(inject.includes('webServer'));
});
