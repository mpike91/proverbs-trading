/**
 * =========================================================================
 * MONITOR [3.23] - OPTIONS TRACKING (Full Mobile Control Panel)
 * =========================================================================
 * Strategy: Sell OTM Puts, Target 1% ROR, Wheel if assigned.
 * Updates:
 * 1. FIXED onOpen failure by removing Global Scope variables.
 * 2. REORGANIZED Controls tab into 'Actions' (Rows 1-3) and 'Settings' (Row 5+).
 * 3. Updated all row references to match the new UI layout.
 * 4. Added "Roll" threshold tooltip to cell K1.
 * 5. [3.23] Refined Put roll thresholds (no signal 3+ weeks out).
 * 6. [3.23] Refined Call roll logic (ROLL UP when Strike < Assigned & moneyness >= -1%).
 * 7. [3.23] Refined Call ITM/OTM coloring per Strike vs Assigned relationship.
 * 8. [3.23] Added expiry-day put handling: any ITM → ROLL, < 1% OTM → WATCH.
 */

// SHEET NAME CONFIGURATION
const SHEET_MONITOR = 'Monitor';
const SHEET_DATA    = 'Data_Import';
const SHEET_CTRL    = 'Controls';

// MONITOR COLUMN INDICES (1-based)
const COL_DATE         = 1;  // A
const COL_WEEKS        = 2;  // B
const COL_EXPIRY       = 3;  // C
const COL_SYMBOL       = 4;  // D
const COL_TYPE         = 5;  // E
const COL_NUMBER       = 6;  // F
const COL_STRIKE       = 7;  // G
const COL_PRICE        = 8;  // H
const COL_CHANGE       = 9;  // I
const COL_ITM          = 10; // J
const COL_ROLL         = 11; // K
const COL_COMMENTS     = 12; // L
const COL_ASSIGN_PRICE = 13; // M
const COL_QUAL_SCORE   = 14; // N
const COL_FUND_SCORE   = 15; // O
const COL_TECH_SCORE   = 16; // P

/**
 * SIMPLE TRIGGER: onOpen
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi(); 
  
  ui.createMenu('Scripts')
    .addItem('Refresh Monitor', 'runMonitorAll')
    .addItem('Refresh Monitor + Remove Expired', 'runMonitorWithCleanup')
    .addSeparator()
    .addItem('Monitor: Compact Rows', 'monitorCompactRows')
    .addItem('Monitor: Get Quotes', 'monitorGetQuotes')
    .addItem('Monitor: Sync Scores', 'monitorSyncScores') 
    .addItem('Monitor: Calculate Weeks Out', 'monitorCalculateWeeksOut')
    .addItem('Monitor: Calculate Moneyness', 'monitorCalculateMoneyness')
    .addItem('Monitor: Calculate Rolls', 'monitorCalculateRolls')
    .addItem('Monitor: Sort Sheet', 'monitorSortSheet')
    .addItem('Monitor: Apply Formatting', 'applyMonitorFormatting')
    .addToUi();
}

/**
 * INSTALLABLE TRIGGER LOGIC
 */
function runAutoRefreshIfEnabled() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ctrlSheet = ss.getSheetByName(SHEET_CTRL);
  
  if (!ctrlSheet) return;

  const isAutoRefreshEnabled = ctrlSheet.getRange(6, 2).getValue();
  
  if (isAutoRefreshEnabled === true) {
    ss.toast('Auto-refreshing monitor...', 'Strategy Automation');
    runMonitorAll();
  }
}

/**
 * MOBILE TRIGGER: onEdit
 */
function onEdit(e) {
  const sheet = e.source.getActiveSheet();
  const range = e.range;
  const sheetName = sheet.getName();
  
  if (sheetName !== SHEET_CTRL) return;

  const row = range.getRow();
  const col = range.getColumn();
  const val = e.value;

  if (row === 2 && col === 2 && val === 'TRUE') {
    range.setValue(false);
    runMonitorAll();
    e.source.toast('Standard Refresh Complete', 'Mobile Update');
  }

  if (row === 3 && col === 2 && val === 'TRUE') {
    range.setValue(false);
    runMonitorWithCleanup();
    e.source.toast('Refresh + Expired Cleanup Complete', 'Mobile Update');
  }
}

/**
 * HELPER FUNCTIONS
 */

function getApiKey() {
  const key = PropertiesService.getScriptProperties().getProperty('TRADIER_API_KEY');
  if (!key) throw new Error('API key not found in Script Properties.');
  return key;
}

function getMonitorSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_MONITOR);
  if (!sheet) throw new Error(`Tab named "${SHEET_MONITOR}" not found!`);
  return sheet;
}

function getImportDataSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  return ss.getSheetByName(SHEET_DATA);
}

function updateMonitorTimestamp() {
  const sheet = getMonitorSheet();
  const now = new Date();
  sheet.getRange("A2").setValue(now).setNumberFormat("MM/dd/yy");
  sheet.getRange("A3").setValue(now).setNumberFormat("h:mm am/pm");
}

function setMonitorHeaders(sheet) {
  const headers = [["Last Updated", "Weeks Out", "Expiry", "Symbol", "Type", "#", "Strike", "Current Price", "Today", "ITM / OTM", "Roll", "Comments", "Assigned", "Quality Score", "Fundamentals Score", "Technicals Score"]];
  sheet.getRange(1, 1, 1, 16).setValues(headers).setFontWeight("bold").setFontLine("underline").setHorizontalAlignment("center");
}

/**
 * REFRESH PIPELINES
 */

function runMonitorAll() {
  refreshPipeline(false);
}

function runMonitorWithCleanup() {
  refreshPipeline(true);
}

function refreshPipeline(doCleanup) {
  const sheet = getMonitorSheet();
  
  if (doCleanup) monitorRemoveExpired();
  
  monitorCompactRows();
  monitorRowCleanup();
  setMonitorHeaders(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    sheet.getRange(2, 1, lastRow - 1, 1).clearContent();
  }

  monitorGetQuotes();
  monitorSyncScores(); 
  monitorHandleStockConversions(); 
  monitorCalculateWeeksOut();
  monitorCalculateMoneyness();
  monitorCalculateRolls();
  monitorSortSheet();
  applyMonitorFormatting();
  updateMonitorTimestamp();
  
  if (doCleanup) SpreadsheetApp.getActiveSpreadsheet().toast('Expired positions removed and data refreshed.', 'Complete');
}

/**
 * CORE LOGIC FUNCTIONS
 */

function monitorRowCleanup() {
  const sheet = getMonitorSheet();
  const maxRows = 100;
  const currentRows = sheet.getMaxRows();
  if (currentRows > maxRows) {
    sheet.deleteRows(maxRows + 1, currentRows - maxRows);
  } else if (currentRows < maxRows) {
    sheet.insertRowsAfter(currentRows, maxRows - currentRows);
  }
}

function monitorCompactRows() {
  const sheet = getMonitorSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, 1, lastRow - 1, 16);
  const values = range.getValues();

  const validRows = values.filter(row => row[COL_SYMBOL - 1] && String(row[COL_SYMBOL - 1]).trim() !== '');

  range.clearContent();

  if (validRows.length > 0) {
    sheet.getRange(2, 1, validRows.length, 16).setValues(validRows);
  }
}

function monitorHandleStockConversions() {
  const sheet = getMonitorSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, COL_EXPIRY, lastRow - 1, 11);
  const data = range.getValues();
  let changed = false;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const type = String(row[2]).toUpperCase(); 

    if (type === 'STOCK') {
      if (row[0] !== '-') { row[0] = '-'; changed = true; }
      if (typeof row[3] === 'number' && row[3] < 100) { row[3] = row[3] * 100; changed = true; }
      if (row[4] !== '-' && row[4] !== '') {
         row[10] = row[4]; 
         row[4] = '-';     
         changed = true;
      }
    }
  }
  if (changed) range.setValues(data);
}

function monitorRemoveExpired() {
  const sheet = getMonitorSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const expiryRange = sheet.getRange(2, COL_EXPIRY, lastRow - 1, 1);
  const expiryValues = expiryRange.getValues();
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (let i = expiryValues.length - 1; i >= 0; i--) {
    const expDate = getExpDate(expiryValues[i][0]);
    if (expDate && today > expDate) {
      sheet.deleteRow(i + 2); 
    }
  }
}

function monitorGetQuotes() {
  const sheet = getMonitorSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;
  const symbols = sheet.getRange(2, COL_SYMBOL, lastRow - 1, 1).getValues().flat().filter(String);
  if (symbols.length === 0) return;
  
  const apiKey = getApiKey();
  
  const url = 'https://api.tradier.com/v1/markets/quotes?symbols=' + encodeURIComponent(symbols.join(','));
  const options = {'method': 'get', 'headers': {'Authorization': 'Bearer ' + apiKey, 'Accept': 'application/json'}, 'muteHttpExceptions': true};
  
  try {
    const response = UrlFetchApp.fetch(url, options);
    const json = JSON.parse(response.getContentText());
    const quotes = json.quotes.quote || [];
    const quoteMap = {};
    const quotesArray = Array.isArray(quotes) ? quotes : [quotes]; 
    quotesArray.forEach(q => { if (q && q.symbol) quoteMap[q.symbol.toUpperCase()] = {last: q.last || 0, change: (q.change_percentage / 100) || 0}; });
    
    const results = symbols.map(s => { const info = quoteMap[s.toUpperCase()] || {last: 0, change: 0}; return [info.last, info.change]; });
    sheet.getRange(2, COL_PRICE, results.length, 1).setValues(results.map(r => [r[0]]));
    sheet.getRange(2, COL_CHANGE, results.length, 1).setValues(results.map(r => [r[1]])).setNumberFormat('0.00%');
  } catch (e) { Logger.log('Error in getQuotes: ' + e.message); }
}

function monitorSyncScores() {
  const monitorSheet = getMonitorSheet();
  const importSheet = getImportDataSheet();
  if (!importSheet) return;
  
  const monitorLastRow = monitorSheet.getLastRow();
  if (monitorLastRow < 2) return;
  const monitorSymbols = monitorSheet.getRange(2, COL_SYMBOL, monitorLastRow - 1, 1).getValues().flat();
  const importLastRow = importSheet.getLastRow();
  if (importLastRow < 2) return;

  const importData = importSheet.getRange(2, 2, importLastRow - 1, 7).getValues(); 
  const scoreMap = {};
  importData.forEach(row => { if (row[0]) scoreMap[String(row[0]).toUpperCase()] = { fund: row[5], tech: row[6] }; });

  const final = monitorSymbols.map(sym => {
    if (!sym) return ['', '', ''];
    const d = scoreMap[String(sym).toUpperCase()];
    if (!d) return ['-', '-', '-'];
    const f = parseFloat(d.fund) || 0, t = parseFloat(d.tech) || 0;
    return [((f + t) / 2).toFixed(1), f, t];
  });
  monitorSheet.getRange(2, COL_QUAL_SCORE, final.length, 3).setValues(final);
}

function monitorCalculateWeeksOut() {
  const sheet = getMonitorSheet();
  const data = sheet.getRange(2, COL_EXPIRY, sheet.getLastRow() - 1, 3).getValues(); 
  const today = new Date(); today.setHours(0,0,0,0);
  
  const weeks = data.map(row => {
    const expDate = getExpDate(row[0]);
    if (String(row[2]).toUpperCase() === 'STOCK' || !expDate) return ['-'];
    if (today > expDate) return ['EXPIRED']; 
    const diff = Math.floor((expDate - today) / (1000 * 60 * 60 * 24 * 7));
    return [diff <= 0 ? '-' : diff];
  });
  sheet.getRange(2, COL_WEEKS, weeks.length, 1).setValues(weeks);
}

function monitorCalculateMoneyness() {
  const sheet = getMonitorSheet();
  const data = sheet.getRange(2, COL_EXPIRY, sheet.getLastRow() - 1, 6).getValues(); 
  
  const results = data.map(row => {
    const type = String(row[2]).toUpperCase(), strike = parseFloat(row[4]), current = parseFloat(row[5]);
    if (type === 'STOCK' || isNaN(strike) || isNaN(current)) return [type === 'STOCK' ? '-' : ''];
    let pct = (type === 'P') ? (current - strike) / strike : (strike - current) / strike;
    return [pct];
  });
  sheet.getRange(2, COL_ITM, results.length, 1).setValues(results).setNumberFormat('0.00%');
}

/**
 * ROLL LOGIC [v3.23]
 * -----------------------------------------------------------------------
 * PUTS:
 *   day-of (0 days)     : any ITM (<=0%) → ROLL; barely OTM (<1%) → WATCH
 *   week-of  (1-6 days) : ITM > 5%  → ROLL
 *   1-week   (7-13 days): ITM > 10% → ROLL
 *   2-weeks  (14-20 days): ITM > 15% → ROLL
 *   3+ weeks (21+ days) : no signal — just wait
 *
 * CALLS (require an Assigned price in col M):
 *   Strike >= Assigned : no roll signals (let expire or get called away)
 *   Strike <  Assigned : moneyness <= 1% (within 1% of ITM or deeper) → ROLL UP
 *                        moneyness > 1% (safely OTM) → no signal
 * -----------------------------------------------------------------------
 */
function monitorCalculateRolls() {
  const sheet = getMonitorSheet();
  const data = sheet.getRange(2, COL_EXPIRY, sheet.getLastRow() - 1, 11).getValues(); 
  const today = new Date(); today.setHours(0,0,0,0);
  
  const rolls = data.map(row => {
    const expDate  = getExpDate(row[0]);
    const type     = String(row[2]).toUpperCase();
    const strike   = parseFloat(row[4]);
    const money    = parseFloat(row[7]);   // ITM/OTM %  (col J)
    const assigned = parseFloat(row[10]);  // Assigned   (col M)
    
    // Skip manual overrides (comments starting with *), stocks, and rows without expiry
    if (String(row[9]).startsWith('*') || type === 'STOCK' || !expDate) return ['-'];
    
    const days = (expDate - today) / 86400000;

    // ── CALLS ──
    if (type === 'C') {
      if (isNaN(assigned)) return ['-'];           // no Assigned price → no signal
      if (strike >= assigned) return ['-'];         // good strike → let it ride
      // Strike < Assigned: signal ROLL UP if within 1% of ITM or deeper
      return (money <= 0.01) ? ['ROLL UP'] : ['-'];
    }

    // ── PUTS ──
    // Day-of-expiry: special handling to avoid assignment
    if (days === 0) {
      if (money <= 0) return ['ROLL'];              // ITM at all → must roll
      if (money < 0.01) return ['WATCH'];           // barely OTM (< 1%) → watch closely
      return ['-'];                                  // well OTM (>= 1%) → fine
    }

    const itm = (money < 0) ? -money : 0;          // convert to positive ITM depth
    const isRoll =
      (days <= 6  && itm > 0.05) ||                // week-of:  > 5%
      (days > 6   && days <= 13 && itm > 0.10) ||  // 1-week:   > 10%
      (days > 13  && days <= 20 && itm > 0.15);    // 2-weeks:  > 15%
    // 3+ weeks out (days > 20): no signal
    return [isRoll ? 'ROLL' : '-'];
  });
  sheet.getRange(2, COL_ROLL, rolls.length, 1).setValues(rolls);
}

function monitorSortSheet() {
  const sheet = getMonitorSheet();
  const actualRows = sheet.getRange(2, COL_SYMBOL, sheet.getLastRow() - 1, 1).getValues().flat().filter(String).length;
  if (actualRows < 1) return;
  
  const range = sheet.getRange(2, COL_WEEKS, actualRows, 15);
  const data = range.getValues();
  
  data.sort((a, b) => {
    const typeA = String(a[3]).toUpperCase(), typeB = String(b[3]).toUpperCase();
    if (typeA === 'STOCK' && typeB !== 'STOCK') return -1;
    if (typeA !== 'STOCK' && typeB === 'STOCK') return 1;
    if (typeA === 'STOCK' && typeB === 'STOCK') return 0;
    
    const dA = getExpDate(a[1]), dB = getExpDate(b[1]);
    if (dA && dB && dA.getTime() !== dB.getTime()) return dA.getTime() - dB.getTime();
    
    return parsePercent(a[8]) - parsePercent(b[8]);
  });
  range.setValues(data);
}

/**
 * FORMATTING [v3.23]
 * -----------------------------------------------------------------------
 * Col I (Today / Change %):
 *   Green text if positive, red text if negative.
 *   Calls get grey background (from the full-row call rule).
 *
 * Col J (ITM / OTM) — PUTS:
 *   > 0%          → green  (OTM, this is what we want)
 *   -5% to 0%     → yellow (caution zone, watching)
 *   <= -5%        → red    (deep ITM)
 *
 * Col J (ITM / OTM) — PUTS, DAY-OF-EXPIRY (overrides above):
 *   >= 1%         → green  (safely OTM)
 *   > 0% and < 1% → yellow (barely OTM, WATCH)
 *   <= 0%         → red    (ITM, must ROLL to avoid assignment)
 *
 * Col J (ITM / OTM) — CALLS, Strike >= Assigned:
 *   <= 0% (ITM/ATM) → green  (will expire or get called away at/above cost — good)
 *   > 0% (OTM)      → grey   (no special color, inherits row grey)
 *
 * Col J (ITM / OTM) — CALLS, Strike < Assigned:
 *   < -1%           → red    (deep ITM, danger — call not caught up to cost basis)
 *   -1% to 1%       → yellow (near the money, caution — time to ROLL UP)
 *   > 1%            → grey   (safely OTM, no concern)
 *
 * Col K (Roll):
 *   "ROLL" or "ROLL UP" → green highlight
 *   "WATCH"             → yellow highlight
 *
 * Full rows:
 *   Calls  → grey background
 *   Stocks → blue background
 * -----------------------------------------------------------------------
 */
function applyMonitorFormatting() {
  const sheet = getMonitorSheet();
  const lastRow = 100; 
  const fullRange = sheet.getRange(2, 1, lastRow - 1, 26);
  
  fullRange.setBackground(null).setFontColor(null).setFontWeight(null).setFontStyle(null);
  sheet.setConditionalFormatRules([]);
  
  const rules = [];
  const rangeI = sheet.getRange(2, COL_CHANGE, lastRow - 1, 1);
  const rangeJ = sheet.getRange(2, COL_ITM, lastRow - 1, 1);
  const rangeG = sheet.getRange(2, COL_STRIKE, lastRow - 1, 1);
  const rangeK = sheet.getRange(2, COL_ROLL, lastRow - 1, 1);
  const rangeAll = sheet.getRange(2, 1, lastRow - 1, 16); 
  const rangeAtoZ = sheet.getRange(2, 1, lastRow - 1, 26); 
  const rangeStock = sheet.getRange(2, 1, lastRow - 1, 17); 

  const TEXT_RED   = "#e06666"; 
  const TEXT_GREEN = "#38761d";
  const BG_GREEN   = "#d9ead3";
  const BG_RED     = "#f4cccc";
  const BG_YELLOW  = "#fff2cc";
  const BG_GREY    = "#f3f3f3";
  const BG_BLUE    = "#cfe2f3";

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  COL I — Today / Change %  (text color only; call grey comes from row)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // Call rows: green/red text on grey background
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="C",$I2>0)')
    .setFontColor(TEXT_GREEN).setBackground(BG_GREY)
    .setRanges([rangeI]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="C",$I2<0)')
    .setFontColor(TEXT_RED).setBackground(BG_GREY)
    .setRanges([rangeI]).build());
  // General (applies to Puts and anything else)
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberGreaterThan(0).setFontColor(TEXT_GREEN)
    .setRanges([rangeI]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(0).setFontColor(TEXT_RED)
    .setRanges([rangeI]).build());

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  COL J — ITM / OTM  (order matters: first matching rule wins)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  // ── Calls: Strike >= Assigned, ITM or ATM (J <= 0) → green (what we want!) ──
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="C",$M2<>"",$G2>=$M2,$J2<=0)')
    .setBackground(BG_GREEN)
    .setRanges([rangeJ]).build());

  // ── Calls: Strike >= Assigned, OTM (J > 0) → grey (no special color) ──
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="C",$M2<>"",$G2>=$M2,$J2>0)')
    .setBackground(BG_GREY)
    .setRanges([rangeJ]).build());

  // ── Calls: Strike < Assigned, deep ITM (J < -1%) → red (danger!) ──
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="C",$M2<>"",$G2<$M2,$J2<-0.01)')
    .setBackground(BG_RED)
    .setRanges([rangeJ]).build());

  // ── Calls: Strike < Assigned, near money (-1% to 1%) → yellow (caution, ROLL UP) ──
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="C",$M2<>"",$G2<$M2,$J2>=-0.01,$J2<=0.01)')
    .setBackground(BG_YELLOW)
    .setRanges([rangeJ]).build());

  // ── Calls: Strike < Assigned, safely OTM (J > 1%) → grey (no concern) ──
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="C",$M2<>"",$G2<$M2,$J2>0.01)')
    .setBackground(BG_GREY)
    .setRanges([rangeJ]).build());

  // ── Calls: no Assigned price → grey (fallback) ──
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="C",OR($M2="",$M2="-"))')
    .setBackground(BG_GREY)
    .setRanges([rangeJ]).build());

  // ── Puts, DAY-OF-EXPIRY (these must come first to override general put rules) ──
  // >= 1% OTM on expiry day → green (safe)
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="P",INT($C2)=TODAY(),$J2>=0.01)')
    .setBackground(BG_GREEN)
    .setRanges([rangeJ]).build());

  // > 0% and < 1% OTM on expiry day → yellow (barely OTM, caution!)
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="P",INT($C2)=TODAY(),$J2>0,$J2<0.01)')
    .setBackground(BG_YELLOW)
    .setRanges([rangeJ]).build());

  // <= 0% (ITM) on expiry day → red (must roll to avoid assignment)
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="P",INT($C2)=TODAY(),$J2<=0)')
    .setBackground(BG_RED)
    .setRanges([rangeJ]).build());

  // ── Puts, GENERAL (non-expiry days) ──
  // OTM (> 0%) → green
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="P",$J2>0)')
    .setBackground(BG_GREEN)
    .setRanges([rangeJ]).build());

  // caution zone (-5% to 0%) → yellow
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="P",$J2>-0.05,$J2<=0)')
    .setBackground(BG_YELLOW)
    .setRanges([rangeJ]).build());

  // deep ITM (<= -5%) → red
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($E2="P",$J2<=-0.05)')
    .setBackground(BG_RED)
    .setRanges([rangeJ]).build());

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  COL G — Strike (red text when below Assigned)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=AND($M2<>"",$G2<$M2)')
    .setFontColor(TEXT_RED).setBackground(BG_GREY)
    .setRanges([rangeG]).build());

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  COL K — Roll signals
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("ROLL").setBackground(BG_GREEN)
    .setRanges([rangeK]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("ROLL UP").setBackground(BG_GREEN)
    .setRanges([rangeK]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenTextEqualTo("WATCH").setBackground(BG_YELLOW)
    .setRanges([rangeK]).build());

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  //  FULL-ROW rules (these go LAST so cell-specific rules take priority)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$E2="C"').setBackground(BG_GREY)
    .setRanges([rangeAtoZ]).build());
  rules.push(SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$E2="STOCK"').setBackground(BG_BLUE)
    .setRanges([rangeStock]).build());

  sheet.setConditionalFormatRules(rules);

  // ── Alignment ──
  rangeAll.setHorizontalAlignment("center");
  sheet.getRange(2, COL_COMMENTS, lastRow - 1, 1).setHorizontalAlignment("left");
  
  // ── Roll Tooltip ──
  applyRollTooltip(sheet);
}

function applyRollTooltip(sheet) {
  const note =
    "ROLL THRESHOLDS:\n\n" +
    "PUTS (ITM %):\n" +
    "  Day-of:     any ITM → ROLL\n" +
    "              < 1% OTM → WATCH\n" +
    "  Week-of:    > 5%  → ROLL\n" +
    "  1-Week Out: > 10% → ROLL\n" +
    "  2-Week Out: > 15% → ROLL\n" +
    "  3+ Weeks:   no signal\n\n" +
    "CALLS (Strike < Assigned):\n" +
    "  Any time: moneyness ≤ 1% → ROLL UP";
  sheet.getRange(1, COL_ROLL).setNote(note);
}

function getExpDate(exp) {
  if (!exp || exp === '-') return null;
  if (exp instanceof Date) return new Date(exp.setHours(0,0,0,0));
  const p = String(exp).split('/');
  return p.length !== 3 ? null : new Date(parseInt(p[2]) + 2000, parseInt(p[0]) - 1, parseInt(p[1]));
}

function parsePercent(pct) {
  if (typeof pct === 'number') return pct;
  return parseFloat(String(pct).replace('%', '')) / 100 || 0;
}