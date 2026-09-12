import { test } from 'node:test';
import assert from 'node:assert/strict';
import { name, apply, resolveDesktopUrl } from '../src/index.js';

test('module name is desktop', () => {
  assert.equal(name, 'desktop');
});

test('apply is exported', () => {
  assert.equal(typeof apply, 'function');
});

test('resolveDesktopUrl uses the DSH connection launch token', () => {
  const ctx = {
    get(key) {
      assert.equal(key, 'connection');
      return {
        authenticatedUrl(baseUrl) {
          return `${baseUrl}?token=test-token`;
        }
      };
    }
  };
  assert.equal(
    resolveDesktopUrl(ctx),
    'dsh-desktop://127.0.0.1/?token=test-token'
  );
});

test('resolveDesktopUrl falls back to the plain desktop root', () => {
  assert.equal(resolveDesktopUrl({}), 'dsh-desktop://127.0.0.1/');
});
