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

  deleteProject: (token, projectId) =>
    fetch(`${API_URL}/api/projects/${projectId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  exportProject: (token, projectId) => {
    window.open(`${API_URL}/api/projects/${projectId}/export`, '_blank');
  },

  getReportingData: (token) =>
    fetch(`${API_URL}/api/reporting`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  getTeamMembers: (token) =>
    fetch(`${API_URL}/api/team-members`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  addSubtask: (token, projectId, taskId, subtask) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks/${taskId}/subtasks`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(subtask)
    }).then(r => r.json()),

  updateSubtask: (token, projectId, taskId, subtaskId, updates) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }).then(r => r.json()),

  deleteSubtask: (token, projectId, taskId, subtaskId) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  bulkUpdateTasks: (token, projectId, taskIds, completed) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks/bulk-update`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ taskIds, completed })
    }).then(r => r.json()),

  forgotPassword: (email) =>
    fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).then(r => r.json()),

  getUsers: (token) =>
    fetch(`${API_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  updateUser: (token, userId, updates) =>
    fetch(`${API_URL}/api/users/${userId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }).then(r => r.json()),

  deleteUser: (token, userId) =>
    fetch(`${API_URL}/api/users/${userId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  createUser: (token, userData) =>
    fetch(`${API_URL}/api/users`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(userData)
    }).then(r => r.json()),

  addNote: (token, projectId, taskId, content) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks/${taskId}/notes`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    }).then(r => r.json()),

  getTemplates: (token) =>
    fetch(`${API_URL}/api/templates`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  getTemplate: (token, templateId) =>
    fetch(`${API_URL}/api/templates/${templateId}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  updateTemplate: (token, templateId, updates) =>
    fetch(`${API_URL}/api/templates/${templateId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    }).then(r => r.json()),

  createTemplate: (token, templateData) =>
    fetch(`${API_URL}/api/templates`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(templateData)
    }).then(r => r.json()),

  deleteTemplate: (token, templateId) =>
    fetch(`${API_URL}/api/templates/${templateId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  testHubSpotConnection: (token) =>
    fetch(`${API_URL}/api/hubspot/test`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  getHubSpotPipelines: (token) =>
    fetch(`${API_URL}/api/hubspot/pipelines`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  getHubSpotStageMapping: (token) =>
    fetch(`${API_URL}/api/hubspot/stage-mapping`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  saveHubSpotStageMapping: (token, pipelineId, mapping) =>
    fetch(`${API_URL}/api/hubspot/stage-mapping`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ pipelineId, mapping })
    }).then(r => r.json())
};

// ============== LOGIN/SIGNUP COMPONENT ==============
const AuthScreen = ({ onLogin }) => {
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setMessage('');
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
      } else if (mode === 'forgot') {
        result = await api.forgotPassword(email);
        if (result.message) {
          setMessage(result.message);
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
      if (result.error) setError(result.error);
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-blue-100 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-md">
        <h1 className="text-3xl font-bold mb-2">New Client Launch Implementation App</h1>
        <p className="text-gray-600 mb-6">Thrive 365 Labs</p>


        {mode === 'forgot' && (
          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded mb-4 text-sm">
            <p className="text-yellow-800">Enter your email to receive password reset instructions.</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {message && (
          <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded mb-4">
            {message}
          </div>
        )}

        <div className="space-y-4">
          {mode === 'signup' && (
            <div>
              <label className="block text-sm font-medium mb-2">Full Name (First and Last)</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="e.g., John Smith"
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

          {mode !== 'forgot' && (
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
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:bg-gray-400"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : mode === 'signup' ? 'Create Account' : 'Reset Password'}
          </button>

          <div className="text-center space-y-2">
            {mode === 'login' && (
              <button
                onClick={() => { setMode('forgot'); setError(''); setMessage(''); }}
                className="text-gray-500 hover:underline text-sm block w-full"
              >
                Forgot Password?
              </button>
            )}
            <button
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setError('');
                setMessage('');
              }}
              className="text-blue-600 hover:underline text-sm"
            >
              {mode === 'login' ? 'Need an account? Sign up' : mode === 'signup' ? 'Already have an account? Login' : 'Back to Login'}
            </button>
          </div>
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Designed by Bianca G. C. Ume, MD, MBA, MS</p>
        </div>
      </div>
    </div>
  );
};

// ============== STATUS BADGE COMPONENT ==============
const StatusBadge = ({ status }) => {
  const statusConfig = {
    active: { label: 'In Progress', bg: 'bg-blue-100', text: 'text-blue-800', dot: 'bg-blue-500' },
    paused: { label: 'Paused', bg: 'bg-yellow-100', text: 'text-yellow-800', dot: 'bg-yellow-500' },
    completed: { label: 'Completed', bg: 'bg-green-100', text: 'text-green-800', dot: 'bg-green-500' }
  };
  const config = statusConfig[status] || statusConfig.active;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot}`}></span>
      {config.label}
    </span>
  );
};

// ============== PROJECT LIST COMPONENT ==============
const ProjectList = ({ token, user, onSelectProject, onLogout, onManageUsers, onManageTemplates, onManageHubSpot, onViewReporting }) => {
  const [projects, setProjects] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [loading, setLoading] = useState(true);
  const [templates, setTemplates] = useState([]);
  const [editingProject, setEditingProject] = useState(null);
  const [newProject, setNewProject] = useState({
    name: '',
    clientName: '',
    projectManager: '',
    hubspotRecordId: '',
    hubspotDealStage: '',
    template: ''
  });

  useEffect(() => {
    loadProjects();
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    try {
      const data = await api.getTemplates(token);
      setTemplates(data);
      if (data.length > 0) {
        const defaultTemplate = data.find(t => t.isDefault) || data[0];
        setNewProject(prev => ({ ...prev, template: defaultTemplate.id }));
      }
    } catch (err) {
      console.error('Failed to load templates:', err);
    }
  };

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
      const defaultTemplate = templates.find(t => t.isDefault) || templates[0];
      setNewProject({
        name: '',
        clientName: '',
        projectManager: '',
        hubspotRecordId: '',
        hubspotDealStage: '',
        template: defaultTemplate?.id || ''
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

  const handleEditProject = async () => {
    if (!editingProject) return;
    try {
      await api.updateProject(token, editingProject.id, {
        name: editingProject.name,
        clientName: editingProject.clientName,
        projectManager: editingProject.projectManager,
        hubspotRecordId: editingProject.hubspotRecordId,
        status: editingProject.status
      });
      setEditingProject(null);
      loadProjects();
    } catch (err) {
      console.error('Failed to update project:', err);
      alert('Failed to update project');
    }
  };

  const handleDeleteProject = async (project) => {
    if (!confirm(`Are you sure you want to delete "${project.name}"? This will permanently remove the project and all its tasks.`)) {
      return;
    }
    try {
      await api.deleteProject(token, project.id);
      loadProjects();
    } catch (err) {
      console.error('Failed to delete project:', err);
      alert('Failed to delete project');
    }
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
              {user.role === 'admin' && onManageUsers && (
                <button
                  onClick={onManageUsers}
                  className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                >
                  Manage Users
                </button>
              )}
              {user.role === 'admin' && onManageTemplates && (
                <button
                  onClick={onManageTemplates}
                  className="bg-teal-600 text-white px-4 py-2 rounded-md hover:bg-teal-700"
                >
                  Manage Templates
                </button>
              )}
              {user.role === 'admin' && onManageHubSpot && (
                <button
                  onClick={onManageHubSpot}
                  className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700"
                >
                  HubSpot Settings
                </button>
              )}
              {onViewReporting && (
                <button
                  onClick={onViewReporting}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
                >
                  Reports
                </button>
              )}
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
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Select Template *</label>
              <select
                value={newProject.template}
                onChange={(e) => setNewProject({...newProject, template: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              >
                {templates.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.name} ({t.taskCount} tasks){t.isDefault ? ' - Default' : ''}
                  </option>
                ))}
              </select>
            </div>
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
                <label className="block text-sm font-medium mb-1">Project Manager (First and Last Name)</label>
                <input
                  placeholder="e.g., Thomas Johnson"
                  value={newProject.projectManager}
                  onChange={(e) => setNewProject({...newProject, projectManager: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="font-medium text-blue-900 mb-2">HubSpot Integration</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium mb-1">HubSpot Record ID</label>
                    <input
                      placeholder="e.g., 12345678"
                      value={newProject.hubspotRecordId}
                      onChange={(e) => setNewProject({...newProject, hubspotRecordId: e.target.value})}
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
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-bold text-gray-900">{project.name}</h3>
                  <div className="flex items-center gap-2">
                    {project.status === 'completed' && project.launchDurationWeeks && (
                      <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
                        {project.launchDurationWeeks} weeks
                      </span>
                    )}
                    <StatusBadge status={project.status || 'active'} />
                  </div>
                </div>
                <p className="text-gray-600 mb-4">{project.clientName}</p>

                <div className="space-y-2 text-sm text-gray-500 mb-4">
                  {project.projectManager && (
                    <p><span className="font-medium">On-Site Project Manager:</span> {project.projectManager}</p>
                  )}
                  {project.hubspotRecordId && (
                    <p><span className="font-medium">HubSpot Record:</span> {project.hubspotRecordId}</p>
                  )}
                  <p className="text-xs text-gray-400">Template: {project.templateName || project.template}</p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => onSelectProject(project)}
                    className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                  >
                    Open Tracker
                  </button>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingProject({...project})}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => copyClientLink(project.clientLinkSlug || project.clientLinkId)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 text-sm"
                    >
                      Copy Client Link
                    </button>
                  </div>
                  {user.role === 'admin' && (
                    <button
                      onClick={() => handleDeleteProject(project)}
                      className="w-full bg-red-50 text-red-600 py-2 rounded-md hover:bg-red-100 text-sm"
                    >
                      Delete Project
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {editingProject && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Edit Project</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Project Name</label>
                  <input
                    value={editingProject.name}
                    onChange={(e) => setEditingProject({...editingProject, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Client Name</label>
                  <input
                    value={editingProject.clientName}
                    onChange={(e) => setEditingProject({...editingProject, clientName: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">On-Site Project Manager</label>
                  <input
                    value={editingProject.projectManager || ''}
                    onChange={(e) => setEditingProject({...editingProject, projectManager: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">HubSpot Record ID</label>
                  <input
                    value={editingProject.hubspotRecordId || ''}
                    onChange={(e) => setEditingProject({...editingProject, hubspotRecordId: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Project Status</label>
                  <select
                    value={editingProject.status || 'active'}
                    onChange={(e) => setEditingProject({...editingProject, status: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="active">In Progress</option>
                    <option value="paused">Paused</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleEditProject}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
                <button
                  onClick={() => setEditingProject(null)}
                  className="flex-1 bg-gray-300 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      <footer className="mt-8 py-4 text-center text-sm text-gray-500 border-t">
        <p>Designed by Bianca G. C. Ume, MD, MBA, MS</p>
      </footer>
    </div>
  );
};

// ============== TIMELINE VIEW COMPONENT (Phase/Stage Grouped) ==============
const phaseNames = {
  'Phase 0': 'Phase 0: Contract Signature',
  'Phase 1': 'Phase 1: Pre-Launch',
  'Phase 2': 'Phase 2: Implementation Sprints',
  'Phase 3': 'Phase 3: Go-Live',
  'Phase 4': 'Phase 4: Post-Launch Optimization'
};

const TimelineView = ({ tasks, getPhaseColor, viewMode }) => {
  const groupedByPhase = {};
  
  tasks.forEach(task => {
    const phase = task.phase || 'No Phase';
    if (!groupedByPhase[phase]) {
      groupedByPhase[phase] = {};
    }
    const stage = task.stage || 'General';
    if (!groupedByPhase[phase][stage]) {
      groupedByPhase[phase][stage] = [];
    }
    groupedByPhase[phase][stage].push(task);
  });

  const phases = [...new Set(tasks.map(t => t.phase || 'No Phase'))].sort();

  const getTaskName = (task) =>
    (viewMode === 'client' && task.clientName) ? task.clientName : task.taskTitle;

  const isTaskOverdue = (task) => {
    if (task.completed || !task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    return dueDate < today;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-2xl font-bold mb-6">Project Timeline</h2>
      
      <div className="space-y-8">
        {phases.map(phase => {
          const phaseData = groupedByPhase[phase];
          if (!phaseData || Object.keys(phaseData).length === 0) return null;
          
          const phaseTasks = Object.values(phaseData).flat();
          const completedCount = phaseTasks.filter(t => t.completed).length;
          const totalCount = phaseTasks.length;
          
          return (
            <div key={phase} className={`border-l-4 ${getPhaseColor(phase)} pl-6`}>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-gray-900">{phaseNames[phase] || phase}</h3>
                <p className="text-sm text-gray-600">
                  {completedCount} of {totalCount} complete ({totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%)
                </p>
              </div>
              
              <div className="space-y-4">
                {Object.entries(phaseData).map(([stage, stageTasks]) => (
                  <div key={stage} className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-semibold text-gray-800 mb-3">{stage}</h4>
                    <div className="space-y-2">
                      {stageTasks.map(task => (
                        <div 
                          key={task.id} 
                          className={`flex items-start gap-3 p-3 rounded-lg ${
                            task.completed ? 'bg-green-50' : 
                            (viewMode === 'internal' && isTaskOverdue(task)) ? 'bg-red-50 border-red-300' : 'bg-white'
                          } border border-gray-200`}
                        >
                          <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                            task.completed 
                              ? 'bg-green-500 text-white' 
                              : 'border-2 border-gray-300'
                          }`}>
                            {task.completed && <span className="text-xs">✓</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h5 className={`font-medium ${
                              task.completed ? 'text-gray-500 line-through' : 'text-gray-900'
                            }`}>
                              {getTaskName(task)}
                            </h5>
                            {viewMode === 'internal' && (
                              <div className="mt-1 flex flex-wrap gap-3 text-xs text-gray-500">
                                {task.dueDate && <span>Due: {task.dueDate}</span>}
                                {task.dateCompleted && (
                                  <span className="text-green-600">Completed: {task.dateCompleted}</span>
                                )}
                                {task.owner && <span>Owner: {getOwnerName ? getOwnerName(task.owner) : task.owner}</span>}
                              </div>
                            )}
                            {viewMode === 'client' && task.dateCompleted && (
                              <p className="mt-1 text-xs text-green-600">
                                Completed: {task.dateCompleted}
                              </p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============== CALENDAR VIEW COMPONENT ==============
const CalendarView = ({ tasks, viewMode, onScrollToTask }) => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarMode, setCalendarMode] = useState('month');

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDayOfWeek = firstDay.getDay();
    return { daysInMonth, startingDayOfWeek, year, month };
  };

  const { daysInMonth, startingDayOfWeek, year, month } = getDaysInMonth(selectedDate);

  const getTasksForDateStr = (dateStr) => {
    return tasks.filter(t => t.dueDate === dateStr || t.dateCompleted === dateStr);
  };

  const getTasksForDay = (day) => {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    return getTasksForDateStr(dateStr);
  };

  const prevPeriod = () => {
    if (calendarMode === 'month') {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1));
    } else if (calendarMode === 'week') {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 7));
    } else {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() - 1));
    }
  };

  const nextPeriod = () => {
    if (calendarMode === 'month') {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1));
    } else if (calendarMode === 'week') {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 7));
    } else {
      setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate() + 1));
    }
  };

  const goToToday = () => setSelectedDate(new Date());

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  const currentDateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`;
  const dayViewTasks = getTasksForDateStr(currentDateStr);

  const getWeekDates = () => {
    const startOfWeek = new Date(selectedDate);
    startOfWeek.setDate(selectedDate.getDate() - selectedDate.getDay());
    const weekDates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      weekDates.push(d);
    }
    return weekDates;
  };

  const weekDates = getWeekDates();
  const weekStart = weekDates[0];
  const weekEnd = weekDates[6];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold">
            {calendarMode === 'month' 
              ? `${monthNames[month]} ${year}`
              : calendarMode === 'week'
              ? `${monthNames[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekStart.getMonth() !== weekEnd.getMonth() ? monthNames[weekEnd.getMonth()] + ' ' : ''}${weekEnd.getDate()}, ${weekEnd.getFullYear()}`
              : `${monthNames[selectedDate.getMonth()]} ${selectedDate.getDate()}, ${selectedDate.getFullYear()}`
            }
          </h2>
          <button onClick={goToToday} className="text-sm text-blue-600 hover:underline">
            Today
          </button>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setCalendarMode('day')}
              className={`px-3 py-1 rounded text-sm ${calendarMode === 'day' ? 'bg-white shadow' : ''}`}
            >
              Day
            </button>
            <button
              onClick={() => setCalendarMode('week')}
              className={`px-3 py-1 rounded text-sm ${calendarMode === 'week' ? 'bg-white shadow' : ''}`}
            >
              Week
            </button>
            <button
              onClick={() => setCalendarMode('month')}
              className={`px-3 py-1 rounded text-sm ${calendarMode === 'month' ? 'bg-white shadow' : ''}`}
            >
              Month
            </button>
          </div>
          <div className="flex gap-1">
            <button onClick={prevPeriod} className="p-2 hover:bg-gray-100 rounded-lg">←</button>
            <button onClick={nextPeriod} className="p-2 hover:bg-gray-100 rounded-lg">→</button>
          </div>
        </div>
      </div>

      {calendarMode === 'month' ? (
        <>
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
              const dayTasks = getTasksForDay(day);
              const isToday = new Date().getDate() === day && 
                             new Date().getMonth() === month && 
                             new Date().getFullYear() === year;
              return (
                <div
                  key={day}
                  onClick={() => {
                    setSelectedDate(new Date(year, month, day));
                    setCalendarMode('day');
                  }}
                  className={`aspect-square border rounded-lg p-2 cursor-pointer ${
                    isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  } hover:border-blue-300 transition-colors`}
                >
                  <div className={`text-sm font-semibold mb-1 ${
                    isToday ? 'text-blue-600' : 'text-gray-700'
                  }`}>
                    {day}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 2).map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          viewMode === 'internal' && onScrollToTask && onScrollToTask(task.id);
                        }}
                        className={`text-xs px-1 py-0.5 rounded truncate ${
                          task.completed ? 'bg-green-200 text-green-800' : 'bg-blue-100 text-blue-800'
                        } ${viewMode === 'internal' ? 'cursor-pointer hover:opacity-80' : ''}`}
                        title={task.taskTitle}
                      >
                        {task.taskTitle.substring(0, 12)}{task.taskTitle.length > 12 ? '...' : ''}
                      </div>
                    ))}
                    {dayTasks.length > 2 && (
                      <div className="text-xs text-gray-500">+{dayTasks.length - 2} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : calendarMode === 'week' ? (
        <>
          <div className="grid grid-cols-7 gap-2 mb-2">
            {dayNames.map(day => (
              <div key={day} className="text-center text-sm font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {weekDates.map((date, idx) => {
              const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const dayTasks = getTasksForDateStr(dateStr);
              const isToday = new Date().toDateString() === date.toDateString();
              return (
                <div
                  key={idx}
                  onClick={() => {
                    setSelectedDate(date);
                    setCalendarMode('day');
                  }}
                  className={`min-h-[150px] border rounded-lg p-2 cursor-pointer ${
                    isToday ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                  } hover:border-blue-300 transition-colors`}
                >
                  <div className={`text-sm font-semibold mb-2 ${isToday ? 'text-blue-600' : 'text-gray-700'}`}>
                    {date.getDate()}
                  </div>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 4).map(task => (
                      <div
                        key={task.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          viewMode === 'internal' && onScrollToTask && onScrollToTask(task.id);
                        }}
                        className={`text-xs px-1 py-0.5 rounded truncate ${
                          task.completed ? 'bg-green-200 text-green-800' : 'bg-blue-100 text-blue-800'
                        } ${viewMode === 'internal' ? 'cursor-pointer hover:opacity-80' : ''}`}
                        title={task.taskTitle}
                      >
                        {task.taskTitle.substring(0, 15)}{task.taskTitle.length > 15 ? '...' : ''}
                      </div>
                    ))}
                    {dayTasks.length > 4 && (
                      <div className="text-xs text-gray-500">+{dayTasks.length - 4} more</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
        <div className="space-y-3">
          <div className="text-lg font-medium text-gray-700 mb-4">
            {dayNames[selectedDate.getDay()]}, {monthNames[selectedDate.getMonth()]} {selectedDate.getDate()}
          </div>
          {dayViewTasks.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No tasks scheduled for this day</p>
          ) : (
            dayViewTasks.map(task => (
              <div
                key={task.id}
                onClick={() => viewMode === 'internal' && onScrollToTask && onScrollToTask(task.id)}
                className={`p-4 rounded-lg border ${
                  task.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
                } ${viewMode === 'internal' ? 'cursor-pointer hover:shadow-md' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                    task.completed ? 'bg-green-500 text-white' : 'border-2 border-gray-300'
                  }`}>
                    {task.completed && <span className="text-xs">✓</span>}
                  </div>
                  <div className="flex-1">
                    <h4 className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {task.taskTitle}
                    </h4>
                    <div className="mt-1 text-sm text-gray-500 flex flex-wrap gap-3">
                      {task.owner && <span>Owner: {getOwnerName ? getOwnerName(task.owner) : task.owner}</span>}
                      {task.dueDate && <span>Due: {task.dueDate}</span>}
                      {task.dateCompleted && <span className="text-green-600">Completed: {task.dateCompleted}</span>}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

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
  const [viewMode, setViewMode] = useState('internal');
  const [viewType, setViewType] = useState('list');
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhase, setSelectedPhase] = useState('all');
  const [selectedOwner, setSelectedOwner] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ taskTitle: '', owner: '', dueDate: '', phase: 'Phase 1', stage: '', showToClient: false, clientName: '', dependencies: [] });
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [newSubtask, setNewSubtask] = useState({ taskId: null, title: '', owner: '' });
  const [expandedSubtasksId, setExpandedSubtasksId] = useState(null);

  const isAdmin = user.role === 'admin';

  useEffect(() => {
    loadTasks();
    loadTeamMembers();
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

  const loadTeamMembers = async () => {
    try {
      const data = await api.getTeamMembers(token);
      setTeamMembers(data);
    } catch (err) {
      console.error('Failed to load team members:', err);
    }
  };

  const getOwnerName = (email) => {
    if (!email) return 'Unassigned';
    const member = teamMembers.find(m => m.email === email);
    return member ? member.name : email;
  };

  const handleBulkComplete = async (completed) => {
    if (selectedTasks.length === 0) return;
    try {
      await api.bulkUpdateTasks(token, project.id, selectedTasks, completed);
      await loadTasks();
      setSelectedTasks([]);
      setBulkMode(false);
    } catch (err) {
      console.error('Failed to bulk update tasks:', err);
    }
  };

  const toggleTaskSelection = (taskId) => {
    if (selectedTasks.includes(taskId)) {
      setSelectedTasks(selectedTasks.filter(id => id !== taskId));
    } else {
      setSelectedTasks([...selectedTasks, taskId]);
    }
  };

  const selectAllTasks = () => {
    const filteredTaskIds = getFilteredTasks().map(t => t.id);
    setSelectedTasks(filteredTaskIds);
  };

  const deselectAllTasks = () => {
    setSelectedTasks([]);
  };

  const handleAddSubtask = async (taskId) => {
    if (!newSubtask.title.trim()) return;
    try {
      await api.addSubtask(token, project.id, taskId, {
        title: newSubtask.title,
        owner: newSubtask.owner
      });
      await loadTasks();
      setNewSubtask({ taskId: null, title: '', owner: '' });
    } catch (err) {
      console.error('Failed to add subtask:', err);
    }
  };

  const handleSubtaskStatusChange = async (taskId, subtaskId, status) => {
    try {
      const updates = {
        completed: status === 'completed',
        notApplicable: status === 'not_applicable'
      };
      await api.updateSubtask(token, project.id, taskId, subtaskId, updates);
      await loadTasks();
    } catch (err) {
      console.error('Failed to update subtask:', err);
    }
  };

  const getSubtaskStatus = (subtask) => {
    if (subtask.notApplicable) return 'not_applicable';
    if (subtask.completed) return 'completed';
    return 'pending';
  };

  const hasIncompleteSubtasks = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) return false;
    return task.subtasks.some(s => !s.completed && !s.notApplicable);
  };

  const handleDeleteSubtask = async (taskId, subtaskId) => {
    if (!confirm('Delete this subtask?')) return;
    try {
      await api.deleteSubtask(token, project.id, taskId, subtaskId);
      await loadTasks();
    } catch (err) {
      console.error('Failed to delete subtask:', err);
    }
  };

  const handleToggleComplete = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    const newCompleted = !task.completed;
    
    // Check if this task has incomplete dependencies
    if (newCompleted && task.dependencies && task.dependencies.length > 0) {
      const incompleteDeps = task.dependencies.filter(depId => {
        const depTask = tasks.find(t => t.id === parseInt(depId) || t.id === depId);
        return depTask && !depTask.completed;
      });
      if (incompleteDeps.length > 0) {
        const depNames = incompleteDeps.map(depId => {
          const depTask = tasks.find(t => t.id === parseInt(depId) || t.id === depId);
          return depTask ? `Task ${depId}: ${depTask.taskTitle}` : `Task ${depId}`;
        }).join('\n');
        alert(`Cannot complete this task. The following dependencies must be completed first:\n\n${depNames}`);
        return;
      }
    }

    // Check if this task has incomplete subtasks
    if (newCompleted && hasIncompleteSubtasks(task)) {
      const incompleteSubtasks = task.subtasks.filter(s => !s.completed && !s.notApplicable);
      alert(`Cannot complete this task. The following subtasks must be completed or marked N/A first:\n\n${incompleteSubtasks.map(s => s.title).join('\n')}`);
      return;
    }
    
    const updates = {
      completed: newCompleted,
      dateCompleted: newCompleted && !task.dateCompleted
        ? new Date().toLocaleDateString()
        : task.dateCompleted
    };

    try {
      const result = await api.updateTask(token, project.id, taskId, updates);
      if (result.error) {
        alert(result.error);
        return;
      }
      setTasks(tasks.map(t => t.id === taskId ? {...t, ...updates} : t));
    } catch (err) {
      console.error('Failed to update task:', err);
    }
  };

  const hasIncompleteDependencies = (task) => {
    if (!task.dependencies || task.dependencies.length === 0) return false;
    return task.dependencies.some(depId => {
      const depTask = tasks.find(t => t.id === parseInt(depId) || t.id === depId);
      return depTask && !depTask.completed;
    });
  };

  const isOverdue = (task) => {
    if (task.completed || !task.dueDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dueDate = new Date(task.dueDate);
    return dueDate < today;
  };

  const handleEditTask = (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    setEditingTask({
      id: taskId,
      taskTitle: task.taskTitle,
      dateCompleted: task.dateCompleted || '',
      dueDate: task.dueDate || '',
      owner: task.owner || '',
      showToClient: task.showToClient || false,
      clientName: task.clientName || '',
      dependencies: task.dependencies || []
    });
  };

  const handleSaveEdit = async () => {
    try {
      const task = tasks.find(t => t.id === editingTask.id);
      const updates = {
        taskTitle: editingTask.taskTitle,
        dateCompleted: editingTask.dateCompleted,
        dependencies: editingTask.dependencies
      };

      if (isAdmin) {
        updates.owner = editingTask.owner;
        updates.dueDate = editingTask.dueDate;
        updates.showToClient = editingTask.showToClient;
        updates.clientName = editingTask.clientName;
      } else {
        if (!task.owner || task.owner.trim() === '') {
          updates.owner = editingTask.owner;
        }
        if (!task.dueDate || task.dueDate.trim() === '') {
          updates.dueDate = editingTask.dueDate;
        }
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

  const handleDeleteProjectTask = async (taskId) => {
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    
    if (!confirm('Are you sure you want to delete this task? This cannot be undone.')) return;
    
    try {
      await api.deleteTask(token, project.id, taskId);
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err) {
      console.error('Failed to delete task:', err);
      alert(err.message || 'Failed to delete task. You can only delete tasks you created.');
    }
  };

  const handleAddNote = async (taskId) => {
    if (!newNote.trim()) return;
    try {
      const note = await api.addNote(token, project.id, taskId, newNote);
      setTasks(tasks.map(t => {
        if (t.id === taskId) {
          return { ...t, notes: [...(t.notes || []), note] };
        }
        return t;
      }));
      setNewNote('');
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.taskTitle.trim()) return;
    try {
      const created = await api.createTask(token, project.id, newTask);
      setTasks([...tasks, created]);
      setNewTask({ taskTitle: '', owner: '', dueDate: '', phase: 'Phase 1', stage: '', showToClient: false, clientName: '', dependencies: [] });
      setShowAddTask(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const copyClientLink = () => {
    const link = `${window.location.origin}/client/${project.clientLinkSlug || project.clientLinkId}`;
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

  const getPhaseBackground = (phase) => {
    const colors = {
      'Phase 0': 'bg-purple-500',
      'Phase 1': 'bg-blue-500',
      'Phase 2': 'bg-green-500',
      'Phase 3': 'bg-orange-500',
      'Phase 4': 'bg-pink-500'
    };
    return colors[phase] || 'bg-gray-500';
  };

  const getPhaseGradient = (phase) => {
    const gradients = {
      'Phase 0': 'bg-gradient-to-r from-purple-600 to-purple-700',
      'Phase 1': 'bg-gradient-to-r from-blue-600 to-blue-700',
      'Phase 2': 'bg-gradient-to-r from-green-600 to-green-700',
      'Phase 3': 'bg-gradient-to-r from-orange-600 to-orange-700',
      'Phase 4': 'bg-gradient-to-r from-pink-600 to-pink-700'
    };
    return gradients[phase] || 'bg-gradient-to-r from-gray-600 to-gray-700';
  };

  const getUniqueOwners = () => {
    const owners = tasks
      .map(t => t.owner)
      .filter(owner => owner && owner.trim() !== '');
    return [...new Set(owners)].sort();
  };

  const getFilteredTasks = () => {
    let filtered = viewMode === 'client'
      ? tasks.filter(t => t.showToClient)
      : tasks;

    if (selectedPhase !== 'all') {
      filtered = filtered.filter(t => t.phase === selectedPhase);
    }

    if (viewMode === 'internal' && selectedOwner !== 'all') {
      if (selectedOwner === 'unassigned') {
        filtered = filtered.filter(t => !t.owner || t.owner.trim() === '');
      } else {
        filtered = filtered.filter(t => t.owner === selectedOwner);
      }
    }

    if (selectedStatus !== 'all') {
      if (selectedStatus === 'completed') {
        filtered = filtered.filter(t => t.completed);
      } else if (selectedStatus === 'uncompleted') {
        filtered = filtered.filter(t => !t.completed);
      }
    }

    return filtered;
  };

  const getTaskName = (task) =>
    (viewMode === 'client' && task.clientName) ? task.clientName : task.taskTitle;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const groupedByPhase = getFilteredTasks().reduce((acc, task) => {
    if (!acc[task.phase]) acc[task.phase] = {};
    const stageKey = task.stage || 'General';
    if (!acc[task.phase][stageKey]) acc[task.phase][stageKey] = [];
    acc[task.phase][stageKey].push(task);
    return acc;
  }, {});

  const phaseOrder = ['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];
  const sortedPhases = Object.keys(groupedByPhase).sort((a, b) => 
    phaseOrder.indexOf(a) - phaseOrder.indexOf(b)
  );

  const phases = [...new Set(tasks.map(t => t.phase))];
  const owners = getUniqueOwners();

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
              
              <div className="border-l border-gray-300 mx-2"></div>
              
              <button
                onClick={() => setViewType('list')}
                className={`px-4 py-2 rounded-md ${
                  viewType === 'list'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewType('timeline')}
                className={`px-4 py-2 rounded-md ${
                  viewType === 'timeline'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewType('calendar')}
                className={`px-4 py-2 rounded-md ${
                  viewType === 'calendar'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Calendar
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
                  {window.location.origin}/client/{project.clientLinkSlug || project.clientLinkId}
                </button>
              </div>
              {project.hubspotRecordId && (
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <p>HubSpot Record ID: <span className="font-medium">{project.hubspotRecordId}</span></p>
                  {project.lastHubSpotSync && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Last synced: {new Date(project.lastHubSpotSync).toLocaleString()}
                    </span>
                  )}
                </div>
              )}
            </div>
          )}

          {viewType === 'list' && (
            <div className="mt-4 flex flex-wrap gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Phase Filter</label>
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
                  <label className="block text-xs text-gray-500 mb-1">Owner Filter</label>
                  <select
                    value={selectedOwner}
                    onChange={(e) => setSelectedOwner(e.target.value)}
                    className="px-3 py-2 border rounded-md text-sm"
                  >
                    <option value="all">All Owners</option>
                    <option value="unassigned">Unassigned</option>
                    {owners.map(owner => (
                      <option key={owner} value={owner}>{getOwnerName(owner)}</option>
                    ))}
                  </select>
                </div>
              )}
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status Filter</label>
                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3 py-2 border rounded-md text-sm"
                >
                  <option value="all">All Tasks</option>
                  <option value="completed">Completed</option>
                  <option value="uncompleted">Uncompleted</option>
                </select>
              </div>
              
              {viewMode === 'internal' && (
                <div className="ml-auto flex gap-2">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                    <button
                      onClick={() => {
                        setBulkMode(!bulkMode);
                        if (bulkMode) setSelectedTasks([]);
                      }}
                      className={`px-4 py-2 rounded-md text-sm ${bulkMode ? 'bg-gray-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                    >
                      {bulkMode ? 'Exit Bulk Mode' : 'Bulk Select'}
                    </button>
                  </div>
                  {bulkMode && selectedTasks.length > 0 && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                        <button
                          onClick={() => handleBulkComplete(true)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                        >
                          Mark {selectedTasks.length} Complete
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                        <button
                          onClick={() => handleBulkComplete(false)}
                          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 text-sm"
                        >
                          Mark {selectedTasks.length} Incomplete
                        </button>
                      </div>
                    </>
                  )}
                  {bulkMode && (
                    <>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                        <button
                          onClick={selectAllTasks}
                          className="px-3 py-2 bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 text-sm"
                        >
                          Select All
                        </button>
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                        <button
                          onClick={deselectAllTasks}
                          className="px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 text-sm"
                        >
                          Deselect All
                        </button>
                      </div>
                    </>
                  )}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                    <button
                      onClick={() => setShowAddTask(true)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      + Add Task
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Phase 0: Contract Signature</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Phase 1: Pre-Launch</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Phase 2: Implementation Sprints</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Phase 3: Go-Live</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-pink-500 rounded"></div>
              <span>Phase 4: Post-Launch Optimization</span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Overall Project Progress</h3>
            <span className="text-xl font-bold text-blue-600">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-blue-500 to-blue-600 h-5 rounded-full flex items-center justify-center transition-all duration-500"
              style={{ width: `${progressPercentage}%` }}
            >
              {progressPercentage > 10 && (
                <span className="text-white text-xs font-medium">{completedTasks} of {totalTasks}</span>
              )}
            </div>
          </div>
        </div>

        {viewType === 'timeline' && <TimelineView tasks={getFilteredTasks()} getPhaseColor={getPhaseColor} viewMode={viewMode} />}
        {viewType === 'calendar' && <CalendarView tasks={getFilteredTasks()} viewMode={viewMode} onScrollToTask={(taskId) => { setViewType('list'); setTimeout(() => document.getElementById(`task-${taskId}`)?.scrollIntoView({ behavior: 'smooth' }), 100); }} />}
        
        {viewType === 'list' && (
          <div className="space-y-8">
            {sortedPhases.map(phase => (
              <div key={phase} className="space-y-4">
                <div className={`${getPhaseGradient(phase)} p-3 rounded-lg text-white`}>
                  <h2 className="text-lg font-bold">{phaseNames[phase] || phase}</h2>
                  <p className="text-sm opacity-80">
                    {Object.values(groupedByPhase[phase]).flat().filter(t => t.completed).length} of {Object.values(groupedByPhase[phase]).flat().length} complete
                  </p>
                </div>
                {Object.entries(groupedByPhase[phase]).map(([stageName, stageTasks]) => (
                  <div key={stageName} className={`bg-white rounded-lg shadow-sm overflow-hidden border-l-4 ${getPhaseColor(phase)}`}>
                    <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-700">{stageName}</h3>
                        <p className="text-xs text-gray-500">
                          {stageTasks.filter(t => t.completed).length} of {stageTasks.length} complete
                        </p>
                      </div>
                      {viewMode === 'internal' && (
                        <button
                          onClick={() => {
                            setNewTask({
                              ...newTask,
                              phase: phase,
                              stage: stageName
                            });
                            setShowAddTask(true);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          + Add Task
                        </button>
                      )}
                    </div>
                    <div className="divide-y divide-gray-200">
                      {stageTasks.map(task => (
                    <div key={task.id} id={`task-${task.id}`} className={`p-4 ${viewMode === 'internal' && isOverdue(task) ? 'bg-red-50 hover:bg-red-100' : 'hover:bg-gray-50'} ${selectedTasks.includes(task.id) ? 'bg-blue-50' : ''}`}>
                      <div className="flex items-start gap-4">
                        {viewMode === 'internal' && bulkMode && (
                          <input
                            type="checkbox"
                            checked={selectedTasks.includes(task.id)}
                            onChange={() => toggleTaskSelection(task.id)}
                            className="mt-2 w-5 h-5 flex-shrink-0"
                          />
                        )}
                        {viewMode === 'internal' && !bulkMode && (
                          <button
                            onClick={() => handleToggleComplete(task.id)}
                            className="mt-1 flex-shrink-0"
                            title={hasIncompleteDependencies(task) ? 'Complete dependencies first' : ''}
                          >
                            {task.completed ? (
                              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">
                                ✓
                              </div>
                            ) : hasIncompleteDependencies(task) ? (
                              <div className="w-6 h-6 border-2 border-orange-300 bg-orange-50 rounded-full flex items-center justify-center text-orange-400 text-xs cursor-not-allowed" title="Dependencies incomplete">
                                ⏳
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-gray-300 rounded-full hover:border-gray-400" />
                            )}
                          </button>
                        )}
                        {viewMode === 'client' && (
                          <div className="mt-1 flex-shrink-0">
                            {task.completed ? (
                              <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center text-white text-sm">
                                ✓
                              </div>
                            ) : (
                              <div className="w-6 h-6 border-2 border-gray-300 rounded-full" />
                            )}
                          </div>
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
                                placeholder="Task Title"
                              />
                              <div className="grid grid-cols-2 gap-3">
                                {(isAdmin || !task.owner || task.owner.trim() === '') && (
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Owner</label>
                                    <select
                                      value={editingTask.owner}
                                      onChange={(e) =>
                                        setEditingTask({...editingTask, owner: e.target.value})
                                      }
                                      className="w-full px-3 py-2 border rounded-md"
                                    >
                                      <option value="">Unassigned</option>
                                      {teamMembers.map(member => (
                                        <option key={member.email} value={member.email}>{member.name}</option>
                                      ))}
                                    </select>
                                  </div>
                                )}
                                {(isAdmin || !task.dueDate || task.dueDate.trim() === '') && (
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Due Date</label>
                                    <input
                                      type="date"
                                      value={editingTask.dueDate}
                                      onChange={(e) =>
                                        setEditingTask({...editingTask, dueDate: e.target.value})
                                      }
                                      className="w-full px-3 py-2 border rounded-md"
                                    />
                                  </div>
                                )}
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Date Completed</label>
                                  <input
                                    type="date"
                                    value={editingTask.dateCompleted}
                                    onChange={(e) =>
                                      setEditingTask({...editingTask, dateCompleted: e.target.value})
                                    }
                                    className="w-full px-3 py-2 border rounded-md"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs text-gray-500 mb-1">Dependencies</label>
                                  <select
                                    multiple
                                    value={editingTask.dependencies || []}
                                    onChange={(e) => {
                                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                                      setEditingTask({...editingTask, dependencies: selected});
                                    }}
                                    className="w-full px-3 py-2 border rounded-md h-24"
                                  >
                                    {tasks.filter(t => t.id !== editingTask.id).map(t => (
                                      <option key={t.id} value={String(t.id)}>
                                        {t.id}: {t.taskTitle.substring(0, 40)}{t.taskTitle.length > 40 ? '...' : ''}
                                      </option>
                                    ))}
                                  </select>
                                  <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
                                </div>
                              </div>
                              {isAdmin && (
                                <div className="flex items-center gap-4">
                                  <label className="flex items-center gap-2 text-sm">
                                    <input
                                      type="checkbox"
                                      checked={editingTask.showToClient}
                                      onChange={(e) =>
                                        setEditingTask({...editingTask, showToClient: e.target.checked})
                                      }
                                      className="w-4 h-4"
                                    />
                                    Show to Client
                                  </label>
                                  {editingTask.showToClient && (
                                    <input
                                      placeholder="Client-Facing Name"
                                      value={editingTask.clientName}
                                      onChange={(e) =>
                                        setEditingTask({...editingTask, clientName: e.target.value})
                                      }
                                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                                    />
                                  )}
                                </div>
                              )}
                              <div className="flex gap-2">
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
                                <div className="flex gap-2 flex-shrink-0">
                                  {viewMode === 'internal' && (isAdmin || task.createdBy === user.id || !task.createdBy) && (
                                    <button
                                      onClick={() => handleEditTask(task.id)}
                                      className="text-gray-400 hover:text-blue-600"
                                    >
                                      {isAdmin ? 'Edit' : (task.createdBy === user.id ? 'Edit' : 'Update Status')}
                                    </button>
                                  )}
                                  {viewMode === 'internal' && (isAdmin || (task.createdBy && task.createdBy === user.id)) && (
                                    <button
                                      onClick={() => handleDeleteProjectTask(task.id)}
                                      className="text-gray-400 hover:text-red-600"
                                    >
                                      Delete
                                    </button>
                                  )}
                                </div>
                              </div>
                              {viewMode === 'internal' && (
                                <div className="mt-2 space-y-1 text-sm text-gray-600">
                                  <p>
                                    <span className="font-medium">Owner:</span> {getOwnerName(task.owner)}
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
                              {viewMode === 'client' && task.dateCompleted && (
                                <p className="mt-1 text-sm text-green-600">
                                  Completed: {task.dateCompleted}
                                </p>
                              )}
                              {viewMode === 'internal' && !task.showToClient && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded mt-2">
                                  Internal Only
                                </span>
                              )}
                              {viewMode === 'internal' && task.dependencies && task.dependencies.length > 0 && (
                                <div className="mt-2 text-xs text-gray-500">
                                  <span className="font-medium">Dependencies:</span> Task {task.dependencies.join(', ')}
                                </div>
                              )}
                              {viewMode === 'internal' && (
                                <div className="mt-3 flex flex-wrap gap-4">
                                  <button
                                    onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                    className="text-sm text-blue-600 hover:underline"
                                  >
                                    {expandedTaskId === task.id ? 'Hide Notes' : `Notes (${(task.notes || []).length})`}
                                  </button>
                                  <button
                                    onClick={() => setExpandedSubtasksId(expandedSubtasksId === task.id ? null : task.id)}
                                    className="text-sm text-purple-600 hover:underline"
                                  >
                                    {expandedSubtasksId === task.id ? 'Hide Subtasks' : `Subtasks (${(task.subtasks || []).filter(s => s.completed || s.notApplicable).length}/${(task.subtasks || []).length})`}
                                  </button>
                                  <button
                                    onClick={() => setNewSubtask({ taskId: task.id, title: '', owner: '' })}
                                    className="text-sm text-green-600 hover:underline"
                                  >
                                    + Add Subtask
                                  </button>
                                  {hasIncompleteSubtasks(task) && (
                                    <span className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                                      Subtasks incomplete
                                    </span>
                                  )}
                                </div>
                              )}
                              {viewMode === 'internal' && expandedTaskId === task.id && (
                                <div className="w-full mt-2 bg-gray-50 rounded-lg p-3">
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Notes</h4>
                                  <div className="space-y-2 max-h-32 overflow-y-auto mb-3">
                                    {(task.notes || []).length === 0 ? (
                                      <p className="text-sm text-gray-400 italic">No notes yet</p>
                                    ) : (
                                      (task.notes || []).map(note => (
                                        <div key={note.id} className="bg-white p-2 rounded border text-sm">
                                          <p className="text-gray-800">{note.content}</p>
                                          <p className="text-xs text-gray-400 mt-1">
                                            {note.author} - {new Date(note.createdAt).toLocaleString()}
                                          </p>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                  <div className="flex gap-2">
                                    <input
                                      value={newNote}
                                      onChange={(e) => setNewNote(e.target.value)}
                                      placeholder="Add a status update..."
                                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                                    />
                                    <button
                                      onClick={() => handleAddNote(task.id)}
                                      className="px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                                    >
                                      Add
                                    </button>
                                  </div>
                                </div>
                              )}
                              {viewMode === 'internal' && expandedSubtasksId === task.id && (
                                <div className="w-full mt-2 bg-purple-50 rounded-lg p-3">
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Subtasks</h4>
                                  <div className="space-y-2 mb-3">
                                    {(task.subtasks || []).length === 0 ? (
                                      <p className="text-sm text-gray-400 italic">No subtasks</p>
                                    ) : (
                                      (task.subtasks || []).map(subtask => (
                                        <div key={subtask.id} className="flex items-center gap-2 bg-white p-2 rounded border text-sm">
                                          <select
                                            value={getSubtaskStatus(subtask)}
                                            onChange={(e) => handleSubtaskStatusChange(task.id, subtask.id, e.target.value)}
                                            className={`px-2 py-1 border rounded text-xs ${
                                              getSubtaskStatus(subtask) === 'completed' ? 'bg-green-100 text-green-700' :
                                              getSubtaskStatus(subtask) === 'not_applicable' ? 'bg-gray-100 text-gray-600' :
                                              'bg-yellow-50 text-yellow-700'
                                            }`}
                                          >
                                            <option value="pending">Pending</option>
                                            <option value="completed">Complete</option>
                                            <option value="not_applicable">N/A</option>
                                          </select>
                                          <span className={getSubtaskStatus(subtask) !== 'pending' ? 'line-through text-gray-400 flex-1' : 'flex-1'}>
                                            {subtask.title}
                                          </span>
                                          {subtask.owner && (
                                            <span className="text-xs text-gray-500">{getOwnerName(subtask.owner)}</span>
                                          )}
                                          <button
                                            onClick={() => handleDeleteSubtask(task.id, subtask.id)}
                                            className="text-red-400 hover:text-red-600 text-xs"
                                          >
                                            x
                                          </button>
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              )}
                              {viewMode === 'internal' && newSubtask.taskId === task.id && (
                                <div className="w-full mt-2 bg-green-50 rounded-lg p-3">
                                  <h4 className="text-sm font-medium text-gray-700 mb-2">Add New Subtask</h4>
                                  <div className="flex gap-2 flex-wrap">
                                    <input
                                      value={newSubtask.title}
                                      onChange={(e) => setNewSubtask({...newSubtask, title: e.target.value})}
                                      placeholder="Subtask title..."
                                      className="flex-1 min-w-48 px-3 py-2 border rounded-md text-sm"
                                    />
                                    <select
                                      value={newSubtask.owner}
                                      onChange={(e) => setNewSubtask({...newSubtask, owner: e.target.value})}
                                      className="px-2 py-2 border rounded-md text-sm"
                                    >
                                      <option value="">No owner</option>
                                      {teamMembers.map(member => (
                                        <option key={member.email} value={member.email}>{member.name}</option>
                                      ))}
                                    </select>
                                    <button
                                      onClick={() => handleAddSubtask(task.id)}
                                      className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => setNewSubtask({ taskId: null, title: '', owner: '' })}
                                      className="px-3 py-2 bg-gray-300 rounded-md text-sm"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                </div>
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
            ))}
          </div>
        )}

        {showAddTask && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-lg">
              <h2 className="text-xl font-bold mb-4">Add New Task</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Task Title *</label>
                  <input
                    value={newTask.taskTitle}
                    onChange={(e) => setNewTask({...newTask, taskTitle: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Enter task title"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Phase</label>
                    <select
                      value={newTask.phase}
                      onChange={(e) => setNewTask({...newTask, phase: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="Phase 0">Phase 0: Contract Signature</option>
                      <option value="Phase 1">Phase 1: Pre-Launch</option>
                      <option value="Phase 2">Phase 2: Implementation Sprints</option>
                      <option value="Phase 3">Phase 3: Go-Live</option>
                      <option value="Phase 4">Phase 4: Post-Launch Optimization</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Stage</label>
                    <select
                      value={newTask.stage}
                      onChange={(e) => setNewTask({...newTask, stage: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">-- Select Stage --</option>
                      <option value="Contract Signature">Contract Signature</option>
                      <option value="Project Kick Off & Stakeholder Alignment">Project Kick Off & Stakeholder Alignment</option>
                      <option value="Launch Data & Systems Prep">Launch Data & Systems Prep</option>
                      <option value="Sprint 1: Core System Setups">Sprint 1: Core System Setups</option>
                      <option value="Sprint 2: Lab & QUA Pilot Prep">Sprint 2: Lab & QUA Pilot Prep</option>
                      <option value="Sprint 3: Soft-Pilot">Sprint 3: Soft-Pilot</option>
                      <option value="Training/Validation">Training/Validation</option>
                      <option value="Go-Live">Go-Live</option>
                      <option value="KPIs">KPIs</option>
                      <option value="Monitoring & Customer Support">Monitoring & Customer Support</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Owner</label>
                    <select
                      value={newTask.owner}
                      onChange={(e) => setNewTask({...newTask, owner: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Unassigned</option>
                      {teamMembers.map(member => (
                        <option key={member.email} value={member.email}>{member.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Due Date</label>
                    <input
                      type="date"
                      value={newTask.dueDate}
                      onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Dependencies</label>
                  <select
                    multiple
                    value={newTask.dependencies || []}
                    onChange={(e) => {
                      const selected = Array.from(e.target.selectedOptions, option => option.value);
                      setNewTask({...newTask, dependencies: selected});
                    }}
                    className="w-full px-3 py-2 border rounded-md h-24"
                  >
                    {tasks.map(t => (
                      <option key={t.id} value={String(t.id)}>
                        {t.id}: {t.taskTitle.substring(0, 40)}{t.taskTitle.length > 40 ? '...' : ''}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">Hold Ctrl/Cmd to select multiple</p>
                </div>
                {isAdmin && (
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={newTask.showToClient}
                        onChange={(e) => setNewTask({...newTask, showToClient: e.target.checked})}
                        className="w-4 h-4"
                      />
                      Show to Client
                    </label>
                    {newTask.showToClient && (
                      <input
                        value={newTask.clientName}
                        onChange={(e) => setNewTask({...newTask, clientName: e.target.value})}
                        className="flex-1 px-3 py-2 border rounded-md text-sm"
                        placeholder="Client-facing name"
                      />
                    )}
                  </div>
                )}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => setShowAddTask(false)}
                    className="px-4 py-2 bg-gray-200 rounded-md hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateTask}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============== USER MANAGEMENT COMPONENT (Admin Only) ==============
const UserManagement = ({ token, user, onBack, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user' });
  const [addError, setAddError] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await api.getUsers(token);
      setUsers(data);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    if (!newUser.name.trim() || !newUser.email.trim() || !newUser.password.trim()) {
      setAddError('Name, email, and password are required');
      return;
    }
    if (newUser.password.length < 8) {
      setAddError('Password must be at least 8 characters');
      return;
    }
    try {
      const result = await api.createUser(token, newUser);
      if (result.error) {
        setAddError(result.error);
        return;
      }
      await loadUsers();
      setNewUser({ name: '', email: '', password: '', role: 'user' });
      setShowAddUser(false);
      setAddError('');
    } catch (err) {
      console.error('Failed to create user:', err);
      setAddError('Failed to create user');
    }
  };

  const handleSaveUser = async () => {
    try {
      const updates = {
        name: editingUser.name,
        email: editingUser.email,
        role: editingUser.role
      };
      if (editingUser.newPassword) {
        updates.password = editingUser.newPassword;
      }
      await api.updateUser(token, editingUser.id, updates);
      await loadUsers();
      setEditingUser(null);
    } catch (err) {
      console.error('Failed to update user:', err);
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.deleteUser(token, userId);
      await loadUsers();
    } catch (err) {
      console.error('Failed to delete user:', err);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading users...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <button
                onClick={onBack}
                className="text-blue-600 hover:underline mb-2 flex items-center gap-1"
              >
                ← Back to Projects
              </button>
              <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
              <p className="text-gray-600">Manage team member accounts</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddUser(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                + Add User
              </button>
              <button
                onClick={onLogout}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {showAddUser && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Add New User</h2>
            {addError && (
              <div className="bg-red-50 text-red-600 p-3 rounded mb-4">{addError}</div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  value={newUser.name}
                  onChange={(e) => setNewUser({...newUser, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email *</label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Password *</label>
                <input
                  type="password"
                  value={newUser.password}
                  onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Password"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Role</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create User
              </button>
              <button
                onClick={() => { setShowAddUser(false); setAddError(''); setNewUser({ name: '', email: '', password: '', role: 'user' }); }}
                className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  {editingUser?.id === u.id ? (
                    <>
                      <td className="px-6 py-4">
                        <input
                          value={editingUser.name}
                          onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <input
                          value={editingUser.email}
                          onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                          className="w-full px-2 py-1 border rounded"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={editingUser.role}
                          onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                          className="px-2 py-1 border rounded"
                        >
                          <option value="user">User</option>
                          <option value="admin">Admin</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <input
                          type="password"
                          placeholder="New password (optional)"
                          value={editingUser.newPassword || ''}
                          onChange={(e) => setEditingUser({...editingUser, newPassword: e.target.value})}
                          className="w-full px-2 py-1 border rounded text-sm"
                        />
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={handleSaveUser}
                          className="text-green-600 hover:underline text-sm"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingUser(null)}
                          className="text-gray-500 hover:underline text-sm"
                        >
                          Cancel
                        </button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                      <td className="px-6 py-4 text-gray-600">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                        }`}>
                          {u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-sm">
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                      </td>
                      <td className="px-6 py-4 text-right space-x-2">
                        <button
                          onClick={() => setEditingUser({...u, newPassword: ''})}
                          className="text-blue-600 hover:underline text-sm"
                        >
                          Edit
                        </button>
                        {u.id !== user.id && (
                          <button
                            onClick={() => handleDeleteUser(u.id)}
                            className="text-red-600 hover:underline text-sm"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

// ============== MAIN APP COMPONENT ==============
// ============== TEMPLATE MANAGEMENT COMPONENT ==============
const TemplateManagement = ({ token, user, onBack, onLogout }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [showCreateTemplate, setShowCreateTemplate] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState('');
  const [newTemplateDesc, setNewTemplateDesc] = useState('');

  const STANDARD_STAGES = [
    'Contract Signature',
    'Project Kick Off & Stakeholder Alignment',
    'Launch Data & Systems Prep',
    'Sprint 1: Core System Setups',
    'Sprint 2: Lab & QUA Pilot Prep',
    'Sprint 3: Soft-Pilot',
    'Training/Validation',
    'Go-Live',
    'KPIs',
    'Monitoring & Customer Support'
  ];

  const getUniqueStages = () => {
    return STANDARD_STAGES;
  };

  const handleSaveName = async () => {
    if (!selectedTemplate || !tempName.trim()) return;
    setSaving(true);
    try {
      await api.updateTemplate(token, selectedTemplate.id, { name: tempName.trim() });
      setSelectedTemplate({ ...selectedTemplate, name: tempName.trim() });
      setEditingName(false);
    } catch (err) {
      console.error('Failed to save template name:', err);
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadTemplates();
  }, []);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const data = await api.getTemplates(token);
      setTemplates(data);
    } catch (err) {
      console.error('Failed to load templates:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadTemplateDetails = async (templateId) => {
    try {
      const data = await api.getTemplate(token, templateId);
      setSelectedTemplate(data);
    } catch (err) {
      console.error('Failed to load template:', err);
    }
  };

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
      alert('Template name is required');
      return;
    }
    setSaving(true);
    try {
      const newTemplate = await api.createTemplate(token, {
        name: newTemplateName.trim(),
        description: newTemplateDesc.trim() || 'Custom template',
        tasks: []
      });
      setTemplates([...templates, { ...newTemplate, taskCount: 0 }]);
      setShowCreateTemplate(false);
      setNewTemplateName('');
      setNewTemplateDesc('');
      loadTemplateDetails(newTemplate.id);
    } catch (err) {
      console.error('Failed to create template:', err);
      alert('Failed to create template');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTemplate = async (templateId) => {
    const template = templates.find(t => t.id === templateId);
    if (template?.isDefault) {
      alert('Cannot delete the default template');
      return;
    }
    if (!confirm('Are you sure you want to delete this template? This cannot be undone.')) return;
    try {
      await api.deleteTemplate(token, templateId);
      setTemplates(templates.filter(t => t.id !== templateId));
    } catch (err) {
      console.error('Failed to delete template:', err);
      alert('Failed to delete template');
    }
  };

  const handleSaveTask = async () => {
    if (!selectedTemplate || !editingTask) return;
    setSaving(true);
    try {
      const updatedTasks = selectedTemplate.tasks.map(t => 
        t.id === editingTask.id ? editingTask : t
      );
      await api.updateTemplate(token, selectedTemplate.id, { tasks: updatedTasks });
      setSelectedTemplate({ ...selectedTemplate, tasks: updatedTasks });
      setEditingTask(null);
    } catch (err) {
      console.error('Failed to save task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleAddTask = async () => {
    if (!selectedTemplate) return;
    const newId = Math.max(...selectedTemplate.tasks.map(t => t.id)) + 1;
    const newTask = {
      id: newId,
      phase: 'Phase 1',
      stage: '',
      taskTitle: 'New Task',
      clientName: '',
      owner: '',
      startDate: '',
      dueDate: '',
      dateCompleted: '',
      duration: 0,
      completed: false,
      showToClient: false
    };
    const updatedTasks = [...selectedTemplate.tasks, newTask];
    setSaving(true);
    try {
      await api.updateTemplate(token, selectedTemplate.id, { tasks: updatedTasks });
      setSelectedTemplate({ ...selectedTemplate, tasks: updatedTasks });
      setEditingTask(newTask);
    } catch (err) {
      console.error('Failed to add task:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!selectedTemplate) return;
    if (!confirm('Are you sure you want to delete this task from the template?')) return;
    const updatedTasks = selectedTemplate.tasks.filter(t => t.id !== taskId);
    setSaving(true);
    try {
      await api.updateTemplate(token, selectedTemplate.id, { tasks: updatedTasks });
      setSelectedTemplate({ ...selectedTemplate, tasks: updatedTasks });
    } catch (err) {
      console.error('Failed to delete task:', err);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <button
                onClick={selectedTemplate ? () => setSelectedTemplate(null) : onBack}
                className="text-blue-600 hover:underline mb-2 flex items-center gap-1"
              >
                ← {selectedTemplate ? 'Back to Templates' : 'Back to Projects'}
              </button>
              <h1 className="text-3xl font-bold text-gray-900">
                {selectedTemplate ? (
                  editingName ? (
                    <div className="flex items-center gap-2">
                      <span>Edit Template:</span>
                      <input
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="px-2 py-1 border rounded text-xl"
                      />
                      <button onClick={handleSaveName} disabled={saving} className="text-sm text-green-600 hover:underline">Save</button>
                      <button onClick={() => setEditingName(false)} className="text-sm text-gray-500 hover:underline">Cancel</button>
                    </div>
                  ) : (
                    <span>
                      Edit Template: {selectedTemplate.name}
                      <button 
                        onClick={() => { setTempName(selectedTemplate.name); setEditingName(true); }}
                        className="ml-2 text-sm text-blue-600 hover:underline"
                      >
                        (rename)
                      </button>
                    </span>
                  )
                ) : 'Template Management'}
              </h1>
              <p className="text-gray-600">
                {selectedTemplate ? `${selectedTemplate.tasks.length} tasks` : 'Manage project templates'}
              </p>
            </div>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Logout
            </button>
          </div>
        </div>

        {!selectedTemplate ? (
          <>
            <div className="flex justify-end mb-4">
              <button
                onClick={() => setShowCreateTemplate(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                + Create New Template
              </button>
            </div>

            {showCreateTemplate && (
              <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                <h3 className="text-lg font-bold mb-4">Create New Template</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium mb-1">Template Name *</label>
                    <input
                      value={newTemplateName}
                      onChange={(e) => setNewTemplateName(e.target.value)}
                      placeholder="e.g., Mobile Lab Setup"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Description</label>
                    <input
                      value={newTemplateDesc}
                      onChange={(e) => setNewTemplateDesc(e.target.value)}
                      placeholder="Brief description of what this template is for"
                      className="w-full px-3 py-2 border rounded-md"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateTemplate}
                      disabled={saving}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                    >
                      {saving ? 'Creating...' : 'Create Template'}
                    </button>
                    <button
                      onClick={() => { setShowCreateTemplate(false); setNewTemplateName(''); setNewTemplateDesc(''); }}
                      className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </div>
            )}

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Template Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tasks</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {templates.map(template => (
                    <tr key={template.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{template.name}</div>
                        {template.isDefault && (
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">Default</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">{template.description}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{template.taskCount}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm space-x-3">
                        <button
                          onClick={() => loadTemplateDetails(template.id)}
                          className="text-blue-600 hover:underline"
                        >
                          Edit Tasks
                        </button>
                        {!template.isDefault && (
                          <button
                            onClick={() => handleDeleteTemplate(template.id)}
                            className="text-red-600 hover:underline"
                          >
                            Delete
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <button
                onClick={handleAddTask}
                disabled={saving}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                + Add Task to Template
              </button>
            </div>

            <div className="bg-white rounded-lg shadow-sm overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phase</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Stage</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Task Title</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Owner</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Dependencies</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Client View</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {selectedTemplate.tasks.map(task => (
                    <tr key={task.id}>
                      {editingTask && editingTask.id === task.id ? (
                        <>
                          <td className="px-4 py-2 text-sm text-gray-500">{task.id}</td>
                          <td className="px-4 py-2">
                            <select
                              value={editingTask.phase}
                              onChange={(e) => setEditingTask({...editingTask, phase: e.target.value})}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="Phase 0">Phase 0</option>
                              <option value="Phase 1">Phase 1</option>
                              <option value="Phase 2">Phase 2</option>
                              <option value="Phase 3">Phase 3</option>
                              <option value="Phase 4">Phase 4</option>
                            </select>
                          </td>
                          <td className="px-4 py-2">
                            <select
                              value={editingTask.stage}
                              onChange={(e) => setEditingTask({...editingTask, stage: e.target.value})}
                              className="w-full px-2 py-1 border rounded text-sm"
                            >
                              <option value="">-- Select Stage --</option>
                              {getUniqueStages().map(stage => (
                                <option key={stage} value={stage}>{stage}</option>
                              ))}
                              <option value="__new__">+ Add New Stage...</option>
                            </select>
                            {editingTask.stage === '__new__' && (
                              <input
                                placeholder="New stage name"
                                onChange={(e) => setEditingTask({...editingTask, stage: e.target.value})}
                                className="w-full px-2 py-1 border rounded text-sm mt-1"
                              />
                            )}
                          </td>
                          <td className="px-4 py-2">
                            <input
                              value={editingTask.taskTitle}
                              onChange={(e) => setEditingTask({...editingTask, taskTitle: e.target.value})}
                              className="w-full px-2 py-1 border rounded text-sm"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="email"
                              value={editingTask.owner}
                              onChange={(e) => setEditingTask({...editingTask, owner: e.target.value})}
                              className="w-full px-2 py-1 border rounded text-sm"
                              placeholder="user@email.com"
                            />
                          </td>
                          <td className="px-4 py-2 relative">
                            <div className="group">
                              <button
                                type="button"
                                className="w-full px-2 py-1 border rounded text-xs text-left bg-white hover:bg-gray-50"
                              >
                                {(editingTask.dependencies || []).length > 0 
                                  ? `${(editingTask.dependencies || []).length} selected`
                                  : 'Select dependencies...'}
                              </button>
                              <div className="hidden group-hover:block absolute z-50 left-0 top-full mt-1 w-72 bg-white border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                {selectedTemplate.tasks.filter(t => t.id !== editingTask.id).map(t => (
                                  <label key={t.id} className="flex items-start gap-2 px-3 py-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0">
                                    <input
                                      type="checkbox"
                                      checked={(editingTask.dependencies || []).includes(String(t.id))}
                                      onChange={(e) => {
                                        const deps = editingTask.dependencies || [];
                                        if (e.target.checked) {
                                          setEditingTask({...editingTask, dependencies: [...deps, String(t.id)]});
                                        } else {
                                          setEditingTask({...editingTask, dependencies: deps.filter(d => d !== String(t.id))});
                                        }
                                      }}
                                      className="mt-1 flex-shrink-0"
                                    />
                                    <span className="text-xs">
                                      <span className="font-medium text-gray-700">#{t.id}</span>
                                      <span className="text-gray-600 ml-1">{t.taskTitle}</span>
                                    </span>
                                  </label>
                                ))}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={editingTask.showToClient}
                              onChange={(e) => setEditingTask({...editingTask, showToClient: e.target.checked})}
                            />
                          </td>
                          <td className="px-4 py-2 space-x-2">
                            <button
                              onClick={handleSaveTask}
                              disabled={saving}
                              className="text-green-600 hover:underline disabled:opacity-50"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingTask(null)}
                              className="text-gray-600 hover:underline"
                            >
                              Cancel
                            </button>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2 text-sm text-gray-500">{task.id}</td>
                          <td className="px-4 py-2 text-sm">{task.phase}</td>
                          <td className="px-4 py-2 text-sm">{task.stage}</td>
                          <td className="px-4 py-2 text-sm font-medium">{task.taskTitle}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{task.owner || '-'}</td>
                          <td className="px-4 py-2 text-xs text-gray-500 relative group">
                            {task.dependencies && task.dependencies.length > 0 ? (
                              <div>
                                <span className="cursor-help underline decoration-dotted">
                                  {task.dependencies.length} task{task.dependencies.length > 1 ? 's' : ''}
                                </span>
                                <div className="hidden group-hover:block absolute z-50 left-0 top-full mt-1 w-64 bg-gray-800 text-white text-xs rounded-lg shadow-lg p-2">
                                  <p className="font-medium mb-1 border-b border-gray-600 pb-1">Dependencies:</p>
                                  {task.dependencies.map(depId => {
                                    const depTask = selectedTemplate.tasks.find(t => String(t.id) === String(depId));
                                    return (
                                      <p key={depId} className="py-1">
                                        <span className="text-blue-300">#{depId}</span> {depTask ? depTask.taskTitle : 'Unknown'}
                                      </p>
                                    );
                                  })}
                                </div>
                              </div>
                            ) : '-'}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {task.showToClient ? (
                              <span className="text-green-600">Yes</span>
                            ) : (
                              <span className="text-gray-400">No</span>
                            )}
                          </td>
                          <td className="px-4 py-2 space-x-2">
                            <button
                              onClick={() => setEditingTask({...task})}
                              className="text-blue-600 hover:underline"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => handleDeleteTask(task.id)}
                              className="text-red-600 hover:underline"
                            >
                              Delete
                            </button>
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============== HUBSPOT SETTINGS COMPONENT (Admin Only) ==============
const HubSpotSettings = ({ token, user, onBack, onLogout }) => {
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [pipelines, setPipelines] = useState([]);
  const [selectedPipeline, setSelectedPipeline] = useState('');
  const [stageMapping, setStageMapping] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const phases = [
    { id: 'Phase 0', name: 'Phase 0 - Contract Signature' },
    { id: 'Phase 1', name: 'Phase 1 - Pre-Launch' },
    { id: 'Phase 2', name: 'Phase 2 - Implementation Sprints' },
    { id: 'Phase 3', name: 'Phase 3 - Go-Live' },
    { id: 'Phase 4', name: 'Phase 4 - Post-Launch Optimization' }
  ];

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [status, existingMapping] = await Promise.all([
        api.testHubSpotConnection(token),
        api.getHubSpotStageMapping(token)
      ]);
      
      setConnectionStatus(status);
      
      if (status.connected) {
        const pipelinesData = await api.getHubSpotPipelines(token);
        setPipelines(pipelinesData);
        
        if (existingMapping.pipelineId) {
          setSelectedPipeline(existingMapping.pipelineId);
          setStageMapping(existingMapping.phases || {});
        }
      }
    } catch (error) {
      console.error('Error loading HubSpot data:', error);
    }
    setLoading(false);
  };

  const handlePipelineChange = (pipelineId) => {
    setSelectedPipeline(pipelineId);
    setStageMapping({});
  };

  const handleStageSelect = (phaseId, stageId) => {
    setStageMapping(prev => ({
      ...prev,
      [phaseId]: stageId
    }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.saveHubSpotStageMapping(token, selectedPipeline, stageMapping);
      setMessage('Stage mapping saved successfully!');
    } catch (error) {
      setMessage('Error saving stage mapping');
    }
    setSaving(false);
  };

  const selectedPipelineData = pipelines.find(p => p.id === selectedPipeline);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
          <div className="flex justify-between items-center mb-4">
            <div>
              <button
                onClick={onBack}
                className="text-sm text-blue-600 hover:underline mb-2"
              >
                ← Back to Projects
              </button>
              <h1 className="text-2xl font-bold text-gray-900">HubSpot Integration Settings</h1>
              <p className="text-gray-600">Configure how project phases sync with HubSpot deal stages</p>
            </div>
            <button
              onClick={onLogout}
              className="text-sm bg-red-100 text-red-600 px-3 py-1 rounded hover:bg-red-200"
            >
              Logout
            </button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-2 text-gray-600">Loading HubSpot settings...</p>
            </div>
          ) : (
            <>
              <div className={`p-4 rounded-lg mb-6 ${connectionStatus?.connected ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${connectionStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                  <span className="font-medium">
                    {connectionStatus?.connected ? 'HubSpot Connected' : 'HubSpot Not Connected'}
                  </span>
                </div>
                {connectionStatus?.connected && (
                  <p className="text-sm text-gray-600 mt-1">
                    Found {connectionStatus.pipelineCount} deal pipeline{connectionStatus.pipelineCount !== 1 ? 's' : ''}
                  </p>
                )}
                {!connectionStatus?.connected && (
                  <p className="text-sm text-red-600 mt-1">
                    {connectionStatus?.error || 'Please configure HubSpot connection in Replit'}
                  </p>
                )}
              </div>

              {connectionStatus?.connected && (
                <>
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Deal Pipeline
                    </label>
                    <select
                      value={selectedPipeline}
                      onChange={(e) => handlePipelineChange(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Choose a pipeline...</option>
                      {pipelines.map(pipeline => (
                        <option key={pipeline.id} value={pipeline.id}>
                          {pipeline.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedPipelineData && (
                    <div className="mb-6">
                      <h3 className="text-lg font-medium mb-4">Map Project Phases to Deal Stages</h3>
                      <p className="text-sm text-gray-600 mb-4">
                        When all tasks in a phase are completed, the connected HubSpot deal will automatically move to the selected stage.
                      </p>
                      
                      <div className="space-y-4">
                        {phases.map(phase => (
                          <div key={phase.id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                            <div className="w-1/2">
                              <span className="font-medium">{phase.name}</span>
                            </div>
                            <div className="w-1/2">
                              <select
                                value={stageMapping[phase.id] || ''}
                                onChange={(e) => handleStageSelect(phase.id, e.target.value)}
                                className="w-full border rounded px-3 py-2"
                              >
                                <option value="">No stage mapping</option>
                                {selectedPipelineData.stages.map(stage => (
                                  <option key={stage.id} value={stage.id}>
                                    {stage.label}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-6 flex items-center gap-4">
                        <button
                          onClick={handleSave}
                          disabled={saving || !selectedPipeline}
                          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save Mapping'}
                        </button>
                        {message && (
                          <span className={message.includes('Error') ? 'text-red-600' : 'text-green-600'}>
                            {message}
                          </span>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="mt-8 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2">How it works</h4>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• When you complete all tasks in a phase, the linked HubSpot deal moves to the mapped stage</li>
                      <li>• Adding notes to tasks creates activity entries on the deal in HubSpot</li>
                      <li>• Completing tasks logs the completion as an activity on the deal</li>
                      <li>• Projects must have a HubSpot Record ID set to sync (edit project settings)</li>
                    </ul>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ============== REPORTING COMPONENT ==============
const Reporting = ({ token, user, onBack, onLogout }) => {
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReportData();
  }, []);

  const loadReportData = async () => {
    try {
      const data = await api.getReportingData(token);
      setReportData(data);
    } catch (error) {
      console.error('Failed to load reporting data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Chart 1: Completed vs In Progress by client
  const getStatusByClient = () => {
    const clientMap = {};
    reportData.forEach(project => {
      const client = project.clientName || 'Unknown';
      if (!clientMap[client]) {
        clientMap[client] = { completed: 0, inProgress: 0, paused: 0 };
      }
      if (project.status === 'completed') {
        clientMap[client].completed++;
      } else if (project.status === 'paused') {
        clientMap[client].paused++;
      } else {
        clientMap[client].inProgress++;
      }
    });
    return clientMap;
  };

  // Chart 2: Go-live timelines by client (only completed projects with duration)
  const getTimelinesByClient = () => {
    return reportData
      .filter(p => p.status === 'completed' && p.launchDurationWeeks !== null)
      .map(p => ({
        name: p.name,
        clientName: p.clientName,
        weeks: p.launchDurationWeeks,
        contractDate: p.contractSignedDate,
        goLiveDate: p.goLiveDate
      }))
      .sort((a, b) => b.weeks - a.weeks);
  };

  const statusByClient = getStatusByClient();
  const timelines = getTimelinesByClient();
  const maxWeeks = timelines.length > 0 ? Math.max(...timelines.map(t => t.weeks), 1) : 1;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading reports...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <button
                onClick={onBack}
                className="text-blue-600 hover:underline mb-2 flex items-center gap-1"
              >
                ← Back to Projects
              </button>
              <h1 className="text-3xl font-bold text-gray-900">Launch Reports</h1>
              <p className="text-gray-600">New Client Launch Implementation App - Thrive 365 Labs</p>
            </div>
            <button
              onClick={onLogout}
              className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
            >
              Logout
            </button>
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-blue-600">{reportData.length}</div>
              <div className="text-sm text-blue-800">Total Projects</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-green-600">
                {reportData.filter(p => p.status === 'completed').length}
              </div>
              <div className="text-sm text-green-800">Completed</div>
            </div>
            <div className="bg-yellow-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-yellow-600">
                {reportData.filter(p => p.status === 'active' || !p.status).length}
              </div>
              <div className="text-sm text-yellow-800">In Progress</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-purple-600">
                {timelines.length > 0 ? Math.round(timelines.reduce((sum, t) => sum + t.weeks, 0) / timelines.length) : 0}
              </div>
              <div className="text-sm text-purple-800">Avg Weeks to Launch</div>
            </div>
          </div>

          {/* Chart 1: Status by Client */}
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4">Launches by Client</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              {Object.keys(statusByClient).length === 0 ? (
                <p className="text-gray-500 text-center py-4">No project data available</p>
              ) : (
                <div className="space-y-3">
                  {Object.entries(statusByClient).map(([client, counts]) => {
                    const total = counts.completed + counts.inProgress + counts.paused;
                    return (
                      <div key={client} className="flex items-center gap-4">
                        <div className="w-40 text-sm font-medium truncate" title={client}>{client}</div>
                        <div className="flex-1 flex h-8 rounded overflow-hidden">
                          {counts.completed > 0 && (
                            <div 
                              className="bg-green-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${(counts.completed / total) * 100}%` }}
                              title={`Completed: ${counts.completed}`}
                            >
                              {counts.completed}
                            </div>
                          )}
                          {counts.inProgress > 0 && (
                            <div 
                              className="bg-blue-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${(counts.inProgress / total) * 100}%` }}
                              title={`In Progress: ${counts.inProgress}`}
                            >
                              {counts.inProgress}
                            </div>
                          )}
                          {counts.paused > 0 && (
                            <div 
                              className="bg-yellow-500 flex items-center justify-center text-white text-xs font-medium"
                              style={{ width: `${(counts.paused / total) * 100}%` }}
                              title={`Paused: ${counts.paused}`}
                            >
                              {counts.paused}
                            </div>
                          )}
                        </div>
                        <div className="w-16 text-sm text-gray-600 text-right">{total} total</div>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-4 mt-4 text-xs justify-center">
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-green-500 rounded"></span> Completed</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-blue-500 rounded"></span> In Progress</span>
                <span className="flex items-center gap-1"><span className="w-3 h-3 bg-yellow-500 rounded"></span> Paused</span>
              </div>
            </div>
          </div>

          {/* Chart 2: Go-Live Timelines */}
          <div>
            <h2 className="text-xl font-bold mb-4">Go-Live Timelines (Contract to First Patient)</h2>
            <div className="bg-gray-50 rounded-lg p-4">
              {timelines.length === 0 ? (
                <p className="text-gray-500 text-center py-4">No completed launches with timeline data available</p>
              ) : (
                <div className="space-y-3">
                  {timelines.map((project, idx) => (
                    <div key={idx} className="flex items-center gap-4">
                      <div className="w-48 text-sm">
                        <div className="font-medium truncate" title={project.name}>{project.name}</div>
                        <div className="text-gray-500 text-xs truncate" title={project.clientName}>{project.clientName}</div>
                      </div>
                      <div className="flex-1 bg-gray-200 rounded h-8 overflow-hidden">
                        <div 
                          className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full flex items-center justify-end pr-2"
                          style={{ width: `${(project.weeks / maxWeeks) * 100}%`, minWidth: '40px' }}
                        >
                          <span className="text-white text-xs font-bold">{project.weeks}w</span>
                        </div>
                      </div>
                      <div className="w-32 text-xs text-gray-500">
                        {project.contractDate && new Date(project.contractDate).toLocaleDateString()} →
                        {project.goLiveDate && new Date(project.goLiveDate).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="text-center mt-4 text-sm text-gray-600">
                Weeks from Contract Signature to First Live Patient Samples
              </div>
            </div>
          </div>

          {/* Detailed Table */}
          <div className="mt-8">
            <h2 className="text-xl font-bold mb-4">All Projects Details</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Project</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Client</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Progress</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Duration</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {reportData.map(project => (
                    <tr key={project.id}>
                      <td className="px-4 py-3 text-sm font-medium">{project.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{project.clientName}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded ${
                          project.status === 'completed' ? 'bg-green-100 text-green-800' :
                          project.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {project.status === 'completed' ? 'Completed' :
                           project.status === 'paused' ? 'Paused' : 'In Progress'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full"
                              style={{ width: `${project.progressPercent}%` }}
                            ></div>
                          </div>
                          <span className="text-gray-600">{project.progressPercent}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {project.launchDurationWeeks !== null ? (
                          <span className="font-medium text-purple-600">{project.launchDurationWeeks} weeks</span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

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

  if (view === 'users' && user.role === 'admin') {
    return (
      <UserManagement
        token={token}
        user={user}
        onBack={handleBackToList}
        onLogout={handleLogout}
      />
    );
  }

  if (view === 'templates' && user.role === 'admin') {
    return (
      <TemplateManagement
        token={token}
        user={user}
        onBack={handleBackToList}
        onLogout={handleLogout}
      />
    );
  }

  if (view === 'hubspot' && user.role === 'admin') {
    return (
      <HubSpotSettings
        token={token}
        user={user}
        onBack={handleBackToList}
        onLogout={handleLogout}
      />
    );
  }

  if (view === 'reporting') {
    return (
      <Reporting
        token={token}
        user={user}
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
      onManageUsers={() => setView('users')}
      onManageTemplates={() => setView('templates')}
      onManageHubSpot={() => setView('hubspot')}
      onViewReporting={() => setView('reporting')}
    />
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
