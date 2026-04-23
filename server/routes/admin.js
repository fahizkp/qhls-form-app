const express = require('express');
const router = express.Router();
const sheetsService = require('../services/googleSheetsService');

// Load admin credentials
const adminsData = require('../data/admins.json');

/**
 * POST /admin/login
 * Validate admin credentials
 */
router.post('/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        error: 'Username and password are required' 
      });
    }
    
    const admin = adminsData.admins.find(
      a => a.username === username && a.password === password
    );
    
    if (admin) {
      res.json({ 
        success: true, 
        message: 'Login successful',
        username: admin.username,
      });
    } else {
      res.status(401).json({ 
        success: false, 
        error: 'Invalid username or password' 
      });
    }
  } catch (error) {
    console.error('POST /admin/login error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Login failed' 
    });
  }
});

/**
 * GET /admin/responses
 * Get all form responses for admin view
 */
router.get('/responses', async (req, res) => {
  try {
    const responses = await sheetsService.getAllResponses();
    res.json({ success: true, responses: [...responses].reverse() });
  } catch (error) {
    console.error('GET /admin/responses error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch responses' 
    });
  }
});

/**
 * GET /admin/stats
 * Get summary statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const responses = await sheetsService.getAllResponses();
    const totalGents = responses.reduce((sum, r) => sum + r.gents, 0);
    const totalLadies = responses.reduce((sum, r) => sum + r.ladies, 0);
    
    // Count unique zones and units
    const uniqueZones = new Set(responses.map(r => r.zone));
    const uniqueUnits = new Set(responses.map(r => `${r.zone}|${r.unit}`));
    
    res.json({
      success: true,
      stats: {
        totalResponses: responses.length,
        totalGents,
        totalLadies,
        totalParticipants: totalGents + totalLadies,
        uniqueZones: uniqueZones.size,
        uniqueUnits: uniqueUnits.size,
      }
    });
  } catch (error) {
    console.error('GET /admin/stats error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch stats' 
    });
  }
});

/**
 * GET /admin/missing-units
 * Get units that haven't submitted
 */
router.get('/missing-units', async (req, res) => {
  try {
    const report = await sheetsService.getMissingUnits();
    res.json({ success: true, report });
  } catch (error) {
    console.error('GET /admin/missing-units error:', error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch missing units' 
    });
  }
});

module.exports = router;

