---
title: "2-3. ウィンドウ関数とデータビルドパイプライン"
description: "タプルを集約せずに行の粒度を保ったまま相対的な計算を行うウィンドウ関数の仕組み、実行プロセス、およびデータウェアハウスにおけるdbtを用いたELTデータ変換パイプラインの構築について解説します。"
order: 6
category: "SQLと高度なクエリ"
---

# 2-3. ウィンドウ関数とデータビルドパイプライン

本節では、データの集計や分析をより柔軟かつ厳密に行うための「ウィンドウ関数」の仕組み、およびモダンデータエンジニアリングに不可欠なデータ変換ツール「dbt（Data Build Tool）」を用いたデータパイプライン構築のアーキテクチャについて解説する。

---

## ウィンドウ関数 (Window Functions)

### 1. ウィンドウ関数の定義と特徴
**ウィンドウ関数（Window Functions）**とは、テーブルのデータを集約（圧縮）して行数を減らすことなく、関連する行の集合（ウィンドウ）に対して計算を実行し、各行に対して1つの集計値を生成する特殊な関数である。

`GROUP BY` を用いた集計では、グループ化された単位で行が完全に「潰れて」しまい、個々のデータの詳細（粒度）が失われる。これに対し、ウィンドウ関数は**「元のデータの行数を維持したまま、他の行の値を考慮した計算結果を新しい列として付加する」**ことができる。

<div class="diagram-container">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 320" width="100%" height="auto" style="width: 100%; max-width: 100%;">
    <defs>
      <marker id="arrow-window" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--text-muted)"/>
      </marker>
    </defs>
    <text x="70" y="30" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--text-color)">入力テーブル (4行)</text>
    <rect x="20" y="45" width="100" height="90" rx="3" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1.5"/>
    <line x1="20" y1="67" x2="120" y2="67" stroke="var(--border-color)"/>
    <line x1="20" y1="90" x2="120" y2="90" stroke="var(--border-color)"/>
    <line x1="20" y1="112" x2="120" y2="112" stroke="var(--border-color)"/>
    <text x="70" y="60" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">A部門 : 100</text>
    <text x="70" y="82" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">A部門 : 200</text>
    <text x="70" y="105" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">B部門 : 150</text>
    <text x="70" y="127" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">B部門 : 250</text>
    <path d="M 130 75 L 210 60" fill="none" stroke="var(--text-muted)" stroke-width="1.2" marker-end="url(#arrow-window)"/>
    <text x="170" y="50" font-family="var(--font-sans)" font-size="9" fill="var(--text-muted)" text-anchor="middle">GROUP BY</text>
    <text x="290" y="30" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--text-color)">GROUP BY 結果 (2行に集約)</text>
    <rect x="230" y="45" width="120" height="50" rx="3" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1.5"/>
    <line x1="230" y1="70" x2="350" y2="70" stroke="var(--border-color)"/>
    <text x="290" y="62" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">A部門 : 合計 300</text>
    <text x="290" y="87" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">B部門 : 合計 400</text>
    <path d="M 130 110 L 210 200" fill="none" stroke="var(--accent-color)" stroke-width="1.5" marker-end="url(#arrow-window)"/>
    <text x="180" y="150" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--accent-color)" text-anchor="middle">OVER (PARTITION BY...)</text>
    <text x="230" y="170" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--text-color)">ウィンドウ関数結果 (4行を維持 + 集計列)</text>
    <rect x="230" y="185" width="200" height="90" rx="3" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1.5"/>
    <line x1="230" y1="207" x2="430" y2="207" stroke="var(--border-color)"/>
    <line x1="230" y1="230" x2="430" y2="230" stroke="var(--border-color)"/>
    <line x1="230" y1="252" x2="430" y2="252" stroke="var(--border-color)"/>
    <line x1="330" y1="185" x2="330" y2="275" stroke="var(--accent-color)" stroke-width="1" stroke-dasharray="2,2"/>
    <text x="280" y="200" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">A部門 : 100</text>
    <text x="380" y="200" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--accent-color)" text-anchor="middle">部門合計 300</text>
    <text x="280" y="222" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">A部門 : 200</text>
    <text x="380" y="222" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--accent-color)" text-anchor="middle">部門合計 300</text>
    <text x="280" y="245" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">B部門 : 150</text>
    <text x="380" y="245" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--accent-color)" text-anchor="middle">部門合計 400</text>
    <text x="280" y="267" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">B部門 : 250</text>
    <text x="380" y="267" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--accent-color)" text-anchor="middle">部門合計 400</text>
  </svg>
</div>

### 2. 構文と主要な句
ウィンドウ関数は、関数名の後に `OVER` 句を指定することで適用する。

```sql
SELECT employee_name, department, salary,
       AVG(salary) OVER(PARTITION BY department) AS dept_avg_salary
FROM employees;
```

*   **OVER 句**: ウィンドウ関数を計算する際に対象とする行の「窓（ウィンドウ）」の定義を開始する。
*   **PARTITION BY**: データを論理的なサブセット（パーティション）に分割する。これは集約を行わない `GROUP BY` のように機能する。
*   **ORDER BY**: 各パーティション内で、計算を評価するためのデータの順序を指定する（例: 累計や移動平均、順位付けを行う際に重要）。

### 3. ウィンドウ関数の実行プロセス
DBMS内部において、ウィンドウ関数は以下の論理的ステップに沿って処理される。
1.  **パーティション分割**: `PARTITION BY` に基づき、データを各グループに分ける。
2.  **ソート**: 各パーティション内で、`ORDER BY` に従い行を整列する。
3.  **ウィンドウ（フレーム）作成**: `ROWS` や `RANGE` 指定に従い、現在の行から前後どれだけの範囲を計算対象とするか（スライディングウィンドウ）を確定する。
4.  **出力計算**: 定められたウィンドウ内で関数を適用し、現在の行に対する値を算出する。

### 4. 順位付け関数における内部処理順序の差異
値を順位付けする関数（`ROW_NUMBER()` や `RANK()`）は、内部的な処理順序において挙動が異なる。
*   **ROW_NUMBER()**: 各行に一意の連番を付与する。内部処理的には、パーティション内で**ソートが行われる前**の段階から「仮の行インデックス」が認識されており、順序が確定した段階で最終的な連番が割り当てられる。
*   **RANK()**: 同率の順位がある場合に後続の順位をスキップ（例: 1位、2位、2位、4位）して順位を決定する。そのため、パーティション内の行が**完全にソートされた後**でなければ、各タプルの重複関係（同率）が判定できず、順位が確定しない。

<div class="note-box">
  <p><strong>コラム: 移動平均 (Moving Average) の実用例</strong></p>
  <p>株価や気温の推移データを分析する際、「過去3日間の移動平均（Moving Average）」を計算したい場合がある。</p>
  <pre><code>SELECT date, price,
       AVG(price) OVER(
           ORDER BY date 
           ROWS BETWEEN 2 PRECEDING AND CURRENT ROW
       ) AS moving_avg_3days
FROM stock_prices;</code></pre>
  <p><code>ROWS BETWEEN 2 PRECEDING AND CURRENT ROW</code> は、「現在の行と、その前の2行（計3行）」のスライド窓を定義している。これにより、1日の粒度（行数）を一切崩すことなく、日々変化する3日移動平均値を綺麗に算出できる。これは <code>GROUP BY</code> だけでは実現不可能な処理である。</p>
</div>

### 技術選定の理由：なぜウィンドウ関数が必要とされるのか
通常の `GROUP BY` による集約では、詳細なレコード（行）の個別情報がすべて削ぎ落とされてしまう。行ごとの詳細をダッシュボード等に表示しながら、同時に「部門内での給与順位」や「前月との売上比率（LEAD/LAG関数）」を計算したい場合、ウィンドウ関数を用いなければ、自己結合（Self-Join）を何重にも繰り返す極めて複雑で遅いクエリを書く必要が生じる。行の粒度を完全に保ちながらグループ内相対計算を効率化するために、ウィンドウ関数は必須の技術として選定される。

---

## データ変換とパイプライン構築 (dbtの仕組み)

データウェアハウス（DWH）やデータレイクに蓄積された膨大な「生データ（Raw Data）」を、ビジネスやBIツールで即座に利用できる「クリーンなデータ」へと加工・構築するプロセスが必要となる。このプロセス（特にデータ変換：Transform）を管理するデファクトスタンダードが **dbt（Data Build Tool）** である。

### 1. dbt の基本概念
dbt は、データエンジニアリングにおける **ELT（Extract-Load-Transform）** の「T（変換）」に特化したオープンソースツールである。
dbt 自体はデータを処理するデータベースエンジンを持っておらず、Snowflake、BigQuery、Redshift、DuckDBといった外部のデータウェアハウスに対して直接SQLクエリを発行し、**処理をDWH側にプッシュダウン（委譲）**して実行させる仕組みを持つ。

### 2. Jinja テンプレートによる依存関係グラフ (DAG) の構築
dbt では、データ変換ロジックを通常の `SELECT` ステートメントで記述し、これを「モデル（Model）」と呼ぶ。
SQLのコード内に `Jinja` と呼ばれるテンプレートエンジンが組み込まれており、モデル間の参照関係を `{{ ref('model_name') }}` というマクロで指定する。

```sql
-- models/stg_orders.sql
SELECT order_id, customer_id, order_date
FROM {{ source('raw', 'orders') }}

-- models/dim_customers.sql
WITH customer_orders AS (
    SELECT customer_id, COUNT(order_id) AS total_orders
    FROM {{ ref('stg_orders') }} -- 依存関係の定義
    GROUP BY customer_id
)
SELECT c.customer_id, co.total_orders
FROM {{ source('raw', 'customers') }} c
LEFT JOIN customer_orders co ON c.customer_id = co.customer_id
```

dbt は、この `ref()` マクロを解析してモデル間の関係性をスキャンし、**有向非巡回グラフ（DAG: Directed Acyclic Graph）** を内部で自動的に構築する。これにより、どのテーブルをどの順序で作成・更新すべきかという「データリネージ（データの系譜）」が可視化され、順序制御が自動で行われる。

<div class="diagram-container">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="100%" height="auto" style="width: 100%; max-width: 100%;">
    <defs>
      <marker id="arrow-dbt" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--text-muted)"/>
      </marker>
    </defs>
    <text x="70" y="30" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--text-muted)" text-anchor="middle">1. RAW DATA (ソース)</text>
    <text x="250" y="30" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--text-muted)" text-anchor="middle">2. STAGING (前処理)</text>
    <text x="430" y="30" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--text-muted)" text-anchor="middle">3. MARTS (結合・ビジネスロジック)</text>
    <text x="550" y="30" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--text-muted)" text-anchor="middle">4. BI</text>
    <rect x="20" y="60" width="100" height="40" rx="3" fill="var(--bg-hover)" stroke="var(--border-color)"/>
    <text x="70" y="84" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">raw_orders</text>
    <rect x="20" y="140" width="100" height="40" rx="3" fill="var(--bg-hover)" stroke="var(--border-color)"/>
    <text x="70" y="164" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">raw_customers</text>
    <rect x="200" y="60" width="100" height="40" rx="3" fill="var(--accent-light)" stroke="var(--accent-color)"/>
    <text x="250" y="84" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--accent-color)" text-anchor="middle">stg_orders</text>
    <rect x="200" y="140" width="100" height="40" rx="3" fill="var(--accent-light)" stroke="var(--accent-color)"/>
    <text x="250" y="164" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--accent-color)" text-anchor="middle">stg_customers</text>
    <rect x="380" y="100" width="100" height="40" rx="3" fill="var(--accent-light)" stroke="var(--accent-color)"/>
    <text x="430" y="124" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--accent-color)" text-anchor="middle">dim_customers</text>
    <path d="M 125 80 L 195 80" fill="none" stroke="var(--text-muted)" stroke-width="1.2" marker-end="url(#arrow-dbt)"/>
    <path d="M 125 160 L 195 160" fill="none" stroke="var(--text-muted)" stroke-width="1.2" marker-end="url(#arrow-dbt)"/>
    <path d="M 305 80 L 375 110" fill="none" stroke="var(--accent-color)" stroke-width="1.5" marker-end="url(#arrow-dbt)"/>
    <path d="M 305 160 L 375 130" fill="none" stroke="var(--accent-color)" stroke-width="1.5" marker-end="url(#arrow-dbt)"/>
    <path d="M 485 120 L 535 120" fill="none" stroke="var(--text-muted)" stroke-width="1.2" marker-end="url(#arrow-dbt)"/>
    <circle cx="550" cy="120" r="12" fill="var(--bg-hover)" stroke="var(--border-color)"/>
    <text x="550" y="123" font-family="var(--font-sans)" font-size="8" fill="var(--text-color)" text-anchor="middle">📊</text>
  </svg>
</div>

### 3. 実体化（マテリアライズ）の自動化
dbt が実行されると（`dbt run` コマンド実行時）、記述された `SELECT` クエリを dbt が読み込み、DWHのエンジンに適合する `CREATE TABLE AS SELECT ...`（CTAS）や `CREATE VIEW AS ...` などのDDL文に動的にラップして実行する。
データ構造やボリュームに応じて、単なる「ビュー（仮想テーブル）」としてマテリアライズするか、物理的な「テーブル」として書き出すか、差分データのみを更新する「インクリメンタル（増分）」にするかを、設定ファイル（YAML）上で宣言するだけで容易に制御できる。

<div class="note-box">
  <p><strong>コラム: 40個のテーブルから1つの抽象化テーブルへ（教授の具体例）</strong></p>
  <p>例えば、ある企業で40個の異なるソーステーブル（売上、顧客履歴、サポートログなど）からデータを抽出・統合し、BIツール（ダッシュボードなど）が即座に利用できる抽象化された1つのクリーンなマートテーブル <code>dim_strike_customers</code> を構築したいとする。</p>
  <p>dbtが登場する前のデータ現場では、このような処理を行うために数百個の複雑なSQLスクリプトが手動のCronやアドホックなシェルスクリプトで実行され、どのテーブルがどのデータに依存しているのか（データリネージ）が把握不可能な「スパゲッティ状態」が生じやすかった。</p>
  <p>dbtは、SQL開発に以下のソフトウェアエンジニアリング（Software Engineering）のプラクティスを導入することで、この問題を解決する。</p>
  <ul>
    <li><strong>バージョン管理</strong>: SQLファイルがGitで完全に管理され、変更履歴が追跡可能になる。</li>
    <li><strong>データリネージの可視化</strong>: <code>ref()</code> マクロによって40個のソースから <code>dim_strike_customers</code> に至る依存関係が自動的にグラフ（DAG）化される。</li>
    <li><strong>自動テストとCI/CD</strong>: カラムのユニーク性や非NULL（not_null）制約を定義するだけで自動でテストクエリが生成・実行され、データの品質が担保される。</li>
  </ul>
</div>

### 技術選定の理由：なぜ dbt が選ばれるのか
生データを直接操作してビジネスレポートを作成すると、同じような消費税の算出ロジックや顧客分類ルールが複数のBIツールやクエリに重複して書かれ、数値の不整合（カオス）が発生する。さらに、上流のソーステーブルのスキーマ変更があった際に、どの下流テーブルやBIレポートが破損するかを特定できない。
ソフトウェアエンジニアリングの手法をデータ変換パイプラインに取り入れ、依存関係グラフ（DAG）と自動テストを導入することで、データ変換の信頼性、保守性、および再現性を極限まで高めるために dbt は技術選定される。
