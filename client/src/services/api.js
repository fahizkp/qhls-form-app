const API_BASE = process.env.REACT_APP_API_URL || '';

/**
 * Fetch all zones
 */
export async function fetchZones() {
  const response = await fetch(`${API_BASE}/api/zones`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch zones');
  }
  
  return data.zones;
}

/**
 * Fetch units for a specific zone
 */
export async function fetchUnits(zone) {
  const response = await fetch(`${API_BASE}/api/units?zone=${encodeURIComponent(zone)}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch units');
  }
  
  return data.units;
}

/**
 * Submit form data
 */
export async function submitForm(formData) {
  const response = await fetch(`${API_BASE}/api/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(formData),
  });
  
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.errors?.join(', ') || data.error || 'Failed to submit form');
  }
  
  return data;
}

/**
 * Get missing units report
 */
export async function fetchMissingUnits() {
  const response = await fetch(`${API_BASE}/api/report/missing-units`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch report');
  }
  
  return data.report;
}

/**
 * Get top participants report
 */
export async function fetchTopParticipants(limit = 50) {
  const response = await fetch(`${API_BASE}/api/report/top-participants?limit=${limit}`);
  const data = await response.json();
  
  if (!data.success) {
    throw new Error(data.error || 'Failed to fetch report');
  }
  
  return data.report;
}

