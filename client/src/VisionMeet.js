import React, { useState, useEffect } from 'react';
import { fetchZones, fetchUnits, submitVisionMeet, checkVisionMeet } from './services/api';
import './App.css'; // Reuse App.css for consistent styling

function VisionMeet() {
  // Form state
  const [formData, setFormData] = useState({
    zoneName: '',
    unitName: '',
    visionMeetDate: '',
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
  
  // Update confirmation popup state
  const [showUpdatePopup, setShowUpdatePopup] = useState(false);
  const [existingDate, setExistingDate] = useState('');
  const [isUpdateMode, setIsUpdateMode] = useState(false);

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
    setIsUpdateMode(false);
    setExistingDate('');
  }, [formData.zoneName]);

  // Check for existing vision meet when unit changes
  useEffect(() => {
    if (formData.zoneName && formData.unitName && !isUpdateMode) {
      checkExistingVisionMeet(formData.zoneName, formData.unitName);
    }
  }, [formData.unitName]);

  async function checkExistingVisionMeet(zone, unit) {
    try {
      const data = await checkVisionMeet(zone, unit);
      if (data.exists) {
        setExistingDate(data.visionMeetDate);
        setShowUpdatePopup(true);
      }
    } catch (error) {
      console.error('Error checking vision meet:', error);
    }
  }

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
    if (message.text) setMessage({ type: '', text: '' });
  }

  function validateForm() {
    const { zoneName, unitName, visionMeetDate } = formData;
    if (!zoneName) return 'ദയവായി മണ്ഡലം തിരഞ്ഞെടുക്കുക';
    if (!unitName) return 'ദയവായി ശാഖ തിരഞ്ഞെടുക്കുക';
    if (!visionMeetDate) return 'ദയവായി വിഷൻ മീറ്റ് തീയതി തിരഞ്ഞെടുക്കുക';
    return null;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    
    const error = validateForm();
    if (error) {
      setMessage({ type: 'error', text: error });
      return;
    }

    try {
      setLoading(true);
      await submitVisionMeet({
        ...formData,
        isUpdate: isUpdateMode
      });
      
      // Store unit name for the popup before resetting
      const submittedUnit = formData.unitName;
      
      setMessage({ type: 'success', text: `${submittedUnit} ശാഖയുടെ വിഷൻ മീറ്റ് വളരെ നല്ല രീതിയിൽ പൂർത്തിയാക്കാൻ അല്ലാഹു തൗഫീഖ് നൽകട്ടെ.` });
      setShowPopup(true);
      
      // Reset form
      setFormData({
        zoneName: '',
        unitName: '',
        visionMeetDate: '',
      });
      setUnits([]);
      setIsUpdateMode(false);
      setExistingDate('');
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'സേവ് ചെയ്യാനായില്ല. വീണ്ടും ശ്രമിക്കുക.' });
    } finally {
      setLoading(false);
    }
  }

  function handleUpdateConfirm() {
    setIsUpdateMode(true);
    setShowUpdatePopup(false);
  }

  function handleUpdateCancel() {
    setShowUpdatePopup(false);
    setFormData(prev => ({ ...prev, unitName: '' }));
  }

  return (
    <div className="app">
      {/* Success Popup Modal */}
      {showPopup && (
        <div className="popup-overlay" onClick={() => setShowPopup(false)}>
          <div className="popup-modal" onClick={(e) => e.stopPropagation()}>
            <div className="popup-icon success">✓</div>
            <h2 className="popup-arabic">جَزَاكَ اللهُ خَيْرًا</h2>
            <p className="popup-message">
              {message.text}
            </p>
            <button className="popup-close-btn" onClick={() => setShowPopup(false)}>
              ശരി
            </button>
          </div>
        </div>
      )}

      {/* Update Confirmation Modal */}
      {showUpdatePopup && (
        <div className="popup-overlay">
          <div className="popup-modal">
            <div className="popup-icon encourage">📝</div>
            <p className="popup-message">
              <strong>{formData.unitName}</strong> ശാഖയുടെ വിഷൻ മീറ്റ് <strong>{existingDate}</strong> ആണ്. ഇത് അപ്ഡേറ്റ് ചെയ്യണോ?
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                className="popup-close-btn" 
                style={{ background: '#334155', flex: 1 }} 
                onClick={handleUpdateCancel}
              >
                വേണ്ട
              </button>
              <button 
                className="popup-close-btn" 
                style={{ flex: 1 }} 
                onClick={handleUpdateConfirm}
              >
                അപ്ഡേറ്റ് ചെയ്യണം
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="form-container">
        <div className="form-header">
          <h1>Vision Meet</h1>
          <p>ശാഖാ വിഷൻ മീറ്റ് വിവരങ്ങൾ നൽകുക</p>
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

          {/* Date Selector */}
          <div className="form-group">
            <label htmlFor="visionMeetDate">വിഷൻ മീറ്റ് തീയതി <span className="required">*</span></label>
            <input
              type="date"
              id="visionMeetDate"
              name="visionMeetDate"
              value={formData.visionMeetDate}
              onChange={handleChange}
            />
          </div>

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

export default VisionMeet;
