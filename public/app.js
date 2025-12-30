const { useState, useEffect } = React;
const API_URL = window.location.origin;

// ============== API CLIENT ==============
const api = {
  signup: (email, password, name) =>
    fetch(`${API_URL}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, name })
    }).then(r => r.json()),

  login: (email, password) =>
    fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }).then(r => r.json()),

  getProjects: (token) =>
    fetch(`${API_URL}/api/projects`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  createProject: (token, project) =>
    fetch(`${API_URL}/api/projects`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(project)
    }).then(r => r.json()),

  updateProject: (token, projectId, updates) =>
    fetch(`${API_URL}/api/projects/${projectId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }).then(r => r.json()),

  getTasks: (token, projectId) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  createTask: (token, projectId, task) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(task)
    }).then(r => r.json()),

  updateTask: (token, projectId, taskId, updates) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }).then(r => r.json()),

  deleteTask: (token, projectId, taskId) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  exportProject: (token, projectId) => {
    window.open(`${API_URL}/api/projects/${projectId}/export`, '_blank');
  }
};

// ============== LOGIN/SIGNUP COMPONENT ==============
const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setLoading(true);

    try {
      let result;
      if (mode === 'signup') {
        result = await api.signup(email, password, name);
        if (!result.error) {
          alert('Account created! Please login.');
          setMode('login');
          setPassword('');
          setLoading(false);
          return;
        }
      } else {
        result = await api.login(email, password);
        if (!result.error) {
          onLogin(result.token, result.user);
          return;
        }
      }
      setError(result.error);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">Project Tracker</h1>
        <p className="text-gray-600 mb-6">Thrive 365 Labs</p>

        {mode === 'login' && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-4 text-sm">
            <p className="font-medium text-blue-900">Admin Login:</p>
            <p className="text-blue-700">bianca@thrive365labs.com</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-2">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                disabled={loading}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              disabled={loading}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border rounded-md"
              disabled={loading}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : 'Create Account'}
          </button>

          <div className="text-center">
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Login'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============== PROJECT LIST COMPONENT ==============
const ProjectList = ({ token, user, onSelectProject, onLogout }) => {
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [newProject, setNewProject] = useState({
    name: '',
    clientName: '',
    projectManager: '',
    hubspotDealId: '',
    hubspotDealStage: '',
    template: 'biolis-au480-clia'
  });

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const data = await api.getProjects(token);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!newProject.name || !newProject.clientName) {
      alert('Project name and client name are required');
      return;
    }

    try {
      await api.createProject(token, newProject);
      setShowCreate(false);
      setNewProject({
        name: '',
        clientName: '',
        projectManager: '',
        hubspotDealId: '',
        hubspotDealStage: '',
        template: 'biolis-au480-clia'
      });
      loadProjects();
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project');
    }
  };

  const copyClientLink = (linkId) => {
    const link = `${window.location.origin}/client/${linkId}`;
    navigator.clipboard.writeText(link);
    alert('Client link copied to clipboard!');
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold">Project Dashboard</h1>
              <p className="text-gray-600 mt-1">
                Welcome, {user.name} 
                {user.role === 'admin' && <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">ADMIN</span>}
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
              >
                + New Project
              </button>
              <button
                onClick={onLogout}
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {showCreate && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Create New Project from Template</h2>
            <p className="text-sm text-gray-600 mb-4">
              Template: Biolis AU480 with CLIA Upgrade (102 tasks)
            </p>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Project Name *</label>
                <input
                  placeholder="e.g., DFW Implementation"
                  value={newProject.name}
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Client Name *</label>
                <input
                  placeholder="e.g., Thrive 365 Labs"
                  value={newProject.clientName}
                  onChange={(e) => setNewProject({...newProject, clientName: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Project Manager</label>
                <input
                  placeholder="e.g., Thomas"
                  value={newProject.projectManager}
                  onChange={(e) => setNewProject({...newProject, projectManager: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">HubSpot Integration</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">HubSpot Deal ID</label>
                    <input
                      placeholder="e.g., 12345678"
                      value={newProject.hubspotDealId}
                      onChange={(e) => setNewProject({...newProject, hubspotDealId: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Deal Stage</label>
                    <select
                      value={newProject.hubspotDealStage}
                      onChange={(e) => setNewProject({...newProject, hubspotDealStage: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select stage...</option>
                      <option value="contract_signed">Contract Signed</option>
                      <option value="pre_launch">Pre-Launch</option>
                      <option value="implementation">Implementation</option>
                      <option value="go_live">Go-Live</option>
                      <option value="post_launch">Post-Launch</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={handleCreate}
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
                >
                  Create Project with Template
                </button>
                <button
                  onClick={() => setShowCreate(false)}
                  className="bg-gray-300 px-4 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-xl text-gray-600">Loading projects...</div>
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <div className="text-xl text-gray-600">No projects yet</div>
            <p className="text-gray-500 mt-2">Create your first project to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map(project => (
              <div
                key={project.id}
                className="bg-white rounded-lg shadow-sm p-6 hover:shadow-md border border-gray-200"
              >
                <h3 className="text-xl font-bold text-gray-900 mb-2">{project.name}</h3>
                <p className="text-gray-600 mb-4">{project.clientName}</p>

                <div className="space-y-2 text-sm text-gray-500 mb-4">
                  {project.projectManager && (
                    <p><span className="font-medium">PM:</span> {project.projectManager}</p>
                  )}
                  {project.hubspotDealId && (
                    <p><span className="font-medium">HubSpot Deal:</span> {project.hubspotDealId}</p>
                  )}
                  <p className="text-xs text-gray-400">Template: {project.template}</p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => onSelectProject(project)}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                  >
                    Open Tracker
                  </button>
                  <button
                    onClick={() => copyClientLink(project.clientLinkId)}
                    className="w-full bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 text-sm"
                  >
                    📋 Copy Client Link
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============== TIMELINE VIEW COMPONENT ==============
const TimelineView = ({ tasks, getPhaseColor }) => {
  const sortedTasks = [...tasks]
    .filter(t => t.dueDate)
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">Project Timeline</h2>
      <div className="relative">
        <div className="absolute left-8 top-0 bottom-0 w-0.5 bg-gray-300"></div>
        
        <div className="space-y-6">
          {sortedTasks.length === 0 ? (
            <div className="text-gray-500 text-center py-8">No tasks with due dates</div>
          ) : (
            sortedTasks.map((task) => (
              <div key={task.id} className="relative pl-20">
                <div className={`absolute left-6 top-2 w-4 h-4 rounded-full border-4 border-white ${
                  task.completed ? 'bg-green-500' : 'bg-gray-300'
                }`}></div>
                
                <div className={`border-l-4 ${getPhaseColor(task.phase)} bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow`}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-xs text-gray-500 mb-1">{task.phase}{task.stage && ` - ${task.stage}`}</div>
                      <h3 className={`font-semibold ${task.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                        {task.taskTitle}
                      </h3>
                    </div>
                    <span className={`text-xs px-2 py-1 rounded ${
                      task.completed ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {task.completed ? 'Completed' : 'Pending'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div>Due: {new Date(task.dueDate).toLocaleDateString()}</div>
                    {task.dateCompleted && (
                      <span className="text-green-600">
                        ✓ Completed: {new Date(task.dateCompleted).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  
                  <div className="mt-2 text-xs text-gray-500">
                    Owner: {task.owner || 'Unassigned'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

// ============== CALENDAR VIEW COMPONENT ==============
const CalendarView = ({ tasks }) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(selectedMonth);

  const getTasksForDate = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return tasks.filter(t => t.dueDate === dateStr || t.dateCompleted === dateStr);
  };

  const prevMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() - 1));
  };

  const nextMonth = () => {
    setSelectedMonth(new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1));
  };

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">
          {monthNames[month]} {year}
        </h2>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            ←
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-lg">
            →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 mb-2">
        {dayNames.map(day => (
          <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-2">
        {[...Array(startingDayOfWeek)].map((_, idx) => (
          <div key={`empty-${idx}`} className="aspect-square"></div>
        ))}
        
        {[...Array(daysInMonth)].map((_, idx) => {
          const day = idx + 1;
          const dayTasks = getTasksForDate(day);
          const isToday = new Date().getDate() === day && 
                         new Date().getMonth() === month && 
                         new Date().getFullYear() === year;
          
          return (
            <div
              key={day}
              className={`aspect-square border rounded-lg p-2 ${
                isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
              } hover:border-blue-300 transition-colors`}
            >
              <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                {day}
              </div>
              <div className="space-y-1">
                {dayTasks.slice(0, 2).map(task => (
                  <div
                    key={task.id}
                    className={`text-xs px-1 py-0.5 rounded truncate ${
                      task.completed ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                    }`}
                    title={task.taskTitle}
                  >
                    {task.taskTitle.substring(0, 15)}{task.taskTitle.length > 15 ? '...' : ''}
                  </div>
                ))}
                {dayTasks.length > 2 && (
                  <div className="text-xs text-gray-500">
                    +{dayTasks.length - 2} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-6 border-t flex items-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-100 rounded"></div>
          <span className="text-gray-600">Due Date</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-green-100 rounded"></div>
          <span className="text-gray-600">Completed</span>
        </div>
      </div>
    </div>
  );
};

// ============== PROJECT TRACKER COMPONENT ==============
const ProjectTracker = ({ token, user, project, onBack, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState('internal'); // 'internal' or 'client'
  const [viewType, setViewType] = useState('list'); // 'list', 'timeline', or 'calendar'
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('all');

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    loadTasks();
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const data = await api.getTasks(token, project.id);
      setTasks(data);
    } catch (err) {
      console.error('Failed to load tasks:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleComplete = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const newCompleted = !task.completed;
    const updates = {
      completed: newCompleted,
      dateCompleted: newCompleted && !task.dateCompleted
        ? new Date().toLocaleDateString()
        : task.dateCompleted
    };

    try {
      await api.updateTask(token, project.id, taskId, updates);
      setTasks(tasks.map(t => t.id === taskId ? {...t, ...updates} : t));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const handleEditTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setEditingTask({
      id: taskId,
      taskTitle: task.taskTitle,
      dateCompleted: task.dateCompleted,
      owner: task.owner
    });
  };

  const handleSaveEdit = async () => {
    try {
      const updates = {
        taskTitle: editingTask.taskTitle,
        dateCompleted: editingTask.dateCompleted
      };

      if (isAdmin) {
        updates.owner = editingTask.owner;
      }

      await api.updateTask(token, project.id, editingTask.id, updates);
      setTasks(tasks.map(t =>
        t.id === editingTask.id ? {...t, ...updates} : t
      ));
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to save edit:', err);
    }
  };

  const copyClientLink = () => {
    const link = `${window.location.origin}/client/${project.clientLinkId}`;
    navigator.clipboard.writeText(link);
    alert('Client link copied!');
  };

  const getPhaseColor = (phase) => {
    const colors = {
      'Phase 0': 'border-purple-500',
      'Phase 1': 'border-blue-500',
      'Phase 2': 'border-green-500',
      'Phase 3': 'border-orange-500',
      'Phase 4': 'border-pink-500'
    };
    return colors[phase] || 'border-gray-500';
  };

  const getFilteredTasks = () => {
    let filtered = viewMode === 'client'
      ? tasks.filter(t => t.showToClient)
      : tasks;

    if (selectedPhase !== 'all') {
      filtered = filtered.filter(t => t.phase === selectedPhase);
    }

    if (viewMode === 'internal' && selectedOwner !== 'all') {
      filtered = filtered.filter(t => t.owner === selectedOwner);
    }

    return filtered;
  };

  const getTaskName = (task) =>
    (viewMode === 'client' && task.clientName) ? task.clientName : task.taskTitle;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const groupedTasks = getFilteredTasks().reduce((acc, task) => {
    const key = `${task.phase}${task.stage ? ` - ${task.stage}` : ''}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(task);
    return acc;
  }, {});

  const phases = [...new Set(tasks.map(t => t.phase))];
  const owners = [...new Set(tasks.filter(t => t.owner).map(t => t.owner))].sort();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading tracker...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <button
                onClick={onBack}
                className="text-blue-600 hover:underline mb-2 flex items-center gap-1"
              >
                ← Back to Projects
              </button>
              <h1 className="text-3xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600">{project.clientName}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              {/* View Mode Toggle */}
              <button
                onClick={() => setViewMode('internal')}
                className={`px-4 py-2 rounded-md ${
                  viewMode === 'internal'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Internal
              </button>
              <button
                onClick={() => setViewMode('client')}
                className={`px-4 py-2 rounded-md ${
                  viewMode === 'client'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Client View
              </button>
              
              {/* View Type Toggle */}
              <div className="border-l border-gray-300 mx-2"></div>
              
              <button
                onClick={() => setViewType('list')}
                className={`px-4 py-2 rounded-md ${
                  viewType === 'list'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                📋 List
              </button>
              <button
                onClick={() => setViewType('timeline')}
                className={`px-4 py-2 rounded-md ${
                  viewType === 'timeline'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                ⏱️ Timeline
              </button>
              <button
                onClick={() => setViewType('calendar')}
                className={`px-4 py-2 rounded-md ${
                  viewType === 'calendar'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                📅 Calendar
              </button>
              
              <div className="border-l border-gray-300 mx-2"></div>
              
              <button
                onClick={() => api.exportProject(token, project.id)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Export CSV
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>

          {viewMode === 'internal' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Client Link (embeddable):</span>
                <button
                  onClick={copyClientLink}
                  className="text-blue-600 hover:underline font-mono text-xs"
                >
                  {window.location.origin}/client/{project.clientLinkId}
                </button>
              </div>
              {project.hubspotDealId && (
                <p className="text-sm text-gray-600">
                  HubSpot Deal ID: <span className="font-medium">{project.hubspotDealId}</span>
                </p>
              )}
            </div>
          )}

          {/* Filters (list view) */}
          {viewType === 'list' && (
            <div className="mt-4 flex gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Phase</label>
                <select
                  value={selectedPhase}
                  onChange={(e) => setSelectedPhase(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Phases</option>
                  {phases.map(phase => (
                    <option key={phase} value={phase}>{phase}</option>
                  ))}
                </select>
              </div>
              {viewMode === 'internal' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Owner</label>
                  <select
                    value={selectedOwner}
                    onChange={(e) => setSelectedOwner(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">All Owners</option>
                    {owners.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phase Legend */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Phase 0: Contract</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Phase 1: Pre-Launch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Phase 2: Implementation</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Phase 3: Go-Live</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-pink-500 rounded"></div>
              <span>Phase 4: Post-Launch</span>
            </div>
          </div>
        </div>

        {/* Render different views based on viewType */}
        {viewType === 'timeline' && <TimelineView tasks={getFilteredTasks()} getPhaseColor={getPhaseColor} />}
        {viewType === 'calendar' && <CalendarView tasks={getFilteredTasks()} />}
        
        {viewType === 'list' && (
          <div className="space-y-6">
            {Object.entries(groupedTasks).map(([groupName, groupTasks]) => (
              <div key={groupName} className="bg-white rounded-lg shadow-sm overflow-hidden">
                <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-4 text-white">
                  <h2 className="text-xl font-bold">{groupName}</h2>
                  <p className="text-sm text-blue-100 mt-1">
                    {groupTasks.filter(t => t.completed).length} of {groupTasks.length} complete
                  </p>
                </div>
                <div className="divide-y divide-gray-200">
                  {groupTasks.map(task => (
                    <div key={task.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-4">
                        {viewMode === 'internal' && (
                          <button
                            onClick={() => handleToggleComplete(task.id)}
                            className="mt-1 flex-shrink-0"
                          >
                            {task.completed ? (
                              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">
                                ✓
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-gray-300 rounded-full hover:border-gray-400" />
                            )}
                          </button>
                        )}
                        <div className="flex-1">
                          {editingTask?.id === task.id ? (
                            <div className="space-y-3">
                              <input
                                value={editingTask.taskTitle}
                                onChange={(e) =>
                                  setEditingTask({...editingTask, taskTitle: e.target.value})
                                }
                                className="w-full px-3 py-2 border rounded-md"
                              />
                              {isAdmin && (
                                <input
                                  placeholder="Task Owner (First Last)"
                                  value={editingTask.owner}
                                  onChange={(e) =>
                                    setEditingTask({...editingTask, owner: e.target.value})
                                  }
                                  className="w-full px-3 py-2 border rounded-md"
                                />
                              )}
                              <div className="flex gap-2">
                                <input
                                  placeholder="Date Completed (e.g., 7/14/2025)"
                                  value={editingTask.dateCompleted}
                                  onChange={(e) =>
                                    setEditingTask({...editingTask, dateCompleted: e.target.value})
                                  }
                                  className="px-3 py-2 border rounded-md"
                                />
                                <button
                                  onClick={handleSaveEdit}
                                  className="px-4 py-2 bg-green-600 text-white rounded-md"
                                >
                                  Save
                                </button>
                                <button
                                  onClick={() => setEditingTask(null)}
                                  className="px-4 py-2 bg-gray-300 rounded-md"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex items-start justify-between gap-4">
                                <h3
                                  className={`font-medium ${
                                    task.completed
                                      ? 'text-gray-500 line-through'
                                      : 'text-gray-900'
                                  }`}
                                >
                                  {getTaskName(task)}
                                </h3>
                                {viewMode === 'internal' && (
                                  <button
                                    onClick={() => handleEditTask(task.id)}
                                    className="text-gray-400 hover:text-blue-600 flex-shrink-0"
                                  >
                                    ✏️
                                  </button>
                                )}
                              </div>
                              {viewMode === 'internal' && (
                                <div className="mt-2 space-y-1 text-sm text-gray-600">
                                  <p>
                                    <span className="font-medium">Owner:</span> {task.owner || 'Unassigned'}
                                    {!isAdmin && task.owner && (
                                      <span className="text-xs text-gray-400 ml-2">(Admin only can edit)</span>
                                    )}
                                  </p>
                                  {(task.startDate || task.dueDate) && (
                                    <div className="flex items-center gap-4">
                                      {task.startDate && (
                                        <span>
                                          <span className="font-medium">Start:</span> {task.startDate}
                                        </span>
                                      )}
                                      {task.dueDate && (
                                        <span>
                                          <span className="font-medium">Due:</span> {task.dueDate}
                                        </span>
                                      )}
                                      {task.dateCompleted && (
                                        <span className="text-green-600">
                                          ✓ Completed: {task.dateCompleted}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              )}
                              {viewMode === 'internal' && !task.showToClient && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded mt-2">
                                  🔒 Internal Only
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Progress Bar */}
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-semibold text-gray-900">
              Overall Project Progress
            </h3>
            <span className="text-2xl font-bold text-blue-600">
              {progressPercentage}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-6 rounded-full flex items-center justify-center transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            >
              {progressPercentage > 10 && (
                <span className="text-white text-sm font-medium">
                  {completedTasks} of {totalTasks} tasks
                </span>
              )}
            </div>
          </div>
          <p className="mt-3 text-sm text-gray-600 text-center">
            {completedTasks} completed • {totalTasks - completedTasks} remaining
          </p>
        </div>
      </div>
    </div>
  );
};

// ============== MAIN APP COMPONENT ==============
const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [selectedProject, setSelectedProject] = useState(null);
  const [view, setView] = useState('list');

  const handleLogin = (newToken, newUser) => {
    setToken(newToken);
    setUser(newUser);
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    setSelectedProject(null);
    setView('list');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setView('tracker');
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setView('list');
  };

  if (!token) {
    return <AuthScreen onLogin={handleLogin} />;
  }

  if (view === 'tracker' && selectedProject) {
    return (
      <ProjectTracker
        token={token}
        user={user}
        project={selectedProject}
        onBack={handleBackToList}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <ProjectList
      token={token}
      user={user}
      onSelectProject={handleSelectProject}
      onLogout={handleLogout}
    />
  );
};

// Render the app
ReactDOM.createRoot(document.getElementById('root')).render(<App />);
