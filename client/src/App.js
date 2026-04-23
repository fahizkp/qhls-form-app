import React, { useState, useEffect } from 'react';
import { fetchZones, fetchUnits, submitForm } from './services/api';
import './App.css';

// Days of the week in Malayalam
const DAYS_OF_WEEK = [
  'ഞായർ',
  'തിങ്കൾ',
  'ചൊവ്വ',
  'ബുധൻ',
  'വ്യാഴം',
  'വെള്ളി',
  'ശനി',
];

function App() {
  // Form state
  const [formData, setFormData] = useState({
    zoneName: '',
    unitName: '',
    qhlsStatus: '', // 'yes' or 'no'
    qhlsDay: '',
    faculty: '',
    facultyMobile: '',
    syllabus: '',
    sthalam: '',
    afterRamadhan: '',
    gentsCount: '',
    ladiesCount: '',
  });

  // Dropdown options
  const [zones, setZones] = useState([]);
  const [units, setUnits] = useState([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [zonesLoading, setZonesLoading] = useState(true);
  const [unitsLoading, setUnitsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  
  // Success popup state
  const [showPopup, setShowPopup] = useState(false);
  const [popupData, setPopupData] = useState({ status: '', zone: '', unit: '' });

  // Fetch zones on mount
  useEffect(() => {
    loadZones();
  }, []);

  // Fetch units when zone changes
  useEffect(() => {
    if (formData.zoneName) {
      loadUnits(formData.zoneName);
    } else {
      setUnits([]);
    }
  }, [formData.zoneName]);

  async function loadZones() {
    try {
      setZonesLoading(true);
      const data = await fetchZones();
      setZones(data);
    } catch (error) {
      setMessage({ type: 'error', text: 'മണ്ഡലങ്ങൾ ലോഡ് ചെയ്യാനായില്ല. പേജ് പുതുക്കുക.' });
    } finally {
      setZonesLoading(false);
    }
  }

  async function loadUnits(zone) {
    try {
      setUnitsLoading(true);
      setFormData(prev => ({ ...prev, unitName: '' }));
      const data = await fetchUnits(zone);
      setUnits(data);
    } catch (error) {
      setMessage({ type: 'error', text: 'ശാഖകൾ ലോഡ് ചെയ്യാനായില്ല.' });
    } finally {
      setUnitsLoading(false);
    }
  }

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear message when user types
    if (message.text) setMessage({ type: '', text: '' });
  }

  function handleStatusChange(status) {
    setFormData(prev => ({
      ...prev,
      qhlsStatus: status,
      // Clear QHLS fields if "no" is selected
      ...(status === 'no' ? {
        qhlsDay: '',
        faculty: '',
        facultyMobile: '',
        syllabus: '',
        sthalam: '',
        afterRamadhan: '',
        gentsCount: '',
        ladiesCount: '',
      } : {})
    }));
    if (message.text) setMessage({ type: '', text: '' });
  }

  function validateForm() {
    const { zoneName, unitName, qhlsStatus, qhlsDay, faculty, gentsCount, ladiesCount } = formData;
    
    if (!zoneName) return 'ദയവായി മണ്ഡലം തിരഞ്ഞെടുക്കുക';
    if (!unitName) return 'ദയവായി ശാഖ തിരഞ്ഞെടുക്കുക';
    if (!qhlsStatus) return 'ദയവായി QHLS സ്റ്റാറ്റസ് തിരഞ്ഞെടുക്കുക';
    
    // Only validate QHLS fields if QHLS was conducted
    if (qhlsStatus === 'yes') {
      if (!qhlsDay) return 'ദയവായി QHLS ദിവസം തിരഞ്ഞെടുക്കുക';
      if (!faculty.trim()) return 'ദയവായി ഫാക്കൽറ്റിയുടെ പേര് നൽകുക';
      
      const mobileRegex = /^[0-9]{10}$/;
      if (!mobileRegex.test(formData.facultyMobile)) return 'ദയവായി 10 അക്ക മൊബൈൽ നമ്പർ നൽകുക';
      
      if (!syllabus.trim()) return 'ദയവായി സിലബസ് നൽകുക';
      if (!sthalam.trim()) return 'ദയവായി സ്ഥലം നൽകുക';
      if (!afterRamadhan) return 'റമദാനിന് ശേഷം QHLS നടക്കുന്നുണ്ടോ എന്ന് തിരഞ്ഞെടുക്കുക';
      
      if (gentsCount === '' || gentsCount < 0) return 'ദയവായി പുരുഷന്മാരുടെ എണ്ണം നൽകുക';
      if (ladiesCount === '' || ladiesCount < 0) return 'ദയവായി സ്ത്രീകളുടെ എണ്ണം നൽകുക';
    }
    
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const error = validateForm();
    if (error) {
      setMessage({ type: 'error', text: error });
      return;
    }

    // Store zone and unit names before resetting
    const submittedZone = formData.zoneName;
    const submittedUnit = formData.unitName;
    const submittedStatus = formData.qhlsStatus;

    try {
      setLoading(true);
      await submitForm({
        ...formData,
        gentsCount: formData.qhlsStatus === 'yes' ? (parseInt(formData.gentsCount) || 0) : 0,
        ladiesCount: formData.qhlsStatus === 'yes' ? (parseInt(formData.ladiesCount) || 0) : 0,
      });
      
      // Show success popup
      setPopupData({
        status: submittedStatus,
        zone: submittedZone,
        unit: submittedUnit,
      });
      setShowPopup(true);
      
      // Reset form
      setFormData({
        zoneName: '',
        unitName: '',
        qhlsStatus: '',
        qhlsDay: '',
        faculty: '',
        facultyMobile: '',
        syllabus: '',
        sthalam: '',
        afterRamadhan: '',
        gentsCount: '',
        ladiesCount: '',
      });
      setUnits([]);
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'സേവ് ചെയ്യാനായില്ല. വീണ്ടും ശ്രമിക്കുക.' });
    } finally {
      setLoading(false);
    }
  }

  function closePopup() {
    setShowPopup(false);
    setPopupData({ status: '', zone: '', unit: '' });
  }

  const totalParticipants = (parseInt(formData.gentsCount) || 0) + (parseInt(formData.ladiesCount) || 0);
  const showQhlsFields = formData.qhlsStatus === 'yes';

  return (
    <div className="app">
      {/* Success Popup Modal */}
      {showPopup && (
        <div className="popup-overlay" onClick={closePopup}>
          <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
            <p className="popup-received">താങ്കളുടെ മറുപടി സ്വീകരിച്ചിരിക്കുന്നു</p>
            {popupData.status === 'yes' ? (
              <>
                <div className="popup-icon success">✓</div>
                <h2 className="popup-arabic">جَزَاكَ اللهُ خَيْرًا</h2>
                <p className="popup-message">
                  <strong>{popupData.zone}</strong> മണ്ഡലത്തിൽ <strong>{popupData.unit}</strong> ശാഖയിൽ 
                  QHLS നിലനിർത്തുവാനും പങ്കാളിത്തം കൂട്ടുവാനും അല്ലാഹു തൗഫീഖ് നൽകുമാറാവട്ടെ.
                </p>
              </>
            ) : (
              <>
                <div className="popup-icon encourage">🤲</div>
                <p className="popup-message">
                  <strong>{popupData.zone}</strong> മണ്ഡലത്തിൽ <strong>{popupData.unit}</strong> ശാഖയിൽ 
                  QHLS തുടങ്ങാൻ അല്ലാഹു തൗഫീഖ് നൽകുമാറാവട്ടെ.
                </p>
              </>
            )}
            <button className="popup-close-btn" onClick={closePopup}>
              ശരി
            </button>
          </div>
        </div>
      )}

      <div className="form-container">
        <div className="form-header">
          <h1>QHLS Data Collection</h1>
          <p>Submit your unit's QHLS program details</p>
        </div>

        {message.text && (
          <div className={`message ${message.type}`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Zone Dropdown */}
          <div className="form-group">
            <label htmlFor="zoneName">മണ്ഡലം <span className="required">*</span></label>
            <select
              id="zoneName"
              name="zoneName"
              value={formData.zoneName}
              onChange={handleChange}
              disabled={zonesLoading}
            >
              <option value="">
                {zonesLoading ? 'ലോഡ് ചെയ്യുന്നു...' : 'മണ്ഡലം തിരഞ്ഞെടുക്കുക'}
              </option>
              {zones.map(zone => (
                <option key={zone} value={zone}>{zone}</option>
              ))}
            </select>
          </div>

          {/* Unit Dropdown */}
          <div className="form-group">
            <label htmlFor="unitName">ശാഖ <span className="required">*</span></label>
            <select
              id="unitName"
              name="unitName"
              value={formData.unitName}
              onChange={handleChange}
              disabled={!formData.zoneName || unitsLoading}
            >
              <option value="">
                {unitsLoading ? 'ലോഡ് ചെയ്യുന്നു...' : 
                 !formData.zoneName ? 'ആദ്യം മണ്ഡലം തിരഞ്ഞെടുക്കുക' : 'ശാഖ തിരഞ്ഞെടുക്കുക'}
              </option>
              {units.map(unit => (
                <option key={unit} value={unit}>{unit}</option>
              ))}
            </select>
          </div>

          {/* QHLS Status Radio Buttons */}
          <div className="form-group">
            <label>QHLS സ്റ്റാറ്റസ് <span className="required">*</span></label>
            <div className="radio-group">
              <label className={`radio-option ${formData.qhlsStatus === 'yes' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="qhlsStatus"
                  value="yes"
                  checked={formData.qhlsStatus === 'yes'}
                  onChange={() => handleStatusChange('yes')}
                />
                <span className="radio-label">QHLS ഉണ്ട്</span>
              </label>
              <label className={`radio-option ${formData.qhlsStatus === 'no' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="qhlsStatus"
                  value="no"
                  checked={formData.qhlsStatus === 'no'}
                  onChange={() => handleStatusChange('no')}
                />
                <span className="radio-label">QHLS ഇല്ല</span>
              </label>
            </div>
          </div>

          {/* Conditional QHLS Fields - Only show if QHLS ഉണ്ട് is selected */}
          {showQhlsFields && (
            <>
              {/* QHLS Day */}
              <div className="form-group">
                <label htmlFor="qhlsDay">ദിവസം <span className="required">*</span></label>
                <select
                  id="qhlsDay"
                  name="qhlsDay"
                  value={formData.qhlsDay}
                  onChange={handleChange}
                >
                  <option value="">ദിവസം തിരഞ്ഞെടുക്കുക</option>
                  {DAYS_OF_WEEK.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              {/* Faculty */}
              <div className="form-group">
                <label htmlFor="faculty">ഫാക്കൽറ്റി <span className="required">*</span></label>
                <input
                  type="text"
                  id="faculty"
                  name="faculty"
                  value={formData.faculty}
                  onChange={handleChange}
                  placeholder="ഫാക്കൽറ്റിയുടെ പേര് നൽകുക"
                />
              </div>

              {/* Faculty Mobile */}
              <div className="form-group">
                <label htmlFor="facultyMobile">ഫാക്കൽറ്റി മൊബൈൽ നമ്പർ <span className="required">*</span></label>
                <input
                  type="tel"
                  id="facultyMobile"
                  name="facultyMobile"
                  value={formData.facultyMobile}
                  onChange={handleChange}
                  placeholder="10 അക്ക നമ്പർ"
                  maxLength="10"
                />
              </div>

              {/* Syllabus */}
              <div className="form-group">
                <label htmlFor="syllabus">സിലബസ് (സൂറത്തിന്റെ പേര്) <span className="required">*</span></label>
                <input
                  type="text"
                  id="syllabus"
                  name="syllabus"
                  value={formData.syllabus}
                  onChange={handleChange}
                  placeholder="സിലബസ് നൽകുക"
                />
              </div>

              {/* Sthalam */}
              <div className="form-group">
                <label htmlFor="sthalam">സ്ഥലം <span className="required">*</span></label>
                <input
                  type="text"
                  id="sthalam"
                  name="sthalam"
                  value={formData.sthalam}
                  onChange={handleChange}
                  placeholder="സ്ഥലം നൽകുക"
                />
              </div>

              {/* After Ramadhan Status */}
              <div className="form-group">
                <label>റമദാനിന് ശേഷം QHLS നടക്കുന്നുണ്ടോ? <span className="required">*</span></label>
                <div className="radio-group">
                  <label className={`radio-option ${formData.afterRamadhan === 'yes' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="afterRamadhan"
                      value="yes"
                      checked={formData.afterRamadhan === 'yes'}
                      onChange={handleChange}
                    />
                    <span className="radio-label">ഉണ്ട്</span>
                  </label>
                  <label className={`radio-option ${formData.afterRamadhan === 'no' ? 'selected' : ''}`}>
                    <input
                      type="radio"
                      name="afterRamadhan"
                      value="no"
                      checked={formData.afterRamadhan === 'no'}
                      onChange={handleChange}
                    />
                    <span className="radio-label">ഇല്ല</span>
                  </label>
                </div>
              </div>

              {/* Participant Counts */}
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="gentsCount">പുരുഷന്മാർ <span className="required">*</span></label>
                  <input
                    type="number"
                    id="gentsCount"
                    name="gentsCount"
                    value={formData.gentsCount}
                    onChange={handleChange}
                    min="0"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="ladiesCount">സ്ത്രീകൾ <span className="required">*</span></label>
                  <input
                    type="number"
                    id="ladiesCount"
                    name="ladiesCount"
                    value={formData.ladiesCount}
                    onChange={handleChange}
                    min="0"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Total Display */}
              {(formData.gentsCount || formData.ladiesCount) && (
                <div className="total-display">
                  ആകെ പങ്കാളികൾ: <strong>{totalParticipants}</strong>
                </div>
              )}
            </>
          )}

          {/* Submit Button */}
          <button 
            type="submit" 
            className="submit-btn"
            disabled={loading}
          >
            {loading ? 'സേവ് ചെയ്യുന്നു...' : 'സേവ് ചെയ്യുക'}
          </button>
        </form>

        <div className="form-footer">
          <p><span className="required">*</span> അടയാളപ്പെടുത്തിയ എല്ലാ ഫീൽഡുകളും നിർബന്ധമാണ്</p>
        </div>
      </div>
    </div>
  );
}

export default App;
