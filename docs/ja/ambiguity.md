# Temporal におけるタイムゾーンとサマータイム、曖昧性の解決

<details>
  <summary><strong>Table of Contents</strong></summary>
<!-- toc -->
</details>

## Clock Time と Exact Time の違いを理解する

Temporal の中核となるコンセプトは、**wall-clock time**（_ローカル時間_ や _clock time_ とも呼ばれる、タイムゾーンに依存した時刻）と **exact time**（_UTC 時間_ とも呼ばれる、地球上のどこでも同じ時刻）を区別することです。

wall-clock time は地方政府によって制御されているため、突然変更される可能性があります。サマータイムが導入されたり、ある国のタイムゾーンが他のものに変更されたりすると、ローカル時間は即座に変更されます。exact time は変更されない国際的な定義を持っており、[UTC](https://en.wikipedia.org/wiki/Coordinated_Universal_Time)という特別なタイムゾーンで呼ばれています。Wikipedia の定義によれば、

> **Coordinated Universal Time** （UTC）は、世界が時計と時刻を調整、規制するための時間の基準です。これは、経度 0 度における平均太陽時から 1 秒以内のものであり、サマータイムによる調整は行われていません。これは実質的にグリニッジ標準時（GMT）の後継です。

すべての wall-clock time は **UTC Offset** によって定義されます。これは、特定の時計が UTC からどれだけ進んでいるか（または遅れているか）を表す時間の量です。例えば、カリフォルニアでの 2020 年 1 月 19 日の場合、UTC オフセット（以降オフセット）は`-08:00` となります。これはサンフランシスコでの wall-clock time が UTC よりも 8 時間遅れていることを表しています。したがって、ローカルでの 10:00 は UTC では 18:00 です。しかし、同じ時にインドでは `+05:30` というオフセットの local time を持っています。

[ISO 8601](https://en.wikipedia.org/wiki/ISO_8601)と[RFC 3339](https://tools.ietf.org/html/rfc3339)は特定の時刻と時間を表現するための標準規格です。例：2020-09-06T17:35:24.485Z。ここで Z は UTC を表す接尾辞です。

Temporal は exact time を表す 2 つのタイプを持っています。`Temporal.Instant`は exact time だけを持ち、他の情報を持ちません。`Temporal.ZonedDateTime`は exact time の他にタイムゾーンやカレンダーシステムの情報を持ちます。

exact time を表す他の方法は、[Unix epoch](https://en.wikipedia.org/wiki/Unix_time)（1970 年 1 月 1 日の真夜中）からの差分を数値で表すことです。例えば、`Temporal.Instant`（exact-time タイプ）は epoch からの経過ナノ秒を表す`BigInt`で構成できます。

## タイムゾーンオフセットの変更とサマータイムを理解する

**タイムゾーン** は UTC と wall-clock がどのように関連しているかを定義します。タイムゾーンは、exact time を受け取って UTC オフセットを返す関数、および反対方向への変換に対応する関数と考えられます。（なぜ exact -> local の変換は 1 対 1 なのに、local -> exact への変換は曖昧なのかの理由は[後述](#タイムゾーンオフセットの変更や-dst-による曖昧性)します）。

Temporal は [**IANA Time Zone Database**](https://en.wikipedia.org/wiki/Tz_database)（TZ database とも呼ばれる）を使用します。これは、タイムゾーン関数の世界的なリポジトリであると考えられます。各 IANA タイムゾーンは以下のものを持ちます：

- **time zone ID** は、地理的な範囲を市などで表したものです（例）。例えば `Europe/Paris`、`Africa/Kampala` などです。また、1 つのタイムゾーンオフセットも表すこともできます。例えば `UTC`（`+00:00` オフセットの定数）や `Etc/GMT+5`（歴史的な経緯でこれは`-05:00`の意味）
- **タイムゾーンオフセット定義** は、すべての UTC のオフセットのデータベースで、1970 年 1 月 1 日からのすべての情報が記載されています（例）。これは、ある UTC の範囲（未来の範囲も含まれる）を特定のオフセットに写像するテーブルであると考えられます。いくつかのタイムゾーンは、オフセットが一時的に変わったりすることがあります。例えば **サマータイム** が導入されていると、春の初めと秋の終わりでオフセットが年に 2 回も変更されます。オフセットは、国がタイムゾーンを変更するように決定するなどの、政治的な理由で恒久的に変更される場合もまたあります。

TZ データベースは世界の政治的な変化によって年に数回アップデートされます。各アップデートにはタイムゾーン定義の変更が含まれます。これらの変更は通常は未来の date/time 値にのみ影響するものです。しかし、ごくまれに過去の範囲が修正されることもあります。例えば、20 世紀初頭の計時に関する新たな歴史的資料が発見された場合などです。

## Temporal における Wall-Clock Time、Exact Time、タイムゾーン

Temporal では：

- [`Temporal.Instant`](../instant.md)タイプは exact time のみを表します
- [`Temporal.PlainDateTime`](../plaindatetime.md)はカレンダー上の日付と wall-clock time を表します。これは次のような、より狭いタイプでも同様です：[`Temporal.PlainDate`](../plaindate.md)、[`Temporal.PlainTime`](../plaintime.md)、[`Temporal.PlainYearMonth`](../plainyearmonth.md)、[`Temporal.PlainMonthDay`](../plainmonthday.md)。  
  これらのタイプは特定のカレンダーシステムを持っており、デフォルトでは`'iso8601'`（ISO 8601 のカレンダー）です。これは他の`'islamic'`や`'japanese'`といった[カレンダー](../calendar.md)で上書きすることもできます。
- [`Temporal.TimeZone`](../timezone.md)は、exact time と wall-clock を相互に変換するタイムゾーン関数を表します。また、これにはヘルパー関数も含まれます。例：特定の exact time におけるタイムゾーンオフセットを取得する
- [`Temporal.ZonedDateTime`](../zoneddatetime.md)は、上記のタイプすべてをカプセル化します：exact time（[`Temporal.Instant`](../instant.md)など）、自身の wall-clock（[`Temporal.PlainDateTime`](../plaindatetime.md)など）、そしてそれら 2 つを関連付けるタイムゾーン（[`Temporal.TimeZone`](../timezone.md)など）

exact time を格納する Temporal タイプから、人間が読みやすいカレンダー上の日付を得る方法は 2 つあります：

- もし exact time がすでに[`Temporal.ZonedDateTime`](../zoneddatetime.md)インスタンスで表されているなら、wall-clock time の値はプロパティやメソッドから当たり前に取得できます。例：[`.year`](../zoneddatetime.md#year)や[`.hour`](../zoneddatetime.md#hour)、[`.toLocaleString()`](../zoneddatetime.md#toLocaleString)など

- 一方で、exact time が[`Temporal.Instant`](../instant.md)として表されているなら、タイムゾーンやカレンダー等を使って[`Temporal.ZonedDateTime`](../zoneddatetime.md)を生成しなければなりません. 例：

<!-- prettier-ignore-start -->
```javascript
instant = Temporal.Instant.from('2019-09-03T08:34:05Z');
formatOptions = {
  era: 'short',
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: 'numeric',
  second: 'numeric'
};

zdt = instant.toZonedDateTimeISO('Asia/Tokyo');
  // => 2019-09-03T17:34:05+09:00[Asia/Tokyo]
zdt.toLocaleString('en-us', { ...formatOptions, calendar: zdt.calendar });
  // => 'Sep 3, 2019 AD, 5:34:05 PM'
zdt.year;
  // => 2019
zdt = instant.toZonedDateTime({timeZone: 'Asia/Tokyo', calendar: 'iso8601'}).toLocaleString('ja-jp', formatOptions);
  // => '西暦2019年9月3日 17:34:05'

zdt = instant.toZonedDateTime({timeZone: 'Asia/Tokyo', calendar: 'japanese'});
  // => 2019-09-03T17:34:05+09:00[Asia/Tokyo][u-ca=japanese]
zdt.toLocaleString('en-us', { ...formatOptions, calendar: zdt.calendar });
  // => 'Sep 3, 1 Reiwa, 5:34:05 PM'
zdt.eraYear;
  // => 1
```
<!-- prettier-ignore-end -->

また、カレンダー上の日付や wall-clock time を exact time に変換することもできます：

<!-- prettier-ignore-start -->
```javascript
// タイムゾーンを与えることで様々なlocal timeをexact timeに変換する
date = Temporal.PlainDate.from('2019-12-17');
// もし時刻が省略されたら、デフォルトでその日の最初の時刻になる
zdt = date.toZonedDateTime('Asia/Tokyo');
  // => 2019-12-17T00:00:00+09:00[Asia/Tokyo]
zdt = date.toZonedDateTime({ timeZone: 'Asia/Tokyo', plainTime: '10:00' });
  // => 2019-12-17T10:00:00+09:00[Asia/Tokyo]
time = Temporal.PlainTime.from('14:35');
zdt = time.toZonedDateTime({ timeZone: 'Asia/Tokyo', plainDate: Temporal.PlainDate.from('2020-08-27') });
  // => 2020-08-27T14:35:00+09:00[Asia/Tokyo]
dateTime = Temporal.PlainDateTime.from('2019-12-17T07:48');
zdt = dateTime.toZonedDateTime('Asia/Tokyo');
  // => 2019-12-17T07:48:00+09:00[Asia/Tokyo]

// exact timeから、UNIX epochからの経過秒、ミリ秒、ナノ秒を得る
inst = zdt.toInstant();
epochNano = inst.epochNanoseconds; // => 1576536480000000000n
epochMicro = inst.epochMilliseconds; // => 1576536480000
epochSecs = inst.epochSeconds; // => 1576536480
```
<!-- prettier-ignore-end -->

## タイムゾーンオフセットの変更や DST による曖昧性

通常、タイムゾーンの定義は、「local date / clock time」と「UTC date / time」を 1 対 1 に対応付けます。

しかし、タイムゾーンの変更される付近では、 **時間の曖昧性** が発生する場合があります。ここでは、wall-clock time を exact time に変換するためにどのオフセットを使えばいいかが明確ではありません。この曖昧性によって、1 つの UTC time に対して 2 つの clock time が発生します。

- オフセットが負の方向に変化すると、同じ clock time が繰り返されます。例えば、2018 年 11 月 4 日のカリフォルニアでは、午前 1 時 30 分が 2 回発生しました。"最初の"午前 1 時 30 分は、太平洋夏時間（`-07:00`）でした。その 30 分後、夏時間が終了し太平洋標準時（`-08:00`）が有効になり、さらに 30 分後に 2 回目の午前 1 時 30 分が発生しました。これは、"2018 年 11 月 4 日午前 1 時 30 分（日）"が _どちらの_ 午前 1 時 30 分なのかわからないということを意味します。つまり、clock time が曖昧になっています。
- オフセットが正の方向に変化すると、local clock time はスキップされます。例えば、カリフォルニアでは夏時間が 2018 年 3 月 11 日（日）に開始されました。時計が午前 1 時 59 分から午前 2 時 00 分に進んだ瞬間、local time は即座に午前 3 時 00 分にスキップされました。午前 2 時 30 分は発生しなかったのです！この 1 年に 1 時間分だけ発生するエラーケースに対処するために、多くのプログラミング環境（ECMAScript を含む）では、変化後か変化前のどちらかのオフセットを使って、スキップされた clock time を exact time に変換します。

いずれのケースにせよ、local time と exact time に変換する際の曖昧性を解決するためには、ありうる 2 つのオフセットのどちらかを使用するか、エラーを発せさせる決定をする必要があります。

## Temporal における日時の曖昧性の解決

`Temporal`では、もし exact time またはタイムゾーンがわかっているなら、日時の曖昧性は発生しません。例：

<!-- prettier-ignore-start -->
```javascript
// ソースがUTCにおけるexact timeなので曖昧性は発生しない
inst = Temporal.Instant.from('2020-09-06T17:35:24.485Z');
  // => 2020-09-06T17:35:24.485Z
// オフセットを用いることでlocal timeを曖昧さを排除して"正確"にできる
inst = Temporal.Instant.from('2020-09-06T10:35:24.485-07:00');
  // => 2020-09-06T17:35:24.485Z
zdt = Temporal.ZonedDateTime.from('2020-09-06T10:35:24.485-07:00[America/Los_Angeles]');
  // => 2020-09-06T10:35:24.485-07:00[America/Los_Angeles]
// もし、ソースがexactなTemporalオブジェクトなら、曖昧性は発生しない
zdt = inst.toZonedDateTimeISO('America/Los_Angeles');
  // => 2020-09-06T10:35:24.485-07:00[America/Los_Angeles]
inst2 = zdt.toInstant();
  // => 2020-09-06T17:35:24.485Z
```
<!-- prettier-ignore-end -->

正確でないソースから exact time（`Temporal.ZonedDateTime`や`Temporal.Instant`） を作成する場合に曖昧性が発生する場合があります。例えば：

<!-- prettier-ignore-start -->
```javascript
// オフセットがわからないので曖昧になる可能性があります！
zdt = Temporal.PlainDate.from('2019-02-19').toZonedDateTime('America/Sao_Paulo'); // 曖昧
zdt = Temporal.PlainDateTime.from('2019-02-19T00:00').toZonedDateTime('America/Sao_Paulo'); // 曖昧

// たとえソースの文字列からオフセットが与えられていても、タイプがexactではない場合はオフセットが無視され、曖昧になる可能性が出てきます。
dt = Temporal.PlainDateTime.from('2019-02-19T00:00-03:00');
zdt = dt.toZonedDateTime('America/Sao_Paulo'); // 曖昧

// オフセットは、オブジェクトをexactタイプからそうではないタイプへ変換する際に失われます
zdt = Temporal.ZonedDateTime.from('2020-11-01T01:30-08:00[America/Los_Angeles]');
  // => 2020-11-01T01:30:00-08:00[America/Los_Angeles]
dt = zdt.toPlainDateTime(); // オフセットが失われます！
  // => 2020-11-01T01:30:00
zdtAmbiguous = dt.toZonedDateTime('America/Los_Angeles'); // 曖昧
  // => 2020-11-01T01:30:00-07:00[America/Los_Angeles]
  // ここで、オフセットが-07:00であることに注意してください。これは"最初の"午前1時30分のものです
  // もともとの、"2回目の午前1時30分"を表す-08:00（太平洋標準時）ではなくなっています
```
<!-- prettier-ignore-end -->

これらの曖昧性を解決するために、`Temporal`の「exact 以外のタイプから exact タイプを生成するメソッド」は`disambiguation`（曖昧性解消）オプションを受け付けられます。これは、変換元の時刻が曖昧な場合の処理を制御します：

- `'compatible'`（デフォルト）: タイムゾーンが負の方向へ変化している範囲では`'earlier'`、正の方向へ変化している範囲では`'later'`として振る舞う。
- `'earlier'`: 2 つの exact time のうち、早い方が返却される。
- `'later'`: 2 つの exact time のうち、遅い方が返却される。
- `'reject'`: `RangeError`が投げられる。

既存のコードやサービスと相互運用する場合は、`'compatible'`がレガシーの`Date`および moment.js や Luxon、date-fns の動作と一致します。また、クロスプラットフォームの標準である[RFC 5545 (iCalendar)](https://tools.ietf.org/html/rfc5545)の挙動とも一致します。

このオプションは以下のメソッドに存在します。

- [`Temporal.PlainDate.prototype.toZonedDateTime`](../plaindate.md#toZonedDateTime)
- [`Temporal.PlainTime.prototype.toZonedDateTime`](../plaintime.md#toZonedDateTime)
- [`Temporal.PlainDateTime.prototype.toZonedDateTime`](../plaindatetime.md#toZonedDateTime)
- [`Temporal.TimeZone.prototype.getInstantFor`](../timezone.md#getInstantFor).

## 例；サマータイムと`disambiguation`曖昧性解消

> この説明は[moment-timezone のドキュメント](https://github.com/moment/momentjs.com/blob/master/docs/moment-timezone/01-using-timezones/02-parsing-ambiguous-inputs.md)に対応しています。

サマータイムに入ると、時計が 1 時間進みます。しかし実際には、時刻ではなくオフセットが動いているのです。オフセットが正の方向に動くと、1 時間が魔法のように消えてなくなります。もし、あなたがコンピュータのデジタル時計を見ていたなら、あなたは時計が 1:58、1:59、3:00 と変化するのに気づくでしょう。オフセットを含めて考えると、実際に何が起こっているのかを簡単に理解できます。

```
1:58 -08:00
1:59 -08:00
3:00 -07:00
3:01 -07:00
```

結果として、1:59:59 から 3:00:00 までの時刻は発生しませんでした。この場合、`'earlier'`モードでは、変更後のオフセットが変更前から有効であったかのようにソース時刻を解釈して exact time を返却します。返される exact time はサマータイムのオフセット変化量（多くの場合 1 時間）だけ前になります。この場合、`'later'`モードでは、変更前のオフセットが変更後も継続するようにソース時刻を解釈して exact time を返却します。返される exact time はサマータイムのオフセット変化量だけ後になります。`'compatible'`モードでは、ここでは`'later'`と同じ結果を返します。これは`Date`を用いた既存の JavaScript コードの挙動と一致します。

<!-- prettier-ignore-start -->
```javascript
// 春のはじめに時計が1時間進む場合のdisambiguation（曖昧性解消）モードの違い：ここで-07:00はサマータイム、-08:00は標準時を表す
props = { timeZone: 'America/Los_Angeles', year: 2020, month: 3, day: 8, hour: 2, minute: 30 };
zdt = Temporal.ZonedDateTime.from(props, { disambiguation: 'compatible' });
  // => 2020-03-08T03:30:00-07:00[America/Los_Angeles]
zdt = Temporal.ZonedDateTime.from(props);
  // => 2020-03-08T03:30:00-07:00[America/Los_Angeles]
  // (デフォルトでは'compatible'モード)
earlier = Temporal.ZonedDateTime.from(props, { disambiguation: 'earlier' });
  // => 2020-03-08T01:30:00-08:00[America/Los_Angeles]
  // (1:30 clock time; ここではすでにStandard Timeになっていたとみなされる)
later = Temporal.ZonedDateTime.from(props, { disambiguation: 'later' });
  // => 2020-03-08T03:30:00-07:00[America/Los_Angeles]
  // (この例では'later'は'compatible'と同じ挙動)
later.toPlainDateTime().since(earlier.toPlainDateTime());
  // => PT2H
  // (clock time上では2時間の差があるように見える...
later.since(earlier);
  // => PT1H
  // ... しかし、実際の時刻では1時間の差しかない)
```
<!-- prettier-ignore-end -->

同様に、サマータイムの終わりには、時計が 1 時間巻き戻ります。

この場合、同じ 1 時間が魔法のように繰り返されます。`'earlier'`モードでは、exact time は、2 つの wall-clock time のうち前のものになり、`'earlier'`モードでは後のものになります。この例では、`'compatible'`モードの挙動は`'earlier'`モードと同じになります。これはレガシーな`Date`を使った既存の JavaScript コードの挙動と同じになります。

<!-- prettier-ignore-start -->
```javascript
// 秋のおわりに1時間が繰り返される場合のdisambiguation（曖昧性解消）モードの違い：ここで、-07:00はサマータイム、-08:00は標準時を表す
props = { timeZone: 'America/Los_Angeles', year: 2020, month: 11, day: 1, hour: 1, minute: 30 };
zdt = Temporal.ZonedDateTime.from(props, { disambiguation: 'compatible' });
  // => 2020-11-01T01:30:00-07:00[America/Los_Angeles]
zdt = Temporal.ZonedDateTime.from(props);
  // => 2020-11-01T01:30:00-07:00[America/Los_Angeles]
  // デフォルトでは'compatible'モード.
earlier = Temporal.ZonedDateTime.from(props, { disambiguation: 'earlier' });
  // => 2020-11-01T01:30:00-07:00[America/Los_Angeles]
  // この例では、'earlier'モードは'compatible'モードと同じ挙動
later = Temporal.ZonedDateTime.from(props, { disambiguation: 'later' });
  // => 2020-11-01T01:30:00-08:00[America/Los_Angeles]
  // 同じclock timeだが一時間遅い結果が返る
later.toPlainDateTime().since(earlier.toPlainDateTime());
  // => PT0S
  // (同じ缶のように見えるが...
later.since(earlier);
  // => PT1H
  // ... 実際は1時間の差がある
```
<!-- prettier-ignore-end -->

## タイムゾーン定義が永続的に変更されることによる曖昧性の発生

タイムゾーンの定義は変更される可能性があります。ほとんどの場合、これらの変更は未来の日時に対する変更であり、過去に格納された過去の日時には影響がありません。しかし、コンピュータは時々未来に関するデータを格納することがあります！例えば、カレンダーアプリはユーザーがリマインドしてほしい友達の来年の誕生日を記録します。未来の日時データをオフセットとタイムゾーンと共に記録し、さらにタイムゾーンの定義が変更された場合、新しいタイムゾーン定義と古いタイムゾーン定義が衝突する可能性があります。このようなケースでは、衝突を解決するために[`Temporal.ZonedDateTime.from`](../zoneddatetime.md#from)の`offset`オプションが用いられます。

- `'use'`: タイムゾーンオフセットが入力から与えられている場合、それを日時の評価に用います。これにより exact time は記録されているものを変わりませんが、local time はもともとのものから変化します。
- `'ignore'`: 入力から得られるタイムゾーンオフセットを無視し、最新のタイムゾーン定義から得られるオフセットを用いて日時を評価します。これにより local time は記録されているものと変わりませんが、exact time はもともとのものから変化します。
- `'prefer'`: オフセットがそのタイムゾーンで有効なら、それによって日時を評価します。もし無効なら、最新のタイムゾーン定義から得られるオフセットによって日時を評価します。`from()`を呼び出す際にこのオプションを使用することはめったにありません。このオプションがどのようなときに使われるのかは`with()`のドキュメントを参照してください。
- `'reject'`: 入力されたタイムゾーンにおいて、入力されたオフセットが無効な場合は`RangeError`を発生させます。

[`Temporal.ZonedDateTime.from`](../zoneddatetime.md#from)では、デフォルトのオプションは`reject`に設定されます。これは、デフォルトとすべき解決方法が明確ではないためです。その代わり、開発者は無効な日時データをどのように修正するのかを指定する必要があります。

[`Temporal.ZonedDateTime.with`](../zoneddatetime.md#with)では、デフォルトは`'prefer'`です。

このデフォルト値は、時刻のフィールドを変更した場合に発生するサマータイムの曖昧性を防ぐのに役立ちます。例えば、[`Temporal.ZonedDateTime`](../zoneddatetime.md)が「サマータイムによって午前 1 時〜2 時が繰り返される日の、"2 回目の"午前 1 時 30 分」に設定されていて、`.with({minute: 45})`をデフォルトの`offset: 'prefer'`オプションで呼び出したとします。すると、曖昧性はデフォルトのオプションによって解決されます。なぜなら、現状のオフセットは新しい日時でも依然として有効であり、"2 回目の"午前 1 時 45 分が返されるからです。しかし、現状のオフセットが新しい日時で無効の場合（例：`.with({hour: 0})`）、デフォルトオプションはオフセットをタイムゾーンに合うように変更します。

このようなオフセットとタイムゾーンの衝突は[`Temporal.ZonedDateTime`](../zoneddatetime.md)でのみ考慮されることに注意してください。なぜなら、他の`Temporal`タイプは IANA タイムゾーンとタイムゾーンオフセットを同時に考慮することがないからです。例えば、[`Temporal.Instant.from`](../instant.md#from)では衝突は発生しません。なせなら、[`Temporal.Instant`](../instant.md)は入力されたタイムゾーンを無視し、常にオフセットを用いて日時を評価するからです。

## 例: `offset` オプション

`offset`オプションを用いる一番の理由は、タイムゾーン定義が変更される前に保存された日時データを解釈することです。例えば、ブラジルは 2019 年にサマータイムを廃止し、サマータイムによる最後のオフセット変化は 2019 年 2 月 16 日に行われました。サマータイムを永続的に廃止することがアナウンスされたのは 2019 年の 4 月のことでした。ここで、2018 年（サマータイムの廃止がアナウンスされる前）に動いていたアプリが遠い未来の日時をオフセットと IANA タイムゾーンの両方の値を持つフォーマットとして保存していたと想像してみましょう。このようなフォーマットは[`Temporal.ZonedDateTime.prototype.toString`](../zoneddatetime.md#toString)だけでなく、他のプラットフォームである[`Java.time.ZonedDateTime`](https://docs.oracle.com/javase/8/docs/api/java/time/ZonedDateTime.md)などでも使用されます。

ここでは、記録された日時がサンパウロにおける 2020 年 1 月 15 日であると仮定しましょう。

<!-- prettier-ignore-start -->
```javascript
zdt = Temporal.ZonedDateTime.from({ year: 2020, month: 1, day: 15, hour: 12, timeZone: 'America/Sao_Paulo' });
zdt.toString();
  // => '2020-01-15T12:00:00-02:00[America/Sao_Paulo]'
  // この文字列が外部のデータベースに格納されたと仮定します。
  // ここで、`-02:00`はサマータイムのオフセットを意味しています。

// また、上記のコードを今日実行すると、サマータイムが廃止されたことを反映して、`-03:00`というオフセットが返ることに注意してください。
// しかし、このコードは2018年に実行されたため、当時のブラジルのサマータイムにしたがって`-02:00`というオフセットが返りました。
```
<!-- prettier-ignore-end -->

この文字列はこれを生成して保存した 2018 年では有効なものでした。しかし、2019 年にタイムゾーンのルールが変更された後では、`2020-01-15T12:00-02:00[America/Sao_Paulo]`は、タイムゾーンオフセットが`-03:00`となるため無効です。この文字列を現行のタイムゾーンのルールでパースする際は、`Temporal`はこれをどのように解釈すればいいかを知る必要があります。`offset`オプションは、このようなケースにおいて役に立ちます。

<!-- prettier-ignore-start -->
```javascript
savedUsingOldTzDefinition = '2020-01-01T12:00-02:00[America/Sao_Paulo]'; // 昔に保存された文字列
/* 無効 */ zdt = Temporal.ZonedDateTime.from(savedUsingOldTzDefinition);
  // => RangeError: Offset is invalid for '2020-01-01T12:00' in 'America/Sao_Paulo'. Provided: -02:00, expected: -03:00.
  // デフォルトではオフセットとタイムゾーンが衝突した場合はエラーが投げられる
/* WRONG */ zdt = Temporal.ZonedDateTime.from(savedUsingOldTzDefinition, { offset: 'reject' });
  // => RangeError: Offset is invalid for '2020-01-01T12:00' in 'America/Sao_Paulo'. Provided: -02:00, expected: -03:00.
zdt = Temporal.ZonedDateTime.from(savedUsingOldTzDefinition, { offset: 'use' });
  // => 2020-01-01T11:00:00-03:00[America/Sao_Paulo]
  // 古いオフセットを用いて入力日時を解釈する。UTC時間は変わらないが、local timeが11:00に変更される。
zdt = Temporal.ZonedDateTime.from(savedUsingOldTzDefinition, { offset: 'ignore' });
  // => 2020-01-01T12:00:00-03:00[America/Sao_Paulo]
  // 現行のタイムゾーンのルールにしたがって入力日時を解釈する。古いオフセットは無視される。
zdt = Temporal.ZonedDateTime.from(savedUsingOldTzDefinition, { offset: 'prefer' });
  // => 2020-01-01T12:00:00-03:00[America/Sao_Paulo]
  // 現行のタイムゾーンでは古いオフセットが無効なので、現行のルールから新たにオフセットを計算してそれを使用する。
```
<!-- prettier-ignore-end -->
