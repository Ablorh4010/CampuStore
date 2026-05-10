const express = require('express');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { city, university, page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    let whereClause = 'WHERE is_verified = true';
    const params = [];

    if (city) {
      whereClause += ' AND city ILIKE $1';
      params.push(`%${city}%`);
    }

    if (university) {
      whereClause += ` AND university ILIKE
$$
{params.length + 1}`;
      params.push(`%${university}%`);
    }

    const result = await query(
      `SELECT id, name, city, university, price_per_year, rating, image_url
       FROM hostels ${whereClause}
       ORDER BY rating DESC
       LIMIT 
$$
{params.length + 1} OFFSET
$$
{params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({ success: true, hostels: result.rows });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await query('SELECT * FROM hostels WHERE id = \$1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Not found' });
    }
    res.json({ success: true, hostel: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.post('/:id/save', authMiddleware, async (req, res) => {
  try {
    await query(
      'INSERT INTO saved_hostels (user_id, hostel_id) VALUES (\$1, \$2)',
      [req.userId, req.params.id]
    );
    res.json({ success: true, message: 'Saved' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
