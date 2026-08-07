Feature: UI copy traces to the project glossary
  # GLOSSARY.md §D2 · US-TIM1 · audit CP-2. The glossary's banned-variants column is
  # executable: mainland-register vocabulary must not ship in zh-TW UI copy.

  @bound(src/bdd/terminology.feature.test.ts) @pending-fix(fix/copy-slop)
  Scenario: zh-TW copy contains no banned-register vocabulary
    Given the banned-variant table in docs/product/GLOSSARY.md §D2
    When every leaf string in src/locales/zh-TW.json is scanned
    Then no string contains a banned variant
      | banned    | canonical |
      | 緩存      | 快取      |
      | 元數據    | 中繼資料  |
      | 調度器    | 排程器    |
      | 保存      | 儲存      |
      | 運行      | 執行      |
      | 本地儲存  | 本機儲存  |
      | 數據      | 資料      |

  @covered-by(src/i18n.test.js)
  Scenario: Both locales expose identical key sets
    Given src/locales/en.json and src/locales/zh-TW.json
    When their flattened key trees are compared
    Then the key sets are identical and every leaf is a non-empty string

  @covered-by(src/dateformat-usage.guard.test.js)
  Scenario: Dates format through the locale-aware helper
    Given the active vue-i18n locale
    When any page or component formats a date
    Then it calls the shared dateFormat helper rather than raw toLocale*String
