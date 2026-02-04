# Proverbs Trading - Options Screener Web App

A modern web frontend for the Google Sheets-based Options Screener.

## Setup

### 1. Configure Google Apps Script

First, update your Google Apps Script to enable the API:

1. Open your Google Sheets document
2. Go to **Extensions > Apps Script**
3. Replace the content of `Data.gs` with the updated version from this repo
4. Set the API password in Script Properties:
   - Click **Project Settings** (gear icon)
   - Scroll to **Script Properties**
   - Add property: `API_PASSWORD` = `your_secure_password`
5. Deploy as Web App:
   - Click **Deploy > New deployment**
   - Select **Web app**
   - Set **Execute as**: Me
   - Set **Who has access**: Anyone
   - Click **Deploy**
   - Copy the Web App URL

### 2. Configure the Frontend

1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` with your values:
   ```
   VITE_API_URL=https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec
   VITE_API_PASSWORD=your_secure_password
   ```

### 3. Run Development Server

```bash
npm install
npm run dev
```

Open http://localhost:5173 in your browser.

## Features

### Screener Tab
- **Data Parameters**: Change expiry date and ROR to refresh options data
- **Display Filters**: Filter by price, RSI, BB%, etc. (client-side)
- **Score Weighting**: Customize the weighting of Fundamentals, Technicals, and Liquidity scores
- **Sortable columns**: Click column headers to sort
- **Color-coded metrics**: Green/Yellow/Red indicators matching the Sheets formatting
- **200-day sparkline charts**: Visual price history

### Monitor Tab
- **Position tracking**: View all open positions
- **Color-coded status**: ITM/OTM indicators, daily change
- **Roll indicators**: Visual alerts when positions need to be rolled

## Deployment to Vercel

1. Push your code to GitHub
2. Import the project in Vercel
3. Set environment variables:
   - `VITE_API_URL`
   - `VITE_API_PASSWORD`
4. Deploy

## Project Structure

```
web/
├── src/
│   ├── api/           # API client and types
│   ├── components/    # React components
│   │   ├── common/    # Shared UI components
│   │   ├── layout/    # Header, Navigation
│   │   ├── screener/  # Screener-specific components
│   │   └── monitor/   # Monitor-specific components
│   ├── hooks/         # Custom React hooks
│   ├── pages/         # Page components
│   ├── stores/        # Zustand state stores
│   ├── styles/        # Global CSS
│   └── utils/         # Utility functions
├── .env.example       # Environment template
├── package.json
└── README.md
```

## API Endpoints

The Apps Script API provides these endpoints:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `?action=screener` | GET | Returns all screener data |
| `?action=monitor` | GET | Returns monitor positions |
| `?action=metadata` | GET | Returns current expiry, ROR, timestamps |
| `?action=setParams` | POST | Updates expiry/ROR and refreshes data |
| `?action=refresh` | GET | Triggers full data refresh |

All endpoints require `?password=your_password` for authentication.
