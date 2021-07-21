# Temporal

<details>
  <summary><strong>Table of Contents</strong></summary>
<!-- toc -->
</details>

## イントロダクション

Date は ECMAScript において長年の悩みの種でした。これは Temporal のプロポーザル（草案）です。Temporal はグローバルオブジェクトであり、（Math のように）トップレベルの名前空間として機能します。Temporal はモダンな date/time API を ECMAScript にもたらします。Date の既存の問題点や Temporal を策定することへのモチベーションに関しては[Fixing JavaScript Date](https://maggiepint.com/2017/04/09/fixing-javascript-date-getting-started/)を参照してください。

Temporal は既存の Date の問題を次の方法で解決します。

- 日付と時刻を操作する簡単で使いやすい API を提供します
- DST を考慮した演算と、すべてのタイムゾーンをサポートします
- オブジェクトは特定の日時や時刻を明確に表します
- 厳格に定義された文字列をパースします
- グレゴリオ暦以外のカレンダーをサポートします

Temporal は、日付のみ、時間のみ、およびその他の限定的なユースケースのための個別のクラスを提供します。これにより、コードの可読性が向上し、タイムゾーンが不明な時間に対して間違ったオフセット情報を与えるといったバグを防ぎます。

## Cookbook

[Cookbook](../cookbook.html)は、Temporal に入門したり、その仕組みについて理解したりするために役立ちます。

## API ドキュメント

Temporal の API では、タイムゾーンが関連付けられていない日付を表すオブジェクトは、「Plain」から始まる名前を持ちます。（例：`Temporal.PlainDate`、`Temporal.PlainTime`、`Temporal.PlainDateTime`）。このようなオブジェクトと exact time（カレンダーや場所によらない特定の時点での時刻）の変換は、タイムゾーンとサマータイムのために曖昧になることがあります。そして、Temporal の API は開発者にこの曖昧さを解決する方法を提供します。

いくつかの重要なコンセプトについては次のドキュメントを参照してください：[Temporal におけるタイムゾーンとサマータイム、曖昧性の解決](./ambiguity.md)

### **Temporal.now**

- `Temporal.now.instant()` - Unix epoch からの exact time を得る
- `Temporal.now.timeZone()` - システムのタイムゾーンを得る
- `Temporal.now.zonedDateTime(calendar)` - システムタイムゾーンと特定のカレンダーシステムから現在の wall-clock time と日付を得る
- `Temporal.now.zonedDateTimeISO()` - システムタイムゾーンと ISO8601 のカレンダーから現在の wall-clock time と日付を得る
- `Temporal.now.plainDate(calendar)` - システムタイムゾーンと特定のカレンダーから日付を得る
- `Temporal.now.plainDateISO()` - システムタイムゾーンと ISO8601 のカレンダーから日付を得る
- `Temporal.now.plainTimeISO()` - システムタイムゾーンと ISO8601 のカレンダーから現在の wall-clock time を得る
- `Temporal.now.plainDateTime(calendar)` - システムタイムゾーンと ISO8601 のカレンダーから日付/時刻を得る。ただし、タイムゾーンの情報を持っていないオブジェクトを返すため、ここから他の時刻を導出するために使用しないでください。（例：12 時間後を求める（サマータイムを考慮しなくてはならないが、タイムゾーンの情報がないので曖昧な結果になる）
- `Temporal.now.plainDateTimeISO()` - 上記と同じだが ISO8601 のカレンダーを使用する

```js
console.log('Initialization complete', Temporal.now.instant());
// 出力例:
// Initialization complete 2021-01-13T20:57:01.500944804Z
```

より詳しくは[Temporal.now Documentation](../now.md)を参照してください。

### **Temporal.Instant**

`Temporal.Instant`は、カレンダーや場所によらない特定の時点での時刻（**exact time**と呼ばれます）を表します（例：July 20, 1969, at 20:17 UTC）。人間にとって読みやすい時刻表現を得るには`Temporal.ZonedDateTime`や`Temporal.PlainDateTime`と、`Temporal.TimeZone`や`Temporal.Calendar`を組み合わせて使用してください。

```js
const instant = Temporal.Instant.from('1969-07-20T20:17Z');
instant.toString(); // => '1969-07-20T20:17:00Z'
instant.epochMilliseconds; // => -14182980000
```

より詳しくは[Temporal.Instant Documentation](../instant.md)を参照してください。

### **Temporal.ZonedDateTime**

`Temporal.ZonedDateTime`は、特定のタイムゾーンやカレンダーにおける date/time オブジェクトであり、地球上の特定の地域から見た日時を表します。例：1995 年 12 月 7 日午前 3 時 24 分（太平洋標準時、グレゴリオ暦）。このタイプは、タイムゾーンが必要な場合、サマータイムを考慮した安全な計算を行いたい場合、RFC 5545（iCalendar）との相互運用が必要な場合といったユースケースに最適です。

```js
const zonedDateTime = Temporal.ZonedDateTime.from({
  timeZone: 'America/Los_Angeles',
  year: 1995,
  month: 12,
  day: 7,
  hour: 3,
  minute: 24,
  second: 30,
  millisecond: 0,
  microsecond: 3,
  nanosecond: 500
}); // => 1995-12-07T03:24:30.0000035-08:00[America/Los_Angeles]
```

これは Tempral において最も多くの情報を持つタイプであり、`Temporal.TimeZone`、`Temporal.Instant`、`Temporal.PlainDateTime`（これには `Temporal.Calendar` が含まれます）の組み合わせとしてみなせます。

より詳しくは[Temporal.ZonedDateTime Documentation](../zoneddatetime.md)を参照してください。

### **Temporal.PlainDate**

Temporal.PlainDate は、特定の時間やタイムゾーンに紐付かないカレンダー上の日付を表します。例：2006 年 8 月 24 日。

```js
const date = Temporal.PlainDate.from({ year: 2006, month: 8, day: 24 }); // => 2006-08-24
date.year; // => 2006
date.inLeapYear; // => false
date.toString(); // => '2006-08-24'
```

これを、`Temporal.PlainYearMonth`や`Temporal.PlainMonthDay`といった部分的な日付データへ、更に変換することもできます。

より詳しくは[Temporal.PlainDate Documentation](../plaindate.md)を参照してください。

### **Temporal.PlainTime**

`Temporal.PlainTime`は、特定の日付やタイムゾーンに紐付かない wall-clock（訳注：exact time とは対象的に、タイムゾーンによるオフセットが加味された時刻）を表します。例：7 時 38 分。

```js
const time = Temporal.PlainTime.from({
  hour: 19,
  minute: 39,
  second: 9,
  millisecond: 68,
  microsecond: 346,
  nanosecond: 205
}); // => 19:39:09.068346205

time.second; // => 9
time.toString(); // => '19:39:09.068346205'
```

より詳しくは[Temporal.PlainTime Documentation](../plaintime.md)を参照してください。

### **Temporal.PlainDateTime**

`Temporal.PlainDateTime`は、カレンダー上の日付とタイムゾーンの情報を持たない wall-clock を表します。例：1995 年 12 月 7 日午後 3 時（グレゴリオ暦）。

これは`Temporal.TimeZone`によって`Temporal.ZonedDateTime`に変換可能です。タイムゾーンを必要とする場合や、特に他の値との演算を行いたい場合は、代わりに`Temporal.ZonedDateTime`を用いることを検討してください。`Temporal.ZonedDateTime`を用いることで、サマータイムを自動的に考慮した日付の演算を行えるようになります。

```js
const dateTime = Temporal.PlainDateTime.from({
  year: 1995,
  month: 12,
  day: 7,
  hour: 15
}); // => 1995-12-07T15:00:00
const dateTime1 = dateTime.with({
  minute: 17,
  second: 19
}); // => 1995-12-07T15:17:19
```

より詳しくは[Temporal.PlainDateTime Documentation](../plaindatetime.md)を参照してください。

### **Temporal.PlainYearMonth**

`Temporal.PlainYearMonth`は、「日」を除いた日付を表します。これは、例えば「2020 年 10 月のミーティング」といった情報を表すのに便利です。

```js
const yearMonth = Temporal.PlainYearMonth.from({ year: 2020, month: 10 }); // => 2020-10
yearMonth.daysInMonth; // => 31
yearMonth.daysInYear; // => 366
```

より詳しくは[Temporal.PlainYearMonth Documentation](../plainyearmonth.md)を参照してください。

### **Temporal.PlainMonthDay**

`Temporal.PlainMonthDay`は、「年」を除いた日付を表します。これは、例えば「フランス革命は 7 月 14 日」といったものを表すのに便利です。

```js
const monthDay = Temporal.PlainMonthDay.from({ month: 7, day: 14 }); // => 07-14
const date = monthDay.toPlainDate({ year: 2030 }); // => 2030-07-14
date.dayOfWeek; // => 7
```

より詳しくは[Temporal.PlainMonthDay Documentation](../plainmonthday.md)を参照してください。

### **Temporal.Duration**

`Temporal.Duration`は 5 分や 30 秒といった時間の長さを表します。これは日付の演算処理や`Temporal`オブジェクト間の差分を表すために使われます。

```js
const duration = Temporal.Duration.from({
  hours: 130,
  minutes: 20
});

duration.total({ unit: 'second' }); // => 469200
```

より詳しくは[Temporal.Duration Documentation](../duration.md)を参照してください。

#### Balancing

他の`Temporal`オブジェクトと異なり、`Temporal.Duration`の単位は自然に繰り上げされません。「1 時間 30 分ではなく、『90 分』を表したい」といった場面があるかもしれないからです。

より詳しくは[Duration のバランシング](./balancing.md)を参照してください。

### **Temporal.TimeZone**

`Temporal.TimeZone`は IANA タイムゾーンや特定の UCT オフセット、または UTC そのものを表します。タイムゾーンは、UTC の日時をローカルの日時に変換します。そのため、`Temporal.TimeZone`によって`Temporal.Instant`と`Temporal.PlainDateTime`を変換したり、特定の`Temporal.Instant`における UTC オフセットを取得したりできます。

また、独自のタイムゾーンを実装することも可能です。

```js
const timeZone = Temporal.TimeZone.from('Africa/Cairo');
timeZone.getInstantFor('2000-01-01T00:00'); // => 1999-12-31T22:00:00Z
timeZone.getPlainDateTimeFor('2000-01-01T00:00Z'); // => 2000-01-01T02:00:00
timeZone.getPreviousTransition(Temporal.now.instant()); // => 2014-09-25T21:00:00Z
timeZone.getNextTransition(Temporal.now.instant()); // => null
```

より詳しくは[Temporal.TimeZone Documentation](../timezone.md)を参照してください。また、これらのコンセプトを説明した[Temporal におけるタイムゾーンとサマータイム、曖昧性の解決](./ambiguity.md)もご覧ください。

### **Temporal.Calendar**

`Temporal.Calendar`はカレンダーシステムを表します。ISO 8601 のカレンダーを使用するアプリケーションが多いと思いますが、国際化や地域化のために他のカレンダーシステムを利用することもできます。

日付には、カレンダーシステム関連の演算を行うために、`Temporal.Calendar`オブジェクトが関連付けられています。内部的には、これらの日付の演算は、このカレンダーオブジェクトのメソッドによって実行されます。

また、独自のカレンダーシステムを実装することも可能です。

```js
const cal = Temporal.Calendar.from('iso8601');
const date = cal.dateFromFields({ year: 1999, month: 12, day: 31 }, {});
date.monthsInYear; // => 12
date.daysInYear; // => 365
```

より詳しくは[Temporal.Calendar Documentation](../calendar.md)を参照してください。

## Object の関係図

<img src="../object-model.svg">

## 文字列による永続性

すべての`Temporal`タイプは、永続性や相互運用性のために文字列による表現を持っています。各タイプと文字列表現の対応を以下に示します。Temporal で使用されている ISO 8601 や RFC 3339 に関する、より詳細な情報と標準化に向けた取り組みに関しては[ECMAScript 拡張の ISO-8601 と RFC 3339](./iso-string-ext.md)を参照してください。

<img src="../persistence-model.svg">

## その他のドキュメント

### **キーコンセプト**

- [曖昧性](./ambiguity.md) &mdash; 時間に関する情報が欠落して曖昧さを引き起こす仕組み、2 つのタイプの時間オブジェクトが必要な理由、サマータイムやタイムゾーンの定義変更による影響
- [バランシング](./balancing.md) &mdash; `Temporal.Duration`の単位が、いつ繰り上げされる（またはされない）のかについての説明
- [ISO 文字列の拡張](./iso-string-ext.md) &mdash; `Temporal`で使用されている ISO 8601 および RFC 3339 の拡張に関する議論、IETF と連携した標準化への取り組み
- [なぜ Temporal インスタンスはカレンダーの情報を持っているのか？](./calendar-review.md) &mdash; `Temporal.PlainDate`や`Temporal.PlainDate`がカレンダーシステムを保持している理由と背景
