const express = require('express');
const { query } = require('../config/database');
const { adminMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/stats', adminMiddleware, async (req, res) => {
  try {
    const users = await query('SELECT COUNT(*) as count FROM users');
    const opportunities = await query('SELECT COUNT(*) as count FROM opportunities');
    const hostels = await query('SELECT COUNT(*) as count FROM hostels');

    res.json({
      success: true,
      stats: {
        users: users.rows[0].count,
        opportunities: opportunities.rows[0].count,
        hostels: hostels.rows[0].count,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
