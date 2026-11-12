# MindTrace — Your Digital Attention Detective

MindTrace is a simple Chrome extension that helps users understand browsing habits. It tracks time spent on website domains, counts switches between websites, estimates an attention score, and offers a 25-minute focus sprint.

## What makes it different?
Instead of only reporting how long a website was open, MindTrace highlights how often you switch between websites and gives an estimated distraction cost.

## Features
- Tracks active website domain time while the Chrome window is focused
- Counts switches between different website domains
- Classifies sites as productive, distracting or other (editable lists)
- Calculates a simple attention score from productive-time share and tab switching
- Estimates distraction cost as 15 seconds per domain switch
- 25-minute focus sprint with a reminder when you switch away from the starting website
- Dashboard with website breakdown and hourly timeline
- Settings for daily goal and website categories
- Optional Express + MongoDB backend for daily analytics storage
- Privacy-conscious: records domains and durations, not page text, passwords or form data

## Project structure
```text
MindTrace_Attention_Detective/
├── extension/
│   ├── manifest.json
│   ├── background.js
│   ├── popup.html / popup.css / popup.js
│   ├── dashboard.html / dashboard.css / dashboard.js
│   ├── settings.html / settings.css / settings.js
│   └── notification.png
└── backend/
    ├── package.json
    ├── server.js
    └── .env.example
```

## Part A — Load the Chrome extension
1. Extract the ZIP file.
2. Open Google Chrome and visit `chrome://extensions`.
3. Turn on **Developer mode** (top-right).
4. Click **Load unpacked**.
5. Select the project's `extension` folder (not the outer project folder).
6. Pin MindTrace from the Extensions menu.
7. Browse a few normal websites. Click the MindTrace icon to see today's statistics.
8. Open the dashboard from the arrow/link in the popup.

The extension tracks only normal `http` and `https` website domains. Chrome internal pages and incognito browsing are not tracked. Chrome may delay background events, so time values are approximate.

## Part B — Run the backend (optional but included)
1. Open the `backend` folder in a terminal:
   ```bash
   cd backend
   npm install
   ```
2. Optional MongoDB setup:
   - Create a MongoDB Atlas database and database user.
   - Copy `.env.example` to `.env`.
   - Put your connection string in `MONGODB_URI`.
   - Do not upload `.env` or expose your database password on GitHub.
3. Start the API:
   ```bash
   npm start
   ```
4. Check `http://localhost:3000/api/status`.

If MongoDB is not configured, the backend still runs using temporary in-memory storage. The extension also continues tracking locally with Chrome storage if the backend is not running.

## Important notes
- This is a learning/internship demonstration, not a medical or scientifically validated attention measurement.
- Attention score is a simple custom estimate, not a diagnosis or objective measure of concentration.
- Distraction cost is an illustrative estimate (15 seconds per website switch), not measured lost time.
- Time is recorded for the active tab while the browser window is focused. Browser/Chrome may suspend extension workers, so measurements are approximate.
- The daily goal is saved in settings for future extension improvements; it does not block websites.
- MindTrace does not read page contents or collect passwords/form inputs.
- For a real public release, add a privacy policy, secure backend authentication and stronger data protections.

## Technologies
Chrome Extension Manifest V3 · HTML · CSS · JavaScript · Chrome APIs · Node.js · Express · MongoDB · Mongoose

## CODTECH Internship
**Task 4 — Chrome Extension for Time Tracking and Productivity Analytics**
