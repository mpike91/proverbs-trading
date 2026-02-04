# Proverbs Trading - Options Screener

## Project Overview

This is an Options Screener application that helps identify put-selling opportunities. The system consists of:

1. **Google Sheets Backend** - Data aggregation, scoring, and storage
2. **Google Apps Script API** - Serves data as JSON to the frontend
3. **React Web Frontend** - Modern UI for viewing and filtering screener data

### Strategy
Sell OTM (out-of-the-money) puts with target 1% weekly ROR (Return on Risk). Uses the "Wheel Strategy" - if assigned, sell covered calls until called away.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     EXTERNAL DATA SOURCES                        │
│  CBOE CSV (weeklys list) | WISE APIs (financials) | Tradier     │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    GOOGLE SHEETS (Backend)                       │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ CBOE Weeklys │ │ Stable Data  │ │ Hist. Prices │            │
│  │ (symbols)    │ │ (fundmntals) │ │ (300 days)   │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐            │
│  │ Options      │ │ Dynamic Data │ │ Monitor      │            │
│  │ (put chain)  │ │ (scores)     │ │ (positions)  │            │
│  └──────────────┘ └──────────────┘ └──────────────┘            │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                  APPS SCRIPT API (Data.gs)                       │
│  GET ?action=screener  │ GET ?action=monitor                    │
│  GET ?action=metadata  │ POST ?action=setParams                 │
│  GET ?action=refresh   │ (all require ?password=)               │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    REACT WEB FRONTEND (web/)                     │
│  Screener Page: Filters, sorting, color-coded table             │
│  Monitor Page: Position tracking, roll indicators               │
└─────────────────────────────────────────────────────────────────┘
```

## File Structure

```
proverbs-trading/
├── Data.gs                 # Apps Script: Data aggregation + JSON API
├── Screener.gs             # Apps Script: Screener UI helpers (menu, tooltips)
├── Monitor.gs              # Apps Script: Position tracking + Tradier integration
├── reference-images/       # Screenshots of Google Sheets for reference
│
└── web/                    # React frontend
    ├── src/
    │   ├── api/            # API client, types, fetch functions
    │   │   ├── client.ts   # Base fetch wrapper with auth
    │   │   ├── types.ts    # TypeScript interfaces for API responses
    │   │   ├── screener.ts # Screener API functions
    │   │   └── monitor.ts  # Monitor API functions
    │   │
    │   ├── components/
    │   │   ├── common/     # Shared components
    │   │   │   ├── ColoredMetric.tsx  # Color-coded score badges
    │   │   │   ├── Sparkline.tsx      # Canvas-based price charts
    │   │   │   ├── LoadingSpinner.tsx
    │   │   │   └── Tooltip.tsx
    │   │   ├── layout/
    │   │   │   ├── Header.tsx         # App header with refresh button
    │   │   │   └── Navigation.tsx     # Tab navigation
    │   │   ├── screener/
    │   │   │   ├── FilterPanel.tsx    # All filter controls
    │   │   │   ├── ScreenerTable.tsx  # Main data table
    │   │   │   └── ScreenerRow.tsx    # Individual row component
    │   │   └── monitor/
    │   │       └── MonitorTable.tsx   # Position tracking table
    │   │
    │   ├── hooks/
    │   │   ├── useFilteredData.ts     # Client-side filtering logic
    │   │   └── useScreenerQuery.ts    # TanStack Query hooks
    │   │
    │   ├── stores/
    │   │   └── filterStore.ts         # Zustand state for filters
    │   │
    │   ├── pages/
    │   │   ├── ScreenerPage.tsx
    │   │   └── MonitorPage.tsx
    │   │
    │   ├── utils/
    │   │   ├── formatting.ts          # Number/date formatters
    │   │   └── colorThresholds.ts     # Color logic for metrics
    │   │
    │   ├── styles/globals.css
    │   ├── App.tsx
    │   └── main.tsx
    │
    ├── .env.example        # Environment template
    ├── package.json
    ├── tailwind.config.js
    ├── tsconfig.json
    └── vite.config.ts
```

## Key Data Flows

### Screener Data Flow
1. User opens app → `useScreenerQuery` fetches `?action=screener`
2. Data loads into TanStack Query cache
3. `useFilteredScreenerData` applies client-side filters from Zustand store
4. Filtered data renders in `ScreenerTable`

### Changing Expiry/ROR (Backend Parameters)
1. User changes expiry date in `FilterPanel`
2. `useSetParamsMutation` calls `POST ?action=setParams`
3. Apps Script updates `Options!N2` and `Options!O2`
4. Apps Script runs `refreshLiveData()` to recalculate options data
5. Mutation invalidates queries → fresh data fetched

### Monitor Data Flow
1. User switches to Monitor tab → `useMonitorQuery` fetches `?action=monitor`
2. Positions render with color-coded ITM/OTM, roll indicators
3. Symbols from monitor populate `excludeList` for "Exclude Existing Positions" filter

## Scoring System

### Composite Scores (1-5 scale)
- **Options Score** = weighted average of Fund + Tech + Liq (user-configurable weights)
- **Fundamentals Score** = avg(ROIC score, Piotroski score, Altman Z score)
- **Technicals Score** = avg(SMA-Trend score, Momentum score)
- **Liquidity Score** = 0.6×AvgOI + 0.3×MedianRatio + 0.05×Depth + 0.05×Range

### Color Thresholds (see `colorThresholds.ts`)
| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| Scores | ≥4 | ≥3 | <3 |
| RSI | ≤30 | ≤50 | >50 |
| BB% | ≤0.35 | ≤0.50 | >0.50 |
| Altman Z | ≥3 | ≥1.8 | <1.8 |
| SMA Trend | 3 | 2 | 0-1 |
| ROR% | ≥1.5% | ≥1% | <1% |
| ITM/OTM | >0 (OTM) | -5% to 0 | <-5% (ITM) |

## API Reference

### GET ?action=screener
Returns all symbols with scores, options data, and technicals.

### GET ?action=monitor
Returns current positions from Monitor sheet.

### GET ?action=metadata
Returns:
- `expiry`: Current target expiry date (Options!N2)
- `ror`: Current minimum ROR (Options!O2)
- `lastUpdated`: Timestamp of last data refresh

### POST ?action=setParams
Body: `{ expiry?: "YYYY-MM-DD", ror?: 0.01 }`
Updates Options sheet parameters and triggers full data refresh.

### GET ?action=refresh
Triggers `refreshLiveData()` - updates Historical Prices, Options, Dynamic Data.

## Development

### Frontend
```bash
cd web
npm install
cp .env.example .env  # Configure API URL and password
npm run dev           # Start dev server at localhost:5173
npm run build         # Production build
```

### Apps Script Setup
1. Copy `Data.gs` content to your Apps Script project
2. Set Script Property: `API_PASSWORD` = your secure password
3. Deploy as Web App (Execute as: Me, Access: Anyone)
4. Copy deployment URL to `.env` as `VITE_API_URL`

## Google Sheets Structure

### Options Sheet Key Cells
- `N2`: Target expiry date (e.g., next Friday)
- `O2`: Minimum ROR threshold (e.g., 0.01 = 1%)
- `P2`: Minimum open interest filter

### Existing Triggers (configured in Apps Script)
- **Saturday 2-3am**: Runs `scheduledReset()` (sets expiry to next Friday, ROR to 1%) then `triggerRemoteRefresh()`

## Common Tasks

### Adding a new filter
1. Add state to `filterStore.ts`
2. Add UI control to `FilterPanel.tsx`
3. Add filter logic to `useFilteredData.ts`

### Adding a new column to screener
1. Add field to `ScreenerRow` interface in `types.ts`
2. Map field in `handleGetScreener()` in `Data.gs`
3. Add column to `ScreenerTable.tsx` headers
4. Render in `ScreenerRow.tsx`

### Changing color thresholds
Edit `colorThresholds.ts` - each metric has its own threshold function.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **State**: Zustand (filters), TanStack Query (server state)
- **Backend**: Google Apps Script, Google Sheets
- **External APIs**: CBOE, WISE (financial data), Tradier (quotes)
