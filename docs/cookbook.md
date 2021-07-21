# Temporal Cookbook

## Overview

<!-- toc -->

## Running the cookbook files

Running cookbook files: see instructions in [../polyfill/README.md](https://github.com/tc39/proposal-temporal/tree/main/polyfill#running-cookbook-files)

## Frequently Asked Questions

These are some of the most common tasks that people ask questions about on StackOverflow with legacy Date.
Here's how they would look using Temporal.

### Current date and time

How to get the current date and time in the local time zone?

```javascript
{{cookbook/getCurrentDate.mjs}}
```

Note that if you just want the date and not the time, you should use `Temporal.PlainDate`.
If you want both, use `Temporal.PlainDateTime`.

### Unix timestamp

How to get a Unix timestamp?

```javascript
{{cookbook/getTimeStamp.mjs}}
```

## Converting between Temporal types and legacy Date

### Instant from legacy Date

Map a legacy ECMAScript Date instance into a Temporal.Instant instance corresponding to the same instant in exact time.

```javascript
{{cookbook/instantFromLegacyDate.mjs}}
```

## Construction

### Time zone object from name

`Temporal.TimeZone.from()` can convert an IANA time zone name into a `Temporal.TimeZone` object.

```javascript
{{cookbook/getTimeZoneObjectFromIanaName.mjs}}
```

### Calendar input element

You can use Temporal objects to set properties on a calendar control.
Here is an example using an HTML `<input type="date">` element with any day beyond “today” disabled and not selectable.

<input type="date" id="calendar-input">

<script type="text/javascript">
{
{{cookbook/calendarInput.js}}
}
</script>

```javascript
{{cookbook/calendarInput.js}}
```

## Converting between types

### Noon on a particular date

An example of combining a calendar date (`Temporal.PlainDate`) and a wall-clock time (`Temporal.PlainTime`) into a `Temporal.PlainDateTime`.

```javascript
{{cookbook/noonOnDate.mjs}}
```

### Birthday in 2030

An example of combining a day on the calendar (`Temporal.PlainMonthDay`) and a year into a `Temporal.PlainDate`.

```javascript
{{cookbook/birthdayIn2030.mjs}}
```

## Serialization

### Zoned instant from instant and time zone

To serialize an exact-time Temporal.Instant into a string, use `toString()`.
Without any arguments, this gives you a string in UTC time.

If you need your string to include a UTC offset, then use the `timeZone` option of `Temporal.Instant.prototype.toString()` which will return a string serialization of the wall-clock time in that time zone corresponding to the exact time.

This loses the information about which time zone the string was in, because it only preserves the UTC offset from the time zone at that particular exact time.
If you need your string to include the time zone name, use Temporal.ZonedDateTime instead, which retains this information.

```javascript
{{cookbook/getParseableZonedStringAtInstant.mjs}}
```

## Sorting

Each Temporal type has a `compare()` static method, which can be passed to `Array.prototype.sort()` as the compare function in order to sort an array of Temporal types.

### Sort DateTimes

Sort a list of `Temporal.PlainDateTime`s, for example in order to get a conference schedule in the correct order.
Sorting other Temporal types would work exactly the same way as this.

```javascript
{{cookbook/getSortedLocalDateTimes.mjs}}
```

### Sort ISO date/time strings

Sort a list of ISO 8601 date/time strings, for example to place log entries in order.

```javascript
{{cookbook/sortExactTimeStrings.mjs}}
```

## Rounding

### Round a time down to whole hours

Use the `round()` method of each Temporal type if you want to round the time fields.
Here's an example of rounding a time _down_ to the previously occurring whole hour:

```javascript
{{cookbook/roundDownToWholeHours.mjs}}
```

### Round a date to the nearest start of the month

Rounding is only defined for time fields.
Rounding a date field can be ambiguous, so date-only types such as `Temporal.PlainDate` don't have a `round()` method.
If you need to round a date to the nearest month, for example, then you must explicitly pick what kind of rounding you want.
Here is an example of rounding to the nearest start of a month, rounding up in case of a tie:

```javascript
{{cookbook/roundToNearestMonth.mjs}}
```

See also [Push back a launch date](#push-back-a-launch-date) for an easier way to round up unconditionally to the _next_ start of a month.

## Time zone conversion

### Preserving local time

Map a zoneless date and time of day into a `Temporal.Instant` instance at which the local date and time of day in a specified time zone matches it.
This is easily done with `dateTime.toZonedDateTime(timeZone).toInstant()`, but here is an example of implementing different disambiguation behaviors than the `'compatible'`, `'earlier'`, `'later'`, and `'reject'` ones built in to Temporal.

```javascript
{{cookbook/getInstantWithLocalTimeInZone.mjs}}
```

### Preserving exact time

Map a zoned date and time of day into another zoned date and time of day in a target time zone at the corresponding exact time.
This could be used when converting user-input date-time values between time zones.

```javascript
{{cookbook/zonedDateTimeInOtherZone.mjs}}
```

Here is another example similar to the previous one, using the time zone for future events.
The times and locations of a series of future meetings are stored as a pair of strings: one for the calendar date and wall-clock time, and one for the time zone.
They cannot be stored as an exact time because between now and the time when the event happens, the time zone rules for daylight saving time could change &mdash; for example, Brazil abolished daylight saving time in 2019 &mdash; but the meeting would still be held at the same wall-clock time on that date.
So if the time zone rules changed, the event's exact time would change.

This example calculates the starting times of all the Ecma TC39 meetings in 2019, in local time in Tokyo.

```javascript
{{cookbook/localTimeForFutureEvents.mjs}}
```

### Daily occurrence in local time

Similar to the previous recipe, calculate the exact times of a daily occurrence that happens at a particular local time in a particular time zone.

```javascript
{{cookbook/calculateDailyOccurrence.mjs}}
```

### UTC offset for a zoned event, as a string

Use `Temporal.TimeZone.getOffsetStringFor()` or `Temporal.ZonedDateTime.offset` to map a `Temporal.Instant` instance and a time zone into the UTC offset at that exact time in that time zone, as a string.

```javascript
{{cookbook/getUtcOffsetStringAtInstant.mjs}}
```

### UTC offset for a zoned event, as a number of seconds

Similarly, use `Temporal.TimeZone.getOffsetNanosecondsFor()` to do the same thing for the offset as a number of seconds.
(Remember to divide by 10<sup>9</sup> to convert nanoseconds to seconds.)

```javascript
{{cookbook/getUtcOffsetSecondsAtInstant.mjs}}
```

### Offset between two time zones at an exact time

Also using `Temporal.TimeZone.getOffsetNanosecondsFor()`, we can map a `Temporal.Instant` instance and two time zones into the signed difference of UTC offsets between those time zones at that exact time, as a number of seconds.

```javascript
{{cookbook/getUtcOffsetDifferenceSecondsAtInstant.mjs}}
```

### Dealing with dates and times in a fixed location

Here is an example of Temporal used in a graph, showing fictitious activity for a storage tank in a fixed location (Stockholm, Sweden).
The graph always starts at midnight in the tank's location, but the graph labels are in the viewer's time zone.

<script src="https://cdn.jsdelivr.net/npm/chart.js@2.9.3/dist/Chart.min.js"></script>

<canvas id="storage-tank" width="600" height="400"></canvas>

<script type="text/javascript">
{
// Generate fictitious "data"
const start = Temporal.Now.instant().subtract({ hours: 24 });
const blank = Array(24 * 12);
const tankDataX = Array.from(blank, (_, ix) => start.add({ minutes: ix * 5 }));
const tankDataY = Array.from(blank);
tankDataY[0] = 25;
for (let ix = 1; ix < tankDataY.length; ix++) {
  tankDataY[ix] = Math.max(0, tankDataY[ix - 1] + 3 * (Math.random() - 0.5));
}

{{cookbook/storageTank.js}}
}
</script>

```javascript
{{cookbook/storageTank.js}}
```

### Book a meeting across time zones

Across the web there are several tools for finding meeting times that are appropriate for all the participants' time zones, such as [World Time Buddy](https://www.worldtimebuddy.com/), [World Clock Meeting Planner](https://www.timeanddate.com/worldclock/meeting.html), and built into various calendar software.

<style>
  #meeting-planner {
    border-collapse: separate;
    border-spacing: 0 10px;
    font-size: 0.6rem;
    text-align: center;
  }

  /* https://materializecss.com/color.html */
  .time-0, .time-1, .time-2, .time-3, .time-4, .time-5,
  .time-22, .time-23 {
    background-color: #ef9a9a;  /* red lighten-3 */
    border-color: #e57373;  /* red lighten-2 */
    border-style: solid;
    border-width: 0 1px;
  }
  .time-6, .time-7, .time-18, .time-19, .time-20, .time-21 {
    background-color: #fff59d;  /* yellow lighten-3 */
    border-color: #ffd54f;  /* amber lighten-2 */
    border-style: solid;
    border-width: 0 1px;
  }
  .time-8, .time-9, .time-10, .time-11, .time-12, .time-13,
  .time-14, .time-15, .time-16, .time-17 {
    background-color: #a5d6a7;  /* green lighten-3 */
    border-color: #81c784;  /* green lighten-2 */
    border-style: solid;
    border-width: 0 1px;
  }

  .time-0 {
    border-bottom-left-radius: 12px;
    border-left-color: white;
    border-left-width: 2px;
    border-top-left-radius: 12px;
    font-weight: bold;
  }
  .time-23 {
    border-bottom-right-radius: 12px;
    border-right-color: white;
    border-right-width: 2px;
    border-top-right-radius: 12px;
  }

  .time-current {
    border: 2px solid black;
  }
</style>

<table id="meeting-planner">
</table>

<script type="text/javascript" id="meeting-planner-source">
{
{{cookbook/meetingPlanner.js}}
}
</script>

```javascript
{{cookbook/meetingPlanner.js}}
```

## Arithmetic

### How many days until a future date

An example HTML form inspired by [Days Calculator](https://www.timeanddate.com/date/durationresult.html) on timeanddate.com:

<form action="#how-many-days-until-a-future-date">
  <label>
    Enter future date:
    <input type="date" name="futuredate">
  </label>
  <button>Submit</button>
</form>

<div id="futuredate-results"></div>

<script type="text/javascript">
{
  // Do initialization that doesn't necessarily need to be included in
  // the example; see 'Calendar input element'
  const futureDatePicker = document.querySelector('input[name="futuredate"]');
  const browserCalendar = new Intl.DateTimeFormat().resolvedOptions().calendar;
  const today = Temporal.Now.plainDate(browserCalendar);
  futureDatePicker.min = today;
  futureDatePicker.value = today.add({ months: 1 });

{{cookbook/futureDateForm.js}}
}
</script>

```javascript
{{cookbook/futureDateForm.js}}
```

### Unit-constrained duration between now and a past/future zoned event

Take the difference between two Temporal.Instant instances as a Temporal.Duration instance (positive or negative), representing the duration between the two instants without using units coarser than specified (e.g., for presenting a meaningful countdown with vs. without using months or days).

```javascript
{{cookbook/getElapsedDurationSinceInstant.mjs}}
```

### Nearest offset transition in a time zone

Map a Temporal.Instant instance and a Temporal.TimeZone object into a Temporal.Instant instance representing the nearest following exact time at which there is an offset transition in the time zone (e.g., for setting reminders).

```javascript
{{cookbook/getInstantOfNearestOffsetTransitionToInstant.mjs}}
```

### Comparison of an exact time to business hours

This example takes a roster of wall-clock opening and closing times for a business, and maps an exact time into a time-sensitive state indicator ("opening soon" vs. "open" vs. "closing soon" vs. "closed").

```javascript
{{cookbook/getBusinessOpenStateText.mjs}}
```

### Flight arrival/departure/duration

Map localized trip departure and arrival times into trip duration in units no larger than hours.
(By default, differences between ZonedDateTime instances are exact differences in time units.)

```javascript
{{cookbook/getTripDurationInHrMinSec.mjs}}
```

Given a departure time with time zone and a flight duration, get an arrival time in the destination time zone, using time zone-aware math.

```javascript
{{cookbook/getLocalizedArrival.mjs}}
```

### Push back a launch date

Add the number of days it took to get an approval, and advance to the start of the following month.

```javascript
{{cookbook/plusAndRoundToMonthStart.mjs}}
```

### Schedule a reminder ahead of matching a record-setting duration

When considering a record (for example, a personal-best time in a sport), you might want to receive an alert just before the record is about to be broken.
This example takes a record as a `Temporal.Duration`, the starting exact time of the current attempt as a `Temporal.Instant`, and another `Temporal.Duration` indicating how long before the potentially record-setting exact time you would like to receive an alert.
It returns the exact time at which a notification could be sent, for example "Keep going! 5 more minutes and it will be your personal best!"

This could be used for workout tracking, racing (including _long_ and potentially time-zone-crossing races like the Bullrun Rally, Iditarod, Self-Transcendence 3100, and Clipper Round The World), or even open-ended analogs like event-every-day "streaks".

```javascript
{{cookbook/getInstantBeforeOldRecord.mjs}}
```

### Nth weekday of the month

Example of getting a `Temporal.PlainDate` representing the first Tuesday of the given `Temporal.PlainYearMonth`, adaptable to other weekdays.

```javascript
{{cookbook/getFirstTuesdayOfMonth.mjs}}
```

Given a `Temporal.PlainYearMonth` instance and an ISO 8601 ordinal calendar day of the week ranging from 1 (Monday) to 7 (Sunday), return a chronologically ordered array of `Temporal.PlainDate` instances corresponding with every day in the month that is the specified day of the week (of which there will always be either four or five).

```javascript
{{cookbook/getWeeklyDaysInMonth.mjs}}
```

Given a `Temporal.PlainDate` instance, return the count of preceding days in its month that share its day of the week.

```javascript
{{cookbook/countPrecedingWeeklyDaysInMonth.mjs}}
```

### Manipulating the day of the month

Here are some examples of taking an existing date, and adjusting the day of the month.

```javascript
{{cookbook/adjustDayOfMonth.mjs}}
```

### Same date in another month

Likewise, here are some examples of taking an existing date and adjusting the month, but keeping the day and year the same.

Depending on the behaviour you want, you will need to pick the right `overflow` option, but the default of `"constrain"` should be correct for most cases.

```javascript
{{cookbook/adjustMonth.mjs}}
```

### Next weekly occurrence

From a `Temporal.ZonedDateTime` instance, get a `Temporal.ZonedDateTime` representing the next occurrence of a weekly event that is scheduled on a particular weekday and time in a particular time zone. (For example, "weekly on Thursdays at 08:45 California time").

```javascript
{{cookbook/nextWeeklyOccurrence.mjs}}
```

### Weekday of yearly occurrence

In some countries, when a public holiday falls on a Tuesday or Thursday, an extra "bridge" public holiday is observed on Monday or Friday in order to give workers a long weekend off.
The following example calculates this.

```javascript
{{cookbook/bridgePublicHolidays.mjs}}
```

## Advanced use cases

These are not expected to be part of the normal usage of Temporal, but show some unusual things that can be done with Temporal.
Since they are generally larger than these cookbook recipes, they're on their own pages.

### Extra-expanded years

Extend Temporal to support arbitrarily-large years (e.g., **+635427810-02-02**) for astronomical purposes.

→ [Extra-expanded years](cookbook-expandedyears.md)

### New York Stock Exchange time zone

An example of using `Temporal.TimeZone` for other purposes than a standard time zone.

→ [NYSE time zone](cookbook-nyse.md)

### Time zone directly from tzdata rules

An example of building your own `Temporal.TimeZone` object from [tzdata-compatible rules](https://data.iana.org/time-zones/tz-how-to.html).

→ [Time zone from tzdata](cookbook-tzdata.md)
