---
title: "2-1. SQL言語の基礎と高度な集計技術"
description: "SQLの宣言型としての性質とリレーショナル代数との差異、集計処理におけるGROUP BY/HAVINGの内部プロセス、および各DBMSにおける文字列・日時処理の挙動の違いについて解説します。"
order: 4
category: "SQLと高度なクエリ"
---

# 2-1. SQL言語の基礎と高度な集計技術

本節では、リレーショナルデータベースを操作するためのデファクトスタンダードである「SQL」の基本設計とデータモデルの前提、効率的なデータ集計（アグリゲーション）の仕組み、および実システムにおける文字列・日時処理の挙動の差異について解説する。

---

## SQLの基礎とデータモデルの前提

SQL（Structured Query Language）は、リレーショナルデータベース（RDB）内のデータを定義・操作・制御するための言語である。SQLは主に、データ操作言語（DML）、データ定義言語（DDL）、データ制御言語（DCL）などのコマンド群で構成されている。

### 1. 宣言型言語としての性質
SQLの最も重要な特徴は、 **宣言型言語（Declarative Language）** である点である。
これは、プログラムが「どのように処理を実行するか（手続き）」を記述するのではなく、「何を取得すべきか（結果）」のみを宣言するパラダイムである。具体的な実行手順（どのインデックスを使い、どのような順序でテーブルを結合するかなど）は、DBMSの **クエリオプティマイザ** が自動的に決定する。

### 2. 数学的集合（セット）と多重集合（バッグ）の差異
リレーショナル代数などの理論モデルは、数学的な **セット（集合: Set）** に基づいている。セットにおいては「要素の重複を許さず、順序も存在しない」。
しかし、現実のデータベース実装であるSQLは、 **バッグ（多重集合: Bag）** の概念に基づいている。バッグは「順序は存在しないが、重複を許容する」データの集まりである。

<div class="diagram-container">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="100%" height="auto" style="width: 100%; max-width: 100%;">
    <rect width="100%" height="100%" fill="none"/>
    <text x="150" y="30" font-family="var(--font-sans)" font-size="14" font-weight="600" fill="var(--text-color)" text-anchor="middle">数学的集合 (Set)</text>
    <text x="150" y="50" font-family="var(--font-sans)" font-size="11" fill="var(--text-muted)" text-anchor="middle">重複を許さない / リレーショナル代数の基礎</text>
    <circle cx="150" cy="140" r="65" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="2"/>
    <circle cx="120" cy="115" r="16" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1.5"/>
    <text x="120" y="119" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--accent-color)" text-anchor="middle">A</text>
    <circle cx="180" cy="125" r="16" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1.5"/>
    <text x="180" y="129" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--accent-color)" text-anchor="middle">B</text>
    <circle cx="145" cy="170" r="16" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1.5"/>
    <text x="145" y="174" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--accent-color)" text-anchor="middle">C</text>
    <text x="450" y="30" font-family="var(--font-sans)" font-size="14" font-weight="600" fill="var(--text-color)" text-anchor="middle">多重集合 (Bag)</text>
    <text x="450" y="50" font-family="var(--font-sans)" font-size="11" fill="var(--text-muted)" text-anchor="middle">重複を許容する / SQLの基礎</text>
    <circle cx="450" cy="140" r="65" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="2"/>
    <circle cx="420" cy="110" r="14" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1.5"/>
    <text x="420" y="114" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--accent-color)" text-anchor="middle">A</text>
    <circle cx="445" cy="125" r="14" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1.5"/>
    <text x="445" y="129" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--accent-color)" text-anchor="middle">A</text>
    <circle cx="480" cy="115" r="14" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1.5"/>
    <text x="480" y="119" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--accent-color)" text-anchor="middle">B</text>
    <circle cx="425" cy="165" r="14" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1.5"/>
    <text x="425" y="169" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--accent-color)" text-anchor="middle">C</text>
    <circle cx="475" cy="160" r="14" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1.5"/>
    <text x="475" y="164" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--accent-color)" text-anchor="middle">C</text>
    <circle cx="455" cy="178" r="14" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1.5"/>
    <text x="455" y="182" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--accent-color)" text-anchor="middle">C</text>
  </svg>
</div>

### 技術選定の理由：なぜSQLはバッグを採用したのか
SQLが自動的に重複を排除しない（バッグモデルを採用する）理由は、 **重複排除に伴う計算コストを避けるため** である。
リレーションの結合や射影のたびに重複を排除しようとすると、システムはデータのソート（Sort）やハッシュテーブルの構築（Hashing）といった重い処理を強制される。そのため、SQLではデフォルトで重複を許容し、重複の排除が必要な場合にのみ明示的に `DISTINCT` キーワードを適用する設計となっている。

### 3. 標準規格と現実の実装
SQLの標準規格は ANSI および ISO によって策定されており、歴史的には SQL-86 から始まり、SQL-92、SQL:1999、SQL:2003、そして近年も更新が続けられている。
一般に「SQLに対応している」と名乗るための基礎基準は「SQL-92」とされているが、標準規格のすべてを完全に実装したDBMSは地球上に存在しない。各データベースベンダー（PostgreSQL, MySQL, Oracle, SQL Serverなど）は、独自の実用的な機能拡張や、パフォーマンス最適化のための構文を追加している。

---

## アグリゲーション (Aggregations) とグループ化

アグリゲーションとは、複数の行（タプル）を入力とし、それらを何らかのロジックで集計して単一のスカラー値（出力）を生成する処理である。

### 1. アグリゲーション関数
SQLには、標準で以下のようなアグリゲーション関数が定義されている。
*   `COUNT()`: 行数（または特定カラムの非NULL値の数）をカウントする。なお、`COUNT(*)` や `COUNT(1)` などの指定方法があるが、これらはどちらもマッチしたタプル数をカウントするものであり、出力結果や内部処理のパフォーマンスに実質的な違いはない。
*   `SUM()`: 数値カラムの合計値を計算する。
*   `AVG()`: 数値カラムの平均値を計算する。
*   `MIN()` / `MAX()`: カラム内の最小値および最大値を返す。

### 2. GROUP BY と HAVING 句の役割
*   **GROUP BY 句**: アグリゲーション関数を適用する前に、指定したカラム（属性）の値に基づいてタプルを複数のサブセット（グループ）に分割する。
*   **HAVING 句**: グループ化およびアグリゲーション処理の完了後に、その集計結果に基づいて出力グループ自体をフィルタリングする。

> [!IMPORTANT]
> **SELECT句における非集計列の混在制限**
> `SELECT` 句にアグリゲーション関数と通常のカラム（非集計列）を混在させる場合、その非集計列は必ず `GROUP BY` 句に指定しなければならない。
> 例えば、`SELECT dept_id, AVG(salary) FROM employees` というクエリは、`GROUP BY dept_id` が欠けているためエラーになる（SQLiteなどの一部システムを除き、文法エラーとして却下される）。これは、集約されて1行になった結果に対し、どの行の `dept_id` を出力すればよいか一意に定まらないためである。

### 3. GROUPING SETS による最適化
複雑なデータ分析において、異なる軸（例: 「支店ごと」「商品ごと」「支店と商品の組み合わせごと」）で同時に集計結果を得たい場合がある。これを素朴に記述すると、各グループ化ごとにクエリを実行して `UNION ALL` で結合することになり、DBMSは同じデータを何度もスキャンすることになる。

これを解決するのが `GROUPING SETS` 句である。これを使用すると、複数のグループ化の条件を単一のクエリで定義できる。

```sql
SELECT branch, category, SUM(sales)
FROM transactions
GROUP BY GROUPING SETS ((branch, category), (branch), (category), ());
```

DBMSは、複数回テーブルをスキャンする代わりに、データを内部で1回スキャンする過程で全てのグループ集計を同時に行い、処理を最適化する。

<div class="diagram-container">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="100%" height="auto" style="width: 100%; max-width: 100%;">
    <defs>
      <marker id="arrow-grouping" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--text-muted)"/>
      </marker>
    </defs>
    <text x="140" y="30" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--text-color)" text-anchor="middle">UNION ALL (非効率)</text>
    <rect x="40" y="55" width="80" height="40" rx="3" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1.5"/>
    <text x="80" y="79" font-family="var(--font-sans)" font-size="10" fill="var(--text-color)" text-anchor="middle">Data Table</text>
    <path d="M 125 75 L 180 60" fill="none" stroke="var(--text-muted)" stroke-width="1.2" marker-end="url(#arrow-grouping)"/>
    <rect x="40" y="105" width="80" height="40" rx="3" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1.5"/>
    <text x="80" y="129" font-family="var(--font-sans)" font-size="10" fill="var(--text-color)" text-anchor="middle">Data Table</text>
    <path d="M 125 125 L 180 125" fill="none" stroke="var(--text-muted)" stroke-width="1.2" marker-end="url(#arrow-grouping)"/>
    <rect x="40" y="155" width="80" height="40" rx="3" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1.5"/>
    <text x="80" y="179" font-family="var(--font-sans)" font-size="10" fill="var(--text-color)" text-anchor="middle">Data Table</text>
    <path d="M 125 175 L 180 190" fill="none" stroke="var(--text-muted)" stroke-width="1.2" marker-end="url(#arrow-grouping)"/>
    <text x="210" y="62" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)">Scan 1: GROUP BY A</text>
    <text x="210" y="128" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)">Scan 2: GROUP BY B</text>
    <text x="210" y="193" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)">Scan 3: 全体集約</text>
    <text x="140" y="225" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--text-muted)" text-anchor="middle">テーブルを計 3 回スキャン</text>
    <line x1="320" y1="20" x2="320" y2="220" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="460" y="30" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--text-color)" text-anchor="middle">GROUPING SETS (最適化)</text>
    <rect x="420" y="105" width="80" height="40" rx="3" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1.5"/>
    <text x="460" y="129" font-family="var(--font-sans)" font-size="10" fill="var(--text-color)" text-anchor="middle">Data Table</text>
    <path d="M 505 125 L 535 80" fill="none" stroke="var(--accent-color)" stroke-width="1.5" marker-end="url(#arrow-grouping)"/>
    <path d="M 505 125 L 535 125" fill="none" stroke="var(--accent-color)" stroke-width="1.5" marker-end="url(#arrow-grouping)"/>
    <path d="M 505 125 L 535 170" fill="none" stroke="var(--accent-color)" stroke-width="1.5" marker-end="url(#arrow-grouping)"/>
    <text x="545" y="78" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--accent-color)">集計 A</text>
    <text x="545" y="128" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--accent-color)">集計 B</text>
    <text x="545" y="173" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--accent-color)">全体集約</text>
    <text x="460" y="225" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--accent-color)" text-anchor="middle">テーブルを 1 回だけスキャン</text>
  </svg>
</div>

<div class="note-box">
  <p><strong>コラム: GROUP BY の境界認識イメージ</strong></p>
  <p>DBMSが <code>GROUP BY course_id</code> を用いて各コースに所属する学生の平均GPAを計算するとき、データベースの内部ではまずデータを <code>course_id</code> でソート（またはハッシュ分類）し、同一のコースIDが並ぶ「コースごとの境界」を認識する。そして、その境界の内部だけで順次 <code>GPA</code> を加算し、データ数（カウント）で割ることで平均を計算し、境界が切り替わったタイミングで1つのグループの集計出力を確定させるという処理を行っている。</p>
</div>

### 技術選定の理由：なぜデータベース内部で集計を行うのか
アグリゲーションをアプリケーションコード側ではなく、SQLを用いてデータベースエンジン内部で実行する最大の理由は、 **ネットワーク通信コスト（ラウンドトリップ）の削減** である。
例えば、1000万行のデータから平均値を求める場合、すべての生データをネットワーク経由でアプリケーションサーバへ転送してプログラム内でループ処理するのは極めて非効率である。データベース内でデータを集計し、最終的な「単一の平均値（スカラー値）」のみをアプリケーションへ返す方が、通信帯域を圧迫せず、処理も格段に高速化する。

---

## 文字列および日時 (Date/Time) 処理の差異

SQLのデータ型の中でも、文字列操作や日付・時刻（Date/Time）の計算は、標準規格と現実のDBMS実装との間で最も乖離が大きい領域である。

### 1. 文字列処理における乖離
SQL標準では、「文字列リテラルは単一引用符（シングルクォート `'`）で囲む」と定められており、文字列の比較は大文字と小文字を厳密に区別する。
しかし、MySQLやMariaDBなどのシステムでは、二重引用符（ダブルクォート `"`）による文字列囲みを許容したり、照合順序（Collation）の設定によってデフォルトで大文字小文字を区別せずに一致判定（Case-Insensitive）を行うといったブレが存在する。

### 2. 日時処理の構文の非互換性
日付・時刻の計算関数は、DBMSベンダーごとに構文が完全に異なっており、SQLの移植性を著しく低下させる要因となっている。

例えば、「現在のシステム日時」を取得するだけの処理でも、以下のように記述が分かれる。

| DBMS | 現在時刻の取得構文 |
| :--- | :--- |
| **SQL標準 / PostgreSQL / DuckDB** | `CURRENT_TIMESTAMP` |
| **ClickHouse** | `today()` / `now()` |
| **SQL Server** | `GETDATE()` |
| **Oracle** | `SYSDATE` (ただし DUAL テーブルからの SELECT が必要) |

<div class="note-box">
  <p><strong>コラム: 日付減算におけるDBMSの挙動の違い</strong></p>
  <p>「2025年8月27日」から「2025年1月1日」までの日数を計算させるとする。</p>
  <ul>
    <li><strong>PostgreSQL / DuckDB</strong>: <code>'2025-08-27'::date - '2025-01-01'::date</code> と単純に日付型同士を減算すると、正しい差分である整数 <code>238</code> が返る。</li>
    <li><strong>MySQL</strong>: <code>SELECT '2025-08-27' - '2025-01-01';</code> を実行すると、MySQLは日付文字列をそれぞれ <code>20250827</code> と <code>20250101</code> という「符号なし整数」として解釈し、その算術減算を行うため、<strong><code>726</code></strong> という日付計算としては完全に無意味な数値を返す。MySQLで正しい日数の差を得るには <code>DATEDIFF('2025-08-27', '2025-01-01')</code> という専用関数を呼び出す必要がある。</li>
  </ul>
  <p>このような差異が生まれた理由は、技術的なトレードオフによる選択ではなく、各データベースが開発された黎明期における当時のエンジニアたちの設計判断の違い（歴史的経緯）によるものである。</p>
</div>
