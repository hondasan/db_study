---
title: "1-3. リレーショナル代数とデータ操作言語"
description: "手続き型と宣言型DMLの違い、リレーショナル代数の基本演算、およびリレーショナル以外のその他のデータモデルについて解説します。"
order: 3
category: "データベースの基礎"
---

# リレーショナル代数とデータ操作言語

リレーション内のデータを取得・操作するための演算体系である「リレーショナル代数」と、データ操作言語（DML）のアプローチ、およびその他のデータモデルについて解説する。

---

## 2つのデータ操作言語 (DML)

データベース内のデータを操作するために使用する言語をデータ操作言語（DML: Data Manipulation Language）と呼ぶ。DMLには大きく分けて「手続き型」と「宣言型（非手続き型）」の2つの設計アプローチが存在する。

*   **手続き型DML (Procedural DML)**: 求める結果を得るために、DBMSが実行すべき戦略やステップ（処理順序）を明示的に指定する言語。
*   **宣言型 / 非手続き型DML (Declarative / Non-Procedural DML)**: データをどのように取得するかではなく、「どのようなデータが欲しいか」という結果のみを指定する言語（例: SQL）。

### 技術選定の理由：なぜ宣言型言語（SQL）なのか
手続き型言語（リレーショナル代数の直接記述など）では、プログラマがデータ構造に合わせて実行順序を決定しなければならない。
一方、SQLのような宣言型言語を使用すれば、DBMSのクエリオプティマイザがデータサイズなどを加味して、最も効率的な実行戦略（Query Optimization）を自動で決定する。これにより、クエリ最適化がシステム側で行われるため、プログラマの負担が減り、パフォーマンスと開発の生産性が向上する。

<div class="note-box">
  <p><strong>コラム: 実行順序の違いによるパフォーマンスの差</strong></p>
  <p>テーブル R と、10億件のタプルを持つテーブル S があり、S には条件を満たすタプルが1件しかないとする。</p>
  <p>このとき、<strong>「R と S を結合 (Join) してから、1件をフィルタリング (Select) する」</strong> 手順を実行すると、10億件の結合処理が発生する。しかし、<strong>「S をフィルタリングして1件にしてから、R と結合する」</strong> 手順であれば、一瞬で終わる。宣言型DMLでは、このような最適化をDBMSが自動で判断する。</p>
</div>

---

## リレーショナル代数 (Relational Algebra)

リレーショナル代数とは、リレーション内のタプルを取得・操作するための基本的な演算子のセットである。
各演算子は1つ以上のリレーションを入力とし、新しいリレーションを出力する。これにより演算子を連結（チェーン）させることが可能である。

<div class="diagram-container">
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 240" width="100%" height="auto" style="width: 100%; max-width: 100%;">
    <!-- 定義（マーカーなど） -->
    <defs>
      <marker id="arrow" viewBox="0 0 10 10" refX="6" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
        <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="var(--text-muted)"/>
      </marker>
    </defs>
    <!-- 1. 元のテーブル (左側) -->
    <text x="30" y="30" font-family="var(--font-sans)" font-size="12" font-weight="600" fill="var(--text-color)">元のテーブル (Relation)</text>
    <!-- テーブル枠 -->
    <rect x="30" y="45" width="150" height="130" rx="4" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1.5"/>
    <!-- ヘッダー行 -->
    <rect x="30" y="45" width="150" height="25" rx="4" fill="var(--accent-light)" stroke="var(--border-color)" stroke-width="1"/>
    <line x1="80" y1="45" x2="80" y2="175" stroke="var(--border-color)" stroke-width="1"/>
    <line x1="130" y1="45" x2="130" y2="175" stroke="var(--border-color)" stroke-width="1"/>
    <!-- ヘッダーテキスト -->
    <text x="55" y="62" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--accent-color)" text-anchor="middle">ID</text>
    <text x="105" y="62" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--accent-color)" text-anchor="middle">Name</text>
    <text x="155" y="62" font-family="var(--font-sans)" font-size="10" font-weight="600" fill="var(--accent-color)" text-anchor="middle">Age</text>
    <!-- データ行の区切り線 -->
    <line x1="30" y1="95" x2="180" y2="95" stroke="var(--border-color)" stroke-width="1"/>
    <line x1="30" y1="120" x2="180" y2="120" stroke="var(--border-color)" stroke-width="1"/>
    <line x1="30" y1="145" x2="180" y2="145" stroke="var(--border-color)" stroke-width="1"/>
    <!-- データテキスト（一部ダミー） -->
    <text x="55" y="87" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">1</text>
    <text x="105" y="87" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">Alice</text>
    <text x="155" y="87" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">20</text>
    <!-- 選択される行（BobとDanielの行をハイライトして選択のデモに） -->
    <rect x="31" y="96" width="148" height="23" fill="var(--accent-light)" opacity="0.4"/>
    <text x="55" y="112" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--text-color)" text-anchor="middle">2</text>
    <text x="105" y="112" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--text-color)" text-anchor="middle">Bob</text>
    <text x="155" y="112" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--text-color)" text-anchor="middle">22</text>
    <!-- 射影される列（Name列をハイライトして射影のデモに。薄いグレーなどの透過背景を被せる） -->
    <rect x="81" y="46" width="48" height="128" fill="var(--text-muted)" opacity="0.15"/>
    <text x="55" y="137" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">3</text>
    <text x="105" y="137" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">Charlie</text>
    <text x="155" y="137" font-family="var(--font-sans)" font-size="9" fill="var(--text-color)" text-anchor="middle">21</text>
    <rect x="31" y="146" width="148" height="28" fill="var(--accent-light)" opacity="0.4"/>
    <text x="55" y="162" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--text-color)" text-anchor="middle">4</text>
    <text x="105" y="162" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--text-color)" text-anchor="middle">Daniel</text>
    <text x="155" y="162" font-family="var(--font-sans)" font-size="9" font-weight="600" fill="var(--text-color)" text-anchor="middle">23</text>
    <!-- 2. 選択演算 (右上) -->
    <!-- 矢印 -->
    <path d="M 190 90 L 260 70" fill="none" stroke="var(--text-muted)" stroke-width="1.5" marker-end="url(#arrow)"/>
    <text x="225" y="65" font-family="var(--font-sans)" font-size="9" fill="var(--text-muted)" text-anchor="middle">選択 (σ)</text>
    <!-- 選択結果 -->
    <text x="280" y="30" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--text-color)">選択 (Select: σ_Age&gt;21)</text>
    <text x="280" y="43" font-family="var(--font-sans)" font-size="8" fill="var(--text-muted)">条件に合致する「行 (タプル)」を抽出する</text>
    <rect x="280" y="52" width="150" height="75" rx="4" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1"/>
    <!-- ヘッダー -->
    <rect x="280" y="52" width="150" height="20" rx="4" fill="var(--accent-light)" stroke="var(--border-color)" stroke-width="0.5"/>
    <line x1="330" y1="52" x2="330" y2="127" stroke="var(--border-color)" stroke-width="0.5"/>
    <line x1="380" y1="52" x2="380" y2="127" stroke="var(--border-color)" stroke-width="0.5"/>
    <text x="305" y="65" font-family="var(--font-sans)" font-size="8" font-weight="600" fill="var(--accent-color)" text-anchor="middle">ID</text>
    <text x="355" y="65" font-family="var(--font-sans)" font-size="8" font-weight="600" fill="var(--accent-color)" text-anchor="middle">Name</text>
    <text x="405" y="65" font-family="var(--font-sans)" font-size="8" font-weight="600" fill="var(--accent-color)" text-anchor="middle">Age</text>
    <!-- データ -->
    <line x1="280" y1="90" x2="430" y2="90" stroke="var(--border-color)" stroke-width="0.5"/>
    <text x="305" y="83" font-family="var(--font-sans)" font-size="8" fill="var(--text-color)" text-anchor="middle">2</text>
    <text x="355" y="83" font-family="var(--font-sans)" font-size="8" fill="var(--text-color)" text-anchor="middle">Bob</text>
    <text x="405" y="83" font-family="var(--font-sans)" font-size="8" fill="var(--text-color)" text-anchor="middle">22</text>
    <text x="305" y="103" font-family="var(--font-sans)" font-size="8" fill="var(--text-color)" text-anchor="middle">4</text>
    <text x="355" y="103" font-family="var(--font-sans)" font-size="8" fill="var(--text-color)" text-anchor="middle">Daniel</text>
    <text x="405" y="103" font-family="var(--font-sans)" font-size="8" fill="var(--text-color)" text-anchor="middle">23</text>
    <!-- 3. 射影演算 (右下) -->
    <!-- 矢印 -->
    <path d="M 190 140 L 260 165" fill="none" stroke="var(--text-muted)" stroke-width="1.5" marker-end="url(#arrow)"/>
    <text x="225" y="165" font-family="var(--font-sans)" font-size="9" fill="var(--text-muted)" text-anchor="middle">射影 (π)</text>
    <!-- 射影結果 -->
    <text x="280" y="145" font-family="var(--font-sans)" font-size="11" font-weight="600" fill="var(--text-color)">射影 (Projection: π_Name)</text>
    <text x="280" y="157" font-family="var(--font-sans)" font-size="8" fill="var(--text-muted)">指定した「列 (属性)」のみを抽出する</text>
    <rect x="280" y="165" width="70" height="70" rx="4" fill="var(--bg-hover)" stroke="var(--border-color)" stroke-width="1"/>
    <!-- ヘッダー -->
    <rect x="280" y="165" width="70" height="20" rx="4" fill="var(--accent-light)" stroke="var(--border-color)" stroke-width="0.5"/>
    <text x="315" y="178" font-family="var(--font-sans)" font-size="8" font-weight="600" fill="var(--accent-color)" text-anchor="middle">Name</text>
    <!-- データ -->
    <line x1="280" y1="197" x2="350" y2="197" stroke="var(--border-color)" stroke-width="0.5"/>
    <line x1="280" y1="209" x2="350" y2="209" stroke="var(--border-color)" stroke-width="0.5"/>
    <line x1="280" y1="221" x2="350" y2="221" stroke="var(--border-color)" stroke-width="0.5"/>
    <text x="315" y="193" font-family="var(--font-sans)" font-size="8" fill="var(--text-color)" text-anchor="middle">Alice</text>
    <text x="315" y="205" font-family="var(--font-sans)" font-size="8" fill="var(--text-color)" text-anchor="middle">Bob</text>
    <text x="315" y="217" font-family="var(--font-sans)" font-size="8" fill="var(--text-color)" text-anchor="middle">Charlie</text>
    <text x="315" y="229" font-family="var(--font-sans)" font-size="8" fill="var(--text-color)" text-anchor="middle">Daniel</text>
  </svg>
</div>

主要な演算子は以下の通りである。

| 演算子 | 記号 | 説明 | 対応するSQL |
| :--- | :---: | :--- | :--- |
| **選択 (Select)** | σ | 選択述語（条件）を満たすタプルのサブセットを出力する。 | `WHERE` 句 |
| **射影 (Projection)** | π | 指定された属性のみを含むリレーションを出力する。 | `SELECT` リスト |
| **和 (Union)** | ∪ | 両方の入力リレーションの少なくとも一方に存在するタプルを出力。 | `UNION` |
| **交わり (Intersection)** | ∩ | 両方の入力リレーションに存在するタプルを出力。 | `INTERSECT` |
| **差 (Difference)** | − | 最初の入力には存在し、2番目の入力には存在しないタプルを出力。 | `EXCEPT` |
| **直積 (Product)** | × | 2つのリレーションのタプルのすべての可能な組み合わせを出力する。 | `CROSS JOIN` |
| **結合 (Join)** | ⋈ | 共有する属性の値が一致するタプルの組み合わせを出力する。 | `INNER JOIN` など |

<div class="note-box">
  <p><strong>歴史的補足: リレーショナル代数と集計機能</strong></p>
  <p>リレーショナル代数単体にはソートや集計（COUNTやSUMなど）の概念が元々は存在せず、後に実務上の必要性から拡張されたという経緯がある。</p>
</div>

---

## その他のデータモデル

リレーショナルモデル以外の特定用途向けのデータモデルとして、以下の2つが広く知られている。

### 1. ドキュメントデータモデル (Document Data Model)
名前付きのフィールドと値のペアの階層構造を含むドキュメントのコレクション（JSONやXMLなど）を表すデータモデル。
柔軟な構造を扱える一方で、リレーショナルモデルのような厳密なデータ整合性やリレーション間の依存関係を管理する面では、依然としてフラットファイルと同様の整合性欠如の問題に直面する可能性がある。

### 2. ベクターデータモデル (Vector Data Model)
機械学習（ML）のトランスフォーマーモデルによって生成された埋め込み（Embedding）のセマンティック検索や、近似近傍探索（Nearest-Neighbor Search）に使用される1次元配列を表すデータモデル。
専用のインデックスを用いて高速な近傍探索を行う。

<div class="note-box">
  <p><strong>技術トレンド: リレーショナルDBMSとの融合</strong></p>
  <p>最近ではリレーショナルDBMSでも拡張機能（pgvectorなど）としてベクターデータモデルをサポートしており、一つのシステム内でリレーショナルデータとベクターデータを統合して管理することが可能になっている。</p>
</div>

### 技術選定の理由（Why）
ドキュメントデータモデルは、柔軟な半構造化データをシンプルに管理したい場合に選定される。ベクターデータモデルは、LLMなどの最新のMLツール（LangChain, OpenAIなど）との統合やセマンティック検索という特殊な要件を満たすために使用される。
