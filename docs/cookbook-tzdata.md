## Time zone directly from tzdata rules

This is an example of building your own `Temporal.TimeZone` object from [tzdata-compatible rules](https://data.iana.org/time-zones/tz-how-to.html).

This could be useful for testing, for example, or for using other versions of the tzdata than are installed on the host system.

The code in this example is inefficient.
In real production code, it would make more sense to load the data from a compiled form, not directly from the rules themselves.

> **NOTE**: This is a very specialized use of Temporal and is not something you would normally need to do.

```javascript
{{cookbook/getTimeZoneObjectFromRules.mjs}}
```
