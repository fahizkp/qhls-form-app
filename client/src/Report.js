import React, { useState, useEffect } from 'react';
import './Report.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

function Report() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [syllabusTab, setSyllabusTab] = useState('hajj');

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${API_BASE}/api/report/comprehensive`);
        const json = await res.json();
        if (json.success) {
          setData(json.report);
        } else {
          setError('Failed to fetch report data.');
        }
      } catch (err) {
        setError('Connection error. Please try again.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="report-page">
        <div className="report-loading">
          <div className="loading-spinner"></div>
          <p>Loading Report...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="report-page">
        <div className="report-error">{error}</div>
      </div>
    );
  }

  if (!data) return null;

  const totalUnits = data.totalUnits;
  const totalQhls = data.syllabusStats.totalQhls;

  // Syllabus tab config
  const syllabusTabs = [
    {
      key: 'hajj',
      label: 'സൂറത്ത് ഹജ്ജ്',
      labelMl: 'Surah Hajj',
      count: data.syllabusStats.hajj,
      units: data.syllabusLists ? data.syllabusLists.hajj : [],
      color: '#0d9488',
    },
    {
      key: 'muminun',
      label: 'സൂറത്ത് മുഅ്മിനൂൻ',
      labelMl: "Surah Mu'minun",
      count: data.syllabusStats.muminun,
      units: data.syllabusLists ? data.syllabusLists.muminun : [],
      color: '#7c3aed',
    },
    {
      key: 'others',
      label: 'മറ്റ് സിലബസ്',
      labelMl: 'Others',
      count: data.syllabusStats.others,
      units: data.syllabusLists ? data.syllabusLists.others : [],
      color: '#ea580c',
    },
  ];

  const activeTab = syllabusTabs.find(t => t.key === syllabusTab);

  return (
    <div className="report-page">
      {/* Header */}
      <header className="rp-header">
        <div className="rp-header-inner">
          <h1>QHLS Report</h1>
          <p>Comprehensive analysis across all zones and units</p>
          <div className="rp-header-stats">
            <div className="rp-header-stat">
              <span className="rp-stat-val">{totalQhls}</span>
              <span className="rp-stat-lbl">QHLS ഉള്ള ശാഖകൾ</span>
            </div>
            <div className="rp-header-stat">
              <span className="rp-stat-val">{totalUnits - totalQhls}</span>
              <span className="rp-stat-lbl">QHLS ഇല്ലാത്ത ശാഖകൾ</span>
            </div>
            <div className="rp-header-stat highlight">
              <span className="rp-stat-val">{totalUnits}</span>
              <span className="rp-stat-lbl">ആകെ ശാഖകൾ</span>
            </div>
          </div>
        </div>
      </header>

      <div className="rp-body">

        {/* ── Section 1: Zone Completion Groups ── */}
        <section className="rp-section">
          <div className="rp-section-title">
            <span className="rp-section-num">1</span>
            <h2>മണ്ഡലങ്ങൾ – QHLS ഇല്ലാത്ത ശാഖകളുടെ അടിസ്ഥാനത്തിൽ</h2>
          </div>

          <div className="zone-groups-grid">
            {Object.keys(data.zonesByMissingCount)
              .sort((a, b) => parseInt(a) - parseInt(b))
              .map(missingCount => {
                const count = parseInt(missingCount);
                let title, icon, colorClass;
                if (count === 0) {
                  title = '100% QHLS';
                  icon = '🏆';
                  colorClass = 'group-perfect';
                } else if (count === 1) {
                  title = 'ഒരു ശാഖ ഇല്ലാത്തവ';
                  icon = '🟡';
                  colorClass = 'group-one';
                } else if (count === 2) {
                  title = 'രണ്ട് ശാഖ ഇല്ലാത്തവ';
                  icon = '🟠';
                  colorClass = 'group-two';
                } else {
                  title = `${count} ശാഖകൾ ഇല്ലാത്തവ`;
                  icon = '🔴';
                  colorClass = 'group-many';
                }

                const zones = data.zonesByMissingCount[missingCount];

                return (
                  <div key={missingCount} className={`zone-group-card ${colorClass}`}>
                    <div className="zgc-header">
                      <span className="zgc-icon">{icon}</span>
                      <div>
                        <div className="zgc-title">{title}</div>
                        <div className="zgc-subtitle">{zones.length} മണ്ഡലം</div>
                      </div>
                    </div>
                    <ul className="zgc-zone-list">
                      {zones.map((z, idx) => (
                        <li key={idx} className="zgc-zone-row">
                          <span className="zgc-zone-name">{z.zoneName}</span>
                          <span className="zgc-zone-ratio">
                            {z.qhlsCount}<span className="zgc-sep">/</span>{z.totalUnits}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
          </div>
        </section>

        {/* ── Section 2: Syllabus Filter ── */}
        <section className="rp-section">
          <div className="rp-section-title">
            <span className="rp-section-num">2</span>
            <h2>സിലബസ് അടിസ്ഥാനത്തിൽ</h2>
          </div>

          {/* Summary Cards */}
          <div className="syllabus-summary-row">
            {syllabusTabs.map(tab => (
              <button
                key={tab.key}
                className={`syllabus-summary-card ${syllabusTab === tab.key ? 'ssc-active' : ''}`}
                style={{ '--accent': tab.color }}
                onClick={() => setSyllabusTab(tab.key)}
              >
                <div className="ssc-count">{tab.count}</div>
                <div className="ssc-total">/ {totalQhls} ശാഖ</div>
                <div className="ssc-label">{tab.label}</div>
                <div className="ssc-sublabel">{tab.labelMl}</div>
                <div className="ssc-bar">
                  <div
                    className="ssc-bar-fill"
                    style={{ width: `${totalQhls > 0 ? (tab.count / totalQhls) * 100 : 0}%` }}
                  ></div>
                </div>
              </button>
            ))}
          </div>

          {/* Unit List for active tab */}
          {activeTab && (
            <div className="syllabus-unit-section">
              <div className="sus-header">
                <h3>{activeTab.label}</h3>
                <span className="sus-count-badge" style={{ background: activeTab.color }}>
                  {activeTab.count} / {totalQhls} ശാഖകൾ
                </span>
              </div>
              {activeTab.units.length === 0 ? (
                <div className="sus-empty">No units recorded for this syllabus.</div>
              ) : (
                <div className="sus-units-grid">
                  {activeTab.units.map((u, idx) => (
                    <div key={idx} className="sus-unit-card" style={{ '--accent': activeTab.color }}>
                      <div className="suc-unit">{u.unit}</div>
                      <div className="suc-zone">{u.zone}</div>
                      {u.faculty && <div className="suc-faculty">📚 {u.faculty}</div>}
                      {u.syllabus && <div className="suc-syllabus">"{u.syllabus}"</div>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* ── Section 3: After Ramadan ── */}
        <section className="rp-section">
          <div className="rp-section-title">
            <span className="rp-section-num">3</span>
            <h2>റമദാനിന് ശേഷവും QHLS ഉള്ള ശാഖകൾ</h2>
          </div>

          {/* Global total */}
          {(() => {
            const totalAfter = Object.values(data.zoneStats).reduce(
              (sum, z) => sum + z.afterRamadanCount, 0
            );
            return (
              <div className="ar-global-summary-row">
                <div className="ar-global-summary">
                  <span className="ar-global-val">{totalAfter}</span>
                  <span className="ar-global-label">/ {totalQhls} QHLS ശാഖകൾ റമദാനിന് ശേഷം തുടരുന്നു</span>
                </div>
                <div className="ar-hundred-zones-badge">
                  <span className="ar-hundred-val">{data.zonesWith100PercentAfterRamadan}</span>
                  <span className="ar-hundred-label">മണ്ഡലങ്ങളിൽ 100% തുടരുന്നു</span>
                </div>
              </div>
            );
          })()}

          <div className="ar-zones-list">
            {Object.keys(data.zoneStats)
              .filter(zone => data.zoneStats[zone].qhlsCount > 0)
              .sort((a, b) => {
                // Sort by afterRamadan ratio descending
                const za = data.zoneStats[a];
                const zb = data.zoneStats[b];
                return (zb.afterRamadanCount / zb.qhlsCount) - (za.afterRamadanCount / za.qhlsCount);
              })
              .map(zone => {
                const z = data.zoneStats[zone];
                const ratio = z.qhlsCount > 0 ? z.afterRamadanCount / z.qhlsCount : 0;
                return (
                  <div key={zone} className="ar-zone-row">
                    <span className="ar-zone-name">{zone}</span>
                    <span className="ar-zone-counts">
                      ({z.afterRamadanCount} / {z.qhlsCount})
                    </span>
                    <div className="ar-bar-wrap">
                      <div
                        className="ar-bar-fill"
                        style={{ width: `${ratio * 100}%` }}
                      ></div>
                    </div>
                    <span className="ar-pct">{Math.round(ratio * 100)}%</span>
                  </div>
                );
              })}
          </div>
        </section>

        {/* ── Section 4: Not Started After Ramadan ── */}
        <section className="rp-section">
          <div className="rp-section-title">
            <span className="rp-section-num">4</span>
            <h2>റമദാനിന് ശേഷം QHLS ആരംഭിക്കാത്ത ശാഖകൾ</h2>
          </div>

          <div className="stopped-units-grid">
            {data.afterRamadanStoppedUnits && data.afterRamadanStoppedUnits.length > 0 ? (
              data.afterRamadanStoppedUnits.map((u, idx) => (
                <div key={idx} className="stopped-unit-card">
                  <span className="suc-unit">{u.unit}</span>
                  <span className="suc-zone">({u.zone})</span>
                </div>
              ))
            ) : (
              <div className="sus-empty">എല്ലാ ശാഖകളും റമദാനിന് ശേഷം തുടരുന്നു! 🎉</div>
            )}
          </div>
        </section>

      </div>
    </div>
  );
}

export default Report;
