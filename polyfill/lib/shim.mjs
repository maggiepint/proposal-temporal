// This is an alternate entry point that polyfills Temporal onto the global
// object. This is used only for the browser playground and the test262 tests.
// See the note in index.mjs.

import * as Temporal from './temporal.mjs';
import * as Intl from './intl.mjs';
import { toTemporalInstant } from './legacydate.mjs';

Object.defineProperty(globalThis, 'Temporal', {
  value: {},
  writable: true,
  enumerable: false,
  configurable: true
});
copy(globalThis.Temporal, Temporal);
Object.defineProperty(globalThis.Temporal, Symbol.toStringTag, {
  value: 'Temporal',
  writable: false,
  enumerable: false,
  configurable: true
});
copy(globalThis.Intl, Intl);
Object.defineProperty(globalThis.Date.prototype, 'toTemporalInstant', {
  value: toTemporalInstant,
  writable: true,
  enumerable: false,
  configurable: true
});

function copy(target, source) {
  for (const prop of Object.getOwnPropertyNames(source)) {
    Object.defineProperty(target, prop, {
      value: source[prop],
      writable: true,
      enumerable: false,
      configurable: true
    });
  }
}

export { Temporal, Intl, toTemporalInstant };
