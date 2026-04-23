import React, { useState, useEffect } from 'react';
import './Admin.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function Admin() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [responses, setResponses] = useState([]);
  const [stats, setStats] = useState(null);
  const [missingUnits, setMissingUnits] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter and view state
  const [zoneFilter, setZoneFilter] = useState('');
  const [activeTab, setActiveTab] = useState('responses'); // 'responses' or 'missing'
  const [copied, setCopied] = useState(false);

  // Check if already logged in (from session storage)
  useEffect(() => {
    const savedLogin = sessionStorage.getItem('adminLoggedIn');
    if (savedLogin === 'true') {
      setIsLoggedIn(true);
    }
  }, []);

  // Fetch data when logged in
  useEffect(() => {
    if (isLoggedIn) {
      fetchData();
    }
  }, [isLoggedIn]);

  async function handleLogin(e) {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      const response = await fetch(`${API_BASE}/admin/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsLoggedIn(true);
        sessionStorage.setItem('adminLoggedIn', 'true');
      } else {
        setLoginError(data.error || 'Login failed');
      }
    } catch (err) {
      setLoginError('Connection error. Please try again.');
    } finally {
      setLoginLoading(false);
    }
  }

  async function fetchData() {
    setLoading(true);
    setError('');

    try {
      const [responsesRes, statsRes, missingRes] = await Promise.all([
        fetch(`${API_BASE}/admin/responses`),
        fetch(`${API_BASE}/admin/stats`),
        fetch(`${API_BASE}/admin/missing-units`),
      ]);

      const responsesData = await responsesRes.json();
      const statsData = await statsRes.json();
      const missingData = await missingRes.json();

      if (responsesData.success) {
        setResponses(responsesData.responses);
      }
      if (statsData.success) {
        setStats(statsData.stats);
      }
      if (missingData.success) {
        setMissingUnits(missingData.report);
      }
    } catch (err) {
      setError('Failed to load data. Please refresh.');
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    setIsLoggedIn(false);
    sessionStorage.removeItem('adminLoggedIn');
    setResponses([]);
    setStats(null);
    setMissingUnits(null);
  }

  function copyWhatsAppMessage() {
    if (!missingUnits || missingUnits.totalMissing === 0) return;
    
    let message = "*QHLS Form പൂരിപ്പിക്കാത്ത ശാഖകൾ:*\n\n";
    
    Object.entries(missingUnits.byZone).forEach(([zone, units]) => {
      message += `*${zone}:*\n`;
      units.forEach(unit => {
        message += `- ${unit}\n`;
      });
      message += "\n";
    });
    
    navigator.clipboard.writeText(message).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  // Get unique zones for filter
  const uniqueZones = [...new Set(responses.map(r => r.zone))].sort();
  
  // Filter responses by zone
  const filteredResponses = zoneFilter 
    ? responses.filter(r => r.zone === zoneFilter)
    : responses;

  // Login Screen
  if (!isLoggedIn) {
    return (
      <div className="admin-app">
        <div className="login-container">
          <div className="login-header">
            <h1>അഡ്മിൻ ലോഗിൻ</h1>
            <p>QHLS Data Admin Panel</p>
          </div>

          {loginError && (
            <div className="login-error">{loginError}</div>
          )}

          <form onSubmit={handleLogin}>
            <div className="login-field">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                placeholder="Enter username"
                required
              />
            </div>

            <div className="login-field">
              <label htmlFor="password">Password</label>
              <input
                type="password"
                id="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Enter password"
                required
              />
            </div>

            <button type="submit" className="login-btn" disabled={loginLoading}>
              {loginLoading ? 'Logging in...' : 'Login'}
            </button>
          </form>

          <div className="login-footer">
            <a href="/">← Back to Form</a>
          </div>
        </div>
      </div>
    );
  }

  // Admin Dashboard
  return (
    <div className="admin-app">
      <header className="admin-header">
        <h1>QHLS Admin</h1>
        <button onClick={handleLogout} className="logout-btn">Logout</button>
      </header>

      {error && <div className="admin-error">{error}</div>}

      {/* Stats Cards */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalResponses}</div>
            <div className="stat-label">ആകെ റെസ്പോൺസ്</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalGents}</div>
            <div className="stat-label">പുരുഷന്മാർ</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.totalLadies}</div>
            <div className="stat-label">സ്ത്രീകൾ</div>
          </div>
          <div className="stat-card highlight">
            <div className="stat-value">{stats.totalParticipants}</div>
            <div className="stat-label">ആകെ പങ്കാളികൾ</div>
          </div>
        </div>
      )}

      {/* Missing Units Summary */}
      {missingUnits && (
        <div className="missing-summary">
          <span className="missing-count">{missingUnits.totalMissing}</span>
          <span className="missing-text">/{missingUnits.totalUnits} ശാഖകൾ ഫോം പൂരിപ്പിച്ചിട്ടില്ല</span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-nav">
        <button 
          className={`tab-btn ${activeTab === 'responses' ? 'active' : ''}`}
          onClick={() => setActiveTab('responses')}
        >
          റെസ്പോൺസുകൾ ({responses.length})
        </button>
        <button 
          className={`tab-btn ${activeTab === 'missing' ? 'active' : ''}`}
          onClick={() => setActiveTab('missing')}
        >
          ബാക്കിയുള്ളവ ({missingUnits?.totalMissing || 0})
        </button>
      </div>

      {/* Filter and Actions Bar */}
      <div className="actions-bar">
        <select 
          className="zone-filter"
          value={zoneFilter}
          onChange={(e) => setZoneFilter(e.target.value)}
        >
          <option value="">എല്ലാ മണ്ഡലങ്ങളും</option>
          {uniqueZones.map(zone => (
            <option key={zone} value={zone}>{zone}</option>
          ))}
        </select>

        {activeTab === 'missing' && missingUnits && missingUnits.totalMissing > 0 && (
          <button 
            className={`whatsapp-copy-btn ${copied ? 'copied' : ''}`}
            onClick={copyWhatsAppMessage}
            style={{ margin: 0, padding: '10px 12px', fontSize: '0.8rem' }}
          >
            {copied ? '✓' : 'WA'}
          </button>
        )}

        <button onClick={fetchData} className="refresh-btn" disabled={loading}>
          {loading ? '...' : 'Refresh'}
        </button>
      </div>

      {/* Responses Tab */}
      {activeTab === 'responses' && (
        <>
          {/* Mobile Cards View */}
          <div className="cards-container">
            {filteredResponses.length === 0 ? (
              <div className="empty-state">
                {loading ? 'Loading...' : 'No data available'}
              </div>
            ) : (
              filteredResponses.map((row, index) => (
                <div key={index} className={`response-card ${row.status === 'QHLS ഇല്ല' ? 'no-qhls' : ''}`}>
                  <div className="card-header">
                    <span className="card-zone">{row.zone}</span>
                    <span className={`status-badge ${row.status === 'QHLS ഉണ്ട്' ? 'status-yes' : 'status-no'}`}>
                      {row.status === 'QHLS ഉണ്ട്' ? 'ഉണ്ട്' : 'ഇല്ല'}
                    </span>
                  </div>
                  <div className="card-unit">{row.unit}</div>
                  {row.status === 'QHLS ഉണ്ട്' && (
                    <>
                      <div className="card-details">
                        <span>📅 {row.day}</span>
                        <span>👤 {row.faculty}</span>
                        <span>📱 {row.facultyMobile}</span>
                      </div>
                      <div className="card-details">
                        <span>📚 {row.syllabus}</span>
                        <span>📍 {row.sthalam}</span>
                      </div>
                      <div className="card-details">
                        <span>🌙 റമദാനിന് ശേഷം: {row.afterRamadhan === 'yes' ? 'ഉണ്ട്' : 'ഇല്ല'}</span>
                      </div>
                      <div className="card-counts">
                        <div className="count-item">
                          <span className="count-value">{row.gents}</span>
                          <span className="count-label">പുരുഷൻ</span>
                        </div>
                        <div className="count-item">
                          <span className="count-value">{row.ladies}</span>
                          <span className="count-label">സ്ത്രീ</span>
                        </div>
                        <div className="count-item total">
                          <span className="count-value">{row.gents + row.ladies}</span>
                          <span className="count-label">ആകെ</span>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>

          <div className="admin-footer">
            <p>Showing {filteredResponses.length} of {responses.length} entries</p>
          </div>
        </>
      )}

      {/* Missing Units Tab */}
      {activeTab === 'missing' && missingUnits && (
        <div className="missing-container">
          {Object.keys(missingUnits.byZone).length === 0 ? (
            <div className="empty-state success">
              🎉 എല്ലാ ശാഖകളും ഫോം പൂരിപ്പിച്ചു!
            </div>
          ) : (
            Object.entries(missingUnits.byZone).map(([zone, units]) => (
              <div key={zone} className="missing-zone-card">
                <div className="missing-zone-header">
                  <span className="missing-zone-name">{zone}</span>
                  <span className="missing-zone-count">{units.length} ശാഖകൾ</span>
                </div>
                <div className="missing-units-list">
                  {units.map((unit, idx) => (
                    <div key={idx} className="missing-unit-item">
                      {unit}
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default Admin;
