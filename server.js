const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const Database = require('@replit/database');
const bodyParser = require('body-parser');
const fs = require('fs').promises;
const path = require('path');
const hubspot = require('./hubspot');

const app = express();
const db = new Database();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'thrive365-secret-change-in-production';

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

// Serve static files for the main app path (both cases)
app.use('/thrive365labsLAUNCH', express.static('public'));
app.use('/thrive365labslaunch', express.static('public'));
app.use(express.static('public'));

// Serve the main app at /thrive365labsLAUNCH and /thrive365labslaunch
app.get('/thrive365labsLAUNCH', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
app.get('/thrive365labslaunch', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
app.get('/thrive365labsLAUNCH/*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});
app.get('/thrive365labslaunch/*', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

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

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
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
    const { email, password, name, role } = req.body;
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
    users.push(newUser);
    await db.set('users', users);
    res.json({ 
      id: newUser.id, 
      email: newUser.email, 
      name: newUser.name, 
      role: newUser.role, 
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
    res.json({ 
      token, 
      user: { id: user.id, email: user.email, name: user.name, role: user.role } 
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== FORGOT PASSWORD ==============
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }
    const users = await getUsers();
    const user = users.find(u => u.email === email);
    if (!user) {
      return res.json({ message: 'If an account exists with this email, password reset instructions will be sent.' });
    }
    const resetToken = uuidv4();
    const resetExpiry = new Date(Date.now() + 3600000).toISOString();
    const idx = users.findIndex(u => u.email === email);
    users[idx].resetToken = resetToken;
    users[idx].resetExpiry = resetExpiry;
    await db.set('users', users);
    console.log(`Password reset requested for ${email}. Token: ${resetToken}`);
    res.json({ message: 'If an account exists with this email, password reset instructions will be sent.' });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password are required' });
    }
    const users = await getUsers();
    const idx = users.findIndex(u => u.resetToken === token);
    if (idx === -1) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }
    const user = users[idx];
    if (new Date(user.resetExpiry) < new Date()) {
      return res.status(400).json({ error: 'Reset token has expired' });
    }
    users[idx].password = await bcrypt.hash(newPassword, 10);
    delete users[idx].resetToken;
    delete users[idx].resetExpiry;
    await db.set('users', users);
    res.json({ message: 'Password reset successful' });
  } catch (error) {
    console.error('Reset password error:', error);
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
      createdAt: u.createdAt
    }));
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.put('/api/users/:userId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, role, password } = req.body;
    const users = await getUsers();
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return res.status(404).json({ error: 'User not found' });
    
    if (name) users[idx].name = name;
    if (email) users[idx].email = email;
    if (role) users[idx].role = role;
    if (password) users[idx].password = await bcrypt.hash(password, 10);
    
    await db.set('users', users);
    res.json({ id: users[idx].id, email: users[idx].email, name: users[idx].name, role: users[idx].role });
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
    const users = await getUsers();
    const teamMembers = users.map(u => ({
      email: u.email,
      name: u.name
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
    const { title, owner } = req.body;
    if (!title) return res.status(400).json({ error: 'Subtask title is required' });
    
    const tasks = await getTasks(projectId);
    const idx = tasks.findIndex(t => t.id === parseInt(taskId));
    if (idx === -1) return res.status(404).json({ error: 'Task not found' });
    
    const subtask = {
      id: uuidv4(),
      title,
      owner: owner || '',
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
    const { title, owner, completed, notApplicable } = req.body;
    
    const tasks = await getTasks(projectId);
    const taskIdx = tasks.findIndex(t => t.id === parseInt(taskId));
    if (taskIdx === -1) return res.status(404).json({ error: 'Task not found' });
    
    if (!tasks[taskIdx].subtasks) return res.status(404).json({ error: 'Subtask not found' });
    const subtaskIdx = tasks[taskIdx].subtasks.findIndex(s => s.id === subtaskId);
    if (subtaskIdx === -1) return res.status(404).json({ error: 'Subtask not found' });
    
    if (title !== undefined) tasks[taskIdx].subtasks[subtaskIdx].title = title;
    if (owner !== undefined) tasks[taskIdx].subtasks[subtaskIdx].owner = owner;
    if (completed !== undefined) tasks[taskIdx].subtasks[subtaskIdx].completed = completed;
    if (notApplicable !== undefined) tasks[taskIdx].subtasks[subtaskIdx].notApplicable = notApplicable;
    
    await db.set(`tasks_${projectId}`, tasks);
    res.json(tasks[taskIdx].subtasks[subtaskIdx]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/projects/:projectId/tasks/:taskId/subtasks/:subtaskId', authenticateToken, async (req, res) => {
  try {
    const { projectId, taskId, subtaskId } = req.params;
    
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

// ============== PROJECT ROUTES ==============
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await getProjects();
    const templates = await db.get('templates') || [];
    
    const projectsWithDetails = await Promise.all(projects.map(async (project) => {
      const template = templates.find(t => t.id === project.template);
      
      // Calculate launch duration for completed projects
      let launchDurationWeeks = null;
      if (project.status === 'completed') {
        const tasks = await getTasks(project.id);
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
      
      return {
        ...project,
        templateName: template ? template.name : project.template,
        launchDurationWeeks
      };
    }));
    
    res.json(projectsWithDetails);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name, clientName, projectManager, hubspotRecordId, hubspotDealStage, template } = req.body;
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
    const projects = await getProjects();
    const idx = projects.findIndex(p => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Project not found' });
    
    // Require Soft-Pilot Checklist before marking project as completed
    if (req.body.status === 'completed' && !projects[idx].softPilotChecklistSubmitted) {
      return res.status(400).json({ 
        error: 'The Soft-Pilot Checklist must be submitted before marking this project as completed.' 
      });
    }
    
    const allowedFields = ['name', 'clientName', 'projectManager', 'hubspotRecordId', 'status', 'clientPortalDomain'];
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        projects[idx][field] = req.body[field];
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
    const tasks = await getTasks(req.params.id);
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/projects/:id/tasks', authenticateToken, async (req, res) => {
  try {
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
      const incompleteSubtasks = subtasks.filter(s => !s.completed && !s.notApplicable);
      if (incompleteSubtasks.length > 0) {
        return res.status(400).json({ 
          error: 'Cannot complete task with pending subtasks',
          incompleteSubtasks: incompleteSubtasks.map(s => s.title)
        });
      }
    }
    
    tasks[idx] = { ...tasks[idx], ...updates };
    await db.set(`tasks_${projectId}`, tasks);
    
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
    
    if (!project.hubspotRecordId) {
      return res.status(400).json({ error: 'Project must have a HubSpot Record ID to upload checklist' });
    }
    
    const safeName = (projectName || project.name || 'Project').replace(/[^a-zA-Z0-9]/g, '-');
    const timestamp = new Date().toISOString().split('T')[0];
    const timeStr = new Date().toISOString().split('T')[1].split('.')[0].replace(/:/g, '-');
    const submissionCount = (project.softPilotChecklistSubmitted?.submissionCount || 0) + 1;
    const fileName = isResubmission 
      ? `Soft-Pilot-Checklist_${safeName}_REVISED_v${submissionCount}_${timestamp}.html`
      : `Soft-Pilot-Checklist_${safeName}_${timestamp}.html`;
    
    const result = await hubspot.uploadFileAndAttachToDeal(
      project.hubspotRecordId, 
      checklistHtml, 
      fileName,
      isResubmission ? `REVISED Soft-Pilot Checklist (Version ${submissionCount}) - Updated by ${signature.name} on ${signature.date}. This is an updated version replacing the previous submission.` : null
    );
    
    project.softPilotChecklistSubmitted = {
      submittedAt: new Date().toISOString(),
      submittedBy: req.user.email,
      signature,
      submissionCount,
      isRevision: isResubmission || false
    };
    await db.set('projects', projects);
    
    res.json({ 
      message: isResubmission 
        ? 'Soft-pilot checklist updated and HubSpot notified with revision note' 
        : 'Soft-pilot checklist submitted and uploaded to HubSpot',
      fileId: result.fileId,
      noteId: result.noteId,
      submissionCount
    });
  } catch (error) {
    console.error('Error submitting soft-pilot checklist:', error);
    res.status(500).json({ error: error.message || 'Failed to upload checklist to HubSpot' });
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
    
    if (!name || !tasks) {
      return res.status(400).json({ error: 'Name and tasks are required' });
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
        dateCompleted: normalizeDate(row.dateCompleted) || (completed ? new Date().toISOString().split('T')[0] : ''),
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
        dateCompleted: normalizeDate(row.dateCompleted) || (completed ? new Date().toISOString().split('T')[0] : ''),
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
          status: row.subtaskStatus || 'Pending'
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

// ============== CLIENT PORTAL ROUTES ==============
// New format: /thrive365labsLAUNCH/:slug and /thrive365labslaunch/:slug
app.get('/thrive365labsLAUNCH/:slug', async (req, res) => {
  const projects = await getProjects();
  const project = projects.find(p => p.clientLinkSlug === req.params.slug || p.clientLinkId === req.params.slug);
  
  if (project) {
    res.sendFile(__dirname + '/public/client.html');
  } else {
    res.status(404).send('Project not found');
  }
});

app.get('/thrive365labslaunch/:slug', async (req, res) => {
  const projects = await getProjects();
  const project = projects.find(p => p.clientLinkSlug === req.params.slug || p.clientLinkId === req.params.slug);
  
  if (project) {
    res.sendFile(__dirname + '/public/client.html');
  } else {
    res.status(404).send('Project not found');
  }
});

// Legacy root-level route (for backwards compatibility)
app.get('/:slug', async (req, res, next) => {
  // Skip if it looks like a file request or known route
  if (req.params.slug.includes('.') || ['api', 'client', 'favicon.ico', 'thrive365labsLAUNCH', 'thrive365labslaunch'].includes(req.params.slug)) {
    return next();
  }
  
  // Check if this slug matches a project
  const projects = await getProjects();
  const project = projects.find(p => p.clientLinkSlug === req.params.slug);
  
  if (project) {
    res.sendFile(__dirname + '/public/client.html');
  } else {
    next();
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔐 Admin login: bianca@thrive365labs.com / Thrive2025!`);
});
