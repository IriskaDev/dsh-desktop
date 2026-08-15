import { test } from 'node:test';
import assert from 'node:assert/strict';
import { name, apply } from '../src/index.js';

test('module name is desktop', () => {
  assert.equal(name, 'desktop');
});

test('apply is exported', () => {
  assert.equal(typeof apply, 'function');
});
