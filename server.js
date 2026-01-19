const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Database = require('@replit/database');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const multer = require('multer');
const hubspot = require('./hubspot');
const googledrive = require('./googledrive');

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
});

const app = express();
const db = new Database();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'thrive365-secret-change-in-production';

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Static file options with no-cache headers for development
const staticOptions = {
  etag: false,
  lastModified: false,
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');
  }
};

// Disable caching to prevent stale content issues
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
});

// Serve static files for the main app path (both cases)
app.use('/thrive365labsLAUNCH', express.static('public', staticOptions));
app.use('/thrive365labslaunch', express.static('public', staticOptions));
app.use(express.static('public', staticOptions));
app.use('/uploads', express.static('uploads', staticOptions));

// Serve the main app at /thrive365labsLAUNCH and /thrive365labslaunch root only
app.get('/thrive365labsLAUNCH', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
app.get('/thrive365labslaunch', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
// Note: Specific sub-routes (login, home, :slug, :slug-internal) are defined at the end of the file

// Initialize admin user on startup
(async () => {
  try {
    const users = await db.get('users') || [];
    if (!users.find(u => u.email === 'bianca@thrive365labs.com')) {
      const hashedPassword = await bcrypt.hash('Thrive2025!', 10);
      users.push({
        id: uuidv4(),
        email: 'bianca@thrive365labs.com',
        name: 'Bianca Ume',
        password: hashedPassword,
        role: 'admin',
        createdAt: new Date().toISOString()
      });
      await db.set('users', users);
      console.log('✅ Admin user created: bianca@thrive365labs.com / Thrive2025!');
    }
  } catch (err) {
    console.error('Error creating admin user:', err);
  }
})();

// Helper functions
const getUsers = async () => (await db.get('users')) || [];
const getProjects = async () => {
  const projects = (await db.get('projects')) || [];
  let needsSave = false;
  for (const project of projects) {
    if (project.hubspotDealId && !project.hubspotRecordId) {
      project.hubspotRecordId = project.hubspotDealId;
      delete project.hubspotDealId;
      needsSave = true;
    }
  }
  if (needsSave) {
    await db.set('projects', projects);
  }
  return projects;
};
// Get raw tasks for mutation - use this when you need to modify and save back
const getRawTasks = async (projectId) => {
  return (await db.get(`tasks_${projectId}`)) || [];
};

// Get normalized tasks for display - use this for read-only operations
const getTasks = async (projectId) => {
  const tasks = await getRawTasks(projectId);
  
  // Return tasks with normalized defaults for display (read-only normalization, no save)
  return tasks.map(task => ({
    ...task,
    tags: task.tags || [],
    description: task.description || '',
    subtasks: (task.subtasks || []).map(st => ({
      ...st,
      completed: st.completed !== undefined ? st.completed : false,
      notApplicable: st.notApplicable !== undefined ? st.notApplicable : false,
      status: st.status || (st.completed ? 'Completed' : (st.notApplicable ? 'N/A' : 'Pending'))
    }))
  }));
};

// Activity logging helper
const logActivity = async (userId, userName, action, entityType, entityId, details, projectId = null) => {
  try {
    const activities = (await db.get('activity_log')) || [];
    const activity = {
      id: uuidv4(),
      userId,
      userName,
      action,
      entityType,
      entityId,
      details,
      projectId,
      timestamp: new Date().toISOString()
    };
    activities.unshift(activity);
    // Keep only last 500 activities to prevent unbounded growth
    if (activities.length > 500) activities.length = 500;
    await db.set('activity_log', activities);
  } catch (err) {
    console.error('Failed to log activity:', err);
  }
};

// Generate a URL-friendly slug from client name
const generateClientSlug = (clientName, existingSlugs = []) => {
  let slug = clientName
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
  
  if (!slug) slug = 'client';
  
  let finalSlug = slug;
  let counter = 1;
  while (existingSlugs.includes(finalSlug)) {
    finalSlug = `${slug}-${counter}`;
    counter++;
  }
  return finalSlug;
};

// Load template from JSON file
async function loadTemplate() {
  try {
    const data = await fs.readFile(path.join(__dirname, 'template-biolis-au480-clia.json'), 'utf8');
    return JSON.parse(data);
  } catch (err) {
    console.error('Error loading template:', err);
    return [];
  }
}

// Auth middleware (accepts token from header or query param for downloads)
const authenticateToken = async (req, res, next) => {
  const authHeader = req.headers['authorization'];
  let token = authHeader && authHeader.split(' ')[1];
  // Also accept token from query param (for file downloads)
  if (!token && req.query.token) {
    token = req.query.token;
  }
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, JWT_SECRET, async (err, tokenUser) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    // Fetch fresh user data from database to get current role and permissions
    const users = await getUsers();
    const freshUser = users.find(u => u.id === tokenUser.id);
    if (!freshUser) return res.status(403).json({ error: 'User not found' });
    // Use fresh data for all user properties to ensure permission changes take effect immediately
    req.user = {
      id: freshUser.id,
      email: freshUser.email,
      name: freshUser.name,
      role: freshUser.role, // admin, user, client, vendor
      assignedProjects: freshUser.assignedProjects || [],
      projectAccessLevels: freshUser.projectAccessLevels || {},
      // Granular permission flags
      hasServicePortalAccess: freshUser.hasServicePortalAccess || false,
      hasAdminHubAccess: freshUser.hasAdminHubAccess || false,
      hasImplementationsAccess: freshUser.hasImplementationsAccess || false,
      hasClientPortalAdminAccess: freshUser.hasClientPortalAdminAccess || false,
      // Vendor-specific: clients they can service
      assignedClients: freshUser.assignedClients || [],
      // Client-specific fields
      isNewClient: freshUser.isNewClient || false,
      slug: freshUser.slug || null,
      practiceName: freshUser.practiceName || null
    };
    next();
  });
};

// Authorization helper to check project access
const canAccessProject = (user, projectId) => {
  if (user.role === 'admin') return true;
  if (user.role === 'client') {
    return (user.assignedProjects || []).includes(projectId);
  }
  return (user.assignedProjects || []).includes(projectId);
};

// Generate a unique slug for client users
const generateClientUserSlug = async (practiceName) => {
  const users = await getUsers();
  const existingSlugs = users.filter(u => u.slug).map(u => u.slug);
  return generateClientSlug(practiceName, existingSlugs);
};

const requireAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

// Require Admin Hub access (admins or users with hasAdminHubAccess)
const requireAdminHubAccess = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.hasAdminHubAccess) {
    return next();
  }
  return res.status(403).json({ error: 'Admin Hub access required' });
};

// Require Implementations App access
const requireImplementationsAccess = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.hasImplementationsAccess ||
      (req.user.assignedProjects && req.user.assignedProjects.length > 0)) {
    return next();
  }
  return res.status(403).json({ error: 'Implementations App access required' });
};

// Require Client Portal Admin access
const requireClientPortalAdmin = (req, res, next) => {
  if (req.user.role === 'admin' || req.user.hasClientPortalAdminAccess) {
    return next();
  }
  return res.status(403).json({ error: 'Client Portal admin access required' });
};

// ============== AUTH ROUTES ==============
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const users = await getUsers();
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    users.push({
      id: uuidv4(),
      email,
      name,
      password: hashedPassword,
      role: 'user',
      createdAt: new Date().toISOString()
    });
    await db.set('users', users);
    res.json({ message: 'Account created successfully' });
  } catch (error) {
    console.error('Signup error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin create user endpoint
app.post('/api/users', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    const {
      email, password, name, role, practiceName, isNewClient, assignedProjects, logo,
      hasServicePortalAccess, hasAdminHubAccess, hasImplementationsAccess, hasClientPortalAdminAccess,
      assignedClients, hubspotCompanyId, hubspotDealId, hubspotContactId, projectAccessLevels
    } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'Email, password, and name are required' });
    }
    const users = await getUsers();
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'User already exists with this email' });
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = {
      id: uuidv4(),
      email,
      name,
      password: hashedPassword,
      role: role || 'user', // admin, user, client, vendor
      // Permission flags
      hasServicePortalAccess: hasServicePortalAccess || false,
      hasAdminHubAccess: hasAdminHubAccess || false,
      hasImplementationsAccess: hasImplementationsAccess || false,
      hasClientPortalAdminAccess: hasClientPortalAdminAccess || false,
      createdAt: new Date().toISOString()
    };

    // Client-specific fields
    if (role === 'client') {
      if (!practiceName) {
        return res.status(400).json({ error: 'Practice name is required for client accounts' });
      }
      newUser.practiceName = practiceName;
      newUser.isNewClient = isNewClient || false;
      newUser.slug = await generateClientUserSlug(practiceName);
      newUser.assignedProjects = assignedProjects || [];
      newUser.projectAccessLevels = projectAccessLevels || {};
      if (logo) newUser.logo = logo;
      if (hubspotCompanyId) newUser.hubspotCompanyId = hubspotCompanyId;
      if (hubspotDealId) newUser.hubspotDealId = hubspotDealId;
      if (hubspotContactId) newUser.hubspotContactId = hubspotContactId;
    }

    // Vendor-specific fields
    if (role === 'vendor') {
      newUser.assignedClients = assignedClients || [];
    }

    // User/team member fields
    if (role === 'user') {
      newUser.assignedProjects = assignedProjects || [];
      newUser.projectAccessLevels = projectAccessLevels || {};
    }

    users.push(newUser);
    await db.set('users', users);
    res.json({
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      hasServicePortalAccess: newUser.hasServicePortalAccess,
      hasAdminHubAccess: newUser.hasAdminHubAccess,
      hasImplementationsAccess: newUser.hasImplementationsAccess,
      hasClientPortalAdminAccess: newUser.hasClientPortalAdminAccess,
      practiceName: newUser.practiceName,
      isNewClient: newUser.isNewClient,
      slug: newUser.slug,
      assignedProjects: newUser.assignedProjects,
      projectAccessLevels: newUser.projectAccessLevels,
      assignedClients: newUser.assignedClients,
      logo: newUser.logo || '',
      createdAt: newUser.createdAt
    });
  } catch (error) {
    console.error('Admin create user error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    const users = await getUsers();
    const user = users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    const userResponse = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      // Include permission flags for all users
      hasServicePortalAccess: user.hasServicePortalAccess || false,
      hasAdminHubAccess: user.hasAdminHubAccess || false,
      hasImplementationsAccess: user.hasImplementationsAccess || false,
      hasClientPortalAdminAccess: user.hasClientPortalAdminAccess || false,
      assignedProjects: user.assignedProjects || [],
      assignedClients: user.assignedClients || []
    };
    // Include client-specific fields
    if (user.role === 'client') {
      userResponse.practiceName = user.practiceName;
      userResponse.isNewClient = user.isNewClient;
      // Auto-generate slug if client doesn't have one
      if (!user.slug) {
        const existingSlugs = users.filter(u => u.slug).map(u => u.slug);
        const generatedSlug = generateClientSlug(user.practiceName || user.name || user.email.split('@')[0], existingSlugs);
        // Update user in database with new slug
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          users[userIndex].slug = generatedSlug;
          await db.set('users', users);
        }
        userResponse.slug = generatedSlug;
      } else {
        userResponse.slug = user.slug;
      }
    }
    // Include project access levels for team members
    if (user.role === 'user') {
      userResponse.projectAccessLevels = user.projectAccessLevels || {};
    }
    res.json({ token, user: userResponse });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Client portal login endpoint (also supports admin access to portal management)
app.post('/api/auth/client-login', async (req, res) => {
  try {
    const { email, password, slug } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    const users = await getUsers();
    // Allow both clients and admins to log into the portal
    const user = users.find(u => u.email === email && (u.role === 'client' || u.role === 'admin'));
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }
    // For clients, optionally verify slug matches if provided
    if (user.role === 'client' && slug && user.slug !== slug) {
      return res.status(400).json({ error: 'Invalid portal access' });
    }
    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name, 
        role: user.role,
        practiceName: user.practiceName,
        isNewClient: user.isNewClient,
        slug: user.role === 'admin' ? 'admin' : user.slug,
        logo: user.logo || '',
        assignedProjects: user.assignedProjects || []
      }
    });
  } catch (error) {
    console.error('Client login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== PASSWORD RESET REQUESTS (Admin-managed) ==============
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const users = await getUsers();
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.json({ message: 'Your request has been submitted. An administrator will reach out to you shortly to help reset your password.' });
    }
    
    // Store password reset request for admin to handle
    const resetRequests = await db.get('password_reset_requests') || [];
    
    // Check if there's already a pending request for this user
    const existingIdx = resetRequests.findIndex(r => r.email === email && r.status === 'pending');
    if (existingIdx !== -1) {
      return res.json({ message: 'Your request has been submitted. An administrator will reach out to you shortly to help reset your password.' });
    }
    
    resetRequests.push({
      id: uuidv4(),
      userId: user.id,
      email: user.email,
      name: user.name,
      requestedAt: new Date().toISOString(),
      status: 'pending'
    });
    await db.set('password_reset_requests', resetRequests);
    
    console.log(`Password reset requested for ${email} - Admin action required`);
    res.json({ message: 'Your request has been submitted. An administrator will reach out to you shortly to help reset your password.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get pending password reset requests (Admin only)
app.get('/api/admin/password-reset-requests', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const resetRequests = await db.get('password_reset_requests') || [];
    res.json(resetRequests.filter(r => r.status === 'pending'));
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Mark password reset request as handled (Admin only)
app.put('/api/admin/password-reset-requests/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const resetRequests = await db.get('password_reset_requests') || [];
    const idx = resetRequests.findIndex(r => r.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Request not found' });
    
    resetRequests[idx].status = status || 'completed';
    resetRequests[idx].handledAt = new Date().toISOString();
    resetRequests[idx].handledBy = req.user.email;
    await db.set('password_reset_requests', resetRequests);
    
    res.json({ message: 'Request updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get activity log (Admin only)
app.get('/api/admin/activity-log', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { limit = 100, projectId } = req.query;
    let activities = (await db.get('activity_log')) || [];
    
    // Filter by project if specified
    if (projectId) {
      activities = activities.filter(a => a.projectId === projectId);
    }
    
    // Limit results
    activities = activities.slice(0, parseInt(limit));
    
    res.json(activities);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== USER MANAGEMENT (Admin Only) ==============
app.get('/api/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await getUsers();
    const safeUsers = users.map(u => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      createdAt: u.createdAt,
      // Permission flags
      hasServicePortalAccess: u.hasServicePortalAccess || false,
      hasAdminHubAccess: u.hasAdminHubAccess || false,
      hasImplementationsAccess: u.hasImplementationsAccess || false,
      hasClientPortalAdminAccess: u.hasClientPortalAdminAccess || false,
      // Team member fields
      assignedProjects: u.assignedProjects || [],
      projectAccessLevels: u.projectAccessLevels || {},
      // Vendor-specific fields
      assignedClients: u.assignedClients || [],
      // Client-specific fields
      practiceName: u.practiceName || null,
      isNewClient: u.isNewClient || false,
      slug: u.slug || null,
      logo: u.logo || '',
      // HubSpot record IDs for client-level uploads
      hubspotCompanyId: u.hubspotCompanyId || '',
      hubspotDealId: u.hubspotDealId || '',
      hubspotContactId: u.hubspotContactId || ''
    }));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const {
      name, email, role, password, assignedProjects, projectAccessLevels,
      practiceName, isNewClient, logo, hubspotCompanyId, hubspotDealId, hubspotContactId,
      hasServicePortalAccess, hasAdminHubAccess, hasImplementationsAccess, hasClientPortalAdminAccess,
      assignedClients
    } = req.body;
    const users = await getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });

    if (name) users[idx].name = name;
    if (email) users[idx].email = email;
    if (role) users[idx].role = role;
    if (password) users[idx].password = await bcrypt.hash(password, 10);
    if (assignedProjects !== undefined) users[idx].assignedProjects = assignedProjects;
    if (projectAccessLevels !== undefined) users[idx].projectAccessLevels = projectAccessLevels;

    // Permission flags
    if (hasServicePortalAccess !== undefined) users[idx].hasServicePortalAccess = hasServicePortalAccess;
    if (hasAdminHubAccess !== undefined) users[idx].hasAdminHubAccess = hasAdminHubAccess;
    if (hasImplementationsAccess !== undefined) users[idx].hasImplementationsAccess = hasImplementationsAccess;
    if (hasClientPortalAdminAccess !== undefined) users[idx].hasClientPortalAdminAccess = hasClientPortalAdminAccess;

    // Vendor-specific: assigned clients
    if (assignedClients !== undefined) users[idx].assignedClients = assignedClients;

    // Client-specific fields
    if (practiceName !== undefined) {
      users[idx].practiceName = practiceName;
      // Regenerate slug if practice name changes and user is a client
      if (users[idx].role === 'client' && practiceName) {
        const existingSlugs = users.filter((u, i) => i !== idx && u.slug).map(u => u.slug);
        users[idx].slug = generateClientSlug(practiceName, existingSlugs);
      }
    }
    if (isNewClient !== undefined) users[idx].isNewClient = isNewClient;
    if (logo !== undefined) users[idx].logo = logo;

    // HubSpot record IDs for client-level uploads
    if (hubspotCompanyId !== undefined) users[idx].hubspotCompanyId = hubspotCompanyId;
    if (hubspotDealId !== undefined) users[idx].hubspotDealId = hubspotDealId;
    if (hubspotContactId !== undefined) users[idx].hubspotContactId = hubspotContactId;

    await db.set('users', users);
    res.json({
      id: users[idx].id,
      email: users[idx].email,
      name: users[idx].name,
      role: users[idx].role,
      hasServicePortalAccess: users[idx].hasServicePortalAccess || false,
      hasAdminHubAccess: users[idx].hasAdminHubAccess || false,
      hasImplementationsAccess: users[idx].hasImplementationsAccess || false,
      hasClientPortalAdminAccess: users[idx].hasClientPortalAdminAccess || false,
      assignedProjects: users[idx].assignedProjects || [],
      projectAccessLevels: users[idx].projectAccessLevels || {},
      assignedClients: users[idx].assignedClients || [],
      practiceName: users[idx].practiceName || null,
      isNewClient: users[idx].isNewClient || false,
      slug: users[idx].slug || null,
      logo: users[idx].logo || '',
      hubspotCompanyId: users[idx].hubspotCompanyId || '',
      hubspotDealId: users[idx].hubspotDealId || '',
      hubspotContactId: users[idx].hubspotContactId || ''
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const users = await getUsers();
    if (userId === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    const filtered = users.filter(u => u.id !== userId);
    await db.set('users', filtered);
    res.json({ message: 'User deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== TEAM MEMBERS (for owner selection) ==============
app.get('/api/team-members', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.query;
    const users = await getUsers();
    
    // If projectId is provided, filter to only users assigned to that project (or admins)
    let filteredUsers = users;
    if (projectId) {
      filteredUsers = users.filter(u => 
        u.role === 'admin' || 
        (u.assignedProjects && u.assignedProjects.includes(projectId))
      );
    }
    
    const teamMembers = filteredUsers.map(u => ({
      email: u.email,
      name: u.name,
      role: u.role
    }));
    res.json(teamMembers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== SUBTASKS ==============
app.post('/api/projects/:projectId/tasks/:taskId/subtasks', authenticateToken, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    
    // Check project access
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const { title, owner, dueDate, showToClient } = req.body;
    if (!title) return res.status(400).json({ error: 'Subtask title is required' });
    
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    const idx = tasks.findIndex(t => t.id === parseInt(taskId) || String(t.id) === String(taskId));
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    
    const subtask = {
      id: uuidv4(),
      title,
      owner: owner || '',
      dueDate: dueDate || '',
      showToClient: showToClient !== false,
      completed: false,
      createdAt: new Date().toISOString(),
      createdBy: req.user.id
    };
    
    if (!tasks[idx].subtasks) tasks[idx].subtasks = [];
    tasks[idx].subtasks.push(subtask);
    await db.set(`tasks_${projectId}`, tasks);
    
    res.json(subtask);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/projects/:projectId/tasks/:taskId/subtasks/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const { projectId, taskId, subtaskId } = req.params;
    
    // Check project access
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const { title, owner, dueDate, completed, notApplicable, showToClient } = req.body;
    
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId) || String(t.id) === String(taskId));
    if (taskIdx === -1) return res.status(404).json({ error: 'Task not found' });
    
    if (!tasks[taskIdx].subtasks) return res.status(404).json({ error: 'Subtask not found' });
    // Support both numeric and string subtask IDs for backward compatibility
    const subtaskIdx = tasks[taskIdx].subtasks.findIndex(s => String(s.id) === String(subtaskId));
    if (subtaskIdx === -1) return res.status(404).json({ error: 'Subtask not found' });
    
    if (title !== undefined) tasks[taskIdx].subtasks[subtaskIdx].title = title;
    if (owner !== undefined) tasks[taskIdx].subtasks[subtaskIdx].owner = owner;
    if (dueDate !== undefined) tasks[taskIdx].subtasks[subtaskIdx].dueDate = dueDate;
    if (completed !== undefined) tasks[taskIdx].subtasks[subtaskIdx].completed = completed;
    if (notApplicable !== undefined) tasks[taskIdx].subtasks[subtaskIdx].notApplicable = notApplicable;
    if (showToClient !== undefined) tasks[taskIdx].subtasks[subtaskIdx].showToClient = showToClient;
    
    // Also update status field for consistency
    if (completed !== undefined || notApplicable !== undefined) {
      if (notApplicable) {
        tasks[taskIdx].subtasks[subtaskIdx].status = 'N/A';
      } else if (completed) {
        tasks[taskIdx].subtasks[subtaskIdx].status = 'Complete';
        tasks[taskIdx].subtasks[subtaskIdx].completedAt = new Date().toISOString();
      } else {
        tasks[taskIdx].subtasks[subtaskIdx].status = 'Pending';
        tasks[taskIdx].subtasks[subtaskIdx].completedAt = null;
      }
    }
    
    await db.set(`tasks_${projectId}`, tasks);
    res.json(tasks[taskIdx].subtasks[subtaskIdx]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/projects/:projectId/tasks/:taskId/subtasks/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const { projectId, taskId, subtaskId } = req.params;
    
    // Check project access
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId) || String(t.id) === String(taskId));
    if (taskIdx === -1) return res.status(404).json({ error: 'Task not found' });
    
    if (!tasks[taskIdx].subtasks) return res.status(404).json({ error: 'Subtask not found' });
    // Support both numeric and string subtask IDs for backward compatibility
    tasks[taskIdx].subtasks = tasks[taskIdx].subtasks.filter(s => String(s.id) !== String(subtaskId));
    
    await db.set(`tasks_${projectId}`, tasks);
    res.json({ message: 'Subtask deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== BULK TASK UPDATES ==============
app.put('/api/projects/:projectId/tasks/bulk-update', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Check project access
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const { taskIds, completed } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({ error: 'taskIds array is required' });
    }
    if (typeof completed !== 'boolean') {
      return res.status(400).json({ error: 'completed boolean is required' });
    }
    
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    const updatedTasks = [];
    
    for (const taskId of taskIds) {
      const idx = tasks.findIndex(t => t.id === parseInt(taskId) || String(t.id) === String(taskId));
      if (idx !== -1) {
        tasks[idx].completed = completed;
        if (completed) {
          tasks[idx].dateCompleted = new Date().toISOString();
        } else {
          tasks[idx].dateCompleted = null;
        }
        updatedTasks.push(tasks[idx]);
      }
    }
    
    await db.set(`tasks_${projectId}`, tasks);
    res.json({ message: `${updatedTasks.length} tasks updated`, updatedTasks });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== BULK TASK DELETE ==============
app.post('/api/projects/:projectId/tasks/bulk-delete', authenticateToken, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    // Check project access
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const { taskIds } = req.body;
    
    if (!taskIds || !Array.isArray(taskIds)) {
      return res.status(400).json({ error: 'taskIds array is required' });
    }
    
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    const taskIdsSet = new Set(taskIds.map(id => String(id)));
    
    // Check permissions - user can only delete tasks they created (unless admin)
    const users = await db.get('users') || [];
    const user = users.find(u => u.id === req.user.id);
    const isAdmin = user && user.role === 'admin';
    
    const tasksToDelete = tasks.filter(t => taskIdsSet.has(String(t.id)));
    for (const task of tasksToDelete) {
      if (!isAdmin && task.createdBy !== req.user.id) {
        return res.status(403).json({ error: `You can only delete tasks you created. Task "${task.taskTitle}" was created by someone else.` });
      }
    }
    
    const remainingTasks = tasks.filter(t => !taskIdsSet.has(String(t.id)));
    const deletedCount = tasks.length - remainingTasks.length;
    
    await db.set(`tasks_${projectId}`, remainingTasks);
    res.json({ message: `${deletedCount} tasks deleted` });
  } catch (error) {
    console.error('Bulk delete error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== TASK NOTES ==============
app.post('/api/projects/:projectId/tasks/:taskId/notes', authenticateToken, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    
    // Check project access
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Note content is required' });
    
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    const idx = tasks.findIndex(t => t.id === parseInt(taskId) || String(t.id) === String(taskId));
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    
    const note = {
      id: uuidv4(),
      content,
      author: req.user.name,
      authorId: req.user.id,
      createdAt: new Date().toISOString()
    };
    
    if (!tasks[idx].notes) tasks[idx].notes = [];
    const noteIndex = tasks[idx].notes.length;
    tasks[idx].notes.push(note);
    await db.set(`tasks_${projectId}`, tasks);
    
    // Sync note to HubSpot (async, non-blocking) and store HubSpot ID
    const projects = await db.get('projects') || [];
    const project = projects.find(p => p.id === projectId);
    if (project && project.hubspotRecordId && hubspot.isValidRecordId(project.hubspotRecordId)) {
      const task = tasks[idx];
      hubspot.syncTaskNoteToRecord(project.hubspotRecordId, {
        taskTitle: task.taskTitle || task.clientFacingName || 'Unknown Task',
        phase: task.phase || 'N/A',
        stage: task.stage || 'N/A',
        noteContent: content,
        author: req.user.name,
        timestamp: note.createdAt,
        projectName: project.clientName || project.name || 'Unknown Project'
      }).then(async (result) => {
        // Store HubSpot note ID for future updates
        if (result && result.id) {
          try {
            const updatedTasks = await getRawTasks(projectId);
            if (updatedTasks[idx] && updatedTasks[idx].notes && updatedTasks[idx].notes[noteIndex]) {
              updatedTasks[idx].notes[noteIndex].hubspotNoteId = result.id;
              updatedTasks[idx].notes[noteIndex].hubspotSyncedAt = new Date().toISOString();
              await db.set(`tasks_${projectId}`, updatedTasks);
            }
          } catch (err) {
            console.error('Failed to save HubSpot note ID:', err.message);
          }
        }
      }).catch(err => console.error('HubSpot note sync failed:', err.message));
    }
    
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a note (author only)
app.put('/api/projects/:projectId/tasks/:taskId/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    const { projectId, taskId, noteId } = req.params;
    
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Note content is required' });
    
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId) || String(t.id) === String(taskId));
    if (taskIdx === -1) return res.status(404).json({ error: 'Task not found' });
    
    const noteIdx = (tasks[taskIdx].notes || []).findIndex(n => n.id === noteId);
    if (noteIdx === -1) return res.status(404).json({ error: 'Note not found' });
    
    const note = tasks[taskIdx].notes[noteIdx];
    
    // Only the author or an admin can edit the note
    if (note.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only edit your own notes' });
    }
    
    tasks[taskIdx].notes[noteIdx].content = content;
    tasks[taskIdx].notes[noteIdx].editedAt = new Date().toISOString();
    await db.set(`tasks_${projectId}`, tasks);
    
    // Sync updated note to HubSpot if it has a HubSpot ID
    const existingNoteId = tasks[taskIdx].notes[noteIdx].hubspotNoteId;
    if (existingNoteId) {
      const projects = await db.get('projects') || [];
      const project = projects.find(p => p.id === projectId);
      if (project && project.hubspotRecordId && hubspot.isValidRecordId(project.hubspotRecordId)) {
        const task = tasks[taskIdx];
        hubspot.syncTaskNoteToRecord(project.hubspotRecordId, {
          taskTitle: task.taskTitle || task.clientFacingName || 'Unknown Task',
          phase: task.phase || 'N/A',
          stage: task.stage || 'N/A',
          noteContent: content,
          author: note.author || req.user.name,
          timestamp: note.createdAt,
          projectName: project.clientName || project.name || 'Unknown Project'
        }, existingNoteId).catch(err => console.error('HubSpot note update failed:', err.message));
      }
    }
    
    res.json(tasks[taskIdx].notes[noteIdx]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a note (author only)
app.delete('/api/projects/:projectId/tasks/:taskId/notes/:noteId', authenticateToken, async (req, res) => {
  try {
    const { projectId, taskId, noteId } = req.params;
    
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId) || String(t.id) === String(taskId));
    if (taskIdx === -1) return res.status(404).json({ error: 'Task not found' });
    
    const noteIdx = (tasks[taskIdx].notes || []).findIndex(n => n.id === noteId);
    if (noteIdx === -1) return res.status(404).json({ error: 'Note not found' });
    
    const note = tasks[taskIdx].notes[noteIdx];
    
    // Only the author or an admin can delete the note
    if (note.authorId !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'You can only delete your own notes' });
    }
    
    tasks[taskIdx].notes.splice(noteIdx, 1);
    await db.set(`tasks_${projectId}`, tasks);
    
    res.json({ message: 'Note deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== TASK FILE ATTACHMENTS ==============
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv'
];

// Upload file to task (admin only)
app.post('/api/projects/:projectId/tasks/:taskId/files', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    
    const { projectId, taskId } = req.params;
    
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'File type not allowed. Allowed: PDF, images, Word, Excel, text files.' });
    }
    
    // Get project info for folder naming
    const projects = await getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // Get task
    const tasks = await getRawTasks(projectId);
    const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId) || String(t.id) === String(taskId));
    if (taskIdx === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    // Upload to Google Drive
    const driveResult = await googledrive.uploadTaskFile(
      project.name || project.clientName,
      project.clientName || project.name,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype
    );
    
    // Create file entry
    const fileEntry = {
      id: uuidv4(),
      name: req.file.originalname,
      driveFileId: driveResult.fileId,
      url: driveResult.webViewLink,
      downloadUrl: driveResult.webContentLink,
      thumbnailUrl: driveResult.thumbnailLink,
      mimeType: req.file.mimetype,
      size: req.file.size,
      uploadedBy: req.user.name,
      uploadedById: req.user.id,
      uploadedAt: new Date().toISOString()
    };
    
    // Initialize files array if needed
    if (!tasks[taskIdx].files) {
      tasks[taskIdx].files = [];
    }
    
    tasks[taskIdx].files.push(fileEntry);
    await db.set(`tasks_${projectId}`, tasks);
    
    res.json({ message: 'File uploaded successfully', file: fileEntry });
  } catch (error) {
    console.error('Task file upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// Delete file from task (admin only)
app.delete('/api/projects/:projectId/tasks/:taskId/files/:fileId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    
    const { projectId, taskId, fileId } = req.params;
    
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const tasks = await getRawTasks(projectId);
    const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId) || String(t.id) === String(taskId));
    if (taskIdx === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const files = tasks[taskIdx].files || [];
    const fileIdx = files.findIndex(f => f.id === fileId);
    if (fileIdx === -1) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = files[fileIdx];
    
    // Delete from Google Drive
    try {
      await googledrive.deleteFile(file.driveFileId);
    } catch (driveError) {
      console.error('Failed to delete from Drive:', driveError.message);
      // Continue with removal from task even if Drive delete fails
    }
    
    tasks[taskIdx].files.splice(fileIdx, 1);
    await db.set(`tasks_${projectId}`, tasks);
    
    res.json({ message: 'File deleted successfully' });
  } catch (error) {
    console.error('Task file delete error:', error);
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

// ============== PROJECT ROUTES ==============
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    let projects = await getProjects();
    const templates = await db.get('templates') || [];
    
    // Filter projects based on user access (admins see all, users see assigned only)
    const isAdmin = req.user.role === 'admin';
    if (!isAdmin) {
      const userAssignedProjects = req.user.assignedProjects || [];
      projects = projects.filter(p => userAssignedProjects.includes(p.id));
    }
    
    const projectsWithDetails = await Promise.all(projects.map(async (project) => {
      const template = templates.find(t => t.id === project.template);
      const tasks = await getTasks(project.id);
      
      // Calculate task completion progress
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.completed).length;
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      
      // Calculate launch duration for completed projects
      let launchDurationWeeks = null;
      if (project.status === 'completed') {
        const contractTask = tasks.find(t => 
          t.taskTitle && t.taskTitle.toLowerCase().includes('contract signed')
        );
        const goLiveTask = tasks.find(t => 
          t.taskTitle && t.taskTitle.toLowerCase().includes('first live patient samples')
        );
        
        if (contractTask?.dateCompleted && goLiveTask?.dateCompleted) {
          const contractDate = new Date(contractTask.dateCompleted);
          const goLiveDate = new Date(goLiveTask.dateCompleted);
          const diffMs = goLiveDate - contractDate;
          launchDurationWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
        }
      }
      
      // Find training/validation week dates from all tasks in Training/Validation stage
      let trainingStartDate = null;
      let trainingEndDate = null;
      let trainingStartTaskId = null;
      
      // Get all tasks in the Training/Validation stage (case-insensitive match)
      const trainingTasks = tasks.filter(t => 
        t.stage && t.stage.toLowerCase().includes('training')
      );
      
      // Find tasks with due dates and sort them
      const tasksWithDueDates = trainingTasks
        .filter(t => t.dueDate)
        .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));
      
      if (tasksWithDueDates.length > 0) {
        // Earliest due date becomes training start
        trainingStartDate = tasksWithDueDates[0].dueDate;
        trainingStartTaskId = tasksWithDueDates[0].id;
        
        // Latest due date becomes training end
        trainingEndDate = tasksWithDueDates[tasksWithDueDates.length - 1].dueDate;
      }
      
      // Find go-live task ID for calendar navigation
      const goLiveTask = tasks.find(t => 
        t.taskTitle && t.taskTitle.toLowerCase().includes('first live patient samples')
      );
      const goLiveTaskId = goLiveTask ? goLiveTask.id : null;
      
      return {
        ...project,
        templateName: template ? template.name : project.template,
        launchDurationWeeks,
        totalTasks,
        completedTasks,
        progressPercent,
        trainingStartDate,
        trainingEndDate,
        trainingStartTaskId,
        goLiveTaskId
      };
    }));
    
    res.json(projectsWithDetails);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name, clientName, projectManager, hubspotRecordId, hubspotRecordType, hubspotDealStage, template } = req.body;
    if (!name || !clientName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    const projects = await getProjects();
    const existingSlugs = projects.map(p => p.clientLinkSlug).filter(Boolean);
    const clientLinkSlug = generateClientSlug(clientName, existingSlugs);
    const newProject = {
      id: uuidv4(),
      name,
      clientName,
      projectManager: projectManager || '',
      hubspotRecordId: hubspotRecordId || '',
      hubspotRecordType: hubspotRecordType || 'companies',
      hubspotDealStage: hubspotDealStage || '',
      hubspotCompanyId: '',
      hubspotContactId: '',
      template: template || 'biolis-au480-clia',
      status: 'active',
      clientLinkId: uuidv4(),
      clientLinkSlug: clientLinkSlug,
      createdAt: new Date().toISOString(),
      createdBy: req.user.id
    };
    projects.push(newProject);
    await db.set('projects', projects);

    // Load and apply selected template (empty if none selected)
    let templateTasks = [];
    if (template) {
      const templates = await db.get('templates') || [];
      const selectedTemplate = templates.find(t => t.id === template);
      if (selectedTemplate) {
        // Normalize template tasks for the new project
        // Always reset all completion status to start fresh
        templateTasks = (selectedTemplate.tasks || []).map(task => ({
          ...task,
          // Reset any project-specific fields
          completed: false,
          dateCompleted: null,
          notes: [],
          // Reset all subtasks to pending status
          subtasks: (task.subtasks || []).map(st => ({
            ...st,
            completed: false,
            notApplicable: false,
            status: 'Pending',
            completedAt: null
          }))
        }));
      }
    }
    await db.set(`tasks_${newProject.id}`, templateTasks);

    const templates = await db.get('templates') || [];
    const templateRecord = templates.find(t => t.id === newProject.template);
    newProject.templateName = templateRecord ? templateRecord.name : newProject.template;

    res.json(newProject);
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    
    // Check project access
    if (!canAccessProject(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const templates = await db.get('templates') || [];
    const template = templates.find(t => t.id === project.template);
    project.templateName = template ? template.name : project.template;
    
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    // Check project access
    if (!canAccessProject(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const projects = await getProjects();
    const idx = projects.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });
    
    // Require Soft-Pilot Checklist before marking project as completed
    if (req.body.status === 'completed' && !projects[idx].softPilotChecklistSubmitted) {
      return res.status(400).json({ 
        error: 'The Soft-Pilot Checklist must be submitted before marking this project as completed.' 
      });
    }
    
    const allowedFields = ['name', 'clientName', 'projectManager', 'hubspotRecordId', 'hubspotRecordType', 'status', 'clientPortalDomain', 'goLiveDate'];
    
    // Check if client name is being changed - regenerate slug
    const oldClientName = projects[idx].clientName;
    const newClientName = req.body.clientName;
    
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        let value = req.body[field];
        if (field === 'goLiveDate' && value) {
          const d = new Date(value);
          if (!isNaN(d.getTime())) {
            value = d.toISOString().split('T')[0];
          } else {
            value = '';
          }
        }
        projects[idx][field] = value;
      }
    });
    
    // Regenerate clientLinkSlug when clientName changes
    if (newClientName && newClientName !== oldClientName) {
      const existingSlugs = projects
        .filter(p => p.id !== projects[idx].id)
        .map(p => p.clientLinkSlug)
        .filter(Boolean);
      projects[idx].clientLinkSlug = generateClientSlug(newClientName, existingSlugs);
    }
    
    await db.set('projects', projects);
    res.json(projects[idx]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/projects/:id', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can delete projects' });
    }
    
    const projects = await getProjects();
    const idx = projects.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });
    
    const projectId = req.params.id;
    projects.splice(idx, 1);
    await db.set('projects', projects);
    
    // Also delete the project's tasks
    await db.delete(`tasks_${projectId}`);
    
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Clone/Duplicate a project
app.post('/api/projects/:id/clone', authenticateToken, async (req, res) => {
  try {
    // Check project access
    if (!canAccessProject(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const projects = await getProjects();
    const originalProject = projects.find(p => p.id === req.params.id);
    if (!originalProject) return res.status(404).json({ error: 'Project not found' });
    
    const { name, clientName } = req.body;
    const newProjectId = uuidv4();
    const existingSlugs = projects.map(p => p.clientLinkSlug).filter(Boolean);
    
    // Use provided clientName for slug, or derive from new project name, or fallback to original + '-copy'
    const newClientName = clientName || name || `${originalProject.clientName} (Copy)`;
    
    const newProject = {
      ...originalProject,
      id: newProjectId,
      name: name || `${originalProject.name} (Copy)`,
      clientName: newClientName,
      status: 'active',
      clientLinkId: uuidv4(),
      clientLinkSlug: generateClientSlug(newClientName, existingSlugs),
      hubspotRecordId: '',
      lastHubSpotSync: null,
      createdAt: new Date().toISOString()
    };
    
    projects.push(newProject);
    await db.set('projects', projects);
    
    // Clone the tasks
    const originalTasks = await getTasks(req.params.id);
    const clonedTasks = originalTasks.map(task => ({
      ...task,
      completed: false,
      dateCompleted: '',
      notes: [],
      subtasks: (task.subtasks || []).map(st => ({
        ...st,
        completed: false,
        notApplicable: false,
        status: 'Pending',
        completedAt: null
      }))
    }));
    await db.set(`tasks_${newProjectId}`, clonedTasks);
    
    res.json(newProject);
  } catch (error) {
    console.error('Clone project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== TASK ROUTES ==============
app.get('/api/projects/:id/tasks', authenticateToken, async (req, res) => {
  try {
    // Check project access
    if (!canAccessProject(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const tasks = await getTasks(req.params.id);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/projects/:id/tasks', authenticateToken, async (req, res) => {
  try {
    // Check project access
    if (!canAccessProject(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const { taskTitle, owner, dueDate, phase, stage, showToClient, clientName, description, notes, dependencies } = req.body;
    const projectId = req.params.id;
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    const newTask = {
      id: tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) + 1 : 1,
      phase: phase || 'Phase 1',
      stage: stage || '',
      taskTitle,
      owner: owner || '',
      dueDate: dueDate || '',
      startDate: '',
      dateCompleted: '',
      duration: 0,
      completed: false,
      showToClient: showToClient || false,
      clientName: clientName || '',
      description: description || '',
      notes: notes || [],
      dependencies: dependencies || [],
      createdBy: req.user.id,
      createdAt: new Date().toISOString()
    };
    tasks.push(newTask);
    await db.set(`tasks_${projectId}`, tasks);
    res.json(newTask);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/projects/:projectId/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    
    // Check project access
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const updates = req.body;
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    const idx = tasks.findIndex(t => t.id === parseInt(taskId) || String(t.id) === String(taskId));
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    
    const task = tasks[idx];
    const isAdmin = req.user.role === 'admin';
    const isCreator = task.createdBy === req.user.id;
    const isTemplateTask = !task.createdBy;

    // Non-admins can only edit tasks they created (or template tasks for limited fields)
    if (!isAdmin) {
      // For template tasks (no createdBy), non-admins can only toggle completion and add notes
      if (isTemplateTask) {
        const allowedFields = ['completed', 'dateCompleted', 'notes'];
        Object.keys(updates).forEach(key => {
          if (!allowedFields.includes(key)) {
            delete updates[key];
          }
        });
      } else if (!isCreator) {
        // Non-admins cannot edit tasks they didn't create (except completion status)
        const allowedFields = ['completed', 'dateCompleted', 'notes'];
        Object.keys(updates).forEach(key => {
          if (!allowedFields.includes(key)) {
            delete updates[key];
          }
        });
      }
      
      // Non-admins cannot modify showToClient, clientName, or owner
      delete updates.showToClient;
      delete updates.clientName;
      delete updates.owner;
    }

    const wasCompleted = task.completed;
    
    // Server-side validation: Check for incomplete subtasks before allowing completion
    if (updates.completed && !task.completed) {
      const subtasks = task.subtasks || [];
      // Check for both new format (completed boolean) and old format (status string)
      const incompleteSubtasks = subtasks.filter(s => {
        const isComplete = s.completed || s.status === 'Complete' || s.status === 'completed';
        const isNotApplicable = s.notApplicable || s.status === 'N/A' || s.status === 'not_applicable';
        return !isComplete && !isNotApplicable;
      });
      if (incompleteSubtasks.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot complete task with pending subtasks',
          incompleteSubtasks: incompleteSubtasks.map(s => s.title)
        });
      }
    }
    
    tasks[idx] = { ...tasks[idx], ...updates };
    await db.set(`tasks_${projectId}`, tasks);
    
    // Log activity for task updates
    const actionType = !wasCompleted && tasks[idx].completed ? 'completed' : 
                       wasCompleted && !tasks[idx].completed ? 'reopened' : 'updated';
    logActivity(
      req.user.id,
      req.user.name,
      actionType,
      'task',
      taskId,
      { taskTitle: tasks[idx].taskTitle, phase: tasks[idx].phase, stage: tasks[idx].stage },
      projectId
    );
    
    if (!wasCompleted && tasks[idx].completed) {
      const completedTask = tasks[idx];
      
      // Create HubSpot task instead of logging an activity note
      createHubSpotTask(projectId, completedTask, req.user.name);
      
      // Check for stage completion and phase completion
      checkStageAndPhaseCompletion(projectId, tasks, completedTask);
    }
    
    res.json(tasks[idx]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/projects/:projectId/tasks/:taskId', authenticateToken, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    
    // Check project access
    if (!canAccessProject(req.user, projectId)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    const task = tasks.find(t => t.id === parseInt(taskId) || String(t.id) === String(taskId));
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const isAdmin = req.user.role === 'admin';
    const isCreator = task.createdBy && task.createdBy === req.user.id;
    const isTemplateTask = !task.createdBy;
    
    if (!isAdmin && (isTemplateTask || !isCreator)) {
      return res.status(403).json({ error: 'You can only delete tasks you created' });
    }
    
    const filtered = tasks.filter(t => String(t.id) !== String(taskId));
    await db.set(`tasks_${projectId}`, filtered);
    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reorder task (move up or down within same stage)
app.post('/api/projects/:projectId/tasks/:taskId/reorder', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const { direction } = req.body; // 'up' or 'down'
    
    if (!direction || !['up', 'down'].includes(direction)) {
      return res.status(400).json({ error: 'Direction must be "up" or "down"' });
    }
    
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(projectId);
    
    // Normalize task ID comparison
    const normalizeId = (id) => typeof id === 'string' ? id : String(id);
    const targetTaskId = normalizeId(taskId);
    
    const taskIndex = tasks.findIndex(t => normalizeId(t.id) === targetTaskId);
    
    if (taskIndex === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const task = tasks[taskIndex];
    
    // Get tasks in the same stage with their global indices
    const stageTasks = tasks
      .map((t, idx) => ({ task: t, globalIdx: idx, originalIdx: idx }))
      .filter(item => item.task.phase === task.phase && item.task.stage === task.stage);
    
    // Sort by existing stageOrder first (preserve user-defined ordering), fallback to array order
    stageTasks.sort((a, b) => {
      const aOrder = a.task.stageOrder !== undefined ? a.task.stageOrder : a.originalIdx + 1000;
      const bOrder = b.task.stageOrder !== undefined ? b.task.stageOrder : b.originalIdx + 1000;
      return aOrder - bOrder;
    });
    
    // Normalize stageOrder to sequential values (1, 2, 3, ...) preserving the sorted order
    stageTasks.forEach((item, idx) => {
      tasks[item.globalIdx].stageOrder = idx + 1;
    });
    
    // Now find the task's position in the sorted/normalized stage array
    const positionInStage = stageTasks.findIndex(item => normalizeId(item.task.id) === targetTaskId);
    
    if (positionInStage === -1) {
      return res.status(404).json({ error: 'Task not found in stage' });
    }
    
    // Determine swap target position
    let swapPosition;
    if (direction === 'up' && positionInStage > 0) {
      swapPosition = positionInStage - 1;
    } else if (direction === 'down' && positionInStage < stageTasks.length - 1) {
      swapPosition = positionInStage + 1;
    } else {
      return res.status(400).json({ error: 'Cannot move further in that direction', tasks });
    }
    
    // Swap stageOrder values between the two tasks
    const currentGlobalIdx = stageTasks[positionInStage].globalIdx;
    const swapGlobalIdx = stageTasks[swapPosition].globalIdx;
    
    tasks[currentGlobalIdx].stageOrder = swapPosition + 1;
    tasks[swapGlobalIdx].stageOrder = positionInStage + 1;
    
    await db.set(`tasks_${projectId}`, tasks);
    res.json({ message: 'Task reordered', tasks });
  } catch (error) {
    console.error('Reorder task error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== CLIENT VIEW (No Auth) ==============
app.get('/client/:linkId', async (req, res) => {
  res.sendFile(__dirname + '/public/client.html');
});

app.get('/api/client/:linkId', async (req, res) => {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.clientLinkSlug === req.params.linkId || p.clientLinkId === req.params.linkId);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const allTasks = await getTasks(project.id);
    const clientTasks = allTasks.filter(t => t.showToClient);
    
    const users = await getUsers();
    const tasksWithOwnerNames = clientTasks.map(task => ({
      ...task,
      ownerDisplayName: task.owner 
        ? (users.find(u => u.email === task.owner)?.name || task.owner)
        : null
    }));
    
    res.json({
      project: { 
        name: project.name, 
        clientName: project.clientName,
        goLiveDate: project.goLiveDate
      },
      tasks: tasksWithOwnerNames
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== ANNOUNCEMENTS ==============
// Get all announcements (public, no auth required for clients)
app.get('/api/announcements', async (req, res) => {
  try {
    const announcements = (await db.get('announcements')) || [];
    // Sort by date, newest first
    announcements.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.json(announcements);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create announcement (admin only)
app.post('/api/announcements', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, content, type } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    const announcements = (await db.get('announcements')) || [];
    const newAnnouncement = {
      id: uuidv4(),
      title,
      content,
      type: type || 'info', // info, warning, success
      createdAt: new Date().toISOString(),
      createdBy: req.user.name,
      createdById: req.user.id
    };
    announcements.unshift(newAnnouncement);
    // Keep only last 50 announcements
    if (announcements.length > 50) announcements.length = 50;
    await db.set('announcements', announcements);
    res.json(newAnnouncement);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update announcement (admin only)
app.put('/api/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { title, content, type } = req.body;
    const announcements = (await db.get('announcements')) || [];
    const idx = announcements.findIndex(a => a.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Announcement not found' });
    
    if (title) announcements[idx].title = title;
    if (content) announcements[idx].content = content;
    if (type) announcements[idx].type = type;
    announcements[idx].updatedAt = new Date().toISOString();
    announcements[idx].updatedBy = req.user.name;
    
    await db.set('announcements', announcements);
    res.json(announcements[idx]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete announcement (admin only)
app.delete('/api/announcements/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const announcements = (await db.get('announcements')) || [];
    const filtered = announcements.filter(a => a.id !== req.params.id);
    await db.set('announcements', filtered);
    res.json({ message: 'Announcement deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== CLIENT PORTAL API (Authenticated Clients) ==============
// Get client portal data for authenticated client
app.get('/api/client-portal/data', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'client') {
      return res.status(403).json({ error: 'Client access required' });
    }
    
    const projects = await getProjects();
    const users = await getUsers();
    const announcements = (await db.get('announcements')) || [];
    const activities = (await db.get('activity_log')) || [];
    
    // Get client's assigned projects
    const clientProjects = projects.filter(p => 
      (req.user.assignedProjects || []).includes(p.id)
    );
    
    // Get tasks for each project (only client-visible ones)
    const projectsWithTasks = await Promise.all(clientProjects.map(async (project) => {
      const allTasks = await getTasks(project.id);
      const clientTasks = allTasks.filter(t => t.showToClient).map(task => ({
        ...task,
        ownerDisplayName: task.owner 
          ? (users.find(u => u.email === task.owner)?.name || task.owner)
          : null
      }));
      return {
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        status: project.status,
        goLiveDate: project.goLiveDate,
        hubspotRecordId: project.hubspotRecordId || null,
        hubspotRecordType: project.hubspotRecordType || 'companies',
        tasks: clientTasks
      };
    }));
    
    // Filter activities to client-safe events
    // Include project-based activities (task completion, etc.)
    // AND client-specific activities (inventory, file uploads)
    const clientActivities = activities
      .filter(a => {
        // Project-based activities for assigned projects
        if ((req.user.assignedProjects || []).includes(a.projectId) &&
            ['task_completed', 'stage_completed', 'phase_completed'].includes(a.action)) {
          return true;
        }
        // Client-specific activities (by slug or userId)
        if (a.userId === req.user.id || a.details?.slug === req.user.slug) {
          if (['inventory_submitted', 'hubspot_file_upload', 'support_ticket_submitted'].includes(a.action)) {
            return true;
          }
        }
        return false;
      })
      .slice(0, 20);
    
    const clientUser = users.find(u => u.id === req.user.id);
    
    res.json({
      user: {
        name: req.user.name,
        practiceName: clientUser?.practiceName || req.user.practiceName,
        isNewClient: clientUser?.isNewClient || req.user.isNewClient,
        logo: clientUser?.logo || '',
        assignedProjects: req.user.assignedProjects || [],
        hubspotCompanyId: clientUser?.hubspotCompanyId || '',
        hubspotDealId: clientUser?.hubspotDealId || '',
        hubspotContactId: clientUser?.hubspotContactId || ''
      },
      projects: projectsWithTasks,
      announcements: announcements.slice(0, 10),
      activities: clientActivities
    });
  } catch (error) {
    console.error('Client portal data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get portal settings (admin configurable HubSpot embeds)
app.get('/api/portal-settings', async (req, res) => {
  try {
    const settings = (await db.get('portal_settings')) || {
      inventoryFormEmbed: '',
      filesFormEmbed: '',
      supportUrl: 'https://thrive365labs-49020024.hs-sites.com/support'
    };
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update portal settings (admin only)
app.put('/api/portal-settings', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { inventoryFormEmbed, filesFormEmbed, supportUrl } = req.body;
    const settings = {
      inventoryFormEmbed: inventoryFormEmbed || '',
      filesFormEmbed: filesFormEmbed || '',
      supportUrl: supportUrl || 'https://thrive365labs-49020024.hs-sites.com/support',
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.name
    };
    await db.set('portal_settings', settings);
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== CLIENT DOCUMENTS ==============
// Get documents for a specific client (by slug or for all if admin)
app.get('/api/client-documents', authenticateToken, async (req, res) => {
  try {
    const documents = (await db.get('client_documents')) || [];
    
    if (req.user.role === 'client') {
      // Clients only see documents for their slug
      const clientDocs = documents.filter(d => d.slug === req.user.slug && d.active);
      return res.json(clientDocs);
    }
    
    // Admins see all documents
    res.json(documents);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get documents for a specific slug (client portal)
app.get('/api/client-documents/:slug', async (req, res) => {
  try {
    const documents = (await db.get('client_documents')) || [];
    const clientDocs = documents.filter(d => d.slug === req.params.slug && d.active);
    res.json(clientDocs);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add a document for a client (admin only)
app.post('/api/client-documents', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { slug, title, description, url, category } = req.body;
    if (!slug || !title || !url) {
      return res.status(400).json({ error: 'Missing required fields (slug, title, url)' });
    }
    
    const documents = (await db.get('client_documents')) || [];
    const newDoc = {
      id: require('uuid').v4(),
      slug,
      title,
      description: description || '',
      url,
      category: category || 'General',
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: req.user.name
    };
    
    documents.push(newDoc);
    await db.set('client_documents', documents);
    
    // Log activity
    await logActivity(null, 'document_added', req.user.name, {
      documentTitle: title,
      clientSlug: slug
    });
    
    res.json(newDoc);
  } catch (error) {
    console.error('Add document error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update a document (admin only)
app.put('/api/client-documents/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const documents = (await db.get('client_documents')) || [];
    const idx = documents.findIndex(d => d.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Document not found' });
    }
    
    const { title, description, url, category, active } = req.body;
    documents[idx] = {
      ...documents[idx],
      title: title || documents[idx].title,
      description: description !== undefined ? description : documents[idx].description,
      url: url || documents[idx].url,
      category: category || documents[idx].category,
      active: active !== undefined ? active : documents[idx].active,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.name
    };
    
    await db.set('client_documents', documents);
    res.json(documents[idx]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete a document (admin only)
app.delete('/api/client-documents/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const documents = (await db.get('client_documents')) || [];
    const filtered = documents.filter(d => d.id !== req.params.id);
    await db.set('client_documents', filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Upload file as client document (admin only) - stores file and creates document entry
app.post('/api/client-documents/:slug/upload', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    const { title, description, category } = req.body;
    const slug = req.params.slug;
    
    // Create a unique filename
    const ext = require('path').extname(req.file.originalname);
    const uniqueName = `${uuidv4()}${ext}`;
    const uploadsDir = require('path').join(__dirname, 'uploads', 'documents');
    
    // Ensure uploads directory exists
    const fs = require('fs');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Save the file
    const filePath = require('path').join(uploadsDir, uniqueName);
    fs.writeFileSync(filePath, req.file.buffer);
    
    // Create the document entry with a URL pointing to the file
    const documents = (await db.get('client_documents')) || [];
    const newDoc = {
      id: uuidv4(),
      slug: slug,
      title: title || req.file.originalname,
      description: description || '',
      category: category || 'General',
      url: `/uploads/documents/${uniqueName}`,
      originalFilename: req.file.originalname,
      isUploadedFile: true,
      active: true,
      createdAt: new Date().toISOString(),
      createdBy: req.user.name
    };
    
    documents.push(newDoc);
    await db.set('client_documents', documents);
    
    res.json(newDoc);
  } catch (error) {
    console.error('Document upload error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== HUBSPOT FILE UPLOAD ==============
// Upload file to HubSpot and attach to a deal record (admin only)
app.post('/api/hubspot/upload-to-deal', authenticateToken, requireAdmin, upload.single('file'), async (req, res) => {
  try {
    const { dealId, noteText, category } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }
    
    if (!dealId) {
      return res.status(400).json({ error: 'Deal ID is required' });
    }
    
    const fileName = req.file.originalname;
    const fileContent = req.file.buffer.toString('base64');
    const contentType = req.file.mimetype;
    
    const customNote = noteText || `File uploaded: ${fileName}${category ? ` (Category: ${category})` : ''}`;
    const recordType = req.body.recordType || 'companies';
    
    const result = await hubspot.uploadFileAndAttachToRecord(
      dealId,
      fileContent,
      fileName,
      customNote,
      { isBase64: true, recordType: recordType }
    );
    
    const activityLog = (await db.get('activity_log')) || [];
    activityLog.unshift({
      id: uuidv4(),
      action: 'file_uploaded_hubspot',
      dealId: dealId,
      fileName: fileName,
      category: category || 'General',
      timestamp: new Date().toISOString(),
      user: req.user.name,
      details: `File "${fileName}" uploaded to HubSpot deal ${dealId}`
    });
    if (activityLog.length > 500) activityLog.length = 500;
    await db.set('activity_log', activityLog);
    
    res.json({ 
      success: true, 
      fileId: result.fileId,
      noteId: result.noteId,
      message: `File "${fileName}" uploaded and attached to deal`
    });
  } catch (error) {
    console.error('HubSpot file upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file to HubSpot' });
  }
});

// Get HubSpot deal info for file upload targeting (admin only)
app.get('/api/hubspot/deals', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const projects = await getProjects();
    const dealsWithHubSpot = projects
      .filter(p => p.hubspotRecordId)
      .map(p => ({
        projectId: p.id,
        projectName: p.name,
        clientName: p.clientName,
        hubspotRecordId: p.hubspotRecordId,
        hubspotRecordType: p.hubspotRecordType || 'companies'
      }));
    res.json(dealsWithHubSpot);
  } catch (error) {
    console.error('Error fetching HubSpot deals:', error);
    res.status(500).json({ error: 'Failed to fetch deals' });
  }
});

// ============== CLIENT HUBSPOT FILE UPLOAD ==============
// Client uploads file to their account's HubSpot records (Company, Deal, Contact)
app.post('/api/client/hubspot/upload', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    // Only clients can use this endpoint
    if (req.user.role !== 'client') {
      return res.status(403).json({ error: 'Client access required' });
    }
    
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const { noteText, category } = req.body;
    
    // Get fresh user data with HubSpot IDs
    const users = await getUsers();
    const clientUser = users.find(u => u.id === req.user.id);
    
    if (!clientUser) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const hubspotCompanyId = clientUser.hubspotCompanyId || '';
    const hubspotDealId = clientUser.hubspotDealId || '';
    const hubspotContactId = clientUser.hubspotContactId || '';
    
    // Check if at least one HubSpot ID is configured
    if (!hubspotCompanyId && !hubspotDealId && !hubspotContactId) {
      return res.status(400).json({ error: 'Your account is not linked to HubSpot. Please contact your administrator.' });
    }
    
    const fileName = req.file.originalname;
    const fileBuffer = req.file.buffer;
    
    // Convert buffer to base64
    const fileContent = fileBuffer.toString('base64');
    
    // Build note text with category
    let fullNoteText = category ? `[${category}] ` : '';
    fullNoteText += noteText || `File uploaded by ${req.user.name}`;
    
    // Upload to all configured HubSpot records
    const uploadResults = [];
    let primaryResult = null;
    
    // Upload to Company
    if (hubspotCompanyId) {
      try {
        const result = await hubspot.uploadFileAndAttachToRecord(
          hubspotCompanyId,
          fileContent,
          fileName,
          fullNoteText,
          { isBase64: true, recordType: 'companies', notePrefix: '[Client Portal]' }
        );
        uploadResults.push({ type: 'company', id: hubspotCompanyId, ...result });
        if (!primaryResult) primaryResult = result;
      } catch (err) {
        console.error('Error uploading to HubSpot Company:', err.message);
      }
    }
    
    // Upload to Deal
    if (hubspotDealId) {
      try {
        const result = await hubspot.uploadFileAndAttachToRecord(
          hubspotDealId,
          fileContent,
          fileName,
          fullNoteText,
          { isBase64: true, recordType: 'deals', notePrefix: '[Client Portal]' }
        );
        uploadResults.push({ type: 'deal', id: hubspotDealId, ...result });
        if (!primaryResult) primaryResult = result;
      } catch (err) {
        console.error('Error uploading to HubSpot Deal:', err.message);
      }
    }
    
    // Upload to Contact
    if (hubspotContactId) {
      try {
        const result = await hubspot.uploadFileAndAttachToRecord(
          hubspotContactId,
          fileContent,
          fileName,
          fullNoteText,
          { isBase64: true, recordType: 'contacts', notePrefix: '[Client Portal]' }
        );
        uploadResults.push({ type: 'contact', id: hubspotContactId, ...result });
        if (!primaryResult) primaryResult = result;
      } catch (err) {
        console.error('Error uploading to HubSpot Contact:', err.message);
      }
    }
    
    if (uploadResults.length === 0) {
      return res.status(500).json({ error: 'Failed to upload to any HubSpot records' });
    }
    
    // Save document record for visibility in both portals
    const documents = (await db.get('client_documents')) || [];
    const docId = require('uuid').v4();
    const newDoc = {
      id: docId,
      slug: req.user.slug,
      title: fileName,
      description: noteText || '',
      category: category || 'HubSpot Upload',
      active: true,
      uploadedBy: 'client',
      uploadedByName: req.user.name,
      uploadedByEmail: req.user.email,
      hubspotFileId: primaryResult.fileId,
      hubspotNoteId: primaryResult.noteId,
      hubspotFileUrl: primaryResult.fileUrl || null,
      hubspotRecords: uploadResults.map(r => ({ type: r.type, recordId: r.id })),
      createdAt: new Date().toISOString()
    };
    documents.push(newDoc);
    await db.set('client_documents', documents);
    
    // Log activity
    const activityLog = (await db.get('activity_log')) || [];
    activityLog.unshift({
      id: require('uuid').v4(),
      action: 'hubspot_file_upload',
      entityType: 'client_file',
      entityId: primaryResult.fileId,
      userId: req.user.id,
      slug: req.user.slug,
      userName: req.user.name,
      details: fileName,
      timestamp: new Date().toISOString()
    });
    if (activityLog.length > 500) activityLog.length = 500;
    await db.set('activity_log', activityLog);
    
    const recordTypes = uploadResults.map(r => r.type).join(', ');
    res.json({ 
      success: true, 
      fileId: primaryResult.fileId,
      noteId: primaryResult.noteId,
      documentId: docId,
      uploadedTo: uploadResults,
      message: `File "${fileName}" uploaded to ${recordTypes}`
    });
  } catch (error) {
    console.error('Client HubSpot file upload error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload file' });
  }
});

// ============== HUBSPOT WEBHOOKS ==============
const HUBSPOT_WEBHOOK_SECRET = process.env.HUBSPOT_WEBHOOK_SECRET;

app.post('/api/webhooks/hubspot', async (req, res) => {
  try {
    if (HUBSPOT_WEBHOOK_SECRET) {
      const providedSecret = req.headers['x-hubspot-webhook-secret'] || req.query.secret;
      if (providedSecret !== HUBSPOT_WEBHOOK_SECRET) {
        console.warn('HubSpot webhook rejected: invalid secret');
        return res.status(401).json({ error: 'Unauthorized' });
      }
    } else {
      console.warn('HubSpot webhook secret not configured - consider setting HUBSPOT_WEBHOOK_SECRET');
    }
    
    const payload = req.body;
    console.log('HubSpot webhook received');
    
    const formType = payload.formType || payload.properties?.hs_form_id || payload.formId || 'unknown';
    const submittedAt = new Date().toISOString();
    const portalId = payload.portalId || '';
    
    const activityLog = (await db.get('activity_log')) || [];
    activityLog.unshift({
      id: require('uuid').v4(),
      action: 'form_submitted',
      formType: formType,
      portalId: portalId,
      timestamp: submittedAt,
      details: `HubSpot form submission received`,
      source: 'hubspot_webhook'
    });
    
    if (activityLog.length > 500) activityLog.length = 500;
    await db.set('activity_log', activityLog);
    
    res.json({ success: true, message: 'Webhook received' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ============== INVENTORY MANAGEMENT ==============
const DEFAULT_INVENTORY_ITEMS = [
  { category: 'Ancillary Supplies', items: ['Acid Wash Solution', 'Alkaline Wash Solution'] },
  { category: 'Calibrators', items: ['BHB - L1 - Cal', 'Creatinine - L1', 'Creatinine - L2', 'Glucose - L1', 'Hemo - L1', 'HS Nitrite - L1 - Cal', 'HS Nitrite - L2 - Cal', 'HS Nitrite - L3 - Cal', 'Leukocyte Esterase - L1 - Cal', 'Leukocyte Esterase - L2 - Cal', 'Leukocyte Esterase - L3 - Cal', 'Microalbumin - L1', 'Microalbumin - L2', 'Microalbumin - L3', 'Microalbumin - L4', 'Microalbumin - L5', 'Microalbumin - L6', 'Microprotein - L1', 'pH - L1', 'pH - L2', 'SG - L1', 'SG - L2', 'Urobilinogen - L1', 'Urobilinogen - L2', 'Urobilinogen - L3', 'Urobilinogen - L4', 'Urobilinogen - L5'] },
  { category: 'Controls', items: ['A-Level - L4', 'A-Level - L5', 'A-Level - L6', 'BHB - L1', 'BHB - L2', 'Bilirubin Stock 30', 'Bilirubin Zero', 'Biorad - L1', 'Biorad - L2', 'Hemoglobin 500 - L1', 'Hemoglobin 5000 - L2', 'HS Nitrite - L1', 'HS Nitrite - L2', 'Leukocyte Esterase - L1', 'Leukocyte Esterase - L2', 'Leukocyte Esterase - L3', 'Urobilinogen - Control 1', 'Urobilinogen - Control 2'] },
  { category: 'Reagent', items: ['BHB - R1', 'BHB - R2', 'Bilirubin - R1', 'Bilirubin - R2', 'Creatinine - R1', 'Creatinine - R2', 'Glucose - R1', 'Hemoglobin - R1', 'HS Nitrite - R1', 'HS Nitrite - R2', 'Leukocyte Esterase - R1', 'Leukocyte Esterase - R2', 'Microalbumin - R1', 'Microalbumin - R2', 'Microprotein - R1', 'pH - R1', 'SG - R1', 'Urobilinogen - R1', 'Urobilinogen - R2'] }
];

app.get('/api/inventory/custom-items/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    if (req.user.role === 'client' && req.user.slug !== slug) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const customItems = (await db.get(`inventory_custom_${slug}`)) || [];
    res.json(customItems);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/inventory/custom-items/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    if (req.user.role === 'client' && req.user.slug !== slug) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const { category, itemName } = req.body;
    if (!category || !itemName) {
      return res.status(400).json({ error: 'Category and item name required' });
    }
    const customItems = (await db.get(`inventory_custom_${slug}`)) || [];
    const newItem = { id: uuidv4(), category, itemName, createdAt: new Date().toISOString() };
    customItems.push(newItem);
    await db.set(`inventory_custom_${slug}`, customItems);
    res.json(newItem);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/inventory/custom-items/:slug/:itemId', authenticateToken, async (req, res) => {
  try {
    const { slug, itemId } = req.params;
    if (req.user.role === 'client' && req.user.slug !== slug) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const customItems = (await db.get(`inventory_custom_${slug}`)) || [];
    const filtered = customItems.filter(i => i.id !== itemId);
    await db.set(`inventory_custom_${slug}`, filtered);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/inventory/template', async (req, res) => {
  try {
    const template = (await db.get('inventory_template')) || DEFAULT_INVENTORY_ITEMS;
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/inventory/template', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { template } = req.body;
    await db.set('inventory_template', template);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/inventory/submissions/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    if (req.user.role === 'client' && req.user.slug !== slug) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const allSubmissions = (await db.get('inventory_submissions')) || [];
    const clientSubmissions = allSubmissions.filter(s => s.slug === slug);
    res.json(clientSubmissions);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Export inventory submission as CSV (client-specific)
app.get('/api/inventory/export/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    const { submissionId } = req.query;
    
    if (req.user.role === 'client' && req.user.slug !== slug) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const allSubmissions = (await db.get('inventory_submissions')) || [];
    const clientSubmissions = allSubmissions
      .filter(s => s.slug === slug)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    let dataToExport;
    if (submissionId) {
      const submission = clientSubmissions.find(s => s.id === submissionId);
      if (!submission) return res.status(404).json({ error: 'Submission not found' });
      dataToExport = [submission];
    } else {
      dataToExport = clientSubmissions;
    }
    
    // Build CSV
    const headers = ['Submission Date', 'Submitted By', 'Category', 'Item', 'Lot Number', 'Expiry Date', 'Open Qty', 'Open Date', 'Closed Qty', 'Notes'];
    let csv = headers.join(',') + '\n';
    
    dataToExport.forEach(sub => {
      Object.entries(sub.data || {}).forEach(([key, value]) => {
        const [category, itemName] = key.split('|');
        const batches = Array.isArray(value?.batches) ? value.batches : [value || {}];
        batches.forEach(batch => {
          const row = [
            `"${new Date(sub.submittedAt).toLocaleString()}"`,
            `"${sub.submittedBy || ''}"`,
            `"${category}"`,
            `"${itemName}"`,
            `"${batch.lotNumber || ''}"`,
            `"${batch.expiry || ''}"`,
            batch.openQty || 0,
            `"${batch.openDate || ''}"`,
            batch.closedQty || 0,
            `"${(batch.notes || '').replace(/"/g, '""')}"`
          ];
          csv += row.join(',') + '\n';
        });
      });
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="inventory_${slug}_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: Export all clients inventory data
app.get('/api/inventory/export-all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const allSubmissions = (await db.get('inventory_submissions')) || [];
    const users = await getUsers();
    const clientUsers = users.filter(u => u.role === 'client');
    
    // Get client names mapping
    const clientNames = {};
    clientUsers.forEach(u => { clientNames[u.slug] = u.practiceName || u.name || u.slug; });
    
    // Build CSV with client info
    const headers = ['Client', 'Submission Date', 'Submitted By', 'Category', 'Item', 'Lot Number', 'Expiry Date', 'Open Qty', 'Open Date', 'Closed Qty', 'Notes'];
    let csv = headers.join(',') + '\n';
    
    // Sort by date descending
    allSubmissions.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    allSubmissions.forEach(sub => {
      const clientName = clientNames[sub.slug] || sub.slug;
      Object.entries(sub.data || {}).forEach(([key, value]) => {
        const [category, itemName] = key.split('|');
        const batches = Array.isArray(value?.batches) ? value.batches : [value || {}];
        batches.forEach(batch => {
          const row = [
            `"${clientName}"`,
            `"${new Date(sub.submittedAt).toLocaleString()}"`,
            `"${sub.submittedBy || ''}"`,
            `"${category}"`,
            `"${itemName}"`,
            `"${batch.lotNumber || ''}"`,
            `"${batch.expiry || ''}"`,
            batch.openQty || 0,
            `"${batch.openDate || ''}"`,
            batch.closedQty || 0,
            `"${(batch.notes || '').replace(/"/g, '""')}"`
          ];
          csv += row.join(',') + '\n';
        });
      });
    });
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="all_inventory_${new Date().toISOString().split('T')[0]}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export all error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

const normalizeInventoryData = (data) => {
  const normalized = {};
  Object.entries(data || {}).forEach(([key, value]) => {
    if (value && value.batches) {
      normalized[key] = value;
    } else {
      normalized[key] = { batches: [value || {}] };
    }
  });
  return normalized;
};

app.get('/api/inventory/latest/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    if (req.user.role === 'client' && req.user.slug !== slug) {
      return res.status(403).json({ error: 'Access denied' });
    }
    const allSubmissions = (await db.get('inventory_submissions')) || [];
    const clientSubmissions = allSubmissions
      .filter(s => s.slug === slug)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
    
    if (clientSubmissions.length === 0) {
      const template = (await db.get('inventory_template')) || DEFAULT_INVENTORY_ITEMS;
      const emptyData = {};
      template.forEach(cat => {
        cat.items.forEach(item => {
          emptyData[`${cat.category}|${item}`] = { batches: [{ lotNumber: '', expiry: '', openQty: '', openDate: '', closedQty: '', notes: '' }] };
        });
      });
      return res.json({ data: emptyData, submittedAt: null });
    }
    
    const latest = clientSubmissions[0];
    res.json({ ...latest, data: normalizeInventoryData(latest.data) });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/inventory/submit', authenticateToken, async (req, res) => {
  try {
    const { slug, data } = req.body;
    
    if (req.user.role === 'client' && req.user.slug !== slug) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const submission = {
      id: require('uuid').v4(),
      slug,
      data,
      submittedAt: new Date().toISOString(),
      submittedBy: req.user.name || req.user.email
    };
    
    const allSubmissions = (await db.get('inventory_submissions')) || [];
    allSubmissions.unshift(submission);
    
    if (allSubmissions.length > 1000) allSubmissions.length = 1000;
    await db.set('inventory_submissions', allSubmissions);
    
    await logActivity(
      req.user.id || null,
      req.user.name || req.user.email,
      'inventory_submitted',
      'inventory',
      submission.id,
      { slug, itemCount: Object.keys(data).length }
    );
    
    res.json({ success: true, submission });
  } catch (error) {
    console.error('Inventory submit error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/inventory/report/:slug', authenticateToken, async (req, res) => {
  try {
    const { slug } = req.params;
    if (req.user.role === 'client' && req.user.slug !== slug) {
      return res.status(403).json({ error: 'Access denied' });
    }
    
    const allSubmissions = (await db.get('inventory_submissions')) || [];
    const clientSubmissions = allSubmissions
      .filter(s => s.slug === slug)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
      .slice(0, 52);
    
    const template = (await db.get('inventory_template')) || DEFAULT_INVENTORY_ITEMS;
    const customItems = (await db.get(`inventory_custom_${slug}`)) || [];
    
    const lowStockItems = [];
    const expiringItems = [];
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    if (clientSubmissions.length > 0) {
      const latest = clientSubmissions[0].data;
      Object.entries(latest).forEach(([key, value]) => {
        const [category, itemName] = key.split('|');
        
        const batches = Array.isArray(value.batches) ? value.batches : [value];
        
        batches.forEach((batch, batchIdx) => {
          const totalQty = (parseInt(batch.openQty) || 0) + (parseInt(batch.closedQty) || 0);
          const lotLabel = batch.lotNumber ? ` (Lot: ${batch.lotNumber})` : (batches.length > 1 ? ` (Batch ${batchIdx + 1})` : '');
          
          if (totalQty > 0 && totalQty <= 2) {
            lowStockItems.push({ category, itemName: itemName + lotLabel, quantity: totalQty, lotNumber: batch.lotNumber });
          }
          
          if (batch.expiry) {
            const expiryDate = new Date(batch.expiry);
            if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
              expiringItems.push({ 
                category, 
                itemName: itemName + lotLabel, 
                expiry: batch.expiry, 
                lotNumber: batch.lotNumber,
                daysUntilExpiry: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24)) 
              });
            }
          }
        });
      });
    }
    
    const getItemTotal = (data, key) => {
      const value = data[key];
      if (!value) return 0;
      const batches = Array.isArray(value.batches) ? value.batches : [value];
      return batches.reduce((sum, b) => sum + (parseInt(b.openQty) || 0) + (parseInt(b.closedQty) || 0), 0);
    };
    
    const itemUsage = {};
    if (clientSubmissions.length >= 2) {
      const current = clientSubmissions[0].data;
      const previous = clientSubmissions[1].data;
      const allKeys = new Set([...Object.keys(current), ...Object.keys(previous)]);
      
      allKeys.forEach(key => {
        const currentQty = getItemTotal(current, key);
        const prevQty = getItemTotal(previous, key);
        const change = currentQty - prevQty;
        const [category, itemName] = key.split('|');
        if (prevQty > 0 || currentQty > 0) {
          itemUsage[key] = { category, itemName, currentQty, prevQty, change, 
            trend: change > 0 ? 'up' : change < 0 ? 'down' : 'stable' };
        }
      });
    }
    
    const usageSummary = clientSubmissions.slice(0, 8).reverse().map(sub => {
      let totalQty = 0;
      Object.values(sub.data).forEach(v => {
        const batches = Array.isArray(v?.batches) ? v.batches : [v || {}];
        totalQty += batches.reduce((s, b) => s + (parseInt(b.openQty) || 0) + (parseInt(b.closedQty) || 0), 0);
      });
      return { date: sub.submittedAt, totalQuantity: totalQty, itemCount: Object.keys(sub.data).length };
    });
    
    // Build per-item time series for charting individual items
    const itemTimeSeries = {};
    const recentSubs = clientSubmissions.slice(0, 12).reverse();
    recentSubs.forEach(sub => {
      Object.entries(sub.data || {}).forEach(([key, val]) => {
        const [category, itemName] = key.split('|');
        if (!itemTimeSeries[key]) {
          itemTimeSeries[key] = { category, itemName, dataPoints: [] };
        }
        const batches = Array.isArray(val?.batches) ? val.batches : [val || {}];
        const qty = batches.reduce((s, b) => s + (parseInt(b.openQty) || 0) + (parseInt(b.closedQty) || 0), 0);
        itemTimeSeries[key].dataPoints.push({ date: sub.submittedAt, quantity: qty });
      });
    });
    // Convert to array and sort by category/name
    const itemTimeSeriesArray = Object.entries(itemTimeSeries)
      .map(([key, val]) => ({ key, ...val }))
      .sort((a, b) => a.category.localeCompare(b.category) || a.itemName.localeCompare(b.itemName));
    
    const consumptionRate = [];
    const submissionsToAnalyze = clientSubmissions.slice(0, 12);
    
    if (submissionsToAnalyze.length >= 2) {
      const itemConsumption = {};
      
      for (let i = 0; i < submissionsToAnalyze.length - 1; i++) {
        const newer = submissionsToAnalyze[i];
        const older = submissionsToAnalyze[i + 1];
        const daysBetween = Math.max(1, Math.ceil((new Date(newer.submittedAt) - new Date(older.submittedAt)) / (1000 * 60 * 60 * 24)));
        
        const allKeys = new Set([...Object.keys(newer.data || {}), ...Object.keys(older.data || {})]);
        allKeys.forEach(key => {
          const newerQty = getItemTotal(newer.data, key);
          const olderQty = getItemTotal(older.data, key);
          const consumed = olderQty - newerQty;
          
          if (consumed > 0) {
            if (!itemConsumption[key]) {
              const [category, itemName] = key.split('|');
              itemConsumption[key] = { category, itemName, totalConsumed: 0, totalDays: 0, dataPoints: 0 };
            }
            itemConsumption[key].totalConsumed += consumed;
            itemConsumption[key].totalDays += daysBetween;
            itemConsumption[key].dataPoints += 1;
          }
        });
      }
      
      Object.entries(itemConsumption)
        .filter(([_, v]) => v.totalConsumed > 0 && v.totalDays > 0)
        .map(([key, v]) => {
          const avgWeeklyRate = (v.totalConsumed / v.totalDays) * 7;
          const currentQty = getItemTotal(submissionsToAnalyze[0].data, key);
          const weeksRemaining = avgWeeklyRate > 0 && currentQty > 0 ? Math.ceil(currentQty / avgWeeklyRate) : 0;
          return { 
            ...v, 
            currentQty,
            weeklyRate: avgWeeklyRate.toFixed(1), 
            weeksRemaining,
            avgWeeklyRate
          };
        })
        .sort((a, b) => b.avgWeeklyRate - a.avgWeeklyRate)
        .slice(0, 10)
        .forEach(item => consumptionRate.push(item));
    }
    
    res.json({
      submissions: clientSubmissions.slice(0, 12),
      template,
      customItems,
      alerts: {
        lowStock: lowStockItems.sort((a, b) => a.quantity - b.quantity),
        expiringSoon: expiringItems.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      },
      usageTrends: { itemChanges: Object.values(itemUsage), usageSummary, consumptionRate, itemTimeSeries: itemTimeSeriesArray }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== ADMIN AGGREGATE INVENTORY REPORT ==============
app.get('/api/inventory/report-all', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const allSubmissions = (await db.get('inventory_submissions')) || [];
    const users = await getUsers();
    const clientUsers = users.filter(u => u.role === 'client');
    
    // Group submissions by slug (client)
    const submissionsBySlug = {};
    allSubmissions.forEach(sub => {
      if (!submissionsBySlug[sub.slug]) {
        submissionsBySlug[sub.slug] = [];
      }
      submissionsBySlug[sub.slug].push(sub);
    });
    
    // Sort each client's submissions and keep recent ones
    Object.keys(submissionsBySlug).forEach(slug => {
      submissionsBySlug[slug].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
      submissionsBySlug[slug] = submissionsBySlug[slug].slice(0, 12);
    });
    
    const today = new Date();
    const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    
    // Aggregate data across all clients
    const allLowStock = [];
    const allExpiring = [];
    const clientSummaries = [];
    
    const getItemTotal = (data, key) => {
      const value = data[key];
      if (!value) return 0;
      const batches = Array.isArray(value.batches) ? value.batches : [value];
      return batches.reduce((sum, b) => sum + (parseInt(b.openQty) || 0) + (parseInt(b.closedQty) || 0), 0);
    };
    
    Object.entries(submissionsBySlug).forEach(([slug, submissions]) => {
      if (submissions.length === 0) return;
      
      const clientUser = clientUsers.find(u => u.slug === slug);
      const clientName = clientUser?.practiceName || clientUser?.name || slug;
      
      const latest = submissions[0];
      let totalItems = 0;
      let totalQuantity = 0;
      let lowStockCount = 0;
      let expiringCount = 0;
      
      Object.entries(latest.data || {}).forEach(([key, value]) => {
        const [category, itemName] = key.split('|');
        const batches = Array.isArray(value.batches) ? value.batches : [value];
        
        batches.forEach((batch, batchIdx) => {
          const qty = (parseInt(batch.openQty) || 0) + (parseInt(batch.closedQty) || 0);
          totalQuantity += qty;
          totalItems++;
          
          const lotLabel = batch.lotNumber ? ` (Lot: ${batch.lotNumber})` : '';
          
          if (qty > 0 && qty <= 2) {
            lowStockCount++;
            allLowStock.push({ 
              clientName, 
              slug, 
              category, 
              itemName: itemName + lotLabel, 
              quantity: qty 
            });
          }
          
          if (batch.expiry) {
            const expiryDate = new Date(batch.expiry);
            if (expiryDate <= thirtyDaysFromNow && expiryDate >= today) {
              expiringCount++;
              allExpiring.push({ 
                clientName, 
                slug, 
                category, 
                itemName: itemName + lotLabel, 
                expiry: batch.expiry,
                daysUntilExpiry: Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24))
              });
            }
          }
        });
      });
      
      clientSummaries.push({
        slug,
        clientName,
        lastSubmission: latest.submittedAt,
        totalItems,
        totalQuantity,
        lowStockCount,
        expiringCount,
        submissionCount: submissions.length
      });
    });
    
    // Calculate submission frequency stats
    const activeClients = clientSummaries.filter(c => c.submissionCount > 0).length;
    const totalClients = clientUsers.length;
    
    // Get clients who haven't submitted in over 7 days
    const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const inactiveClients = clientSummaries.filter(c => 
      new Date(c.lastSubmission) < sevenDaysAgo
    );
    
    res.json({
      summary: {
        totalClients,
        activeClients,
        totalLowStockAlerts: allLowStock.length,
        totalExpiringAlerts: allExpiring.length
      },
      alerts: {
        lowStock: allLowStock.sort((a, b) => a.quantity - b.quantity),
        expiringSoon: allExpiring.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry)
      },
      clientSummaries: clientSummaries.sort((a, b) => new Date(b.lastSubmission) - new Date(a.lastSubmission)),
      inactiveClients: inactiveClients.sort((a, b) => new Date(a.lastSubmission) - new Date(b.lastSubmission))
    });
  } catch (error) {
    console.error('Admin inventory report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== HUBSPOT INTEGRATION ==============
app.get('/api/hubspot/test', authenticateToken, async (req, res) => {
  try {
    const result = await hubspot.testConnection();
    res.json(result);
  } catch (error) {
    res.status(500).json({ connected: false, error: error.message });
  }
});

app.get('/api/hubspot/pipelines', authenticateToken, async (req, res) => {
  try {
    const pipelines = await hubspot.getPipelines();
    res.json(pipelines);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/hubspot/record/:recordId', authenticateToken, async (req, res) => {
  try {
    const deal = await hubspot.getRecord(req.params.recordId);
    res.json(deal);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/hubspot/stage-mapping', authenticateToken, async (req, res) => {
  try {
    const mapping = await db.get('hubspot_stage_mapping') || {};
    res.json(mapping);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/hubspot/stage-mapping', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { mapping, pipelineId } = req.body;
    await db.set('hubspot_stage_mapping', { pipelineId, phases: mapping });
    res.json({ message: 'Stage mapping saved' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== SOFT-PILOT CHECKLIST ==============
app.post('/api/projects/:id/soft-pilot-checklist', authenticateToken, async (req, res) => {
  try {
    // Check project access
    if (!canAccessProject(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const { signature, checklistHtml, projectName, isResubmission } = req.body;
    
    if (!signature || !signature.name?.trim() || !signature.title?.trim() || !signature.date?.trim()) {
      return res.status(400).json({ error: 'Name, title, and date are required in signature' });
    }
    
    if (!checklistHtml || typeof checklistHtml !== 'string' || checklistHtml.length < 100) {
      return res.status(400).json({ error: 'Invalid checklist content' });
    }
    
    const projects = await db.get('projects') || [];
    const project = projects.find(p => p.id === req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const submissionCount = (project.softPilotChecklistSubmitted?.submissionCount || 0) + 1;
    let driveResult = null;
    let hubspotNoteId = null;
    
    // Upload to Google Drive
    try {
      driveResult = await googledrive.uploadSoftPilotChecklist(
        projectName || project.name,
        project.clientName,
        checklistHtml
      );
      console.log('✅ Checklist uploaded to Google Drive:', driveResult.webViewLink);
    } catch (driveError) {
      console.error('Google Drive upload failed:', driveError.message);
    }
    
    // Log note to HubSpot if project has a HubSpot Record ID
    if (project.hubspotRecordId) {
      try {
        const noteDetails = isResubmission
          ? `REVISED Soft-Pilot Checklist (Version ${submissionCount})\n\nUpdated by: ${signature.name}\nTitle: ${signature.title}\nDate: ${signature.date}\n\nThis is an updated version replacing the previous submission.`
          : `Soft-Pilot Checklist Submitted\n\nSigned by: ${signature.name}\nTitle: ${signature.title}\nDate: ${signature.date}`;
        
        const fullNote = driveResult 
          ? `${noteDetails}\n\nGoogle Drive Link: ${driveResult.webViewLink}`
          : noteDetails;
        
        await hubspot.logRecordActivity(
          project.hubspotRecordId,
          isResubmission ? 'Soft-Pilot Checklist Updated' : 'Soft-Pilot Checklist Submitted',
          fullNote
        );
        console.log('✅ HubSpot note created for checklist submission');
      } catch (hubspotError) {
        console.error('HubSpot note creation failed:', hubspotError.message);
      }
    }
    
    project.softPilotChecklistSubmitted = {
      submittedAt: new Date().toISOString(),
      submittedBy: req.user.email,
      signature,
      submissionCount,
      isRevision: isResubmission || false,
      driveLink: driveResult?.webViewLink || null
    };
    await db.set('projects', projects);
    
    res.json({ 
      message: isResubmission 
        ? 'Soft-pilot checklist updated and saved to Google Drive' 
        : 'Soft-pilot checklist submitted and uploaded to Google Drive',
      driveLink: driveResult?.webViewLink,
      submissionCount
    });
  } catch (error) {
    console.error('Error submitting soft-pilot checklist:', error);
    res.status(500).json({ error: error.message || 'Failed to upload checklist' });
  }
});

// Manual HubSpot sync for projects where record ID was added after creation
app.post('/api/projects/:id/hubspot-sync', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only admins can trigger manual sync' });
    }
    
    const projects = await getProjects();
    const project = projects.find(p => p.id === req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (!project.hubspotRecordId || !hubspot.isValidRecordId(project.hubspotRecordId)) {
      return res.status(400).json({ error: 'Project does not have a valid HubSpot Record ID configured. The ID should be a numeric value.' });
    }
    
    // Use raw tasks for mutation to prevent normalization drift
    let tasks = await getRawTasks(project.id);
    const completedTasks = tasks.filter(t => t.completed);
    
    // Collect all notes from all tasks with their task reference
    const allNotes = [];
    for (const task of tasks) {
      if (task.notes && Array.isArray(task.notes)) {
        for (let i = 0; i < task.notes.length; i++) {
          const note = task.notes[i];
          allNotes.push({
            ...note,
            taskId: task.id,
            noteIndex: i,
            taskTitle: task.taskTitle,
            phase: task.phase,
            stage: task.stage
          });
        }
      }
    }
    
    const hasTasksToSync = completedTasks.length > 0;
    const hasNotesToSync = allNotes.length > 0;
    
    if (!hasTasksToSync && !hasNotesToSync) {
      return res.json({ message: 'No completed tasks or notes to sync', syncedTasks: 0, syncedNotes: 0 });
    }
    
    let syncedTaskCount = 0;
    let updatedTaskCount = 0;
    let skippedTaskCount = 0;
    let syncedNoteCount = 0;
    let updatedNoteCount = 0;
    let skippedNotes = 0;
    let tasksModified = false;
    
    // Sync each completed task
    for (const task of completedTasks) {
      try {
        // Check if task already has a HubSpot ID
        const existingTaskId = task.hubspotTaskId;
        
        // Build task subject and body
        const taskSubject = `[Project Tracker] ${task.taskTitle}`;
        let taskBody = `Phase: ${task.phase}`;
        if (task.stage) {
          taskBody += `\nStage: ${task.stage}`;
        }
        taskBody += `\nCompleted by: Manual Sync`;
        taskBody += `\nCompleted: ${task.dateCompleted || new Date().toISOString()}`;
        
        if (task.notes && task.notes.length > 0) {
          taskBody += `\n\n--- Task Notes ---`;
          task.notes.forEach(note => {
            const noteDate = new Date(note.createdAt || note.timestamp);
            const noteText = note.text || note.content || note.body || '';
            taskBody += `\n[${note.author || note.createdBy || 'Unknown'} - ${noteDate.toLocaleDateString()} ${noteDate.toLocaleTimeString()}]: ${noteText}`;
          });
        }
        
        // Get owner ID if available
        let ownerId = null;
        if (task.owner) {
          const ownerValue = task.owner.trim();
          if (ownerValue.includes('@')) {
            ownerId = await hubspot.findOwnerByEmail(ownerValue);
          } else {
            const nameParts = ownerValue.split(/\s+/);
            if (nameParts.length >= 2) {
              ownerId = await hubspot.findOwnerByName(nameParts[0], nameParts.slice(1).join(' '));
            }
          }
        }
        
        const result = await hubspot.createOrUpdateTask(
          project.hubspotRecordId,
          taskSubject,
          taskBody,
          ownerId,
          existingTaskId
        );
        
        // Store the HubSpot task ID if newly created
        if (result && result.id && !existingTaskId) {
          const taskIdx = tasks.findIndex(t => t.id === task.id);
          if (taskIdx !== -1) {
            tasks[taskIdx].hubspotTaskId = result.id;
            tasks[taskIdx].hubspotSyncedAt = new Date().toISOString();
            tasksModified = true;
          }
          syncedTaskCount++;
        } else if (result && result.updated) {
          updatedTaskCount++;
        }
      } catch (err) {
        console.error(`Failed to sync task ${task.id}:`, err.message);
      }
    }
    
    // Sync all notes
    for (const note of allNotes) {
      try {
        const noteText = note.text || note.content || note.body || note.noteContent || '';
        if (!noteText) {
          console.log(`Skipping note with empty content for task "${note.taskTitle}" (note id: ${note.id || 'unknown'})`);
          skippedNotes++;
          continue;
        }
        
        // Check if note already has a HubSpot ID
        const existingNoteId = note.hubspotNoteId;
        
        const result = await hubspot.syncTaskNoteToRecord(
          project.hubspotRecordId,
          {
            taskTitle: note.taskTitle,
            phase: note.phase,
            stage: note.stage,
            noteContent: noteText,
            author: note.author || note.createdBy || 'Unknown',
            timestamp: note.createdAt || note.timestamp || new Date().toISOString(),
            projectName: project.name
          },
          existingNoteId
        );
        
        // Store the HubSpot note ID if newly created
        if (result && result.id && !existingNoteId) {
          const taskIdx = tasks.findIndex(t => t.id === note.taskId);
          if (taskIdx !== -1 && tasks[taskIdx].notes && tasks[taskIdx].notes[note.noteIndex]) {
            tasks[taskIdx].notes[note.noteIndex].hubspotNoteId = result.id;
            tasks[taskIdx].notes[note.noteIndex].hubspotSyncedAt = new Date().toISOString();
            tasksModified = true;
          }
          syncedNoteCount++;
        } else if (result && result.updated) {
          updatedNoteCount++;
        }
      } catch (err) {
        console.error(`Failed to sync note:`, err.message);
      }
    }
    
    // Save updated tasks with HubSpot IDs
    if (tasksModified) {
      await db.set(`tasks_${project.id}`, tasks);
    }
    
    // Update project with sync timestamp
    const projectIdx = projects.findIndex(p => p.id === project.id);
    if (projectIdx !== -1) {
      projects[projectIdx].lastHubSpotSync = new Date().toISOString();
      await db.set('projects', projects);
    }
    
    // Build summary message
    let messageParts = [];
    if (syncedTaskCount > 0) messageParts.push(`${syncedTaskCount} new tasks`);
    if (updatedTaskCount > 0) messageParts.push(`${updatedTaskCount} updated tasks`);
    if (syncedNoteCount > 0) messageParts.push(`${syncedNoteCount} new notes`);
    if (updatedNoteCount > 0) messageParts.push(`${updatedNoteCount} updated notes`);
    
    let message = messageParts.length > 0 
      ? `Successfully synced to HubSpot: ${messageParts.join(', ')}`
      : 'All items already synced to HubSpot';
    
    if (skippedNotes > 0) {
      message += ` (${skippedNotes} notes skipped due to empty content)`;
    }
    
    res.json({ 
      message,
      syncedTasks: syncedTaskCount,
      updatedTasks: updatedTaskCount,
      totalTasks: completedTasks.length,
      syncedNotes: syncedNoteCount,
      updatedNotes: updatedNoteCount,
      totalNotes: allNotes.length,
      skippedNotes
    });
  } catch (error) {
    console.error('Manual HubSpot sync error:', error);
    res.status(500).json({ error: 'Failed to sync to HubSpot' });
  }
});

// ============== DATE NORMALIZATION ==============
const normalizeDate = (dateStr) => {
  if (!dateStr || typeof dateStr !== 'string') return '';
  dateStr = dateStr.trim();
  if (!dateStr) return '';
  
  // Already in YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  
  // Handle MM/DD/YYYY or M/D/YYYY or MM/DD/YY or M/D/YY
  const slashMatch = dateStr.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slashMatch) {
    let [, month, day, year] = slashMatch;
    month = month.padStart(2, '0');
    day = day.padStart(2, '0');
    if (year.length === 2) {
      year = parseInt(year) > 50 ? '19' + year : '20' + year;
    }
    return `${year}-${month}-${day}`;
  }
  
  // Return as-is if format not recognized
  return dateStr;
};

// ============== FIX CLIENT NAMES (Admin utility) ==============
app.post('/api/projects/:id/fix-client-names', authenticateToken, requireAdmin, async (req, res) => {
  try {
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(req.params.id);
    let fixedCount = 0;
    
    tasks.forEach(task => {
      if (task.showToClient && (!task.clientName || task.clientName.trim() === '')) {
        task.clientName = task.taskTitle;
        fixedCount++;
      }
    });
    
    if (fixedCount > 0) {
      await db.set(`tasks_${req.params.id}`, tasks);
    }
    
    res.json({ message: `Fixed ${fixedCount} task client names`, fixedCount });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== NORMALIZE ALL PROJECT DATA (Admin utility) ==============
app.post('/api/admin/normalize-all-data', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const projects = await getProjects();
    const stats = {
      projectsProcessed: 0,
      subtasksNormalized: 0,
      slugsRegenerated: 0,
      tasksNormalized: 0
    };
    
    // Collect existing slugs for uniqueness check
    const existingSlugs = new Set();
    
    for (const project of projects) {
      stats.projectsProcessed++;
      
      // Regenerate clientLinkSlug if needed
      if (project.clientName && (!project.clientLinkSlug || project.clientLinkSlug === '')) {
        const newSlug = generateClientSlug(project.clientName, [...existingSlugs]);
        project.clientLinkSlug = newSlug;
        stats.slugsRegenerated++;
      }
      
      if (project.clientLinkSlug) {
        existingSlugs.add(project.clientLinkSlug);
      }
      
      // Normalize tasks and subtasks - use raw tasks for mutation
      const tasks = await getRawTasks(project.id);
      let tasksChanged = false;
      
      for (const task of tasks) {
        // Ensure task has proper ID type (always convert to number for consistency)
        if (typeof task.id === 'string' && !isNaN(parseInt(task.id))) {
          task.id = parseInt(task.id);
          tasksChanged = true;
          stats.tasksNormalized++;
        }
        
        // Normalize subtasks
        if (task.subtasks && task.subtasks.length > 0) {
          for (const subtask of task.subtasks) {
            // Ensure subtask has all required fields
            if (subtask.completed === undefined) {
              subtask.completed = false;
              tasksChanged = true;
              stats.subtasksNormalized++;
            }
            if (subtask.notApplicable === undefined) {
              subtask.notApplicable = false;
              tasksChanged = true;
              stats.subtasksNormalized++;
            }
            if (!subtask.status) {
              if (subtask.notApplicable) {
                subtask.status = 'N/A';
              } else if (subtask.completed) {
                subtask.status = 'Complete';
              } else {
                subtask.status = 'Pending';
              }
              tasksChanged = true;
              stats.subtasksNormalized++;
            }
          }
        }
      }
      
      if (tasksChanged) {
        await db.set(`tasks_${project.id}`, tasks);
      }
    }
    
    // Save updated projects
    await db.set('projects', projects);
    
    res.json({ 
      message: 'Data normalization complete', 
      stats 
    });
  } catch (error) {
    console.error('Data normalization error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== REGENERATE PROJECT SLUG (Admin utility) ==============
app.post('/api/projects/:id/regenerate-slug', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const projects = await getProjects();
    const idx = projects.findIndex(p => p.id === req.params.id);
    
    if (idx === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const existingSlugs = projects
      .filter(p => p.id !== req.params.id)
      .map(p => p.clientLinkSlug)
      .filter(Boolean);
    
    const newSlug = generateClientSlug(projects[idx].clientName, existingSlugs);
    projects[idx].clientLinkSlug = newSlug;
    
    await db.set('projects', projects);
    
    res.json({ 
      message: 'Slug regenerated successfully', 
      clientLinkSlug: newSlug 
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== CLIENT PORTAL DOMAIN SETTINGS ==============
app.get('/api/settings/client-portal-domain', authenticateToken, async (req, res) => {
  try {
    const domain = await db.get('client_portal_domain') || '';
    res.json({ domain });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/settings/client-portal-domain', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { domain } = req.body;
    // Remove trailing slash if present
    const cleanDomain = domain ? domain.replace(/\/+$/, '') : '';
    await db.set('client_portal_domain', cleanDomain);
    res.json({ message: 'Client portal domain saved', domain: cleanDomain });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

async function checkAndUpdateHubSpotDealStage(projectId) {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.hubspotRecordId || !hubspot.isValidRecordId(project.hubspotRecordId)) {
      console.log('📋 HubSpot sync skipped: No project or invalid Record ID');
      return;
    }

    const tasks = await getTasks(projectId);
    const mapping = await db.get('hubspot_stage_mapping');
    if (!mapping || !mapping.phases) {
      console.log('📋 HubSpot sync skipped: No stage mapping configured');
      return;
    }

    console.log('📋 Checking phase completion for HubSpot sync...');
    console.log('📋 Stage mapping:', JSON.stringify(mapping));

    const phases = ['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];
    
    for (let i = phases.length - 1; i >= 0; i--) {
      const phase = phases[i];
      const phaseTasks = tasks.filter(t => t.phase === phase);
      if (phaseTasks.length === 0) continue;
      
      const completedCount = phaseTasks.filter(t => t.completed).length;
      const allCompleted = phaseTasks.every(t => t.completed);
      
      console.log(`📋 ${phase}: ${completedCount}/${phaseTasks.length} tasks completed`);
      
      if (allCompleted && mapping.phases[phase]) {
        const stageId = mapping.phases[phase];
        console.log(`📤 Syncing to HubSpot: ${phase} -> Stage ID: ${stageId}, Pipeline: ${mapping.pipelineId}`);
        
        await hubspot.updateRecordStage(project.hubspotRecordId, stageId, mapping.pipelineId);
        
        const idx = projects.findIndex(p => p.id === projectId);
        if (idx !== -1) {
          projects[idx].hubspotDealStage = stageId;
          projects[idx].lastHubSpotSync = new Date().toISOString();
          await db.set('projects', projects);
        }
        
        console.log(`✅ HubSpot record ${project.hubspotRecordId} moved to stage for ${phase}`);
        break;
      }
    }
  } catch (error) {
    console.error('Error syncing HubSpot deal stage:', error.message);
  }
}

async function logHubSpotActivity(projectId, activityType, details) {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.hubspotRecordId || !hubspot.isValidRecordId(project.hubspotRecordId)) return;
    
    await hubspot.logRecordActivity(project.hubspotRecordId, activityType, details);
  } catch (error) {
    console.error('Error logging HubSpot activity:', error.message);
  }
}

async function createHubSpotTask(projectId, task, completedByName) {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.hubspotRecordId || !hubspot.isValidRecordId(project.hubspotRecordId)) return;
    
    // Build task subject
    const taskSubject = `[Project Tracker] ${task.taskTitle}`;
    
    // Build task body with all details including notes
    let taskBody = `Phase: ${task.phase}`;
    if (task.stage) {
      taskBody += `\nStage: ${task.stage}`;
    }
    taskBody += `\nCompleted by: ${completedByName}`;
    taskBody += `\nCompleted: ${task.dateCompleted || new Date().toISOString()}`;
    
    // Include all task notes
    if (task.notes && task.notes.length > 0) {
      taskBody += `\n\n--- Task Notes ---`;
      task.notes.forEach(note => {
        const noteDate = new Date(note.createdAt);
        const noteText = note.text || note.content || note.body || '';
        taskBody += `\n[${note.author || note.createdBy || 'Unknown'} - ${noteDate.toLocaleDateString()} ${noteDate.toLocaleTimeString()}]: ${noteText}`;
      });
    }
    
    // Try to find owner in HubSpot by email (preferred) or name
    let ownerId = null;
    if (task.owner) {
      const ownerValue = task.owner.trim();
      
      // Check if owner is an email address
      if (ownerValue.includes('@')) {
        ownerId = await hubspot.findOwnerByEmail(ownerValue);
      } else {
        // Fall back to name matching
        const nameParts = ownerValue.split(/\s+/);
        if (nameParts.length >= 2) {
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          ownerId = await hubspot.findOwnerByName(firstName, lastName);
          if (ownerId) {
            console.log(`📋 Found HubSpot owner by name "${task.owner}": ${ownerId}`);
          }
        }
      }
    }
    
    // Check if task already has a HubSpot ID (use update) or create new
    const existingTaskId = task.hubspotTaskId;
    const result = await hubspot.createOrUpdateTask(project.hubspotRecordId, taskSubject, taskBody, ownerId, existingTaskId);
    
    // Store HubSpot task ID if newly created
    if (result && result.id && !existingTaskId) {
      try {
        // Use raw tasks for mutation to prevent normalization drift
        const tasks = await getRawTasks(projectId);
        const taskIdx = tasks.findIndex(t => t.id === task.id || String(t.id) === String(task.id));
        if (taskIdx !== -1) {
          tasks[taskIdx].hubspotTaskId = result.id;
          tasks[taskIdx].hubspotSyncedAt = new Date().toISOString();
          await db.set(`tasks_${projectId}`, tasks);
          console.log(`📋 Stored HubSpot task ID ${result.id} for task "${task.taskTitle}"`);
        }
      } catch (err) {
        console.error('Failed to save HubSpot task ID:', err.message);
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error creating HubSpot task:', error.message);
  }
}

async function checkStageAndPhaseCompletion(projectId, tasks, completedTask) {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.hubspotRecordId || !hubspot.isValidRecordId(project.hubspotRecordId)) {
      console.log('📋 HubSpot sync skipped: No project or invalid Record ID');
      return;
    }

    const phase = completedTask.phase;
    const stage = completedTask.stage;
    
    // Check if stage is completed (all tasks in this phase+stage are done)
    if (stage) {
      const stageTasks = tasks.filter(t => t.phase === phase && t.stage === stage);
      const stageCompleted = stageTasks.every(t => t.completed);
      
      if (stageCompleted && stageTasks.length > 0) {
        // Build comprehensive stage completion note with dates, times, and notes
        let stageDetails = `Stage "${stage}" in ${phase} is now complete!`;
        stageDetails += `\n\nTasks completed in this stage (${stageTasks.length} total):`;
        
        stageTasks.forEach(task => {
          stageDetails += `\n\n- ${task.taskTitle}`;
          if (task.owner) stageDetails += `\n  Owner: ${task.owner}`;
          if (task.dateCompleted) {
            const completedDate = new Date(task.dateCompleted);
            stageDetails += `\n  Completed: ${completedDate.toLocaleDateString()} at ${completedDate.toLocaleTimeString()}`;
          }
          
          // Include all notes for each task
          if (task.notes && task.notes.length > 0) {
            stageDetails += `\n  Notes:`;
            task.notes.forEach(note => {
              const noteDate = new Date(note.createdAt);
              stageDetails += `\n    - [${note.author} - ${noteDate.toLocaleDateString()} ${noteDate.toLocaleTimeString()}]: ${note.content}`;
            });
          }
        });
        
        console.log(`📤 Stage completed: ${phase} / ${stage}`);
        await hubspot.logRecordActivity(project.hubspotRecordId, 'Stage Completed', stageDetails);
      }
    }
    
    // Check if entire phase is completed (move deal stage)
    const phaseTasks = tasks.filter(t => t.phase === phase);
    const phaseCompleted = phaseTasks.length > 0 && phaseTasks.every(t => t.completed);
    
    if (phaseCompleted) {
      const mapping = await db.get('hubspot_stage_mapping');
      if (!mapping || !mapping.phases) {
        console.log('📋 Phase completed but no stage mapping configured');
        return;
      }
      
      if (mapping.phases[phase]) {
        const stageId = mapping.phases[phase];
        console.log(`📤 Phase ${phase} completed - Syncing to HubSpot stage: ${stageId}`);
        
        // Log phase completion with stage-by-stage breakdown only (no individual tasks)
        let phaseDetails = `${phase} is now complete!`;
        phaseDetails += `\n\nAll ${phaseTasks.length} tasks in this phase have been completed.`;
        
        // Group by stage for summary count only
        const stageGroups = {};
        phaseTasks.forEach(task => {
          const taskStage = task.stage || 'General';
          if (!stageGroups[taskStage]) stageGroups[taskStage] = 0;
          stageGroups[taskStage]++;
        });
        
        phaseDetails += `\n\n--- Stage Summary ---`;
        Object.keys(stageGroups).forEach(stageName => {
          phaseDetails += `\n${stageName}: ${stageGroups[stageName]} tasks completed`;
        });
        
        await hubspot.logRecordActivity(project.hubspotRecordId, 'Phase Completed', phaseDetails);
        
        // Update deal stage
        await hubspot.updateRecordStage(project.hubspotRecordId, stageId, mapping.pipelineId);
        
        const idx = projects.findIndex(p => p.id === projectId);
        if (idx !== -1) {
          projects[idx].hubspotDealStage = stageId;
          projects[idx].lastHubSpotSync = new Date().toISOString();
          await db.set('projects', projects);
        }
        
        console.log(`✅ HubSpot record ${project.hubspotRecordId} moved to stage for ${phase}`);
      }
    }
  } catch (error) {
    console.error('Error in stage/phase completion check:', error.message);
  }
}

// ============== REPORTING ==============
app.get('/api/reporting', authenticateToken, async (req, res) => {
  try {
    const projects = await getProjects();
    const reportingData = [];
    
    for (const project of projects) {
      const tasks = await getTasks(project.id);
      
      // Find contract signed task and first live patient samples task
      const contractTask = tasks.find(t => 
        t.taskTitle && t.taskTitle.toLowerCase().includes('contract signed')
      );
      const goLiveTask = tasks.find(t => 
        t.taskTitle && t.taskTitle.toLowerCase().includes('first live patient samples')
      );
      
      let launchDurationWeeks = null;
      if (contractTask?.dateCompleted && goLiveTask?.dateCompleted) {
        const contractDate = new Date(contractTask.dateCompleted);
        const goLiveDate = new Date(goLiveTask.dateCompleted);
        const diffMs = goLiveDate - contractDate;
        launchDurationWeeks = Math.round(diffMs / (7 * 24 * 60 * 60 * 1000));
      }
      
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(t => t.completed).length;
      
      reportingData.push({
        id: project.id,
        name: project.name,
        clientName: project.clientName,
        status: project.status || 'active',
        totalTasks,
        completedTasks,
        progressPercent: totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0,
        contractSignedDate: contractTask?.dateCompleted || null,
        goLiveDate: goLiveTask?.dateCompleted || null,
        launchDurationWeeks
      });
    }
    
    res.json(reportingData);
  } catch (error) {
    console.error('Error generating reporting data:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== EXPORT ==============
const escapeCSV = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

app.get('/api/projects/:id/export', authenticateToken, async (req, res) => {
  try {
    // Check project access
    if (!canAccessProject(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const projects = await getProjects();
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const tasks = await getTasks(req.params.id);
    
    const headers = ['id', 'phase', 'stage', 'taskTitle', 'owner', 'startDate', 'dueDate', 'showToClient', 'clientName', 'completed', 'dateCompleted', 'tags', 'dependencies', 'notes'];
    
    const rows = tasks.map(t => [
      t.id,
      t.phase || '',
      t.stage || '',
      t.taskTitle || '',
      t.owner || '',
      t.startDate || '',
      t.dueDate || '',
      t.showToClient ? 'true' : 'false',
      t.clientName || '',
      t.completed ? 'true' : 'false',
      t.dateCompleted || '',
      Array.isArray(t.tags) ? t.tags.join(';') : '',
      Array.isArray(t.dependencies) ? t.dependencies.join(';') : '',
      Array.isArray(t.notes) ? t.notes.map(n => n.text || n).join(' | ') : ''
    ].map(escapeCSV));
    
    const csv = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name.replace(/[^a-zA-Z0-9]/g, '_')}.csv"`);
    res.send(csv);
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Template Management (Admin only)
app.get('/api/templates', authenticateToken, async (req, res) => {
  try {
    let templates = await db.get('templates') || [];
    
    // If no templates in DB, load the default one from file
    if (templates.length === 0) {
      const defaultTemplate = await loadTemplate();
      templates = [{
        id: 'biolis-au480-clia',
        name: 'Biolis AU480 with CLIA Upgrade',
        description: '102-task template for laboratory equipment installations',
        tasks: defaultTemplate,
        createdAt: new Date().toISOString(),
        isDefault: true
      }];
      await db.set('templates', templates);
    }
    
    // Return templates without full task lists (just metadata)
    const templateMeta = templates.map(t => ({
      id: t.id,
      name: t.name,
      description: t.description,
      taskCount: t.tasks.length,
      createdAt: t.createdAt,
      isDefault: t.isDefault
    }));
    
    res.json(templateMeta);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/templates/:id', authenticateToken, async (req, res) => {
  try {
    const templates = await db.get('templates') || [];
    const template = templates.find(t => t.id === req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    res.json(template);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/templates/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const templates = await db.get('templates') || [];
    const idx = templates.findIndex(t => t.id === req.params.id);
    
    if (idx === -1) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const { name, description, tasks } = req.body;
    
    if (name) templates[idx].name = name;
    if (description) templates[idx].description = description;
    if (tasks) templates[idx].tasks = tasks;
    templates[idx].updatedAt = new Date().toISOString();
    
    await db.set('templates', templates);
    res.json(templates[idx]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/templates', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const templates = await db.get('templates') || [];
    const { name, description, tasks } = req.body;
    
    if (!name || !tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({ error: 'Name and tasks are required (tasks must be a non-empty array)' });
    }
    
    const newTemplate = {
      id: uuidv4(),
      name,
      description: description || '',
      tasks,
      createdAt: new Date().toISOString(),
      isDefault: false
    };
    
    templates.push(newTemplate);
    await db.set('templates', templates);
    res.status(201).json(newTemplate);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Clone/Duplicate a template
app.post('/api/templates/:id/clone', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const templates = await db.get('templates') || [];
    const originalTemplate = templates.find(t => t.id === req.params.id);
    
    if (!originalTemplate) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const { name } = req.body;
    
    const newTemplate = {
      id: uuidv4(),
      name: name || `${originalTemplate.name} (Copy)`,
      description: originalTemplate.description || '',
      tasks: originalTemplate.tasks.map(task => ({ ...task })),
      createdAt: new Date().toISOString(),
      isDefault: false
    };
    
    templates.push(newTemplate);
    await db.set('templates', templates);
    res.status(201).json(newTemplate);
  } catch (error) {
    console.error('Clone template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Import CSV tasks to a template
app.post('/api/templates/:id/import-csv', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const templates = await db.get('templates') || [];
    const template = templates.find(t => t.id === req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    const { csvData } = req.body;
    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({ error: 'CSV data is required' });
    }
    
    // Generate new IDs for imported tasks and create ID mapping
    const maxId = template.tasks.length > 0 ? Math.max(...template.tasks.map(t => t.id)) : 0;
    const idMapping = {};
    
    const newTasks = csvData.map((row, index) => {
      const taskTitle = row.taskTitle || row.title || row.task || '';
      const showToClient = ['true', 'yes', '1'].includes(String(row.showToClient || '').toLowerCase());
      const completed = ['true', 'yes', '1'].includes(String(row.completed || '').toLowerCase());
      const newId = maxId + index + 1;
      
      // Store mapping from original ID to new ID
      if (row.id) {
        idMapping[String(row.id).trim()] = newId;
      }
      
      return {
        id: newId,
        phase: row.phase || 'Phase 1',
        stage: row.stage || '',
        taskTitle: taskTitle,
        clientName: showToClient ? (row.clientName || taskTitle) : '',
        owner: row.owner || '',
        startDate: normalizeDate(row.startDate),
        dueDate: normalizeDate(row.dueDate),
        dateCompleted: completed ? (normalizeDate(row.dateCompleted) || new Date().toISOString().split('T')[0]) : '',
        duration: parseInt(row.duration) || 0,
        completed: completed,
        showToClient: showToClient,
        rawDependencies: row.dependencies || ''
      };
    }).filter(t => t.taskTitle);
    
    // Remap dependencies using the ID mapping
    newTasks.forEach(task => {
      if (task.rawDependencies) {
        const depStrings = String(task.rawDependencies).split(',').map(d => d.trim()).filter(d => d);
        task.dependencies = depStrings.map(depId => {
          if (idMapping[depId]) {
            return idMapping[depId];
          }
          const numId = parseInt(depId);
          if (!isNaN(numId)) {
            const existingTask = template.tasks.find(t => t.id === numId);
            if (existingTask) return numId;
            if (idMapping[depId]) return idMapping[depId];
          }
          return null;
        }).filter(d => d !== null);
      } else {
        task.dependencies = [];
      }
      delete task.rawDependencies;
    });
    
    template.tasks = [...template.tasks, ...newTasks];
    template.updatedAt = new Date().toISOString();
    
    await db.set('templates', templates);
    res.json({ message: `Imported ${newTasks.length} tasks`, template });
  } catch (error) {
    console.error('Import CSV to template error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Import CSV tasks to a project
app.post('/api/projects/:id/import-csv', authenticateToken, async (req, res) => {
  try {
    // Check project access
    if (!canAccessProject(req.user, req.params.id)) {
      return res.status(403).json({ error: 'Access denied to this project' });
    }
    
    const projects = await getProjects();
    const project = projects.find(p => p.id === req.params.id);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const { csvData } = req.body;
    if (!csvData || !Array.isArray(csvData)) {
      return res.status(400).json({ error: 'CSV data is required' });
    }
    
    // Use raw tasks for mutation to prevent normalization drift
    const tasks = await getRawTasks(req.params.id);
    const maxId = tasks.length > 0 ? Math.max(...tasks.map(t => t.id)) : 0;
    
    // Separate parent tasks and subtasks
    const parentRows = csvData.filter(row => {
      const isSubtask = String(row.isSubtask || '').toLowerCase();
      return isSubtask !== 'true' && isSubtask !== 'yes' && isSubtask !== '1';
    });
    const subtaskRows = csvData.filter(row => {
      const isSubtask = String(row.isSubtask || '').toLowerCase();
      return isSubtask === 'true' || isSubtask === 'yes' || isSubtask === '1';
    });
    
    // Create ID mapping from original CSV IDs to new IDs
    const idMapping = {};
    
    // Create parent tasks first (with temporary dependencies as strings)
    const newTasks = parentRows.map((row, index) => {
      const taskTitle = row.taskTitle || row.title || row.task || '';
      const showToClient = ['true', 'yes', '1'].includes(String(row.showToClient || '').toLowerCase());
      const completed = ['true', 'yes', '1'].includes(String(row.completed || '').toLowerCase());
      const newId = maxId + index + 1;
      
      // Store mapping from original ID to new ID (if original ID exists)
      if (row.id) {
        idMapping[String(row.id).trim()] = newId;
      }
      // Also map by row index for position-based references
      idMapping[`row_${index}`] = newId;
      
      return {
        id: newId,
        originalId: row.id ? String(row.id).trim() : null,
        phase: row.phase || 'Phase 1',
        stage: row.stage || '',
        taskTitle: taskTitle,
        clientName: showToClient ? (row.clientName || taskTitle) : '',
        owner: row.owner || '',
        startDate: normalizeDate(row.startDate),
        dueDate: normalizeDate(row.dueDate),
        dateCompleted: completed ? (normalizeDate(row.dateCompleted) || new Date().toISOString().split('T')[0]) : '',
        duration: parseInt(row.duration) || 0,
        completed: completed,
        showToClient: showToClient,
        rawDependencies: row.dependencies || '',
        dependencies: [],
        notes: [],
        subtasks: [],
        createdBy: req.user.id,
        createdAt: new Date().toISOString()
      };
    }).filter(t => t.taskTitle);
    
    // Now remap dependencies using the ID mapping
    newTasks.forEach(task => {
      if (task.rawDependencies) {
        const depStrings = String(task.rawDependencies).split(',').map(d => d.trim()).filter(d => d);
        task.dependencies = depStrings.map(depId => {
          // First try direct mapping
          if (idMapping[depId]) {
            return idMapping[depId];
          }
          // Then try parsing as number and finding in existing tasks
          const numId = parseInt(depId);
          if (!isNaN(numId)) {
            // Check if it's an existing task ID
            const existingTask = tasks.find(t => t.id === numId);
            if (existingTask) {
              return numId;
            }
            // Check if it matches any new task's original ID
            const mappedId = idMapping[depId];
            if (mappedId) {
              return mappedId;
            }
          }
          return null;
        }).filter(d => d !== null);
      }
      delete task.rawDependencies;
      delete task.originalId;
    });
    
    // Add subtasks to their parent tasks
    let subtasksAdded = 0;
    const allTasks = [...tasks, ...newTasks];
    
    for (const row of subtaskRows) {
      const parentIdStr = String(row.parentTaskId || '').trim();
      if (!parentIdStr) continue;
      
      // Try to find parent using the ID mapping first, then direct lookup
      let parentTask = null;
      if (idMapping[parentIdStr]) {
        parentTask = allTasks.find(t => t.id === idMapping[parentIdStr]);
      }
      if (!parentTask) {
        const numId = parseInt(parentIdStr);
        if (!isNaN(numId)) {
          parentTask = allTasks.find(t => t.id === numId);
        }
      }
      
      if (parentTask) {
        if (!parentTask.subtasks) parentTask.subtasks = [];
        parentTask.subtasks.push({
          id: Date.now() + Math.random(),
          title: row.taskTitle || row.title || row.task || '',
          owner: row.owner || '',
          dueDate: normalizeDate(row.dueDate) || '',
          status: row.subtaskStatus || 'Pending',
          completed: ['true', 'yes', '1', 'complete', 'completed'].includes(String(row.subtaskStatus || row.completed || '').toLowerCase()),
          notApplicable: ['n/a', 'na', 'not_applicable', 'not applicable'].includes(String(row.subtaskStatus || '').toLowerCase())
        });
        subtasksAdded++;
      }
    }
    
    await db.set(`tasks_${req.params.id}`, allTasks);
    
    const message = subtasksAdded > 0 
      ? `Imported ${newTasks.length} tasks and ${subtasksAdded} subtasks`
      : `Imported ${newTasks.length} tasks`;
    res.json({ message, tasks: newTasks });
  } catch (error) {
    console.error('Import CSV to project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/templates/:id/set-default', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const templates = await db.get('templates') || [];
    const template = templates.find(t => t.id === req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    // Remove default from all templates, then set this one as default
    templates.forEach(t => {
      t.isDefault = (t.id === req.params.id);
    });
    
    await db.set('templates', templates);
    res.json({ message: `"${template.name}" is now the default template` });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/templates/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const templates = await db.get('templates') || [];
    const template = templates.find(t => t.id === req.params.id);
    
    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }
    
    if (template.isDefault) {
      return res.status(400).json({ error: 'Cannot delete default template' });
    }
    
    const filtered = templates.filter(t => t.id !== req.params.id);
    await db.set('templates', filtered);
    res.json({ message: 'Template deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== CLIENT PORTAL & INTERNAL ROUTES ==============
// Reserved paths: login, home serve the main app
app.get('/thrive365labslaunch/login', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
app.get('/thrive365labsLAUNCH/login', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
app.get('/thrive365labslaunch/home', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
app.get('/thrive365labsLAUNCH/home', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Internal project tracker: /thrive365labslaunch/{slug}-internal
app.get('/thrive365labslaunch/:slug-internal', async (req, res) => {
  const slug = req.params.slug;
  const projects = await getProjects();
  const project = projects.find(p => p.clientLinkSlug === slug || p.clientLinkId === slug);
  
  if (project) {
    res.sendFile(__dirname + '/public/index.html');
  } else {
    res.status(404).send('Project not found');
  }
});
app.get('/thrive365labsLAUNCH/:slug-internal', async (req, res) => {
  const slug = req.params.slug;
  const projects = await getProjects();
  const project = projects.find(p => p.clientLinkSlug === slug || p.clientLinkId === slug);
  
  if (project) {
    res.sendFile(__dirname + '/public/index.html');
  } else {
    res.status(404).send('Project not found');
  }
});

// Client portal: /thrive365labslaunch/{slug} (without -internal suffix)
app.get('/thrive365labsLAUNCH/:slug', async (req, res) => {
  const slug = req.params.slug;
  // Skip if ends with -internal (handled above)
  if (slug.endsWith('-internal')) {
    return res.sendFile(__dirname + '/public/index.html');
  }
  const projects = await getProjects();
  const project = projects.find(p => p.clientLinkSlug === slug || p.clientLinkId === slug);
  
  if (project) {
    res.sendFile(__dirname + '/public/client.html');
  } else {
    res.status(404).send('Project not found');
  }
});

app.get('/thrive365labslaunch/:slug', async (req, res) => {
  const slug = req.params.slug;
  // Skip if ends with -internal (handled above)
  if (slug.endsWith('-internal')) {
    return res.sendFile(__dirname + '/public/index.html');
  }
  const projects = await getProjects();
  const project = projects.find(p => p.clientLinkSlug === slug || p.clientLinkId === slug);
  
  if (project) {
    res.sendFile(__dirname + '/public/client.html');
  } else {
    res.status(404).send('Project not found');
  }
});

// ============== SERVICE PORTAL ROUTES ==============

// Service portal login - restricted to users with hasServicePortalAccess or admins
app.post('/api/auth/service-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    const users = await getUsers();
    const user = users.find(u => u.email === email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check if user has service portal access
    if (user.role !== 'admin' && !user.hasServicePortalAccess) {
      return res.status(403).json({ error: 'Access denied. You do not have Service Portal access. Please contact an administrator.' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role, hasServicePortalAccess: user.hasServicePortalAccess },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        hasServicePortalAccess: user.hasServicePortalAccess || user.role === 'admin'
      }
    });
  } catch (error) {
    console.error('Service login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Middleware to check service portal access
const requireServiceAccess = (req, res, next) => {
  // Admins always have access
  if (req.user.role === 'admin') return next();
  // Vendors always have service portal access
  if (req.user.role === 'vendor') return next();
  // Users with explicit service portal access
  if (req.user.hasServicePortalAccess) return next();
  return res.status(403).json({ error: 'Service portal access required' });
};

// Get service portal data
app.get('/api/service-portal/data', authenticateToken, requireServiceAccess, async (req, res) => {
  try {
    const serviceReports = (await db.get('service_reports')) || [];
    let userReports;

    if (req.user.role === 'admin') {
      // Admins see all reports
      userReports = serviceReports;
    } else if (req.user.role === 'vendor') {
      // Vendors see their own reports + reports for their assigned clients
      const assignedClients = req.user.assignedClients || [];
      userReports = serviceReports.filter(r =>
        r.technicianId === req.user.id ||
        assignedClients.includes(r.clientFacilityName)
      );
    } else {
      // Regular users with service access see only their own reports
      userReports = serviceReports.filter(r => r.technicianId === req.user.id);
    }

    // Sort by date descending
    userReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({
      recentReports: userReports.slice(0, 10),
      totalReports: userReports.length
    });
  } catch (error) {
    console.error('Service portal data error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get clients list for service portal
app.get('/api/service-portal/clients', authenticateToken, requireServiceAccess, async (req, res) => {
  try {
    const projects = await getProjects();
    const users = await getUsers();

    // Get unique clients from projects
    const clientMap = new Map();

    projects.forEach(project => {
      if (project.clientName && !clientMap.has(project.clientName)) {
        clientMap.set(project.clientName, {
          name: project.clientName,
          clientName: project.clientName,
          address: project.clientAddress || '',
          projectId: project.id,
          hubspotCompanyId: project.hubspotCompanyId || null,
          hubspotRecordId: project.hubspotRecordId || null
        });
      }
    });

    // Also add client users (with HubSpot IDs)
    users.filter(u => u.role === 'client').forEach(user => {
      if (user.practiceName) {
        // If client already exists from project, merge HubSpot IDs
        if (clientMap.has(user.practiceName)) {
          const existing = clientMap.get(user.practiceName);
          if (!existing.hubspotCompanyId && user.hubspotCompanyId) {
            existing.hubspotCompanyId = user.hubspotCompanyId;
          }
        } else {
          clientMap.set(user.practiceName, {
            name: user.practiceName,
            clientName: user.practiceName,
            address: '',
            userId: user.id,
            hubspotCompanyId: user.hubspotCompanyId || null
          });
        }
      }
    });

    let clientList = Array.from(clientMap.values());

    // Vendors only see their assigned clients
    if (req.user.role === 'vendor') {
      const assignedClients = req.user.assignedClients || [];
      clientList = clientList.filter(c => assignedClients.includes(c.name) || assignedClients.includes(c.clientName));
    }

    res.json(clientList);
  } catch (error) {
    console.error('Get clients error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create service report
app.post('/api/service-reports', authenticateToken, requireServiceAccess, async (req, res) => {
  try {
    const reportData = req.body;
    const serviceReports = (await db.get('service_reports')) || [];

    const newReport = {
      id: uuidv4(),
      ...reportData,
      technicianId: req.user.id,
      technicianName: req.user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    serviceReports.push(newReport);
    await db.set('service_reports', serviceReports);

    // Log activity
    await logActivity(
      req.user.id,
      req.user.name,
      'service_report_created',
      'service_report',
      newReport.id,
      { clientName: reportData.clientFacilityName, serviceType: reportData.serviceType }
    );

    // Upload to HubSpot if company ID is available
    if (reportData.hubspotCompanyId && hubspot.isValidRecordId(reportData.hubspotCompanyId)) {
      try {
        const reportDate = new Date(reportData.serviceCompletionDate || newReport.createdAt).toLocaleDateString();

        // Generate HTML service report
        const htmlReport = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Service Report - ${reportData.clientFacilityName}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; border-bottom: 2px solid #045E9F; padding-bottom: 15px; margin-bottom: 20px; }
    .header h1 { color: #045E9F; margin: 0; }
    .section { margin-bottom: 20px; }
    .section h2 { color: #00205A; font-size: 14px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 10px; }
    .field { margin-bottom: 10px; }
    .field label { font-weight: bold; color: #333; display: block; }
    .field value { display: block; padding: 5px 0; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }
    .signature-box { border: 1px solid #ddd; padding: 10px; margin-top: 10px; }
    .signature-img { max-width: 200px; max-height: 80px; }
    .footer { text-align: center; font-size: 12px; color: #666; margin-top: 30px; border-top: 1px solid #ddd; padding-top: 10px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>SERVICE REPORT</h1>
    <p>Thrive 365 Labs</p>
  </div>

  <div class="section">
    <h2>CLIENT INFORMATION</h2>
    <div class="grid">
      <div class="field"><label>Client/Facility:</label><value>${reportData.clientFacilityName || '-'}</value></div>
      <div class="field"><label>Customer Name:</label><value>${reportData.customerName || '-'}</value></div>
      <div class="field"><label>Address:</label><value>${reportData.address || '-'}</value></div>
      <div class="field"><label>Service Date:</label><value>${reportDate}</value></div>
      <div class="field"><label>Analyzer Model:</label><value>${reportData.analyzerModel || '-'}</value></div>
      <div class="field"><label>Serial Number:</label><value>${reportData.analyzerSerialNumber || '-'}</value></div>
      <div class="field"><label>HubSpot Ticket #:</label><value>${reportData.hubspotTicketNumber || '-'}</value></div>
      <div class="field"><label>Service Provider:</label><value>${reportData.serviceProviderName || req.user.name}</value></div>
    </div>
  </div>

  <div class="section">
    <h2>SERVICE PERFORMED</h2>
    <div class="field"><label>Service Type:</label><value>${reportData.serviceType || '-'}</value></div>
    <div class="field"><label>Description of Work:</label><value>${reportData.descriptionOfWork || '-'}</value></div>
    <div class="field"><label>Materials Used:</label><value>${reportData.materialsUsed || '-'}</value></div>
    <div class="field"><label>Solution:</label><value>${reportData.solution || '-'}</value></div>
    <div class="field"><label>Outstanding Issues:</label><value>${reportData.outstandingIssues || '-'}</value></div>
  </div>

  <div class="section">
    <h2>SIGNATURES</h2>
    <div class="grid">
      <div class="signature-box">
        <label>Customer Signature:</label>
        ${reportData.customerSignature ? `<img src="${reportData.customerSignature}" class="signature-img" alt="Customer Signature"/>` : '<p>Not signed</p>'}
        <p>Date: ${reportData.customerSignatureDate || '-'}</p>
      </div>
      <div class="signature-box">
        <label>Technician Signature:</label>
        ${reportData.technicianSignature ? `<img src="${reportData.technicianSignature}" class="signature-img" alt="Technician Signature"/>` : '<p>Not signed</p>'}
        <p>Date: ${reportData.technicianSignatureDate || '-'}</p>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>Report ID: ${newReport.id}</p>
    <p>Generated on ${new Date().toLocaleString()}</p>
  </div>
</body>
</html>`;

        const fileName = `Service_Report_${reportData.clientFacilityName.replace(/[^a-zA-Z0-9]/g, '_')}_${reportDate.replace(/\//g, '-')}.html`;
        const noteText = `Service Report Submitted\n\nClient: ${reportData.clientFacilityName}\nService Type: ${reportData.serviceType}\nTechnician: ${reportData.serviceProviderName || req.user.name}\nTicket #: ${reportData.hubspotTicketNumber || 'N/A'}`;

        const uploadResult = await hubspot.uploadFileAndAttachToRecord(
          reportData.hubspotCompanyId,
          htmlReport,
          fileName,
          noteText,
          {
            recordType: 'companies',
            folderPath: '/service-reports',
            notePrefix: '[Service Portal]',
            isBase64: false
          }
        );

        // Store HubSpot reference in the report
        newReport.hubspotFileId = uploadResult.fileId;
        newReport.hubspotNoteId = uploadResult.noteId;
        await db.set('service_reports', serviceReports);

        console.log(`✅ Service report uploaded to HubSpot for company ${reportData.hubspotCompanyId}`);
      } catch (hubspotError) {
        console.error('HubSpot upload error (non-blocking):', hubspotError.message);
        // Don't fail the request if HubSpot upload fails
      }
    }

    res.json(newReport);
  } catch (error) {
    console.error('Create service report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get service reports with filtering
app.get('/api/service-reports', authenticateToken, requireServiceAccess, async (req, res) => {
  try {
    let serviceReports = (await db.get('service_reports')) || [];

    // Apply filters
    const { client, dateFrom, dateTo, search, technicianId } = req.query;

    if (client) {
      serviceReports = serviceReports.filter(r =>
        r.clientFacilityName?.toLowerCase().includes(client.toLowerCase())
      );
    }

    if (dateFrom) {
      serviceReports = serviceReports.filter(r =>
        new Date(r.serviceCompletionDate || r.createdAt) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      serviceReports = serviceReports.filter(r =>
        new Date(r.serviceCompletionDate || r.createdAt) <= new Date(dateTo)
      );
    }

    if (search) {
      const searchLower = search.toLowerCase();
      serviceReports = serviceReports.filter(r =>
        r.clientFacilityName?.toLowerCase().includes(searchLower) ||
        r.serviceType?.toLowerCase().includes(searchLower) ||
        r.hubspotTicketNumber?.toLowerCase().includes(searchLower) ||
        r.analyzerModel?.toLowerCase().includes(searchLower)
      );
    }

    if (technicianId) {
      serviceReports = serviceReports.filter(r => r.technicianId === technicianId);
    }

    // Sort by date descending
    serviceReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(serviceReports);
  } catch (error) {
    console.error('Get service reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single service report
app.get('/api/service-reports/:id', authenticateToken, requireServiceAccess, async (req, res) => {
  try {
    const serviceReports = (await db.get('service_reports')) || [];
    const report = serviceReports.find(r => r.id === req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Get service report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update service report
app.put('/api/service-reports/:id', authenticateToken, requireServiceAccess, async (req, res) => {
  try {
    const serviceReports = (await db.get('service_reports')) || [];
    const reportIndex = serviceReports.findIndex(r => r.id === req.params.id);

    if (reportIndex === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const existingReport = serviceReports[reportIndex];

    // Only allow editing own reports unless admin
    if (req.user.role !== 'admin' && existingReport.technicianId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this report' });
    }

    serviceReports[reportIndex] = {
      ...existingReport,
      ...req.body,
      id: existingReport.id,
      technicianId: existingReport.technicianId,
      createdAt: existingReport.createdAt,
      updatedAt: new Date().toISOString()
    };

    await db.set('service_reports', serviceReports);
    res.json(serviceReports[reportIndex]);
  } catch (error) {
    console.error('Update service report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete service report (admin only)
app.delete('/api/service-reports/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    let serviceReports = (await db.get('service_reports')) || [];
    const report = serviceReports.find(r => r.id === req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    serviceReports = serviceReports.filter(r => r.id !== req.params.id);
    await db.set('service_reports', serviceReports);

    res.json({ message: 'Report deleted successfully' });
  } catch (error) {
    console.error('Delete service report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== VALIDATION REPORTS (Multi-day service reports for Phase 3) ==============

// Create validation report (multi-day service report)
app.post('/api/validation-reports', authenticateToken, requireServiceAccess, async (req, res) => {
  try {
    const reportData = req.body;
    const validationReports = (await db.get('validation_reports')) || [];

    const newReport = {
      id: uuidv4(),
      ...reportData,
      type: 'validation',
      technicianId: req.user.id,
      technicianName: req.user.name,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    validationReports.push(newReport);
    await db.set('validation_reports', validationReports);

    // Log activity
    await logActivity(
      req.user.id,
      req.user.name,
      'validation_report_created',
      'validation_report',
      newReport.id,
      { clientName: reportData.clientFacilityName, projectId: reportData.projectId }
    );

    // Upload to HubSpot if company ID is available
    if (reportData.hubspotCompanyId && hubspot.isValidRecordId(reportData.hubspotCompanyId)) {
      try {
        const startDate = new Date(reportData.startDate).toLocaleDateString();
        const endDate = new Date(reportData.endDate).toLocaleDateString();

        // Build validation summary for HubSpot
        let validationSummary = `VALIDATION REPORT - ${reportData.clientFacilityName}\n`;
        validationSummary += `Date Range: ${startDate} - ${endDate}\n`;
        validationSummary += `Days On-Site: ${reportData.daysOnSite || 'N/A'}\n`;
        validationSummary += `Service Provider: ${reportData.serviceProviderName}\n\n`;

        if (reportData.analyzersValidated && reportData.analyzersValidated.length > 0) {
          validationSummary += `ANALYZERS VALIDATED:\n`;
          reportData.analyzersValidated.forEach((analyzer, idx) => {
            validationSummary += `${idx + 1}. ${analyzer.model} (SN: ${analyzer.serialNumber})\n`;
            validationSummary += `   Status: ${analyzer.validationStatus}\n`;
          });
          validationSummary += `\n`;
        }

        if (reportData.trainingProvided) {
          validationSummary += `TRAINING PROVIDED:\n${reportData.trainingProvided}\n\n`;
        }

        if (reportData.validationResults) {
          validationSummary += `VALIDATION RESULTS:\n${reportData.validationResults}\n\n`;
        }

        if (reportData.outstandingItems) {
          validationSummary += `OUTSTANDING ITEMS:\n${reportData.outstandingItems}\n\n`;
        }

        if (reportData.nextSteps) {
          validationSummary += `NEXT STEPS:\n${reportData.nextSteps}\n`;
        }

        // Create note on company
        await hubspot.createNote(
          reportData.hubspotCompanyId,
          'company',
          `Validation Report Completed - ${startDate} to ${endDate}`,
          validationSummary
        );

        console.log(`✅ Validation report uploaded to HubSpot for company ${reportData.hubspotCompanyId}`);
      } catch (hubspotError) {
        console.error('HubSpot upload error (non-blocking):', hubspotError.message);
      }
    }

    res.json(newReport);
  } catch (error) {
    console.error('Create validation report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get validation reports
app.get('/api/validation-reports', authenticateToken, requireServiceAccess, async (req, res) => {
  try {
    let validationReports = (await db.get('validation_reports')) || [];

    // Filter based on user role
    if (req.user.role !== 'admin') {
      validationReports = validationReports.filter(r => r.technicianId === req.user.id);
    }

    // Apply filters
    const { client, projectId, dateFrom, dateTo } = req.query;

    if (client) {
      validationReports = validationReports.filter(r =>
        r.clientFacilityName?.toLowerCase().includes(client.toLowerCase())
      );
    }

    if (projectId) {
      validationReports = validationReports.filter(r => r.projectId === projectId);
    }

    if (dateFrom) {
      validationReports = validationReports.filter(r =>
        new Date(r.startDate || r.createdAt) >= new Date(dateFrom)
      );
    }

    if (dateTo) {
      validationReports = validationReports.filter(r =>
        new Date(r.endDate || r.createdAt) <= new Date(dateTo)
      );
    }

    // Sort by date descending
    validationReports.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json(validationReports);
  } catch (error) {
    console.error('Get validation reports error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single validation report
app.get('/api/validation-reports/:id', authenticateToken, requireServiceAccess, async (req, res) => {
  try {
    const validationReports = (await db.get('validation_reports')) || [];
    const report = validationReports.find(r => r.id === req.params.id);

    if (!report) {
      return res.status(404).json({ error: 'Report not found' });
    }

    res.json(report);
  } catch (error) {
    console.error('Get validation report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update validation report
app.put('/api/validation-reports/:id', authenticateToken, requireServiceAccess, async (req, res) => {
  try {
    const validationReports = (await db.get('validation_reports')) || [];
    const reportIndex = validationReports.findIndex(r => r.id === req.params.id);

    if (reportIndex === -1) {
      return res.status(404).json({ error: 'Report not found' });
    }

    const existingReport = validationReports[reportIndex];

    // Only allow editing own reports unless admin
    if (req.user.role !== 'admin' && existingReport.technicianId !== req.user.id) {
      return res.status(403).json({ error: 'Not authorized to edit this report' });
    }

    validationReports[reportIndex] = {
      ...existingReport,
      ...req.body,
      id: existingReport.id,
      technicianId: existingReport.technicianId,
      createdAt: existingReport.createdAt,
      updatedAt: new Date().toISOString()
    };

    await db.set('validation_reports', validationReports);
    res.json(validationReports[reportIndex]);
  } catch (error) {
    console.error('Update validation report error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Service portal HTML route
app.get('/service-portal', (req, res) => {
  res.sendFile(__dirname + '/public/service-portal.html');
});

// ============== ADMIN HUB ROUTES ==============

// Admin hub HTML route
app.get('/admin', (req, res) => {
  res.sendFile(__dirname + '/public/admin-hub.html');
});

// Admin hub login endpoint (same as regular admin login)
app.post('/api/auth/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Missing credentials' });
    }
    const users = await getUsers();
    const user = users.find(u => u.email === email && u.role === 'admin');
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(400).json({ error: 'Invalid credentials or not an admin' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, name: user.name, role: user.role },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin hub dashboard data
app.get('/api/admin-hub/dashboard', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const users = await getUsers();
    const projects = await getProjects();
    const serviceReports = (await db.get('service_reports')) || [];

    // Calculate statistics
    const stats = {
      totalUsers: users.length,
      adminUsers: users.filter(u => u.role === 'admin').length,
      clientUsers: users.filter(u => u.role === 'client').length,
      servicePortalUsers: users.filter(u => u.hasServicePortalAccess).length,
      totalProjects: projects.length,
      activeProjects: projects.filter(p => p.status !== 'completed').length,
      totalServiceReports: serviceReports.length,
      recentServiceReports: serviceReports.slice(0, 5)
    };

    res.json(stats);
  } catch (error) {
    console.error('Admin hub dashboard error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== UNIFIED LOGIN ==============
// Unified login portal for all user types
app.get('/login', (req, res) => {
  res.sendFile(__dirname + '/public/login.html');
});

// ============== AUTHENTICATED CLIENT PORTAL ROUTES ==============
// Central client portal login: /portal
app.get('/portal', (req, res) => {
  res.sendFile(__dirname + '/public/portal.html');
});

// Client portal login page: /portal/:slug/login
app.get('/portal/:slug/login', async (req, res) => {
  const users = await getUsers();
  const clientUser = users.find(u => u.role === 'client' && u.slug === req.params.slug);
  if (clientUser) {
    res.sendFile(__dirname + '/public/portal.html');
  } else {
    res.status(404).send('Portal not found');
  }
});

// Client portal pages: /portal/:slug, /portal/:slug/*
app.get('/portal/:slug', async (req, res) => {
  // Allow 'admin' slug for admin portal access
  if (req.params.slug === 'admin') {
    return res.sendFile(__dirname + '/public/portal.html');
  }
  const users = await getUsers();
  const clientUser = users.find(u => u.role === 'client' && u.slug === req.params.slug);
  if (clientUser) {
    res.sendFile(__dirname + '/public/portal.html');
  } else {
    res.status(404).send('Portal not found');
  }
});

app.get('/portal/:slug/*', async (req, res) => {
  // Allow 'admin' slug for admin portal access
  if (req.params.slug === 'admin') {
    return res.sendFile(__dirname + '/public/portal.html');
  }
  const users = await getUsers();
  const clientUser = users.find(u => u.role === 'client' && u.slug === req.params.slug);
  if (clientUser) {
    res.sendFile(__dirname + '/public/portal.html');
  } else {
    res.status(404).send('Portal not found');
  }
});

// Legacy root-level route DISABLED - use /thrive365labslaunch/{slug} instead
// Redirect old URLs to new format for backwards compatibility
app.get('/:slug', async (req, res, next) => {
  // Skip if it looks like a file request or known route
  if (req.params.slug.includes('.') || ['api', 'client', 'favicon.ico', 'thrive365labsLAUNCH', 'thrive365labslaunch', 'portal'].includes(req.params.slug)) {
    return next();
  }
  
  // Check if this slug matches a project - redirect to new URL format
  const projects = await getProjects();
  const project = projects.find(p => p.clientLinkSlug === req.params.slug);
  
  if (project) {
    // Redirect to the proper URL format
    res.redirect(301, `/thrive365labslaunch/${req.params.slug}`);
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔐 Admin login: bianca@thrive365labs.com / Thrive2025!`);
});
