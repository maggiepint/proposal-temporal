/* global __debug__ */

const ArrayPrototypePush = Array.prototype.push;
const IntlDateTimeFormat = globalThis.Intl.DateTimeFormat;
const MathMin = Math.min;
const MathMax = Math.max;
const MathAbs = Math.abs;
const MathFloor = Math.floor;
const MathSign = Math.sign;
const MathTrunc = Math.trunc;
const NumberIsNaN = Number.isNaN;
const NumberIsFinite = Number.isFinite;
const NumberMaxSafeInteger = Number.MAX_SAFE_INTEGER;
const ObjectAssign = Object.assign;
const ObjectCreate = Object.create;
const ObjectDefineProperty = Object.defineProperty;
const ObjectIs = Object.is;
const ObjectEntries = Object.entries;

import bigInt from 'big-integer';
import Call from 'es-abstract/2020/Call';
import GetMethod from 'es-abstract/2020/GetMethod';
import IsInteger from 'es-abstract/2020/IsInteger';
import ToInteger from 'es-abstract/2020/ToInteger';
import ToLength from 'es-abstract/2020/ToLength';
import ToNumber from 'es-abstract/2020/ToNumber';
import ToPrimitive from 'es-abstract/2020/ToPrimitive';
import ToString from 'es-abstract/2020/ToString';
import Type from 'es-abstract/2020/Type';

import { GetIntrinsic } from './intrinsicclass.mjs';
import {
  CreateSlots,
  GetSlot,
  HasSlot,
  SetSlot,
  EPOCHNANOSECONDS,
  TIMEZONE_ID,
  CALENDAR_ID,
  INSTANT,
  ISO_YEAR,
  ISO_MONTH,
  ISO_DAY,
  ISO_HOUR,
  ISO_MINUTE,
  ISO_SECOND,
  ISO_MILLISECOND,
  ISO_MICROSECOND,
  ISO_NANOSECOND,
  DATE_BRAND,
  YEAR_MONTH_BRAND,
  MONTH_DAY_BRAND,
  TIME_ZONE,
  CALENDAR,
  YEARS,
  MONTHS,
  WEEKS,
  DAYS,
  HOURS,
  MINUTES,
  SECONDS,
  MILLISECONDS,
  MICROSECONDS,
  NANOSECONDS
} from './slots.mjs';
import { IsBuiltinCalendar } from './calendar.mjs';

const DAYMILLIS = 86400000;
const NS_MIN = bigInt(-86400).multiply(1e17);
const NS_MAX = bigInt(86400).multiply(1e17);
const YEAR_MIN = -271821;
const YEAR_MAX = 275760;
const BEFORE_FIRST_DST = bigInt(-388152).multiply(1e13); // 1847-01-01T00:00:00Z

const ToPositiveInteger = (value, property) => {
  value = ToInteger(value);
  if (value < 1) {
    if (property !== undefined) {
      throw new RangeError(`property '${property}' cannot be a a number less than one`);
    }
    throw new RangeError('Cannot convert a number less than one to a positive integer');
  }
  return value;
};

const BUILTIN_CASTS = new Map([
  ['year', ToInteger],
  ['month', ToPositiveInteger],
  ['monthCode', ToString],
  ['day', ToPositiveInteger],
  ['hour', ToInteger],
  ['minute', ToInteger],
  ['second', ToInteger],
  ['millisecond', ToInteger],
  ['microsecond', ToInteger],
  ['nanosecond', ToInteger],
  ['years', ToInteger],
  ['months', ToInteger],
  ['weeks', ToInteger],
  ['days', ToInteger],
  ['hours', ToInteger],
  ['minutes', ToInteger],
  ['seconds', ToInteger],
  ['milliseconds', ToInteger],
  ['microseconds', ToInteger],
  ['nanoseconds', ToInteger],
  ['era', ToString],
  ['eraYear', ToInteger],
  ['offset', ToString]
]);

const ALLOWED_UNITS = [
  'year',
  'month',
  'week',
  'day',
  'hour',
  'minute',
  'second',
  'millisecond',
  'microsecond',
  'nanosecond'
];
const SINGULAR_PLURAL_UNITS = [
  ['years', 'year'],
  ['months', 'month'],
  ['weeks', 'week'],
  ['days', 'day'],
  ['hours', 'hour'],
  ['minutes', 'minute'],
  ['seconds', 'second'],
  ['milliseconds', 'millisecond'],
  ['microseconds', 'microsecond'],
  ['nanoseconds', 'nanosecond']
];

import * as PARSE from './regex.mjs';

const ES2020 = {
  Call,
  GetMethod,
  IsInteger,
  ToInteger,
  ToLength,
  ToNumber,
  ToPrimitive,
  ToString,
  Type
};

export const ES = ObjectAssign({}, ES2020, {
  ToPositiveInteger: ToPositiveInteger,
  ToFiniteInteger: (value) => {
    const integer = ES.ToInteger(value);
    if (!NumberIsFinite(integer)) {
      throw new RangeError('infinity is out of range');
    }
    return integer;
  },
  IsTemporalInstant: (item) => HasSlot(item, EPOCHNANOSECONDS) && !HasSlot(item, TIME_ZONE, CALENDAR),
  IsTemporalTimeZone: (item) => HasSlot(item, TIMEZONE_ID),
  IsTemporalCalendar: (item) => HasSlot(item, CALENDAR_ID),
  IsTemporalDuration: (item) =>
    HasSlot(item, YEARS, MONTHS, DAYS, HOURS, MINUTES, SECONDS, MILLISECONDS, MICROSECONDS, NANOSECONDS),
  IsTemporalDate: (item) => HasSlot(item, DATE_BRAND),
  IsTemporalTime: (item) =>
    HasSlot(item, ISO_HOUR, ISO_MINUTE, ISO_SECOND, ISO_MILLISECOND, ISO_MICROSECOND, ISO_NANOSECOND) &&
    !HasSlot(item, ISO_YEAR, ISO_MONTH, ISO_DAY),
  IsTemporalDateTime: (item) =>
    HasSlot(
      item,
      ISO_YEAR,
      ISO_MONTH,
      ISO_DAY,
      ISO_HOUR,
      ISO_MINUTE,
      ISO_SECOND,
      ISO_MILLISECOND,
      ISO_MICROSECOND,
      ISO_NANOSECOND
    ),
  IsTemporalYearMonth: (item) => HasSlot(item, YEAR_MONTH_BRAND),
  IsTemporalMonthDay: (item) => HasSlot(item, MONTH_DAY_BRAND),
  IsTemporalZonedDateTime: (item) => HasSlot(item, EPOCHNANOSECONDS, TIME_ZONE, CALENDAR),
  TemporalTimeZoneFromString: (stringIdent) => {
    let { ianaName, offset, z } = ES.ParseTemporalTimeZoneString(stringIdent);
    if (z) ianaName = 'UTC';
    const result = ES.GetCanonicalTimeZoneIdentifier(ianaName || offset);
    if (offset && ianaName && ianaName !== offset) {
      const ns = ES.ParseTemporalInstant(stringIdent);
      const offsetNs = ES.GetIANATimeZoneOffsetNanoseconds(ns, result);
      if (ES.FormatTimeZoneOffsetString(offsetNs) !== offset) {
        throw new RangeError(`invalid offset ${offset}[${ianaName}]`);
      }
    }
    return result;
  },
  FormatCalendarAnnotation: (id, showCalendar) => {
    if (showCalendar === 'never') return '';
    if (showCalendar === 'auto' && id === 'iso8601') return '';
    return `[u-ca=${id}]`;
  },
  ParseISODateTime: (isoString, { zoneRequired }) => {
    const regex = zoneRequired ? PARSE.instant : PARSE.datetime;
    const match = regex.exec(isoString);
    if (!match) throw new RangeError(`invalid ISO 8601 string: ${isoString}`);
    let yearString = match[1];
    if (yearString[0] === '\u2212') yearString = `-${yearString.slice(1)}`;
    const year = ES.ToInteger(yearString);
    const month = ES.ToInteger(match[2] || match[4]);
    const day = ES.ToInteger(match[3] || match[5]);
    const hour = ES.ToInteger(match[6]);
    const minute = ES.ToInteger(match[7] || match[10]);
    let second = ES.ToInteger(match[8] || match[11]);
    if (second === 60) second = 59;
    const fraction = (match[9] || match[12]) + '000000000';
    const millisecond = ES.ToInteger(fraction.slice(0, 3));
    const microsecond = ES.ToInteger(fraction.slice(3, 6));
    const nanosecond = ES.ToInteger(fraction.slice(6, 9));
    let offset, z;
    if (match[13]) {
      offset = '+00:00';
      z = 'Z';
    } else if (match[14] && match[15]) {
      const offsetSign = match[14] === '-' || match[14] === '\u2212' ? '-' : '+';
      const offsetHours = match[15] || '00';
      const offsetMinutes = match[16] || '00';
      const offsetSeconds = match[17] || '00';
      let offsetFraction = match[18] || '0';
      offset = `${offsetSign}${offsetHours}:${offsetMinutes}`;
      if (+offsetFraction) {
        while (offsetFraction.endsWith('0')) offsetFraction = offsetFraction.slice(0, -1);
        offset += `:${offsetSeconds}.${offsetFraction}`;
      } else if (+offsetSeconds) {
        offset += `:${offsetSeconds}`;
      }
      if (offset === '-00:00') offset = '+00:00';
    }
    let ianaName = match[19];
    if (ianaName) {
      try {
        // Canonicalize name if it is an IANA link name or is capitalized wrong
        ianaName = ES.GetCanonicalTimeZoneIdentifier(ianaName).toString();
      } catch {
        // Not an IANA name, may be a custom ID, pass through unchanged
      }
    }
    const calendar = match[20];
    return {
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      ianaName,
      offset,
      z,
      calendar
    };
  },
  ParseTemporalInstantString: (isoString) => {
    return ES.ParseISODateTime(isoString, { zoneRequired: true });
  },
  ParseTemporalZonedDateTimeString: (isoString) => {
    return ES.ParseISODateTime(isoString, { zoneRequired: true });
  },
  ParseTemporalDateTimeString: (isoString) => {
    return ES.ParseISODateTime(isoString, { zoneRequired: false });
  },
  ParseTemporalDateString: (isoString) => {
    return ES.ParseISODateTime(isoString, { zoneRequired: false });
  },
  ParseTemporalTimeString: (isoString) => {
    const match = PARSE.time.exec(isoString);
    let hour, minute, second, millisecond, microsecond, nanosecond, calendar;
    if (match) {
      hour = ES.ToInteger(match[1]);
      minute = ES.ToInteger(match[2] || match[5]);
      second = ES.ToInteger(match[3] || match[6]);
      if (second === 60) second = 59;
      const fraction = (match[4] || match[7]) + '000000000';
      millisecond = ES.ToInteger(fraction.slice(0, 3));
      microsecond = ES.ToInteger(fraction.slice(3, 6));
      nanosecond = ES.ToInteger(fraction.slice(6, 9));
      calendar = match[15];
    } else {
      ({ hour, minute, second, millisecond, microsecond, nanosecond, calendar } = ES.ParseISODateTime(isoString, {
        zoneRequired: false
      }));
    }
    return { hour, minute, second, millisecond, microsecond, nanosecond, calendar };
  },
  ParseTemporalYearMonthString: (isoString) => {
    const match = PARSE.yearmonth.exec(isoString);
    let year, month, calendar, referenceISODay;
    if (match) {
      let yearString = match[1];
      if (yearString[0] === '\u2212') yearString = `-${yearString.slice(1)}`;
      year = ES.ToInteger(yearString);
      month = ES.ToInteger(match[2]);
      calendar = match[3];
    } else {
      ({ year, month, calendar, day: referenceISODay } = ES.ParseISODateTime(isoString, { zoneRequired: false }));
    }
    return { year, month, calendar, referenceISODay };
  },
  ParseTemporalMonthDayString: (isoString) => {
    const match = PARSE.monthday.exec(isoString);
    let month, day, calendar, referenceISOYear;
    if (match) {
      month = ES.ToInteger(match[1]);
      day = ES.ToInteger(match[2]);
    } else {
      ({ month, day, calendar, year: referenceISOYear } = ES.ParseISODateTime(isoString, { zoneRequired: false }));
    }
    return { month, day, calendar, referenceISOYear };
  },
  ParseTemporalTimeZoneString: (stringIdent) => {
    try {
      let canonicalIdent = ES.GetCanonicalTimeZoneIdentifier(stringIdent);
      if (canonicalIdent) {
        canonicalIdent = canonicalIdent.toString();
        if (ES.ParseOffsetString(canonicalIdent) !== null) return { offset: canonicalIdent };
        return { ianaName: canonicalIdent };
      }
    } catch {
      // fall through
    }
    try {
      // Try parsing ISO string instead
      return ES.ParseISODateTime(stringIdent, { zoneRequired: true });
    } catch {
      throw new RangeError(`Invalid time zone: ${stringIdent}`);
    }
  },
  ParseTemporalDurationString: (isoString) => {
    const match = PARSE.duration.exec(isoString);
    if (!match) throw new RangeError(`invalid duration: ${isoString}`);
    if (match.slice(2).every((element) => element === undefined)) {
      throw new RangeError(`invalid duration: ${isoString}`);
    }
    const sign = match[1] === '-' || match[1] === '\u2212' ? -1 : 1;
    const years = ES.ToInteger(match[2]) * sign;
    const months = ES.ToInteger(match[3]) * sign;
    const weeks = ES.ToInteger(match[4]) * sign;
    const days = ES.ToInteger(match[5]) * sign;
    const hours = ES.ToInteger(match[6]) * sign;
    let fHours = match[7];
    let minutes = ES.ToInteger(match[8]) * sign;
    let fMinutes = match[9];
    let seconds = ES.ToInteger(match[10]) * sign;
    let fSeconds = match[11] + '000000000';
    let milliseconds = ES.ToInteger(fSeconds.slice(0, 3)) * sign;
    let microseconds = ES.ToInteger(fSeconds.slice(3, 6)) * sign;
    let nanoseconds = ES.ToInteger(fSeconds.slice(6, 9)) * sign;

    fHours = fHours ? (sign * ES.ToInteger(fHours)) / 10 ** fHours.length : 0;
    fMinutes = fMinutes ? (sign * ES.ToInteger(fMinutes)) / 10 ** fMinutes.length : 0;

    ({ minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.DurationHandleFractions(
      fHours,
      minutes,
      fMinutes,
      seconds,
      0,
      milliseconds,
      0,
      microseconds,
      0,
      nanoseconds,
      0
    ));
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  ParseTemporalInstant: (isoString) => {
    const {
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      offset
    } = ES.ParseTemporalInstantString(isoString);

    const epochNs = ES.GetEpochFromISOParts(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    );
    if (epochNs === null) throw new RangeError('DateTime outside of supported range');
    if (!offset) throw new RangeError('Temporal.Instant requires a time zone offset');
    const offsetNs = ES.ParseOffsetString(offset);
    return epochNs.subtract(offsetNs);
  },
  RegulateISODateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, overflow) => {
    switch (overflow) {
      case 'reject':
        ES.RejectDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
        break;
      case 'constrain':
        ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.ConstrainISODateTime(
          year,
          month,
          day,
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond
        ));
        break;
    }
    return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  RegulateISODate: (year, month, day, overflow) => {
    switch (overflow) {
      case 'reject':
        ES.RejectISODate(year, month, day);
        break;
      case 'constrain':
        ({ year, month, day } = ES.ConstrainISODate(year, month, day));
        break;
    }
    return { year, month, day };
  },
  RegulateTime: (hour, minute, second, millisecond, microsecond, nanosecond, overflow) => {
    switch (overflow) {
      case 'reject':
        ES.RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
        break;
      case 'constrain':
        ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.ConstrainTime(
          hour,
          minute,
          second,
          millisecond,
          microsecond,
          nanosecond
        ));
        break;
    }
    return { hour, minute, second, millisecond, microsecond, nanosecond };
  },
  RegulateISOYearMonth: (year, month, overflow) => {
    const referenceISODay = 1;
    switch (overflow) {
      case 'reject':
        ES.RejectISODate(year, month, referenceISODay);
        break;
      case 'constrain':
        ({ year, month } = ES.ConstrainISODate(year, month));
        break;
    }
    return { year, month };
  },
  DurationHandleFractions: (
    fHours,
    minutes,
    fMinutes,
    seconds,
    fSeconds,
    milliseconds,
    fMilliseconds,
    microseconds,
    fMicroseconds,
    nanoseconds,
    fNanoseconds
  ) => {
    if (fHours !== 0) {
      [
        minutes,
        fMinutes,
        seconds,
        fSeconds,
        milliseconds,
        fMilliseconds,
        microseconds,
        fMicroseconds,
        nanoseconds,
        fNanoseconds
      ].forEach((val) => {
        if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
      });
      let mins = fHours * 60;
      minutes = MathTrunc(mins);
      fMinutes = mins % 1;
    }

    if (fMinutes !== 0) {
      [seconds, fSeconds, milliseconds, fMilliseconds, microseconds, fMicroseconds, nanoseconds, fNanoseconds].forEach(
        (val) => {
          if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
        }
      );
      let secs = fMinutes * 60;
      seconds = MathTrunc(secs);
      fSeconds = secs % 1;
    }

    if (fSeconds !== 0) {
      [milliseconds, fMilliseconds, microseconds, fMicroseconds, nanoseconds, fNanoseconds].forEach((val) => {
        if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
      });
      let mils = fSeconds * 1000;
      milliseconds = MathTrunc(mils);
      fMilliseconds = mils % 1;
    }

    if (fMilliseconds !== 0) {
      [microseconds, fMicroseconds, nanoseconds, fNanoseconds].forEach((val) => {
        if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
      });
      let mics = fMilliseconds * 1000;
      microseconds = MathTrunc(mics);
      fMicroseconds = mics % 1;
    }

    if (fMicroseconds !== 0) {
      [nanoseconds, fNanoseconds].forEach((val) => {
        if (val !== 0) throw new RangeError('only the smallest unit can be fractional');
      });
      let nans = fMicroseconds * 1000;
      nanoseconds = MathTrunc(nans);
    }

    return { minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  ToTemporalDurationRecord: (item) => {
    if (ES.IsTemporalDuration(item)) {
      return {
        years: GetSlot(item, YEARS),
        months: GetSlot(item, MONTHS),
        weeks: GetSlot(item, WEEKS),
        days: GetSlot(item, DAYS),
        hours: GetSlot(item, HOURS),
        minutes: GetSlot(item, MINUTES),
        seconds: GetSlot(item, SECONDS),
        milliseconds: GetSlot(item, MILLISECONDS),
        microseconds: GetSlot(item, MICROSECONDS),
        nanoseconds: GetSlot(item, NANOSECONDS)
      };
    }
    const props = ES.ToPartialRecord(
      item,
      [
        'days',
        'hours',
        'microseconds',
        'milliseconds',
        'minutes',
        'months',
        'nanoseconds',
        'seconds',
        'weeks',
        'years'
      ],
      (v) => {
        v = ES.ToNumber(v);
        if (MathFloor(v) !== v) {
          throw new RangeError(`unsupported fractional value ${v}`);
        }
        return v;
      }
    );
    if (!props) throw new TypeError('invalid duration-like');
    let {
      years = 0,
      months = 0,
      weeks = 0,
      days = 0,
      hours = 0,
      minutes = 0,
      seconds = 0,
      milliseconds = 0,
      microseconds = 0,
      nanoseconds = 0
    } = props;
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  ToLimitedTemporalDuration: (item, disallowedProperties = []) => {
    let record;
    if (ES.Type(item) === 'Object') {
      record = ES.ToTemporalDurationRecord(item);
    } else {
      const str = ES.ToString(item);
      record = ES.ParseTemporalDurationString(str);
    }
    const { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = record;
    ES.RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
    for (const property of disallowedProperties) {
      if (record[property] !== 0) {
        throw new RangeError(
          `Duration field ${property} not supported by Temporal.Instant. Try Temporal.ZonedDateTime instead.`
        );
      }
    }
    return record;
  },
  ToTemporalDurationOverflow: (options) => {
    return ES.GetOption(options, 'overflow', ['constrain', 'balance'], 'constrain');
  },
  ToTemporalOverflow: (options) => {
    return ES.GetOption(options, 'overflow', ['constrain', 'reject'], 'constrain');
  },
  ToTemporalDisambiguation: (options) => {
    return ES.GetOption(options, 'disambiguation', ['compatible', 'earlier', 'later', 'reject'], 'compatible');
  },
  ToTemporalRoundingMode: (options, fallback) => {
    return ES.GetOption(options, 'roundingMode', ['ceil', 'floor', 'trunc', 'halfExpand'], fallback);
  },
  NegateTemporalRoundingMode: (roundingMode) => {
    switch (roundingMode) {
      case 'ceil':
        return 'floor';
      case 'floor':
        return 'ceil';
      default:
        return roundingMode;
    }
  },
  ToTemporalOffset: (options, fallback) => {
    return ES.GetOption(options, 'offset', ['prefer', 'use', 'ignore', 'reject'], fallback);
  },
  ToShowCalendarOption: (options) => {
    return ES.GetOption(options, 'calendarName', ['auto', 'always', 'never'], 'auto');
  },
  ToShowTimeZoneNameOption: (options) => {
    return ES.GetOption(options, 'timeZoneName', ['auto', 'never'], 'auto');
  },
  ToShowOffsetOption: (options) => {
    return ES.GetOption(options, 'offset', ['auto', 'never'], 'auto');
  },
  ToTemporalRoundingIncrement: (options, dividend, inclusive) => {
    let maximum = Infinity;
    if (dividend !== undefined) maximum = dividend;
    if (!inclusive && dividend !== undefined) maximum = dividend > 1 ? dividend - 1 : 1;
    const increment = ES.GetNumberOption(options, 'roundingIncrement', 1, maximum, 1);
    if (dividend !== undefined && dividend % increment !== 0) {
      throw new RangeError(`Rounding increment must divide evenly into ${dividend}`);
    }
    return increment;
  },
  ToTemporalDateTimeRoundingIncrement: (options, smallestUnit) => {
    const maximumIncrements = {
      year: undefined,
      month: undefined,
      week: undefined,
      day: undefined,
      hour: 24,
      minute: 60,
      second: 60,
      millisecond: 1000,
      microsecond: 1000,
      nanosecond: 1000
    };
    return ES.ToTemporalRoundingIncrement(options, maximumIncrements[smallestUnit], false);
  },
  ToSecondsStringPrecision: (options) => {
    let smallestUnit = ES.ToSmallestTemporalUnit(options, undefined, ['year', 'month', 'week', 'day', 'hour']);
    switch (smallestUnit) {
      case 'minute':
        return { precision: 'minute', unit: 'minute', increment: 1 };
      case 'second':
        return { precision: 0, unit: 'second', increment: 1 };
      case 'millisecond':
        return { precision: 3, unit: 'millisecond', increment: 1 };
      case 'microsecond':
        return { precision: 6, unit: 'microsecond', increment: 1 };
      case 'nanosecond':
        return { precision: 9, unit: 'nanosecond', increment: 1 };
      default: // fall through if option not given
    }
    let digits = options.fractionalSecondDigits;
    if (digits === undefined) digits = 'auto';
    if (ES.Type(digits) !== 'Number') {
      digits = ES.ToString(digits);
      if (digits === 'auto') return { precision: 'auto', unit: 'nanosecond', increment: 1 };
      throw new RangeError(`fractionalSecondDigits must be 'auto' or 0 through 9, not ${digits}`);
    }
    if (NumberIsNaN(digits) || digits < 0 || digits > 9) {
      throw new RangeError(`fractionalSecondDigits must be 'auto' or 0 through 9, not ${digits}`);
    }
    const precision = MathFloor(digits);
    switch (precision) {
      case 0:
        return { precision, unit: 'second', increment: 1 };
      case 1:
      case 2:
      case 3:
        return { precision, unit: 'millisecond', increment: 10 ** (3 - precision) };
      case 4:
      case 5:
      case 6:
        return { precision, unit: 'microsecond', increment: 10 ** (6 - precision) };
      case 7:
      case 8:
      case 9:
        return { precision, unit: 'nanosecond', increment: 10 ** (9 - precision) };
    }
  },
  ToLargestTemporalUnit: (options, fallback, disallowedStrings = [], autoValue) => {
    const singular = new Map(SINGULAR_PLURAL_UNITS.filter(([, sing]) => !disallowedStrings.includes(sing)));
    const allowed = new Set(ALLOWED_UNITS);
    for (const s of disallowedStrings) {
      allowed.delete(s);
    }
    const retval = ES.GetOption(options, 'largestUnit', ['auto', ...allowed, ...singular.keys()], fallback);
    if (retval === 'auto' && autoValue !== undefined) return autoValue;
    if (singular.has(retval)) return singular.get(retval);
    return retval;
  },
  ToSmallestTemporalUnit: (options, fallback, disallowedStrings = []) => {
    const singular = new Map(SINGULAR_PLURAL_UNITS.filter(([, sing]) => !disallowedStrings.includes(sing)));
    const allowed = new Set(ALLOWED_UNITS);
    for (const s of disallowedStrings) {
      allowed.delete(s);
    }
    const value = ES.GetOption(options, 'smallestUnit', [...allowed, ...singular.keys()], fallback);
    if (singular.has(value)) return singular.get(value);
    return value;
  },
  ToTemporalDurationTotalUnit: (options) => {
    // This AO is identical to ToSmallestTemporalUnit, except:
    // - default is always `undefined` (caller will throw if omitted)
    // - option is named `unit` (not `smallestUnit`)
    // - all units are valid (no `disallowedStrings`)
    const singular = new Map(SINGULAR_PLURAL_UNITS);
    const value = ES.GetOption(options, 'unit', [...singular.values(), ...singular.keys()], undefined);
    if (singular.has(value)) return singular.get(value);
    return value;
  },
  ToRelativeTemporalObject: (options) => {
    const relativeTo = options.relativeTo;
    if (relativeTo === undefined) return relativeTo;

    let year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar, timeZone, offset;
    if (ES.Type(relativeTo) === 'Object') {
      if (ES.IsTemporalZonedDateTime(relativeTo) || ES.IsTemporalDateTime(relativeTo)) return relativeTo;
      if (ES.IsTemporalDate(relativeTo)) {
        return ES.CreateTemporalDateTime(
          GetSlot(relativeTo, ISO_YEAR),
          GetSlot(relativeTo, ISO_MONTH),
          GetSlot(relativeTo, ISO_DAY),
          0,
          0,
          0,
          0,
          0,
          0,
          GetSlot(relativeTo, CALENDAR)
        );
      }
      calendar = ES.GetTemporalCalendarWithISODefault(relativeTo);
      const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year']);
      const fields = ES.ToTemporalDateTimeFields(relativeTo, fieldNames);
      const dateOptions = ObjectCreate(null);
      dateOptions.overflow = 'constrain';
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond
      } = ES.InterpretTemporalDateTimeFields(calendar, fields, dateOptions));
      offset = relativeTo.offset;
      timeZone = relativeTo.timeZone;
    } else {
      let ianaName;
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        calendar,
        ianaName,
        offset
      } = ES.ParseISODateTime(ES.ToString(relativeTo), { zoneRequired: false }));
      if (ianaName) timeZone = ianaName;
      if (!calendar) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);
    }
    if (timeZone) {
      timeZone = ES.ToTemporalTimeZone(timeZone);
      let offsetNs = null;
      if (offset) offsetNs = ES.ParseOffsetString(ES.ToString(offset));
      const epochNanoseconds = ES.InterpretISODateTimeOffset(
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        offsetNs,
        timeZone,
        'compatible',
        'reject'
      );
      return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
    }
    return ES.CreateTemporalDateTime(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      calendar
    );
  },
  ValidateTemporalUnitRange: (largestUnit, smallestUnit) => {
    if (ALLOWED_UNITS.indexOf(largestUnit) > ALLOWED_UNITS.indexOf(smallestUnit)) {
      throw new RangeError(`largestUnit ${largestUnit} cannot be smaller than smallestUnit ${smallestUnit}`);
    }
  },
  DefaultTemporalLargestUnit: (
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds
  ) => {
    const singular = new Map(SINGULAR_PLURAL_UNITS);
    for (const [prop, v] of ObjectEntries({
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds
    })) {
      if (v !== 0) return singular.get(prop);
    }
    return 'nanosecond';
  },
  LargerOfTwoTemporalUnits: (unit1, unit2) => {
    if (ALLOWED_UNITS.indexOf(unit1) > ALLOWED_UNITS.indexOf(unit2)) return unit2;
    return unit1;
  },
  CastIfDefined: (value, cast) => {
    if (value !== undefined) {
      return cast(value);
    }
    return value;
  },
  ToPartialRecord: (bag, fields, callerCast) => {
    if (ES.Type(bag) !== 'Object') return false;
    let any;
    for (const property of fields) {
      const value = bag[property];
      if (value !== undefined) {
        any = any || {};
        if (callerCast === undefined && BUILTIN_CASTS.has(property)) {
          any[property] = BUILTIN_CASTS.get(property)(value);
        } else if (callerCast !== undefined) {
          any[property] = callerCast(value);
        } else {
          any[property] = value;
        }
      }
    }
    return any ? any : false;
  },
  PrepareTemporalFields: (bag, fields) => {
    if (ES.Type(bag) !== 'Object') return false;
    const result = {};
    let any = false;
    for (const fieldRecord of fields) {
      const [property, defaultValue] = fieldRecord;
      let value = bag[property];
      if (value === undefined) {
        if (fieldRecord.length === 1) {
          throw new TypeError(`required property '${property}' missing or undefined`);
        }
        value = defaultValue;
      } else {
        any = true;
        if (BUILTIN_CASTS.has(property)) {
          value = BUILTIN_CASTS.get(property)(value);
        }
      }
      result[property] = value;
    }
    if (!any) {
      throw new TypeError('no supported properties found');
    }
    if ((result['era'] === undefined) !== (result['eraYear'] === undefined)) {
      throw new RangeError("properties 'era' and 'eraYear' must be provided together");
    }
    return result;
  },
  // field access in the following operations is intentionally alphabetical
  ToTemporalDateFields: (bag, fieldNames) => {
    const entries = [
      ['day', undefined],
      ['month', undefined],
      ['monthCode', undefined],
      ['year', undefined]
    ];
    // Add extra fields from the calendar at the end
    fieldNames.forEach((fieldName) => {
      if (!entries.some(([name]) => name === fieldName)) {
        entries.push([fieldName, undefined]);
      }
    });
    return ES.PrepareTemporalFields(bag, entries);
  },
  ToTemporalDateTimeFields: (bag, fieldNames) => {
    const entries = [
      ['day', undefined],
      ['hour', 0],
      ['microsecond', 0],
      ['millisecond', 0],
      ['minute', 0],
      ['month', undefined],
      ['monthCode', undefined],
      ['nanosecond', 0],
      ['second', 0],
      ['year', undefined]
    ];
    // Add extra fields from the calendar at the end
    fieldNames.forEach((fieldName) => {
      if (!entries.some(([name]) => name === fieldName)) {
        entries.push([fieldName, undefined]);
      }
    });
    return ES.PrepareTemporalFields(bag, entries);
  },
  ToTemporalMonthDayFields: (bag, fieldNames) => {
    const entries = [
      ['day', undefined],
      ['month', undefined],
      ['monthCode', undefined],
      ['year', undefined]
    ];
    // Add extra fields from the calendar at the end
    fieldNames.forEach((fieldName) => {
      if (!entries.some(([name]) => name === fieldName)) {
        entries.push([fieldName, undefined]);
      }
    });
    return ES.PrepareTemporalFields(bag, entries);
  },
  ToTemporalTimeRecord: (bag) => {
    return ES.PrepareTemporalFields(bag, [
      ['hour', 0],
      ['microsecond', 0],
      ['millisecond', 0],
      ['minute', 0],
      ['nanosecond', 0],
      ['second', 0]
    ]);
  },
  ToTemporalYearMonthFields: (bag, fieldNames) => {
    const entries = [
      ['month', undefined],
      ['monthCode', undefined],
      ['year', undefined]
    ];
    // Add extra fields from the calendar at the end
    fieldNames.forEach((fieldName) => {
      if (!entries.some(([name]) => name === fieldName)) {
        entries.push([fieldName, undefined]);
      }
    });
    return ES.PrepareTemporalFields(bag, entries);
  },
  ToTemporalZonedDateTimeFields: (bag, fieldNames) => {
    const entries = [
      ['day', undefined],
      ['hour', 0],
      ['microsecond', 0],
      ['millisecond', 0],
      ['minute', 0],
      ['month', undefined],
      ['monthCode', undefined],
      ['nanosecond', 0],
      ['second', 0],
      ['year', undefined],
      ['offset', undefined],
      ['timeZone']
    ];
    // Add extra fields from the calendar at the end
    fieldNames.forEach((fieldName) => {
      if (!entries.some(([name]) => name === fieldName)) {
        entries.push([fieldName, undefined]);
      }
    });
    return ES.PrepareTemporalFields(bag, entries);
  },

  ToTemporalDate: (item, options = ObjectCreate(null)) => {
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalDate(item)) return item;
      if (ES.IsTemporalZonedDateTime(item)) {
        item = ES.BuiltinTimeZoneGetPlainDateTimeFor(
          GetSlot(item, TIME_ZONE),
          GetSlot(item, INSTANT),
          GetSlot(item, CALENDAR)
        );
      }
      if (ES.IsTemporalDateTime(item)) {
        return ES.CreateTemporalDate(
          GetSlot(item, ISO_YEAR),
          GetSlot(item, ISO_MONTH),
          GetSlot(item, ISO_DAY),
          GetSlot(item, CALENDAR)
        );
      }
      const calendar = ES.GetTemporalCalendarWithISODefault(item);
      const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year']);
      const fields = ES.ToTemporalDateFields(item, fieldNames);
      return ES.DateFromFields(calendar, fields, options);
    }
    ES.ToTemporalOverflow(options); // validate and ignore
    let { year, month, day, calendar } = ES.ParseTemporalDateString(ES.ToString(item));
    const TemporalPlainDate = GetIntrinsic('%Temporal.PlainDate%');
    return new TemporalPlainDate(year, month, day, calendar); // include validation
  },
  InterpretTemporalDateTimeFields: (calendar, fields, options) => {
    let { hour, minute, second, millisecond, microsecond, nanosecond } = ES.ToTemporalTimeRecord(fields);
    const date = ES.DateFromFields(calendar, fields, options);
    const year = GetSlot(date, ISO_YEAR);
    const month = GetSlot(date, ISO_MONTH);
    const day = GetSlot(date, ISO_DAY);
    const overflow = ES.ToTemporalOverflow(options);
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RegulateTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      overflow
    ));
    return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  ToTemporalDateTime: (item, options = ObjectCreate(null)) => {
    let year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, calendar;
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalDateTime(item)) return item;
      if (ES.IsTemporalZonedDateTime(item)) {
        return ES.BuiltinTimeZoneGetPlainDateTimeFor(
          GetSlot(item, TIME_ZONE),
          GetSlot(item, INSTANT),
          GetSlot(item, CALENDAR)
        );
      }
      if (ES.IsTemporalDate(item)) {
        return ES.CreateTemporalDateTime(
          GetSlot(item, ISO_YEAR),
          GetSlot(item, ISO_MONTH),
          GetSlot(item, ISO_DAY),
          0,
          0,
          0,
          0,
          0,
          0,
          GetSlot(item, CALENDAR)
        );
      }

      calendar = ES.GetTemporalCalendarWithISODefault(item);
      const fieldNames = ES.CalendarFields(calendar, [
        'day',
        'hour',
        'microsecond',
        'millisecond',
        'minute',
        'month',
        'monthCode',
        'nanosecond',
        'second',
        'year'
      ]);
      const fields = ES.ToTemporalDateTimeFields(item, fieldNames);
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond
      } = ES.InterpretTemporalDateTimeFields(calendar, fields, options));
    } else {
      ES.ToTemporalOverflow(options); // validate and ignore
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        calendar
      } = ES.ParseTemporalDateTimeString(ES.ToString(item)));
      ES.RejectDateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
      if (calendar === undefined) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);
    }
    return ES.CreateTemporalDateTime(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      calendar
    );
  },
  ToTemporalDuration: (item) => {
    let years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalDuration(item)) return item;
      ({
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds
      } = ES.ToTemporalDurationRecord(item));
    } else {
      ({
        years,
        months,
        weeks,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds
      } = ES.ParseTemporalDurationString(ES.ToString(item)));
    }
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
    return new TemporalDuration(
      years,
      months,
      weeks,
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds
    );
  },
  ToTemporalInstant: (item) => {
    if (ES.IsTemporalInstant(item)) return item;
    if (ES.IsTemporalZonedDateTime(item)) {
      const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
      return new TemporalInstant(GetSlot(item, EPOCHNANOSECONDS));
    }
    const ns = ES.ParseTemporalInstant(ES.ToString(item));
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    return new TemporalInstant(ns);
  },
  ToTemporalMonthDay: (item, options = ObjectCreate(null)) => {
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalMonthDay(item)) return item;
      let calendar, calendarAbsent;
      if (HasSlot(item, CALENDAR)) {
        calendar = GetSlot(item, CALENDAR);
        calendarAbsent = false;
      } else {
        calendar = item.calendar;
        calendarAbsent = calendar === undefined;
        if (calendar === undefined) calendar = ES.GetISO8601Calendar();
        calendar = ES.ToTemporalCalendar(calendar);
      }
      const fieldNames = ES.CalendarFields(calendar, ['day', 'month', 'monthCode', 'year']);
      const fields = ES.ToTemporalMonthDayFields(item, fieldNames);
      // Callers who omit the calendar are not writing calendar-independent
      // code. In that case, `monthCode`/`year` can be omitted; `month` and
      // `day` are sufficient. Add a `year` to satisfy calendar validation.
      if (calendarAbsent && fields.month !== undefined && fields.monthCode === undefined && fields.year === undefined) {
        fields.year = 1972;
      }
      return ES.MonthDayFromFields(calendar, fields, options);
    }

    ES.ToTemporalOverflow(options); // validate and ignore
    let { month, day, referenceISOYear, calendar } = ES.ParseTemporalMonthDayString(ES.ToString(item));
    if (calendar === undefined) calendar = ES.GetISO8601Calendar();
    calendar = ES.ToTemporalCalendar(calendar);

    if (referenceISOYear === undefined) {
      ES.RejectISODate(1972, month, day);
      return ES.CreateTemporalMonthDay(month, day, calendar);
    }
    const result = ES.CreateTemporalMonthDay(month, day, calendar, referenceISOYear);
    const canonicalOptions = ObjectCreate(null);
    return ES.MonthDayFromFields(calendar, result, canonicalOptions);
  },
  ToTemporalTime: (item, overflow = 'constrain') => {
    let hour, minute, second, millisecond, microsecond, nanosecond, calendar;
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalTime(item)) return item;
      if (ES.IsTemporalZonedDateTime(item)) {
        item = ES.BuiltinTimeZoneGetPlainDateTimeFor(
          GetSlot(item, TIME_ZONE),
          GetSlot(item, INSTANT),
          GetSlot(item, CALENDAR)
        );
      }
      if (ES.IsTemporalDateTime(item)) {
        const TemporalPlainTime = GetIntrinsic('%Temporal.PlainTime%');
        return new TemporalPlainTime(
          GetSlot(item, ISO_HOUR),
          GetSlot(item, ISO_MINUTE),
          GetSlot(item, ISO_SECOND),
          GetSlot(item, ISO_MILLISECOND),
          GetSlot(item, ISO_MICROSECOND),
          GetSlot(item, ISO_NANOSECOND)
        );
      }
      calendar = ES.GetTemporalCalendarWithISODefault(item);
      if (ES.ToString(calendar) !== 'iso8601') {
        throw new RangeError('PlainTime can only have iso8601 calendar');
      }
      ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.ToTemporalTimeRecord(item));
      ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.RegulateTime(
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        overflow
      ));
    } else {
      ({ hour, minute, second, millisecond, microsecond, nanosecond, calendar } = ES.ParseTemporalTimeString(
        ES.ToString(item)
      ));
      ES.RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
      if (calendar !== undefined && calendar !== 'iso8601') {
        throw new RangeError('PlainTime can only have iso8601 calendar');
      }
    }
    const TemporalPlainTime = GetIntrinsic('%Temporal.PlainTime%');
    return new TemporalPlainTime(hour, minute, second, millisecond, microsecond, nanosecond);
  },
  ToTemporalYearMonth: (item, options = ObjectCreate(null)) => {
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalYearMonth(item)) return item;
      const calendar = ES.GetTemporalCalendarWithISODefault(item);
      const fieldNames = ES.CalendarFields(calendar, ['month', 'monthCode', 'year']);
      const fields = ES.ToTemporalYearMonthFields(item, fieldNames);
      return ES.YearMonthFromFields(calendar, fields, options);
    }

    ES.ToTemporalOverflow(options); // validate and ignore
    let { year, month, referenceISODay, calendar } = ES.ParseTemporalYearMonthString(ES.ToString(item));
    if (calendar === undefined) calendar = ES.GetISO8601Calendar();
    calendar = ES.ToTemporalCalendar(calendar);

    if (referenceISODay === undefined) {
      ES.RejectISODate(year, month, 1);
      return ES.CreateTemporalYearMonth(year, month, calendar);
    }
    const result = ES.CreateTemporalYearMonth(year, month, calendar, referenceISODay);
    const canonicalOptions = ObjectCreate(null);
    return ES.YearMonthFromFields(calendar, result, canonicalOptions);
  },
  InterpretISODateTimeOffset: (
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    offsetNs,
    timeZone,
    disambiguation,
    offsetOpt
  ) => {
    const DateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    const dt = new DateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);

    if (offsetNs === null || offsetOpt === 'ignore') {
      // Simple case: ISO string without a TZ offset (or caller wants to ignore
      // the offset), so just convert DateTime to Instant in the given time zone
      const instant = ES.BuiltinTimeZoneGetInstantFor(timeZone, dt, disambiguation);
      return GetSlot(instant, EPOCHNANOSECONDS);
    }

    // The caller wants the offset to always win ('use') OR the caller is OK
    // with the offset winning ('prefer' or 'reject') as long as it's valid
    // for this timezone and date/time.
    if (offsetOpt === 'use') {
      // Calculate the instant for the input's date/time and offset
      const epochNs = ES.GetEpochFromISOParts(
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond
      );
      if (epochNs === null) throw new RangeError('ZonedDateTime outside of supported range');
      return epochNs.minus(offsetNs);
    }

    // "prefer" or "reject"
    const possibleInstants = ES.GetPossibleInstantsFor(timeZone, dt);
    for (const candidate of possibleInstants) {
      const candidateOffset = ES.GetOffsetNanosecondsFor(timeZone, candidate);
      if (candidateOffset === offsetNs) return GetSlot(candidate, EPOCHNANOSECONDS);
    }

    // the user-provided offset doesn't match any instants for this time
    // zone and date/time.
    if (offsetOpt === 'reject') {
      const offsetStr = ES.FormatTimeZoneOffsetString(offsetNs);
      const timeZoneString = ES.IsTemporalTimeZone(timeZone) ? GetSlot(timeZone, TIMEZONE_ID) : 'time zone';
      throw new RangeError(`Offset ${offsetStr} is invalid for ${dt} in ${timeZoneString}`);
    }
    // fall through: offsetOpt === 'prefer', but the offset doesn't match
    // so fall back to use the time zone instead.
    const instant = ES.BuiltinTimeZoneGetInstantFor(timeZone, dt, disambiguation);
    return GetSlot(instant, EPOCHNANOSECONDS);
  },
  ToTemporalZonedDateTime: (item, options = ObjectCreate(null)) => {
    let year, month, day, hour, minute, second, millisecond, microsecond, nanosecond, timeZone, offset, calendar;
    if (ES.Type(item) === 'Object') {
      if (ES.IsTemporalZonedDateTime(item)) return item;
      calendar = ES.GetTemporalCalendarWithISODefault(item);
      const fieldNames = ES.CalendarFields(calendar, [
        'day',
        'hour',
        'microsecond',
        'millisecond',
        'minute',
        'month',
        'monthCode',
        'nanosecond',
        'second',
        'year'
      ]);
      const fields = ES.ToTemporalZonedDateTimeFields(item, fieldNames);
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond
      } = ES.InterpretTemporalDateTimeFields(calendar, fields, options));
      timeZone = ES.ToTemporalTimeZone(fields.timeZone);
      offset = fields.offset;
      if (offset !== undefined) offset = ES.ToString(offset);
    } else {
      ES.ToTemporalOverflow(options); // validate and ignore
      let ianaName;
      ({
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        ianaName,
        offset,
        calendar
      } = ES.ParseTemporalZonedDateTimeString(ES.ToString(item)));
      if (!ianaName) throw new RangeError('time zone ID required in brackets');
      const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
      timeZone = new TemporalTimeZone(ianaName);
      if (!calendar) calendar = ES.GetISO8601Calendar();
      calendar = ES.ToTemporalCalendar(calendar);
    }
    let offsetNs = null;
    if (offset) offsetNs = ES.ParseOffsetString(offset);
    const disambiguation = ES.ToTemporalDisambiguation(options);
    const offsetOpt = ES.ToTemporalOffset(options, 'reject');
    const epochNanoseconds = ES.InterpretISODateTimeOffset(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      offsetNs,
      timeZone,
      disambiguation,
      offsetOpt
    );
    return ES.CreateTemporalZonedDateTime(epochNanoseconds, timeZone, calendar);
  },

  CreateTemporalDateSlots: (result, isoYear, isoMonth, isoDay, calendar) => {
    ES.RejectISODate(isoYear, isoMonth, isoDay);
    ES.RejectDateRange(isoYear, isoMonth, isoDay);

    CreateSlots(result);
    SetSlot(result, ISO_YEAR, isoYear);
    SetSlot(result, ISO_MONTH, isoMonth);
    SetSlot(result, ISO_DAY, isoDay);
    SetSlot(result, CALENDAR, calendar);
    SetSlot(result, DATE_BRAND, true);

    if (typeof __debug__ !== 'undefined' && __debug__) {
      ObjectDefineProperty(result, '_repr_', {
        value: `${result[Symbol.toStringTag]} <${ES.TemporalDateToString(result)}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  },
  CreateTemporalDate: (isoYear, isoMonth, isoDay, calendar = ES.GetISO8601Calendar()) => {
    const TemporalPlainDate = GetIntrinsic('%Temporal.PlainDate%');
    const result = ObjectCreate(TemporalPlainDate.prototype);
    ES.CreateTemporalDateSlots(result, isoYear, isoMonth, isoDay, calendar);
    return result;
  },
  CreateTemporalDateTimeSlots: (result, isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns, calendar) => {
    ES.RejectDateTime(isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns);
    ES.RejectDateTimeRange(isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns);

    CreateSlots(result);
    SetSlot(result, ISO_YEAR, isoYear);
    SetSlot(result, ISO_MONTH, isoMonth);
    SetSlot(result, ISO_DAY, isoDay);
    SetSlot(result, ISO_HOUR, h);
    SetSlot(result, ISO_MINUTE, min);
    SetSlot(result, ISO_SECOND, s);
    SetSlot(result, ISO_MILLISECOND, ms);
    SetSlot(result, ISO_MICROSECOND, µs);
    SetSlot(result, ISO_NANOSECOND, ns);
    SetSlot(result, CALENDAR, calendar);

    if (typeof __debug__ !== 'undefined' && __debug__) {
      Object.defineProperty(result, '_repr_', {
        value: `${result[Symbol.toStringTag]} <${ES.TemporalDateTimeToString(result, 'auto')}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  },
  CreateTemporalDateTime: (isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns, calendar = ES.GetISO8601Calendar()) => {
    const TemporalPlainDateTime = GetIntrinsic('%Temporal.PlainDateTime%');
    const result = ObjectCreate(TemporalPlainDateTime.prototype);
    ES.CreateTemporalDateTimeSlots(result, isoYear, isoMonth, isoDay, h, min, s, ms, µs, ns, calendar);
    return result;
  },
  CreateTemporalMonthDaySlots: (result, isoMonth, isoDay, calendar, referenceISOYear) => {
    ES.RejectISODate(referenceISOYear, isoMonth, isoDay);
    ES.RejectDateRange(referenceISOYear, isoMonth, isoDay);

    CreateSlots(result);
    SetSlot(result, ISO_MONTH, isoMonth);
    SetSlot(result, ISO_DAY, isoDay);
    SetSlot(result, ISO_YEAR, referenceISOYear);
    SetSlot(result, CALENDAR, calendar);
    SetSlot(result, MONTH_DAY_BRAND, true);

    if (typeof __debug__ !== 'undefined' && __debug__) {
      Object.defineProperty(result, '_repr_', {
        value: `${result[Symbol.toStringTag]} <${ES.TemporalMonthDayToString(result)}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  },
  CreateTemporalMonthDay: (isoMonth, isoDay, calendar = ES.GetISO8601Calendar(), referenceISOYear = 1972) => {
    const TemporalPlainMonthDay = GetIntrinsic('%Temporal.PlainMonthDay%');
    const result = ObjectCreate(TemporalPlainMonthDay.prototype);
    ES.CreateTemporalMonthDaySlots(result, isoMonth, isoDay, calendar, referenceISOYear);
    return result;
  },
  CreateTemporalYearMonthSlots: (result, isoYear, isoMonth, calendar, referenceISODay) => {
    ES.RejectISODate(isoYear, isoMonth, referenceISODay);
    ES.RejectYearMonthRange(isoYear, isoMonth);

    CreateSlots(result);
    SetSlot(result, ISO_YEAR, isoYear);
    SetSlot(result, ISO_MONTH, isoMonth);
    SetSlot(result, ISO_DAY, referenceISODay);
    SetSlot(result, CALENDAR, calendar);
    SetSlot(result, YEAR_MONTH_BRAND, true);

    if (typeof __debug__ !== 'undefined' && __debug__) {
      Object.defineProperty(result, '_repr_', {
        value: `${result[Symbol.toStringTag]} <${ES.TemporalYearMonthToString(result)}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  },
  CreateTemporalYearMonth: (isoYear, isoMonth, calendar = ES.GetISO8601Calendar(), referenceISODay = 1) => {
    const TemporalPlainYearMonth = GetIntrinsic('%Temporal.PlainYearMonth%');
    const result = ObjectCreate(TemporalPlainYearMonth.prototype);
    ES.CreateTemporalYearMonthSlots(result, isoYear, isoMonth, calendar, referenceISODay);
    return result;
  },
  CreateTemporalZonedDateTimeSlots: (result, epochNanoseconds, timeZone, calendar) => {
    ES.ValidateEpochNanoseconds(epochNanoseconds);

    CreateSlots(result);
    SetSlot(result, EPOCHNANOSECONDS, epochNanoseconds);
    SetSlot(result, TIME_ZONE, timeZone);
    SetSlot(result, CALENDAR, calendar);

    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    const instant = new TemporalInstant(GetSlot(result, EPOCHNANOSECONDS));
    SetSlot(result, INSTANT, instant);

    if (typeof __debug__ !== 'undefined' && __debug__) {
      Object.defineProperty(result, '_repr_', {
        value: `${result[Symbol.toStringTag]} <${ES.TemporalZonedDateTimeToString(result, 'auto')}>`,
        writable: false,
        enumerable: false,
        configurable: false
      });
    }
  },
  CreateTemporalZonedDateTime: (epochNanoseconds, timeZone, calendar = ES.GetISO8601Calendar()) => {
    const TemporalZonedDateTime = GetIntrinsic('%Temporal.ZonedDateTime%');
    const result = ObjectCreate(TemporalZonedDateTime.prototype);
    ES.CreateTemporalZonedDateTimeSlots(result, epochNanoseconds, timeZone, calendar);
    return result;
  },

  GetISO8601Calendar: () => {
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    return new TemporalCalendar('iso8601');
  },
  CalendarFields: (calendar, fieldNames) => {
    const fields = ES.GetMethod(calendar, 'fields');
    if (fields !== undefined) fieldNames = ES.Call(fields, calendar, [fieldNames]);
    const result = [];
    for (const name of fieldNames) {
      if (ES.Type(name) !== 'String') throw new TypeError('bad return from calendar.fields()');
      ArrayPrototypePush.call(result, name);
    }
    return result;
  },
  CalendarMergeFields: (calendar, fields, additionalFields) => {
    const mergeFields = ES.GetMethod(calendar, 'mergeFields');
    if (mergeFields === undefined) return { ...fields, ...additionalFields };
    return ES.Call(mergeFields, calendar, [fields, additionalFields]);
  },
  CalendarDateAdd: (calendar, date, duration, options, dateAdd) => {
    if (dateAdd === undefined) {
      dateAdd = ES.GetMethod(calendar, 'dateAdd');
    }
    const result = ES.Call(dateAdd, calendar, [date, duration, options]);
    if (!ES.IsTemporalDate(result)) throw new TypeError('invalid result');
    return result;
  },
  CalendarDateUntil: (calendar, date, otherDate, options, dateUntil) => {
    if (dateUntil === undefined) {
      dateUntil = ES.GetMethod(calendar, 'dateUntil');
    }
    const result = ES.Call(dateUntil, calendar, [date, otherDate, options]);
    if (!ES.IsTemporalDuration(result)) throw new TypeError('invalid result');
    return result;
  },
  CalendarYear: (calendar, dateLike) => {
    const year = ES.GetMethod(calendar, 'year');
    const result = ES.Call(year, calendar, [dateLike]);
    if (result === undefined) {
      throw new RangeError('calendar year result must be an integer');
    }
    return ES.ToInteger(result);
  },
  CalendarMonth: (calendar, dateLike) => {
    const month = ES.GetMethod(calendar, 'month');
    const result = ES.Call(month, calendar, [dateLike]);
    if (result === undefined) {
      throw new RangeError('calendar month result must be a positive integer');
    }
    return ES.ToPositiveInteger(result);
  },
  CalendarMonthCode: (calendar, dateLike) => {
    const monthCode = ES.GetMethod(calendar, 'monthCode');
    const result = ES.Call(monthCode, calendar, [dateLike]);
    if (result === undefined) {
      throw new RangeError('calendar monthCode result must be a string');
    }
    return ES.ToString(result);
  },
  CalendarDay: (calendar, dateLike) => {
    const day = ES.GetMethod(calendar, 'day');
    const result = ES.Call(day, calendar, [dateLike]);
    if (result === undefined) {
      throw new RangeError('calendar day result must be a positive integer');
    }
    return ES.ToPositiveInteger(result);
  },
  CalendarEra: (calendar, dateLike) => {
    const era = ES.GetMethod(calendar, 'era');
    let result = ES.Call(era, calendar, [dateLike]);
    if (result !== undefined) {
      result = ES.ToString(result);
    }
    return result;
  },
  CalendarEraYear: (calendar, dateLike) => {
    const eraYear = ES.GetMethod(calendar, 'eraYear');
    let result = ES.Call(eraYear, calendar, [dateLike]);
    if (result !== undefined) {
      result = ES.ToInteger(result);
    }
    return result;
  },
  CalendarDayOfWeek: (calendar, dateLike) => {
    const dayOfWeek = ES.GetMethod(calendar, 'dayOfWeek');
    return ES.Call(dayOfWeek, calendar, [dateLike]);
  },
  CalendarDayOfYear: (calendar, dateLike) => {
    const dayOfYear = ES.GetMethod(calendar, 'dayOfYear');
    return ES.Call(dayOfYear, calendar, [dateLike]);
  },
  CalendarWeekOfYear: (calendar, dateLike) => {
    const weekOfYear = ES.GetMethod(calendar, 'weekOfYear');
    return ES.Call(weekOfYear, calendar, [dateLike]);
  },
  CalendarDaysInWeek: (calendar, dateLike) => {
    const daysInWeek = ES.GetMethod(calendar, 'daysInWeek');
    return ES.Call(daysInWeek, calendar, [dateLike]);
  },
  CalendarDaysInMonth: (calendar, dateLike) => {
    const daysInMonth = ES.GetMethod(calendar, 'daysInMonth');
    return ES.Call(daysInMonth, calendar, [dateLike]);
  },
  CalendarDaysInYear: (calendar, dateLike) => {
    const daysInYear = ES.GetMethod(calendar, 'daysInYear');
    return ES.Call(daysInYear, calendar, [dateLike]);
  },
  CalendarMonthsInYear: (calendar, dateLike) => {
    const monthsInYear = ES.GetMethod(calendar, 'monthsInYear');
    return ES.Call(monthsInYear, calendar, [dateLike]);
  },
  CalendarInLeapYear: (calendar, dateLike) => {
    const inLeapYear = ES.GetMethod(calendar, 'inLeapYear');
    return ES.Call(inLeapYear, calendar, [dateLike]);
  },

  ToTemporalCalendar: (calendarLike) => {
    if (ES.Type(calendarLike) === 'Object') {
      if (HasSlot(calendarLike, CALENDAR)) return GetSlot(calendarLike, CALENDAR);
      if (!('calendar' in calendarLike)) return calendarLike;
      calendarLike = calendarLike.calendar;
      if (ES.Type(calendarLike) === 'Object' && !('calendar' in calendarLike)) return calendarLike;
    }
    const identifier = ES.ToString(calendarLike);
    const TemporalCalendar = GetIntrinsic('%Temporal.Calendar%');
    if (IsBuiltinCalendar(identifier)) return new TemporalCalendar(identifier);
    let calendar;
    try {
      ({ calendar } = ES.ParseISODateTime(identifier, { zoneRequired: false }));
    } catch {
      throw new RangeError(`Invalid calendar: ${identifier}`);
    }
    if (!calendar) calendar = 'iso8601';
    return new TemporalCalendar(calendar);
  },
  GetTemporalCalendarWithISODefault: (item) => {
    if (HasSlot(item, CALENDAR)) return GetSlot(item, CALENDAR);
    const { calendar } = item;
    if (calendar === undefined) return ES.GetISO8601Calendar();
    return ES.ToTemporalCalendar(calendar);
  },
  CalendarCompare: (one, two) => {
    const cal1 = ES.ToString(one);
    const cal2 = ES.ToString(two);
    return cal1 < cal2 ? -1 : cal1 > cal2 ? 1 : 0;
  },
  CalendarEquals: (one, two) => {
    if (one === two) return true;
    const cal1 = ES.ToString(one);
    const cal2 = ES.ToString(two);
    return cal1 === cal2;
  },
  ConsolidateCalendars: (one, two) => {
    if (one === two) return two;
    const sOne = ES.ToString(one);
    const sTwo = ES.ToString(two);
    if (sOne === sTwo || sOne === 'iso8601') {
      return two;
    } else if (sTwo === 'iso8601') {
      return one;
    } else {
      throw new RangeError('irreconcilable calendars');
    }
  },
  DateFromFields: (calendar, fields, options) => {
    const dateFromFields = ES.GetMethod(calendar, 'dateFromFields');
    const result = ES.Call(dateFromFields, calendar, [fields, options]);
    if (!ES.IsTemporalDate(result)) throw new TypeError('invalid result');
    return result;
  },
  YearMonthFromFields: (calendar, fields, options) => {
    const yearMonthFromFields = ES.GetMethod(calendar, 'yearMonthFromFields');
    const result = ES.Call(yearMonthFromFields, calendar, [fields, options]);
    if (!ES.IsTemporalYearMonth(result)) throw new TypeError('invalid result');
    return result;
  },
  MonthDayFromFields: (calendar, fields, options) => {
    const monthDayFromFields = ES.GetMethod(calendar, 'monthDayFromFields');
    const result = ES.Call(monthDayFromFields, calendar, [fields, options]);
    if (!ES.IsTemporalMonthDay(result)) throw new TypeError('invalid result');
    return result;
  },

  ToTemporalTimeZone: (temporalTimeZoneLike) => {
    if (ES.Type(temporalTimeZoneLike) === 'Object') {
      if (ES.IsTemporalZonedDateTime(temporalTimeZoneLike)) return GetSlot(temporalTimeZoneLike, TIME_ZONE);
      if (!('timeZone' in temporalTimeZoneLike)) return temporalTimeZoneLike;
      temporalTimeZoneLike = temporalTimeZoneLike.timeZone;
      if (ES.Type(temporalTimeZoneLike) === 'Object' && !('timeZone' in temporalTimeZoneLike)) {
        return temporalTimeZoneLike;
      }
    }
    const identifier = ES.ToString(temporalTimeZoneLike);
    const timeZone = ES.TemporalTimeZoneFromString(identifier);
    const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
    return new TemporalTimeZone(timeZone);
  },
  TimeZoneEquals: (one, two) => {
    if (one === two) return true;
    const tz1 = ES.ToString(one);
    const tz2 = ES.ToString(two);
    return tz1 === tz2;
  },
  TemporalDateTimeToDate: (dateTime) => {
    return ES.CreateTemporalDate(
      GetSlot(dateTime, ISO_YEAR),
      GetSlot(dateTime, ISO_MONTH),
      GetSlot(dateTime, ISO_DAY),
      GetSlot(dateTime, CALENDAR)
    );
  },
  TemporalDateTimeToTime: (dateTime) => {
    const Time = GetIntrinsic('%Temporal.PlainTime%');
    return new Time(
      GetSlot(dateTime, ISO_HOUR),
      GetSlot(dateTime, ISO_MINUTE),
      GetSlot(dateTime, ISO_SECOND),
      GetSlot(dateTime, ISO_MILLISECOND),
      GetSlot(dateTime, ISO_MICROSECOND),
      GetSlot(dateTime, ISO_NANOSECOND)
    );
  },
  GetOffsetNanosecondsFor: (timeZone, instant) => {
    let getOffsetNanosecondsFor = ES.GetMethod(timeZone, 'getOffsetNanosecondsFor');
    if (getOffsetNanosecondsFor === undefined) {
      getOffsetNanosecondsFor = GetIntrinsic('%Temporal.TimeZone.prototype.getOffsetNanosecondsFor%');
    }
    const offsetNs = ES.Call(getOffsetNanosecondsFor, timeZone, [instant]);
    if (typeof offsetNs !== 'number') {
      throw new TypeError('bad return from getOffsetNanosecondsFor');
    }
    if (!ES.IsInteger(offsetNs) || MathAbs(offsetNs) > 86400e9) {
      throw new RangeError('out-of-range return from getOffsetNanosecondsFor');
    }
    return offsetNs;
  },
  BuiltinTimeZoneGetOffsetStringFor: (timeZone, instant) => {
    const offsetNs = ES.GetOffsetNanosecondsFor(timeZone, instant);
    return ES.FormatTimeZoneOffsetString(offsetNs);
  },
  BuiltinTimeZoneGetPlainDateTimeFor: (timeZone, instant, calendar) => {
    const ns = GetSlot(instant, EPOCHNANOSECONDS);
    const offsetNs = ES.GetOffsetNanosecondsFor(timeZone, instant);
    let { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.GetISOPartsFromEpoch(ns);
    ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.BalanceISODateTime(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond + offsetNs
    ));
    return ES.CreateTemporalDateTime(
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      calendar
    );
  },
  BuiltinTimeZoneGetInstantFor: (timeZone, dateTime, disambiguation) => {
    const Instant = GetIntrinsic('%Temporal.Instant%');
    const possibleInstants = ES.GetPossibleInstantsFor(timeZone, dateTime);
    const numInstants = possibleInstants.length;

    if (numInstants === 1) return possibleInstants[0];
    if (numInstants) {
      switch (disambiguation) {
        case 'compatible':
        // fall through because 'compatible' means 'earlier' for "fall back" transitions
        case 'earlier':
          return possibleInstants[0];
        case 'later':
          return possibleInstants[numInstants - 1];
        case 'reject': {
          throw new RangeError('multiple instants found');
        }
      }
    }

    const utcns = ES.GetEpochFromISOParts(
      GetSlot(dateTime, ISO_YEAR),
      GetSlot(dateTime, ISO_MONTH),
      GetSlot(dateTime, ISO_DAY),
      GetSlot(dateTime, ISO_HOUR),
      GetSlot(dateTime, ISO_MINUTE),
      GetSlot(dateTime, ISO_SECOND),
      GetSlot(dateTime, ISO_MILLISECOND),
      GetSlot(dateTime, ISO_MICROSECOND),
      GetSlot(dateTime, ISO_NANOSECOND)
    );
    if (utcns === null) throw new RangeError('DateTime outside of supported range');
    const dayBefore = new Instant(utcns.minus(86400e9));
    const dayAfter = new Instant(utcns.plus(86400e9));
    const offsetBefore = ES.GetOffsetNanosecondsFor(timeZone, dayBefore);
    const offsetAfter = ES.GetOffsetNanosecondsFor(timeZone, dayAfter);
    const nanoseconds = offsetAfter - offsetBefore;
    const diff = ES.ToTemporalDurationRecord({ nanoseconds }, 'reject');
    switch (disambiguation) {
      case 'earlier': {
        const earlier = dateTime.subtract(diff);
        return ES.GetPossibleInstantsFor(timeZone, earlier)[0];
      }
      case 'compatible':
      // fall through because 'compatible' means 'later' for "spring forward" transitions
      case 'later': {
        const later = dateTime.add(diff);
        const possible = ES.GetPossibleInstantsFor(timeZone, later);
        return possible[possible.length - 1];
      }
      case 'reject': {
        throw new RangeError('no such instant found');
      }
    }
  },
  GetPossibleInstantsFor: (timeZone, dateTime) => {
    let getPossibleInstantsFor = ES.GetMethod(timeZone, 'getPossibleInstantsFor');
    const possibleInstants = ES.Call(getPossibleInstantsFor, timeZone, [dateTime]);
    const result = [];
    for (const instant of possibleInstants) {
      if (!ES.IsTemporalInstant(instant)) {
        throw new TypeError('bad return from getPossibleInstantsFor');
      }
      ArrayPrototypePush.call(result, instant);
    }
    return result;
  },
  ISOYearString: (year) => {
    let yearString;
    if (year < 1000 || year > 9999) {
      let sign = year < 0 ? '-' : '+';
      let yearNumber = MathAbs(year);
      yearString = sign + `000000${yearNumber}`.slice(-6);
    } else {
      yearString = `${year}`;
    }
    return yearString;
  },
  ISODateTimePartString: (part) => `00${part}`.slice(-2),
  FormatSecondsStringPart: (second, millisecond, microsecond, nanosecond, precision) => {
    if (precision === 'minute') return '';

    const secs = `:${ES.ISODateTimePartString(second)}`;
    let fraction = millisecond * 1e6 + microsecond * 1e3 + nanosecond;

    if (precision === 'auto') {
      if (fraction === 0) return secs;
      fraction = `${fraction}`.padStart(9, '0');
      while (fraction[fraction.length - 1] === '0') fraction = fraction.slice(0, -1);
    } else {
      if (precision === 0) return secs;
      fraction = `${fraction}`.padStart(9, '0').slice(0, precision);
    }
    return `${secs}.${fraction}`;
  },
  TemporalInstantToString: (instant, timeZone, precision) => {
    let outputTimeZone = timeZone;
    if (outputTimeZone === undefined) {
      const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
      outputTimeZone = new TemporalTimeZone('UTC');
    }
    const iso = ES.GetISO8601Calendar();
    const dateTime = ES.BuiltinTimeZoneGetPlainDateTimeFor(outputTimeZone, instant, iso);
    const year = ES.ISOYearString(GetSlot(dateTime, ISO_YEAR));
    const month = ES.ISODateTimePartString(GetSlot(dateTime, ISO_MONTH));
    const day = ES.ISODateTimePartString(GetSlot(dateTime, ISO_DAY));
    const hour = ES.ISODateTimePartString(GetSlot(dateTime, ISO_HOUR));
    const minute = ES.ISODateTimePartString(GetSlot(dateTime, ISO_MINUTE));
    const seconds = ES.FormatSecondsStringPart(
      GetSlot(dateTime, ISO_SECOND),
      GetSlot(dateTime, ISO_MILLISECOND),
      GetSlot(dateTime, ISO_MICROSECOND),
      GetSlot(dateTime, ISO_NANOSECOND),
      precision
    );
    let timeZoneString = 'Z';
    if (timeZone !== undefined) timeZoneString = ES.BuiltinTimeZoneGetOffsetStringFor(outputTimeZone, instant);
    return `${year}-${month}-${day}T${hour}:${minute}${seconds}${timeZoneString}`;
  },
  TemporalDurationToString: (duration, precision = 'auto', options = undefined) => {
    function formatNumber(num) {
      if (num <= NumberMaxSafeInteger) return num.toString(10);
      return bigInt(num).toString();
    }

    const years = GetSlot(duration, YEARS);
    const months = GetSlot(duration, MONTHS);
    const weeks = GetSlot(duration, WEEKS);
    const days = GetSlot(duration, DAYS);
    const hours = GetSlot(duration, HOURS);
    const minutes = GetSlot(duration, MINUTES);
    let seconds = GetSlot(duration, SECONDS);
    let ms = GetSlot(duration, MILLISECONDS);
    let µs = GetSlot(duration, MICROSECONDS);
    let ns = GetSlot(duration, NANOSECONDS);
    const sign = ES.DurationSign(years, months, weeks, days, hours, minutes, seconds, ms, µs, ns);

    if (options) {
      const { unit, increment, roundingMode } = options;
      ({ seconds, milliseconds: ms, microseconds: µs, nanoseconds: ns } = ES.RoundDuration(
        0,
        0,
        0,
        0,
        0,
        0,
        seconds,
        ms,
        µs,
        ns,
        increment,
        unit,
        roundingMode
      ));
    }

    const dateParts = [];
    if (years) dateParts.push(`${formatNumber(MathAbs(years))}Y`);
    if (months) dateParts.push(`${formatNumber(MathAbs(months))}M`);
    if (weeks) dateParts.push(`${formatNumber(MathAbs(weeks))}W`);
    if (days) dateParts.push(`${formatNumber(MathAbs(days))}D`);

    const timeParts = [];
    if (hours) timeParts.push(`${formatNumber(MathAbs(hours))}H`);
    if (minutes) timeParts.push(`${formatNumber(MathAbs(minutes))}M`);

    const secondParts = [];
    let total = ES.TotalDurationNanoseconds(0, 0, 0, seconds, ms, µs, ns, 0);
    ({ quotient: total, remainder: ns } = total.divmod(1000));
    ({ quotient: total, remainder: µs } = total.divmod(1000));
    ({ quotient: seconds, remainder: ms } = total.divmod(1000));
    let fraction = MathAbs(ms.toJSNumber()) * 1e6 + MathAbs(µs.toJSNumber()) * 1e3 + MathAbs(ns.toJSNumber());
    let decimalPart;
    if (precision === 'auto') {
      if (fraction !== 0) {
        decimalPart = `${fraction}`.padStart(9, '0');
        while (decimalPart[decimalPart.length - 1] === '0') {
          decimalPart = decimalPart.slice(0, -1);
        }
      }
    } else if (precision !== 0) {
      decimalPart = `${fraction}`.padStart(9, '0').slice(0, precision);
    }
    if (decimalPart) secondParts.unshift('.', decimalPart);
    if (!seconds.isZero() || secondParts.length) secondParts.unshift(seconds.abs().toString());
    if (secondParts.length) timeParts.push(`${secondParts.join('')}S`);
    if (timeParts.length) timeParts.unshift('T');
    if (!dateParts.length && !timeParts.length) return 'PT0S';
    return `${sign < 0 ? '-' : ''}P${dateParts.join('')}${timeParts.join('')}`;
  },
  TemporalDateToString: (date, showCalendar = 'auto') => {
    const year = ES.ISOYearString(GetSlot(date, ISO_YEAR));
    const month = ES.ISODateTimePartString(GetSlot(date, ISO_MONTH));
    const day = ES.ISODateTimePartString(GetSlot(date, ISO_DAY));
    const calendarID = ES.ToString(GetSlot(date, CALENDAR));
    const calendar = ES.FormatCalendarAnnotation(calendarID, showCalendar);
    return `${year}-${month}-${day}${calendar}`;
  },
  TemporalDateTimeToString: (dateTime, precision, showCalendar = 'auto', options = undefined) => {
    let year = GetSlot(dateTime, ISO_YEAR);
    let month = GetSlot(dateTime, ISO_MONTH);
    let day = GetSlot(dateTime, ISO_DAY);
    let hour = GetSlot(dateTime, ISO_HOUR);
    let minute = GetSlot(dateTime, ISO_MINUTE);
    let second = GetSlot(dateTime, ISO_SECOND);
    let millisecond = GetSlot(dateTime, ISO_MILLISECOND);
    let microsecond = GetSlot(dateTime, ISO_MICROSECOND);
    let nanosecond = GetSlot(dateTime, ISO_NANOSECOND);

    if (options) {
      const { unit, increment, roundingMode } = options;
      ({ year, month, day, hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundISODateTime(
        year,
        month,
        day,
        hour,
        minute,
        second,
        millisecond,
        microsecond,
        nanosecond,
        increment,
        unit,
        roundingMode
      ));
    }

    year = ES.ISOYearString(year);
    month = ES.ISODateTimePartString(month);
    day = ES.ISODateTimePartString(day);
    hour = ES.ISODateTimePartString(hour);
    minute = ES.ISODateTimePartString(minute);
    const seconds = ES.FormatSecondsStringPart(second, millisecond, microsecond, nanosecond, precision);
    const calendarID = ES.ToString(GetSlot(dateTime, CALENDAR));
    const calendar = ES.FormatCalendarAnnotation(calendarID, showCalendar);
    return `${year}-${month}-${day}T${hour}:${minute}${seconds}${calendar}`;
  },
  TemporalMonthDayToString: (monthDay, showCalendar = 'auto') => {
    const month = ES.ISODateTimePartString(GetSlot(monthDay, ISO_MONTH));
    const day = ES.ISODateTimePartString(GetSlot(monthDay, ISO_DAY));
    let resultString = `${month}-${day}`;
    const calendar = GetSlot(monthDay, CALENDAR);
    const calendarID = ES.ToString(calendar);
    if (calendarID !== 'iso8601') {
      const year = ES.ISOYearString(GetSlot(monthDay, ISO_YEAR));
      resultString = `${year}-${resultString}`;
    }
    const calendarString = ES.FormatCalendarAnnotation(calendarID, showCalendar);
    if (calendarString) resultString += calendarString;
    return resultString;
  },
  TemporalYearMonthToString: (yearMonth, showCalendar = 'auto') => {
    const year = ES.ISOYearString(GetSlot(yearMonth, ISO_YEAR));
    const month = ES.ISODateTimePartString(GetSlot(yearMonth, ISO_MONTH));
    let resultString = `${year}-${month}`;
    const calendar = GetSlot(yearMonth, CALENDAR);
    const calendarID = ES.ToString(calendar);
    if (calendarID !== 'iso8601') {
      const day = ES.ISODateTimePartString(GetSlot(yearMonth, ISO_DAY));
      resultString += `-${day}`;
    }
    const calendarString = ES.FormatCalendarAnnotation(calendarID, showCalendar);
    if (calendarString) resultString += calendarString;
    return resultString;
  },
  TemporalZonedDateTimeToString: (
    zdt,
    precision,
    showCalendar = 'auto',
    showTimeZone = 'auto',
    showOffset = 'auto',
    options = undefined
  ) => {
    let instant = GetSlot(zdt, INSTANT);

    if (options) {
      const { unit, increment, roundingMode } = options;
      const ns = ES.RoundInstant(GetSlot(zdt, EPOCHNANOSECONDS), increment, unit, roundingMode);
      const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
      instant = new TemporalInstant(ns);
    }

    const tz = GetSlot(zdt, TIME_ZONE);
    const iso = ES.GetISO8601Calendar();
    const dateTime = ES.BuiltinTimeZoneGetPlainDateTimeFor(tz, instant, iso);

    const year = ES.ISOYearString(GetSlot(dateTime, ISO_YEAR));
    const month = ES.ISODateTimePartString(GetSlot(dateTime, ISO_MONTH));
    const day = ES.ISODateTimePartString(GetSlot(dateTime, ISO_DAY));
    const hour = ES.ISODateTimePartString(GetSlot(dateTime, ISO_HOUR));
    const minute = ES.ISODateTimePartString(GetSlot(dateTime, ISO_MINUTE));
    const seconds = ES.FormatSecondsStringPart(
      GetSlot(dateTime, ISO_SECOND),
      GetSlot(dateTime, ISO_MILLISECOND),
      GetSlot(dateTime, ISO_MICROSECOND),
      GetSlot(dateTime, ISO_NANOSECOND),
      precision
    );
    let result = `${year}-${month}-${day}T${hour}:${minute}${seconds}`;
    if (showOffset !== 'never') result += ES.BuiltinTimeZoneGetOffsetStringFor(tz, instant);
    if (showTimeZone !== 'never') result += `[${tz}]`;
    const calendarID = ES.ToString(GetSlot(zdt, CALENDAR));
    result += ES.FormatCalendarAnnotation(calendarID, showCalendar);
    return result;
  },

  ParseOffsetString: (string) => {
    const match = OFFSET.exec(String(string));
    if (!match) return null;
    const sign = match[1] === '-' || match[1] === '\u2212' ? -1 : +1;
    const hours = +match[2];
    const minutes = +(match[3] || 0);
    const seconds = +(match[4] || 0);
    const nanoseconds = +((match[5] || 0) + '000000000').slice(0, 9);
    return sign * (((hours * 60 + minutes) * 60 + seconds) * 1e9 + nanoseconds);
  },
  GetCanonicalTimeZoneIdentifier: (timeZoneIdentifier) => {
    const offsetNs = ES.ParseOffsetString(timeZoneIdentifier);
    if (offsetNs !== null) return ES.FormatTimeZoneOffsetString(offsetNs);
    const formatter = new IntlDateTimeFormat('en-us', {
      timeZone: String(timeZoneIdentifier),
      hour12: false,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
    return formatter.resolvedOptions().timeZone;
  },
  GetIANATimeZoneOffsetNanoseconds: (epochNanoseconds, id) => {
    const {
      year,
      month,
      day,
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    } = ES.GetIANATimeZoneDateTimeParts(epochNanoseconds, id);
    const utc = ES.GetEpochFromISOParts(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
    if (utc === null) throw new RangeError('Date outside of supported range');
    return +utc.minus(epochNanoseconds);
  },
  FormatTimeZoneOffsetString: (offsetNanoseconds) => {
    const sign = offsetNanoseconds < 0 ? '-' : '+';
    offsetNanoseconds = MathAbs(offsetNanoseconds);
    const nanoseconds = offsetNanoseconds % 1e9;
    const seconds = MathFloor(offsetNanoseconds / 1e9) % 60;
    const minutes = MathFloor(offsetNanoseconds / 60e9) % 60;
    const hours = MathFloor(offsetNanoseconds / 3600e9);

    const hourString = ES.ISODateTimePartString(hours);
    const minuteString = ES.ISODateTimePartString(minutes);
    const secondString = ES.ISODateTimePartString(seconds);
    let post = '';
    if (nanoseconds) {
      let fraction = `${nanoseconds}`.padStart(9, '0');
      while (fraction[fraction.length - 1] === '0') fraction = fraction.slice(0, -1);
      post = `:${secondString}.${fraction}`;
    } else if (seconds) {
      post = `:${secondString}`;
    }
    return `${sign}${hourString}:${minuteString}${post}`;
  },
  GetEpochFromISOParts: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    // Note: Date.UTC() interprets one and two-digit years as being in the
    // 20th century, so don't use it
    const legacyDate = new Date();
    legacyDate.setUTCHours(hour, minute, second, millisecond);
    legacyDate.setUTCFullYear(year, month - 1, day);
    const ms = legacyDate.getTime();
    if (NumberIsNaN(ms)) return null;
    let ns = bigInt(ms).multiply(1e6);
    ns = ns.plus(bigInt(microsecond).multiply(1e3));
    ns = ns.plus(bigInt(nanosecond));
    if (ns.lesser(NS_MIN) || ns.greater(NS_MAX)) return null;
    return ns;
  },
  GetISOPartsFromEpoch: (epochNanoseconds) => {
    const { quotient, remainder } = bigInt(epochNanoseconds).divmod(1e6);
    let epochMilliseconds = +quotient;
    let nanos = +remainder;
    if (nanos < 0) {
      nanos += 1e6;
      epochMilliseconds -= 1;
    }
    const microsecond = MathFloor(nanos / 1e3) % 1e3;
    const nanosecond = nanos % 1e3;

    const item = new Date(epochMilliseconds);
    const year = item.getUTCFullYear();
    const month = item.getUTCMonth() + 1;
    const day = item.getUTCDate();
    const hour = item.getUTCHours();
    const minute = item.getUTCMinutes();
    const second = item.getUTCSeconds();
    const millisecond = item.getUTCMilliseconds();

    return { epochMilliseconds, year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  GetIANATimeZoneDateTimeParts: (epochNanoseconds, id) => {
    const { epochMilliseconds, millisecond, microsecond, nanosecond } = ES.GetISOPartsFromEpoch(epochNanoseconds);
    const { year, month, day, hour, minute, second } = ES.GetFormatterParts(id, epochMilliseconds);
    return ES.BalanceISODateTime(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
  },
  GetIANATimeZoneNextTransition: (epochNanoseconds, id) => {
    const uppercap = ES.SystemUTCEpochNanoSeconds() + 366 * DAYMILLIS * 1e6;
    let leftNanos = epochNanoseconds;
    let leftOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(leftNanos, id);
    let rightNanos = leftNanos;
    let rightOffsetNs = leftOffsetNs;
    while (leftOffsetNs === rightOffsetNs && bigInt(leftNanos).compare(uppercap) === -1) {
      rightNanos = bigInt(leftNanos).plus(2 * 7 * DAYMILLIS * 1e6);
      rightOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(rightNanos, id);
      if (leftOffsetNs === rightOffsetNs) {
        leftNanos = rightNanos;
      }
    }
    if (leftOffsetNs === rightOffsetNs) return null;
    const result = bisect(
      (epochNs) => ES.GetIANATimeZoneOffsetNanoseconds(epochNs, id),
      leftNanos,
      rightNanos,
      leftOffsetNs,
      rightOffsetNs
    );
    return result;
  },
  GetIANATimeZonePreviousTransition: (epochNanoseconds, id) => {
    const lowercap = BEFORE_FIRST_DST; // 1847-01-01T00:00:00Z
    let rightNanos = epochNanoseconds;
    let rightOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(rightNanos, id);
    let leftNanos = rightNanos;
    let leftOffsetNs = rightOffsetNs;
    while (rightOffsetNs === leftOffsetNs && bigInt(rightNanos).compare(lowercap) === 1) {
      leftNanos = bigInt(rightNanos).minus(2 * 7 * DAYMILLIS * 1e6);
      leftOffsetNs = ES.GetIANATimeZoneOffsetNanoseconds(leftNanos, id);
      if (rightOffsetNs === leftOffsetNs) {
        rightNanos = leftNanos;
      }
    }
    if (rightOffsetNs === leftOffsetNs) return null;
    const result = bisect(
      (epochNs) => ES.GetIANATimeZoneOffsetNanoseconds(epochNs, id),
      leftNanos,
      rightNanos,
      leftOffsetNs,
      rightOffsetNs
    );
    return result;
  },
  GetFormatterParts: (timeZone, epochMilliseconds) => {
    const formatter = new IntlDateTimeFormat('en-us', {
      timeZone,
      hour12: false,
      era: 'short',
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric'
    });
    // FIXME: can this use formatToParts instead?
    const datetime = formatter.format(new Date(epochMilliseconds));
    const [date, fullYear, time] = datetime.split(/,\s+/);
    const [month, day] = date.split(' ');
    const [year, era] = fullYear.split(' ');
    const [hour, minute, second] = time.split(':');
    return {
      year: era === 'BC' ? -year + 1 : +year,
      month: +month,
      day: +day,
      hour: hour === '24' ? 0 : +hour, // bugs.chromium.org/p/chromium/issues/detail?id=1045791
      minute: +minute,
      second: +second
    };
  },
  GetIANATimeZoneEpochValue: (id, year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    let ns = ES.GetEpochFromISOParts(year, month, day, hour, minute, second, millisecond, microsecond, nanosecond);
    if (ns === null) throw new RangeError('DateTime outside of supported range');
    const dayNanos = bigInt(DAYMILLIS).multiply(1e6);
    let nsEarlier = ns.minus(dayNanos);
    if (nsEarlier.lesser(NS_MIN)) nsEarlier = ns;
    let nsLater = ns.plus(dayNanos);
    if (nsLater.greater(NS_MAX)) nsLater = ns;
    const earliest = ES.GetIANATimeZoneOffsetNanoseconds(nsEarlier, id);
    const latest = ES.GetIANATimeZoneOffsetNanoseconds(nsLater, id);
    const found = earliest === latest ? [earliest] : [earliest, latest];
    return found
      .map((offsetNanoseconds) => {
        const epochNanoseconds = bigInt(ns).minus(offsetNanoseconds);
        const parts = ES.GetIANATimeZoneDateTimeParts(epochNanoseconds, id);
        if (
          year !== parts.year ||
          month !== parts.month ||
          day !== parts.day ||
          hour !== parts.hour ||
          minute !== parts.minute ||
          second !== parts.second ||
          millisecond !== parts.millisecond ||
          microsecond !== parts.microsecond ||
          nanosecond !== parts.nanosecond
        ) {
          return undefined;
        }
        return epochNanoseconds;
      })
      .filter((x) => x !== undefined);
  },
  LeapYear: (year) => {
    if (undefined === year) return false;
    const isDiv4 = year % 4 === 0;
    const isDiv100 = year % 100 === 0;
    const isDiv400 = year % 400 === 0;
    return isDiv4 && (!isDiv100 || isDiv400);
  },
  ISODaysInMonth: (year, month) => {
    const DoM = {
      standard: [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31],
      leapyear: [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };
    return DoM[ES.LeapYear(year) ? 'leapyear' : 'standard'][month - 1];
  },
  DayOfWeek: (year, month, day) => {
    const m = month + (month < 3 ? 10 : -2);
    const Y = year - (month < 3 ? 1 : 0);

    const c = MathFloor(Y / 100);
    const y = Y - c * 100;
    const d = day;

    const pD = d;
    const pM = MathFloor(2.6 * m - 0.2);
    const pY = y + MathFloor(y / 4);
    const pC = MathFloor(c / 4) - 2 * c;

    const dow = (pD + pM + pY + pC) % 7;

    return dow + (dow <= 0 ? 7 : 0);
  },
  DayOfYear: (year, month, day) => {
    let days = day;
    for (let m = month - 1; m > 0; m--) {
      days += ES.ISODaysInMonth(year, m);
    }
    return days;
  },
  WeekOfYear: (year, month, day) => {
    let doy = ES.DayOfYear(year, month, day);
    let dow = ES.DayOfWeek(year, month, day) || 7;
    let doj = ES.DayOfWeek(year, 1, 1);

    const week = MathFloor((doy - dow + 10) / 7);

    if (week < 1) {
      if (doj === 5 || (doj === 6 && ES.LeapYear(year - 1))) {
        return 53;
      } else {
        return 52;
      }
    }
    if (week === 53) {
      if ((ES.LeapYear(year) ? 366 : 365) - doy < 4 - dow) {
        return 1;
      }
    }

    return week;
  },
  DurationSign: (y, mon, w, d, h, min, s, ms, µs, ns) => {
    for (const prop of [y, mon, w, d, h, min, s, ms, µs, ns]) {
      if (prop !== 0) return prop < 0 ? -1 : 1;
    }
    return 0;
  },

  BalanceISOYearMonth: (year, month) => {
    if (!NumberIsFinite(year) || !NumberIsFinite(month)) throw new RangeError('infinity is out of range');
    month -= 1;
    year += MathFloor(month / 12);
    month %= 12;
    if (month < 0) month += 12;
    month += 1;
    return { year, month };
  },
  BalanceISODate: (year, month, day) => {
    if (!NumberIsFinite(day)) throw new RangeError('infinity is out of range');
    ({ year, month } = ES.BalanceISOYearMonth(year, month));
    let daysInYear = 0;
    let testYear = month > 2 ? year : year - 1;
    while (((daysInYear = ES.LeapYear(testYear) ? 366 : 365), day < -daysInYear)) {
      year -= 1;
      testYear -= 1;
      day += daysInYear;
    }
    testYear += 1;
    while (((daysInYear = ES.LeapYear(testYear) ? 366 : 365), day > daysInYear)) {
      year += 1;
      testYear += 1;
      day -= daysInYear;
    }

    while (day < 1) {
      ({ year, month } = ES.BalanceISOYearMonth(year, month - 1));
      day += ES.ISODaysInMonth(year, month);
    }
    while (day > ES.ISODaysInMonth(year, month)) {
      day -= ES.ISODaysInMonth(year, month);
      ({ year, month } = ES.BalanceISOYearMonth(year, month + 1));
    }

    return { year, month, day };
  },
  BalanceISODateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    let deltaDays;
    ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.BalanceTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    ));
    ({ year, month, day } = ES.BalanceISODate(year, month, day + deltaDays));
    return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  BalanceTime: (hour, minute, second, millisecond, microsecond, nanosecond) => {
    if (
      !NumberIsFinite(hour) ||
      !NumberIsFinite(minute) ||
      !NumberIsFinite(second) ||
      !NumberIsFinite(millisecond) ||
      !NumberIsFinite(microsecond) ||
      !NumberIsFinite(nanosecond)
    ) {
      throw new RangeError('infinity is out of range');
    }

    microsecond += MathFloor(nanosecond / 1000);
    nanosecond = ES.NonNegativeModulo(nanosecond, 1000);

    millisecond += MathFloor(microsecond / 1000);
    microsecond = ES.NonNegativeModulo(microsecond, 1000);

    second += MathFloor(millisecond / 1000);
    millisecond = ES.NonNegativeModulo(millisecond, 1000);

    minute += MathFloor(second / 60);
    second = ES.NonNegativeModulo(second, 60);

    hour += MathFloor(minute / 60);
    minute = ES.NonNegativeModulo(minute, 60);

    let deltaDays = MathFloor(hour / 24);
    hour = ES.NonNegativeModulo(hour, 24);

    return { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  TotalDurationNanoseconds: (days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, offsetShift) => {
    if (days !== 0) nanoseconds = bigInt(nanoseconds).subtract(offsetShift);
    hours = bigInt(hours).add(bigInt(days).multiply(24));
    minutes = bigInt(minutes).add(hours.multiply(60));
    seconds = bigInt(seconds).add(minutes.multiply(60));
    milliseconds = bigInt(milliseconds).add(seconds.multiply(1000));
    microseconds = bigInt(microseconds).add(milliseconds.multiply(1000));
    return bigInt(nanoseconds).add(microseconds.multiply(1000));
  },
  NanosecondsToDays: (nanoseconds, relativeTo) => {
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    const sign = MathSign(nanoseconds);
    nanoseconds = bigInt(nanoseconds);
    let dayLengthNs = 86400e9;
    if (sign === 0) return { days: 0, nanoseconds: bigInt.zero, dayLengthNs };
    if (!ES.IsTemporalZonedDateTime(relativeTo)) {
      let days;
      ({ quotient: days, remainder: nanoseconds } = nanoseconds.divmod(dayLengthNs));
      days = days.toJSNumber();
      return { days, nanoseconds, dayLengthNs };
    }

    const startNs = GetSlot(relativeTo, EPOCHNANOSECONDS);
    const start = GetSlot(relativeTo, INSTANT);
    const endNs = startNs.add(nanoseconds);
    const end = new TemporalInstant(endNs);
    const timeZone = GetSlot(relativeTo, TIME_ZONE);
    const calendar = GetSlot(relativeTo, CALENDAR);

    // Find the difference in days only.
    const dtStart = ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, start, calendar);
    const dtEnd = ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, end, calendar);
    let { days } = ES.DifferenceISODateTime(
      GetSlot(dtStart, ISO_YEAR),
      GetSlot(dtStart, ISO_MONTH),
      GetSlot(dtStart, ISO_DAY),
      GetSlot(dtStart, ISO_HOUR),
      GetSlot(dtStart, ISO_MINUTE),
      GetSlot(dtStart, ISO_SECOND),
      GetSlot(dtStart, ISO_MILLISECOND),
      GetSlot(dtStart, ISO_MICROSECOND),
      GetSlot(dtStart, ISO_NANOSECOND),
      GetSlot(dtEnd, ISO_YEAR),
      GetSlot(dtEnd, ISO_MONTH),
      GetSlot(dtEnd, ISO_DAY),
      GetSlot(dtEnd, ISO_HOUR),
      GetSlot(dtEnd, ISO_MINUTE),
      GetSlot(dtEnd, ISO_SECOND),
      GetSlot(dtEnd, ISO_MILLISECOND),
      GetSlot(dtEnd, ISO_MICROSECOND),
      GetSlot(dtEnd, ISO_NANOSECOND),
      calendar,
      'day'
    );
    let intermediateNs = ES.AddZonedDateTime(start, timeZone, calendar, 0, 0, 0, days, 0, 0, 0, 0, 0, 0);
    // may disambiguate

    // If clock time after addition was in the middle of a skipped period, the
    // endpoint was disambiguated to a later clock time. So it's possible that
    // the resulting disambiguated result is later than endNs. If so, then back
    // up one day and try again. Repeat if necessary (some transitions are
    // > 24 hours) until either there's zero days left or the date duration is
    // back inside the period where it belongs. Note that this case only can
    // happen for positive durations because the only direction that
    // `disambiguation: 'compatible'` can change clock time is forwards.
    if (sign === 1) {
      while (days > 0 && intermediateNs.greater(endNs)) {
        --days;
        intermediateNs = ES.AddZonedDateTime(start, timeZone, calendar, 0, 0, 0, days, 0, 0, 0, 0, 0, 0);
        // may do disambiguation
      }
    }
    nanoseconds = endNs.subtract(intermediateNs);

    let isOverflow = false;
    let relativeInstant = new TemporalInstant(intermediateNs);
    do {
      // calculate length of the next day (day that contains the time remainder)
      const oneDayFartherNs = ES.AddZonedDateTime(relativeInstant, timeZone, calendar, 0, 0, 0, sign, 0, 0, 0, 0, 0, 0);
      const relativeNs = GetSlot(relativeInstant, EPOCHNANOSECONDS);
      dayLengthNs = oneDayFartherNs.subtract(relativeNs).toJSNumber();
      isOverflow = nanoseconds.subtract(dayLengthNs).multiply(sign).geq(0);
      if (isOverflow) {
        nanoseconds = nanoseconds.subtract(dayLengthNs);
        relativeInstant = new TemporalInstant(oneDayFartherNs);
        days += sign;
      }
    } while (isOverflow);
    return { days, nanoseconds, dayLengthNs: MathAbs(dayLengthNs) };
  },
  BalanceDuration: (
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    largestUnit,
    relativeTo = undefined
  ) => {
    if (ES.IsTemporalZonedDateTime(relativeTo)) {
      const endNs = ES.AddZonedDateTime(
        GetSlot(relativeTo, INSTANT),
        GetSlot(relativeTo, TIME_ZONE),
        GetSlot(relativeTo, CALENDAR),
        0,
        0,
        0,
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds
      );
      const startNs = GetSlot(relativeTo, EPOCHNANOSECONDS);
      nanoseconds = endNs.subtract(startNs);
    } else {
      nanoseconds = ES.TotalDurationNanoseconds(
        days,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds,
        0
      );
    }
    if (largestUnit === 'year' || largestUnit === 'month' || largestUnit === 'week' || largestUnit === 'day') {
      ({ days, nanoseconds } = ES.NanosecondsToDays(nanoseconds, relativeTo));
    } else {
      days = 0;
    }

    const sign = nanoseconds.lesser(0) ? -1 : 1;
    nanoseconds = nanoseconds.abs();
    microseconds = milliseconds = seconds = minutes = hours = bigInt.zero;

    switch (largestUnit) {
      case 'year':
      case 'month':
      case 'week':
      case 'day':
      case 'hour':
        ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
        ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
        ({ quotient: seconds, remainder: milliseconds } = milliseconds.divmod(1000));
        ({ quotient: minutes, remainder: seconds } = seconds.divmod(60));
        ({ quotient: hours, remainder: minutes } = minutes.divmod(60));
        break;
      case 'minute':
        ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
        ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
        ({ quotient: seconds, remainder: milliseconds } = milliseconds.divmod(1000));
        ({ quotient: minutes, remainder: seconds } = seconds.divmod(60));
        break;
      case 'second':
        ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
        ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
        ({ quotient: seconds, remainder: milliseconds } = milliseconds.divmod(1000));
        break;
      case 'millisecond':
        ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
        ({ quotient: milliseconds, remainder: microseconds } = microseconds.divmod(1000));
        break;
      case 'microsecond':
        ({ quotient: microseconds, remainder: nanoseconds } = nanoseconds.divmod(1000));
        break;
      case 'nanosecond':
        break;
      default:
        throw new Error('assert not reached');
    }

    hours = hours.toJSNumber() * sign;
    minutes = minutes.toJSNumber() * sign;
    seconds = seconds.toJSNumber() * sign;
    milliseconds = milliseconds.toJSNumber() * sign;
    microseconds = microseconds.toJSNumber() * sign;
    nanoseconds = nanoseconds.toJSNumber() * sign;

    return { days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  UnbalanceDurationRelative: (years, months, weeks, days, largestUnit, relativeTo) => {
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
    const sign = ES.DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0);

    let calendar;
    if (relativeTo) {
      relativeTo = ES.ToTemporalDateTime(relativeTo);
      calendar = GetSlot(relativeTo, CALENDAR);
    }

    const oneYear = new TemporalDuration(sign);
    const oneMonth = new TemporalDuration(0, sign);
    const oneWeek = new TemporalDuration(0, 0, sign);

    switch (largestUnit) {
      case 'year':
        // no-op
        break;
      case 'month':
        {
          if (!calendar) throw new RangeError('a starting point is required for months balancing');
          // balance years down to months
          const dateAdd = ES.GetMethod(calendar, 'dateAdd');
          const dateUntil = ES.GetMethod(calendar, 'dateUntil');
          while (MathAbs(years) > 0) {
            const addOptions = ObjectCreate(null);
            const newRelativeTo = ES.CalendarDateAdd(calendar, relativeTo, oneYear, addOptions, dateAdd);
            const untilOptions = ObjectCreate(null);
            untilOptions.largestUnit = 'month';
            const untilResult = ES.CalendarDateUntil(calendar, relativeTo, newRelativeTo, untilOptions, dateUntil);
            const oneYearMonths = GetSlot(untilResult, MONTHS);
            relativeTo = newRelativeTo;
            months += oneYearMonths;
            years -= sign;
          }
        }
        break;
      case 'week':
        if (!calendar) throw new RangeError('a starting point is required for weeks balancing');
        // balance years down to days
        while (MathAbs(years) > 0) {
          let oneYearDays;
          ({ relativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
          days += oneYearDays;
          years -= sign;
        }

        // balance months down to days
        while (MathAbs(months) > 0) {
          let oneMonthDays;
          ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
          days += oneMonthDays;
          months -= sign;
        }
        break;
      default:
        // balance years down to days
        while (MathAbs(years) > 0) {
          if (!calendar) throw new RangeError('a starting point is required for balancing calendar units');
          let oneYearDays;
          ({ relativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
          days += oneYearDays;
          years -= sign;
        }

        // balance months down to days
        while (MathAbs(months) > 0) {
          if (!calendar) throw new RangeError('a starting point is required for balancing calendar units');
          let oneMonthDays;
          ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
          days += oneMonthDays;
          months -= sign;
        }

        // balance weeks down to days
        while (MathAbs(weeks) > 0) {
          if (!calendar) throw new RangeError('a starting point is required for balancing calendar units');
          let oneWeekDays;
          ({ relativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
          days += oneWeekDays;
          weeks -= sign;
        }
        break;
    }

    return { years, months, weeks, days };
  },
  BalanceDurationRelative: (years, months, weeks, days, largestUnit, relativeTo) => {
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
    const sign = ES.DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
    if (sign === 0) return { years, months, weeks, days };

    let calendar;
    if (relativeTo) {
      relativeTo = ES.ToTemporalDateTime(relativeTo);
      calendar = GetSlot(relativeTo, CALENDAR);
    }

    const oneYear = new TemporalDuration(sign);
    const oneMonth = new TemporalDuration(0, sign);
    const oneWeek = new TemporalDuration(0, 0, sign);

    switch (largestUnit) {
      case 'year': {
        if (!calendar) throw new RangeError('a starting point is required for years balancing');
        // balance days up to years
        let newRelativeTo, oneYearDays;
        ({ relativeTo: newRelativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
        while (MathAbs(days) >= MathAbs(oneYearDays)) {
          days -= oneYearDays;
          years += sign;
          relativeTo = newRelativeTo;
          ({ relativeTo: newRelativeTo, days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear));
        }

        // balance days up to months
        let oneMonthDays;
        ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        while (MathAbs(days) >= MathAbs(oneMonthDays)) {
          days -= oneMonthDays;
          months += sign;
          relativeTo = newRelativeTo;
          ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        }

        // balance months up to years
        const dateAdd = ES.GetMethod(calendar, 'dateAdd');
        const addOptions = ObjectCreate(null);
        newRelativeTo = ES.CalendarDateAdd(calendar, relativeTo, oneYear, addOptions, dateAdd);
        const dateUntil = ES.GetMethod(calendar, 'dateUntil');
        const untilOptions = ObjectCreate(null);
        untilOptions.largestUnit = 'month';
        let oneYearMonths = ES.CalendarDateUntil(calendar, relativeTo, newRelativeTo, untilOptions, dateUntil).months;
        while (MathAbs(months) >= MathAbs(oneYearMonths)) {
          months -= oneYearMonths;
          years += sign;
          relativeTo = newRelativeTo;
          const addOptions = ObjectCreate(null);
          newRelativeTo = ES.CalendarDateAdd(calendar, relativeTo, oneYear, addOptions, dateAdd);
          const untilOptions = ObjectCreate(null);
          untilOptions.largestUnit = 'month';
          oneYearMonths = ES.CalendarDateUntil(calendar, relativeTo, newRelativeTo, untilOptions, dateUntil).months;
        }
        break;
      }
      case 'month': {
        if (!calendar) throw new RangeError('a starting point is required for months balancing');
        // balance days up to months
        let newRelativeTo, oneMonthDays;
        ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        while (MathAbs(days) >= MathAbs(oneMonthDays)) {
          days -= oneMonthDays;
          months += sign;
          relativeTo = newRelativeTo;
          ({ relativeTo: newRelativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        }
        break;
      }
      case 'week': {
        if (!calendar) throw new RangeError('a starting point is required for weeks balancing');
        // balance days up to weeks
        let newRelativeTo, oneWeekDays;
        ({ relativeTo: newRelativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
        while (MathAbs(days) >= MathAbs(oneWeekDays)) {
          days -= oneWeekDays;
          weeks += sign;
          relativeTo = newRelativeTo;
          ({ relativeTo: newRelativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
        }
        break;
      }
      default:
        // no-op
        break;
    }

    return { years, months, weeks, days };
  },
  CalculateOffsetShift: (relativeTo, y, mon, w, d, h, min, s, ms, µs, ns) => {
    if (ES.IsTemporalZonedDateTime(relativeTo)) {
      const instant = GetSlot(relativeTo, INSTANT);
      const timeZone = GetSlot(relativeTo, TIME_ZONE);
      const calendar = GetSlot(relativeTo, CALENDAR);
      const offsetBefore = ES.GetOffsetNanosecondsFor(timeZone, instant);
      const after = ES.AddZonedDateTime(instant, timeZone, calendar, y, mon, w, d, h, min, s, ms, µs, ns);
      const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
      const instantAfter = new TemporalInstant(after);
      const offsetAfter = ES.GetOffsetNanosecondsFor(timeZone, instantAfter);
      return offsetAfter - offsetBefore;
    }
    return 0;
  },

  ConstrainToRange: (value, min, max) => MathMin(max, MathMax(min, value)),
  ConstrainISODate: (year, month, day) => {
    month = ES.ConstrainToRange(month, 1, 12);
    day = ES.ConstrainToRange(day, 1, ES.ISODaysInMonth(year, month));
    return { year, month, day };
  },
  ConstrainTime: (hour, minute, second, millisecond, microsecond, nanosecond) => {
    hour = ES.ConstrainToRange(hour, 0, 23);
    minute = ES.ConstrainToRange(minute, 0, 59);
    second = ES.ConstrainToRange(second, 0, 59);
    millisecond = ES.ConstrainToRange(millisecond, 0, 999);
    microsecond = ES.ConstrainToRange(microsecond, 0, 999);
    nanosecond = ES.ConstrainToRange(nanosecond, 0, 999);
    return { hour, minute, second, millisecond, microsecond, nanosecond };
  },
  ConstrainISODateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    ({ year, month, day } = ES.ConstrainISODate(year, month, day));
    ({ hour, minute, second, millisecond, microsecond, nanosecond } = ES.ConstrainTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    ));
    return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },

  RejectToRange: (value, min, max) => {
    if (value < min || value > max) throw new RangeError(`value out of range: ${min} <= ${value} <= ${max}`);
  },
  RejectISODate: (year, month, day) => {
    ES.RejectToRange(month, 1, 12);
    ES.RejectToRange(day, 1, ES.ISODaysInMonth(year, month));
  },
  RejectDateRange: (year, month, day) => {
    // Noon avoids trouble at edges of DateTime range (excludes midnight)
    ES.RejectDateTimeRange(year, month, day, 12, 0, 0, 0, 0, 0);
  },
  RejectTime: (hour, minute, second, millisecond, microsecond, nanosecond) => {
    ES.RejectToRange(hour, 0, 23);
    ES.RejectToRange(minute, 0, 59);
    ES.RejectToRange(second, 0, 59);
    ES.RejectToRange(millisecond, 0, 999);
    ES.RejectToRange(microsecond, 0, 999);
    ES.RejectToRange(nanosecond, 0, 999);
  },
  RejectDateTime: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    ES.RejectISODate(year, month, day);
    ES.RejectTime(hour, minute, second, millisecond, microsecond, nanosecond);
  },
  RejectDateTimeRange: (year, month, day, hour, minute, second, millisecond, microsecond, nanosecond) => {
    ES.RejectToRange(year, YEAR_MIN, YEAR_MAX);
    // Reject any DateTime 24 hours or more outside the Instant range
    if (
      (year === YEAR_MIN &&
        null ==
          ES.GetEpochFromISOParts(
            year,
            month,
            day + 1,
            hour,
            minute,
            second,
            millisecond,
            microsecond,
            nanosecond - 1
          )) ||
      (year === YEAR_MAX &&
        null ==
          ES.GetEpochFromISOParts(year, month, day - 1, hour, minute, second, millisecond, microsecond, nanosecond + 1))
    ) {
      throw new RangeError('DateTime outside of supported range');
    }
  },
  ValidateEpochNanoseconds: (epochNanoseconds) => {
    if (epochNanoseconds.lesser(NS_MIN) || epochNanoseconds.greater(NS_MAX)) {
      throw new RangeError('Instant outside of supported range');
    }
  },
  RejectYearMonthRange: (year, month) => {
    ES.RejectToRange(year, YEAR_MIN, YEAR_MAX);
    if (year === YEAR_MIN) {
      ES.RejectToRange(month, 4, 12);
    } else if (year === YEAR_MAX) {
      ES.RejectToRange(month, 1, 9);
    }
  },
  RejectDuration: (y, mon, w, d, h, min, s, ms, µs, ns) => {
    const sign = ES.DurationSign(y, mon, w, d, h, min, s, ms, µs, ns);
    for (const prop of [y, mon, w, d, h, min, s, ms, µs, ns]) {
      if (!NumberIsFinite(prop)) throw new RangeError('infinite values not allowed as duration fields');
      const propSign = MathSign(prop);
      if (propSign !== 0 && propSign !== sign) throw new RangeError('mixed-sign values not allowed as duration fields');
    }
  },

  DifferenceISODate: (y1, m1, d1, y2, m2, d2, largestUnit = 'days') => {
    switch (largestUnit) {
      case 'year':
      case 'month': {
        const sign = -ES.CompareISODate(y1, m1, d1, y2, m2, d2);
        if (sign === 0) return { years: 0, months: 0, weeks: 0, days: 0 };

        const start = { year: y1, month: m1, day: d1 };
        const end = { year: y2, month: m2, day: d2 };

        let years = end.year - start.year;
        let mid = ES.AddISODate(y1, m1, d1, years, 0, 0, 0, 'constrain');
        let midSign = -ES.CompareISODate(mid.year, mid.month, mid.day, y2, m2, d2);
        if (midSign === 0) {
          return largestUnit === 'year'
            ? { years, months: 0, weeks: 0, days: 0 }
            : { years: 0, months: years * 12, weeks: 0, days: 0 };
        }
        let months = end.month - start.month;
        if (midSign !== sign) {
          years -= sign;
          months += sign * 12;
        }
        mid = ES.AddISODate(y1, m1, d1, years, months, 0, 0, 'constrain');
        midSign = -ES.CompareISODate(mid.year, mid.month, mid.day, y2, m2, d2);
        if (midSign === 0) {
          return largestUnit === 'year'
            ? { years, months, weeks: 0, days: 0 }
            : { years: 0, months: months + years * 12, weeks: 0, days: 0 };
        }
        if (midSign !== sign) {
          // The end date is later in the month than mid date (or earlier for
          // negative durations). Back up one month.
          months -= sign;
          if (months === -sign) {
            years -= sign;
            months = 11 * sign;
          }
          mid = ES.AddISODate(y1, m1, d1, years, months, 0, 0, 'constrain');
          midSign = -ES.CompareISODate(y1, m1, d1, mid.year, mid.month, mid.day);
        }

        let days = 0;
        // If we get here, months and years are correct (no overflow), and `mid`
        // is within the range from `start` to `end`. To count the days between
        // `mid` and `end`, there are 3 cases:
        // 1) same month: use simple subtraction
        // 2) end is previous month from intermediate (negative duration)
        // 3) end is next month from intermediate (positive duration)
        if (mid.month === end.month && mid.year === end.year) {
          // 1) same month: use simple subtraction
          days = end.day - mid.day;
        } else if (sign < 0) {
          // 2) end is previous month from intermediate (negative duration)
          // Example: intermediate: Feb 1, end: Jan 30, DaysInMonth = 31, days = -2
          days = -mid.day - (ES.ISODaysInMonth(end.year, end.month) - end.day);
        } else {
          // 3) end is next month from intermediate (positive duration)
          // Example: intermediate: Jan 29, end: Feb 1, DaysInMonth = 31, days = 3
          days = end.day + (ES.ISODaysInMonth(mid.year, mid.month) - mid.day);
        }

        if (largestUnit === 'month') {
          months += years * 12;
          years = 0;
        }
        return { years, months, weeks: 0, days };
      }
      case 'week':
      case 'day': {
        let larger, smaller, sign;
        if (ES.CompareISODate(y1, m1, d1, y2, m2, d2) < 0) {
          smaller = { year: y1, month: m1, day: d1 };
          larger = { year: y2, month: m2, day: d2 };
          sign = 1;
        } else {
          smaller = { year: y2, month: m2, day: d2 };
          larger = { year: y1, month: m1, day: d1 };
          sign = -1;
        }
        let days =
          ES.DayOfYear(larger.year, larger.month, larger.day) - ES.DayOfYear(smaller.year, smaller.month, smaller.day);
        for (let year = smaller.year; year < larger.year; ++year) {
          days += ES.LeapYear(year) ? 366 : 365;
        }
        let weeks = 0;
        if (largestUnit === 'week') {
          weeks = MathFloor(days / 7);
          days %= 7;
        }
        weeks *= sign;
        days *= sign;
        return { years: 0, months: 0, weeks, days };
      }
      default:
        throw new Error('assert not reached');
    }
  },
  DifferenceTime: (h1, min1, s1, ms1, µs1, ns1, h2, min2, s2, ms2, µs2, ns2) => {
    let hours = h2 - h1;
    let minutes = min2 - min1;
    let seconds = s2 - s1;
    let milliseconds = ms2 - ms1;
    let microseconds = µs2 - µs1;
    let nanoseconds = ns2 - ns1;

    const sign = ES.DurationSign(0, 0, 0, 0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
    hours *= sign;
    minutes *= sign;
    seconds *= sign;
    milliseconds *= sign;
    microseconds *= sign;
    nanoseconds *= sign;

    let deltaDays = 0;
    ({
      deltaDays,
      hour: hours,
      minute: minutes,
      second: seconds,
      millisecond: milliseconds,
      microsecond: microseconds,
      nanosecond: nanoseconds
    } = ES.BalanceTime(hours, minutes, seconds, milliseconds, microseconds, nanoseconds));

    deltaDays *= sign;
    hours *= sign;
    minutes *= sign;
    seconds *= sign;
    milliseconds *= sign;
    microseconds *= sign;
    nanoseconds *= sign;

    return { deltaDays, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  DifferenceInstant(ns1, ns2, increment, unit, roundingMode) {
    const diff = ns2.minus(ns1);

    const remainder = diff.mod(86400e9);
    const wholeDays = diff.minus(remainder);
    const roundedRemainder = ES.RoundNumberToIncrement(remainder, nsPerTimeUnit[unit] * increment, roundingMode);
    const roundedDiff = wholeDays.plus(roundedRemainder);

    const nanoseconds = +roundedDiff.mod(1e3);
    const microseconds = +roundedDiff.divide(1e3).mod(1e3);
    const milliseconds = +roundedDiff.divide(1e6).mod(1e3);
    const seconds = +roundedDiff.divide(1e9);
    return { seconds, milliseconds, microseconds, nanoseconds };
  },
  DifferenceISODateTime: (
    y1,
    mon1,
    d1,
    h1,
    min1,
    s1,
    ms1,
    µs1,
    ns1,
    y2,
    mon2,
    d2,
    h2,
    min2,
    s2,
    ms2,
    µs2,
    ns2,
    calendar,
    largestUnit,
    options = ObjectCreate(null)
  ) => {
    let { deltaDays, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceTime(
      h1,
      min1,
      s1,
      ms1,
      µs1,
      ns1,
      h2,
      min2,
      s2,
      ms2,
      µs2,
      ns2
    );

    const timeSign = ES.DurationSign(
      0,
      0,
      0,
      deltaDays,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds
    );
    ({ year: y1, month: mon1, day: d1 } = ES.BalanceISODate(y1, mon1, d1 + deltaDays));
    const dateSign = ES.CompareISODate(y2, mon2, d2, y1, mon1, d1);
    if (dateSign === -timeSign) {
      ({ year: y1, month: mon1, day: d1 } = ES.BalanceISODate(y1, mon1, d1 - timeSign));
      ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
        -timeSign,
        hours,
        minutes,
        seconds,
        milliseconds,
        microseconds,
        nanoseconds,
        largestUnit
      ));
    }

    const date1 = ES.CreateTemporalDate(y1, mon1, d1, calendar);
    const date2 = ES.CreateTemporalDate(y2, mon2, d2, calendar);
    const dateLargestUnit = ES.LargerOfTwoTemporalUnits('day', largestUnit);
    const untilOptions = { ...options, largestUnit: dateLargestUnit };
    let { years, months, weeks, days } = ES.CalendarDateUntil(calendar, date1, date2, untilOptions);
    // Signs of date part and time part may not agree; balance them together
    ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
      days,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      largestUnit
    ));
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  DifferenceZonedDateTime: (ns1, ns2, timeZone, calendar, largestUnit, options) => {
    const nsDiff = ns2.subtract(ns1);
    if (nsDiff.isZero()) {
      return {
        years: 0,
        months: 0,
        weeks: 0,
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        milliseconds: 0,
        microseconds: 0,
        nanoseconds: 0
      };
    }

    // Find the difference in dates only.
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    const start = new TemporalInstant(ns1);
    const end = new TemporalInstant(ns2);
    const dtStart = ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, start, calendar);
    const dtEnd = ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, end, calendar);
    let { years, months, weeks, days } = ES.DifferenceISODateTime(
      GetSlot(dtStart, ISO_YEAR),
      GetSlot(dtStart, ISO_MONTH),
      GetSlot(dtStart, ISO_DAY),
      GetSlot(dtStart, ISO_HOUR),
      GetSlot(dtStart, ISO_MINUTE),
      GetSlot(dtStart, ISO_SECOND),
      GetSlot(dtStart, ISO_MILLISECOND),
      GetSlot(dtStart, ISO_MICROSECOND),
      GetSlot(dtStart, ISO_NANOSECOND),
      GetSlot(dtEnd, ISO_YEAR),
      GetSlot(dtEnd, ISO_MONTH),
      GetSlot(dtEnd, ISO_DAY),
      GetSlot(dtEnd, ISO_HOUR),
      GetSlot(dtEnd, ISO_MINUTE),
      GetSlot(dtEnd, ISO_SECOND),
      GetSlot(dtEnd, ISO_MILLISECOND),
      GetSlot(dtEnd, ISO_MICROSECOND),
      GetSlot(dtEnd, ISO_NANOSECOND),
      calendar,
      largestUnit,
      options
    );
    let intermediateNs = ES.AddZonedDateTime(start, timeZone, calendar, years, months, weeks, 0, 0, 0, 0, 0, 0, 0);
    // may disambiguate
    let timeRemainderNs = ns2.subtract(intermediateNs);
    const intermediate = ES.CreateTemporalZonedDateTime(intermediateNs, timeZone, calendar);
    ({ nanoseconds: timeRemainderNs, days } = ES.NanosecondsToDays(timeRemainderNs, intermediate));

    // Finally, merge the date and time durations and return the merged result.
    let { hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
      0,
      0,
      0,
      0,
      0,
      0,
      timeRemainderNs,
      'hour'
    );
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  AddISODate: (year, month, day, years, months, weeks, days, overflow) => {
    year += years;
    month += months;
    ({ year, month } = ES.BalanceISOYearMonth(year, month));
    ({ year, month, day } = ES.RegulateISODate(year, month, day, overflow));
    days += 7 * weeks;
    day += days;
    ({ year, month, day } = ES.BalanceISODate(year, month, day));
    return { year, month, day };
  },
  AddTime: (
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds
  ) => {
    hour += hours;
    minute += minutes;
    second += seconds;
    millisecond += milliseconds;
    microsecond += microseconds;
    nanosecond += nanoseconds;
    let deltaDays = 0;
    ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.BalanceTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    ));
    return { deltaDays, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  SubtractDate: (year, month, day, years, months, weeks, days, overflow) => {
    days += 7 * weeks;
    day -= days;
    ({ year, month, day } = ES.BalanceISODate(year, month, day));
    month -= months;
    year -= years;
    ({ year, month } = ES.BalanceISOYearMonth(year, month));
    ({ year, month, day } = ES.RegulateISODate(year, month, day, overflow));
    return { year, month, day };
  },
  AddDuration: (
    y1,
    mon1,
    w1,
    d1,
    h1,
    min1,
    s1,
    ms1,
    µs1,
    ns1,
    y2,
    mon2,
    w2,
    d2,
    h2,
    min2,
    s2,
    ms2,
    µs2,
    ns2,
    relativeTo
  ) => {
    const largestUnit1 = ES.DefaultTemporalLargestUnit(y1, mon1, w1, d1, h1, min1, s1, ms1, µs1, ns1);
    const largestUnit2 = ES.DefaultTemporalLargestUnit(y2, mon2, w2, d2, h2, min2, s2, ms2, µs2, ns2);
    const largestUnit = ES.LargerOfTwoTemporalUnits(largestUnit1, largestUnit2);

    let years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds;
    if (!relativeTo) {
      if (largestUnit === 'year' || largestUnit === 'month' || largestUnit === 'week') {
        throw new RangeError('relativeTo is required for years, months, or weeks arithmetic');
      }
      years = months = weeks = 0;
      ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
        d1 + d2,
        h1 + h2,
        min1 + min2,
        s1 + s2,
        ms1 + ms2,
        µs1 + µs2,
        ns1 + ns2,
        largestUnit
      ));
    } else if (ES.IsTemporalDateTime(relativeTo)) {
      const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
      const calendar = GetSlot(relativeTo, CALENDAR);

      const datePart = ES.CreateTemporalDate(
        GetSlot(relativeTo, ISO_YEAR),
        GetSlot(relativeTo, ISO_MONTH),
        GetSlot(relativeTo, ISO_DAY),
        calendar
      );
      const dateDuration1 = new TemporalDuration(y1, mon1, w1, d1, 0, 0, 0, 0, 0, 0);
      const dateDuration2 = new TemporalDuration(y2, mon2, w2, d2, 0, 0, 0, 0, 0, 0);
      const dateAdd = ES.GetMethod(calendar, 'dateAdd');
      const firstAddOptions = ObjectCreate(null);
      const intermediate = ES.CalendarDateAdd(calendar, datePart, dateDuration1, firstAddOptions, dateAdd);
      const secondAddOptions = ObjectCreate(null);
      const end = ES.CalendarDateAdd(calendar, intermediate, dateDuration2, secondAddOptions, dateAdd);

      const dateLargestUnit = ES.LargerOfTwoTemporalUnits('day', largestUnit);
      const differenceOptions = ObjectCreate(null);
      differenceOptions.largestUnit = dateLargestUnit;
      ({ years, months, weeks, days } = ES.CalendarDateUntil(calendar, datePart, end, differenceOptions));
      // Signs of date part and time part may not agree; balance them together
      ({ days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
        days,
        h1 + h2,
        min1 + min2,
        s1 + s2,
        ms1 + ms2,
        µs1 + µs2,
        ns1 + ns2,
        largestUnit
      ));
    } else {
      // relativeTo is a ZonedDateTime
      const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
      const timeZone = GetSlot(relativeTo, TIME_ZONE);
      const calendar = GetSlot(relativeTo, CALENDAR);
      const intermediateNs = ES.AddZonedDateTime(
        GetSlot(relativeTo, INSTANT),
        timeZone,
        calendar,
        y1,
        mon1,
        w1,
        d1,
        h1,
        min1,
        s1,
        ms1,
        µs1,
        ns1
      );
      const endNs = ES.AddZonedDateTime(
        new TemporalInstant(intermediateNs),
        timeZone,
        calendar,
        y2,
        mon2,
        w2,
        d2,
        h2,
        min2,
        s2,
        ms2,
        µs2,
        ns2
      );
      if (largestUnit !== 'year' && largestUnit !== 'month' && largestUnit !== 'week' && largestUnit !== 'day') {
        // The user is only asking for a time difference, so return difference of instants.
        years = 0;
        months = 0;
        weeks = 0;
        days = 0;
        ({ seconds, milliseconds, microseconds, nanoseconds } = ES.DifferenceInstant(
          GetSlot(relativeTo, EPOCHNANOSECONDS),
          endNs,
          1,
          'nanosecond',
          'halfExpand'
        ));
        ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
          0,
          0,
          0,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds,
          largestUnit
        ));
      } else {
        ({
          years,
          months,
          weeks,
          days,
          hours,
          minutes,
          seconds,
          milliseconds,
          microseconds,
          nanoseconds
        } = ES.DifferenceZonedDateTime(GetSlot(relativeTo, EPOCHNANOSECONDS), endNs, timeZone, calendar, largestUnit));
      }
    }

    ES.RejectDuration(years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds);
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  AddInstant: (epochNanoseconds, h, min, s, ms, µs, ns) => {
    let sum = bigInt.zero;
    sum = sum.plus(bigInt(ns));
    sum = sum.plus(bigInt(µs).multiply(1e3));
    sum = sum.plus(bigInt(ms).multiply(1e6));
    sum = sum.plus(bigInt(s).multiply(1e9));
    sum = sum.plus(bigInt(min).multiply(60 * 1e9));
    sum = sum.plus(bigInt(h).multiply(60 * 60 * 1e9));

    const result = bigInt(epochNanoseconds).plus(sum);
    ES.ValidateEpochNanoseconds(result);
    return result;
  },
  AddDateTime: (
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    calendar,
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    options
  ) => {
    // Add the time part
    let deltaDays = 0;
    ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.AddTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds
    ));
    days += deltaDays;

    // Delegate the date part addition to the calendar
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
    const datePart = ES.CreateTemporalDate(year, month, day, calendar);
    const dateDuration = new TemporalDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
    const addedDate = ES.CalendarDateAdd(calendar, datePart, dateDuration, options);

    return {
      year: GetSlot(addedDate, ISO_YEAR),
      month: GetSlot(addedDate, ISO_MONTH),
      day: GetSlot(addedDate, ISO_DAY),
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond
    };
  },
  AddZonedDateTime: (
    instant,
    timeZone,
    calendar,
    years,
    months,
    weeks,
    days,
    h,
    min,
    s,
    ms,
    µs,
    ns,
    options = ObjectCreate(null)
  ) => {
    // If only time is to be added, then use Instant math. It's not OK to fall
    // through to the date/time code below because compatible disambiguation in
    // the PlainDateTime=>Instant conversion will change the offset of any
    // ZonedDateTime in the repeated clock time after a backwards transition.
    // When adding/subtracting time units and not dates, this disambiguation is
    // not expected and so is avoided below via a fast path for time-only
    // arithmetic.
    // BTW, this behavior is similar in spirit to offset: 'prefer' in `with`.
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
    if (ES.DurationSign(years, months, weeks, days, 0, 0, 0, 0, 0, 0) === 0) {
      return ES.AddInstant(GetSlot(instant, EPOCHNANOSECONDS), h, min, s, ms, µs, ns);
    }

    // RFC 5545 requires the date portion to be added in calendar days and the
    // time portion to be added in exact time.
    let dt = ES.BuiltinTimeZoneGetPlainDateTimeFor(timeZone, instant, calendar);
    const datePart = ES.CreateTemporalDate(
      GetSlot(dt, ISO_YEAR),
      GetSlot(dt, ISO_MONTH),
      GetSlot(dt, ISO_DAY),
      calendar
    );
    const dateDuration = new TemporalDuration(years, months, weeks, days, 0, 0, 0, 0, 0, 0);
    const addedDate = ES.CalendarDateAdd(calendar, datePart, dateDuration, options);
    const dtIntermediate = ES.CreateTemporalDateTime(
      GetSlot(addedDate, ISO_YEAR),
      GetSlot(addedDate, ISO_MONTH),
      GetSlot(addedDate, ISO_DAY),
      GetSlot(dt, ISO_HOUR),
      GetSlot(dt, ISO_MINUTE),
      GetSlot(dt, ISO_SECOND),
      GetSlot(dt, ISO_MILLISECOND),
      GetSlot(dt, ISO_MICROSECOND),
      GetSlot(dt, ISO_NANOSECOND),
      calendar
    );

    // Note that 'compatible' is used below because this disambiguation behavior
    // is required by RFC 5545.
    const instantIntermediate = ES.BuiltinTimeZoneGetInstantFor(timeZone, dtIntermediate, 'compatible');
    return ES.AddInstant(GetSlot(instantIntermediate, EPOCHNANOSECONDS), h, min, s, ms, µs, ns);
  },
  RoundNumberToIncrement: (quantity, increment, mode) => {
    if (increment === 1) return quantity;
    let { quotient, remainder } = quantity.divmod(increment);
    if (remainder.equals(bigInt.zero)) return quantity;
    const sign = remainder.lt(bigInt.zero) ? -1 : 1;
    switch (mode) {
      case 'ceil':
        if (sign > 0) quotient = quotient.add(sign);
        break;
      case 'floor':
        if (sign < 0) quotient = quotient.add(sign);
        break;
      case 'trunc':
        // no change needed, because divmod is a truncation
        break;
      case 'halfExpand':
        // "half up away from zero"
        if (remainder.multiply(2).abs() >= increment) quotient = quotient.add(sign);
        break;
    }
    return quotient.multiply(increment);
  },
  RoundInstant: (epochNs, increment, unit, roundingMode) => {
    // Note: NonNegativeModulo, but with BigInt
    let remainder = epochNs.mod(86400e9);
    if (remainder.lesser(0)) remainder = remainder.plus(86400e9);
    const wholeDays = epochNs.minus(remainder);
    const roundedRemainder = ES.RoundNumberToIncrement(remainder, nsPerTimeUnit[unit] * increment, roundingMode);
    return wholeDays.plus(roundedRemainder);
  },
  RoundISODateTime: (
    year,
    month,
    day,
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    increment,
    unit,
    roundingMode,
    dayLengthNs = 86400e9
  ) => {
    let deltaDays = 0;
    ({ deltaDays, hour, minute, second, millisecond, microsecond, nanosecond } = ES.RoundTime(
      hour,
      minute,
      second,
      millisecond,
      microsecond,
      nanosecond,
      increment,
      unit,
      roundingMode,
      dayLengthNs
    ));
    ({ year, month, day } = ES.BalanceISODate(year, month, day + deltaDays));
    return { year, month, day, hour, minute, second, millisecond, microsecond, nanosecond };
  },
  RoundTime: (
    hour,
    minute,
    second,
    millisecond,
    microsecond,
    nanosecond,
    increment,
    unit,
    roundingMode,
    dayLengthNs = 86400e9
  ) => {
    let quantity = bigInt.zero;
    switch (unit) {
      case 'day':
      case 'hour':
        quantity = bigInt(hour);
      // fall through
      case 'minute':
        quantity = quantity.multiply(60).plus(minute);
      // fall through
      case 'second':
        quantity = quantity.multiply(60).plus(second);
      // fall through
      case 'millisecond':
        quantity = quantity.multiply(1000).plus(millisecond);
      // fall through
      case 'microsecond':
        quantity = quantity.multiply(1000).plus(microsecond);
      // fall through
      case 'nanosecond':
        quantity = quantity.multiply(1000).plus(nanosecond);
    }
    const nsPerUnit = unit === 'day' ? dayLengthNs : nsPerTimeUnit[unit];
    const rounded = ES.RoundNumberToIncrement(quantity, nsPerUnit * increment, roundingMode);
    const result = rounded.divide(nsPerUnit).toJSNumber();
    switch (unit) {
      case 'day':
        return { deltaDays: result, hour: 0, minute: 0, second: 0, millisecond: 0, microsecond: 0, nanosecond: 0 };
      case 'hour':
        return ES.BalanceTime(result, 0, 0, 0, 0, 0);
      case 'minute':
        return ES.BalanceTime(hour, result, 0, 0, 0, 0);
      case 'second':
        return ES.BalanceTime(hour, minute, result, 0, 0, 0);
      case 'millisecond':
        return ES.BalanceTime(hour, minute, second, result, 0, 0);
      case 'microsecond':
        return ES.BalanceTime(hour, minute, second, millisecond, result, 0);
      case 'nanosecond':
        return ES.BalanceTime(hour, minute, second, millisecond, microsecond, result);
    }
  },
  DaysUntil: (earlier, later) => {
    return ES.DifferenceISODate(
      GetSlot(earlier, ISO_YEAR),
      GetSlot(earlier, ISO_MONTH),
      GetSlot(earlier, ISO_DAY),
      GetSlot(later, ISO_YEAR),
      GetSlot(later, ISO_MONTH),
      GetSlot(later, ISO_DAY),
      'day'
    ).days;
  },
  MoveRelativeDate: (calendar, relativeTo, duration) => {
    const options = ObjectCreate(null);
    const later = ES.CalendarDateAdd(calendar, relativeTo, duration, options);
    const days = ES.DaysUntil(relativeTo, later);
    relativeTo = ES.CreateTemporalDateTime(
      GetSlot(later, ISO_YEAR),
      GetSlot(later, ISO_MONTH),
      GetSlot(later, ISO_DAY),
      GetSlot(relativeTo, ISO_HOUR),
      GetSlot(relativeTo, ISO_MINUTE),
      GetSlot(relativeTo, ISO_SECOND),
      GetSlot(relativeTo, ISO_MILLISECOND),
      GetSlot(relativeTo, ISO_MICROSECOND),
      GetSlot(relativeTo, ISO_NANOSECOND),
      GetSlot(relativeTo, CALENDAR)
    );
    return { relativeTo, days };
  },
  MoveRelativeZonedDateTime: (relativeTo, years, months, weeks, days) => {
    const timeZone = GetSlot(relativeTo, TIME_ZONE);
    const calendar = GetSlot(relativeTo, CALENDAR);
    const intermediateNs = ES.AddZonedDateTime(
      GetSlot(relativeTo, INSTANT),
      timeZone,
      calendar,
      years,
      months,
      weeks,
      days,
      0,
      0,
      0,
      0,
      0,
      0
    );
    return ES.CreateTemporalZonedDateTime(intermediateNs, timeZone, calendar);
  },
  AdjustRoundedDurationDays: (
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    increment,
    unit,
    roundingMode,
    relativeTo
  ) => {
    if (
      !ES.IsTemporalZonedDateTime(relativeTo) ||
      unit === 'year' ||
      unit === 'month' ||
      unit === 'week' ||
      unit === 'day' ||
      (unit === 'nanosecond' && increment === 1)
    ) {
      return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
    }

    // There's one more round of rounding possible: if relativeTo is a
    // ZonedDateTime, the time units could have rounded up into enough hours
    // to exceed the day length. If this happens, grow the date part by a
    // single day and re-run exact time rounding on the smaller remainder. DO
    // NOT RECURSE, because once the extra hours are sucked up into the date
    // duration, there's no way for another full day to come from the next
    // round of rounding. And if it were possible (e.g. contrived calendar
    // with 30-minute-long "days") then it'd risk an infinite loop.
    let timeRemainderNs = ES.TotalDurationNanoseconds(
      0,
      hours,
      minutes,
      seconds,
      milliseconds,
      microseconds,
      nanoseconds,
      0
    );
    const direction = MathSign(timeRemainderNs.toJSNumber());

    const timeZone = GetSlot(relativeTo, TIME_ZONE);
    const calendar = GetSlot(relativeTo, CALENDAR);
    const dayStart = ES.AddZonedDateTime(
      GetSlot(relativeTo, INSTANT),
      timeZone,
      calendar,
      years,
      months,
      weeks,
      days,
      0,
      0,
      0,
      0,
      0,
      0
    );
    const TemporalInstant = GetIntrinsic('%Temporal.Instant%');
    const dayEnd = ES.AddZonedDateTime(
      new TemporalInstant(dayStart),
      timeZone,
      calendar,
      0,
      0,
      0,
      direction,
      0,
      0,
      0,
      0,
      0,
      0
    );
    const dayLengthNs = dayEnd.subtract(dayStart);

    if (timeRemainderNs.subtract(dayLengthNs).multiply(direction).geq(0)) {
      ({ years, months, weeks, days } = ES.AddDuration(
        years,
        months,
        weeks,
        days,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        direction,
        0,
        0,
        0,
        0,
        0,
        0,
        relativeTo
      ));
      timeRemainderNs = ES.RoundInstant(timeRemainderNs.subtract(dayLengthNs), increment, unit, roundingMode);
      ({ hours, minutes, seconds, milliseconds, microseconds, nanoseconds } = ES.BalanceDuration(
        0,
        0,
        0,
        0,
        0,
        0,
        timeRemainderNs.toJSNumber(),
        'hour'
      ));
    }
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds };
  },
  RoundDuration: (
    years,
    months,
    weeks,
    days,
    hours,
    minutes,
    seconds,
    milliseconds,
    microseconds,
    nanoseconds,
    increment,
    unit,
    roundingMode,
    relativeTo = undefined
  ) => {
    const TemporalDuration = GetIntrinsic('%Temporal.Duration%');
    let calendar, zdtRelative;
    if (relativeTo) {
      if (ES.IsTemporalZonedDateTime(relativeTo)) {
        zdtRelative = relativeTo;
        relativeTo = ES.BuiltinTimeZoneGetPlainDateTimeFor(
          GetSlot(relativeTo, TIME_ZONE),
          GetSlot(relativeTo, INSTANT),
          GetSlot(relativeTo, CALENDAR)
        );
      } else if (!ES.IsTemporalDateTime(relativeTo)) {
        throw new TypeError('starting point must be PlainDateTime or ZonedDateTime');
      }
      calendar = GetSlot(relativeTo, CALENDAR);
    }

    // First convert time units up to days, if rounding to days or higher units.
    // If rounding relative to a ZonedDateTime, then some days may not be 24h.
    let dayLengthNs;
    if (unit === 'year' || unit === 'month' || unit === 'week' || unit === 'day') {
      nanoseconds = ES.TotalDurationNanoseconds(0, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, 0);
      let intermediate;
      if (zdtRelative) {
        intermediate = ES.MoveRelativeZonedDateTime(zdtRelative, years, months, weeks, days);
      }
      let deltaDays;
      ({ days: deltaDays, nanoseconds, dayLengthNs } = ES.NanosecondsToDays(nanoseconds, intermediate));
      days += deltaDays;
      hours = minutes = seconds = milliseconds = microseconds = 0;
    }

    let total;
    switch (unit) {
      case 'year': {
        if (!calendar) throw new RangeError('A starting point is required for years rounding');

        // convert months and weeks to days by calculating difference(
        // relativeTo + years, relativeTo + { years, months, weeks })
        const yearsDuration = new TemporalDuration(years);
        const dateAdd = ES.GetMethod(calendar, 'dateAdd');
        const firstAddOptions = ObjectCreate(null);
        const yearsLater = ES.CalendarDateAdd(calendar, relativeTo, yearsDuration, firstAddOptions, dateAdd);
        const yearsMonthsWeeks = new TemporalDuration(years, months, weeks);
        const secondAddOptions = ObjectCreate(null);
        const yearsMonthsWeeksLater = ES.CalendarDateAdd(
          calendar,
          relativeTo,
          yearsMonthsWeeks,
          secondAddOptions,
          dateAdd
        );
        const monthsWeeksInDays = ES.DaysUntil(yearsLater, yearsMonthsWeeksLater);
        relativeTo = yearsLater;
        days += monthsWeeksInDays;

        const thirdAddOptions = ObjectCreate(null);
        const daysLater = ES.CalendarDateAdd(calendar, relativeTo, { days }, thirdAddOptions, dateAdd);
        const untilOptions = ObjectCreate(null);
        untilOptions.largestUnit = 'year';
        const yearsPassed = ES.CalendarDateUntil(calendar, relativeTo, daysLater, untilOptions).years;
        years += yearsPassed;
        const oldRelativeTo = relativeTo;
        const fourthAddOptions = ObjectCreate(null);
        relativeTo = ES.CalendarDateAdd(calendar, relativeTo, { years: yearsPassed }, fourthAddOptions, dateAdd);
        const daysPassed = ES.DaysUntil(oldRelativeTo, relativeTo);
        days -= daysPassed;
        const oneYear = new TemporalDuration(days < 0 ? -1 : 1);
        let { days: oneYearDays } = ES.MoveRelativeDate(calendar, relativeTo, oneYear);

        // Note that `nanoseconds` below (here and in similar code for months,
        // weeks, and days further below) isn't actually nanoseconds for the
        // full date range.  Instead, it's a BigInt representation of total
        // days multiplied by the number of nanoseconds in the last day of
        // the duration. This lets us do days-or-larger rounding using BigInt
        // math which reduces precision loss.
        oneYearDays = MathAbs(oneYearDays);
        const divisor = bigInt(oneYearDays).multiply(dayLengthNs);
        nanoseconds = divisor.multiply(years).plus(bigInt(days).multiply(dayLengthNs)).plus(nanoseconds);
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        total = nanoseconds.toJSNumber() / divisor;
        years = rounded.divide(divisor).toJSNumber();
        nanoseconds = months = weeks = days = 0;
        break;
      }
      case 'month': {
        if (!calendar) throw new RangeError('A starting point is required for months rounding');

        // convert weeks to days by calculating difference(relativeTo +
        //   { years, months }, relativeTo + { years, months, weeks })
        const yearsMonths = new TemporalDuration(years, months);
        const dateAdd = ES.GetMethod(calendar, 'dateAdd');
        const firstAddOptions = ObjectCreate(null);
        const yearsMonthsLater = ES.CalendarDateAdd(calendar, relativeTo, yearsMonths, firstAddOptions, dateAdd);
        const yearsMonthsWeeks = new TemporalDuration(years, months, weeks);
        const secondAddOptions = ObjectCreate(null);
        const yearsMonthsWeeksLater = ES.CalendarDateAdd(
          calendar,
          relativeTo,
          yearsMonthsWeeks,
          secondAddOptions,
          dateAdd
        );
        const weeksInDays = ES.DaysUntil(yearsMonthsLater, yearsMonthsWeeksLater);
        relativeTo = yearsMonthsLater;
        days += weeksInDays;

        // Months may be different lengths of days depending on the calendar,
        // convert days to months in a loop as described above under 'years'.
        const sign = MathSign(days);
        const oneMonth = new TemporalDuration(0, days < 0 ? -1 : 1);
        let oneMonthDays;
        ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        while (MathAbs(days) >= MathAbs(oneMonthDays)) {
          months += sign;
          days -= oneMonthDays;
          ({ relativeTo, days: oneMonthDays } = ES.MoveRelativeDate(calendar, relativeTo, oneMonth));
        }
        oneMonthDays = MathAbs(oneMonthDays);
        const divisor = bigInt(oneMonthDays).multiply(dayLengthNs);
        nanoseconds = divisor.multiply(months).plus(bigInt(days).multiply(dayLengthNs)).plus(nanoseconds);
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        total = nanoseconds.toJSNumber() / divisor;
        months = rounded.divide(divisor).toJSNumber();
        nanoseconds = weeks = days = 0;
        break;
      }
      case 'week': {
        if (!calendar) throw new RangeError('A starting point is required for weeks rounding');
        // Weeks may be different lengths of days depending on the calendar,
        // convert days to weeks in a loop as described above under 'years'.
        const sign = MathSign(days);
        const oneWeek = new TemporalDuration(0, 0, days < 0 ? -1 : 1);
        let oneWeekDays;
        ({ relativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
        while (MathAbs(days) >= MathAbs(oneWeekDays)) {
          weeks += sign;
          days -= oneWeekDays;
          ({ relativeTo, days: oneWeekDays } = ES.MoveRelativeDate(calendar, relativeTo, oneWeek));
        }
        oneWeekDays = MathAbs(oneWeekDays);
        const divisor = bigInt(oneWeekDays).multiply(dayLengthNs);
        nanoseconds = divisor.multiply(weeks).plus(bigInt(days).multiply(dayLengthNs)).plus(nanoseconds);
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        total = nanoseconds.toJSNumber() / divisor;
        weeks = rounded.divide(divisor).toJSNumber();
        nanoseconds = days = 0;
        break;
      }
      case 'day': {
        const divisor = bigInt(dayLengthNs);
        nanoseconds = divisor.multiply(days).plus(nanoseconds);
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        total = nanoseconds.toJSNumber() / divisor;
        days = rounded.divide(divisor).toJSNumber();
        nanoseconds = 0;
        break;
      }
      case 'hour': {
        const divisor = 3600e9;
        nanoseconds = bigInt(hours)
          .multiply(3600e9)
          .plus(bigInt(minutes).multiply(60e9))
          .plus(bigInt(seconds).multiply(1e9))
          .plus(bigInt(milliseconds).multiply(1e6))
          .plus(bigInt(microseconds).multiply(1e3))
          .plus(nanoseconds);
        total = nanoseconds.toJSNumber() / divisor;
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        hours = rounded.divide(divisor).toJSNumber();
        minutes = seconds = milliseconds = microseconds = nanoseconds = 0;
        break;
      }
      case 'minute': {
        const divisor = 60e9;
        nanoseconds = bigInt(minutes)
          .multiply(60e9)
          .plus(bigInt(seconds).multiply(1e9))
          .plus(bigInt(milliseconds).multiply(1e6))
          .plus(bigInt(microseconds).multiply(1e3))
          .plus(nanoseconds);
        total = nanoseconds.toJSNumber() / divisor;
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        minutes = rounded.divide(divisor).toJSNumber();
        seconds = milliseconds = microseconds = nanoseconds = 0;
        break;
      }
      case 'second': {
        const divisor = 1e9;
        nanoseconds = bigInt(seconds)
          .multiply(1e9)
          .plus(bigInt(milliseconds).multiply(1e6))
          .plus(bigInt(microseconds).multiply(1e3))
          .plus(nanoseconds);
        total = nanoseconds.toJSNumber() / divisor;
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        seconds = rounded.divide(divisor).toJSNumber();
        milliseconds = microseconds = nanoseconds = 0;
        break;
      }
      case 'millisecond': {
        const divisor = 1e6;
        nanoseconds = bigInt(milliseconds).multiply(1e6).plus(bigInt(microseconds).multiply(1e3)).plus(nanoseconds);
        total = nanoseconds.toJSNumber() / divisor;
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        milliseconds = rounded.divide(divisor).toJSNumber();
        microseconds = nanoseconds = 0;
        break;
      }
      case 'microsecond': {
        const divisor = 1e3;
        nanoseconds = bigInt(microseconds).multiply(1e3).plus(nanoseconds);
        total = nanoseconds.toJSNumber() / divisor;
        const rounded = ES.RoundNumberToIncrement(nanoseconds, divisor * increment, roundingMode);
        microseconds = rounded.divide(divisor).toJSNumber();
        nanoseconds = 0;
        break;
      }
      case 'nanosecond': {
        total = nanoseconds;
        nanoseconds = ES.RoundNumberToIncrement(bigInt(nanoseconds), increment, roundingMode);
        break;
      }
    }
    return { years, months, weeks, days, hours, minutes, seconds, milliseconds, microseconds, nanoseconds, total };
  },

  CompareISODate: (y1, m1, d1, y2, m2, d2) => {
    for (const [x, y] of [
      [y1, y2],
      [m1, m2],
      [d1, d2]
    ]) {
      if (x !== y) return ES.ComparisonResult(x - y);
    }
    return 0;
  },

  AssertPositiveInteger: (num) => {
    if (!NumberIsFinite(num) || MathAbs(num) !== num) throw new RangeError(`invalid positive integer: ${num}`);
    return num;
  },
  NonNegativeModulo: (x, y) => {
    let result = x % y;
    if (ObjectIs(result, -0)) return 0;
    if (result < 0) result += y;
    return result;
  },
  ToBigInt: (arg) => {
    if (bigInt.isInstance(arg)) {
      return arg;
    }

    const prim = ES.ToPrimitive(arg, Number);
    switch (typeof prim) {
      case 'undefined':
      case 'object':
      case 'number':
      case 'symbol':
        throw new TypeError(`cannot convert ${typeof arg} to bigint`);
      case 'string':
        if (!prim.match(/^\s*(?:[+-]?\d+\s*)?$/)) {
          throw new SyntaxError('invalid BigInt syntax');
        }
      // eslint: no-fallthrough: false
      case 'bigint':
        try {
          return bigInt(prim);
        } catch (e) {
          if (e instanceof Error && e.message.startsWith('Invalid integer')) throw new SyntaxError(e.message);
          throw e;
        }
      case 'boolean':
        if (prim) {
          return bigInt(1);
        } else {
          return bigInt.zero;
        }
    }
  },

  // Note: This method returns values with bogus nanoseconds based on the previous iteration's
  // milliseconds. That way there is a guarantee that the full nanoseconds are always going to be
  // increasing at least and that the microsecond and nanosecond fields are likely to be non-zero.
  SystemUTCEpochNanoSeconds: (() => {
    let ns = Date.now() % 1e6;
    return () => {
      const ms = Date.now();
      const result = bigInt(ms).multiply(1e6).plus(ns);
      ns = ms % 1e6;
      return bigInt.min(NS_MAX, bigInt.max(NS_MIN, result));
    };
  })(),
  SystemTimeZone: () => {
    const fmt = new IntlDateTimeFormat('en-us');
    const TemporalTimeZone = GetIntrinsic('%Temporal.TimeZone%');
    return new TemporalTimeZone(ES.TemporalTimeZoneFromString(fmt.resolvedOptions().timeZone));
  },
  ComparisonResult: (value) => (value < 0 ? -1 : value > 0 ? 1 : value),
  GetOptionsObject: (options) => {
    if (options === undefined) return ObjectCreate(null);
    if (ES.Type(options) === 'Object') return options;
    throw new TypeError(
      `Options parameter must be an object, not ${options === null ? 'null' : `a ${typeof options}`}`
    );
  },
  GetOption: (options, property, allowedValues, fallback) => {
    let value = options[property];
    if (value !== undefined) {
      value = ES.ToString(value);
      if (!allowedValues.includes(value)) {
        throw new RangeError(`${property} must be one of ${allowedValues.join(', ')}, not ${value}`);
      }
      return value;
    }
    return fallback;
  },
  GetNumberOption: (options, property, minimum, maximum, fallback) => {
    let value = options[property];
    if (value === undefined) return fallback;
    value = ES.ToNumber(value);
    if (NumberIsNaN(value) || value < minimum || value > maximum) {
      throw new RangeError(`${property} must be between ${minimum} and ${maximum}, not ${value}`);
    }
    return MathFloor(value);
  }
});

const OFFSET = new RegExp(`^${PARSE.offset.source}$`);

function bisect(getState, left, right, lstate = getState(left), rstate = getState(right)) {
  left = bigInt(left);
  right = bigInt(right);
  while (right.minus(left).greater(1)) {
    let middle = left.plus(right).divide(2);
    const mstate = getState(middle);
    if (mstate === lstate) {
      left = middle;
      lstate = mstate;
    } else if (mstate === rstate) {
      right = middle;
      rstate = mstate;
    } else {
      throw new Error(`invalid state in bisection ${lstate} - ${mstate} - ${rstate}`);
    }
  }
  return right;
}

const nsPerTimeUnit = {
  hour: 3600e9,
  minute: 60e9,
  second: 1e9,
  millisecond: 1e6,
  microsecond: 1e3,
  nanosecond: 1
};
