const { google } = require('googleapis');

// Load zones/units from JSON file
const zonesUnitsData = require('../data/zonesUnits.json');

// Initialize Google Sheets API
const GOOGLE_SERVICE_ACCOUNT_EMAIL = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const GOOGLE_PRIVATE_KEY = process.env.GOOGLE_PRIVATE_KEY;
const SPREADSHEET_ID = process.env.SPREADSHEET_ID;

if (!GOOGLE_SERVICE_ACCOUNT_EMAIL || !GOOGLE_PRIVATE_KEY || !SPREADSHEET_ID) {
  console.error('CRITICAL ERROR: Missing Google Sheets configuration environment variables.');
  if (!GOOGLE_SERVICE_ACCOUNT_EMAIL) console.error('- GOOGLE_SERVICE_ACCOUNT_EMAIL is missing or empty');
  if (!GOOGLE_PRIVATE_KEY) console.error('- GOOGLE_PRIVATE_KEY is missing or empty');
  if (!SPREADSHEET_ID) console.error('- SPREADSHEET_ID is missing or empty');
}

// Create auth config
const authConfig = {
  scopes: ['https://www.googleapis.com/auth/spreadsheets'],
};

// Only add credentials if they are provided
if (GOOGLE_SERVICE_ACCOUNT_EMAIL && GOOGLE_PRIVATE_KEY) {
  authConfig.credentials = {
    client_email: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  };
} else {
  console.warn('Google Sheets: Initializing without explicit credentials. Will attempt to use Application Default Credentials.');
}

const auth = new google.auth.GoogleAuth(authConfig);

const sheets = google.sheets({ version: 'v4', auth });

// Sheet name for responses
const RESPONSES_SHEET = 'QHLS_Responses';

/**
 * Get unique zones from JSON file
 */
function getZones() {
  const zones = zonesUnitsData.zones.map(z => z.name);
  return zones.sort();
}

/**
 * Get units for a specific zone from JSON file
 */
function getUnits(zoneName) {
  const zone = zonesUnitsData.zones.find(z => z.name === zoneName);
  if (!zone) return [];
  return zone.units.sort();
}

/**
 * Get all zones and units from JSON file (flattened)
 */
function getAllZonesUnits() {
  const result = [];
  zonesUnitsData.zones.forEach(zone => {
    zone.units.forEach(unit => {
      result.push({ zone: zone.name, unit: unit });
    });
  });
  return result;
}

/**
 * Find existing row index for a zone+unit combination
 * Returns row number (1-based, including header) or -1 if not found
 */
async function findExistingRow(zoneName, unitName) {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${RESPONSES_SHEET}!A:B`,
    });

    const rows = response.data.values || [];
    // Start from row 2 (index 1) to skip header
    for (let i = 1; i < rows.length; i++) {
      if (rows[i][0] === zoneName && rows[i][1] === unitName) {
        return i + 1; // Return 1-based row number
      }
    }
    return -1; // Not found
  } catch (error) {
    console.error('Error finding existing row:', error.message);
    return -1;
  }
}

/**
 * Submit form response to QHLS_Responses sheet
 * If a row exists for the zone+unit, update it. Otherwise, append new row.
 * Columns: Zone | Unit | Status | Day | Faculty | Gents | Ladies
 */
async function submitResponse(data) {
  try {
    const { zoneName, unitName, qhlsStatus, qhlsDay, faculty, facultyMobile, syllabus, sthalam, afterRamadhan, gentsCount, ladiesCount } = data;
    
    // Determine status text
    const statusText = qhlsStatus === 'yes' ? 'QHLS ഉണ്ട്' : 'QHLS ഇല്ല';
    
    // Prepare row data (Zone, Unit, Status, Day, Faculty, Faculty Mobile, Syllabus, Sthalam, After Ramadhan, Gents, Ladies)
    const rowData = [
      zoneName,
      unitName,
      statusText,
      qhlsStatus === 'yes' ? qhlsDay : '',
      qhlsStatus === 'yes' ? faculty : '',
      qhlsStatus === 'yes' ? facultyMobile : '',
      qhlsStatus === 'yes' ? syllabus : '',
      qhlsStatus === 'yes' ? sthalam : '',
      qhlsStatus === 'yes' ? afterRamadhan : '',
      qhlsStatus === 'yes' ? (parseInt(gentsCount) || 0) : '',
      qhlsStatus === 'yes' ? (parseInt(ladiesCount) || 0) : '',
    ];

    // Check if row already exists for this zone+unit
    const existingRowNum = await findExistingRow(zoneName, unitName);

    if (existingRowNum > 0) {
      // Return that it already exists instead of updating
      return { success: false, alreadyExists: true };
    } else {
      // Append new row
      await sheets.spreadsheets.values.append({
        spreadsheetId: SPREADSHEET_ID,
        range: `${RESPONSES_SHEET}!A:K`,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
          values: [rowData],
        },
      });
    }

    const totalParticipants = qhlsStatus === 'yes' 
      ? (parseInt(gentsCount) || 0) + (parseInt(ladiesCount) || 0)
      : 0;
    return { success: true, totalParticipants, updated: existingRowNum > 0 };
  } catch (error) {
    console.error('Error submitting response:', error.message);
    throw error;
  }
}

/**
 * Get all submitted responses from Google Sheets
 * Columns: Zone | Unit | Status | Day | Faculty | Faculty Mobile | Syllabus | Sthalam | After Ramadhan | Gents | Ladies
 */
async function getAllResponses() {
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID,
      range: `${RESPONSES_SHEET}!A:K`,
    });

    const rows = response.data.values || [];
    if (rows.length <= 1) return [];

    // Skip header row and map to objects
    return rows.slice(1).map((row, index) => ({
      id: index + 1,
      zone: row[0] || '',
      unit: row[1] || '',
      status: row[2] || '',
      day: row[3] || '',
      faculty: row[4] || '',
      facultyMobile: row[5] || '',
      syllabus: row[6] || '',
      sthalam: row[7] || '',
      afterRamadhan: row[8] || '',
      gents: parseInt(row[9]) || 0,
      ladies: parseInt(row[10]) || 0,
    }));
  } catch (error) {
    console.error('Error fetching responses:', error.message);
    throw error;
  }
}

/**
 * Get units that have NOT submitted any response
 */
async function getMissingUnits() {
  try {
    const allZonesUnits = getAllZonesUnits();
    const responses = await getAllResponses();

    // Get unique unit names that have submitted
    const submittedUnits = new Set(responses.map(r => `${r.zone}|${r.unit}`));

    // Find units that haven't submitted
    const missingUnits = allZonesUnits.filter(
      item => !submittedUnits.has(`${item.zone}|${item.unit}`)
    );

    // Group by zone for better readability
    const groupedByZone = {};
    missingUnits.forEach(item => {
      if (!groupedByZone[item.zone]) {
        groupedByZone[item.zone] = [];
      }
      groupedByZone[item.zone].push(item.unit);
    });

    return {
      totalMissing: missingUnits.length,
      totalUnits: allZonesUnits.length,
      byZone: groupedByZone,
      list: missingUnits,
    };
  } catch (error) {
    console.error('Error getting missing units:', error.message);
    throw error;
  }
}

/**
 * Get responses sorted by total participants (descending)
 */
async function getTopParticipants(limit = 50) {
  try {
    const responses = await getAllResponses();
    
    // Add total and sort by it descending
    const withTotal = responses.map(r => ({
      ...r,
      total: r.gents + r.ladies,
    }));
    
    const sorted = withTotal.sort((a, b) => b.total - a.total);
    
    return {
      total: responses.length,
      responses: sorted.slice(0, limit),
    };
  } catch (error) {
    console.error('Error getting top participants:', error.message);
    throw error;
  }
}

module.exports = {
  getZones,
  getUnits,
  submitResponse,
  getMissingUnits,
  getTopParticipants,
  getAllResponses,
};
