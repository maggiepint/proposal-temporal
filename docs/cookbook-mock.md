## Mock Temporal example

This is an example of how to create a "locked-down" version of Temporal that supports exactly the same interface, and is indistinguishable from the original, except that the date, time, time zone, and time zone data are under the control of the creator.

This is useful for secure environments like [SES](https://github.com/Agoric/ses-shim) where no information about the host system should be leaked to the program being run; purely functional environments like [Elm](https://elm-lang.org/) where functions must be pure even if the browser's locale data is updated; and mocking for testing purposes, where runs must be deterministic.

This is an example of an approach to take, illustrating shadowing the locale data, introducing a controllable clock time, and freezing Temporal.
Not everything in this example is needed for every application.
For example, in a test harness, you would probably only need to replace `Temporal.now` with a version using a controllable clock and constant time zone, and not need to freeze the Temporal object, or replace `Function.prototype.toString`.

At the same time, this example does not claim to be secure or complete enough for real security applications.
Other information can leak through channels not considered here, such as differences in performance of the underlying Temporal operations.

> **NOTE**: This is a very specialized use of Temporal and is not something you would normally need to do.

```javascript
{{cookbook/makeMockTemporal.mjs}}
```
