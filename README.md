# QHLS Form Application

A simple Google Form-like web application for collecting QHLS (Quran Halqa Learning Session) data using Google Sheets as the database.

## Features

- Clean, mobile-friendly form UI
- Zone/Unit cascading dropdowns (from JSON file)
- Form validation
- Responses stored in Google Sheets
- Reporting endpoints for missing units and top participants

---

## Data Configuration

### Zones & Units (JSON File)

Edit `server/data/zonesUnits.json` to configure your zones and units:

```json
{
  "zones": [
    {
      "name": "Zone A",
      "units": ["Unit A1", "Unit A2", "Unit A3"]
    },
    {
      "name": "Zone B",
      "units": ["Unit B1", "Unit B2", "Unit B3", "Unit B4"]
    }
  ]
}
```

This is simpler than using Google Sheets for reference data - just edit the JSON file and restart the server.

---

## Google Sheets Setup (For Responses Only)

### Step 1: Create Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Note the **Spreadsheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/SPREADSHEET_ID_HERE/edit
   ```

### Step 2: Create Responses Sheet

Create a sheet (tab) named `QHLS_Responses` with these headers in row 1:

| Timestamp | Zone Name | Unit Name | QHLS Day | Faculty | Gents Count | Ladies Count | Total Participants |
|-----------|-----------|-----------|----------|---------|-------------|--------------|-------------------|

Data will be appended automatically when users submit the form.

### Step 3: Create Google Cloud Service Account

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project (or select existing)
3. Enable **Google Sheets API**:
   - Go to "APIs & Services" > "Library"
   - Search for "Google Sheets API"
   - Click "Enable"

4. Create Service Account:
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Name it (e.g., "qhls-form-service")
   - Click "Create and Continue"
   - Skip optional steps, click "Done"

5. Create Key:
   - Click on the service account you created
   - Go to "Keys" tab
   - Click "Add Key" > "Create new key"
   - Select "JSON" format
   - Download the JSON file

6. Note these values from the JSON file:
   - `client_email` (e.g., `your-service@your-project.iam.gserviceaccount.com`)
   - `private_key` (the long key starting with `-----BEGIN PRIVATE KEY-----`)

### Step 4: Share Google Sheet with Service Account

1. Open your Google Sheet
2. Click "Share" button
3. Add the `client_email` from the JSON file
4. Give it "Editor" permission
5. Click "Share"

---

## Project Setup

### Prerequisites

- Node.js 16+ installed
- npm or yarn

### Step 1: Configure Zones & Units

Edit `server/data/zonesUnits.json` with your actual zones and units.

### Step 2: Configure Environment

Create a `.env` file in the root directory (for Docker) or in the `server` folder (for local development):

```env
# Google Sheets Configuration
SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour private key here\n-----END PRIVATE KEY-----\n"

# Server Configuration
PORT=5000
NODE_ENV=production
CORS_ORIGIN=https://qhls.wisdommlpe.site
```

**Important:** The `GOOGLE_PRIVATE_KEY` must be wrapped in double quotes and have `\n` for line breaks.

### Step 3: Install Dependencies

```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../client
npm install
```

### Step 4: Run the Application

**Development Mode (two terminals):**

Terminal 1 - Backend:
```bash
cd server
npm start
```

Terminal 2 - Frontend:
```bash
cd client
npm start
```

The app will be available at:
- Frontend: http://localhost:3000
- Backend: http://localhost:5000

---

## API Endpoints

### Form Data

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/zones` | Get all zones (from JSON) |
| GET | `/api/units?zone=ZONE_NAME` | Get units for a zone (from JSON) |
| POST | `/api/submit` | Submit form response (to Google Sheets) |

### Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/report/missing-units` | Units without submissions |
| GET | `/api/report/top-participants?limit=50` | Top units by participants |
| GET | `/api/responses` | All submitted responses |

---

## Production Deployment

### Build Frontend

```bash
cd client
npm run build
```

### Run with Production Settings

```bash
cd server
NODE_ENV=production npm start
```

The server will serve the React build automatically.

---

## Troubleshooting

### "Failed to load zones"
- Check if `server/data/zonesUnits.json` exists and is valid JSON

### "Failed to submit"
- Check if SPREADSHEET_ID is correct in `.env`
- Verify QHLS_Responses sheet exists with correct headers
- Verify the service account has Editor access
- Ensure Google Sheets API is enabled

### Private Key Issues
- Ensure the key is wrapped in double quotes in .env
- Replace actual newlines with `\n`
- The key should start with `-----BEGIN PRIVATE KEY-----`

---

## Project Structure

```
FormApp/
├── .github/
│   └── workflows/
│       └── deploy.yml              # GitHub Actions deployment
├── server/                         # Backend (backend service)
│   ├── index.js                    # Express server
│   ├── data/
│   │   └── zonesUnits.json         # Zone/Unit reference data
│   ├── routes/
│   │   └── api.js                  # API routes
│   ├── services/
│   │   └── googleSheetsService.js  # Google Sheets operations
│   ├── .env                        # Environment config
│   ├── Dockerfile                  # Backend Docker image
│   └── package.json
├── client/                         # Frontend (frontend service)
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── App.js                  # Main form component
│   │   ├── App.css                 # Styles
│   │   ├── index.js
│   │   └── services/
│   │       └── api.js              # API service
│   ├── nginx.conf                  # Production Nginx config
│   ├── Dockerfile                  # Frontend Docker image
│   └── package.json
├── docker-compose.yml              # Docker orchestration
└── README.md
```

---

## License

This is a temporary application for quick data collection. Use as needed.
