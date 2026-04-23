const express = require('express');
const router = express.Router();
const sheetsService = require('../services/googleSheetsService');

/**
 * GET /api/zones
 * Returns unique list of zones (from JSON file)
 */
router.get('/zones', (req, res) => {
  try {
    const zones = sheetsService.getZones();
    res.json({ success: true, zones });
  } catch (error) {
    console.error('GET /zones error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch zones' 
    });
  }
});

/**
 * GET /api/units?zone=ZONE_NAME
 * Returns all units under the given zone (from JSON file)
 */
router.get('/units', (req, res) => {
  try {
    const { zone } = req.query;
    
    if (!zone) {
      return res.status(400).json({ 
        success: false, 
        error: 'Zone parameter is required' 
      });
    }

    const units = sheetsService.getUnits(zone);
    res.json({ success: true, units });
  } catch (error) {
    console.error('GET /units error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch units' 
    });
  }
});

/**
 * POST /api/submit
 * Saves form data into QHLS_Responses sheet
 */
router.post('/submit', async (req, res) => {
  try {
    const { 
      zoneName, 
      unitName, 
      qhlsStatus, 
      qhlsDay, 
      faculty, 
      facultyMobile, 
      syllabus, 
      sthalam, 
      afterRamadhan, 
      gentsCount, 
      ladiesCount 
    } = req.body;

    // Validate required fields
    const errors = [];
    if (!zoneName) errors.push('Zone is required');
    if (!unitName) errors.push('Unit is required');
    if (!qhlsStatus) errors.push('QHLS Status is required');
    
    // Only validate QHLS fields if status is 'yes'
    if (qhlsStatus === 'yes') {
      if (!qhlsDay) errors.push('QHLS Day is required');
      if (!faculty) errors.push('Faculty is required');
      if (!facultyMobile) errors.push('Faculty Mobile is required');
      if (!syllabus) errors.push('Syllabus is required');
      if (!sthalam) errors.push('Sthalam is required');
      if (!afterRamadhan) errors.push('After Ramadhan status is required');
      if (gentsCount === undefined || gentsCount === '') errors.push('Gents Count is required');
      if (ladiesCount === undefined || ladiesCount === '') errors.push('Ladies Count is required');
    }

    if (errors.length > 0) {
      return res.status(400).json({ 
        success: false, 
        errors 
      });
    }

    const result = await sheetsService.submitResponse({
      zoneName,
      unitName,
      qhlsStatus,
      qhlsDay: qhlsStatus === 'yes' ? qhlsDay : '',
      faculty: qhlsStatus === 'yes' ? faculty : '',
      facultyMobile: qhlsStatus === 'yes' ? facultyMobile : '',
      syllabus: qhlsStatus === 'yes' ? syllabus : '',
      sthalam: qhlsStatus === 'yes' ? sthalam : '',
      afterRamadhan: qhlsStatus === 'yes' ? afterRamadhan : '',
      gentsCount: qhlsStatus === 'yes' ? (parseInt(gentsCount) || 0) : 0,
      ladiesCount: qhlsStatus === 'yes' ? (parseInt(ladiesCount) || 0) : 0,
    });
    
    if (result.alreadyExists) {
      return res.status(400).json({ 
        success: false, 
        error: `${unitName} ശാഖയുടെ വിവരങ്ങൾ നേരത്തെ തന്നെ സമർപ്പിക്കപ്പെട്ടിട്ടുണ്ട്. എന്തെങ്കിലും മാറ്റങ്ങൾ വരുത്തണമെങ്കിൽ അഡ്മിനുമായി ബന്ധപ്പെടുക.` 
      });
    }

    res.json({ 
      success: true, 
      message: 'Response submitted successfully',
      totalParticipants: result.totalParticipants,
    });
  } catch (error) {
    console.error('POST /submit error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit response' 
    });
  }
});

/**
 * GET /api/report/missing-units
 * Returns units that have NOT conducted QHLS (no submission)
 */
router.get('/report/missing-units', async (req, res) => {
  try {
    const report = await sheetsService.getMissingUnits();
    res.json({ success: true, report });
  } catch (error) {
    console.error('GET /report/missing-units error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate missing units report' 
    });
  }
});

/**
 * GET /api/report/top-participants
 * Returns responses sorted by total participants (descending)
 */
router.get('/report/top-participants', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const report = await sheetsService.getTopParticipants(limit);
    res.json({ success: true, report });
  } catch (error) {
    console.error('GET /report/top-participants error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate top participants report' 
    });
  }
});

/**
 * GET /api/responses
 * Returns all submitted responses
 */
router.get('/responses', async (req, res) => {
  try {
    const responses = await sheetsService.getAllResponses();
    res.json({ success: true, responses });
  } catch (error) {
    console.error('GET /responses error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch responses' 
    });
  }
});

module.exports = router;

