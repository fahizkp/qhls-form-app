import React, { useState, useEffect, useCallback } from 'react';
import { exportReportToPpt } from './exportPpt';
import './DetailedReport.css';

const API_BASE = process.env.REACT_APP_API_URL || '';

// ── Syllabus tab config ──────────────────────────────────────────
const SYLLABUS_TABS = [
  { key: 'hajj',    label: 'സൂറത്ത് ഹജ്ജ്',      labelMl: 'Surah Hajj',      color: '#0d9488' },
  { key: 'muminun', label: 'സൂറത്ത് മുഅ്മിനൂൻ',  labelMl: "Surah Mu'minun",  color: '#7c3aed' },
  { key: 'others',  label: 'മറ്റ് സിലബസ്',        labelMl: 'Others',           color: '#ea580c' },
];

// ── Build the flat slide array from API data ─────────────────────
function buildSlides(data) {
  const slides = [];

  // Slide 0 – overview
  slides.push({ type: 'overview', id: 'overview' });

  // One slide per missing-count group (sorted 0 → ∞)
  const missingKeys = Object.keys(data.zonesByMissingCount)
    .sort((a, b) => parseInt(a) - parseInt(b));

  missingKeys.forEach(key => {
    slides.push({
      type: 'zone-group',
      id: `zone-${key}`,
      missingCount: parseInt(key),
      zones: data.zonesByMissingCount[key],
    });
  });

  // One slide per syllabus
  SYLLABUS_TABS.forEach(tab => {
    slides.push({
      type: 'syllabus',
      id: `syllabus-${tab.key}`,
      tab: {
        ...tab,
        count: data.syllabusStats[tab.key],
        units: data.syllabusLists?.[tab.key] || [],
      },
    });
  });

  // After Ramadan summary
  slides.push({ type: 'after-ramadan', id: 'after-ramadan' });

  // Stopped units
  slides.push({ type: 'stopped', id: 'stopped' });

  return slides;
}

// ── Zone group metadata ──────────────────────────────────────────
function zoneGroupMeta(missingCount) {
  if (missingCount === 0) return { title: '100% QHLS',              icon: '🏆', accent: '#22c55e', cls: 'gp-perfect' };
  if (missingCount === 1) return { title: 'ഒരു ശാഖ ഇല്ലാത്തവ',      icon: '🟡', accent: '#f59e0b', cls: 'gp-one' };
  if (missingCount === 2) return { title: 'രണ്ട് ശാഖ ഇല്ലാത്തവ',    icon: '🟠', accent: '#ea580c', cls: 'gp-two' };
  return { title: `${missingCount} ശാഖകൾ ഇല്ലാത്തവ`, icon: '🔴', accent: '#ef4444', cls: 'gp-many' };
}

// ═══════════════════════════════════════════════════════════════
export default function DetailedReport() {
  const [data, setData]             = useState(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [slides, setSlides]         = useState([]);
  const [current, setCurrent]       = useState(0);
  const [dir, setDir]               = useState('next');   // animation direction
  const [exporting, setExporting]   = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API_BASE}/api/report/comprehensive`);
        const json = await res.json();
        if (json.success) {
          setData(json.report);
          setSlides(buildSlides(json.report));
        } else {
          setError('Failed to fetch report data.');
        }
      } catch {
        setError('Connection error. Please try again.');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Navigation ───────────────────────────────────────────────
  const goNext = useCallback(() => {
    setCurrent(c => {
      if (c < slides.length - 1) { setDir('next'); return c + 1; }
      return c;
    });
  }, [slides.length]);

  const goPrev = useCallback(() => {
    setCurrent(c => {
      if (c > 0) { setDir('prev'); return c - 1; }
      return c;
    });
  }, []);

  const jumpTo = useCallback((idx) => {
    setDir(idx > current ? 'next' : 'prev');
    setCurrent(idx);
  }, [current]);

  // ── Keyboard (PPT remote: →, ←, Space, PageDown, PageUp) ────
  useEffect(() => {
    const handler = (e) => {
      if (['ArrowRight', ' ', 'PageDown'].includes(e.key)) { e.preventDefault(); goNext(); }
      if (['ArrowLeft', 'PageUp'].includes(e.key))         { e.preventDefault(); goPrev(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev]);

  // ── Fullscreen ───────────────────────────────────────────────
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };
  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // ── PPT Export ───────────────────────────────────────────────
  const handleExport = async () => {
    if (!data || exporting) return;
    setExporting(true);
    try {
      await exportReportToPpt(data);
    } catch (err) {
      console.error('PPT export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  // ── Loading / Error states ───────────────────────────────────
  if (loading) return (
    <div className="dr-page">
      <div className="dr-loading">
        <div className="dr-spinner" />
        <p>Loading Report…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="dr-page">
      <div className="dr-error">{error}</div>
    </div>
  );

  if (!data || slides.length === 0) return null;

  const slide = slides[current];
  const totalQhls = data.syllabusStats.totalQhls;
  const totalUnits = data.totalUnits;

  // ── Render individual slide types ────────────────────────────
  function renderSlide(sl) {
    switch (sl.type) {

      // ─ Overview ──────────────────────────────────────────────
      case 'overview': {
        const missing = totalUnits - totalQhls;
        return (
          <div className="dr-slide dr-slide--overview">
            <div className="dr-overview-emoji">✨</div>
            <h1 className="dr-overview-title">QHLS Report</h1>
            <div className="dr-overview-stats">
              <div className="dr-stat-card dr-stat-teal">
                <span className="dr-stat-val">{totalQhls}</span>
                <span className="dr-stat-lbl">QHLS ഉള്ള ശാഖകൾ</span>
              </div>
              <div className="dr-stat-card dr-stat-orange">
                <span className="dr-stat-val">{missing}</span>
                <span className="dr-stat-lbl">QHLS ഇല്ലാത്ത ശാഖകൾ</span>
              </div>
              <div className="dr-stat-card dr-stat-gold">
                <span className="dr-stat-val">{totalUnits}</span>
                <span className="dr-stat-lbl">ആകെ ശാഖകൾ</span>
              </div>
            </div>
          </div>
        );
      }

      // ─ Zone Group ─────────────────────────────────────────────
      case 'zone-group': {
        const meta = zoneGroupMeta(sl.missingCount);
        return (
          <div className="dr-slide dr-slide--zone-group" style={{ '--accent': meta.accent }}>
            <div className="dr-slide-header">
              <span className="dr-slide-icon">{meta.icon}</span>
              <div>
                <h2 className="dr-slide-title">{meta.title}</h2>
                <p className="dr-slide-sub">{sl.zones.length} മണ്ഡലങ്ങൾ</p>
              </div>
            </div>
            <div className={`dr-zones-grid dr-zones-grid--count${Math.min(sl.zones.length, 5)}`}>
              {sl.zones.map((z, i) => (
                <div key={i} className={`dr-zone-card ${meta.cls}`}>
                  <span className="dr-zone-name">{z.zoneName}</span>
                  <span className="dr-zone-ratio">
                    <strong>{z.qhlsCount}</strong>
                    <span className="dr-sep">/</span>
                    {z.totalUnits}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      // ─ Syllabus ───────────────────────────────────────────────
      case 'syllabus': {
        const { tab } = sl;
        return (
          <div className="dr-slide dr-slide--syllabus" style={{ '--accent': tab.color }}>
            <div className="dr-slide-header">
              <span className="dr-slide-icon">📚</span>
              <div>
                <h2 className="dr-slide-title">{tab.label}</h2>
                <p className="dr-slide-sub">
                  {tab.count} / {totalQhls} ശാഖകൾ
                  <span className="dr-slide-sub-en"> · {tab.labelMl}</span>
                </p>
              </div>
            </div>
            {tab.units.length === 0 ? (
              <div className="dr-empty">ഒരു ശാഖയും ഇല്ല</div>
            ) : (
              <div className={`dr-units-grid dr-units-grid--count${Math.min(tab.units.length, 5)}`}>
                {tab.units.map((u, i) => (
                  <div key={i} className="dr-unit-card">
                    <span className="dr-unit-name">{u.unit}</span>
                    <span className="dr-unit-zone">{u.zone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      // ─ After Ramadan ─────────────────────────────────────────
      case 'after-ramadan': {
        const totalAfter = Object.values(data.zoneStats).reduce((s, z) => s + z.afterRamadanCount, 0);
        const sortedZones = Object.keys(data.zoneStats)
          .filter(z => data.zoneStats[z].qhlsCount > 0)
          .sort((a, b) => {
            const za = data.zoneStats[a], zb = data.zoneStats[b];
            return (zb.afterRamadanCount / zb.qhlsCount) - (za.afterRamadanCount / za.qhlsCount);
          });

        return (
          <div className="dr-slide dr-slide--ar">
            <div className="dr-slide-header">
              <span className="dr-slide-icon">🌙</span>
              <div>
                <h2 className="dr-slide-title">റമദാനിന് ശേഷവും QHLS ഉള്ള ശാഖകൾ</h2>
              </div>
            </div>
            <div className="dr-ar-summary-row">
              <div className="dr-ar-global">
                <span className="dr-ar-global-val">{totalAfter}</span>
                <span className="dr-ar-global-lbl">/ {totalQhls} QHLS ശാഖകൾ തുടരുന്നു</span>
              </div>
              <div className="dr-ar-badge">
                <span className="dr-ar-badge-val">{data.zonesWith100PercentAfterRamadan}</span>
                <span className="dr-ar-badge-lbl">മണ്ഡലങ്ങൾ 100% തുടരുന്നു</span>
              </div>
            </div>
            <div className="dr-ar-zones">
              {sortedZones.map(zone => {
                const z = data.zoneStats[zone];
                const ratio = z.qhlsCount > 0 ? z.afterRamadanCount / z.qhlsCount : 0;
                const pct = Math.round(ratio * 100);
                return (
                  <div key={zone} className="dr-ar-row">
                    <span className="dr-ar-zone">{zone}</span>
                    <span className="dr-ar-counts">({z.afterRamadanCount}/{z.qhlsCount})</span>
                    <div className="dr-ar-bar-wrap">
                      <div
                        className="dr-ar-bar-fill"
                        style={{ width: `${pct}%`, background: pct === 100 ? '#22c55e' : '#0d9488' }}
                      />
                    </div>
                    <span className="dr-ar-pct">{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      }

      // ─ Stopped ───────────────────────────────────────────────
      case 'stopped': {
        const units = data.afterRamadanStoppedUnits || [];
        return (
          <div className="dr-slide dr-slide--stopped">
            <div className="dr-slide-header">
              <span className="dr-slide-icon">⛔</span>
              <div>
                <h2 className="dr-slide-title">റമദാനിന് ശേഷം QHLS ആരംഭിക്കാത്ത ശാഖകൾ</h2>
              </div>
            </div>
            {units.length === 0 ? (
              <div className="dr-empty dr-empty--success">
                🎉 എല്ലാ ശാഖകളും റമദാനിന് ശേഷം തുടരുന്നു!
              </div>
            ) : (
              <div className={`dr-units-grid dr-units-grid--count${Math.min(units.length, 5)}`}>
                {units.map((u, i) => (
                  <div key={i} className="dr-unit-card dr-unit-card--stopped">
                    <span className="dr-unit-name">{u.unit}</span>
                    <span className="dr-unit-zone">{u.zone}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
    }
  }

  // ── Dot color by slide type ─────────────────────────────────
  function dotColor(sl) {
    if (sl.type === 'overview')      return '#14b8a6';
    if (sl.type === 'zone-group')    return zoneGroupMeta(sl.missingCount).accent;
    if (sl.type === 'syllabus')      return sl.tab.color;
    if (sl.type === 'after-ramadan') return '#22c55e';
    return '#ef4444';
  }

  // ── Render ───────────────────────────────────────────────────
  return (
    <div className="dr-page">
      {/* Top control bar */}
      <div className="dr-controls">
        <a href="#/report" className="dr-back-btn" title="Back to Report">← Report</a>

        <div className="dr-slide-counter">{current + 1} / {slides.length}</div>

        <div className="dr-control-actions">
          <button
            className={`dr-export-btn ${exporting ? 'dr-exporting' : ''}`}
            onClick={handleExport}
            disabled={exporting}
            title="Export as PowerPoint"
          >
            {exporting ? '⏳ Exporting…' : '📊 Export PPT'}
          </button>

          <button
            className="dr-fs-btn"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? '⛶' : '⛶'}
          </button>
        </div>
      </div>

      {/* Slide area */}
      <div className={`dr-stage dr-stage--${dir}`} key={current}>
        {renderSlide(slide)}
      </div>

      {/* Bottom nav dots */}
      <div className="dr-nav">
        {slides.map((sl, idx) => (
          <button
            key={sl.id}
            className={`dr-dot ${idx === current ? 'dr-dot--active' : ''}`}
            style={idx === current ? { background: dotColor(sl), borderColor: dotColor(sl) } : {}}
            onClick={() => jumpTo(idx)}
            title={`Slide ${idx + 1}`}
          />
        ))}
      </div>

      {/* PPT remote hint */}
      <div className="dr-hint">← → Space · PageUp PageDown</div>
    </div>
  );
}
