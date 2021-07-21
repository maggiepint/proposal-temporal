#! /usr/bin/env -S node --experimental-modules

/*
 ** Copyright (C) 2018-2019 Bloomberg LP. All rights reserved.
 ** This code is governed by the license found in the LICENSE file.
 */

import Demitasse from '@pipobscure/demitasse';
const { describe, it, report } = Demitasse;

import Pretty from '@pipobscure/demitasse-pretty';
const { reporter } = Pretty;

import { strict as assert } from 'assert';
const { deepEqual, equal, throws } = assert;

import * as Temporal from 'proposal-temporal';

describe('TimeZone', () => {
  describe('Structure', () => {
    it('Temporal.TimeZone is a function', () => equal(typeof Temporal.TimeZone, 'function'));
    it('Temporal.TimeZone has prototype', () => equal(typeof Temporal.TimeZone.prototype, 'object'));
    describe('Temporal.TimeZone.prototype', () => {
      it('Temporal.TimeZone.prototype has id', () => assert('id' in Temporal.TimeZone.prototype));
      it('Temporal.TimeZone.prototype has getOffsetNanosecondsFor', () =>
        equal(typeof Temporal.TimeZone.prototype.getOffsetNanosecondsFor, 'function'));
      it('Temporal.TimeZone.prototype has getOffsetStringFor', () =>
        equal(typeof Temporal.TimeZone.prototype.getOffsetStringFor, 'function'));
      it('Temporal.TimeZone.prototype has getPlainDateTimeFor', () =>
        equal(typeof Temporal.TimeZone.prototype.getPlainDateTimeFor, 'function'));
      it('Temporal.TimeZone.prototype has getInstantFor', () =>
        equal(typeof Temporal.TimeZone.prototype.getInstantFor, 'function'));
      it('Temporal.TimeZone.prototype has getPossibleInstantsFor', () =>
        equal(typeof Temporal.TimeZone.prototype.getPossibleInstantsFor, 'function'));
      it('Temporal.TimeZone.prototype has getNextTransition', () =>
        equal(typeof Temporal.TimeZone.prototype.getNextTransition, 'function'));
      it('Temporal.TimeZone.prototype has getPreviousTransition', () =>
        equal(typeof Temporal.TimeZone.prototype.getPreviousTransition, 'function'));
      it('Temporal.TimeZone.prototype has toString', () =>
        equal(typeof Temporal.TimeZone.prototype.toString, 'function'));
    });
    it('Temporal.TimeZone has from', () => equal(typeof Temporal.TimeZone.from, 'function'));
  });
  describe('Construction', () => {
    test('+01:00');
    test('-01:00');
    test('+0330');
    test('-0650');
    test('-08');
    test('\u221201:00');
    test('\u22120650');
    test('\u221208');
    test('+01:00:00');
    test('-010000');
    test('+03:30:00.000000001');
    test('-033000.1');
    test('Europe/Vienna');
    test('America/New_York');
    test('Africa/CAIRO'); // capitalization
    test('Asia/Ulan_Bator'); // IANA Link Name
    test('UTC');
    test('GMT');
    function test(zone) {
      it(`${zone} is a zone`, () => equal(typeof new Temporal.TimeZone(zone), 'object'));
    }
    ['+00:01.1', '-01.1'].forEach((id) => {
      it(`${id} is not a zone`, () => throws(() => new Temporal.TimeZone(id), RangeError));
    });
  });
  describe('.id property', () => {
    test('+01:00');
    test('-01:00');
    test('+0330', '+03:30');
    test('-0650', '-06:50');
    test('-08', '-08:00');
    test('\u221201:00', '-01:00');
    test('\u22120650', '-06:50');
    test('\u221208', '-08:00');
    test('+01:00:00', '+01:00');
    test('-010000', '-01:00');
    test('+03:30:00.000000001', '+03:30:00.000000001');
    test('-033000.1', '-03:30:00.1');
    test('Europe/Vienna');
    test('America/New_York');
    test('Africa/CAIRO', 'Africa/Cairo');
    test('Asia/Ulan_Bator', 'Asia/Ulaanbaatar');
    test('UTC');
    test('GMT', 'UTC');
    function test(zone, id = zone) {
      it(`${zone} has ID ${id}`, () => equal(new Temporal.TimeZone(zone).id, id));
    }
  });
  describe('TimeZone.from(identifier)', () => {
    test('+01:00');
    test('-01:00');
    test('+0330');
    test('-0650');
    test('-08');
    test('\u221201:00');
    test('\u22120650');
    test('\u221208');
    test('Europe/Vienna');
    test('America/New_York');
    test('Africa/CAIRO');
    test('Asia/Ulan_Bator');
    test('UTC');
    test('GMT');
    function test(zone) {
      const timezoneFrom = Temporal.TimeZone.from(zone);
      const timezoneObj = new Temporal.TimeZone(zone);
      it(`TimeZone.from(${zone}) is a time zone`, () => equal(typeof timezoneFrom, 'object'));
      it(`TimeZone.from(${zone}) does the same thing as new TimeZone(${zone})`, () =>
        equal(timezoneFrom.id, timezoneObj.id));
    }
    it('ZonedDateTime is accepted', () => {
      const zdt = new Temporal.ZonedDateTime(0n, 'Africa/Cairo');
      const tzFrom = Temporal.TimeZone.from(zdt);
      assert(tzFrom instanceof Temporal.TimeZone);
      equal(tzFrom.id, 'Africa/Cairo');
    });
    it('property bag with time zone object is accepted', () => {
      const tz = new Temporal.TimeZone('Africa/Cairo');
      const tzFrom = Temporal.TimeZone.from({ timeZone: tz });
      assert(tzFrom instanceof Temporal.TimeZone);
      equal(tzFrom.id, 'Africa/Cairo');
    });
    it('property bag with string is accepted', () => {
      const tzFrom = Temporal.TimeZone.from({ timeZone: 'Africa/Cairo' });
      assert(tzFrom instanceof Temporal.TimeZone);
      equal(tzFrom.id, 'Africa/Cairo');
    });
    it('property bag with custom time zone is accepted', () => {
      const custom = { id: 'Etc/Custom' };
      const tzFrom = Temporal.TimeZone.from({ timeZone: custom });
      equal(tzFrom, custom);
    });
    it('throws with bad identifier', () => {
      ['local', 'Z', '-08:00[America/Vancouver]', '+00:01.1', '-01.1'].forEach((bad) => {
        throws(() => Temporal.TimeZone.from(bad), RangeError);
      });
    });
    it('throws with bad value in property bag', () => {
      throws(() => Temporal.TimeZone.from({ timeZone: 'local' }), RangeError);
      throws(() => Temporal.TimeZone.from({ timeZone: { timeZone: 'Africa/Cairo' } }), RangeError);
    });
  });
  describe('TimeZone.from(ISO string)', () => {
    test('1994-11-05T08:15:30-05:00', '-05:00');
    test('1994-11-05T08:15:30-05:00[America/New_York]', 'America/New_York');
    test('1994-11-05T08:15:30-05[America/New_York]', 'America/New_York');
    test('1994-11-05T08:15:30\u221205:00', '-05:00');
    test('1994-11-05T08:15:30\u221205:00[America/New_York]', 'America/New_York');
    test('1994-11-05T08:15:30\u221205[America/New_York]', 'America/New_York');
    test('1994-11-05T13:15:30Z', 'UTC');
    function test(isoString, id) {
      const tz = Temporal.TimeZone.from(isoString);
      it(`TimeZone.from(${isoString}) is a time zone`, () => equal(typeof tz, 'object'));
      it(`TimeZone.from(${isoString}) has ID ${id}`, () => equal(tz.id, id));
    }
    it('offset disagreeing with IANA name throws', () => {
      throws(() => Temporal.TimeZone.from('1994-11-05T08:15:30-05:00[UTC]'), RangeError);
      throws(() => Temporal.TimeZone.from('1994-11-05T13:15:30+00:00[America/New_York]'), RangeError);
      throws(() => Temporal.TimeZone.from('1994-11-05T13:15:30-03[Europe/Brussels]'), RangeError);
    });
    it('offset out of range throws', () => {
      throws(() => Temporal.TimeZone.from('1994-11-05T08:15:30+25:00'), RangeError);
      throws(() => Temporal.TimeZone.from('1994-11-05T13:15:30-25:00'), RangeError);
    });
  });
  describe('+01:00', () => {
    const zone = new Temporal.TimeZone('+01:00');
    const inst = Temporal.Instant.fromEpochSeconds(Math.floor(Math.random() * 1e9));
    const dtm = new Temporal.PlainDateTime(1976, 11, 18, 15, 23, 30, 123, 456, 789);
    it(`${zone} has ID ${zone}`, () => equal(zone.id, `${zone}`));
    it(`${zone} has offset +01:00 in ns`, () => equal(zone.getOffsetNanosecondsFor(inst), 3600e9));
    it(`${zone} has offset +01:00`, () => equal(zone.getOffsetStringFor(inst), '+01:00'));
    it(`(${zone}).getPlainDateTimeFor(${inst})`, () =>
      assert(zone.getPlainDateTimeFor(inst) instanceof Temporal.PlainDateTime));
    it(`(${zone}).getInstantFor(${dtm})`, () => assert(zone.getInstantFor(dtm) instanceof Temporal.Instant));
    it(`(${zone}).getNextTransition(${inst})`, () => equal(zone.getNextTransition(inst), null));
    it(`(${zone}).getPreviousTransition(${inst})`, () => equal(zone.getPreviousTransition(inst), null));
    it('wraps around to the next day', () =>
      equal(`${zone.getPlainDateTimeFor(Temporal.Instant.from('2020-02-06T23:59Z'))}`, '2020-02-07T00:59:00'));
  });
  describe('UTC', () => {
    const zone = new Temporal.TimeZone('UTC');
    const inst = Temporal.Instant.fromEpochSeconds(Math.floor(Math.random() * 1e9));
    const dtm = new Temporal.PlainDateTime(1976, 11, 18, 15, 23, 30, 123, 456, 789);
    it(`${zone} has ID ${zone}`, () => equal(zone.id, `${zone}`));
    it(`${zone} has offset +00:00 in ns`, () => equal(zone.getOffsetNanosecondsFor(inst), 0));
    it(`${zone} has offset +00:00`, () => equal(zone.getOffsetStringFor(inst), '+00:00'));
    it(`(${zone}).getPlainDateTimeFor(${inst})`, () =>
      assert(zone.getPlainDateTimeFor(inst) instanceof Temporal.PlainDateTime));
    it(`(${zone}).getInstantFor(${dtm})`, () => assert(zone.getInstantFor(dtm) instanceof Temporal.Instant));
    it(`(${zone}).getNextTransition(${inst})`, () => equal(zone.getNextTransition(inst), null));
    it(`(${zone}).getPreviousTransition(${inst})`, () => equal(zone.getPreviousTransition(inst), null));
  });
  describe('America/Los_Angeles', () => {
    const zone = new Temporal.TimeZone('America/Los_Angeles');
    const inst = new Temporal.Instant(0n);
    const dtm = new Temporal.PlainDateTime(1976, 11, 18, 15, 23, 30, 123, 456, 789);
    it(`${zone} has ID ${zone}`, () => equal(zone.id, `${zone}`));
    it(`${zone} has offset -08:00 in ns`, () => equal(zone.getOffsetNanosecondsFor(inst), -8 * 3600e9));
    it(`${zone} has offset -08:00`, () => equal(zone.getOffsetStringFor(inst), '-08:00'));
    it(`(${zone}).getPlainDateTimeFor(${inst})`, () =>
      assert(zone.getPlainDateTimeFor(inst) instanceof Temporal.PlainDateTime));
    it(`(${zone}).getInstantFor(${dtm})`, () => assert(zone.getInstantFor(dtm) instanceof Temporal.Instant));
    it(`(${zone}).getNextTransition() x 4 transitions`, () => {
      for (let i = 0, txn = inst; i < 4; i++) {
        const transition = zone.getNextTransition(txn);
        assert(transition);
        assert(!transition.equals(txn));
        txn = transition;
      }
    });
    it(`(${zone}).getPreviousTransition() x 4 transitions`, () => {
      for (let i = 0, txn = inst; i < 4; i++) {
        const transition = zone.getPreviousTransition(txn);
        assert(transition);
        assert(!transition.equals(txn));
        txn = transition;
      }
    });
  });
  describe('sub-minute offset', () => {
    const zone = new Temporal.TimeZone('Europe/Amsterdam');
    const inst = Temporal.Instant.from('1900-01-01T12:00Z');
    const dtm = Temporal.PlainDateTime.from('1900-01-01T12:00');
    it(`${zone} has ID ${zone}`, () => equal(zone.id, `${zone}`));
    it(`${zone} has offset +00:19:32 in ns`, () => equal(zone.getOffsetNanosecondsFor(inst), 1172000000000));
    it(`${zone} has offset +00:19:32`, () => equal(zone.getOffsetStringFor(inst), '+00:19:32'));
    it(`(${zone}).getPlainDateTimeFor(${inst})`, () =>
      equal(`${zone.getPlainDateTimeFor(inst)}`, '1900-01-01T12:19:32'));
    it(`(${zone}).getInstantFor(${dtm})`, () => equal(`${zone.getInstantFor(dtm)}`, '1900-01-01T11:40:28Z'));
    it(`(${zone}).getNextTransition(${inst})`, () => equal(`${zone.getNextTransition(inst)}`, '1916-04-30T23:40:28Z'));
    it(`(${zone}).getPreviousTransition(${inst})`, () => equal(zone.getPreviousTransition(inst), null));
  });
  describe('with DST change', () => {
    it('clock moving forward', () => {
      const zone = new Temporal.TimeZone('Europe/Berlin');
      const dtm = new Temporal.PlainDateTime(2019, 3, 31, 2, 45);
      equal(`${zone.getInstantFor(dtm)}`, '2019-03-31T01:45:00Z');
      equal(`${zone.getInstantFor(dtm, { disambiguation: 'earlier' })}`, '2019-03-31T00:45:00Z');
      equal(`${zone.getInstantFor(dtm, { disambiguation: 'later' })}`, '2019-03-31T01:45:00Z');
      equal(`${zone.getInstantFor(dtm, { disambiguation: 'compatible' })}`, '2019-03-31T01:45:00Z');
      throws(() => zone.getInstantFor(dtm, { disambiguation: 'reject' }), RangeError);
    });
    it('clock moving backward', () => {
      const zone = new Temporal.TimeZone('America/Sao_Paulo');
      const dtm = new Temporal.PlainDateTime(2019, 2, 16, 23, 45);
      equal(`${zone.getInstantFor(dtm)}`, '2019-02-17T01:45:00Z');
      equal(`${zone.getInstantFor(dtm, { disambiguation: 'earlier' })}`, '2019-02-17T01:45:00Z');
      equal(`${zone.getInstantFor(dtm, { disambiguation: 'later' })}`, '2019-02-17T02:45:00Z');
      equal(`${zone.getInstantFor(dtm, { disambiguation: 'compatible' })}`, '2019-02-17T01:45:00Z');
      throws(() => zone.getInstantFor(dtm, { disambiguation: 'reject' }), RangeError);
    });
  });
  describe('Casting', () => {
    const zone = Temporal.TimeZone.from('+03:30');
    it('getOffsetNanosecondsFor() casts its argument', () => {
      equal(zone.getOffsetNanosecondsFor('2019-02-17T01:45Z'), 126e11);
    });
    it('getOffsetNanosecondsFor() casts only from string', () => {
      throws(() => zone.getOffsetNanosecondsFor(0n), RangeError);
      throws(() => zone.getOffsetNanosecondsFor({}), RangeError);
    });
    it('getOffsetStringFor() casts its argument', () => {
      equal(zone.getOffsetStringFor('2019-02-17T01:45Z'), '+03:30');
    });
    it('getOffsetStringFor() casts only from string', () => {
      throws(() => zone.getOffsetStringFor(0n), RangeError);
      throws(() => zone.getOffsetStringFor({}), RangeError);
    });
    it('getPlainDateTimeFor() casts its argument', () => {
      equal(`${zone.getPlainDateTimeFor('2019-02-17T01:45Z')}`, '2019-02-17T05:15:00');
    });
    it('getPlainDateTimeFor() casts only from string', () => {
      throws(() => zone.getPlainDateTimeFor(0n), RangeError);
      throws(() => zone.getPlainDateTimeFor({}), RangeError);
    });
  });
  describe('TimeZone.getInstantFor() works', () => {
    it('recent date', () => {
      const dt = Temporal.PlainDateTime.from('2019-10-29T10:46:38.271986102');
      const tz = Temporal.TimeZone.from('Europe/Amsterdam');
      equal(`${tz.getInstantFor(dt)}`, '2019-10-29T09:46:38.271986102Z');
    });
    it('year ≤ 99', () => {
      const dt = Temporal.PlainDateTime.from('+000098-10-29T10:46:38.271986102');
      const tz = Temporal.TimeZone.from('+06:00');
      equal(`${tz.getInstantFor(dt)}`, '+000098-10-29T04:46:38.271986102Z');
    });
    it('year < 1', () => {
      let dt = Temporal.PlainDateTime.from('+000000-10-29T10:46:38.271986102');
      const tz = Temporal.TimeZone.from('+06:00');
      equal(`${tz.getInstantFor(dt)}`, '+000000-10-29T04:46:38.271986102Z');
      dt = Temporal.PlainDateTime.from('-001000-10-29T10:46:38.271986102');
      equal(`${tz.getInstantFor(dt)}`, '-001000-10-29T04:46:38.271986102Z');
    });
    it('year 0 leap day', () => {
      const dt = Temporal.PlainDateTime.from('+000000-02-29T00:00');
      const tz = Temporal.TimeZone.from('Europe/London');
      equal(`${tz.getInstantFor(dt)}`, '+000000-02-29T00:01:15Z');
    });
    it('outside of Instant range', () => {
      const max = Temporal.PlainDateTime.from('+275760-09-13T23:59:59.999999999');

      const offsetTz = Temporal.TimeZone.from('-01:00');
      throws(() => offsetTz.getInstantFor(max), RangeError);

      const namedTz = Temporal.TimeZone.from('America/Godthab');
      throws(() => namedTz.getInstantFor(max), RangeError);
    });
    it('options may only be an object or undefined', () => {
      const dt = Temporal.PlainDateTime.from('2019-10-29T10:46:38.271986102');
      const tz = Temporal.TimeZone.from('America/Sao_Paulo');
      [null, 1, 'hello', true, Symbol('foo'), 1n].forEach((badOptions) =>
        throws(() => tz.getInstantFor(dt, badOptions), TypeError)
      );
      [{}, () => {}, undefined].forEach((options) =>
        equal(`${tz.getInstantFor(dt, options)}`, '2019-10-29T13:46:38.271986102Z')
      );
    });
    it('casts argument', () => {
      const tz = Temporal.TimeZone.from('Europe/Amsterdam');
      equal(`${tz.getInstantFor('2019-10-29T10:46:38.271986102')}`, '2019-10-29T09:46:38.271986102Z');
      equal(
        `${tz.getInstantFor({ year: 2019, month: 10, day: 29, hour: 10, minute: 46, second: 38 })}`,
        '2019-10-29T09:46:38Z'
      );
    });
    it('object must contain at least the required properties', () => {
      const tz = Temporal.TimeZone.from('Europe/Amsterdam');
      throws(() => tz.getInstantFor({ year: 2019 }), TypeError);
    });
  });
  describe('getInstantFor disambiguation', () => {
    const dtm = new Temporal.PlainDateTime(2019, 2, 16, 23, 45);
    it('with constant offset', () => {
      const zone = Temporal.TimeZone.from('+03:30');
      for (const disambiguation of [undefined, 'compatible', 'earlier', 'later', 'reject']) {
        assert(zone.getInstantFor(dtm, { disambiguation }) instanceof Temporal.Instant);
      }
    });
    it('with daylight saving change - Fall', () => {
      const zone = Temporal.TimeZone.from('America/Sao_Paulo');
      equal(`${zone.getInstantFor(dtm)}`, '2019-02-17T01:45:00Z');
      equal(`${zone.getInstantFor(dtm, { disambiguation: 'earlier' })}`, '2019-02-17T01:45:00Z');
      equal(`${zone.getInstantFor(dtm, { disambiguation: 'later' })}`, '2019-02-17T02:45:00Z');
      equal(`${zone.getInstantFor(dtm, { disambiguation: 'compatible' })}`, '2019-02-17T01:45:00Z');
      throws(() => zone.getInstantFor(dtm, { disambiguation: 'reject' }), RangeError);
    });
    it('with daylight saving change - Spring', () => {
      const dtmLA = new Temporal.PlainDateTime(2020, 3, 8, 2, 30);
      const zone = Temporal.TimeZone.from('America/Los_Angeles');
      equal(`${zone.getInstantFor(dtmLA)}`, '2020-03-08T10:30:00Z');
      equal(`${zone.getInstantFor(dtmLA, { disambiguation: 'earlier' })}`, '2020-03-08T09:30:00Z');
      equal(`${zone.getInstantFor(dtmLA, { disambiguation: 'later' })}`, '2020-03-08T10:30:00Z');
      equal(`${zone.getInstantFor(dtmLA, { disambiguation: 'compatible' })}`, '2020-03-08T10:30:00Z');
      throws(() => zone.getInstantFor(dtmLA, { disambiguation: 'reject' }), RangeError);
    });
    it('throws on bad disambiguation', () => {
      const zone = Temporal.TimeZone.from('+03:30');
      ['', 'EARLIER', 'test', 3, null].forEach((disambiguation) =>
        throws(() => zone.getInstantFor(dtm, { disambiguation }), RangeError)
      );
    });
  });
  describe('getPossibleInstantsFor', () => {
    it('with constant offset', () => {
      const zone = Temporal.TimeZone.from('+03:30');
      const dt = Temporal.PlainDateTime.from('2019-02-16T23:45');
      deepEqual(
        zone.getPossibleInstantsFor(dt).map((a) => `${a}`),
        ['2019-02-16T20:15:00Z']
      );
    });
    it('with clock moving forward', () => {
      const zone = Temporal.TimeZone.from('Europe/Berlin');
      const dt = Temporal.PlainDateTime.from('2019-03-31T02:45');
      deepEqual(zone.getPossibleInstantsFor(dt), []);
    });
    it('with clock moving backward', () => {
      const zone = Temporal.TimeZone.from('America/Sao_Paulo');
      const dt = Temporal.PlainDateTime.from('2019-02-16T23:45');
      deepEqual(
        zone.getPossibleInstantsFor(dt).map((a) => `${a}`),
        ['2019-02-17T01:45:00Z', '2019-02-17T02:45:00Z']
      );
    });
    it('outside of Instant range', () => {
      const max = Temporal.PlainDateTime.from('+275760-09-13T23:59:59.999999999');

      const offsetTz = Temporal.TimeZone.from('-01:00');
      throws(() => offsetTz.getPossibleInstantsFor(max), RangeError);

      const namedTz = Temporal.TimeZone.from('America/Godthab');
      throws(() => namedTz.getPossibleInstantsFor(max), RangeError);
    });
    it('casts argument', () => {
      const tz = Temporal.TimeZone.from('+03:30');
      deepEqual(
        tz
          .getPossibleInstantsFor({ year: 2019, month: 2, day: 16, hour: 23, minute: 45, second: 30 })
          .map((a) => `${a}`),
        ['2019-02-16T20:15:30Z']
      );
      deepEqual(
        tz.getPossibleInstantsFor('2019-02-16T23:45:30').map((a) => `${a}`),
        ['2019-02-16T20:15:30Z']
      );
    });
    it('object must contain at least the required properties', () => {
      const tz = Temporal.TimeZone.from('Europe/Amsterdam');
      throws(() => tz.getPossibleInstantsFor({ year: 2019 }), TypeError);
    });
  });
  describe('getNextTransition works', () => {
    const nyc = Temporal.TimeZone.from('America/New_York');
    it('should not have bug #510', () => {
      // See https://github.com/tc39/proposal-temporal/issues/510 for more.
      const a1 = Temporal.Instant.from('2019-04-16T21:01Z');
      const a2 = Temporal.Instant.from('1800-01-01T00:00Z');

      equal(nyc.getNextTransition(a1).toString(), '2019-11-03T06:00:00Z');
      equal(nyc.getNextTransition(a2).toString(), '1883-11-18T17:00:00Z');
    });
    it('should not return the same as its input if the input is a transition point', () => {
      const inst = Temporal.Instant.from('2019-01-01T00:00Z');
      equal(`${nyc.getNextTransition(inst)}`, '2019-03-10T07:00:00Z');
      equal(`${nyc.getNextTransition(nyc.getNextTransition(inst))}`, '2019-11-03T06:00:00Z');
    });
    it('casts argument', () => {
      equal(`${nyc.getNextTransition('2019-04-16T21:01Z')}`, '2019-11-03T06:00:00Z');
    });
    it('casts only from string', () => {
      throws(() => nyc.getNextTransition(0n), RangeError);
      throws(() => nyc.getNextTransition({}), RangeError);
    });
  });

  describe('getPreviousTransition works', () => {
    const london = Temporal.TimeZone.from('Europe/London');
    it('should return first and last transition', () => {
      const a1 = Temporal.Instant.from('2020-06-11T21:01Z');
      const a2 = Temporal.Instant.from('1848-01-01T00:00Z');

      equal(london.getPreviousTransition(a1).toString(), '2020-03-29T01:00:00Z');
      equal(london.getPreviousTransition(a2).toString(), '1847-12-01T00:01:15Z');
    });
    it('should not return the same as its input if the input is a transition point', () => {
      const inst = Temporal.Instant.from('2020-06-01T00:00Z');
      equal(`${london.getPreviousTransition(inst)}`, '2020-03-29T01:00:00Z');
      equal(`${london.getPreviousTransition(london.getPreviousTransition(inst))}`, '2019-10-27T01:00:00Z');
    });
    it('casts argument', () => {
      equal(`${london.getPreviousTransition('2020-06-11T21:01Z')}`, '2020-03-29T01:00:00Z');
    });
    it('casts only from string', () => {
      throws(() => london.getPreviousTransition(0n), RangeError);
      throws(() => london.getPreviousTransition({}), RangeError);
    });
  });
});

import { normalize } from 'path';
if (normalize(import.meta.url.slice(8)) === normalize(process.argv[1])) {
  report(reporter).then((failed) => process.exit(failed ? 1 : 0));
}
