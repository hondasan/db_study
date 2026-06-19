---
title: "2-2. 高度なSQLクエリとオプティマイザの最適化"
description: "サブクエリ（ネストされたクエリ）の仕組みとJOINへの自動書き換え、ラテラルジョインによる行ごとの反復処理、および共通テーブル式（CTE）を用いた一時テーブルと再帰処理について解説します。"
order: 5
category: "SQLと高度なクエリ"
---

# 2-2. 高度なSQLクエリとオプティマイザの最適化

本節では、複雑なデータ探索や処理ロジックを実現するための高度なSQL機能について解説する。クエリ内に別のクエリを埋め込む「ネストされたクエリ」とDBMS内部の最適化、プログラムのforループのように動作する「ラテラルジョイン」、および可読性と再利用性を高める「共通テーブル式（CTE）」の仕組みを紐解く。

---

## ネストされたクエリ (Nested Queries) とクエリ最適化

SQLでは、クエリの内部（`SELECT`, `FROM`, `WHERE` 句など）に別のクエリを記述することができる。これを **ネストされたクエリ（Nested Query）** または **サブクエリ（Subquery）** と呼ぶ。

### 1. サブクエリの分類と定義
*   **外部クエリ (Outer Query)**: サブクエリを内包し、最終的な出力結果を制御する親クエリ。
*   **内部クエリ / サブクエリ (Inner Query)**: 他のクエリの内部で実行される子クエリ。
*   **相関サブクエリ (Correlated Subquery)**: 内部クエリの処理において、外部クエリの現在のタプル（行）の値を参照しているクエリ。

> [!NOTE]
> **スコープの基本ルール**
> 内部クエリは外部クエリの属性（カラム）にアクセスできるが、外部クエリから内部クエリの属性に直接アクセスすることはできない。これはプログラミング言語における変数のローカルスコープとグローバルスコープの関係に似ている。

### 2. 実行効率と最適化（De-correlation / JOINへの書き換え）
サブクエリを最も愚直に実装（実行）すると、外部クエリから取得したタプルごとに、内部クエリを繰り返し実行する非効率な「ネストされたループ（Nested Loop）」となる。外部クエリの行数を $N$、内部クエリのスキャンコストを $M$ とすると、全体の計算量は $O(N \times M)$ に膨れ上がる。

モダンなDBMSの **クエリオプティマイザ** は、このような非効率なネストクエリを検知すると、内部で結合（JOIN）を用いた等価なクエリへと自動的に書き換え（ **Query Rewrite / De-correlation** ）を行う。

<div class="diagram-container">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="100%" height="auto" style="width: 100%; max-width: 100%;">
    <defs>
      <marker id="arrow-correlation" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--text-muted)"/>
      </marker>
    </defs>
    <text x="140" y="30" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--text-color)" text-anchor="middle">愚直な相関サブクエリ実行</text>
    <rect x="30" y="55" width="80" height="20" rx="2" fill="var(--bg-hover)" stroke="var(--border-color)"/>
    <text x="70" y="68" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">外部行 1</text>
    <path d="M 115 65 L 175 100" fill="none" stroke="var(--text-muted)" stroke-width="1" marker-end="url(#arrow-correlation)"/>
    <rect x="30" y="85" width="80" height="20" rx="2" fill="var(--bg-hover)" stroke="var(--border-color)"/>
    <text x="70" y="98" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">外部行 2</text>
    <path d="M 115 95 L 175 110" fill="none" stroke="var(--text-muted)" stroke-width="1" marker-end="url(#arrow-correlation)"/>
    <rect x="30" y="115" width="80" height="20" rx="2" fill="var(--bg-hover)" stroke="var(--border-color)"/>
    <text x="70" y="128" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">外部行 3</text>
    <path d="M 115 125 L 175 120" fill="none" stroke="var(--text-muted)" stroke-width="1" marker-end="url(#arrow-correlation)"/>
    <text x="70" y="150" font-family="var(--font-sans)" font-size="8" fill="var(--text-muted)" text-anchor="middle">外部テーブル (N行)</text>
    <rect x="180" y="90" width="100" height="45" rx="4" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1.5"/>
    <text x="230" y="110" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--accent-color)" text-anchor="middle">内部サブクエリ</text>
    <text x="230" y="123" font-family="var(--font-sans)" font-size="8" fill="var(--accent-color)" text-anchor="middle">毎回再スキャン</text>
    <text x="140" y="210" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--text-muted)" text-anchor="middle">N回サブクエリが起動 (非効率)</text>
    <line x1="300" y1="20" x2="300" y2="220" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="4,4"/>
    <text x="450" y="30" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--text-color)" text-anchor="middle">オプティマイザによるJOINへの書き換え</text>
    <rect x="340" y="80" width="80" height="35" rx="3" fill="var(--bg-hover)" stroke="var(--border-color)"/>
    <text x="380" y="101" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">外部テーブル</text>
    <rect x="340" y="130" width="80" height="35" rx="3" fill="var(--bg-hover)" stroke="var(--border-color)"/>
    <text x="380" y="151" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">内部テーブル</text>
    <rect x="470" y="100" width="90" height="50" rx="4" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1.5"/>
    <text x="515" y="123" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--accent-color)" text-anchor="middle">JOIN 演算</text>
    <text x="515" y="136" font-family="var(--font-sans)" font-size="8" fill="var(--accent-color)" text-anchor="middle">(Hash / Merge 等)</text>
    <path d="M 425 98 L 465 115" fill="none" stroke="var(--text-muted)" stroke-width="1.2" marker-end="url(#arrow-correlation)"/>
    <path d="M 425 148 L 465 135" fill="none" stroke="var(--text-muted)" stroke-width="1.2" marker-end="url(#arrow-correlation)"/>
    <text x="450" y="210" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--accent-color)" text-anchor="middle">一括で結合処理 (高速)</text>
  </svg>
</div>

### 技術選定の理由：なぜJOINへの書き換えを目指すのか
DBMSは、JOIN演算（ハッシュジョインやソートマージジョイン）の実行効率を高めるために、数多くの物理的な最適化手法を揃えている。
サブクエリを等価なJOIN文へと書き換えることで、DBMSは一度のテーブルスキャンやインデックスマージでデータを結合できるようになり、実行速度が劇的に向上する。

<div class="note-box">
  <p><strong>コラム: 履修学生のデータ取得を例にした最適化</strong></p>
  <p>「データベース（ID: 15-445）を履修している全学生の名前を取得する」クエリを考える。</p>
  <pre><code>SELECT name FROM students 
WHERE id IN (
  SELECT student_id FROM enrolled 
  WHERE course_id = '15-445'
);</code></pre>
  <p>このクエリに対し、モダンなオプティマイザは自動で以下のような等価な結合クエリに書き換えて実行する。</p>
  <pre><code>SELECT s.name 
FROM students AS s
INNER JOIN enrolled AS e ON s.id = e.student_id
WHERE e.course_id = '15-445';</code></pre>
  <p>しかし、一部のDBMSや非常に複雑にネストされた相関サブクエリの場合、オプティマイザがJOINへの書き換え（非相関化）に失敗することがある。その場合、システムは愚直なネストループを実行しようとし、最悪のケースではメモリ不足（OOM: Out Of Memory）やクエリタイムアウトを引き起こす。</p>
</div>

---

## ラテラルジョイン (Lateral Joins)

通常のSQLの結合（`JOIN`）処理では、結合対象となるサブクエリ同士が同じ `FROM` 句の中で並行して評価されるため、一方のサブクエリが、もう一方のサブクエリのカラム（属性）を参照することは不可能である。

これを可能にする特殊な演算子が、 **ラテラルジョイン（Lateral Join）** である（PostgreSQLやDuckDB等では `LATERAL` キーワード、SQL Serverでは `CROSS APPLY` がこれに該当する）。

### 1. ラテラルジョインの定義
ラテラルジョインとは、 **内部クエリ（サブクエリ）が、同じ FROM 句内の先行するテーブルまたはクエリの属性を参照できるようにする** 結合演算子である。

### 2. 実行順序の強制
宣言型であるSQLは、本来「どのように実行するか」という順序を問わない。しかしラテラルジョインは例外的に、 **「左側のテーブルの処理を先に実行し、その各行のデータを入力値（パラメータ）として右側のサブクエリを実行する」** という実行順序を強制する。

これは、一般的な手続き型プログラミング言語における `for-each` ループに酷似している。

<div class="diagram-container">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="100%" height="auto" style="width: 100%; max-width: 100%;">
    <defs>
      <marker id="arrow-lateral" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--text-muted)"/>
      </marker>
    </defs>
    <text x="100" y="30" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--text-color)" text-anchor="middle">先行テーブル (Left Table)</text>
    <rect x="40" y="50" width="120" height="130" rx="4" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1.5"/>
    <!-- 行要素 -->
    <rect x="50" y="65" width="100" height="25" rx="3" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1"/>
    <text x="100" y="81" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--accent-color)" text-anchor="middle">タプル 1 (ID: 101)</text>
    <rect x="50" y="105" width="100" height="25" rx="3" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1"/>
    <text x="100" y="121" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--accent-color)" text-anchor="middle">タプル 2 (ID: 102)</text>
    <rect x="50" y="145" width="100" height="25" rx="3" fill="var(--accent-light)" stroke="var(--accent-color)" stroke-width="1"/>
    <text x="100" y="161" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--accent-color)" text-anchor="middle">タプル 3 (ID: 103)</text>
    <!-- パラメータ渡し矢印 -->
    <path d="M 155 77 L 270 100" fill="none" stroke="var(--accent-color)" stroke-width="1.5" stroke-dasharray="2,2" marker-end="url(#arrow-lateral)"/>
    <text x="215" y="75" font-family="var(--font-sans)" font-size="9" fill="var(--accent-color)" text-anchor="middle" transform="rotate(11, 215, 75)">Param: ID=101</text>
    <!-- ラテラルサブクエリ (右) -->
    <text x="360" y="30" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--text-color)" text-anchor="middle">LATERAL サブクエリ</text>
    <rect x="280" y="50" width="160" height="130" rx="4" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1.5"/>
    <!-- クエリ定義の表示 -->
    <rect x="290" y="65" width="140" height="100" rx="3" fill="none" stroke="var(--border-color)" stroke-width="1" stroke-dasharray="3,3"/>
    <text x="360" y="85" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--text-color)" text-anchor="middle">SELECT ... FROM ...</text>
    <text x="360" y="105" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">WHERE student_id =</text>
    <text x="360" y="125" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--accent-color)" text-anchor="middle">LeftTable.ID</text>
    <text x="360" y="145" font-family="var(--font-sans)" font-size="9" fill="var(--text-muted)" text-anchor="middle">LIMIT 3</text>
    <!-- 結合結果への出力 -->
    <path d="M 445 115 L 485 115" fill="none" stroke="var(--text-muted)" stroke-width="1.5" marker-end="url(#arrow-lateral)"/>
    <!-- 出力 -->
    <text x="535" y="110" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--text-color)" text-anchor="middle">結合結果</text>
    <text x="535" y="125" font-family="var(--font-sans)" font-size="8" fill="var(--text-muted)" text-anchor="middle">行ごとの計算結果</text>
  </svg>
</div>

### 技術選定の理由：なぜラテラルジョインが必要なのか
ラテラルジョインは、単純な結合（JOIN）やグループ化（GROUP BY）だけでは表現が難しい、 **行ごとの反復的なクエリ実行** を1つのクエリ内で完結させるために選定される。
例えば、「各コースの受講者数を計算した後に、その結果を利用してさらに平均GPAを計算する」といった、先行クエリの計算結果に依存する行ごとの手続き的な処理が必要な場合である。また、各コースの受講生の中から「GPAが上位3名である学生のリスト」を結合によって一括取得したい場合なども該当する。ラテラルジョインを使用すれば、左側の先行テーブルの行をスキャンしながら、そのIDをパラメータとして右側のサブクエリ（GPA上位3名を取得するクエリなど）を呼び出し、結果を動的に結合していく処理を、手続き型言語の `for-each` ループのようにSQL内で綺麗に表現できる。

---

## 共通テーブル式 (Common Table Expressions: CTE)

**共通テーブル式 (CTE: Common Table Expression)** は、複雑なクエリを段階的に記述し、一時的なビューとして再利用可能にするためのSQL構文である。`WITH` 句を用いて定義される。

```sql
WITH regional_sales AS (
    SELECT region, SUM(amount) AS total_sales
    FROM orders
    GROUP BY region
), top_regions AS (
    SELECT region
    FROM regional_sales
    WHERE total_sales > 100000
)
SELECT region, product, SUM(amount)
FROM orders
WHERE region IN (SELECT region FROM top_regions)
GROUP BY region, product;
```

### 1. 一時的なマテリアライズ
CTEで定義された一時テーブルは、 **そのクエリ全体の実行中のみ有効** であり、クエリ終了後に自動的に破棄される。
DBMSによっては、CTEを単にインライン展開するだけでなく、一時的に計算結果をメモリ上などに実体化（マテリアライズ）してキャッシュする。これにより、同じCTEの定義をクエリの下部で複数回参照する場合でも、計算を一度だけで済ませることができ、実行効率が飛躍的に高まる。

### 2. 再帰処理とチューリング完全性
CTEの定義において `WITH RECURSIVE` 句を使用すると、 **CTE自身が自身の定義を参照する「再帰処理」** を実行できる。

```sql
WITH RECURSIVE cnt(n) AS (
    SELECT 1 -- 基準（アンカーメンバー）
    UNION ALL
    SELECT n + 1 FROM cnt WHERE n < 5 -- 再帰（再帰メンバー）
)
SELECT n FROM cnt;
```

この再帰クエリの能力により、SQLはリレーショナル代数を超え、理論上 **チューリング完全（Turing Complete）** な計算能力を持つ。グラフの経路探索（例えば組織図の探索や交通網の巡回）や、階層型データの走査を単一のSQLで記述することが可能である。

### 技術選定の理由：なぜサブクエリではなくCTEなのか
*   **クエリの可読性（Readability）の向上**: サブクエリが何重にもネストされたクエリは、下部から順に読み解かなければならず「スパゲッティコード」になりやすい。CTEを使用すれば、データを処理する順序に従って上から順番に定義を記述できるため、可読性が劇的に向上する。
*   **再利用性と最適化**: 同じ一時データを複数の場所で参照する際、サブクエリではその都度同じ計算が実行されるリスクがあるが、CTE（特にマテリアライズされる場合）は一度算出した結果を使い回せるため、DBMSの負荷を削減できる。
