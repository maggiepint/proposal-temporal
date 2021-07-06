// Copyright (C) 2021 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.duration.prototype.total
includes: [compareArray.js]
features: [Temporal]
---*/

const actual = [];
const duration = Temporal.Duration.from({ months: 12 });
Object.defineProperty(duration, "months", {
  get() {
    actual.push("get months");
    return 1;
  }
});
class Calendar extends Temporal.Calendar {
  constructor() {
    super("iso8601");
  }
  dateUntil() {
    actual.push("dateUntil");
    return duration;
  }
}
const relativeTo = Temporal.PlainDateTime.from("2018-10-12").withCalendar(new Calendar());

const days = Temporal.Duration.from({ years: 1 });
const result = days.total({ unit: "months", relativeTo });
assert.sameValue(result, 12, "result");
assert.compareArray(actual, ["dateUntil"], "operations");
