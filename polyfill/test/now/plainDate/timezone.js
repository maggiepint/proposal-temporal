// Copyright (C) 2020 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.now.plaindate
includes: [compareArray.js]
features: [Temporal]
---*/

const actual = [];
const expected = [
  "has timeZone.timeZone",
  "get timeZone.getOffsetNanosecondsFor",
  "call timeZone.getOffsetNanosecondsFor",
];

const timeZone = new Proxy({
  getOffsetNanosecondsFor(instant) {
    actual.push("call timeZone.getOffsetNanosecondsFor");
    assert.sameValue(instant instanceof Temporal.Instant, true, "Instant");
    return 86399_999_999_999;
  },
}, {
  has(target, property) {
    actual.push(`has timeZone.${property}`);
    return property in target;
  },
  get(target, property) {
    actual.push(`get timeZone.${property}`);
    return target[property];
  },
});

const calendar = Temporal.Calendar.from("iso8601");

const result = Temporal.now.plainDate(calendar, timeZone);
assert.sameValue(result instanceof Temporal.PlainDate, true);

assert.compareArray(actual, expected);
