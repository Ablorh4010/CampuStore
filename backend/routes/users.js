const express = require('express');
const { query } = require('../config/database');
const { authMiddleware } = require('../middleware/auth');

const router = express.Router();

router.get('/profile', authMiddleware, async (req, res) => {
  try {
    const result = await query(
      `SELECT id, email, full_name, university, level, field_of_study, profile_bio, linkedin_url, phone, is_verified, created_at
       FROM users WHERE id = \$1`,
      [req.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, profile_bio, university, level, field_of_study, phone, linkedin_url } = req.body;

    const result = await query(
      `UPDATE users 
       SET full_name = COALESCE(\$1, full_name),
           profile_bio = COALESCE(\$2, profile_bio),
           university = COALESCE(\$3, university),
           level = COALESCE(\$4, level),
           field_of_study = COALESCE(\$5, field_of_study),
           phone = COALESCE(\$6, phone),
           linkedin_url = COALESCE(\$7, linkedin_url),
           updated_at = NOW()
       WHERE id = \$8
       RETURNING id, email, full_name`,
      [full_name, profile_bio, university, level, field_of_study, phone, linkedin_url, req.userId]
    );

    res.json({ success: true, user: result.rows[0], message: 'Profile updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:userId', async (req, res) => {
  try {
    const result = await query(
      `SELECT id, full_name, university, level, field_of_study, profile_bio, linkedin_url, is_verified, created_at
       FROM users WHERE id = \$1`,
      [req.params.userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
