const { Duration, Instant, PlainDate, PlainDateTime, PlainTime, TimeZone } = Temporal;
const utc = TimeZone.from('UTC');

// Utility functions ///////////////////////////////////////////////////////////

function formatOffsetString(offsetNs) {
  const sign = offsetNs < 0 ? '-' : '+';
  offsetNs = Math.abs(offsetNs);
  const nanoseconds = offsetNs % 1e9;
  const seconds = Math.floor(offsetNs / 1e9) % 60;
  const minutes = Math.floor(offsetNs / 60e9) % 60;
  const hours = Math.floor(offsetNs / 3600e9);

  const hourString = `${hours}`.padStart(2, '0');
  const minuteString = `${minutes}`.padStart(2, '0');
  const secondString = `${seconds}`.padStart(2, '0');
  let post = '';
  if (nanoseconds) {
    let fraction = `${nanoseconds}`.padStart(9, '0');
    while (fraction[fraction.length - 1] === '0') fraction = fraction.slice(0, -1);
    post = `:${secondString}.${fraction}`;
  } else if (seconds) {
    post = `:${secondString}`;
  }
  return `${sign}${hourString}:${minuteString}${post}`;
}

// Return a constant-offset time zone object, given a UTC offset in nanoseconds.
function timeZoneFromOffsetNs(offsetNs) {
  const string = formatOffsetString(offsetNs);
  return TimeZone.from(string);
}

function earlierOfTwoInstants(one, two) {
  return [one, two].sort(Instant.compare)[0];
}

// Load TimeZone rules data //////////////////////////////////////////////////

// Here's the data that we'll be parsing:
// (Taken from the example at https://data.iana.org/time-zones/tz-how-to.html)
const data = `\
#Rule NAME    FROM TO   TYPE IN  ON      AT   SAVE LETTER
Rule  Chicago 1920 only  -   Jun 13      2:00 1:00 D
Rule  Chicago 1920 1921  -   Oct lastSun 2:00 0    S
Rule  Chicago 1921 only  -   Mar lastSun 2:00 1:00 D
Rule  Chicago 1922 1966  -   Apr lastSun 2:00 1:00 D
Rule  Chicago 1922 1954  -   Sep lastSun 2:00 0    S
Rule  Chicago 1955 1966  -   Oct lastSun 2:00 0    S

#Rule NAME FROM TO   TYPE IN  ON        AT   SAVE LETTER/S
Rule  US   1918 1919  -   Mar lastSun  2:00  1:00 D
Rule  US   1918 1919  -   Oct lastSun  2:00  0    S
Rule  US   1942 only  -   Feb 9        2:00  1:00 W # War
Rule  US   1945 only  -   Aug 14      23:00u 1:00 P # Peace
Rule  US   1945 only  -   Sep 30       2:00  0    S
Rule  US   1967 2006  -   Oct lastSun  2:00  0    S
Rule  US   1967 1973  -   Apr lastSun  2:00  1:00 D
Rule  US   1974 only  -   Jan 6        2:00  1:00 D
Rule  US   1975 only  -   Feb 23       2:00  1:00 D
Rule  US   1976 1986  -   Apr lastSun  2:00  1:00 D
Rule  US   1987 2006  -   Apr Sun>=1   2:00  1:00 D
Rule  US   2007 max   -   Mar Sun>=8   2:00  1:00 D
Rule  US   2007 max   -   Nov Sun>=1   2:00  0    S

#Zone       NAME      STDOFF   RULES FORMAT [UNTIL]
Zone  America/Chicago -5:50:36 -       LMT  1883 Nov 18 12:09:24
                      -6:00    US      C%sT 1920
                      -6:00    Chicago C%sT 1936 Mar  1  2:00
                      -5:00    -       EST  1936 Nov 15  2:00
                      -6:00    Chicago C%sT 1942
                      -6:00    US      C%sT 1946
                      -6:00    Chicago C%sT 1967
                      -6:00    US      C%sT

# Rule  NAME  FROM  TO    -  IN   ON       AT    SAVE  LETTER/S
Rule    WS    2010  only  -  Sep  lastSun  0:00  1     -
Rule    WS    2011  only  -  Apr  Sat>=1   4:00  0     -
Rule    WS    2011  only  -  Sep  lastSat  3:00  1     -
Rule    WS    2012  max   -  Apr  Sun>=1   4:00  0     -
Rule    WS    2012  max   -  Sep  lastSun  3:00  1     -
# Zone  NAME        STDOFF    RULES  FORMAT   [UNTIL]
Zone Pacific/Apia   12:33:04  -      LMT      1892 Jul  5
                    -11:26:56 -      LMT      1911
                    -11:30    -      -1130    1950
                    -11:00    WS     -11/-10  2011 Dec 29 24:00
                     13:00    WS     +13/+14
`;

class TZDataRules {
  static MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  static WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  _rules = {};
  _zones = {};

  constructor(data) {
    this._load(data);
  }

  // Parse a "Zone" line (or a continuation of one) into a Zone entry, which
  // takes the form:
  // {
  //   // "standard" UTC offset for this zone during this time (excluding DST)
  //   stdoff: Temporal.Duration;
  //   // string identifier for the DST rules applying during this time
  //   rules: string | null;
  //   // local wall-clock time at which the next Zone entry takes effect
  //   until: Temporal.PlainDateTime | null;
  // }
  _parseZoneLine(line) {
    let [stdoff, rules, , ...until] = line.split(/\s+/);

    let sign = 1;
    if (stdoff.startsWith('-')) {
      sign = -1;
      stdoff = stdoff.slice(1);
    }
    let [hours, minutes, seconds = '0'] = stdoff.split(':');
    hours = +hours;
    minutes = +minutes;
    seconds = +seconds;
    let nanoseconds = 0;
    if (!Number.isInteger(seconds)) {
      const rounded = Math.floor(seconds);
      nanoseconds = (seconds - rounded) * 1e9;
      seconds = rounded;
    }
    stdoff = Duration.from({ hours, minutes, seconds, nanoseconds }).round({ largestUnit: 'hours' });
    if (sign === -1) stdoff = stdoff.negated();

    if (rules === '-') rules = null;

    if (until.length) {
      let [year, month = 'Jan', day = 1, time = ''] = until;
      year = +year;
      month = TZDataRules.MONTHS.indexOf(month) + 1;
      day = +day;
      let [hour = 0, minute = 0, second = 0] = time.split(':');
      hour = +hour;
      minute = +minute;
      second = +second;
      until = PlainDateTime.from({ year, month, day, hour, minute, second });
    } else {
      until = null;
    }

    return { stdoff, rules, until };
  }

  // Parse a Rule line into a DST rules entry, which takes the form:
  // {
  //   from: number;  // year
  //   to: number | null;  // year, or null means no ending year
  //   // month and day indicate the day every year in which the DST transition
  //   // takes place. for example, month: 10, day: 'lastSun' means "the last
  //   // Sunday of every October"
  //   month: number;  // 1-12
  //   day: number | string;  // day of the month, or special string
  //   time: Temporal.PlainTime;  // clock time at which transition takes place
  //   // usually "clock time" means local time, including the current DST. If
  //   // timeZone is 'standard', then it means standard local time, excluding
  //   // the current DST. If it's a Temporal.TimeZone, then the clock time is
  //   // in that time zone.
  //   timeZone: null | Temporal.TimeZone | 'standard';
  //   save: Temporal.Duration;  // DST shift that goes into effect
  // }
  _parseRuleLine(line) {
    let [, , from, to, , month, day, time, save] = line.split(/\s+/);

    from = +from;
    if (to === 'only') {
      to = from;
    } else if (to === 'max') {
      to = null;
    } else {
      to = +to;
    }
    month = TZDataRules.MONTHS.indexOf(month) + 1;
    if (!Number.isNaN(+day)) day = +day;
    let timeZone = null; // default is wall-clock time
    if (time.endsWith('u')) {
      timeZone = utc;
      time = time.slice(0, -1);
    }
    if (time.endsWith('s')) {
      timeZone = 'standard';
      time = time.slice(0, -1);
    }
    let [hour, minute] = time.split(':');
    hour = +hour;
    minute = +minute;
    time = PlainTime.from({ hour, minute });
    let [hours, minutes = 0] = save.split(':');
    hours = +hours;
    minutes = +minutes;
    save = Duration.from({ hours, minutes });

    return { from, to, month, day, time, timeZone, save };
  }

  _load(data) {
    let activeZone = null;
    const lines = data.split('\n');
    for (let line of lines) {
      // Strip comments
      const commentIndex = line.indexOf('#');
      if (commentIndex > -1) line = line.slice(0, commentIndex);

      // Skip blanks
      line = line.trim();
      if (line.length === 0) continue;

      // Zone records may span more than one line and are ended by a line with a
      // blank in the "until" position.
      // Rule records are just one line.
      if (activeZone) {
        const result = this._parseZoneLine(line);
        this._zones[activeZone].push(result);
        if (!result.until) activeZone = null;
      } else if (line.startsWith('Zone')) {
        const [, name, ...rest] = line.split(/\s+/);
        if (!(name in this._zones)) this._zones[name] = [];
        const result = this._parseZoneLine(rest.join(' '));
        this._zones[name].push(result);
        if (result.until) activeZone = name; // following lines belong to this zone
      } else if (line.startsWith('Rule')) {
        const [, name] = line.split(/\s+/);
        if (!(name in this._rules)) this._rules[name] = [];
        const result = this._parseRuleLine(line);
        this._rules[name].push(result);
      }
    }
  }

  validateID(id) {
    if (!(id in this._zones)) {
      throw new RangeError(`identifier ${id} not present in time zone data`);
    }
  }

  _getZoneRecord(id) {
    this.validateID(id);
    return this._zones[id];
  }

  // Return the Zone record in effect for the time zone `id` at time `time`.
  // If `time` is a Temporal.PlainDateTime, then it's treated as the clock time
  // in "standard time" (DST not in effect) in that time zone.
  getRuleSetInEffect(id, time) {
    for (const record of this._getZoneRecord(id)) {
      const { stdoff, until } = record;
      if (until === null) return record; // last line

      const stateEndsUTC = until.subtract(stdoff);
      const stateEndsInstant = utc.getInstantFor(stateEndsUTC);

      let instant = time;
      if (time instanceof PlainDateTime) {
        instant = utc.getInstantFor(time.subtract(stdoff));
      }

      if (Instant.compare(instant, stateEndsInstant) < 0) return record;
    }
  }

  // Return all the DST rules of `ruleSetID` that apply during the year `year`.
  // Returns an array of records of the following form:
  // {
  //   transitionDateTime: Temporal.PlainDateTime;
  //   save: Temporal.Duration;
  //   timeZone: null | Temporal.TimeZone | 'standard';
  // }
  // The array is sorted by `transitionDateTime`.
  // This is used for determining the next transition given a particular date.
  getDSTRules(ruleSetID, year) {
    const ruleSet = this._rules[ruleSetID];
    const result = [];
    for (const { from, to, month, day, time, timeZone, save } of ruleSet) {
      if (year < from || (to != null && year > to)) continue;

      let transitionDate;
      if (typeof day === 'string' && day.startsWith('last')) {
        const weekday = TZDataRules.WEEKDAYS.indexOf(day.slice(4)) + 1;
        const lastPossible = PlainDate.from({ year, month, day: 31 }, { disambiguation: 'constrain' });
        transitionDate = lastPossible.subtract({ days: (7 + lastPossible.dayOfWeek - weekday) % 7 });
      } else if (typeof day === 'string' && day.includes('>=')) {
        const split = day.split('>=');
        const weekday = TZDataRules.WEEKDAYS.indexOf(split[0]) + 1;
        const firstPossible = PlainDate.from({ year, month, day: +split[1] });
        transitionDate = firstPossible.add({ days: (7 + weekday - firstPossible.dayOfWeek) % 7 });
      } else {
        transitionDate = PlainDate.from({ year, month, day });
      }

      const transitionDateTime = transitionDate.toPlainDateTime(time);
      result.push({ transitionDateTime, save, timeZone });
    }
    return result.sort((a, b) => PlainDateTime.compare(a.transitionDateTime, b.transitionDateTime));
  }
}

// This is the custom time zone class that works exactly like a built-in
// Temporal.TimeZone but is generated from our custom time zone data.
class RulesTimeZone extends TimeZone {
  // Computing transitions is expensive, and due to the form of the data it's
  // easier to compute them forward than backward, so we cache them once they
  // are computed.
  // The array stores records of the form
  // {
  //   offset: number;  // total UTC offset in nanoseconds (including dstShift)
  //   dstShift: Temporal.Duration;  // daylight saving shift
  //   until: Temporal.Instant | null;  // time at which next state takes effect
  // }
  _cachedTransitions = [];
  _rules;
  _id;

  constructor(rules, id) {
    super('UTC');
    this._rules = rules;
    this._rules.validateID(id);
    this._id = id;
  }

  // Private helper methods ////////////////////////////////////////////////////

  // Computes the next UTC offset transition after `startingPoint`. This doesn't
  // cache anything.
  _computeNextTransition(startingPoint, prevOffsetNs, prevDSTShift) {
    const { stdoff, rules, until } = this._rules.getRuleSetInEffect(this._id, startingPoint);
    const stdoffNs = stdoff.total({ unit: 'nanoseconds' });

    const stdoffZone = timeZoneFromOffsetNs(stdoffNs);

    // no DST rules in effect?
    if (!rules) {
      // end of transitions?
      if (!until) return { offset: stdoffNs, until: null, dstShift: new Duration() };

      return { offset: stdoffNs, until: stdoffZone.getInstantFor(until), dstShift: new Duration() };
    }

    let dateTime = stdoffZone.getPlainDateTimeFor(startingPoint);
    let dstRules = this._rules.getDSTRules(rules, dateTime.year);

    let dstShift = prevDSTShift;
    for (const { transitionDateTime, save, timeZone } of dstRules) {
      if (PlainDateTime.compare(dateTime, transitionDateTime) < 0) {
        const offset = stdoff.add(dstShift).total({ unit: 'nanoseconds' });
        if (offset !== prevOffsetNs) {
          let transitionZone = timeZone;
          if (transitionZone === 'standard') transitionZone = stdoffZone;
          // default if no specific time zone given is wall-clock time
          if (!transitionZone) transitionZone = timeZoneFromOffsetNs(offset);
          let transitionInstant = transitionZone.getInstantFor(transitionDateTime);
          if (until !== null) {
            const ruleSetUntilInstant = transitionZone.getInstantFor(until);
            transitionInstant = earlierOfTwoInstants(transitionInstant, ruleSetUntilInstant);
          }
          return { offset, until: transitionInstant, dstShift };
        }
      }
      dstShift = save;
    }
    // If we get to this point, dateTime occurs after the last DST transition in
    // that calendar year. Try again with next year's transitions, unless this
    // standard offset ends during this calendar year.
    dateTime = dateTime.add({ years: 1 }).with({ month: 1, day: 1 });
    if (until && PlainDateTime.compare(dateTime, until) > 0) {
      const offset = stdoff.add(dstShift).total({ unit: 'nanoseconds' });
      const nextRuleSetBeginsInstant = stdoffZone.getInstantFor(until);
      const { stdoff: newStdoff } = this._rules.getRuleSetInEffect(this._id, nextRuleSetBeginsInstant);
      const newOffset = newStdoff.add(dstShift).total({ unit: 'nanoseconds' });
      if (offset !== newOffset) {
        return { offset, until: nextRuleSetBeginsInstant, dstShift };
      }
    }
    return this._computeNextTransition(stdoffZone.getInstantFor(dateTime), prevOffsetNs, dstShift);
  }

  // Computes whatever is the next transition after the last entry currently in
  // the cache, caches it, and returns it. (If there are no more transitions,
  // this returns the final one.)
  _computeNextTransitionCached() {
    let until = Instant.fromEpochSeconds(-1e8 * 86400);
    let offset = null;
    let dstShift = new Duration();
    if (this._cachedTransitions.length) {
      let lastEntry = this._cachedTransitions[this._cachedTransitions.length - 1];
      if (lastEntry.until === null) return lastEntry; // don't compute more transitions, they've ended
      ({ until, offset, dstShift } = lastEntry);
    }
    const result = this._computeNextTransition(until, offset, dstShift);
    this._cachedTransitions.push(result);
    return result;
  }

  // Returns the index into the cache for the DST state
  _getIndexOfStateApplyingTo(instant) {
    const stateIndex = this._cachedTransitions.findIndex(({ until }) => Instant.compare(instant, until) < 0);
    if (stateIndex !== -1) return stateIndex;

    // compute as many more transitions as we need, or until they run out
    let state;
    do {
      state = this._computeNextTransitionCached();
    } while (state.until !== null && Instant.compare(instant, state.until) > 0);

    return this._cachedTransitions.length - 1;
  }

  // Implementations of TimeZone methods ///////////////////////////////////////

  // For the first three, we simply consult the cache, computing more entries
  // and caching them as necessary.

  getOffsetNanosecondsFor(instant) {
    const index = this._getIndexOfStateApplyingTo(instant);
    return this._cachedTransitions[index].offset;
  }

  getNextTransition(startingPoint) {
    const index = this._getIndexOfStateApplyingTo(startingPoint);
    return this._cachedTransitions[index].until;
  }

  getPreviousTransition(startingPoint) {
    const justBeforeStartingPoint = startingPoint.subtract({ nanoseconds: 1 });
    const index = this._getIndexOfStateApplyingTo(justBeforeStartingPoint);
    if (index === 0) return null;
    return this._cachedTransitions[index - 1].until;
  }

  getPossibleInstantsFor(plainDateTime) {
    const { stdoff, rules } = this._rules.getRuleSetInEffect(this._id, plainDateTime);
    const stdoffNs = stdoff.total({ unit: 'nanoseconds' });
    const stdoffZone = timeZoneFromOffsetNs(stdoffNs);
    const stdoffInstant = stdoffZone.getInstantFor(plainDateTime);

    // No DST rules in effect, return the instant at standard offset.
    if (!rules) return [stdoffInstant];

    // Check the UTC offset 24 hours before and 24 hours after the instant at
    // standard offset. If the two offsets are the same, there's no DST
    // transition, so return the instant at that offset.
    const indexBefore = this._getIndexOfStateApplyingTo(stdoffInstant.subtract({ hours: 24 }));
    const stateBefore = this._cachedTransitions[indexBefore];
    const indexAfter = this._getIndexOfStateApplyingTo(stdoffInstant.add({ hours: 24 }));
    const stateAfter = this._cachedTransitions[indexAfter];

    if (stateBefore.offset === stateAfter.offset) {
      const localZone = timeZoneFromOffsetNs(stateBefore.offset);
      return [localZone.getInstantFor(plainDateTime)];
    }

    // If the two offsets are different, compute instants at both of them, and
    // return both of them if they convert back to the original PlainDateTime.
    // If they don't convert back, then this was a skipped time, so return an
    // empty array.
    return [stateBefore.offset, stateAfter.offset]
      .map((offsetNs) => timeZoneFromOffsetNs(offsetNs).getInstantFor(plainDateTime))
      .filter((instant) => this.getPlainDateTimeFor(instant).equals(plainDateTime));
  }
}

// Demonstration and testing ///////////////////////////////////////////////////

// Parse our tzdata into a rules object
const rules = new TZDataRules(data);

// Compare the America/Chicago time zone from our tzdata with the built-in one
const chicago = Temporal.TimeZone.from('America/Chicago');
const fauxChicago = new RulesTimeZone(rules, 'America/Chicago');

let start = Temporal.Instant.from('1800-01-01T00:00Z');
let result1 = start;
let result2 = start;

for (let ix = 0; ix < 20; ix++) {
  result1 = chicago.getNextTransition(result1);
  result2 = fauxChicago.getNextTransition(result2);
  if (result1 === null) {
    assert.equal(result2, null);
    break;
  }
  assert.equal(result1.toString(), result2.toString());
  const offset1 = chicago.getOffsetStringFor(result1);
  const offset2 = fauxChicago.getOffsetStringFor(result2);
  assert.equal(offset1, offset2);
}

// Ditto for a time zone with an international date line transition
const samoa = Temporal.TimeZone.from('Pacific/Apia');
const fauxSamoa = new RulesTimeZone(rules, 'Pacific/Apia');

start = Temporal.Instant.from('1800-01-01T00:00Z');
result1 = start;
result2 = start;

for (let ix = 0; ix < 20; ix++) {
  result1 = samoa.getNextTransition(result1);
  result2 = fauxSamoa.getNextTransition(result2);
  if (result1 === null) {
    assert.equal(result2, null);
    break;
  }
  assert.equal(result1.toString(), result2.toString());
  const offset1 = samoa.getOffsetStringFor(result1);
  const offset2 = fauxSamoa.getOffsetStringFor(result2);
  assert.equal(offset1, offset2);
}

// Ditto for getting the previous transition, by listing the last 20 transitions
// occurring before 2021
start = Temporal.Instant.from('2021-01-01T00:00Z');
result1 = start;
result2 = start;

for (let ix = 0; ix < 20; ix++) {
  result1 = chicago.getPreviousTransition(result1);
  result2 = fauxChicago.getPreviousTransition(result2);
  if (result1 === null) {
    assert.equal(result2, null);
    break;
  }
  assert.equal(result1.toString(), result2.toString());
  const offset1 = chicago.getOffsetStringFor(result1);
  const offset2 = fauxChicago.getOffsetStringFor(result2);
  assert.equal(offset1, offset2);
}

// Test converting PlainDateTime to Instant at three times: one where there is
// no DST transition, one that doesn't exist due to a DST transition, and one
// that exists twice.
const unambiguous = Temporal.PlainDateTime.from('2019-01-01T02:00');
const springForward = Temporal.PlainDateTime.from('2019-03-10T02:30');
const fallBack = Temporal.PlainDateTime.from('2019-11-03T01:30');
[unambiguous, springForward, fallBack].forEach((local) => {
  ['earlier', 'later'].forEach((disambiguation) => {
    const result1 = chicago.getInstantFor(local, { disambiguation });
    const result2 = fauxChicago.getInstantFor(local, { disambiguation });
    assert.equal(result1.toString(), result2.toString());
  });
});
