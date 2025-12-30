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
app.use(express.static('public'));

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
const getProjects = async () => (await db.get('projects')) || [];
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
    
    logHubSpotActivity(projectId, 'Note Added', 
      `Task: ${tasks[idx].taskTitle}\nNote by: ${req.user.name}\n\n${content}`
    );
    
    res.json(note);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ============== PROJECT ROUTES ==============
app.get('/api/projects', authenticateToken, async (req, res) => {
  try {
    const projects = await getProjects();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/projects', authenticateToken, async (req, res) => {
  try {
    const { name, clientName, projectManager, hubspotDealId, hubspotDealStage, template } = req.body;
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
      hubspotDealId: hubspotDealId || '',
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

    // Load and apply selected template
    let templateTasks = [];
    if (template) {
      const templates = await db.get('templates') || [];
      const selectedTemplate = templates.find(t => t.id === template);
      if (selectedTemplate) {
        templateTasks = selectedTemplate.tasks || [];
      }
    }
    if (templateTasks.length === 0) {
      templateTasks = await loadTemplate();
    }
    await db.set(`tasks_${newProject.id}`, templateTasks);

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
    projects[idx] = { ...projects[idx], ...req.body };
    await db.set('projects', projects);
    res.json(projects[idx]);
  } catch (error) {
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
      
      // Non-admins cannot modify showToClient or clientName
      delete updates.showToClient;
      delete updates.clientName;
      
      // Non-admins cannot change owner/dueDate on tasks that already have them set
      if (task.owner && task.owner.trim() !== '') {
        delete updates.owner;
      }
      if (task.dueDate && task.dueDate.trim() !== '') {
        delete updates.dueDate;
      }
    }

    const wasCompleted = task.completed;
    tasks[idx] = { ...tasks[idx], ...updates };
    await db.set(`tasks_${projectId}`, tasks);
    
    if (!wasCompleted && tasks[idx].completed) {
      const projects = await getProjects();
      const project = projects.find(p => p.id === projectId);
      logHubSpotActivity(projectId, 'Task Completed', 
        `Task: ${tasks[idx].taskTitle}\nPhase: ${tasks[idx].phase}\nCompleted by: ${req.user.name}\nDate: ${tasks[idx].dateCompleted || new Date().toISOString()}`
      );
      checkAndUpdateHubSpotDealStage(projectId);
    }
    
    res.json(tasks[idx]);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.delete('/api/projects/:projectId/tasks/:taskId', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { projectId, taskId } = req.params;
    const tasks = await getTasks(projectId);
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
    res.json({
      project: { name: project.name, clientName: project.clientName },
      tasks: clientTasks
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

app.get('/api/hubspot/deal/:dealId', authenticateToken, async (req, res) => {
  try {
    const deal = await hubspot.getDeal(req.params.dealId);
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

async function checkAndUpdateHubSpotDealStage(projectId) {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === projectId);
    if (!project || !project.hubspotDealId) return;

    const tasks = await getTasks(projectId);
    const mapping = await db.get('hubspot_stage_mapping');
    if (!mapping || !mapping.phases) return;

    const phases = ['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];
    
    for (let i = phases.length - 1; i >= 0; i--) {
      const phase = phases[i];
      const phaseTasks = tasks.filter(t => t.phase === phase);
      if (phaseTasks.length === 0) continue;
      
      const allCompleted = phaseTasks.every(t => t.completed);
      if (allCompleted && mapping.phases[phase]) {
        const stageId = mapping.phases[phase];
        await hubspot.updateDealStage(project.hubspotDealId, stageId, mapping.pipelineId);
        
        const idx = projects.findIndex(p => p.id === projectId);
        if (idx !== -1) {
          projects[idx].hubspotDealStage = stageId;
          projects[idx].lastHubSpotSync = new Date().toISOString();
          await db.set('projects', projects);
        }
        
        console.log(`✅ HubSpot deal ${project.hubspotDealId} moved to stage for ${phase}`);
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
    if (!project || !project.hubspotDealId) return;
    
    await hubspot.logDealActivity(project.hubspotDealId, activityType, details);
  } catch (error) {
    console.error('Error logging HubSpot activity:', error.message);
  }
}

// ============== EXPORT ==============
app.get('/api/projects/:id/export', authenticateToken, async (req, res) => {
  try {
    const projects = await getProjects();
    const project = projects.find(p => p.id === req.params.id);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    const tasks = await getTasks(req.params.id);
    const csv = [
      ['Phase', 'Stage', 'Task', 'Owner', 'Start Date', 'Due Date', 'Completed', 'Date Completed'],
      ...tasks.map(t => [
        t.phase, 
        t.stage, 
        t.taskTitle, 
        t.owner, 
        t.startDate, 
        t.dueDate, 
        t.completed ? 'Yes' : 'No', 
        t.dateCompleted
      ])
    ].map(row => row.join(',')).join('\n');
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${project.name}.csv"`);
    res.send(csv);
  } catch (error) {
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

app.listen(PORT, () => {
  console.log(`✅ Server running on port ${PORT}`);
  console.log(`🔐 Admin login: bianca@thrive365labs.com / Thrive2025!`);
});
