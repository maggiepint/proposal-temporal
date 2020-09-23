// Copyright (C) 2020 Igalia, S.L. All rights reserved.
// This code is governed by the BSD license found in the LICENSE file.

/*---
esid: sec-temporal.timezone.prototype.getdatetimefor
---*/

const instant = Temporal.Instant.from("1975-02-02T14:25:36.123456789Z");
const timeZone = Temporal.TimeZone.from("UTC");

Object.defineProperty(Temporal.Calendar, "from", {
  get() {
    throw new Test262Error("Should not call Calendar.from");
  },
});

const result1 = timeZone.getDateTimeFor(instant);
assert.sameValue(result1.calendar.toString(), "iso8601");

const result2 = timeZone.getDateTimeFor(instant, undefined);
assert.sameValue(result2.calendar.toString(), "iso8601");
