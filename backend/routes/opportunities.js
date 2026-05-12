const express = require('express');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { sector, location, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE 1=1';
    const params = [];

    if (sector) {
      whereClause += ' AND sector = \$1';
      params.push(sector);
    }

    if (location) {
      whereClause += ` AND location ILIKE 
$$
{params.length + 1}`;
      params.push(`%${location}%`);
    }

    const result = await query(
      `SELECT id, title, company_name, sector, location, stipend, duration, deadline
       FROM opportunities ${whereClause}
       ORDER BY created_at DESC
       LIMIT
$$
{params.length + 1} OFFSET 
$$
{params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ success: true, opportunities: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM opportunities WHERE id = $1', [req.params.id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }

    res.json({ success: true, opportunity: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/save', authMiddleware, async (req, res) => {
  try {
    await query(
      'INSERT INTO saved_opportunities (user_id, opportunity_id) VALUES ($1, $2)',
      [req.userId, req.params.id]
    );
    res.json({ success: true, message: 'Saved' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
