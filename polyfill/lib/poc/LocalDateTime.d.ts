import { Temporal } from '../..';
export declare type LocalDateTimeLike = Temporal.DateTimeLike & {
  /**`Temporal.TimeZone`, IANA time zone identifier, or offset string */
  timeZone?: Temporal.TimeZone | string;
  /**`Temporal.Absolute` or ISO "Z" string */
  absolute?: Temporal.Absolute | string;
  /** Enables `from` using only local time values */
  timeZoneOffsetNanoseconds?: number;
};
declare type LocalDateTimeFields = ReturnType<Temporal.DateTime['getFields']> & {
  timeZone: Temporal.TimeZone;
  absolute: Temporal.Absolute;
};
declare type LocalDateTimeISOCalendarFields = ReturnType<Temporal.DateTime['getISOCalendarFields']> & {
  timeZone: Temporal.TimeZone;
  absolute: Temporal.Absolute;
};
/**
 * The `durationKind` option allows users to customize how calculations behave
 * when days aren't exactly 24 hours long. This occurs on days when Daylight
 * Savings Time (DST) starts or ends, or when a country or region legally
 * changes its time zone offset.
 *
 * Choices are:
 * - `'absolute'` - Days are treated as 24 hours long, even if there's a
 *   change in local timezone offset. Math is performed on the underlying
 *   Absolute timestamp and then local time fields are refreshed to match the
 *   updated timestamp.
 * - `'dateTime'` - Day length will vary according to time zone offset changes
 *   like DST transitions. Math is performed on the calendar date and clock
 *   time, and then the Absolute timestamp is refreshed to match the new
 *   calendar date and clock time.
 * - `'hybrid'` - Math is performed by using `'absolute'` math on the time
 *   portion, and `'dateTime'` math on the date portion.
 *
 * Days are almost always 24 hours long, these options produce identical
 * results if the time zone offset of the endpoint matches the time zone offset
 * of the original LocalDateTime. But they may return different results if
 * there's a time zone offset change like a DST transition.
 *
 * For `plus` and `minus` operations the default is `'hybrid'` which matches
 * most users' expectations:
 * - Adding or subtracting whole days should keep clock time unchanged, even
 *   if a DST transition happens. For example: "Postpone my 6:00PM dinner by 7
 *   days, but make sure that the time stays 6:00PM, not 5:00PM or 7:00PM if
 *   DST starts over the weekend."
 * - Adding or removing time should ignore DST changes. For example: "Meet me
 *   at the party in 2 hours, not 1 hour or 3 hours if DST starts tonight".
 *
 * The default is also `'hybrid'` for `difference` operations. In this case,
 * typical users expect that short durations that span a DST boundary
 * are measured using real-world durations, while durations of one day or longer
 * are measured by default using calendar days and clock time. For example:
 * - 1:30AM -> 4:30AM on the day that DST starts is "2 hours", because that's
 *   how much time elapsed in the real word despite a 3-hour difference on the
 *   wall clock.
 * - 1:30AM on the day DST starts -> next day 1:30AM is "1 day" even though only
 *   23 hours have elapsed in the real world.
 *
 * To support these expectations, `'hybrid'` for `difference` works as follows:
 * - If `hours` in clock time is identical at start and end, then an integer
 *   number of days is reported with no `hours` remainder, even if there was a
 *   DST transition in between.
 * - Otherwise, periods of 24 or more real-world hours are reported using clock
 *   time, while periods less than 24 hours are reported using elapsed time.
 */
export interface DurationKindOptions {
  durationKind: 'absolute' | 'dateTime' | 'hybrid';
}
/**
 * For `compare` operations, the default is `'absolute'` because sorting
 * almost always is based on the actual instant that something happened in the
 * real world, even during unusual periods like the hour before and after DST
 * ends where the same clock hour is replayed twice in the real world. During
 * that period, an earlier clock time like "2:30AM Pacific Standard Time" is
 * actually later in the real world than "2:15AM Pacific Daylight Time" which
 * was 45 minutes earlier in the real world but 15 minutes later according to
 * a wall clock. To sort by wall clock times instead, use `'dateTime'`. (`'hybrid'`
 * is not needed nor available for `compare` operations.)
 */
export interface CompareCalculationOptions {
  calculation: 'absolute' | 'dateTime';
}
export interface OverflowOptions {
  /**
   * How to deal with out-of-range values
   *
   * - In `'constrain'` mode, out-of-range values are clamped to the nearest
   *   in-range value.
   * - In `'reject mode'`, out-of-range values will cause the function to throw
   *   a RangeError.
   *
   * The default is `'constrain'`.
   */
  overflow: 'constrain' | 'reject';
}
/**
 * Time zone definitions can change. If an application stores data about events
 * in the future, then stored data about future events may become ambiguous, for
 * example if a country permanently abolishes DST. The `offset` option controls
 * this unusual case.
 *
 * - `'use'` always uses the offset (if it's provided) to calculate the absolute
 *   time. This ensures that the result will match the absolute time that was
 *   originally stored, even if local clock time is different.
 * - `'prefer'` uses the offset if it's valid for the date/time in this time
 *   zone, but if it's not valid then the time zone will be used as a fallback
 *   to calculate the absolute time.
 * -  `'ignore'` will disregard any provided offset. Instead, the time zone and
 *    date/time value are used to calculate the absolute time. This will keep
 *    local clock time unchanged but may result in a different real-world
 *    instant.
 * - `'reject'` acts like `'prefer'`, except it will throw a RangeError if the
 *   offset is not valid for the given time zone identifier and date/time value.
 *
 * If a time zone offset is not present in the input, then this option is
 * ignored.
 *
 * If the offset is not used, and if the date/time and time zone don't uniquely
 * identify a single absolute time, then the `disambiguation` option will be
 * used to choose the correct absolute time. However, if the offset is used
 * then the `disambiguation` option will be ignored.
 */
export interface TimeZoneOffsetDisambiguationOptions {
  offset: 'use' | 'prefer' | 'ignore' | 'reject';
}
export declare type LocalDateTimeAssignmentOptions = Partial<
  OverflowOptions & Temporal.ToAbsoluteOptions & TimeZoneOffsetDisambiguationOptions
>;
export declare type LocalDateTimeMathOptions = Partial<
  DurationKindOptions & Temporal.ToAbsoluteOptions & OverflowOptions
>;
export declare type LocalDateTimeDifferenceOptions = Partial<
  Temporal.DifferenceOptions<'years' | 'months' | 'weeks' | 'days' | 'hours' | 'minutes' | 'seconds'> &
    DurationKindOptions &
    Temporal.ToAbsoluteOptions
>;
export declare class LocalDateTime {
  private _abs;
  private _tz;
  private _dt;
  /**
   * Construct a new `Temporal.LocalDateTime` instance from an absolute
   * timestamp, time zone, and optional calendar.
   *
   * To construct a `Temporal.LocalDateTime` from an ISO 8601 string a
   * `DateTime` and time zone, use `.from()`.
   *
   * @param absolute {Temporal.Absolute} - absolute timestamp for this instance
   * @param timeZone {Temporal.TimeZone} - time zone for this instance
   * @param [calendar=Temporal.Calendar.from('iso8601')] {Temporal.CalendarProtocol} -
   * calendar for this instance (defaults to ISO calendar)
   */
  constructor(absolute: Temporal.Absolute, timeZone: Temporal.TimeZone, calendar?: Temporal.CalendarProtocol);
  /**
   * Build a `Temporal.LocalDateTime` instance from one of the following:
   * - Another LocalDateTime instance, in which case the result will deep-clone
   *   the input.
   * - A "LocalDateTime-like" object with a `timeZone` field and either an
   *   `absolute` field OR `year`, `month`, and `day` fields. All non-required
   *   `Temporal.LocalDateTime` fields are accepted too, with the caveat that
   *   fields must be consistent. For example, if an object with `absolute` and
   *   `hours` is provided, then the `hours` value must match the `absolute` in
   *   the given time zone. Note: if neither `absolute` nor
   *   `timeZoneOffsetNanoseconds` are provided, then the time can be ambiguous
   *   around DST transitions.  The `disambiguation` option can resolve this
   *   ambiguity.
   * - An extended ISO 8601 string that includes a time zone identifier, e.g.
   *   `2007-12-03T10:15:30+01:00[Europe/Paris]`. If a timezone offset is not
   *   present, then the `disambiguation` option will be used to resolve any
   *   ambiguity. Note that an ISO string ending in "Z" (a UTC time) will not be
   *   accepted via a string parameter. Instead, the caller must explicitly
   *   opt-in to UTC using the object form `{absolute: isoString, timeZone:
   *   'utc'}`
   * - An object that can be converted to the string format above.
   *
   * If the input contains both a time zone offset and a time zone, in rare
   * cases it's possible for those values to conflict for a particular local
   * date and time. For example, this could happen for future summertime events
   * that were stored before a country permanently abolished DST. If the time
   * zone and offset are in conflict, then the `offset` option is used to
   * resolve the conflict.
   *
   * Available options:
   * ```
   * disambiguation?: 'compatible' (default) |  'earlier' | 'later' | 'reject'
   * overflow?: 'constrain' (default) | 'reject'
   * offset?: 'use' (default) | 'prefer' | 'ignore' | 'reject'
   * ```
   */
  static from(
    item: LocalDateTimeLike | string | Record<string, unknown>,
    options?: LocalDateTimeAssignmentOptions
  ): LocalDateTime;
  /**
   * Merge fields into an existing `Temporal.LocalDateTime`. The provided `item`
   * is a "LocalDateTime-like" object. Accepted fields include:
   * - All `Temporal.DateTime` fields, including `calendar`
   * - `timeZone` as a time zone identifier string like `Europe/Paris` or a
   *    `Temporal.TimeZone` instance
   * - `absolute` as an ISO 8601 string ending in "Z" or an `Temporal.Absolute`
   *   instance
   * - `timezoneOffsetNanoseconds`
   *
   * If the `absolute` field is included, all other input fields must be
   * consistent with this value or this method will throw.
   *
   * If the `timeZone` field is included, `with` will first convert all existing
   * fields to the new time zone and then fields in the input will be played on
   * top of the new time zone. Therefore, `.with({timeZone})` is an easy way to
   * convert to a new time zone while updating the clock time.  However, to keep
   * clock time as-is while resetting the time zone, the current fields must be
   * spread into the new time zone. Examples:
   * ```
   * const sameInstantInOtherTz = ldt.with({timeZone: 'Europe/London'});
   * const newTzSameLocalTime = ldt.with({...ldt.getFields(), timeZone: 'Europe/London'});
   * ```
   *
   * If the `timezoneOffsetNanoseconds` field is provided, then it's possible
   * for it to conflict with the input object's `timeZone` property or, if
   * omitted, the object's existing time zone.  The `offset` option (which
   * defaults to `'prefer'`) will resolve the conflict. However, if both
   * `absolute` and `timezoneOffsetNanoseconds` fields are included and they
   * conflict, then a `RangeError` will be thrown.
   *
   * If the `timezoneOffsetNanoseconds` field is not provided, but the
   * `absolute` nor the `timeZone` fields are not provided either, then the
   * existing `timezoneOffsetNanoseconds` field will be used by `with` as if it
   * had been provided by the caller. By default, this will prefer the existing
   * offset when resolving ambiguous results. For example, if a
   * `Temporal.LocalDateTime` is set to the "second" 1:30AM on a day where the
   * 1-2AM clock hour is repeated after a backwards DST transition, then calling
   * `.with({minute: 45})` will result in an ambiguity which is resolved using
   * the default `offset: 'prefer'` option. Because the existing offset is valid
   * for the new time, it will be retained so the result will be the "second"
   * 1:45AM.  However, if the existing offset is not valid for the new result
   * (e.g. `.with({hour: 0})`), then the offset will be changed.
   *
   * Available options:
   * ```
   * disambiguation?: 'compatible' (default) |  'earlier' | 'later' | 'reject'
   * overflow?: 'constrain' (default) | 'reject'
   * offset?: 'use' | 'prefer' (default) | 'ignore' | 'reject'
   * ```
   */
  with(localDateTimeLike: LocalDateTimeLike, options?: LocalDateTimeAssignmentOptions): LocalDateTime;
  /**
   * Get a new `Temporal.LocalDateTime` instance that uses a specific calendar.
   *
   * Developers using only the default ISO 8601 calendar will probably not need
   * to call this method.
   *
   * @param [calendar=Temporal.Calendar.from('iso8601')]
   * {Temporal.CalendarProtocol} -
   */
  withCalendar(calendar: Temporal.CalendarProtocol): LocalDateTime;
  /**
   * Returns the absolute timestamp of this `Temporal.LocalDateTime` instance as
   * a `Temporal.Absolute`.
   *
   * It's a `get` property (not a `getAbsolute()` method) to support
   * round-tripping via `getFields` and `with`.
   *
   * Although this property is a `Temporal.Absolute` object, `JSON.stringify`
   * will automatically convert it to a JSON-friendly ISO 8601 string (ending in
   * `Z`) when persisting to JSON.
   */
  get absolute(): Temporal.Absolute;
  /**
   * Returns the `Temporal.TimeZone` representing this object's time zone.
   *
   * Although this property is a `Temporal.TimeZone` object, `JSON.stringify`
   * will automatically convert it to a JSON-friendly IANA time zone identifier
   * string (e.g. `'Europe/Paris'`) when persisting to JSON.
   */
  get timeZone(): Temporal.TimeZone;
  /**
   * Returns the `Temporal.Calendar` for this `Temporal.LocalDateTime` instance.
   *
   * ISO 8601 (the Gregorian calendar with a specific week numbering scheme
   * defined) is the default calendar.
   *
   * Although this property is a `Temporal.Calendar` object, `JSON.stringify`
   * will automatically convert it to a JSON-friendly calendar ID string IANA
   * time zone identifier string (e.g. `'iso8601'` or `'japanese'`) when
   * persisting to JSON.
   */
  get calendar(): Temporal.CalendarProtocol;
  /**
   * Returns the String representation of this `Temporal.LocalDateTime` in ISO
   * 8601 format extended to include the time zone.
   *
   * Example: `2011-12-03T10:15:30+01:00[Europe/Paris]`
   *
   * If the calendar is not the default ISO 8601 calendar, then it will be
   * appended too. Example: `2011-12-03T10:15:30+09:00[Asia/Tokyo][c=japanese]`
   */
  toDateTime(): Temporal.DateTime;
  /**
   * Returns the number of real-world hours between midnight of the current day
   * until midnight of the next calendar day. Normally days will be 24 hours
   * long, but on days where there are DST changes or other time zone
   * transitions, this duration may be 23 hours or 25 hours. In rare cases,
   * other integers or even non-integer values may be returned, e.g. when time
   * zone definitions change by less than one hour.
   *
   * If a time zone offset transition happens exactly at midnight, the
   * transition will be counted as part of the previous day's length.
   *
   * Note that transitions that skip entire days (like the 2011
   * [change](https://en.wikipedia.org/wiki/Time_in_Samoa#2011_time_zone_change)
   * of `Pacific/Apia` to the opposite side of the International Date Line) will
   * return `24` because there are 24 real-world hours between one day's
   * midnight and the next day's midnight.
   */
  get hoursInDay(): number;
  /**
   * True if this `Temporal.LocalDateTime` instance falls exactly on a DST
   * transition or other change in time zone offset, false otherwise.
   *
   * To calculate if a DST transition happens on the same day (but not
   * necessarily at the same time), use `.getDayDuration()`.
   * */
  get isTimeZoneOffsetTransition(): boolean;
  /**
   * Offset (in nanoseconds) relative to UTC of the current time zone and
   * absolute instant.
   *
   * The value of this field will change after DST transitions or after legal
   * changes to a time zone, e.g. a country switching to a new time zone.
   *
   * Because this field is able to uniquely map a `Temporal.DateTime` to an
   * absolute date/time, this field is returned by `getFields()` and is accepted
   * by `from` and `with`.
   * */
  get timeZoneOffsetNanoseconds(): number;
  /**
   * Offset (as a string like `'+05:00'` or `'-07:00'`) relative to UTC of the
   * current time zone and absolute instant.
   *
   * This property is useful for custom formatting of LocalDateTime instances.
   *
   * This field cannot be passed to `from` and `with`.  Instead, use
   * `timeZoneOffsetNanoseconds`.
   * */
  get timeZoneOffsetString(): string;
  /**
   * Returns a plain object containing enough data to uniquely identify
   * this object.
   *
   * The resulting object includes all fields returned by
   * `Temporal.DateTime.prototype.getFields()`, as well as `timeZone`,
   * and `absolute`.
   *
   * The result of this method can be used for round-trip serialization via
   * `from()`, `with()`, or `JSON.stringify`.
   */
  getFields(): LocalDateTimeFields;
  /**
   * Method for internal use by non-ISO calendars. Normally not used.
   *
   * TODO: are calendars aware of `Temporal.LocalDateTime`?  If not, remove this
   * method.
   */
  getISOCalendarFields(): LocalDateTimeISOCalendarFields;
  /**
   * Compare two `Temporal.LocalDateTime` values.
   *
   * By default, comparison will use the absolute time because sorting is almost
   * always based on when events happened in the real world, but during the hour
   * before and after DST ends in the fall, sorting of clock time will not match
   * the real-world sort order.
   *
   * Available options:
   * ```
   * calculation?: 'absolute' (default) | 'dateTime'
   * ```
   */
  static compare(
    one: LocalDateTime,
    two: LocalDateTime,
    options?: CompareCalculationOptions
  ): Temporal.ComparisonResult;
  /**
   * Returns `true` if both the absolute timestamp and time zone are identical
   * to the other `Temporal.LocalDateTime` instance, and `false` otherwise. To
   * compare only the absolute timestamps and ignore time zones, use
   * `.absolute.compare()`.
   */
  equals(other: LocalDateTime): boolean;
  /**
   * Add a `Temporal.Duration` and return the result.
   *
   * By default, the `'hybrid'` calculation method will be used where dates will
   * be added using calendar dates while times will be added with absolute time.
   *
   * Available options:
   * ```
   * durationKind?: 'hybrid' (default) | 'absolute'  | 'dateTime'
   * disambiguation?: 'compatible' (default) |  'earlier' | 'later' | 'reject'
   * overflow?: 'constrain' (default) | 'reject'
   * ```
   */
  plus(durationLike: Temporal.DurationLike, options?: LocalDateTimeMathOptions): LocalDateTime;
  /**
   * Subtract a `Temporal.Duration` and return the result.
   *
   * By default, the `'hybrid'` calculation method will be used where dates will
   * be added using calendar dates while times will be subtracted with absolute
   * time.
   *
   * Available options:
   * ```
   * durationKind?: 'hybrid' (default) | 'absolute'  | 'dateTime'
   * disambiguation?: 'compatible' (default) |  'earlier' | 'later' | 'reject'
   * overflow?: 'constrain' (default) | 'reject'
   * ```
   */
  minus(durationLike: Temporal.DurationLike, options?: LocalDateTimeMathOptions): LocalDateTime;
  /**
   * Calculate the difference between two `Temporal.LocalDateTime` values and
   * return the `Temporal.Duration` result.
   *
   * The kind of duration returned depends on the `durationKind` option:
   * - `absolute` will calculate the difference using real-world elapsed time.
   * - `dateTime` will calculate the difference in clock time and calendar
   *   dates.
   * - By default, `'hybrid'` durations are returned because they usually match
   *   users' expectations that short durations are measured in real-world
   *   elapsed time that ignores DST transitions, while differences of calendar
   *   days are calculated by taking DST transitions into account.
   *
   * If `'hybrid'` is chosen but `largestUnit` is hours or less, then the
   * calculation will be the same as if `absolute` was chosen.
   *
   * However, if `'hybrid'` is used with `largestUnit` of `'days'` or larger,
   * then (as RFC 5545 requires) date differences will be calculated using
   * `dateTime` math which adjusts for DST, while the time remainder will be
   * calculated using real-world elapsed time. Examples:
   * - 2:30AM on the day before DST starts -> 3:30AM on the day DST starts =
   *   P1DT1H (even though it's only 24 hours of real-world elapsed time)
   * - 1:45AM on the day before DST starts -> "second" 1:15AM on the day DST
   *   ends = PT24H30M (because it hasn't been a full calendar day even though
   *   it's been 24.5 real-world hours).
   *
   * The `'disambiguation'` option is ony used if all of the following are true:
   * - `durationKind: 'hybrid'` is used.
   * - The difference between `this` and `other` is larger than one full
   *   calendar day.
   * - `this` and `other` have different clock times. If clock times are the
   *   same then an integer number of days will be returned.
   * - When the date portion of the difference is subtracted from `this`, the
   *   resulting local time is ambiguous (e.g. the repeated hour after DST ends,
   *   or the skipped hour after DST starts). If all of the above conditions are
   *   true, then the `'disambiguation'` option determines the
   *   `Temporal.Absolute` chosen for the end of the date portion. The time
   *   portion of the resulting duration will be calculated from that
   *   `Temporal.Absolute`.
   *
   * Calculations using `durationKind: 'absolute'` are limited to `largestUnit:
   * 'days'` or smaller units.  For larger units, use `'hybrid'` or
   * `'dateTime'`.
   *
   * If the other `Temporal.LocalDateTime` is in a different time zone, then the
   * same days can be different lengths in each time zone, e.g. if only one of
   * them observes DST. Therefore, a `RangeError` will be thrown if all of the
   * following conditions are true:
   * - `durationKind` is  `'hybrid'` or `'dateTime'`
   * - `largestUnit` is `'days'` or larger
   * - the two instances' time zones have different `name` fields.
   *
   * Here are commonly used alternatives for cross-timezone calculations:
   * - Use `durationKind: 'absolute'`, as long as it's OK if all days are
   *   assumed to be 24 hours long and DST is ignored.
   * - If you need weeks, months, or years in the result, or if you need to take
   *   DST transitions into account, transform one of the instances to the
   *   other's time zone using `.with({timeZone: other.timeZone})` and then
   *   calculate the same-timezone difference.
   * - To calculate with calendar dates only, use
   *   `.toDate().difference(other.toDate())`.
   * - To calculate with clock times only, use
   *   `.toTime().difference(other.toTime())`.
   *
   * Because of the complexity and ambiguity involved in cross-timezone
   * calculations, `hours` is the default for `largestUnit`.
   *
   * Available options:
   * ```
   * largestUnit: 'years' | 'months' | 'weeks' | 'days' | 'hours' (default) | 'minutes' | 'seconds'
   * durationKind?: 'hybrid' (default) | 'absolute'  | 'dateTime'
   * disambiguation?: 'compatible' (default) |  'earlier' | 'later' | 'reject'
   * ```
   */
  difference(other: LocalDateTime, options?: LocalDateTimeDifferenceOptions): Temporal.Duration;
  /**
   * Convert to a localized string.
   *
   * This works the same as `DateTime.prototype.toLocaleString`, except time
   * zone option is automatically set and cannot be overridden by the caller.
   */
  toLocaleString(locales?: string | string[], options?: Intl.DateTimeFormatOptions): string;
  /**
   * String representation of this `Temporal.LocalDateTime` in ISO 8601 format
   * extended to include the time zone.
   *
   * Example: `2011-12-03T10:15:30+01:00[Europe/Paris]`
   *
   * If the calendar is not the default ISO 8601 calendar, then it will be
   * appended too. Example: `2011-12-03T10:15:30+09:00[Asia/Tokyo][c=japanese]`
   */
  toJSON(): string;
  /**
   * String representation of this `Temporal.LocalDateTime` in ISO 8601 format
   * extended to include the time zone.
   *
   * Example: `2011-12-03T10:15:30+01:00[Europe/Paris]`
   *
   * If the calendar is not the default ISO 8601 calendar, then it will be
   * appended too. Example: `2011-12-03T10:15:30+09:00[Asia/Tokyo][c=japanese]`
   */
  toString(): string;
  get era(): string | undefined;
  get year(): number;
  get month(): number;
  get day(): number;
  get hour(): number;
  get minute(): number;
  get second(): number;
  get millisecond(): number;
  get microsecond(): number;
  get nanosecond(): number;
  get dayOfWeek(): number;
  get dayOfYear(): number;
  get weekOfYear(): number;
  get daysInYear(): number;
  get daysInMonth(): number;
  get isLeapYear(): boolean;
  toDate(): Temporal.Date;
  toYearMonth(): Temporal.YearMonth;
  toMonthDay(): Temporal.MonthDay;
  toTime(): Temporal.Time;
  valueOf(): never;
}
export {};
