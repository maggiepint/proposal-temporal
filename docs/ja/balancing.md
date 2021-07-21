# Duration のバランシング

Temporal のほとんどのタイプにおいて、各単位（分や秒）には自然な最大値があります。例えば、11 時 87 分という時間はないので、そのような`Temporal.PlainTime`を作成しようとすると 11:59 にクリッピングされる（"constrain"モード）か、例外が投げられます（"reject"モード）。

しかし[`Temporal.Duration`](../duration.md)においては、このような最大値は存在しません。例えば、100 秒の duration がありえます：`Temporal.Duration.from({ seconds: 100 })`。100 秒は 1 分 40 秒に等しいです。これは、いくつかのケースでは"1 分 40 秒"というように"バランシングする"必要があるかもしれませんが、多くの場合では"100 秒"というように"バランシングしない"ことをおすすめします。

時刻を表すオブジェクト（property bag object）や文字列から`Temporal.Duration`が作成される場合、バランシングは行われません。

```javascript
d = Temporal.Duration.from({ seconds: 100 });
d.minutes; // => 0
d.seconds; // => 100
d = Temporal.Duration.from('PT100S');
d.minutes; // => 0
d.seconds; // => 100
```

バランシングが行われていない Duration は、"top-heavy"であることが一般的です。top-heavy とは、`{ days: 45, hours: 10 }`のように、ゼロでない最大の単位がバランシングされていないことです。`{ days: 4, hours: 60 }`のように、バランシングが行われていない Duration で top-heavy でないものはめったに使われません。

## `round()`による Duration のバランシング

`Temporal.Duration.prototype.round()`を用いることで、Duration における各単位の繰り上げ計算や、Duration 全体のバランシングが行えます。

デフォルトでは、`round()`は、バランシングされていない top-heavy な Duration を拡張しようとはしません。つまり、入力される最大の単位は、出力においても最大の単位となります。

```javascript
d = Temporal.Duration.from({ minutes: 80, seconds: 30 }); // => PT80M30S
d.round({ largestUnit: 'auto' }); // => PT80M30S（変化なし）
```

しかし、`round()`は最大の単位より小さな単位に関してはバランシングを行います。これは、バランシングされていない Duration が top-heavy でないという、レアケースでのみ発生します。

<!-- prettier-ignore-start -->
```javascript
d = Temporal.Duration.from({ minutes: 80, seconds: 90 }); // => PT80M90S
d.round({ largestUnit: 'auto' });
  // => PT81M30S（秒が分にバランシングされた、しかし分は時にバランシングされていない）
```
<!-- prettier-ignore-end -->

Duration 全体をバランシングしたい場合は、`largestUnit`オプションを使用します：

```javascript
d = Temporal.Duration.from({ minutes: 80, seconds: 90 }); // => PT80M90S
d.round({ largestUnit: 'hour' }); // => PT1H21M30S（全体がバランシングされている）
```

## 基準点に対するバランシング

日や週、月、年に対するバランシングはさらに複雑になります。なぜなら、場合によってこれらの長さが変化するからです。デフォルトの ISO カレンダーでは一年は 365 日にも 366 日にもなり得ます。また、一ヶ月は 28、29、30、31 日のいずれにもなり得ます。さらに、その他のカレンダーでは、一年は 12 ヶ月でないことも、1 週間が 7 日間でないこともあり得ます。最後に、サマータイムが採用されている地域では 1 日は 24 時間ではない場合もあり得ます。

したがって、日、週、月、年のいずれかがゼロでないすべての`Duration`が表す長さは、それが開始する日時によって異なります。この潜在的な曖昧さを扱うために、Duration の開始点を指定するための`relativeTo`オプションが利用できます。`relativeTo`には、タイムゾーンを明示する`Temporal.ZonedDateTime`か、タイムゾーンを指定しない`Temporal.PlainDateTime`、またはこれらに解釈可能なものを指定します。`relativeTo`は、週、月、年のバランシングを行う際に必須です。

```javascript
d = Temporal.Duration.from({ days: 370 }); // => P370D
/* WRONG */ d.round({ largestUnit: 'year' }); // => RangeError（`relativeTo`が必要）
d.round({ largestUnit: 'year', relativeTo: '2019-01-01' }); // => P1Y5D
d.round({ largestUnit: 'year', relativeTo: '2020-01-01' }); // => P1Y4D（うるう年）
```

日のバランシングを行う際には、`relativeTo`は必須ではありません。もし`relativeTo`が省略された場合には、1 日を 24 時間とみなして処理します。しかし、タイムゾーンに紐付いた Duration を扱う際には、サマータイムの影響を考慮するために、`Temporal.ZonedDateTime`を`relativeTo`とすることをおすすめします。

<!-- prettier-ignore-start -->
```javascript
d = Temporal.Duration.from({ hours: 48 }); // => PT48H
d.round({ largestUnit: 'day' });
  // => P2D
d.round({ largestUnit: 'day', relativeTo: '2020-03-08T00:00-08:00[America/Los_Angeles]' });
  // => P2DT1H
  // （サマータイムが開始したことで時計が1時間分スキップされたから）
```
<!-- prettier-ignore-end -->

## Duration の演算とバランシング

上記の`round()`に加えて、`add()`と`subtract()`もまた、`largestUnit`オプションによって Duration を、「完全に」または「top-heavy に」バランシングします。

デフォルトでは、`Temporal.Duration`インスタンスにおける`add()`と`subtract()`は、入力される 2 つのインスタンスのうち最大の単位を、出力するインスタンスの最大の単位とします。

```javascript
d1 = Temporal.Duration.from({ hours: 26, minutes: 45 }); // => PT26H45M
d2 = Temporal.Duration.from({ minutes: 30 }); // => PT30M
d1.add(d2); // => PT27H15M
```

`largestUnit`オプションを使用して、入力される単位よりも大きな単位にバランシングすることもできます。

```javascript
d1 = Temporal.Duration.from({ minutes: 80, seconds: 90 }); // => PT80M90S
d2 = Temporal.Duration.from({ minutes: 100, seconds: 15 }); // => PT100M15S
d1.add(d2).round({ largestUnit: 'hour' }); // => PT3H1M45S (fully balanced)
```

`relativeTo`は、週、月、年（さらに、タイムゾーンに紐付いた Duration）のバランシングを行うために使用されます。
`relativeTo`の値は、`this`のもの（訳注：演算を呼び出している方の Duration、add メソッドの引数の方ではないということ、`this.add(other)`）として扱われるため、メソッドチェーンで呼び出す連続した演算で同じ`relativeTo`の値を使用できます。

<!-- prettier-ignore-start -->
```javascript
d1 = Temporal.Duration.from({ hours: 48 }); // => PT48H
d2 = Temporal.Duration.from({ hours: 24 }); // => PT24H
d1.add(d2).round({ largestUnit: 'day' });
  // => P3D
d1.add(d2).round({ largestUnit: 'day', relativeTo: '2020-03-08T00:00-08:00[America/Los_Angeles]' });
  // => P3DT1H
  // (because one clock hour was skipped by DST starting)
```
<!-- prettier-ignore-end -->

## 少数秒のシリアル化

通常、すべての Temporal オブジェクトは`toString()`メソッドによって文字列にシリアライズされ、`from()`によって復元できます。これは、`Temporal.Duration`においても同様です。

しかし、もし`milliseconds`、`microseconds`、`nanoseconds`のいずれかが 999 よりも大きい場合、`Temporal.Duration.from(duration.toString())`は、もとの Duration と同じにはなりません。復元されたオブジェクトは、もとのオブジェクトと同じ長さを表しますが、少数秒の部分は秒に対してバランシングされ 999 以下の値となります。例えば、1000 ナノ秒は 1 マイクロ秒になります。

これは、Duration のシリアル化に使用されている ISO 8601 形式が、少数秒の単位のセパレーターを提供しておらず、各単位を個別に指定できないためです。もし、少数秒をバランシングせずに`Temporal.Duration`をシリアライズしたい場合は、独自の方法で行うか、オブジェクトや JSON としてシリアライズする必要があります。
