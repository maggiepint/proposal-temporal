// First of all, create a controllable clock object that underlies the
// functions in the Temporal.now namespace, that we can tick forward or backward
// at will.
// We'll use the clock to remove Temporal's access to the system clock below.

class Clock {
  epochNs = 0n;
  tick(ticks = 1) {
    this.epochNs += BigInt(ticks);
  }
}
const clock = new Clock();

// Save the original Temporal functions that we will override but still need
// access to internally.

const realTemporalCalendar = Temporal.Calendar;
const realCalendarFrom = Temporal.Calendar.from;
const realTemporalTimeZone = Temporal.TimeZone;
const realTimeZoneFrom = Temporal.TimeZone.from;
const realTemporalNow = Temporal.now;

// Override the Temporal.Calendar constructor and Temporal.Calendar.from to
// disallow all calendars except the iso8601 calendar, otherwise insecure code
// might be able to tell something about the version of the host system's
// locale data.

class Calendar extends realTemporalCalendar {
  constructor(identifier) {
    if (identifier !== 'iso8601') {
      // match error message
      throw new RangeError(`Invalid calendar: ${identifier}`);
    }
    super(identifier);
  }

  static from(item) {
    const calendar = realCalendarFrom.call(realTemporalCalendar, item);
    const identifier = calendar.toString();
    const constructor = Object.is(this, realTemporalCalendar) ? Calendar : this;
    return new constructor(identifier);
  }
}
Object.getOwnPropertyNames(realTemporalCalendar.prototype).forEach((name) => {
  if (name === 'constructor') return;
  const desc = Object.getOwnPropertyDescriptor(realTemporalCalendar.prototype, name);
  Object.defineProperty(Calendar.prototype, name, desc);
});

// Do the same for the Temporal.TimeZone constructor and Temporal.TimeZone.from
// to allow only offset time zones and the various aliases for UTC, otherwise
// insecure code might be able to tell something about the version of the host
// system's time zone database.

class TimeZone extends realTemporalTimeZone {
  constructor(identifier) {
    const matchOffset = /^[+\u2212-][0-2][0-9](?::?[0-5][0-9](?::?[0-5][0-9](?:[.,]\d{1,9})?)?)?$/;
    const matchUTC = /^UTC|Etc\/UTC|Etc\/GMT(?:[-+]\d{1,2})?$/;
    if (!matchUTC.test(identifier) && !matchOffset.test(identifier)) {
      // match error message
      throw new RangeError(`Invalid time zone specified: ${identifier}`);
    }
    super(identifier);
  }

  static from(item) {
    const timeZone = realTimeZoneFrom.call(realTemporalTimeZone, item);
    const identifier = timeZone.toString();
    const constructor = Object.is(this, realTemporalTimeZone) ? TimeZone : this;
    return new constructor(identifier);
  }
}
Object.getOwnPropertyNames(realTemporalTimeZone.prototype).forEach((name) => {
  if (name === 'constructor') return;
  const desc = Object.getOwnPropertyDescriptor(realTemporalTimeZone.prototype, name);
  Object.defineProperty(TimeZone.prototype, name, desc);
});

// Override the functions in the Temporal.now namespace using our patched clock,
// calendar, and time zone.

function instant() {
  return new Temporal.Instant(clock.epochNs);
}

function plainDateTime(calendarLike, temporalTimeZoneLike = timeZone()) {
  const timeZone = TimeZone.from(temporalTimeZoneLike);
  const calendar = Calendar.from(calendarLike);
  const inst = instant();
  return timeZone.getPlainDateTimeFor(inst, calendar);
}

function plainDateTimeISO(temporalTimeZoneLike = timeZone()) {
  const timeZone = TimeZone.from(temporalTimeZoneLike);
  const calendar = new Calendar('iso8601');
  const inst = instant();
  return timeZone.getPlainDateTimeFor(inst, calendar);
}

function zonedDateTime(calendarLike, temporalTimeZoneLike = timeZone()) {
  const timeZone = TimeZone.from(temporalTimeZoneLike);
  const calendar = Calendar.from(calendarLike);
  return new Temporal.ZonedDateTime(clock.epochNs, timeZone, calendar);
}

function zonedDateTimeISO(temporalTimeZoneLike = timeZone()) {
  const timeZone = TimeZone.from(temporalTimeZoneLike);
  const calendar = new Calendar('iso8601');
  return new Temporal.ZonedDateTime(clock.epochNs, timeZone, calendar);
}

function plainDate(calendarLike, temporalTimeZoneLike = timeZone()) {
  const pdt = plainDateTime(calendarLike, temporalTimeZoneLike);
  const f = pdt.getISOFields();
  return new Temporal.PlainDate(f.isoYear, f.isoMonth, f.isoDay, f.calendar);
}

function plainDateISO(temporalTimeZoneLike = timeZone()) {
  const pdt = plainDateTimeISO(temporalTimeZoneLike);
  const f = pdt.getISOFields();
  return new Temporal.PlainDate(f.isoYear, f.isoMonth, f.isoDay, f.calendar);
}

function plainTimeISO(temporalTimeZoneLike = timeZone()) {
  const pdt = plainDateTimeISO(temporalTimeZoneLike);
  const f = pdt.getISOFields();
  return new Temporal.PlainTime(
    f.isoHour,
    f.isoMinute,
    f.isoSecond,
    f.isoMillisecond,
    f.isoMicrosecond,
    f.isoNanosecond
  );
}

function timeZone() {
  return new TimeZone('UTC');
}

// We now have everything we need to lock down Temporal, but if we want the
// insecure code to run in an indistinguishable environment from an unlocked
// Temporal, then we have to do a few more things, such as make sure that
// toString() gives the same result for the patched functions as it would for
// the original functions.

// This example code is not exhaustive, but this is a sample of the concerns
// that a secure environment would have to address.

const realFunctionToString = Function.prototype.toString;
const functionToString = function toString() {
  const patchedFunctions = new Map([
    [Calendar, realTemporalCalendar],
    [Calendar.from, realCalendarFrom],
    [instant, realTemporalNow.instant],
    [plainDate, realTemporalNow.plainDate],
    [plainDateISO, realTemporalNow.plainDateISO],
    [plainDateTime, realTemporalNow.plainDateTime],
    [plainDateTimeISO, realTemporalNow.plainDateTimeISO],
    [plainTimeISO, realTemporalNow.plainTimeISO],
    [timeZone, realTemporalNow.timeZone],
    [TimeZone, realTemporalTimeZone],
    [TimeZone.from, realTimeZoneFrom],
    [toString, realFunctionToString],
    [zonedDateTime, realTemporalNow.zonedDateTime],
    [zonedDateTimeISO, realTemporalNow.zonedDateTimeISO]
  ]);
  if (patchedFunctions.has(this)) {
    return realFunctionToString.apply(patchedFunctions.get(this), arguments);
  }
  return realFunctionToString.apply(this, arguments);
};

// Finally, freeze the Temporal object and all of its properties.
// (Because this is done before any user code runs, we can use Temporal APIs in
// the functions above. Otherwise we'd need to save the original APIs in case
// user code overrode them.)

function deepFreeze(object, path) {
  Object.getOwnPropertyNames(object).forEach((name) => {
    // Avoid .prototype.constructor endless loop
    if (name === 'constructor') return;

    const desc = Object.getOwnPropertyDescriptor(object, name);

    if (desc.value) {
      const value = desc.value;
      if (typeof value === 'object' || typeof value === 'function') {
        deepFreeze(value, `${path}.${name}`);
      }
    }
    if (desc.get) {
      deepFreeze(desc.get, `${path}.get ${name}`);
    }
    if (desc.set) {
      deepFreeze(desc.set, `${path}.set ${name}`);
    }
  });

  return Object.freeze(object);
}

// This is the function that does the actual patching to lock down Temporal. It
// must run before any user code does.

function makeMockTemporal() {
  realTemporalTimeZone.from = TimeZone.from;
  realTemporalCalendar.from = Calendar.from;
  Temporal.Calendar = Calendar;
  Temporal.TimeZone = TimeZone;
  Temporal.now = {
    instant,
    plainDateTime,
    plainDateTimeISO,
    plainDate,
    plainDateISO,
    plainTimeISO,
    timeZone,
    zonedDateTime,
    zonedDateTimeISO
  };
  deepFreeze(Temporal, 'Temporal');
  Function.prototype.toString = functionToString;
}

// Check that we cannot distinguish the mock Temporal from the real one by
// looking at some metadata; save the original metadata for later
const realTemporalNowPlainDateToString = Temporal.now.plainDate.toString();
const realTemporalNowPlainDateOwnProperties = Object.getOwnPropertyDescriptors(Temporal.now.plainDate);

// After this call, Temporal is locked down.
makeMockTemporal();

// The clock starts at midnight UTC January 1, 1970, and is advanced manually.
assert.equal(Temporal.now.instant().toString(), '1970-01-01T00:00:00Z');
clock.tick(1_000_000_000n);
assert.equal(Temporal.now.instant().toString(), '1970-01-01T00:00:01Z');
clock.tick(86400_000_000_000n);
assert.equal(Temporal.now.instant().toString(), '1970-01-02T00:00:01Z');

// The other functions in the Temporal.now namespace use the same clock.
assert.equal(Temporal.now.plainDateTimeISO().toString(), '1970-01-02T00:00:01');
assert.equal(Temporal.now.plainDateISO().toString(), '1970-01-02');
assert.equal(Temporal.now.plainTimeISO().toString(), '00:00:01');
assert.equal(Temporal.now.zonedDateTimeISO().toString(), '1970-01-02T00:00:01+00:00[UTC]');

// Time zones other than UTC and calendars other than ISO are not provided.
assert.throws(() => Temporal.ZonedDateTime.from('2021-02-12T16:18[America/Vancouver]'), RangeError);
assert.throws(() => Temporal.PlainDate.from('2021-02-12[u-ca-gregory]'), RangeError);

// Constructing unsupported time zones directly doesn't work either.
assert.throws(() => new Temporal.TimeZone('America/Vancouver'), RangeError);
assert.throws(() => Temporal.TimeZone.from('America/Vancouver'), RangeError);
assert.throws(() => new Temporal.Calendar('gregory'), RangeError);
assert.throws(() => Temporal.Calendar.from('gregory'), RangeError);

// UTC, offset time zones, and their aliases are still supported.
assert.equal(new Temporal.TimeZone('-08:00').toString(), '-08:00');
assert.equal(new Temporal.TimeZone('Etc/UTC').toString(), 'UTC');
assert.equal(new Temporal.TimeZone('Etc/GMT+8').toString(), 'Etc/GMT+8');

// Check that our function metadata is equal to what we saved earlier...
assert.equal(Temporal.now.plainDate.toString(), realTemporalNowPlainDateToString);

// ...except take into account that we've frozen the Temporal object.
Object.values(realTemporalNowPlainDateOwnProperties).forEach((desc) => {
  desc.configurable = false;
  desc.writable = false;
});
assert.deepEqual(Object.getOwnPropertyDescriptors(Temporal.now.plainDate), realTemporalNowPlainDateOwnProperties);
