// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.instant.fromepochmilliseconds
info: |
    Built-in function objects that are not identified as constructors do not implement the
    [[Construct]] internal method unless otherwise specified in the description of a particular
    function.
includes: [isConstructor.js]
features: [Reflect.construct, Temporal]
---*/

assert.throws(TypeError, () => {
  new Temporal.Instant.fromEpochMilliseconds();
}, "Calling as constructor");

assert.sameValue(isConstructor(Temporal.Instant.fromEpochMilliseconds), false,
  "isConstructor(Temporal.Instant.fromEpochMilliseconds)");
