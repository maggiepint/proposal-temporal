# ECMAScript 拡張の ISO-8601 と RFC 3339

[ISO-8601](https://en.wikipedia.org/wiki/ISO_8601)と[RFC 3339](https://tools.ietf.org/html/rfc3339)は、日時データをコンピュータが扱いやすいようにシリアライズするための業界標準規格です。

しかし、これらの規格は、ECMAScript ユーザーが望むすべてのケースで十分とは言えません。ISO-8601 や RFC 3339 がカバーしていない、以下の 3 つの重要なユースケースがあります：

1. IANA タイムゾーン名
2. 「月と日」の構文
3. カレンダーシステム

このドキュメントの目的は、`Temporal`のために ISO-8601 や RFC 3339 を補足することです。

## IANA タイムゾーン名

Joda Time（現在は java.time）のような、ブラケットを用いてタイムゾーンを付記するようなライブラリの先例がいくつかあります。ECMAScript では、この記法を入力と出力の両方で完全にサポートする予定です。

例:

```
2007-12-03T10:15:30+01:00[Europe/Paris]
```

ISO-8601 も RFC 3339 も、この記法については言及していませんが、`Temporal`ではこれらを事実上の業界標準として採用します。

タイムゾーンの文字列は、タイムゾーンデータベースのルールにしたがって書かれます。（詳しくは[timezone.md](timezone.md)を参照）ルールに関する詳しい情報は[こちらのドキュメント](https://htmlpreview.github.io/?https://github.com/eggert/tz/blob/master/theory.html)を参照してください。

> 有効な POSIX ファイル名のみを用いる（つまり、`'/'`以外の部分を用いる）。
> `'.'`と`'..'`を用いてはいけない。
> ASCII 文字、`'.'`、`'-'`、`'_'`のみを用いる。
> タイムゾーン名の曖昧さを避けるために、数字は用いない。
> 14 文字を超えてはいけない。また、`'-'`から始まってはいけない。

## 「月と日」の構文

ISO-8601 と RFC 3339 は `Temporal.PlainDate`、`Temporal.PlainTime`、`Temporal.PlainDateTime`および`Temporal.PlainYearMonth`に対応する記法を提供していますが、特別な場合を除いて`Temporal.PlainMonthDay`に対応する記法はありません。したがって、`Temporal`では次のような記法を追加で定義します。

```
07-04
```

上記の文字列は ISO カレンダー上の 7 月 4 日を表します。

RFC 3339 では月と日の構文をサポートするための`--07-04`という記法が定義されていますが、`Temporal`はこの記法を入力として受け付けますが、出力することはありません。

## カレンダーシステム

ISO 以外のカレンダーを用いて`Temporal`における永続性を実現するためには、カレンダーシステムの識別子を記法として追加する必要があります。

私達は、カレンダーシステムの識別子を ISO 8601 や RFC 3339 として表現する既存の方法を見つけられませんでした。したがって、新たに次のような拡張を提案します：_カレンダー固有の日付は、シリアライズされた文字列上では ISO カレンダーの日付として表されます。カレンダーを表す接尾辞は、文字列をコンピュータが読み取る際に、どのカレンダーシステムへ ISO カレンダーの日付を変換するかを示します。_

例えば、ユダヤ暦における **28 Iyar 5780** を文字列にパースすると次のようになります。

```
2020-05-22[u-ca=hebrew]
```

現在 CalConnect や IETF Calsify といった団体と協力して、この構文の標準化を進めています。

このカレンダー識別子は[CLDR によって](http://unicode.org/reports/tr35/#UnicodeCalendarIdentifier)[3〜8 文字の BCP47 のサブタグ文字列](http://unicode.org/reports/tr35/#unicode_locale_extensions)として定義されます。CLDR が現在サポートしているカレンダー識別子の一覧を次に示します：

- `buddhist`
- `chinese`
- `coptic`
- `dangi`
- `ethioaa`
- `ethiopic`
- `gregory`
- `hebrew`
- `indian`
- `islamic`
- `islamic-umalqura`
- `islamic-tbla`
- `islamic-civil`
- `islamic-rgsa`
- `iso8601`
- `japanese`
- `persian`
- `roc`
- `islamicc`（`islamic-civil`の使用が推奨されたため、こちらは非推奨）

なお、IANA タイムゾーンとカレンダーシステムの両方を用いて作成される最も長い日時文字列の例は次のとおりです：

```
2020-05-22T07:19:35.356-04:00[America/Indiana/Indianapolis][u-ca=islamic-umalqura]
```

### カレンダー固有の YearMonth と MonthDay

データモデルに関する[#391](https://github.com/tc39/proposal-temporal/issues/391)の議論にもとづき、ISO 以外のカレンダーで`Temporal.YearMonth`や`Temporal.MonthDay`を使いたい場合は`Temporal.PlainDate`を代わりに用いることとします。例えば、ユダヤ暦で"Iyar 5780"（訳注：5780 は年、Iyar は月を表している）を`Temporal.YearMonth`で表したい場合、その月の最初の日を使って`2020-04-25`という表現が用いられます。

ISO 文字列として表現すると次のようになります。

```
2020-04-25[u-ca=hebrew]
```

この文字列が`Temporal.PlainDate`、`Temporal.YearMonth`または`Temporal.MonthDay`の、どのデータ型を表すかは曖昧なため、デシリアライズする際には適切なコンストラクタを使用するように気をつける必要があります。

## 文字列による永続性の概要

すべての`Temporal`タイプは、永続化と相互運用性のための文字列表現を持っています。ほとんどのタイプは、既存の標準のみを使用し、そうではない一部の例外だけを上記で説明しました。タイプと文字列の対応を以下に示します。

<img src="persistence-model.svg">
