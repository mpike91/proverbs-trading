/**
 * CONFIGURATION: Update these values for each user's specific setup.
 */
const CONFIG = {
  SHEET_NAME: "Screener", // The name of the tab where the screener lives
  HEADER_ROW: 12, // The row number containing the headers
  WEB_APP_URL:
    "https://script.google.com/macros/s/AKfycbw8-UTV58R7TuDAUQQC1JHbLu1gg-qzyhMBU89J9DUu3n6tJlXpjRoez629ZQydD0XG1g/exec?cmd=run",
};

/**
 * Main script for the Options Trading Screener.
 * Handles UI menus, manual triggers, scheduled maintenance, and documentation.
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();

  ui.createMenu("Scripts")
    .addItem("Remote Data Refresh", "triggerRemoteRefresh")
    // .addSeparator()
    // .addItem('Update Header Tooltips', 'updateHeaderTooltips')
    // .addSeparator()
    // .addItem('Refresh Scripts (Development Helper)', 'onOpen')
    .addToUi();
}

/**
 * Applies tooltips (Notes) to the header row of the Screener sheet.
 */
function updateHeaderTooltips() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    SpreadsheetApp.getUi().alert(
      `Sheet '${CONFIG.SHEET_NAME}' not found. Please check CONFIG.SHEET_NAME in the script.`,
    );
    return;
  }

  const lastColumn = sheet.getLastColumn();

  const TOOLTIP_MAP = {
    "Next Earnings":
      "Earnings dates are generally very volatile; price tends to move significantly on the report. We want to be very cautious about selling puts near-term. 'Week-of' is unwise; 1 week out is risky if we have to roll; 2-4 weeks out is moderately risky depending on roll availability.",
    "Options Score":
      "The 'Super' Composite of Fundamentals, Technicals, and Liquidity Scores. You can choose your own weighting for each sub-composite in cells E2-E4. This is the primary sorting metric to answer: 'Overall, how good is this stock for selling puts right now?'",
    "Fundamentals Score":
      "Composite of ROIC, Piotroski F-Score, and Altman Z-Score (equal weighting). Answers: 'How strong is the underlying business?'",
    "Technicals Score":
      "Composite of SMA-Trend and Momentum (equal weighting). Answers: 'How healthy is the price trend over the past 200 days, and is now the right time to sell puts?'",
    "Liquidity Score":
      "Composite of Avg OI (50%), Median OI (25%), Depth (12.5%), and Range (12.5%). Answers: 'How liquid is the options chain, and how easy will it be to roll if needed?'",
    RSI: "Relative Strength Index. <30 is oversold; >70 is overbought. We prefer selling puts in the lower range (<50 generally) to catch potential reversals.",
    "BB %":
      "Bollinger Band % Position. <35% suggests a pullback/oversold zone. I generally target <40%. Tighten this limit if there are too many results; loosen it if there are too few.",
    "ROIC % TTM":
      "Return on Invested Capital. Measures how efficiently a company generates profit from its capital. Answers: 'How is the business performing right now?'",
    "Piotroski F-Score":
      "A 9-point test checking if business fundamentals are improving year-over-year. Higher is better. Answers: 'Are fundamentals improving, stagnating, or declining?'",
    "Altman Z-Score":
      "A formula-based bankruptcy risk metric. >3.0 is 'Safe'; 1.8–3.0 is 'Grey Zone'; <1.8 indicates higher distress risk within ~2 years.",
    "200-Day":
      "Sparkline showing the price action over the last 200 trading days.",
    Momentum:
      "Average % spread between SMAs. Measures the 'acceleration' of the price trend. We want positive momentum, but avoid 'overheated' stocks (>20%) that may be ripe for a pullback.",
    "SMA-Trend":
      "Trend strength based on 200/100/50 SMA relationships. 0: Consistent downtrend (Avoid). 1: Mixed/Weakening trend. 2: Improving trend (Good). 3: Consistent uptrend (Best).",
    "Avg OI":
      "Average Open Interest across OTM puts. Higher = more activity, which leads to tighter spreads and easier rolls.",
    "Median OI":
      "The midpoint of Open Interest across strikes. If the Median is close to the Average, liquidity is spread evenly (ideal). If much lower, liquidity is concentrated in only a few strikes.",
    Range:
      "The number of OTM put strikes that have non-zero Open Interest. This indicates how many active strikes are available to choose from or roll into.",
    Depth:
      "How many strikes 'deep' the target 1% ROR strike is. Higher is better (further OTM). A '1' indicates the strike is basically At-The-Money (ATM), which offers less margin for error.",
    "ROR %":
      "Weekly Return on Risk (Premium / Strike). Our baseline target is >1%.",
    OI: "Open Interest for the specific target strike. Represents the total number of active contracts currently held by market participants.",
    Bid: "The current premium (price) received for selling the put contract.",
    Strike: "The target Put strike price we are looking to sell.",
    "SMA 50":
      "50-Day Simple Moving Average. Provides a 'smoothed' view of the short-term price trend.",
    "SMA 100":
      "100-Day Simple Moving Average. Provides a 'smoothed' view of the medium-term price trend.",
    "SMA 200":
      "200-Day Simple Moving Average. The standard institutional metric for the long-term 'health' of a stock.",
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

/**
 * Pings the Data Spreadsheet Web App.
 */
function triggerRemoteRefresh() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  if (CONFIG.WEB_APP_URL.includes("REPLACE_WITH_YOUR_URL")) {
    ui.alert(
      "Error: You must provide your own Web App URL in the CONFIG section of the script.",
    );
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

  ss.toast(
    "Screener parameters reset for the upcoming week.",
    "Automated Reset",
  );
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
