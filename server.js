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

// Disable caching to prevent stale content issues
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

// Serve static files for the main app path (both cases)
app.use('/thrive365labsLAUNCH', express.static('public'));
app.use('/thrive365labslaunch', express.static('public'));
app.use(express.static('public'));
app.use('/uploads', express.static('uploads'));

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
const getTasks = async (projectId) => (await db.get(`tasks_${projectId}`)) || [];

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
      role: freshUser.role,
      assignedProjects: freshUser.assignedProjects || [],
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
    const { email, password, name, role, practiceName, isNewClient, assignedProjects, logo } = req.body;
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
      role: role || 'user',
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
      if (logo) newUser.logo = logo;
    }
    
    users.push(newUser);
    await db.set('users', users);
    res.json({ 
      id: newUser.id, 
      email: newUser.email, 
      name: newUser.name, 
      role: newUser.role,
      practiceName: newUser.practiceName,
      isNewClient: newUser.isNewClient,
      slug: newUser.slug,
      assignedProjects: newUser.assignedProjects,
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
      role: user.role 
    };
    // Include client-specific fields
    if (user.role === 'client') {
      userResponse.practiceName = user.practiceName;
      userResponse.isNewClient = user.isNewClient;
      userResponse.slug = user.slug;
      userResponse.assignedProjects = user.assignedProjects || [];
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
      assignedProjects: u.assignedProjects || [],
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
    const { name, email, role, password, assignedProjects, practiceName, isNewClient, logo, hubspotCompanyId, hubspotDealId, hubspotContactId } = req.body;
    const users = await getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    
    if (name) users[idx].name = name;
    if (email) users[idx].email = email;
    if (role) users[idx].role = role;
    if (password) users[idx].password = await bcrypt.hash(password, 10);
    if (assignedProjects !== undefined) users[idx].assignedProjects = assignedProjects;
    
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
      assignedProjects: users[idx].assignedProjects || [],
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
    
    const tasks = await getTasks(projectId);
    const idx = tasks.findIndex(t => t.id === parseInt(taskId));
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
    
    const tasks = await getTasks(projectId);
    const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId));
    if (taskIdx === -1) return res.status(404).json({ error: 'Task not found' });
    
    if (!tasks[taskIdx].subtasks) return res.status(404).json({ error: 'Subtask not found' });
    const subtaskIdx = tasks[taskIdx].subtasks.findIndex(s => s.id === subtaskId);
    if (subtaskIdx === -1) return res.status(404).json({ error: 'Subtask not found' });
    
    if (title !== undefined) tasks[taskIdx].subtasks[subtaskIdx].title = title;
    if (owner !== undefined) tasks[taskIdx].subtasks[subtaskIdx].owner = owner;
    if (dueDate !== undefined) tasks[taskIdx].subtasks[subtaskIdx].dueDate = dueDate;
    if (completed !== undefined) tasks[taskIdx].subtasks[subtaskIdx].completed = completed;
    if (notApplicable !== undefined) tasks[taskIdx].subtasks[subtaskIdx].notApplicable = notApplicable;
    if (showToClient !== undefined) tasks[taskIdx].subtasks[subtaskIdx].showToClient = showToClient;
    
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
    
    const tasks = await getTasks(projectId);
    const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId));
    if (taskIdx === -1) return res.status(404).json({ error: 'Task not found' });
    
    if (!tasks[taskIdx].subtasks) return res.status(404).json({ error: 'Subtask not found' });
    tasks[taskIdx].subtasks = tasks[taskIdx].subtasks.filter(s => s.id !== subtaskId);
    
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
    
    const tasks = await getTasks(projectId);
    const updatedTasks = [];
    
    for (const taskId of taskIds) {
      const idx = tasks.findIndex(t => t.id === parseInt(taskId));
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
    
    const tasks = await getTasks(projectId);
    const taskIdsSet = new Set(taskIds.map(id => parseInt(id)));
    
    // Check permissions - user can only delete tasks they created (unless admin)
    const users = await db.get('users') || [];
    const user = users.find(u => u.id === req.user.id);
    const isAdmin = user && user.role === 'admin';
    
    const tasksToDelete = tasks.filter(t => taskIdsSet.has(t.id));
    for (const task of tasksToDelete) {
      if (!isAdmin && task.createdBy !== req.user.id) {
        return res.status(403).json({ error: `You can only delete tasks you created. Task "${task.taskTitle}" was created by someone else.` });
      }
    }
    
    const remainingTasks = tasks.filter(t => !taskIdsSet.has(t.id));
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
    
    const tasks = await getTasks(projectId);
    const idx = tasks.findIndex(t => t.id === parseInt(taskId));
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    
    const note = {
      id: uuidv4(),
      content,
      author: req.user.name,
      authorId: req.user.id,
      createdAt: new Date().toISOString()
    };
    
    if (!tasks[idx].notes) tasks[idx].notes = [];
    tasks[idx].notes.push(note);
    await db.set(`tasks_${projectId}`, tasks);
    
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
    
    const tasks = await getTasks(projectId);
    const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId));
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
    
    const tasks = await getTasks(projectId);
    const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId));
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
      
      // Find training/validation week dates from Phase 3 tasks
      let trainingStartDate = null;
      let trainingEndDate = null;
      let trainingStartTaskId = null;
      
      const phase3Tasks = tasks.filter(t => t.phase === 'Phase 3' && t.stage && t.stage.toLowerCase().includes('training'));
      
      // Find "Complete necessary analyzer reboot or washes" task for start date
      const trainingStartTask = phase3Tasks.find(t => 
        t.taskTitle && t.taskTitle.toLowerCase().includes('complete necessary analyzer reboot')
      );
      if (trainingStartTask && trainingStartTask.dueDate) {
        trainingStartDate = trainingStartTask.dueDate;
        trainingStartTaskId = trainingStartTask.id;
      }
      
      // Find "Patient Correlation Studies" task for end date
      const trainingEndTask = phase3Tasks.find(t => 
        t.taskTitle && t.taskTitle.toLowerCase().includes('patient correlation')
      );
      if (trainingEndTask && trainingEndTask.dueDate) {
        trainingEndDate = trainingEndTask.dueDate;
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
        templateTasks = selectedTemplate.tasks || [];
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
    
    const { name } = req.body;
    const newProjectId = uuidv4();
    const existingSlugs = projects.map(p => p.clientLinkSlug).filter(Boolean);
    
    const newProject = {
      ...originalProject,
      id: newProjectId,
      name: name || `${originalProject.name} (Copy)`,
      status: 'active',
      clientLinkId: uuidv4(),
      clientLinkSlug: generateClientSlug(originalProject.clientName + '-copy', existingSlugs),
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
        notApplicable: false
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
    
    const { taskTitle, owner, dueDate, phase, stage, showToClient, clientName, notes, dependencies } = req.body;
    const projectId = req.params.id;
    const tasks = await getTasks(projectId);
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
    const tasks = await getTasks(projectId);
    const idx = tasks.findIndex(t => t.id === parseInt(taskId));
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
    
    const tasks = await getTasks(projectId);
    const task = tasks.find(t => t.id === parseInt(taskId));
    
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }
    
    const isAdmin = req.user.role === 'admin';
    const isCreator = task.createdBy && task.createdBy === req.user.id;
    const isTemplateTask = !task.createdBy;
    
    if (!isAdmin && (isTemplateTask || !isCreator)) {
      return res.status(403).json({ error: 'You can only delete tasks you created' });
    }
    
    const filtered = tasks.filter(t => t.id !== parseInt(taskId));
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
    
    const tasks = await getTasks(projectId);
    
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
      project: { name: project.name, clientName: project.clientName },
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
    
    if (!project.hubspotRecordId) {
      return res.status(400).json({ error: 'Project does not have a HubSpot Record ID configured' });
    }
    
    const tasks = await getTasks(project.id);
    const completedTasks = tasks.filter(t => t.completed);
    
    if (completedTasks.length === 0) {
      return res.json({ message: 'No completed tasks to sync', synced: 0 });
    }
    
    let syncedCount = 0;
    
    // Log an initial sync note
    try {
      await hubspot.logRecordActivity(
        project.hubspotRecordId,
        'Manual Sync Initiated',
        `Syncing ${completedTasks.length} completed tasks from Project Tracker`
      );
    } catch (err) {
      console.error('Failed to log initial sync note:', err.message);
    }
    
    // Sync each completed task
    for (const task of completedTasks) {
      try {
        await createHubSpotTask(project.id, task, 'Manual Sync');
        syncedCount++;
      } catch (err) {
        console.error(`Failed to sync task ${task.id}:`, err.message);
      }
    }
    
    // Update project with sync timestamp
    const projectIdx = projects.findIndex(p => p.id === project.id);
    if (projectIdx !== -1) {
      projects[projectIdx].lastHubSpotSync = new Date().toISOString();
      await db.set('projects', projects);
    }
    
    res.json({ 
      message: `Successfully synced ${syncedCount} of ${completedTasks.length} completed tasks to HubSpot`,
      synced: syncedCount,
      total: completedTasks.length
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
    const tasks = await getTasks(req.params.id);
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
    if (!project || !project.hubspotRecordId) {
      console.log('📋 HubSpot sync skipped: No project or Record ID');
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
    if (!project || !project.hubspotRecordId) return;
    
    await hubspot.logRecordActivity(project.hubspotRecordId, activityType, details);
  } catch (error) {
    console.error('Error logging HubSpot activity:', error.message);
  }
}

async function createHubSpotTask(projectId, task, completedByName) {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.hubspotRecordId) return;
    
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
        taskBody += `\n[${note.author} - ${noteDate.toLocaleDateString()} ${noteDate.toLocaleTimeString()}]: ${note.content}`;
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
    
    await hubspot.createTask(project.hubspotRecordId, taskSubject, taskBody, ownerId);
  } catch (error) {
    console.error('Error creating HubSpot task:', error.message);
  }
}

async function checkStageAndPhaseCompletion(projectId, tasks, completedTask) {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.hubspotRecordId) {
      console.log('📋 HubSpot sync skipped: No project or Record ID');
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
    
    const headers = ['id', 'phase', 'stage', 'taskTitle', 'owner', 'startDate', 'dueDate', 'showToClient', 'clientName', 'completed', 'dateCompleted', 'dependencies', 'notes'];
    
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
    
    const tasks = await getTasks(req.params.id);
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
