import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fixture } from './index.js';

test('workspace fixture is executable', () => assert.equal(fixture, true));
