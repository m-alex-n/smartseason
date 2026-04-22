// backend/server.js
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// Middleware for admin only
const adminOnly = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// ============ AUTH ROUTES ============
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password, role } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, hashedPassword, role || 'agent']
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      res.status(500).json({ error: error.message });
    }
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    const result = await pool.query(
      'SELECT id, username, password_hash, role FROM users WHERE username = $1',
      [username]
    );
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    res.json({
      token,
      user: { id: user.id, username: user.username, role: user.role }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============ FIELD ROUTES ============
// Get fields (admin sees all, agent sees assigned)
app.get('/api/fields', authenticateToken, async (req, res) => {
  try {
    let query;
    let params;
    
    if (req.user.role === 'admin') {
      query = `
        SELECT f.*, u.username as assigned_agent_name 
        FROM fields f
        LEFT JOIN users u ON f.assigned_agent_id = u.id
        ORDER BY f.created_at DESC
      `;
      params = [];
    } else {
      query = `
        SELECT f.*, u.username as assigned_agent_name 
        FROM fields f
        LEFT JOIN users u ON f.assigned_agent_id = u.id
        WHERE f.assigned_agent_id = $1
        ORDER BY f.created_at DESC
      `;
      params = [req.user.id];
    }
    
    const result = await pool.query(query, params);
    
    // Compute status for each field
    const fieldsWithStatus = result.rows.map(field => ({
      ...field,
      computed_status: computeFieldStatus(field)
    }));
    
    res.json(fieldsWithStatus);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create field (admin only)
app.post('/api/fields', authenticateToken, adminOnly, async (req, res) => {
  try {
    const { name, crop_type, planting_date, current_stage, assigned_agent_id } = req.body;
    
    const result = await pool.query(
      `INSERT INTO fields (name, crop_type, planting_date, current_stage, assigned_agent_id, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, crop_type, planting_date, current_stage || 'planted', assigned_agent_id, req.user.id]
    );
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Update field (agent can update assigned fields)
app.put('/api/fields/:id', authenticateToken, async (req, res) => {
  try {
    const fieldId = req.params.id;
    const { current_stage, notes } = req.body;
    
    // Check permissions
    let hasAccess = false;
    
    if (req.user.role === 'admin') {
      hasAccess = true;
    } else {
      const fieldCheck = await pool.query(
        'SELECT assigned_agent_id FROM fields WHERE id = $1',
        [fieldId]
      );
      if (fieldCheck.rows.length > 0 && fieldCheck.rows[0].assigned_agent_id === req.user.id) {
        hasAccess = true;
      }
    }
    
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    // Update field
    const updateQuery = [];  
    const params = [];
    let paramIndex = 1;
    
    if (current_stage) {
      updateQuery.push(`current_stage = $${paramIndex++}`);
      params.push(current_stage);
    }
    
    if (notes) {
      updateQuery.push(`notes = $${paramIndex++}`);
      params.push(notes);
    }
    
    if (updateQuery.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }
    
    params.push(fieldId);
    const result = await pool.query(
      `UPDATE fields SET ${updateQuery.join(', ')}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $${paramIndex} RETURNING *`,
      params
    );
    
    // Add update history
    if (notes || current_stage) {
      await pool.query(
        `INSERT INTO field_updates (field_id, updated_by, stage_change, notes)
         VALUES ($1, $2, $3, $4)`,
        [fieldId, req.user.id, current_stage || null, notes || null]
      );
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get field updates
app.get('/api/fields/:id/updates', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.*, us.username as updated_by_name
       FROM field_updates u
       JOIN users us ON u.updated_by = us.id
       WHERE u.field_id = $1
       ORDER BY u.created_at DESC`,
      [req.params.id]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all agents (for admin)
app.get('/api/agents', authenticateToken, adminOnly, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role FROM users WHERE role = $1 ORDER BY username',
      ['agent']
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get dashboard stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    let query;
    let params;
    
    if (req.user.role === 'admin') {
      query = `
        SELECT 
          COUNT(*) as total_fields,
          COUNT(CASE WHEN current_stage = 'planted' THEN 1 END) as planted,
          COUNT(CASE WHEN current_stage = 'growing' THEN 1 END) as growing,
          COUNT(CASE WHEN current_stage = 'ready' THEN 1 END) as ready,
          COUNT(CASE WHEN current_stage = 'harvested' THEN 1 END) as harvested
        FROM fields
      `;
      params = [];
    } else {
      query = `
        SELECT 
          COUNT(*) as total_fields,
          COUNT(CASE WHEN current_stage = 'planted' THEN 1 END) as planted,
          COUNT(CASE WHEN current_stage = 'growing' THEN 1 END) as growing,
          COUNT(CASE WHEN current_stage = 'ready' THEN 1 END) as ready,
          COUNT(CASE WHEN current_stage = 'harvested' THEN 1 END) as harvested
        FROM fields
        WHERE assigned_agent_id = $1
      `;
      params = [req.user.id];
    }
    
    const result = await pool.query(query, params);
    res.json(result.rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Helper function to compute field status
function computeFieldStatus(field) {
  const { current_stage, planting_date } = field;
  
  // At Risk: If planted > 30 days but still in planted stage
  if (current_stage === 'planted' && planting_date) {
    const daysSincePlanting = Math.floor((new Date() - new Date(planting_date)) / (1000 * 60 * 60 * 24));
    if (daysSincePlanting > 30) {
      return 'At Risk';
    }
  }
  
  // At Risk: If growing > 45 days
  if (current_stage === 'growing' && planting_date) {
    const daysSincePlanting = Math.floor((new Date() - new Date(planting_date)) / (1000 * 60 * 60 * 24));
    if (daysSincePlanting > 75) {
      return 'At Risk';
    }
  }
  
  // Completed: If harvested
  if (current_stage === 'harvested') {
    return 'Completed';
  }
  
  // Active: All other stages (planted, growing, ready)
  return 'Active';
}

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Export for Vercel serverless
module.exports = app;

// Only run server directly if not in Vercel
if (process.env.NODE_ENV !== 'production') {
  const PORT = process.env.PORT || 5000;
  app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
  });
}