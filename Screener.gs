/**
 * =========================================================================
 * SCREENER [4.0] - OPTIONS SCREENER (Hardened Formatting)
 * =========================================================================
 * Strategy: Sell OTM Puts, Target 1% ROR, Wheel if assigned.
 * Updates:
 * 1. MIGRATED all conditional formatting into script (self-healing pattern).
 * 2. ADDED sheet dimension normalization (600 rows × 52 cols A-AZ).
 * 3. ADDED 'Refresh Formatting' and 'Normalize Sheet' to Scripts menu.
 * 4. All formatting rebuilds from scratch on each run — immune to manual breakage.
 *
 * FORMATTING DESIGN:
 *   All metric rules use the pattern =AND(A$12="<Header>", <condition on A13>)
 *   applied to range A13:AZ600. The A$12 / A13 references are RELATIVE to each
 *   cell, so every cell checks its OWN column header in row 12. This means:
 *     - Column order can change freely without breaking formatting.
 *     - New columns added to the import are auto-formatted if their header matches.
 *     - Columns whose headers don't match any metric name (SYMBOL, SCLD, Country,
 *       Price, etc.) are simply never colored — no rules fire for them.
 */

// =========================================================================
// CONFIGURATION
// =========================================================================
const CONFIG = {
  SHEET_NAME: "Screener",
  HEADER_ROW: 12,         // Row containing column headers
  DATA_START_ROW: 13,     // First row of actual data
  MAX_ROWS: 600,          // Normalize sheet to this many rows
  MAX_COLS: 52,           // Normalize sheet to this many columns (A through AZ)
  WEB_APP_URL: "https://script.google.com/macros/s/AKfycbw8-UTV58R7TuDAUQQC1JHbLu1gg-qzyhMBU89J9DUu3n6tJlXpjRoez629ZQydD0XG1g/exec?cmd=run"
};

// =========================================================================
// SIMPLE TRIGGER: onOpen
// =========================================================================
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  
  ui.createMenu('Scripts')
    .addItem('Remote Data Refresh', 'triggerRemoteRefresh')
    .addSeparator()
    .addItem('Refresh Formatting', 'applyScreenerFormatting')
    .addItem('Normalize Sheet Dimensions', 'screenerNormalizeSheet')
    .addItem('Update Header Tooltips', 'updateHeaderTooltips')
    .addToUi();
}

// =========================================================================
// SHEET DIMENSION NORMALIZATION
// =========================================================================

/**
 * Stabilizes the Screener sheet to exactly MAX_ROWS rows and MAX_COLS columns.
 * Prevents accidental row/column additions or deletions from breaking the layout.
 */
function screenerNormalizeSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  if (!sheet) return;

  // --- Normalize Rows ---
  const currentRows = sheet.getMaxRows();
  if (currentRows > CONFIG.MAX_ROWS) {
    sheet.deleteRows(CONFIG.MAX_ROWS + 1, currentRows - CONFIG.MAX_ROWS);
  } else if (currentRows < CONFIG.MAX_ROWS) {
    sheet.insertRowsAfter(currentRows, CONFIG.MAX_ROWS - currentRows);
  }

  // --- Normalize Columns ---
  const currentCols = sheet.getMaxColumns();
  if (currentCols > CONFIG.MAX_COLS) {
    sheet.deleteColumns(CONFIG.MAX_COLS + 1, currentCols - CONFIG.MAX_COLS);
  } else if (currentCols < CONFIG.MAX_COLS) {
    sheet.insertColumnsAfter(currentCols, CONFIG.MAX_COLS - currentCols);
  }
}

// =========================================================================
// SELF-HEALING CONDITIONAL FORMATTING
// =========================================================================

/**
 * Applies all conditional formatting rules to the Screener sheet.
 * 
 * Pattern: Nuke-and-rebuild.
 *  1. Normalize sheet dimensions
 *  2. Clear ALL existing conditional format rules
 *  3. Clear manual formatting on the data area
 *  4. Rebuild every rule from scratch, in priority order
 * 
 * All metric rules are DYNAMIC — they key off the column header in row 12
 * rather than hard-coded column indices. If columns are reordered or new
 * columns are added to the import, formatting follows automatically.
 * 
 * Rule priority (first match wins for overlapping background rules):
 *  1.     Empty cells         → white background (base layer / override)
 *  2.     Next Earnings       → pink if earnings within N weeks of today
 *  3-5.   Piotroski F-Score   → green / yellow / red
 *  6-8.   Altman Z-Score      → green / yellow / red
 *  9-11.  SMA-Trend           → green / yellow / red
 *  12-14. Momentum            → green / yellow / red
 *  15-17. Avg OI              → green / yellow / red
 *  18-20. ROIC % TTM          → green / yellow / red
 *  21-23. Depth               → green / yellow / red
 *  24-26. Range               → green / yellow / red
 *  27-29. Median OI           → green / yellow / red
 *  30.    Existing Positions  → gray background if symbol in Monitor_Import
 */
function applyScreenerFormatting() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet '${CONFIG.SHEET_NAME}' not found.`);
    return;
  }

  const HR = CONFIG.HEADER_ROW;     // 12
  const DR = CONFIG.DATA_START_ROW; // 13
  const LR = CONFIG.MAX_ROWS;       // 600
  const LC = CONFIG.MAX_COLS;       // 52 (column AZ)
  const dataRows = LR - DR + 1;    // 588

  // --- Step 1: Normalize sheet dimensions ---
  screenerNormalizeSheet();

  // --- Step 2: Nuke all existing conditional format rules ---
  sheet.setConditionalFormatRules([]);

  // --- Step 3: Clear manual formatting on the data area ---
  //     Only clears row 13+ to preserve header/settings area formatting.
  const dataRange = sheet.getRange(DR, 1, dataRows, LC);
  dataRange
    .setBackground(null)
    .setFontColor(null)
    .setFontWeight(null)
    .setFontStyle(null)
    .setFontLine(null);

  // --- Step 4: Define colors ---
  //     These are the standard Google Sheets palette "light 3" variants:
  //       Green  = row 3, col 5  (#d9ead3)
  //       Yellow = row 3, col 4  (#fff2cc)
  //       Red    = row 3, col 2  (#f4cccc)
  const BG_GREEN  = '#d9ead3';
  const BG_YELLOW = '#fff2cc';
  const BG_RED    = '#f4cccc';
  const BG_WHITE  = '#ffffff';
  const BG_GREY   = '#efefef';

  // --- Step 5: Define ranges ---
  //
  //   rangeAll:     A1:AZ600 — for the empty-cell base layer.
  //
  //   rangeMetrics: A13:AZ600 — all data cells.
  //                 Formulas use RELATIVE refs (A$12, A13) so each cell checks
  //                 its OWN column header. Columns A/B have headers "SYMBOL" and
  //                 "SCLD" which never match any metric name → never colored.
  //                 This is intentional: A/B are referential columns.
  //
  //   rangeExclude: C13:AZ600 — for graying out rows matching Monitor_Import.
  //                 Starts at column C to preserve A/B as note-taking columns.
  //                 Uses $C (absolute) in the formula to always check the Symbol
  //                 column regardless of which cell the rule evaluates for.

  const rangeAll      = sheet.getRange(1, 1, LR, LC);             // A1:AZ600
  const rangeMetrics  = sheet.getRange(DR, 1, dataRows, LC);      // A13:AZ600
  const rangeExclude  = sheet.getRange(DR, 3, dataRows, LC - 2);  // C13:AZ600

  // --- Step 6: Build rules (ORDER MATTERS — first match wins) ---
  const rules = [];

  // -----------------------------------------------------------------------
  // RULE 1: Empty cells → white background
  // Purpose: Base layer. Without this, empty cells in metric columns would
  //          match numeric comparisons (empty coerces to 0 → e.g. "≤3" fires
  //          for Piotroski, painting empty rows red). This rule takes priority
  //          and forces white on all empties.
  // -----------------------------------------------------------------------
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenCellEmpty()
    .setBackground(BG_WHITE)
    .setRanges([rangeAll])
    .build());

  // -----------------------------------------------------------------------
  // RULE 2: Next Earnings — pink warning
  // Purpose: Highlights the earnings date cell pink if earnings fall within
  //          N weeks of today (N is set in cell $I$3 — "Earnings Warning").
  //          Uses the dynamic header-check pattern: only the column whose
  //          row-12 header = "Next Earnings" will ever trigger this rule.
  // Note:   $I$3 is an absolute reference to the settings area (rows 1-6),
  //          which is separate from the sortable data columns and stable.
  // -----------------------------------------------------------------------
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(
      '=AND(' +
        'A$' + HR + '="Next Earnings", ' +
        'VALUE(A' + DR + ')>=TODAY(), ' +
        'VALUE(A' + DR + ')<=(TODAY()+($I$3*7))' +
      ')'
    )
    .setBackground(BG_RED)
    .setRanges([rangeMetrics])
    .build());

  // -----------------------------------------------------------------------
  // TRAFFIC-LIGHT METRICS (Rules 3-29)
  // Each metric gets 3 rules: green (good) → yellow (caution) → red (bad).
  //
  // The formula pattern is:
  //   =AND(A$12="<Header Name>", <condition using A13>)
  //
  // Because A$12 and A13 are RELATIVE column references, each cell checks
  // its OWN column header in row 12. If column D has header "Piotroski F-Score",
  // then for cell D13 the formula becomes =AND(D$12="Piotroski F-Score", D13>=7).
  // For cell E13 it becomes =AND(E$12="...", E13>=7) — which won't match if E
  // has a different header. This makes the formatting column-order independent.
  // -----------------------------------------------------------------------

  /**
   * Helper: Adds a green/yellow/red rule triplet for a named metric.
   * @param {string} header  - Exact header text in row 12 to match.
   * @param {string} gCond   - Green condition (use A13 as cell reference).
   * @param {string} yCond   - Yellow condition.
   * @param {string} rCond   - Red condition.
   */
  function addTrafficLight(header, gCond, yCond, rCond) {
    const pairs = [
      [gCond, BG_GREEN],
      [yCond, BG_YELLOW],
      [rCond, BG_RED]
    ];
    pairs.forEach(function(pair) {
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(
          '=AND(A$' + HR + '="' + header + '", ' + pair[0] + ')'
        )
        .setBackground(pair[1])
        .setRanges([rangeMetrics])
        .build());
    });
  }

  // --- Piotroski F-Score (0-9 scale, higher = stronger fundamentals) ---
  addTrafficLight("Piotroski F-Score",
    'A' + DR + '>=7',                                  // Green: Strong (7-9)
    'AND(A' + DR + '>=4, A' + DR + '<=6)',             // Yellow: Moderate (4-6)
    'A' + DR + '<=3'                                   // Red: Weak (0-3)
  );

  // --- Altman Z-Score (bankruptcy risk metric) ---
  addTrafficLight("Altman Z-Score",
    'A' + DR + '>=3',                                  // Green: Safe zone
    'AND(A' + DR + '>=1.8, A' + DR + '<3)',            // Yellow: Grey zone
    'A' + DR + '<1.8'                                  // Red: Distress zone
  );

  // --- SMA-Trend (0-3 scale, higher = stronger uptrend) ---
  addTrafficLight("SMA-Trend",
    'A' + DR + '=3',                                   // Green: Consistent uptrend
    'AND(A' + DR + '>=1, A' + DR + '<=2)',             // Yellow: Mixed/improving
    'A' + DR + '=0'                                    // Red: Consistent downtrend
  );

  // --- Momentum (avg % spread between SMAs) ---
  addTrafficLight("Momentum",
    'AND(A' + DR + '>=0, A' + DR + '<=0.2)',                                          // Green: Positive, not overheated
    'OR(AND(A' + DR + '>=-0.05, A' + DR + '<0), A' + DR + '>0.2)',                    // Yellow: Slightly negative or overheated
    'A' + DR + '<-0.05'                                                                // Red: Significant negative momentum
  );

  // --- Avg OI (average open interest across OTM puts) ---
  addTrafficLight("Avg OI",
    'VALUE(A' + DR + ')>=250',                                                         // Green: High liquidity
    'AND(VALUE(A' + DR + ')>=100, VALUE(A' + DR + ')<250)',                            // Yellow: Moderate
    'VALUE(A' + DR + ')<100'                                                           // Red: Low liquidity
  );

  // --- ROIC % TTM (return on invested capital) ---
  addTrafficLight("ROIC % TTM",
    'A' + DR + '>=0.05',                                                               // Green: Strong returns
    'AND(A' + DR + '<0.05, A' + DR + '>-0.05)',                                        // Yellow: Break-even zone
    'A' + DR + '<=-0.05'                                                               // Red: Destroying capital
  );

  // --- Depth (how many strikes deep the target is) ---
  addTrafficLight("Depth",
    'A' + DR + '>=3',                                  // Green: Comfortably OTM
    'A' + DR + '=2',                                   // Yellow: Moderate cushion
    'A' + DR + '<=1'                                   // Red: Basically ATM
  );

  // --- Range (# of OTM put strikes with non-zero OI) ---
  addTrafficLight("Range",
    'A' + DR + '>=10',                                 // Green: Many strikes available
    'AND(A' + DR + '>=5, A' + DR + '<10)',             // Yellow: Moderate selection
    'A' + DR + '<=4'                                   // Red: Few options to roll into
  );

  // --- Median OI (relative to Avg OI — measures liquidity distribution) ---
  //     Uses INDEX/MATCH to dynamically find the "Avg OI" column, making this
  //     completely column-order independent. Ratio = Median OI / Avg OI.
  //     $A references are absolute (anchored) to ensure the lookup always
  //     scans the full row regardless of which cell the formula evaluates in.
  const ratio = 'IFERROR(A' + DR + '/INDEX($A' + DR + ':$AZ' + DR + ', MATCH("Avg OI", $A$' + HR + ':$AZ$' + HR + ', 0)), 0)';
  addTrafficLight("Median OI",
    ratio + '>=0.75',                                  // Green: Evenly distributed liquidity
    ratio + '>=0.35',                                  // Yellow: Concentrated but usable
    ratio + '<0.35'                                    // Red: Heavily concentrated
  );

  // -----------------------------------------------------------------------
  // RULE 30: Existing Positions — Gray out rows already held
  // Purpose: If the symbol in column C ($C is absolute) already appears in
  //          Monitor_Import!D:D, apply a light gray background to the row
  //          (columns C onward) to visually de-emphasize it. Columns A/B
  //          are excluded to preserve note-taking area.
  // Note:   $C is hard-coded because the Symbol column is a stable anchor
  //          in the sheet layout (always column C). The Monitor_Import!D:D
  //          reference matches the Monitor sheet's symbol column.
  // -----------------------------------------------------------------------
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied(
      '=ISNUMBER(MATCH($C' + DR + ', INDIRECT("\'Monitor_Import\'!D:D"), 0))'
    )
    .setBackground(BG_GREY)
    .setRanges([rangeExclude])
    .build());

  // --- Step 7: Apply all rules ---
  sheet.setConditionalFormatRules(rules);

  ss.toast('Screener formatting rebuilt (' + rules.length + ' rules applied).', 'Formatting Complete');
}

// =========================================================================
// HEADER TOOLTIPS
// =========================================================================

/**
 * Applies tooltips (Notes) to the header row of the Screener sheet.
 */
function updateHeaderTooltips() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);
  
  if (!sheet) {
    SpreadsheetApp.getUi().alert(`Sheet '${CONFIG.SHEET_NAME}' not found. Please check CONFIG.SHEET_NAME in the script.`);
    return;
  }

  const lastColumn = sheet.getLastColumn();
  
  const TOOLTIP_MAP = {
    "Next Earnings": "Earnings dates are generally very volatile; price tends to move significantly on the report. We want to be very cautious about selling puts near-term. 'Week-of' is unwise; 1 week out is risky if we have to roll; 2-4 weeks out is moderately risky depending on roll availability.",
    "Options Score": "The 'Super' Composite of Fundamentals, Technicals, and Liquidity Scores. You can choose your own weighting for each sub-composite in cells E2-E4. This is the primary sorting metric to answer: 'Overall, how good is this stock for selling puts right now?'",
    "Fundamentals Score": "Composite of ROIC, Piotroski F-Score, and Altman Z-Score (equal weighting). Answers: 'How strong is the underlying business?'",
    "Technicals Score": "Composite of SMA-Trend and Momentum (equal weighting). Answers: 'How healthy is the price trend over the past 200 days, and is now the right time to sell puts?'",
    "Liquidity Score": "Composite of Avg OI (50%), Median OI (25%), Depth (12.5%), and Range (12.5%). Answers: 'How liquid is the options chain, and how easy will it be to roll if needed?'",
    "RSI": "Relative Strength Index. <30 is oversold; >70 is overbought. We prefer selling puts in the lower range (<50 generally) to catch potential reversals.",
    "BB %": "Bollinger Band % Position. <35% suggests a pullback/oversold zone. I generally target <40%. Tighten this limit if there are too many results; loosen it if there are too few.",
    "ROIC % TTM": "Return on Invested Capital. Measures how efficiently a company generates profit from its capital. Answers: 'How is the business performing right now?'",
    "Piotroski F-Score": "A 9-point test checking if business fundamentals are improving year-over-year. Higher is better. Answers: 'Are fundamentals improving, stagnating, or declining?'",
    "Altman Z-Score": "A formula-based bankruptcy risk metric. >3.0 is 'Safe'; 1.8–3.0 is 'Grey Zone'; <1.8 indicates higher distress risk within ~2 years.",
    "200-Day": "Sparkline showing the price action over the last 200 trading days.",
    "Momentum": "Average % spread between SMAs. Measures the 'acceleration' of the price trend. We want positive momentum, but avoid 'overheated' stocks (>20%) that may be ripe for a pullback.",
    "SMA-Trend": "Trend strength based on 200/100/50 SMA relationships. 0: Consistent downtrend (Avoid). 1: Mixed/Weakening trend. 2: Improving trend (Good). 3: Consistent uptrend (Best).",
    "Avg OI": "Average Open Interest across OTM puts. Higher = more activity, which leads to tighter spreads and easier rolls.",
    "Median OI": "The midpoint of Open Interest across strikes. If the Median is close to the Average, liquidity is spread evenly (ideal). If much lower, liquidity is concentrated in only a few strikes.",
    "Range": "The number of OTM put strikes that have non-zero Open Interest. This indicates how many active strikes are available to choose from or roll into.",
    "Depth": "How many strikes 'deep' the target 1% ROR strike is. Higher is better (further OTM). A '1' indicates the strike is basically At-The-Money (ATM), which offers less margin for error.",
    "ROR %": "Weekly Return on Risk (Premium / Strike). Our baseline target is >1%.",
    "OI": "Open Interest for the specific target strike. Represents the total number of active contracts currently held by market participants.",
    "Bid": "The current premium (price) received for selling the put contract.",
    "Strike": "The target Put strike price we are looking to sell.",
    "SMA 50": "50-Day Simple Moving Average. Provides a 'smoothed' view of the short-term price trend.",
    "SMA 100": "100-Day Simple Moving Average. Provides a 'smoothed' view of the medium-term price trend.",
    "SMA 200": "200-Day Simple Moving Average. The standard institutional metric for the long-term 'health' of a stock."
  };

  const headerRange = sheet.getRange(CONFIG.HEADER_ROW, 1, 1, lastColumn);
  const headerValues = headerRange.getValues()[0];

  headerValues.forEach((headerName, index) => {
    const cell = headerRange.getCell(1, index + 1);
    const cleanName = headerName ? headerName.toString().trim() : "";
    if (TOOLTIP_MAP[cleanName]) {
      cell.setNote(TOOLTIP_MAP[cleanName]);
    } else {
      cell.clearNote(); 
    }
  });

  ss.toast("Header tooltips have been updated.", "Documentation Updated");
}

// =========================================================================
// REMOTE DATA REFRESH
// =========================================================================

/**
 * Pings the Data Spreadsheet Web App.
 */
function triggerRemoteRefresh() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  if (CONFIG.WEB_APP_URL.includes("REPLACE_WITH_YOUR_URL")) {
    ui.alert("Error: You must provide your own Web App URL in the CONFIG section of the script.");
    return;
  }
  
  try {
    ss.toast("Starting remote refresh...", "Backend Update", 5);
    const response = UrlFetchApp.fetch(CONFIG.WEB_APP_URL);
    ui.alert("Backend Response: " + response.getContentText());
  } catch (e) {
    ui.alert("Failed to communicate with Backend: " + e.toString());
  }
}

// =========================================================================
// SCHEDULED AUTOMATION
// =========================================================================

/**
 * Automates the update of Expiry (B1) and ROR (B6) for the upcoming week.
 */
function scheduledReset() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME); 
  
  if (!sheet) return;

  const today = new Date();
  const upcomingFriday = getNextFriday(today);
  const targetROR = 0.01;

  sheet.getRange("B1").setValue(upcomingFriday);
  sheet.getRange("B6").setValue(targetROR);

  ss.toast("Screener parameters reset for the upcoming week.", "Automated Reset");
}

/**
 * Helper: Calculate next Friday.
 */
function getNextFriday(date) {
  const resultDate = new Date(date.getTime());
  const dayOfWeek = resultDate.getDay();
  let daysUntilFriday = (5 - dayOfWeek + 7) % 7;
  if (daysUntilFriday === 0) daysUntilFriday = 7;
  resultDate.setDate(resultDate.getDate() + daysUntilFriday);
  resultDate.setHours(0, 0, 0, 0);
  return resultDate;
}