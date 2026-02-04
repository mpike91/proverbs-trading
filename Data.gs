/**
 * =========================================================================
 * OPTIONS RESEARCH DATA FACTORY v6.6 (Sequential Injection Fix)
 * =========================================================================
 * 1. Source of Truth: 'CBOE Weeklys' (Hardened).
 * 2. Structure: Apps Script defines ALL headers.
 * 3. Flow: Historical -> Options -> Dynamic.
 * 4. Polling: Combined "Loading..." check + Double-Canary (Fast/Slow columns).
 * 5. Safety: Mandatory +1s buffer remains built into polling helpers.
 * =========================================================================
 */

// GLOBAL CONFIGURATION
const EMAIL_RECIPIENT = "mattp91@gmail.com";

/**
 * =========================================================================
 * API AUTHENTICATION
 * =========================================================================
 */
function getApiPassword() {
  return (
    PropertiesService.getScriptProperties().getProperty("API_PASSWORD") || ""
  );
}

function isAuthenticated(e) {
  const password = getApiPassword();
  if (!password) return true; // No password set = open access
  const provided = e.parameter.password || "";
  return provided === password;
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function errorResponse(message, code) {
  return jsonResponse({ error: message, code: code || 400 });
}

/**
 * =========================================================================
 * WEB APP: GET REQUESTS
 * =========================================================================
 */
function doGet(e) {
  const action = e.parameter.action || e.parameter.cmd;

  // Legacy refresh command (keep for backward compatibility)
  if (action === "run") {
    return handleRefresh(e);
  }

  // New API endpoints
  if (action === "screener") {
    if (!isAuthenticated(e)) return errorResponse("Unauthorized", 401);
    return handleGetScreener(e);
  }

  if (action === "monitor") {
    if (!isAuthenticated(e)) return errorResponse("Unauthorized", 401);
    return handleGetMonitor(e);
  }

  if (action === "metadata") {
    if (!isAuthenticated(e)) return errorResponse("Unauthorized", 401);
    return handleGetMetadata(e);
  }

  if (action === "refresh") {
    if (!isAuthenticated(e)) return errorResponse("Unauthorized", 401);
    return handleRefresh(e);
  }

  // Default status response
  return jsonResponse({
    status: "ready",
    endpoints: ["screener", "monitor", "metadata", "refresh"],
    note: "Use ?action=<endpoint> to access API",
  });
}

/**
 * =========================================================================
 * WEB APP: POST REQUESTS
 * =========================================================================
 */
function doPost(e) {
  const action = e.parameter.action;

  if (!isAuthenticated(e)) {
    return errorResponse("Unauthorized", 401);
  }

  if (action === "setParams") {
    return handleSetParams(e);
  }

  return errorResponse("Unknown action: " + action, 400);
}

/**
 * =========================================================================
 * API HANDLERS
 * =========================================================================
 */

function handleRefresh(e) {
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(10000)) {
    return ContentService.createTextOutput(
      "Error: System is busy/locked.",
    ).setMimeType(ContentService.MimeType.TEXT);
  }

  try {
    refreshLiveData();
    return ContentService.createTextOutput(
      "Success: Remote Data Refreshed.",
    ).setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    return ContentService.createTextOutput(
      "Error: " + err.toString(),
    ).setMimeType(ContentService.MimeType.TEXT);
  } finally {
    lock.releaseLock();
  }
}

function handleGetScreener(e) {
  try {
    const dynamicSheet = getSheetOrThrow("Dynamic Data");
    const optionsSheet = getSheetOrThrow("Options");
    const stableSheet = getSheetOrThrow("Stable Data");
    const historySheet = getSheetOrThrow("Historical Prices");
    const exportSheet = getSheetOrThrow("Data_Export");

    const numRows = getRowCount(dynamicSheet);

    // Get symbols
    const symbols = dynamicSheet.getRange(2, 2, numRows, 1).getValues().flat();

    // Get Dynamic Data (columns C-R: 200-Day through Liquidity Score)
    const dynamicData = dynamicSheet.getRange(2, 3, numRows, 16).getValues();

    // Get Options Data (columns C-L: Price through Range)
    const optionsData = optionsSheet.getRange(2, 3, numRows, 10).getValues();

    // Get Stable Data (columns D-I: Sector through Next Earnings)
    const stableData = stableSheet.getRange(2, 4, numRows, 6).getValues();

    // Get Historical Prices for sparklines (last 200 days)
    const historyLastCol = historySheet.getLastColumn();
    const historyData = historySheet
      .getRange(2, 3, numRows, Math.min(historyLastCol - 2, 200))
      .getValues();

    // Get last updated timestamp
    const lastUpdated = exportSheet.getRange("A2").getValue();
    const lastUpdatedTime = exportSheet.getRange("A3").getValue();

    // Build response data
    const data = [];
    for (let i = 0; i < numRows; i++) {
      const symbol = symbols[i];
      if (!symbol) continue;

      // Dynamic Data columns: 200-Day(0), Price(1), RSI(2), BB%(3), AltmanZ(4), SMATrend(5),
      // Momentum(6), SMA50(7), SMA100(8), SMA200(9), PEG(10), AnalystUpside(11),
      // OptionsScore(12), FundScore(13), TechScore(14), LiqScore(15)
      const dyn = dynamicData[i];

      // Options columns: Price(0), Exp(1), Strike(2), Bid(3), ROR(4), OI(5), AvgOI(6), MedianOI(7), Depth(8), Range(9)
      const opt = optionsData[i];

      // Stable columns: Sector(0), Industry(1), Description(2), ROIC(3), Piotroski(4), NextEarnings(5)
      const stb = stableData[i];

      // History for sparkline
      const priceHistory = historyData[i].filter(
        (v) => v !== "" && v !== null && !isNaN(v),
      );

      data.push({
        symbol: symbol,
        sector: stb[0] || "",
        industry: stb[1] || "",
        description: stb[2] || "",
        price: parseFloat(dyn[1]) || 0,
        nextEarnings: formatDate(stb[5]),

        // Options
        expiration: formatDate(opt[1]),
        strike: parseFloat(opt[2]) || 0,
        bid: parseFloat(opt[3]) || 0,
        ror: opt[4] === "-" ? null : parseFloat(opt[4]) || 0,
        oi: parseInt(opt[5]) || 0,
        avgOi: parseFloat(opt[6]) || 0,
        medianOi: parseFloat(opt[7]) || 0,
        depth: opt[8] === "-" ? 0 : parseInt(opt[8]) || 0,
        range: opt[9] === "-" ? 0 : parseInt(opt[9]) || 0,

        // Fundamentals
        roic: parseFloat(stb[3]) || 0,
        piotroskiFScore: parseInt(stb[4]) || 0,

        // Scores
        optionsScore: parseFloat(dyn[12]) || 0,
        fundamentalsScore: parseFloat(dyn[13]) || 0,
        technicalsScore: parseFloat(dyn[14]) || 0,
        liquidityScore: parseFloat(dyn[15]) || 0,

        // Technicals
        rsi: parseFloat(dyn[2]) || 0,
        bbPercent: parseFloat(dyn[3]) || 0,
        altmanZScore: parseFloat(dyn[4]) || 0,
        smaTrend: parseInt(dyn[5]) || 0,
        momentum: parseFloat(dyn[6]) || 0,
        sma50: parseFloat(dyn[7]) || 0,
        sma100: parseFloat(dyn[8]) || 0,
        sma200: parseFloat(dyn[9]) || 0,
        pegRatio: dyn[10] === "-" ? null : parseFloat(dyn[10]) || null,
        analystUpside: dyn[11] === "-" ? null : parseFloat(dyn[11]) || null,

        // Sparkline data
        priceHistory: priceHistory.slice(-200),
      });
    }

    return jsonResponse({
      lastUpdated: formatTimestamp(lastUpdated, lastUpdatedTime),
      count: data.length,
      data: data,
    });
  } catch (err) {
    return errorResponse("Failed to get screener data: " + err.toString(), 500);
  }
}

function handleGetMonitor(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const monitorSheet = ss.getSheetByName("Monitor");

    if (!monitorSheet) {
      return jsonResponse({
        lastUpdated: null,
        count: 0,
        positions: [],
      });
    }

    const lastRow = monitorSheet.getLastRow();
    if (lastRow < 2) {
      return jsonResponse({
        lastUpdated: formatTimestamp(
          monitorSheet.getRange("A2").getValue(),
          monitorSheet.getRange("A3").getValue(),
        ),
        count: 0,
        positions: [],
      });
    }

    // Get all monitor data (columns A-P)
    const data = monitorSheet.getRange(2, 1, lastRow - 1, 16).getValues();

    const positions = [];
    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const symbol = row[3]; // Column D
      if (!symbol || String(symbol).trim() === "") continue;

      positions.push({
        date: formatDate(row[0]), // A: Date
        weeksOut: row[1], // B: Weeks Out
        expiry: formatDate(row[2]), // C: Expiry
        symbol: row[3], // D: Symbol
        type: row[4], // E: Type (P, C, STOCK)
        contracts: parseInt(row[5]) || 0, // F: # contracts
        strike: parseFloat(row[6]) || 0, // G: Strike
        currentPrice: parseFloat(row[7]) || 0, // H: Current Price
        todayChange: parseFloat(row[8]) || 0, // I: Today %
        itmOtm: parseFloat(row[9]) || 0, // J: ITM/OTM %
        roll: row[10] || "-", // K: Roll
        comments: row[11] || "", // L: Comments
        assignedPrice: row[12] ? parseFloat(row[12]) : null, // M: Assigned
        qualityScore: parseFloat(row[13]) || 0, // N: Quality Score
        fundamentalsScore: parseFloat(row[14]) || 0, // O: Fund Score
        technicalsScore: parseFloat(row[15]) || 0, // P: Tech Score
      });
    }

    return jsonResponse({
      lastUpdated: formatTimestamp(
        monitorSheet.getRange("A2").getValue(),
        monitorSheet.getRange("A3").getValue(),
      ),
      count: positions.length,
      positions: positions,
    });
  } catch (err) {
    return errorResponse("Failed to get monitor data: " + err.toString(), 500);
  }
}

function handleGetMetadata(e) {
  try {
    const optionsSheet = getSheetOrThrow("Options");
    const exportSheet = getSheetOrThrow("Data_Export");

    // Get current expiry and ROR from Options sheet
    const currentExpiry = optionsSheet.getRange("N2").getValue();
    const currentRor = optionsSheet.getRange("O2").getValue();
    const minOi = optionsSheet.getRange("P2").getValue();

    // Get last updated
    const lastUpdated = exportSheet.getRange("A2").getValue();
    const lastUpdatedTime = exportSheet.getRange("A3").getValue();

    return jsonResponse({
      expiry: formatDate(currentExpiry),
      ror: parseFloat(currentRor) || 0.01,
      minOi: parseInt(minOi) || 100,
      lastUpdated: formatTimestamp(lastUpdated, lastUpdatedTime),
    });
  } catch (err) {
    return errorResponse("Failed to get metadata: " + err.toString(), 500);
  }
}

function handleSetParams(e) {
  try {
    const optionsSheet = getSheetOrThrow("Options");

    // Parse POST body
    let params = {};
    if (e.postData && e.postData.contents) {
      params = JSON.parse(e.postData.contents);
    }

    // Also check URL parameters
    const expiry = params.expiry || e.parameter.expiry;
    const ror = params.ror || e.parameter.ror;

    let updated = [];

    if (expiry) {
      // Parse and set expiry date
      const expiryDate = new Date(expiry);
      if (!isNaN(expiryDate.getTime())) {
        optionsSheet.getRange("N2").setValue(expiryDate);
        updated.push("expiry");
      }
    }

    if (ror !== undefined && ror !== null) {
      const rorValue = parseFloat(ror);
      if (!isNaN(rorValue)) {
        optionsSheet.getRange("O2").setValue(rorValue);
        updated.push("ror");
      }
    }

    if (updated.length === 0) {
      return jsonResponse({
        success: false,
        message:
          "No valid parameters provided. Use 'expiry' (date) and/or 'ror' (number).",
      });
    }

    // Trigger refresh after updating params
    const lock = LockService.getScriptLock();
    if (lock.tryLock(10000)) {
      try {
        refreshLiveData();
      } finally {
        lock.releaseLock();
      }
    }

    return jsonResponse({
      success: true,
      updated: updated,
      message: "Parameters updated and data refreshed.",
    });
  } catch (err) {
    return errorResponse("Failed to set parameters: " + err.toString(), 500);
  }
}

/**
 * =========================================================================
 * API HELPERS
 * =========================================================================
 */

function formatDate(value) {
  if (!value || value === "-") return null;
  if (value instanceof Date) {
    return value.toISOString().split("T")[0];
  }
  // Try to parse string dates
  const d = new Date(value);
  if (!isNaN(d.getTime())) {
    return d.toISOString().split("T")[0];
  }
  return String(value);
}

function formatTimestamp(date, time) {
  if (!date) return null;
  try {
    const d = date instanceof Date ? date : new Date(date);
    if (time instanceof Date) {
      d.setHours(time.getHours(), time.getMinutes(), time.getSeconds());
    }
    return d.toISOString();
  } catch (err) {
    return null;
  }
}

/**
 * -------------------------------------------------------------------------
 * MENU & CONTROLS
 * -------------------------------------------------------------------------
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu("Scripts")
    .addItem("🚀 Refresh Live Data (#3-5)", "refreshLiveData")
    .addSeparator()
    .addItem("1. Update CBOE Weeklys", "updateCBOEWeeklys")
    .addItem("2. Update Stable Data", "updateStableData")
    .addItem("3. Update Historical Prices", "updateHistoricalPrices")
    .addItem("4. Update Options Data", "updateOptionsData")
    .addItem("5. Update Dynamic Data", "updateDynamicData")
    .addSeparator()
    .addItem("Refresh Scripts (Development Helper)", "onOpen")
    .addToUi();
}

/**
 * MASTER RUNNER
 */
function refreshLiveData() {
  updateHistoricalPrices();
  updateOptionsData();
  updateDynamicData();
  updateExportTimestamp();
}

function updateExportTimestamp() {
  const sheet = getSheetOrThrow("Data_Export");
  addTimestamp(sheet);
  console.log(`Data_Export timestamp updated.`);
}

/**
 * -------------------------------------------------------------------------
 * 1. CBOE WEEKLYS (Source of Truth)
 * -------------------------------------------------------------------------
 */
function updateCBOEWeeklys() {
  const SHEET_NAME = "CBOE Weeklys";
  const URL = "https://www.cboe.com/available_weeklys/get_csv_download/";

  try {
    const response = UrlFetchApp.fetch(URL);
    if (response.getResponseCode() !== 200)
      throw new Error("Failed to fetch CSV");

    const lines = response
      .getContentText()
      .split(/\r?\n|\r/)
      .map((line) => (line ? line.trim() : ""))
      .filter((l) => l && l.length > 0);

    let equityStart = -1;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i] && lines[i].includes("Available Weeklys - Equity")) {
        equityStart = i + 1;
        break;
      }
    }
    if (equityStart === -1) throw new Error("Equity section not found in CSV");

    const data = parseEquityData(lines, equityStart);
    if (data.length === 0) throw new Error("No equity pairs extracted");

    const sheet = getSheetOrThrow(SHEET_NAME);
    sheet.getRange("B1:C1").setValues([["Symbol", "Company"]]);
    sheet.getRange("B2:C").clearContent();

    data.sort((a, b) => a[0].localeCompare(b[0]));
    sheet.getRange(2, 2, data.length, 2).setValues(data);

    addTimestamp(sheet);
  } catch (error) {
    handleError(SHEET_NAME, error);
  }
}

/**
 * -------------------------------------------------------------------------
 * 2. STABLE DATA (Polling Implemented)
 * -------------------------------------------------------------------------
 */
function updateStableData() {
  const SHEET_NAME = "Stable Data";
  const MAX_POLL_SECONDS = 60;

  try {
    syncSymbols(SHEET_NAME);
    const sheet = getSheetOrThrow(SHEET_NAME);
    const numRows = getRowCount(sheet);

    const headers = [
      "Symbol",
      "Country",
      "Sector",
      "Industry",
      "Description",
      "ROIC % TTM",
      "Piotroski F-Score",
      "Next Earnings",
      "ROA % TTM",
      "CFO TTM",
      "Total Debt TTM",
      "Shares Out",
      "Current Assets TTM",
      "Current Liabilities TTM",
      "Retained Earnings TTM",
      "Operating Income TTM",
      "Total Assets TTM",
      "Total Liabilities TTM",
      "Revenue TTM",
      "Net Income TTM",
      "Current Ratio TTM",
      "Gross Profit TTM",
      "ROA % LY",
      "Total Debt LY",
      "Current Ratio LY",
      "Shares Growth LY",
      "Gross Profit LY",
      "Revenue LY",
      "Total Assets LY",
      "Net Income LY",
      "EPS TTM",
      "EPS Growth",
      "Analyst Target (Last Month)",
      "Analyst Target (Last Quarter)",
    ];
    sheet.getRange(1, 2, 1, headers.length).setValues([headers]);
    sheet.getRange(2, 3, sheet.getMaxRows(), 33).clearContent();
    SpreadsheetApp.flush();

    const formulas = {
      C2: '=WISEPRICE(FILTER(B2:B, LEN(B2:B)), "Country")',
      D2: '=WISEPRICE(FILTER(B2:B, LEN(B2:B)), "Sector")',
      E2: '=WISEPRICE(FILTER(B2:B, LEN(B2:B)), "Industry")',
      F2: '=WISEPRICE(FILTER(B2:B, LEN(B2:B)), "Description")',
      G2: '=WISE(FILTER(B2:B, LEN(B2:B)), "ROIC", "TTM")',
      H2: '=ARRAYFORMULA(IF(LEN(B2:B)=0, "", (IF(J2:J > 0, 1, 0)) + (IF(K2:K > 0, 1, 0)) + (IF(J2:J > X2:X, 1, 0)) + (IF(K2:K > U2:U, 1, 0)) + (IF( IFERROR(L2:L / R2:R, 999) < IFERROR(Y2:Y / AD2:AD, 999), 1, 0 )) + (IF(V2:V > Z2:Z, 1, 0)) + (IF(AA2:AA <= 0, 1, 0)) + (IF( IFERROR(W2:W / T2:T, 0) > IFERROR(AB2:AB / AC2:AC, 0), 1, 0 )) + (IF( IFERROR(T2:T / R2:R, 0) > IFERROR(AC2:AC / AD2:AD, 0), 1, 0 ))))',
      I2: '=WISEPRICE(FILTER(B2:B, LEN(B2:B)), "Earnings Announcement")',
      J2: '=ARRAYFORMULA(IF(LEN(B2:B)=0, "", U2:U / S2:S))',
      K2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Net Cash Provided By Operating Activities", "TTM")',
      L2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Total Debt", "TTM")',
      M2: '=WISEPRICE(FILTER(B2:B, LEN(B2:B)), "Shares Outstanding")',
      N2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Total Current Assets", "TTM")',
      O2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Total Current Liabilities", "TTM")',
      P2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Retained Earnings", "TTM")',
      Q2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Operating Income", "TTM")',
      R2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Total Assets", "TTM")',
      S2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Total Liabilities", "TTM")',
      T2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Revenue", "TTM")',
      U2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Net income", "TTM")',
      V2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Current Ratio", "TTM")',
      W2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Gross Profit", "TTM")',
      X2: '=ARRAYFORMULA(IF(LEN(B2:B)=0, "", AE2:AE / AD2:AD))',
      Y2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Total Debt", "LY")',
      Z2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Current Ratio", "LY")',
      AA2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Weighted Average Shares Growth", "LY")',
      AB2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Gross Profit", "LY")',
      AC2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Revenue", "LY")',
      AD2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Total Assets", "LY")',
      AE2: '=WISE(FILTER(B2:B, LEN(B2:B)), "Net Income", "LY")',
      AF2: '=WISE(FILTER(B2:B, LEN(B2:B)), "EPS", "TTM")',
      AG2: '=WISE(FILTER(B2:B, LEN(B2:B)), "EPS Growth", "LY")',
      AH2: '=WISEPRICE(FILTER(B2:B, LEN(B2:B)), "Last Month Avg Price Target")',
      AI2: '=WISEPRICE(FILTER(B2:B, LEN(B2:B)), "Last Quarter Avg Price Target")',
    };

    for (const [cell, formula] of Object.entries(formulas)) {
      sheet.getRange(cell).setFormula(formula);
    }
    SpreadsheetApp.flush();

    console.log(`Stable Data formulas injected. Polling for resolution...`);
    const loaded = waitForSheetToLoad(sheet, MAX_POLL_SECONDS, "C");

    if (!loaded) console.warn("Stable Data: Max wait time reached.");

    const targetRange = sheet.getRange(2, 3, numRows, 33);
    targetRange.copyTo(targetRange, { contentsOnly: true });
    addTimestamp(sheet);
  } catch (error) {
    handleError(SHEET_NAME, error);
  }
}

/**
 * -------------------------------------------------------------------------
 * 3. HISTORICAL PRICES (Polling Implemented)
 * -------------------------------------------------------------------------
 */
function updateHistoricalPrices() {
  const SHEET_NAME = "Historical Prices";
  const MAX_POLL_SECONDS = 30;

  try {
    syncSymbols(SHEET_NAME);
    const sheet = getSheetOrThrow(SHEET_NAME);
    sheet.getRange("B1").setValue("Symbol");

    const maxCols = sheet.getMaxColumns();
    if (maxCols > 2) {
      sheet.getRange(1, 3, sheet.getMaxRows(), maxCols - 2).clearContent();
    }
    SpreadsheetApp.flush();

    const formula =
      '=WISEPRICE(FILTER(B2:B, LEN(B2:B)), "Close", , TODAY()-300, TODAY())';
    sheet.getRange("C1").setFormula(formula);
    SpreadsheetApp.flush();

    console.log(`History formulas injected. Polling for resolution...`);
    const loaded = waitForSheetToLoad(sheet, MAX_POLL_SECONDS, "C");

    if (!loaded) console.warn("Historical Prices: Max wait time reached.");

    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastCol < 3) throw new Error("No historical data returned");

    const dataRange = sheet.getRange(1, 3, lastRow, lastCol - 2);
    dataRange.copyTo(dataRange, { contentsOnly: true });
    addTimestamp(sheet);
  } catch (error) {
    handleError(SHEET_NAME, error);
  }
}

/**
 * -------------------------------------------------------------------------
 * 4. OPTIONS DATA
 * -------------------------------------------------------------------------
 */
function updateOptionsData() {
  const SHEET_NAME = "Options";
  const MAX_POLL_SECONDS = 300;

  try {
    syncSymbols(SHEET_NAME);
    const sheet = getSheetOrThrow(SHEET_NAME);
    const histSheet = getSheetOrThrow("Historical Prices");
    const numRows = getRowCount(sheet);

    const headers = [
      "Symbol",
      "Price",
      "Expiration",
      "Strike",
      "Bid",
      "ROR %",
      "OI",
      "Avg OI",
      "Median OI",
      "Depth",
      "Range",
    ];
    sheet.getRange(1, 2, 1, headers.length).setValues([headers]);

    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 2, sheet.getLastRow() - 1, 11).clearContent();
    }
    SpreadsheetApp.flush();

    const histSource = histSheet.getRange(2, 2, numRows, 2).getValues();
    sheet.getRange(2, 2, numRows, 2).setValues(histSource);
    SpreadsheetApp.flush();

    const masterFormula = `=MAP(B2:B, C2:C, LAMBDA(symbol, price, IF(ISBLANK(symbol), "", LET(
      raw_data, WISEOPTIONS(symbol, "Put", {"Expiration", "Strike", "Bid", "Open Interest"}), 
      exp_col, CHOOSECOLS(raw_data, 1), 
      strike_col, CHOOSECOLS(raw_data, 2), 
      bid_col, CHOOSECOLS(raw_data, 3), 
      oi_col, CHOOSECOLS(raw_data, 4), 
      
      filtered_otm_puts, FILTER(raw_data, (exp_col = TEXT($N$2, "YYYY-MM-DD")) * (strike_col <= price) * (oi_col >= $P$2)), 
      strike_col_otm, CHOOSECOLS(filtered_otm_puts, 2), 
      bid_col_otm, CHOOSECOLS(filtered_otm_puts, 3), 
      
      filtered_final, FILTER(filtered_otm_puts, (bid_col_otm >= strike_col_otm * $O$2)), 
      first_row, IFNA(CHOOSEROWS(filtered_final, 1), {"-", "-", "-", "-"}), 
      
      val_exp, INDEX(first_row, 1),
      val_strike, INDEX(first_row, 2),
      val_bid, INDEX(first_row, 3),
      val_oi, INDEX(first_row, 4),
      val_ror, IF(val_bid="-", "-", val_bid / val_strike),
      
      range_count, IF(ISERROR(ROWS(filtered_otm_puts)), 0, ROWS(filtered_otm_puts)),
      oi_list, CHOOSECOLS(filtered_otm_puts, 4),
      
      avg_open_interest, AVERAGE(oi_list), 
      strict_median_oi, IF(range_count <= 1, 0, INDEX(SORT(oi_list, 1, TRUE), ROUNDDOWN((range_count + 1) / 2))),
      
      depth, IF(val_strike="-", "-", ROWS(FILTER(strike_col_otm, strike_col_otm >= val_strike))),
      
      HSTACK(val_exp, val_strike, val_bid, val_ror, val_oi, 
             IF(val_strike="-", "-", avg_open_interest), 
             IF(val_strike="-", "-", strict_median_oi),
             depth,
             IF(val_strike="-", "-", range_count))
    ))))`;

    sheet.getRange("D2").setFormula(masterFormula);
    SpreadsheetApp.flush();

    console.log("Options formulas injected. Polling for resolution...");
    const loaded = waitForSheetToLoad(sheet, MAX_POLL_SECONDS, "D");

    if (!loaded) console.warn("Options Data: Max wait time reached.");

    const targetRange = sheet.getRange(2, 4, numRows, 9);
    targetRange.copyTo(targetRange, { contentsOnly: true });
    addTimestamp(sheet);
  } catch (error) {
    handleError(SHEET_NAME, error);
  }
}

/**
 * -------------------------------------------------------------------------
 * 5. DYNAMIC DATA (SEQUENTIAL INJECTION + DOUBLE CANARY)
 * -------------------------------------------------------------------------
 */
function updateDynamicData() {
  const SHEET_NAME = "Dynamic Data";
  const MAX_POLL_SECONDS = 15;

  try {
    syncSymbols(SHEET_NAME);
    const sheet = getSheetOrThrow(SHEET_NAME);
    const numRows = getRowCount(sheet);

    sheet.getRange("B1").setValue("Symbol");
    const headers = [
      [
        "200-Day",
        "Price",
        "RSI",
        "BB %",
        "Altman Z-Score",
        "SMA-Trend",
        "Momentum",
        "SMA 50",
        "SMA 100",
        "SMA 200",
        "PEG Ratio",
        "Analyst Upside",
        "Options Score",
        "Fundamentals Score",
        "Technicals Score",
        "Liquidity Score",
        "Integrity_Check",
      ],
    ];
    sheet.getRange(1, 3, 1, headers[0].length).setValues(headers);
    sheet.getRange(2, 3, sheet.getMaxRows() - 1, 17).clearContent();
    SpreadsheetApp.flush();

    // =====================================================================
    // STEP 1: INDEPENDENT FORMULAS (Ingredients)
    // We inject SMAs, RSI, and Price first.
    // =====================================================================
    const independentDragFormulas = {
      E2: '=IF(LEN(B2)=0, "", IFERROR(LET(prices, \'Historical Prices\'!C2:P2, changes, ARRAYFORMULA(prices - OFFSET(prices, 0, 1, 1, 14)), avgGain, SUMIF(changes, ">0") / 14, avgLoss, ABS(SUMIF(changes, "<0") / 14), IF(avgLoss=0, 100, 100 - (100 / (1 + (avgGain / avgLoss))))), "N/A"))',
      F2: '=IF(LEN(B2)=0, "", IFERROR(LET(prices, ARRAY_CONSTRAIN(\'Historical Prices\'!$C2:$ZZ, 1, 20), currPrice, INDEX(prices, 1, 1), sma, AVERAGE(prices), stdDev, STDEV.P(prices), upperBand, sma + (2 * stdDev), lowerBand, sma - (2 * stdDev), bandWidth, upperBand - lowerBand, IF(bandWidth=0, 0.5, (currPrice - lowerBand) / bandWidth)), "N/A"))',
      J2: "=IF(LEN(B2)=0, \"\", AVERAGE(ARRAY_CONSTRAIN('Historical Prices'!$C2:$ZZ, 1, 50)))",
      K2: "=IF(LEN(B2)=0, \"\", AVERAGE(ARRAY_CONSTRAIN('Historical Prices'!$C2:$ZZ, 1, 100)))",
      L2: "=IF(LEN(B2)=0, \"\", AVERAGE(ARRAY_CONSTRAIN('Historical Prices'!$C2:$ZZ, 1, 200)))",
    };

    for (const [cell, formula] of Object.entries(independentDragFormulas)) {
      const colLetter = cell.charAt(0);
      sheet
        .getRange(`${colLetter}2:${colLetter}${numRows + 1}`)
        .setFormula(formula);
    }
    SpreadsheetApp.flush(); // Force Sheets to acknowledge these exist
    Utilities.sleep(1000); // Brief pause for internal graph registration

    // =====================================================================
    // STEP 2: DEPENDENT FORMULAS (The Recipe)
    // We inject SMA-Trend (H) NOW. We use drag-formula syntax for reliability.
    // =====================================================================
    const dependentDragFormulas = {
      // NOTE: Using row-relative syntax (J2, K2, L2) instead of ArrayFormula.
      // This forces row-by-row calculation and fixes the dependency race condition.
      H2: '=IF(LEN(B2)=0, "", IFERROR(IFS((J2>=K2)*(K2>=L2), 3, (J2>=K2)*(K2<L2), 2, (J2<K2)*(K2>=L2), 1, TRUE, 0), 0))',
    };

    for (const [cell, formula] of Object.entries(dependentDragFormulas)) {
      const colLetter = cell.charAt(0);
      sheet
        .getRange(`${colLetter}2:${colLetter}${numRows + 1}`)
        .setFormula(formula);
    }
    SpreadsheetApp.flush();

    // =====================================================================
    // STEP 3: SPILL FORMULAS
    // =====================================================================
    const spillFormulas = {
      C2: '=MAP(B2:B, LAMBDA(symbol, IF(symbol="",, SPARKLINE(CHOOSECOLS(INDEX(\'Historical Prices\'!$C:$ZZ, MATCH(symbol, \'Historical Prices\'!$B:$B, 0)), SEQUENCE(1, 200, 200, -1)), {"charttype","line"; "color","#2E2EFF"; "linewidth",1}))))',
      D2: "=ARRAYFORMULA(IF(LEN(B2:B)=0,, IFERROR(VLOOKUP(B2:B, 'Historical Prices'!B:C, 2, 0), 0)))",
      G2: "=ARRAYFORMULA(IF(LEN(B2:B)=0, \"\", IFERROR(1.2 * ('Stable Data'!N2:N - 'Stable Data'!O2:O) / 'Stable Data'!R2:R, 0) + IFERROR(1.4 * 'Stable Data'!P2:P / 'Stable Data'!R2:R, 0) + IFERROR(3.3 * 'Stable Data'!Q2:Q / 'Stable Data'!R2:R, 0) + IFERROR(0.6 * (D2:D * 'Stable Data'!M2:M) / 'Stable Data'!S2:S, 0) + IFERROR(1 * 'Stable Data'!T2:T / 'Stable Data'!R2:R, 0)))",
      I2: '=ARRAYFORMULA(IF(LEN(B2:B)=0, "", ((K2:K - L2:L)/L2:L + (J2:J - K2:K)/K2:K) / 2))',
      M2: "=ARRAYFORMULA(IF(LEN(B2:B)=0, \"\", IFERROR((D2:D / 'Stable Data'!AF2:AF) / ('Stable Data'!AG2:AG * 100), \"-\")))",
      N2: "=ARRAYFORMULA(IF(LEN(B2:B)=0, \"\", IFERROR(LET(target, IF(N('Stable Data'!AH2:AH)>0, 'Stable Data'!AH2:AH, IF(N('Stable Data'!AI2:AI)>0, 'Stable Data'!AI2:AI, 0)), IF(target=0, \"\", (target - D2:D) / D2:D)), \"-\")))",
      P2: `=BYROW(B2:B, LAMBDA(sym, IF(sym="",, LET(r, ROW(sym), roic, IFERROR(VALUE(INDEX('Stable Data'!G:G, r)), 0), pio, IFERROR(VALUE(INDEX('Stable Data'!H:H, r)), 0), alt, IFERROR(VALUE(INDEX(G:G, r)), 0), s_roic, IFS(roic>=0.15, 5, roic>=0.05, 4, roic>=-0.05, 3, roic>=-0.15, 2, TRUE, 1), s_pio, IFS(pio>=7, 5, pio=6, 4, pio=5, 3, pio=4, 2, TRUE, 1), s_alt, IFS(alt>=5, 5, alt>=3, 4, alt>=1.8, 3, alt>=1.2, 2, TRUE, 1), ROUND(AVERAGE(s_roic, s_pio, s_alt), 1)))))`,
      Q2: `=BYROW(B2:B, LAMBDA(sym, IF(sym="",, LET(r, ROW(sym), sma, IFERROR(VALUE(INDEX(H:H, r)), 0), mom, IFERROR(VALUE(INDEX(I:I, r)), 0), s_sma, IFS(sma=3, 5, sma=2, 4, sma=1, 2, TRUE, 1), s_mom, IFS(AND(mom>=0.05, mom<=0.15), 5, mom>0.15, IF(mom>0.2, 3, 4), mom>=0, 4, mom>=-0.05, 2, TRUE, 1), ROUND(AVERAGE(s_sma, s_mom), 1)))))`,
      R2: `=BYROW(B2:B, LAMBDA(sym, IF(sym="",, LET(r, ROW(sym), avg_oi, IFERROR(VALUE(INDEX('Options'!I:I, r)), 0), med_oi, IFERROR(VALUE(INDEX('Options'!J:J, r)), 0), depth, IFERROR(VALUE(INDEX('Options'!K:K, r)), 0), range, IFERROR(VALUE(INDEX('Options'!L:L, r)), 0), ratio, IF(avg_oi=0, 0, med_oi/avg_oi), s_avg, IFS(avg_oi>=1000, 5, avg_oi>=250, 4, avg_oi>=100, 3, avg_oi>=50, 2, TRUE, 1), s_ratio, IFS(ratio>=0.75, 5, ratio>=0.5, 4, ratio>=0.35, 3, ratio>=0.2, 2, TRUE, 1), s_depth, IFS(depth>=4, 5, depth=3, 4, depth=2, 3, depth=1, 2, TRUE, 1), s_range, IFS(range>=10, 5, range>=7, 4, range>=5, 3, range>=3, 2, TRUE, 1), ROUND((s_avg * 0.6) + (s_ratio * 0.3) + (s_depth * 0.05) + (s_range * 0.05), 1)))))`,
      O2: `=BYROW(B2:B, LAMBDA(sym, IF(sym="",, LET(r, ROW(sym), fund, IFERROR(VALUE(INDEX(P:P, r)), 0), tech, IFERROR(VALUE(INDEX(Q:Q, r)), 0), liq, IFERROR(VALUE(INDEX(R:R, r)), 0), ROUND(AVERAGE(fund, tech, liq), 1)))))`,

      // DOUBLE-CANARY: Checks for Price (Fast) AND SMA 200 (Slow) to ensure readiness
      S2: "=IF(AND(INDEX(D:D, COUNTA(B:B)) > 0, ISNUMBER(INDEX(L:L, COUNTA(B:B)))), 100, 0)",
    };

    for (const [cell, formula] of Object.entries(spillFormulas)) {
      sheet.getRange(cell).setFormula(formula);
    }
    SpreadsheetApp.flush();

    console.log(
      `Dynamic Data formulas injected. Waiting for Double-Canary check (Cell S2)...`,
    );
    const loaded = isDynamicSheetReady(sheet, MAX_POLL_SECONDS);

    if (!loaded)
      console.warn("Dynamic Data: Canary timed out. Hardening anyway.");

    const targetRange = sheet.getRange(2, 3, numRows, 16);
    targetRange.copyTo(targetRange, { contentsOnly: true });

    sheet.getRange("S1:S").clearContent();
    addTimestamp(sheet);
  } catch (error) {
    handleError(SHEET_NAME, error);
  }
}

/**
 * -------------------------------------------------------------------------
 * HELPERS
 * -------------------------------------------------------------------------
 */

function isDynamicSheetReady(sheet, maxSeconds) {
  for (let i = 0; i < maxSeconds; i++) {
    SpreadsheetApp.flush();
    if (sheet.getRange("S2").getValue() === 100) {
      console.log(
        `Dynamic Data canary hit after ${i} seconds. Final buffer...`,
      );
      Utilities.sleep(1000); // MANDATORY SAFETY BUFFER
      return true;
    }
    Utilities.sleep(1000);
  }
  return false;
}

function waitForSheetToLoad(sheet, maxSeconds, canaryColLetter) {
  const rowCount = getRowCount(sheet);
  const canaryCellAddress = canaryColLetter + (rowCount + 1);

  for (let i = 0; i < maxSeconds; i++) {
    SpreadsheetApp.flush();
    const loadingIndicator = sheet.createTextFinder("Loading...").findNext();
    const canaryValue = sheet.getRange(canaryCellAddress).getValue();
    const hasData = canaryValue !== "" && canaryValue !== "Loading...";

    if (!loadingIndicator && hasData) {
      console.log(
        `Data resolution confirmed after ${i} seconds. Final buffer...`,
      );
      Utilities.sleep(1000); // MANDATORY SAFETY BUFFER
      return true;
    }
    Utilities.sleep(1000);
  }
  return false;
}

function syncSymbols(targetSheetName) {
  const sourceSheet = getSheetOrThrow("CBOE Weeklys");
  const targetSheet = getSheetOrThrow(targetSheetName);
  const lastRowSource = sourceSheet.getLastRow();
  if (lastRowSource < 2) return;
  const symbols = sourceSheet.getRange(2, 2, lastRowSource - 1, 1).getValues();
  targetSheet.getRange("B2:B").clearContent();
  targetSheet.getRange(2, 2, symbols.length, 1).setValues(symbols);
  SpreadsheetApp.flush();
}

function getSheetOrThrow(name) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(name);
  if (!sheet) throw new Error(`Sheet "${name}" not found.`);
  return sheet;
}

function getRowCount(sheet) {
  const rawDataB = sheet.getRange("B2:B").getValues();
  let numRows = 0;
  for (let i = 0; i < rawDataB.length; i++) {
    if (rawDataB[i][0] !== "") numRows++;
  }
  if (numRows === 0) throw new Error("No tickers found in Column B.");
  return numRows;
}

function addTimestamp(sheet) {
  const now = new Date();
  sheet.getRange("A1").setValue("Last Updated");
  sheet.getRange("A2").setValue(now).setNumberFormat("MM/dd/yy");
  sheet.getRange("A3").setValue(now).setNumberFormat("h:mm am/pm");
}

function handleError(context, error) {
  console.error(`Error in ${context}: ` + error.toString());
  MailApp.sendEmail({
    to: EMAIL_RECIPIENT,
    subject: `${context} Update: FAILED`,
    body: `The script failed.\n\nError: ${error.toString()}`,
  });
}

function parseEquityData(lines, equityStart) {
  const data = [];
  for (let i = equityStart; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || !line.startsWith('"') || !line.endsWith('"')) continue;
    const inner = line.slice(1, -1);
    const parts = inner.split('","');
    if (parts.length < 2) continue;
    const ticker = parts[0];
    const company = parts.slice(1).join('","');
    if (/^[A-Z]{1,5}$/.test(ticker)) {
      data.push([ticker, company]);
    }
  }
  return data;
}
