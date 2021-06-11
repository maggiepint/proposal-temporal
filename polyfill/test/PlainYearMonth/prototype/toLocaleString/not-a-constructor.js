// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.plainyearmonth.prototype.tolocalestring
info: |
    Built-in function objects that are not identified as constructors do not implement the
    [[Construct]] internal method unless otherwise specified in the description of a particular
    function.
includes: [isConstructor.js]
features: [Reflect.construct, Temporal]
---*/

assert.throws(TypeError, () => {
  new Temporal.PlainYearMonth.prototype.toLocaleString();
}, "Calling as constructor");

assert.sameValue(isConstructor(Temporal.PlainYearMonth.prototype.toLocaleString), false,
  "isConstructor(Temporal.PlainYearMonth.prototype.toLocaleString)");
