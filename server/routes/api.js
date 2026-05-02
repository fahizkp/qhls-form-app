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
 * GET /api/check-submission?zone=X&unit=Y
 * Checks if a unit has already submitted and returns the data
 */
router.get('/check-submission', async (req, res) => {
  try {
    const { zone, unit } = req.query;
    if (!zone || !unit) {
      return res.status(400).json({ success: false, error: 'Zone and Unit are required' });
    }

    const submission = await sheetsService.getExistingSubmission(zone, unit);
    res.json({ success: true, exists: !!submission, submission });
  } catch (error) {
    console.error('GET /check-submission error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to check submission' });
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
    }, req.body.isUpdate || false, req.body.forceAppend || false);
    
    if (result.alreadyExists) {
      return res.status(400).json({ 
        success: false, 
        alreadyExists: true,
        error: `${unitName} ശാഖയുടെ വിവരങ്ങൾ നേരത്തെ തന്നെ സമർപ്പിക്കപ്പെട്ടിട്ടുണ്ട്.` 
      });
    }

    res.json({ 
      success: true, 
      message: 'Response submitted successfully',
      totalParticipants: result.totalParticipants,
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit response' 
    });
  }
});

/**
 * POST /api/vision-meet
 * Saves vision meet date into QHLS_Responses sheet
 */
router.post('/vision-meet', async (req, res) => {
  try {
    const { zoneName, unitName, visionMeetDate, isUpdate } = req.body;

    if (!zoneName || !unitName || !visionMeetDate) {
      return res.status(400).json({ 
        success: false, 
        error: 'Zone, Unit and Date are required' 
      });
    }

    const result = await sheetsService.submitVisionMeet({
      zoneName,
      unitName,
      visionMeetDate
    }, isUpdate);
    
    res.json({ 
      success: true, 
      message: 'Vision Meet submitted successfully'
    });
  } catch (error) {
    console.error('POST /vision-meet error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to submit vision meet' 
    });
  }
});

/**
 * GET /api/vision-meet/check?zone=X&unit=Y
 * Checks if a unit has already saved vision meet date
 */
router.get('/vision-meet/check', async (req, res) => {
  try {
    const { zone, unit } = req.query;
    if (!zone || !unit) {
      return res.status(400).json({ success: false, error: 'Zone and Unit are required' });
    }

    const submission = await sheetsService.getExistingSubmission(zone, unit);
    const visionMeetDate = submission ? submission.visionMeetDate : '';
    
    res.json({ 
      success: true, 
      exists: !!visionMeetDate, 
      visionMeetDate 
    });
  } catch (error) {
    console.error('GET /vision-meet/check error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to check vision meet' });
  }
});

/**
 * GET /api/report/comprehensive
 * Returns comprehensive report data
 */
router.get('/report/comprehensive', async (req, res) => {
  try {
    const report = await sheetsService.getComprehensiveReport();
    res.json({ success: true, report });
  } catch (error) {
    console.error('GET /report/comprehensive error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to generate comprehensive report' 
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

