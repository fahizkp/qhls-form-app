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
  const [comprehensiveReport, setComprehensiveReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Filter and view state
  const [zoneFilter, setZoneFilter] = useState('');
  const [mainTab, setMainTab] = useState('qhls'); // 'qhls', 'vision'
  const [qhlsSubTab, setQhlsSubTab] = useState('completed'); // 'completed', 'missing'
  const [visionSubTab, setVisionSubTab] = useState('scheduled'); // 'scheduled', 'pending'
  const [copied, setCopied] = useState(false);
  const [visionCopied, setVisionCopied] = useState(false);

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
      const [responsesRes, statsRes, missingRes, compRes] = await Promise.all([
        fetch(`${API_BASE}/admin/responses`),
        fetch(`${API_BASE}/admin/stats`),
        fetch(`${API_BASE}/admin/missing-units`),
        fetch(`${API_BASE}/api/report/comprehensive`),
      ]);

      const responsesData = await responsesRes.json();
      const statsData = await statsRes.json();
      const missingData = await missingRes.json();
      const compData = await compRes.json();

      if (responsesData.success) {
        setResponses(responsesData.responses);
      }
      if (statsData.success) {
        setStats(statsData.stats);
      }
      if (missingData.success) {
        setMissingUnits(missingData.report);
      }
      if (compData.success) {
        setComprehensiveReport(compData.report);
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
    setComprehensiveReport(null);
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

  function copyVisionWhatsAppMessage() {
    const pendingData = getVisionPendingUnits();
    if (Object.keys(pendingData).length === 0) return;
    
    let message = "*Vision Meet നിശ്ചയിക്കാത്ത ശാഖകൾ:*\n\n";
    
    Object.entries(pendingData).forEach(([zone, units]) => {
      if (!zoneFilter || zone === zoneFilter) {
        message += `*${zone}:*\n`;
        units.forEach(unit => {
          message += `- ${unit}\n`;
        });
        message += "\n";
      }
    });
    
    navigator.clipboard.writeText(message).then(() => {
      setVisionCopied(true);
      setTimeout(() => setVisionCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy:', err);
    });
  }

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    if (dateStr.includes('/')) return dateStr;
    const [year, month, day] = dateStr.split('-');
    if (year && month && day) {
      return `${day}/${month}/${year}`;
    }
    return dateStr;
  };

  const getDayName = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const days = ['ഞായർ', 'തിങ്കൾ', 'ചൊവ്വ', 'ബുധൻ', 'വ്യാഴം', 'വെള്ളി', 'ശനി'];
    return days[date.getDay()];
  };

  // Get unique zones for filter
  const uniqueZones = [...new Set(responses.map(r => r.zone))].sort();
  
  // Data for QHLS Track
  const qhlsResponses = responses.filter(r => r.status === 'QHLS ഉണ്ട്');
  const filteredQhls = zoneFilter 
    ? qhlsResponses.filter(r => r.zone === zoneFilter) 
    : qhlsResponses;

  // Data for Vision Meet Track
  const visionMeetResponses = responses.filter(r => r.visionMeetDate);
  const filteredVision = zoneFilter 
    ? visionMeetResponses.filter(r => r.zone === zoneFilter) 
    : visionMeetResponses;

  const sortedVision = [...filteredVision].sort((a, b) => {
    return new Date(a.visionMeetDate) - new Date(b.visionMeetDate);
  });

  // Counts
  const totalUnits = (stats?.uniqueUnits || 0) + (missingUnits?.totalMissing || 0);
  const visionScheduled = visionMeetResponses.length;
  const visionPending = totalUnits - visionScheduled;

  // Units that haven't filled Vision Meet
  function getVisionPendingUnits() {
    const pendingByZone = {};
    
    // 1. Units that filled QHLS but NOT Vision Meet
    responses.filter(r => !r.visionMeetDate).forEach(r => {
      if (!pendingByZone[r.zone]) pendingByZone[r.zone] = [];
      pendingByZone[r.zone].push(r.unit);
    });
    
    // 2. Units that haven't filled anything at all
    if (missingUnits) {
      Object.entries(missingUnits.byZone).forEach(([zone, units]) => {
        if (!pendingByZone[zone]) pendingByZone[zone] = [];
        units.forEach(u => {
          if (!pendingByZone[zone].includes(u)) {
            pendingByZone[zone].push(u);
          }
        });
      });
    }
    
    return pendingByZone;
  }

  const visionPendingUnitsByZone = getVisionPendingUnits();

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

      {/* Main Track Tabs */}
      <div className="main-track-tabs">
        <button 
          className={`track-tab ${mainTab === 'qhls' ? 'active' : ''}`}
          onClick={() => setMainTab('qhls')}
        >
          QHLS
        </button>
        <button 
          className={`track-tab ${mainTab === 'vision' ? 'active' : ''}`}
          onClick={() => setMainTab('vision')}
        >
          Vision Meet
        </button>
      </div>

      {/* QHLS TRACK CONTENT */}
      {mainTab === 'qhls' && (
        <div className="track-container">
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

          {/* Missing Summary */}
          {missingUnits && (
            <div className="missing-summary">
              <span className="missing-count">{missingUnits.totalMissing}</span>
              <span className="missing-text">/{totalUnits} ശാഖകൾ ഫോം പൂരിപ്പിച്ചിട്ടില്ല</span>
            </div>
          )}

          {/* Sub-Tabs for QHLS */}
          <div className="sub-tab-nav">
            <button 
              className={`sub-tab-btn ${qhlsSubTab === 'completed' ? 'active' : ''}`}
              onClick={() => setQhlsSubTab('completed')}
            >
              പൂർത്തിയാക്കിയവർ ({qhlsResponses.length})
            </button>
            <button 
              className={`sub-tab-btn ${qhlsSubTab === 'missing' ? 'active' : ''}`}
              onClick={() => setQhlsSubTab('missing')}
            >
              ബാക്കിയുള്ളവ ({missingUnits?.totalMissing || 0})
            </button>
          </div>

          {/* Filter Bar */}
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
            <button onClick={fetchData} className="refresh-btn" disabled={loading}>
              {loading ? '...' : 'Refresh'}
            </button>
          </div>

          {/* QHLS Cards */}
          {qhlsSubTab === 'completed' ? (
            <div className="cards-container">
              {filteredQhls.map((row, index) => (
                <div key={index} className="response-card">
                  <div className="card-header">
                    <span className="card-zone">{row.zone}</span>
                    <span className="status-badge status-yes">QHLS ഉണ്ട്</span>
                  </div>
                  <div className="card-unit">{row.unit}</div>
                  <div className="card-details">
                    <span>📅 {row.day}</span>
                    <span>👤 {row.faculty}</span>
                    {row.facultyMobile && (
                      <div className="contact-actions">
                        <span className="mobile-text">{row.facultyMobile}</span>
                        <a href={`tel:${row.facultyMobile}`} className="contact-btn call" title="Call">📞</a>
                        <a href={`https://wa.me/91${row.facultyMobile.replace(/\D/g,'')}`} className="contact-btn whatsapp" target="_blank" rel="noreferrer" title="WhatsApp">
                          <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="card-details">
                    <span>📚 {row.syllabus}</span>
                    <span>📍 {row.sthalam}</span>
                  </div>
                  <div className="card-details">
                    <span>🌙 റമദാനിന് ശേഷം: {row.afterRamadhan === 'yes' ? 'ഉണ്ട്' : 'ഇല്ല'}</span>
                    {row.visionMeetDate && (
                      <span className="vision-date-mini">🎯 {formatDate(row.visionMeetDate)}</span>
                    )}
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
                </div>
              ))}
            </div>
          ) : (
            /* Missing Units Cards in QHLS Track */
            <div className="missing-container">
              {missingUnits && Object.entries(missingUnits.byZone)
                .filter(([zone]) => !zoneFilter || zone === zoneFilter)
                .map(([zone, units]) => (
                <div key={zone} className="missing-zone-card">
                  <div className="missing-zone-header">
                    <span className="missing-zone-name">{zone}</span>
                    <span className="missing-zone-count">{units.length} ശാഖകൾ</span>
                  </div>
                  <div className="missing-units-list">
                    {units.map((unit, idx) => (
                      <div key={idx} className="missing-unit-item">{unit}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* VISION MEET TRACK CONTENT */}
      {mainTab === 'vision' && (
        <div className="track-container">
          <div className="stats-grid">
            <div 
              className={`stat-card ${visionSubTab === 'scheduled' ? 'highlight' : ''}`}
              onClick={() => setVisionSubTab('scheduled')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-value">{visionScheduled}</div>
              <div className="stat-label">തീരുമാനിച്ചത്</div>
            </div>
            <div 
              className={`stat-card ${visionSubTab === 'pending' ? 'highlight-amber' : ''}`}
              onClick={() => setVisionSubTab('pending')}
              style={{ cursor: 'pointer' }}
            >
              <div className="stat-value">{visionPending}</div>
              <div className="stat-label">തീരുമാനിക്കാത്തത്</div>
            </div>
          </div>

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
            
            {visionSubTab === 'pending' && visionPending > 0 && (
              <button 
                className={`whatsapp-copy-btn ${visionCopied ? 'copied' : ''}`}
                onClick={copyVisionWhatsAppMessage}
                style={{ margin: 0, padding: '10px 12px', fontSize: '0.8rem' }}
              >
                {visionCopied ? '✓' : 'WA Report'}
              </button>
            )}

            <button onClick={fetchData} className="refresh-btn">Refresh</button>
          </div>

          {visionSubTab === 'scheduled' ? (
            <div className="cards-container">
              {sortedVision.map((row, index) => (
                <div key={index} className="response-card vision-card">
                  <div className="card-header">
                    <span className="card-zone">{row.zone}</span>
                  </div>
                  <div className="card-unit">{row.unit}</div>
                  <div className="vision-highlight-box">
                    <div className="vh-label">Vision Meet</div>
                    <div className="vh-value">{formatDate(row.visionMeetDate)}</div>
                    <div className="vh-day">{getDayName(row.visionMeetDate)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Pending Vision Meet List */
            <div className="missing-container">
              {Object.entries(visionPendingUnitsByZone)
                .filter(([zone]) => !zoneFilter || zone === zoneFilter)
                .map(([zone, units]) => (
                <div key={zone} className="missing-zone-card vision-pending-card">
                  <div className="missing-zone-header">
                    <span className="missing-zone-name">{zone}</span>
                    <span className="missing-zone-count">{units.length} ശാഖകൾ</span>
                  </div>
                  <div className="missing-units-list">
                    {units.map((unit, idx) => (
                      <div key={idx} className="missing-unit-item">{unit}</div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default Admin;
