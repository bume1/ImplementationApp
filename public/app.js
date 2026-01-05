const { useState, useEffect } = React;
const API_URL = window.location.origin;

// ============== STANDARD PHASES AND STAGES (Always visible) ==============
const STANDARD_PHASES = {
  'Phase 0': {
    name: 'Phase 0: Contract Signature',
    stages: ['Contract Signature']
  },
  'Phase 1': {
    name: 'Phase 1: Pre-Launch',
    stages: ['Project Kick Off & Stakeholder Alignment', 'Launch Data & Systems Prep']
  },
  'Phase 2': {
    name: 'Phase 2: Implementation Sprints',
    stages: ['Sprint 1: Core System Setups', 'Sprint 2: Lab & QUA Pilot Prep', 'Sprint 3: Soft-Pilot']
  },
  'Phase 3': {
    name: 'Phase 3: Go-Live',
    stages: ['Training/Validation', 'Go-Live']
  },
  'Phase 4': {
    name: 'Phase 4: Post-Launch Optimization',
    stages: ['KPIs', 'Monitoring & Customer Support']
  }
};

const PHASE_ORDER = ['Phase 0', 'Phase 1', 'Phase 2', 'Phase 3', 'Phase 4'];

// Helper to format date for display (handles ISO, YYYY-MM-DD, and locale formats)
const formatDateForDisplay = (dateStr) => {
  if (!dateStr) return '';
  // If already YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // If ISO format with time, extract date part
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  // Try to parse and format as YYYY-MM-DD for other formats (like MM/DD/YYYY)
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {}
  return dateStr;
};

// Helper to normalize date for input fields (ensures YYYY-MM-DD format)
const normalizeDateForInput = (dateStr) => {
  if (!dateStr) return '';
  // If already YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  // If ISO format with time, extract date part
  if (dateStr.includes('T')) return dateStr.split('T')[0];
  // Try to parse and convert to YYYY-MM-DD for other formats
  try {
    const date = new Date(dateStr);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  } catch (e) {}
  return '';
};

// Helper to ensure all phases/stages are always represented
const ensureAllPhasesAndStages = (groupedByPhase) => {
  const result = {};
  PHASE_ORDER.forEach(phase => {
    result[phase] = {};
    const standardStages = STANDARD_PHASES[phase]?.stages || [];
    standardStages.forEach(stage => {
      result[phase][stage] = groupedByPhase[phase]?.[stage] || [];
    });
    // Also include any non-standard stages that have tasks
    if (groupedByPhase[phase]) {
      Object.keys(groupedByPhase[phase]).forEach(stage => {
        if (!result[phase][stage]) {
          result[phase][stage] = groupedByPhase[phase][stage];
        }
      });
    }
  });
  return result;
};

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

  syncToHubSpot: (token, projectId) =>
    fetch(`${API_URL}/api/projects/${projectId}/hubspot-sync`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` }
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

  cloneProject: (token, projectId, name) =>
    fetch(`${API_URL}/api/projects/${projectId}/clone`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    }).then(r => r.json()),

  cloneTemplate: (token, templateId, name) =>
    fetch(`${API_URL}/api/templates/${templateId}/clone`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name })
    }).then(r => r.json()),

  importCsvToTemplate: (token, templateId, csvData) =>
    fetch(`${API_URL}/api/templates/${templateId}/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ csvData })
    }).then(r => r.json()),

  importCsvToProject: (token, projectId, csvData) =>
    fetch(`${API_URL}/api/projects/${projectId}/import-csv`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ csvData })
    }).then(r => r.json()),

  exportProject: async (token, projectId) => {
    try {
      const response = await fetch(`${API_URL}/api/projects/${projectId}/export`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('Export failed');
      const blob = await response.blob();
      const contentDisposition = response.headers.get('Content-Disposition');
      let filename = 'tasks.csv';
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+)"/);
        if (match) filename = match[1];
      }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export tasks');
    }
  },

  getReportingData: (token) =>
    fetch(`${API_URL}/api/reporting`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  getTeamMembers: (token, projectId = null) =>
    fetch(`${API_URL}/api/team-members${projectId ? `?projectId=${projectId}` : ''}`, {
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

  bulkDeleteTasks: (token, projectId, taskIds) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks/bulk-delete`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ taskIds })
    }).then(r => r.json()),

  forgotPassword: (email) =>
    fetch(`${API_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    }).then(r => r.json()),

  getClientPortalDomain: (token) =>
    fetch(`${API_URL}/api/settings/client-portal-domain`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  setClientPortalDomain: (token, domain) =>
    fetch(`${API_URL}/api/settings/client-portal-domain`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ domain })
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

  getPasswordResetRequests: (token) =>
    fetch(`${API_URL}/api/admin/password-reset-requests`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  getPortalSettings: () =>
    fetch(`${API_URL}/api/portal-settings`).then(r => r.json()),
  
  updatePortalSettings: (token, settings) =>
    fetch(`${API_URL}/api/portal-settings`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(settings)
    }).then(r => r.json()),
  
  getAnnouncements: () =>
    fetch(`${API_URL}/api/announcements`).then(r => r.json()),
  
  createAnnouncement: (token, announcement) =>
    fetch(`${API_URL}/api/announcements`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(announcement)
    }).then(r => r.json()),
  
  updateAnnouncement: (token, id, announcement) =>
    fetch(`${API_URL}/api/announcements/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(announcement)
    }).then(r => r.json()),
  
  deleteAnnouncement: (token, id) =>
    fetch(`${API_URL}/api/announcements/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  getClientDocuments: (token) =>
    fetch(`${API_URL}/api/client-documents`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),
  
  createClientDocument: (token, doc) =>
    fetch(`${API_URL}/api/client-documents`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(doc)
    }).then(r => r.json()),
  
  updateClientDocument: (token, id, doc) =>
    fetch(`${API_URL}/api/client-documents/${id}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(doc)
    }).then(r => r.json()),
  
  deleteClientDocument: (token, id) =>
    fetch(`${API_URL}/api/client-documents/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),
  
  getClientUsers: (token) =>
    fetch(`${API_URL}/api/users`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()).then(users => users.filter(u => u.role === 'client')),

  handlePasswordResetRequest: (token, requestId, status) =>
    fetch(`${API_URL}/api/admin/password-reset-requests/${requestId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
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

  updateNote: (token, projectId, taskId, noteId, content) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks/${taskId}/notes/${noteId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ content })
    }).then(r => r.json()),

  deleteNote: (token, projectId, taskId, noteId) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks/${taskId}/notes/${noteId}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json()),

  reorderTask: (token, projectId, taskId, direction) =>
    fetch(`${API_URL}/api/projects/${projectId}/tasks/${taskId}/reorder`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ direction })
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

  setDefaultTemplate: (token, templateId) =>
    fetch(`${API_URL}/api/templates/${templateId}/set-default`, {
      method: 'PUT',
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
    }).then(r => r.json()),

  submitSoftPilotChecklist: (token, projectId, data) =>
    fetch(`${API_URL}/api/projects/${projectId}/soft-pilot-checklist`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    }).then(r => r.json())
};

// ============== SHARED HEADER COMPONENT ==============
const AppHeader = ({ user, onLogout, children }) => {
  return (
    <>
      {/* Top Bar - Dark Navy */}
      <div className="bg-[#00205A] text-white text-sm">
        <div className="max-w-6xl mx-auto px-6 py-2 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <a href="https://www.linkedin.com/company/thrive-365-labs" target="_blank" rel="noopener noreferrer" className="hover:text-blue-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
            </a>
            <a href="https://www.facebook.com/thrive365labs" target="_blank" rel="noopener noreferrer" className="hover:text-blue-300">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/></svg>
            </a>
          </div>
          <a href="tel:+17707629269" className="flex items-center gap-2 hover:text-blue-300">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
            <span>(770) 762-9269</span>
          </a>
        </div>
      </div>
      
      {/* Main Header - White */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <img src="/thrive365-logo.webp" alt="Thrive 365 Labs" className="h-12" />
          </div>
          <nav className="flex items-center gap-6">
            {children}
            <div className="h-6 w-px bg-gray-300"></div>
            <div className="flex items-center gap-3">
              <span className="text-gray-600 text-sm">
                {user.name}
                {user.role === 'admin' && <span className="ml-1 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">ADMIN</span>}
              </span>
              <button
                onClick={onLogout}
                className="text-gray-500 hover:text-red-600 text-sm"
              >
                Logout
              </button>
            </div>
          </nav>
        </div>
      </div>
    </>
  );
};

// ============== CSV HELPER FUNCTIONS ==============
const downloadSampleCSV = () => {
  const sampleCSV = `id,phase,stage,showToClient,dependencies,taskTitle,isSubtask,parentTaskId,completed,subtaskStatus,owner,startDate,dueDate,dateCompleted
1,Phase 0,Contract Signature,TRUE,,Contract signed,FALSE,,TRUE,,,,,01/06/2025
2,Phase 1,Project Kick Off & Stakeholder Alignment,TRUE,1,"Client Profile Complete IN-FULL",FALSE,,TRUE,,team@example.com,,02/05/2025,10/31/2025
3,Phase 1,Project Kick Off & Stakeholder Alignment,TRUE,1,Pre-Installation Complete,FALSE,,FALSE,,admin@example.com,02/05/2025,10/31/2025,
4,Phase 1,Project Kick Off & Stakeholder Alignment,FALSE,2,Sales Upload to Hubspot,TRUE,2,TRUE,TRUE,admin@example.com,02/05/2025,10/31/2025,10/31/2025
5,Phase 1,Launch Data & Systems Prep,TRUE,1,Welcome Call,FALSE,,FALSE,,,,,
6,Phase 1,Launch Data & Systems Prep,TRUE,1,Schedule Welcome Call,TRUE,5,FALSE,Pending,,,,`;
  const blob = new Blob([sampleCSV], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'task-import-template.csv';
  a.click();
  URL.revokeObjectURL(url);
};

const parseCSV = (csvText) => {
  const rows = [];
  let currentRow = [];
  let currentField = '';
  let inQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentField += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentField.trim());
        currentField = '';
      } else if (char === '\n' || (char === '\r' && nextChar === '\n')) {
        currentRow.push(currentField.trim());
        if (currentRow.some(f => f)) rows.push(currentRow);
        currentRow = [];
        currentField = '';
        if (char === '\r') i++;
      } else if (char !== '\r') {
        currentField += char;
      }
    }
  }
  
  if (currentField || currentRow.length) {
    currentRow.push(currentField.trim());
    if (currentRow.some(f => f)) rows.push(currentRow);
  }
  
  if (rows.length < 2) return [];
  
  const headers = rows[0].map(h => h.replace(/^"|"$/g, '').trim());
  
  // Normalize headers: strip spaces/underscores and convert to lowercase for matching
  const headerMap = {
    'showtoclient': 'showToClient',
    'clientname': 'clientName',
    'tasktitle': 'taskTitle',
    'task': 'taskTitle',
    'title': 'taskTitle',
    'duedate': 'dueDate',
    'startdate': 'startDate',
    'issubtask': 'isSubtask',
    'parenttaskid': 'parentTaskId',
    'subtaskstatus': 'subtaskStatus',
    'completed': 'completed',
    'complete': 'completed',
    'done': 'completed',
    'datecompleted': 'dateCompleted',
    'id': 'id',
    'taskid': 'id',
    'phase': 'phase',
    'stage': 'stage',
    'owner': 'owner',
    'duration': 'duration',
    'dependencies': 'dependencies',
    'notes': 'notes'
  };
  
  const normalizedHeaders = headers.map(h => {
    // Remove all spaces, underscores, and convert to lowercase
    const normalized = h.toLowerCase().replace(/[\s_-]+/g, '');
    return headerMap[normalized] || h;
  });
  
  const data = [];
  
  for (let i = 1; i < rows.length; i++) {
    const row = {};
    normalizedHeaders.forEach((header, idx) => {
      row[header] = rows[i][idx] || '';
    });
    data.push(row);
  }
  
  return data;
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
        <div className="flex justify-center mb-6">
          <img src="/thrive365-logo.webp" alt="Thrive 365 Labs" className="h-16" />
        </div>
        <h1 className="text-2xl font-bold mb-2 text-accent text-center">New Client Implementations</h1>
        <p className="text-gray-600 mb-6 text-center">Thrive 365 Labs Launch Tracker</p>


        {mode === 'forgot' && (
          <div className="bg-blue-50 border border-blue-200 p-3 rounded mb-4 text-sm">
            <p className="text-blue-800">Enter your email address and an administrator will reach out to help reset your password.</p>
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
            className="w-full bg-primary text-white py-2 rounded-md hover:bg-accent disabled:bg-gray-400"
          >
            {loading ? 'Please wait...' : mode === 'login' ? 'Login' : mode === 'signup' ? 'Create Account' : 'Request Password Reset'}
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
              className="text-primary hover:underline text-sm"
            >
              {mode === 'login' ? 'Need an account? Sign up' : mode === 'signup' ? 'Already have an account? Login' : 'Back to Login'}
            </button>
          </div>
        </div>
        <div className="mt-8 text-center text-sm text-gray-500">
          <p>Powered by Thrive365Labs | Developed by Bianca G. C. Ume, MD, MBA, MS</p>
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
  const [clientPortalDomain, setClientPortalDomain] = useState('');
  const [editingDomain, setEditingDomain] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [showHelpGuide, setShowHelpGuide] = useState(false);
  const [showActivityLog, setShowActivityLog] = useState(false);
  const [activityLog, setActivityLog] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [fullScreenCalendar, setFullScreenCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [calendarViewMode, setCalendarViewMode] = useState('month'); // 'month' or 'year'
  const [newProject, setNewProject] = useState({
    name: '',
    clientName: '',
    projectManager: '',
    hubspotRecordId: '',
    hubspotDealStage: '',
    template: ''
  });

  const loadActivityLog = async () => {
    if (user.role !== 'admin') return;
    setActivityLoading(true);
    try {
      const res = await fetch('/api/admin/activity-log?limit=100', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setActivityLog(data);
      }
    } catch (err) {
      console.error('Failed to load activity log:', err);
    } finally {
      setActivityLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
    loadTemplates();
    loadClientPortalDomain();
  }, []);

  const loadClientPortalDomain = async () => {
    try {
      const result = await api.getClientPortalDomain(token);
      setClientPortalDomain(result.domain || '');
    } catch (err) {
      console.error('Failed to load client portal domain:', err);
    }
  };

  const saveClientPortalDomain = async () => {
    try {
      const result = await api.setClientPortalDomain(token, newDomain);
      if (result.error) {
        alert(result.error);
      } else {
        setClientPortalDomain(result.domain);
        setEditingDomain(false);
        alert('Client portal domain saved!');
      }
    } catch (err) {
      console.error('Failed to save domain:', err);
      alert('Failed to save domain');
    }
  };

  const loadTemplates = async () => {
    try {
      const data = await api.getTemplates(token);
      setTemplates(data);
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
      setNewProject({
        name: '',
        clientName: '',
        projectManager: '',
        hubspotRecordId: '',
        hubspotDealStage: '',
        template: ''
      });
      loadProjects();
    } catch (err) {
      console.error('Failed to create project:', err);
      alert('Failed to create project');
    }
  };

  const getBaseUrl = (domain) => {
    if (!domain) return 'https://deapps.pro';
    try {
      const url = new URL(domain);
      return url.origin;
    } catch {
      return 'https://deapps.pro';
    }
  };

  const copyClientLink = (project) => {
    const baseUrl = getBaseUrl(project.clientPortalDomain || clientPortalDomain);
    const linkId = project.clientLinkSlug || project.clientLinkId;
    const link = `${baseUrl}/thrive365labslaunch/${linkId}`;
    navigator.clipboard.writeText(link);
    alert(`Link copied!\n\n${link}`);
  };

  const getClientLinkDisplay = (project) => {
    const baseUrl = getBaseUrl(project.clientPortalDomain || clientPortalDomain);
    const linkId = project.clientLinkSlug || project.clientLinkId;
    return `${baseUrl}/thrive365labslaunch/${linkId}`;
  };

  const handleEditProject = async () => {
    if (!editingProject) return;
    
    // Require Soft-Pilot Checklist submission before marking project as completed
    if (editingProject.status === 'completed' && !editingProject.softPilotChecklistSubmitted) {
      alert('The Soft-Pilot Checklist must be submitted before marking this project as completed. Please complete the checklist in the Sprint 3: Soft-Pilot stage first.');
      return;
    }
    
    try {
      await api.updateProject(token, editingProject.id, {
        name: editingProject.name,
        clientName: editingProject.clientName,
        projectManager: editingProject.projectManager,
        hubspotRecordId: editingProject.hubspotRecordId,
        status: editingProject.status,
        clientPortalDomain: editingProject.clientPortalDomain || '',
        goLiveDate: editingProject.goLiveDate || ''
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

  const handleCloneProject = async (project) => {
    const newName = prompt(`Enter name for the cloned project:`, `${project.name} (Copy)`);
    if (!newName) return;
    try {
      await api.cloneProject(token, project.id, newName);
      loadProjects();
      alert('Project cloned successfully!');
    } catch (err) {
      console.error('Failed to clone project:', err);
      alert('Failed to clone project');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} onLogout={onLogout}>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide"
        >
          + New Project
        </button>
        {user.role === 'admin' && onManageTemplates && (
          <button
            onClick={onManageTemplates}
            className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide"
          >
            Templates
          </button>
        )}
        {onViewReporting && (
          <button
            onClick={onViewReporting}
            className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide"
          >
            Reports
          </button>
        )}
        {user.role === 'admin' && (
          <div className="relative">
            <button
              onClick={() => setShowSettingsMenu(!showSettingsMenu)}
              className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide flex items-center gap-1"
            >
              Settings
              <svg className={`w-3 h-3 transition-transform ${showSettingsMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showSettingsMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border z-50">
                {onManageUsers && (
                  <button
                    onClick={() => { onManageUsers(); setShowSettingsMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 text-gray-700 border-b text-sm"
                  >
                    Manage Users
                  </button>
                )}
                {onManageHubSpot && (
                  <button
                    onClick={() => { onManageHubSpot(); setShowSettingsMenu(false); }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-100 text-gray-700 text-sm"
                  >
                    HubSpot Settings
                  </button>
                )}
                <a
                  href="/portal/admin"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-left px-4 py-3 hover:bg-gray-100 text-gray-700 text-sm"
                >
                  Admin Portal
                </a>
              </div>
            )}
          </div>
        )}
        <button
          onClick={() => setShowHelpGuide(true)}
          className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide"
        >
          Help
        </button>
      </AppHeader>

      <div className="p-6">
      <div className="max-w-6xl mx-auto">

        {showHelpGuide && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b bg-gradient-to-r from-primary to-accent text-white">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold">Help Guide</h2>
                  <button onClick={() => setShowHelpGuide(false)} className="text-white hover:text-blue-200 text-2xl">&times;</button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                <section>
                  <h3 className="text-lg font-bold text-primary mb-3">Getting Started</h3>
                  <p className="text-gray-700 mb-2">Welcome to the Thrive 365 Labs Portal! This application helps you manage clinical laboratory equipment installations with a structured phase-based approach.</p>
                  <ul className="list-disc ml-5 text-gray-600 space-y-1">
                    <li><strong>Create a Project:</strong> Click "+ New Project" to start a new client launch</li>
                    <li><strong>Select a Template:</strong> Choose from pre-built templates with tasks already set up</li>
                    <li><strong>Track Progress:</strong> Click on a project card to view and manage tasks</li>
                  </ul>
                </section>
                
                <section>
                  <h3 className="text-lg font-bold text-primary mb-3">Project Phases</h3>
                  <div className="space-y-2 text-gray-600">
                    <div className="flex items-center gap-3"><div className="w-4 h-4 bg-purple-500 rounded"></div><span><strong>Phase 0:</strong> Contract Signature</span></div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 bg-blue-500 rounded"></div><span><strong>Phase 1:</strong> Pre-Launch (Kick Off, Data Systems Prep)</span></div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 bg-green-500 rounded"></div><span><strong>Phase 2:</strong> Implementation Sprints (Soft-Pilot, System Setup)</span></div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 bg-orange-500 rounded"></div><span><strong>Phase 3:</strong> Go-Live (Validation, Live Operations)</span></div>
                    <div className="flex items-center gap-3"><div className="w-4 h-4 bg-pink-500 rounded"></div><span><strong>Phase 4:</strong> Post-Launch Optimization</span></div>
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-primary mb-3">Task Management</h3>
                  <ul className="list-disc ml-5 text-gray-600 space-y-1">
                    <li><strong>Complete Tasks:</strong> Click the circle next to a task to mark it complete</li>
                    <li><strong>Add Subtasks:</strong> Click "Add Subtask" to break down complex tasks</li>
                    <li><strong>Subtask Status:</strong> Pending, Complete, or N/A (Not Applicable)</li>
                    <li><strong>Bulk Operations:</strong> Use "Bulk Select" to update multiple tasks at once</li>
                    <li><strong>Add Notes:</strong> Expand a task to add internal notes</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-primary mb-3">Views</h3>
                  <ul className="list-disc ml-5 text-gray-600 space-y-1">
                    <li><strong>List View:</strong> See all tasks organized by phase and stage</li>
                    <li><strong>Timeline View:</strong> Visualize task schedules on a timeline</li>
                    <li><strong>Calendar View:</strong> See tasks organized by due date</li>
                    <li><strong>Client View:</strong> Preview what clients see in their portal</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-primary mb-3">Client Portal</h3>
                  <ul className="list-disc ml-5 text-gray-600 space-y-1">
                    <li>Each project has a shareable client link for external stakeholders</li>
                    <li>Client portal URL format: <code className="bg-gray-100 px-1 rounded">https://deapps.pro/thrive365labslaunch/client-name</code></li>
                    <li>Click "Copy Client Link" on project cards to share with clients</li>
                    <li>Clients can view progress without logging in</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-primary mb-3">HubSpot Integration</h3>
                  <p className="text-gray-700 mb-2 font-medium">Automatic Syncs (happen immediately):</p>
                  <ul className="list-disc ml-5 text-gray-600 space-y-1 mb-3">
                    <li><strong>Task Completion:</strong> Creates a completed HubSpot task with phase, stage, completion details, and all notes</li>
                    <li><strong>Stage Completion:</strong> When all tasks in a stage are done, logs a summary note to HubSpot</li>
                    <li><strong>Phase Completion:</strong> Logs stage-by-stage summary AND moves the deal to the mapped pipeline stage</li>
                    <li><strong>Soft-Pilot Checklist:</strong> Creates note with signature and Google Drive link</li>
                  </ul>
                  <p className="text-gray-700 mb-2 font-medium">Manual Sync:</p>
                  <ul className="list-disc ml-5 text-gray-600 space-y-1 mb-3">
                    <li><strong>"Sync All to HubSpot" button:</strong> Use when Record ID was added after tasks were completed</li>
                    <li>Available to admins only, syncs all completed tasks that missed automatic sync</li>
                  </ul>
                  <p className="text-gray-700 mb-2 font-medium">What Does NOT Sync:</p>
                  <ul className="list-disc ml-5 text-gray-600 space-y-1 mb-3">
                    <li>Adding notes to tasks (notes only sync when task is completed)</li>
                    <li>Bulk mark complete/incomplete operations</li>
                    <li>Subtasks (only parent tasks sync)</li>
                    <li>Reopening tasks</li>
                  </ul>
                  <p className="text-gray-700 mb-2 font-medium">Requirements:</p>
                  <ul className="list-disc ml-5 text-gray-600 space-y-1">
                    <li>Project must have a HubSpot Record ID configured</li>
                    <li>HubSpot integration must be connected (via HubSpot Settings)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="text-lg font-bold text-primary mb-3">CSV Import/Export</h3>
                  <ul className="list-disc ml-5 text-gray-600 space-y-1">
                    <li><strong>Export:</strong> Click "Export CSV" to download all project tasks</li>
                    <li><strong>Import:</strong> Use "Import CSV" to bulk add tasks</li>
                    <li>Download the template to see the required format</li>
                  </ul>
                </section>

                {user.role === 'admin' && (
                  <section>
                    <h3 className="text-lg font-bold text-primary mb-3">Admin Features</h3>
                    <ul className="list-disc ml-5 text-gray-600 space-y-1">
                      <li><strong>Manage Users:</strong> Add, edit, and remove team members</li>
                      <li><strong>Templates:</strong> Create and manage project templates</li>
                      <li><strong>HubSpot Settings:</strong> Configure pipeline stage mappings</li>
                      <li><strong>Portal Domain:</strong> Set per-project custom domain in project settings</li>
                    </ul>
                  </section>
                )}
              </div>
              <div className="p-4 border-t bg-gray-50 text-center">
                <p className="text-sm text-gray-500">Powered by Thrive365Labs | Developed by Bianca G. C. Ume, MD, MBA, MS</p>
              </div>
            </div>
          </div>
        )}

        {showCreate && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Create New Project</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Select Template (Optional)</label>
              <select
                value={newProject.template}
                onChange={(e) => setNewProject({...newProject, template: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
              >
                <option value="">No Template (start empty)</option>
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
                  className="bg-primary text-white px-4 py-2 rounded-md hover:bg-accent"
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

        {/* Implementations Calendar */}
        {!loading && projects.length > 0 && (
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <button
                onClick={() => setShowCalendar(!showCalendar)}
                className="flex items-center gap-2 text-lg font-bold text-gray-900 hover:text-primary transition-colors"
              >
                <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Implementations Calendar
                <svg className={`w-4 h-4 transition-transform ${showCalendar ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {showCalendar && (
                <button
                  onClick={() => setFullScreenCalendar(true)}
                  className="flex items-center gap-1 text-sm text-primary hover:text-accent transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                  </svg>
                  Full Screen
                </button>
              )}
            </div>
            
            {showCalendar && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-4">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() => {
                        if (calendarViewMode === 'year') {
                          setCalendarYear(calendarYear - 1);
                        } else if (calendarMonth === 0) {
                          setCalendarMonth(11);
                          setCalendarYear(calendarYear - 1);
                        } else {
                          setCalendarMonth(calendarMonth - 1);
                        }
                      }}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    <div className="flex items-center gap-4">
                      <h3 className="text-xl font-bold">
                        {calendarViewMode === 'year' 
                          ? calendarYear 
                          : new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                      </h3>
                      <div className="flex bg-white/20 rounded-lg p-1">
                        <button
                          onClick={() => setCalendarViewMode('month')}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${calendarViewMode === 'month' ? 'bg-white text-primary font-medium' : 'hover:bg-white/20'}`}
                        >
                          Month
                        </button>
                        <button
                          onClick={() => setCalendarViewMode('year')}
                          className={`px-3 py-1 text-sm rounded-md transition-colors ${calendarViewMode === 'year' ? 'bg-white text-primary font-medium' : 'hover:bg-white/20'}`}
                        >
                          Year
                        </button>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        if (calendarViewMode === 'year') {
                          setCalendarYear(calendarYear + 1);
                        } else if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear(calendarYear + 1);
                        } else {
                          setCalendarMonth(calendarMonth + 1);
                        }
                      }}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {calendarViewMode === 'month' ? (
                  <div className="p-4">
                    <div className="grid grid-cols-7 gap-1 mb-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                        <div key={day} className="text-center text-xs font-semibold text-gray-500 py-2">{day}</div>
                      ))}
                    </div>
                    
                    <div className="grid grid-cols-7 gap-1">
                      {(() => {
                        const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                        const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                        const today = new Date();
                        const isCurrentMonth = today.getMonth() === calendarMonth && today.getFullYear() === calendarYear;
                        
                        const parseGoLiveDate = (dateStr) => {
                          if (!dateStr) return null;
                          let d;
                          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                            d = new Date(dateStr + 'T12:00:00');
                          } else if (dateStr.includes('T') && dateStr.endsWith('Z')) {
                            const datePart = dateStr.split('T')[0];
                            d = new Date(datePart + 'T12:00:00');
                          } else if (dateStr.includes('T')) {
                            d = new Date(dateStr);
                          } else {
                            d = new Date(dateStr);
                          }
                          return isNaN(d.getTime()) ? null : d;
                        };
                        
                        const projectsByDate = {};
                        const trainingByDate = {};
                        
                        projects.forEach(p => {
                          // Add go-live dates
                          if (p.goLiveDate) {
                            const d = parseGoLiveDate(p.goLiveDate);
                            if (d && d.getMonth() === calendarMonth && d.getFullYear() === calendarYear) {
                              const day = d.getDate();
                              if (!projectsByDate[day]) projectsByDate[day] = [];
                              projectsByDate[day].push(p);
                            }
                          }
                          
                          // Add training week dates
                          if (p.trainingStartDate && p.trainingEndDate) {
                            const startD = parseGoLiveDate(p.trainingStartDate);
                            const endD = parseGoLiveDate(p.trainingEndDate);
                            if (startD && endD) {
                              // Check each day in the training range
                              const current = new Date(startD);
                              while (current <= endD) {
                                if (current.getMonth() === calendarMonth && current.getFullYear() === calendarYear) {
                                  const day = current.getDate();
                                  if (!trainingByDate[day]) trainingByDate[day] = [];
                                  if (!trainingByDate[day].find(t => t.id === p.id)) {
                                    trainingByDate[day].push({
                                      ...p,
                                      isTrainingStart: current.getTime() === startD.getTime(),
                                      isTrainingEnd: current.getTime() === endD.getTime()
                                    });
                                  }
                                }
                                current.setDate(current.getDate() + 1);
                              }
                            }
                          }
                        });
                        
                        const cells = [];
                        for (let i = 0; i < firstDay; i++) {
                          cells.push(<div key={`empty-${i}`} className="min-h-[100px]"></div>);
                        }
                        
                        for (let day = 1; day <= daysInMonth; day++) {
                          const isToday = isCurrentMonth && today.getDate() === day;
                          const dayProjects = projectsByDate[day] || [];
                          const dayTraining = trainingByDate[day] || [];
                          
                          cells.push(
                            <div 
                              key={day} 
                              className={`min-h-[100px] border rounded-lg p-2 ${isToday ? 'border-primary bg-blue-50' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                              <div className={`text-sm font-semibold mb-1 ${isToday ? 'text-primary' : 'text-gray-700'}`}>{day}</div>
                              <div className="space-y-1">
                                {/* Training week entries */}
                                {dayTraining.slice(0, 1).map(p => (
                                  <div 
                                    key={`training-${p.id}`} 
                                    className="text-xs px-2 py-1 rounded-md truncate cursor-pointer transition-colors bg-purple-100 text-purple-800 hover:bg-purple-200"
                                    title={`Training/Validation - ${p.clientName}`}
                                    onClick={() => onSelectProject(p, p.trainingStartTaskId)}
                                  >
                                    {p.clientName.length > 10 ? p.clientName.substring(0, 10) + '...' : p.clientName} (T)
                                  </div>
                                ))}
                                {dayTraining.length > 1 && (
                                  <div className="text-xs text-purple-500 font-medium">+{dayTraining.length - 1} training</div>
                                )}
                                {/* Go-live entries */}
                                {dayProjects.slice(0, 2).map(p => (
                                  <div 
                                    key={p.id} 
                                    className={`text-xs px-2 py-1 rounded-md truncate cursor-pointer transition-colors ${
                                      p.status === 'completed' ? 'bg-green-100 text-green-800 hover:bg-green-200' : 
                                      p.status === 'paused' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                                      'bg-primary/10 text-primary hover:bg-primary/20'
                                    }`}
                                    title={`Go-Live: ${p.name} - ${p.clientName}`}
                                    onClick={() => onSelectProject(p, p.goLiveTaskId)}
                                  >
                                    {p.clientName.length > 12 ? p.clientName.substring(0, 12) + '...' : p.clientName}
                                  </div>
                                ))}
                                {dayProjects.length > 2 && (
                                  <div className="text-xs text-gray-500 font-medium">+{dayProjects.length - 2} more</div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        
                        return cells;
                      })()}
                    </div>
                  </div>
                ) : (
                  <div className="p-4">
                    <div className="grid grid-cols-3 md:grid-cols-4 gap-4">
                      {(() => {
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
                        const today = new Date();
                        
                        const parseGoLiveDate = (dateStr) => {
                          if (!dateStr) return null;
                          let d;
                          if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                            d = new Date(dateStr + 'T12:00:00');
                          } else if (dateStr.includes('T') && dateStr.endsWith('Z')) {
                            const datePart = dateStr.split('T')[0];
                            d = new Date(datePart + 'T12:00:00');
                          } else if (dateStr.includes('T')) {
                            d = new Date(dateStr);
                          } else {
                            d = new Date(dateStr);
                          }
                          return isNaN(d.getTime()) ? null : d;
                        };
                        
                        const projectsByMonth = {};
                        projects.forEach(p => {
                          if (p.goLiveDate) {
                            const d = parseGoLiveDate(p.goLiveDate);
                            if (d && d.getFullYear() === calendarYear) {
                              const month = d.getMonth();
                              if (!projectsByMonth[month]) projectsByMonth[month] = [];
                              projectsByMonth[month].push(p);
                            }
                          }
                        });
                        
                        return months.map((monthName, monthIndex) => {
                          const isCurrentMonth = today.getMonth() === monthIndex && today.getFullYear() === calendarYear;
                          const monthProjects = projectsByMonth[monthIndex] || [];
                          
                          return (
                            <div 
                              key={monthIndex}
                              className={`border rounded-lg p-3 cursor-pointer transition-all hover:shadow-md ${
                                isCurrentMonth ? 'border-primary bg-blue-50' : 'border-gray-200 hover:border-primary/50'
                              }`}
                              onClick={() => {
                                setCalendarMonth(monthIndex);
                                setCalendarViewMode('month');
                              }}
                            >
                              <div className={`text-sm font-bold mb-2 ${isCurrentMonth ? 'text-primary' : 'text-gray-800'}`}>
                                {monthName}
                              </div>
                              <div className="space-y-1">
                                {monthProjects.length === 0 ? (
                                  <div className="text-xs text-gray-400 italic">No go-lives</div>
                                ) : (
                                  <>
                                    {monthProjects.slice(0, 3).map(p => (
                                      <div 
                                        key={p.id}
                                        className={`text-xs px-2 py-1 rounded truncate ${
                                          p.status === 'completed' ? 'bg-green-100 text-green-800' : 
                                          p.status === 'paused' ? 'bg-yellow-100 text-yellow-800' :
                                          'bg-primary/10 text-primary'
                                        }`}
                                        title={`${p.clientName} - ${parseGoLiveDate(p.goLiveDate)?.getDate()}`}
                                      >
                                        {p.clientName.length > 10 ? p.clientName.substring(0, 10) + '...' : p.clientName}
                                      </div>
                                    ))}
                                    {monthProjects.length > 3 && (
                                      <div className="text-xs text-gray-500 font-medium">+{monthProjects.length - 3} more</div>
                                    )}
                                  </>
                                )}
                              </div>
                              {monthProjects.length > 0 && (
                                <div className="mt-2 text-xs text-gray-500 font-medium">
                                  {monthProjects.length} go-live{monthProjects.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                )}
                
                {/* Legend */}
                <div className="px-4 pb-4 flex flex-wrap gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-purple-100"></div>
                    <span className="text-gray-600">Training/Validation Week</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-primary/20"></div>
                    <span className="text-gray-600">Go-Live (In Progress)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-green-100"></div>
                    <span className="text-gray-600">Go-Live (Completed)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded bg-yellow-100"></div>
                    <span className="text-gray-600">Go-Live (Paused)</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Fullscreen Calendar Modal */}
        {fullScreenCalendar && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full h-full max-w-7xl max-h-[95vh] overflow-auto">
              <div className="bg-gradient-to-r from-primary to-accent text-white px-6 py-4 sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      if (calendarViewMode === 'year') {
                        setCalendarYear(calendarYear - 1);
                      } else if (calendarMonth === 0) {
                        setCalendarMonth(11);
                        setCalendarYear(calendarYear - 1);
                      } else {
                        setCalendarMonth(calendarMonth - 1);
                      }
                    }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="flex items-center gap-4">
                    <h3 className="text-xl font-bold">
                      {calendarViewMode === 'year' 
                        ? calendarYear 
                        : new Date(calendarYear, calendarMonth).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                    </h3>
                    <div className="flex bg-white/20 rounded-lg p-1">
                      <button
                        onClick={() => setCalendarViewMode('month')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${calendarViewMode === 'month' ? 'bg-white text-primary font-medium' : 'hover:bg-white/20'}`}
                      >
                        Month
                      </button>
                      <button
                        onClick={() => setCalendarViewMode('year')}
                        className={`px-3 py-1 text-sm rounded-md transition-colors ${calendarViewMode === 'year' ? 'bg-white text-primary font-medium' : 'hover:bg-white/20'}`}
                      >
                        Year
                      </button>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        if (calendarViewMode === 'year') {
                          setCalendarYear(calendarYear + 1);
                        } else if (calendarMonth === 11) {
                          setCalendarMonth(0);
                          setCalendarYear(calendarYear + 1);
                        } else {
                          setCalendarMonth(calendarMonth + 1);
                        }
                      }}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                    <button
                      onClick={() => setFullScreenCalendar(false)}
                      className="p-2 hover:bg-white/20 rounded-lg transition-colors ml-4"
                      title="Close"
                    >
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Calendar Grid - Fullscreen Version */}
              {calendarViewMode === 'month' ? (
                <div className="p-6">
                  <div className="grid grid-cols-7 gap-px bg-gray-200 rounded-lg overflow-hidden">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="bg-gray-50 p-3 text-center text-sm font-medium text-gray-600">{day}</div>
                    ))}
                    {(() => {
                      const firstDay = new Date(calendarYear, calendarMonth, 1).getDay();
                      const daysInMonth = new Date(calendarYear, calendarMonth + 1, 0).getDate();
                      const cells = [];
                      for (let i = 0; i < firstDay; i++) {
                        cells.push(<div key={`empty-${i}`} className="bg-white p-3 min-h-[120px]"></div>);
                      }
                      for (let day = 1; day <= daysInMonth; day++) {
                        const dateStr = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                        const isToday = dateStr === new Date().toISOString().split('T')[0];
                        const entries = getCalendarEntries(dateStr);
                        cells.push(
                          <div key={day} className={`bg-white p-2 min-h-[120px] ${isToday ? 'ring-2 ring-primary ring-inset' : ''}`}>
                            <div className={`text-sm font-medium mb-2 ${isToday ? 'text-primary' : 'text-gray-700'}`}>{day}</div>
                            <div className="space-y-1 overflow-y-auto max-h-[200px]">
                              {entries.map((entry, idx) => (
                                <div 
                                  key={idx} 
                                  className={`text-xs p-1.5 rounded cursor-pointer hover:opacity-80 ${
                                    entry.type === 'training' ? 'bg-purple-100 text-purple-700' :
                                    entry.type === 'golive-completed' ? 'bg-green-100 text-green-700' :
                                    entry.type === 'golive-paused' ? 'bg-yellow-100 text-yellow-700' :
                                    entry.type === 'golive' ? 'bg-primary/20 text-primary' :
                                    'bg-gray-100 text-gray-700'
                                  }`}
                                  onClick={() => entry.project && onSelectProject(entry.project, entry.taskId)}
                                  title={entry.label}
                                >
                                  <div className="font-medium truncate">{entry.label}</div>
                                  {entry.project && <div className="text-[10px] opacity-75 truncate">{entry.project.name}</div>}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      }
                      return cells;
                    })()}
                  </div>
                </div>
              ) : (
                <div className="p-6 grid grid-cols-3 md:grid-cols-4 gap-4">
                  {Array.from({ length: 12 }, (_, monthIdx) => {
                    const monthName = new Date(calendarYear, monthIdx).toLocaleDateString('en-US', { month: 'short' });
                    const firstDay = new Date(calendarYear, monthIdx, 1).getDay();
                    const daysInMonth = new Date(calendarYear, monthIdx + 1, 0).getDate();
                    return (
                      <div 
                        key={monthIdx} 
                        className="bg-gray-50 rounded-lg p-3 cursor-pointer hover:bg-gray-100 transition-colors"
                        onClick={() => {
                          setCalendarMonth(monthIdx);
                          setCalendarViewMode('month');
                        }}
                      >
                        <h4 className="text-sm font-bold text-gray-700 mb-2 text-center">{monthName}</h4>
                        <div className="grid grid-cols-7 gap-px text-[10px]">
                          {['S','M','T','W','T','F','S'].map((d, i) => (
                            <div key={i} className="text-center text-gray-400 font-medium">{d}</div>
                          ))}
                          {Array.from({ length: firstDay }, (_, i) => (
                            <div key={`empty-${i}`}></div>
                          ))}
                          {Array.from({ length: daysInMonth }, (_, i) => {
                            const day = i + 1;
                            const dateStr = `${calendarYear}-${String(monthIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                            const entries = getCalendarEntries(dateStr);
                            const hasGolive = entries.some(e => e.type && e.type.startsWith('golive'));
                            const hasTraining = entries.some(e => e.type === 'training');
                            return (
                              <div 
                                key={day} 
                                className={`text-center p-0.5 rounded ${
                                  hasGolive ? 'bg-primary/30 text-primary font-bold' :
                                  hasTraining ? 'bg-purple-200 text-purple-700' :
                                  'text-gray-600'
                                }`}
                              >
                                {day}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Legend */}
              <div className="px-6 pb-6 flex flex-wrap gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-purple-100"></div>
                  <span className="text-gray-600">Training/Validation Week</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-primary/20"></div>
                  <span className="text-gray-600">Go-Live (In Progress)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-green-100"></div>
                  <span className="text-gray-600">Go-Live (Completed)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded bg-yellow-100"></div>
                  <span className="text-gray-600">Go-Live (Paused)</span>
                </div>
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
                <p className="text-gray-600 mb-3">{project.clientName}</p>

                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs font-medium text-gray-600">Progress</span>
                    <span className="text-xs font-bold text-primary">{project.progressPercent || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full transition-all duration-300 ${
                        project.progressPercent === 100 ? 'bg-green-500' : 
                        project.progressPercent >= 75 ? 'bg-blue-500' : 
                        project.progressPercent >= 50 ? 'bg-yellow-500' : 
                        project.progressPercent >= 25 ? 'bg-orange-500' : 'bg-red-400'
                      }`}
                      style={{ width: `${project.progressPercent || 0}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {project.completedTasks || 0} of {project.totalTasks || 0} tasks complete
                  </div>
                  {project.goLiveDate && (() => {
                      const dateStr = project.goLiveDate;
                      let d;
                      if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                        d = new Date(dateStr + 'T12:00:00');
                      } else if (dateStr.includes('T') && dateStr.endsWith('Z')) {
                        const datePart = dateStr.split('T')[0];
                        d = new Date(datePart + 'T12:00:00');
                      } else if (dateStr.includes('T')) {
                        d = new Date(dateStr);
                      } else {
                        d = new Date(dateStr);
                      }
                      return !isNaN(d.getTime()) ? (
                        <div className="flex items-center gap-2 mt-2 text-xs">
                          <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span className="font-medium text-gray-700">Go-Live: {d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                        </div>
                      ) : null;
                    })()}
                </div>

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
                    className="w-full bg-primary text-white py-2 rounded-md hover:bg-accent"
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
                      onClick={() => copyClientLink(project)}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 rounded-md hover:bg-gray-200 text-sm"
                    >
                      Copy Client Link
                    </button>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCloneProject(project)}
                      className="flex-1 bg-purple-50 text-purple-600 py-2 rounded-md hover:bg-purple-100 text-sm"
                    >
                      Clone Project
                    </button>
                    {user.role === 'admin' && (
                      <button
                        onClick={() => handleDeleteProject(project)}
                        className="flex-1 bg-red-50 text-red-600 py-2 rounded-md hover:bg-red-100 text-sm"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {editingDomain && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-lg w-full mx-4">
              <h2 className="text-xl font-bold mb-4">Client Portal Domain</h2>
              <p className="text-sm text-gray-600 mb-4">
                Set a custom domain for client portal links. This domain will be used when copying client links.
                Leave empty to use the default domain.
              </p>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Custom Domain URL</label>
                  <input
                    placeholder="e.g., https://deapps.pro"
                    value={newDomain}
                    onChange={(e) => setNewDomain(e.target.value)}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Include https:// (e.g., https://deapps.pro)</p>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={saveClientPortalDomain}
                  className="flex-1 bg-primary text-white py-2 rounded-md hover:bg-accent"
                >
                  Save Domain
                </button>
                <button
                  onClick={() => setEditingDomain(false)}
                  className="flex-1 bg-gray-300 py-2 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
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
                <div>
                  <label className="block text-sm font-medium mb-1">Client Portal Domain (Optional)</label>
                  <input
                    value={editingProject.clientPortalDomain || ''}
                    onChange={(e) => setEditingProject({...editingProject, clientPortalDomain: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="e.g., https://deapps.pro"
                  />
                  <p className="text-xs text-gray-500 mt-1">Custom domain for this project's client portal link. Leave empty to use default.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Target Go-Live Date</label>
                  <input
                    type="date"
                    value={editingProject.goLiveDate || ''}
                    onChange={(e) => setEditingProject({...editingProject, goLiveDate: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                  <p className="text-xs text-gray-500 mt-1">Expected go-live date for this implementation.</p>
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={handleEditProject}
                  className="flex-1 bg-primary text-white py-2 rounded-md hover:bg-accent"
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
      </div>
      <footer className="mt-8 py-4 text-center text-sm text-gray-500 border-t max-w-6xl mx-auto">
        <p>Powered by Thrive365Labs | Developed by Bianca G. C. Ume, MD, MBA, MS</p>
        {user.role === 'admin' && (
          <button 
            onClick={() => { setShowActivityLog(true); loadActivityLog(); }}
            className="mt-2 text-primary hover:text-accent text-xs underline"
          >
            View Activity Log
          </button>
        )}
      </footer>

      {showActivityLog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-primary">Activity Log</h2>
              <button onClick={() => setShowActivityLog(false)} className="text-gray-500 hover:text-gray-700 text-xl">&times;</button>
            </div>
            <div className="p-4 overflow-y-auto flex-1">
              {activityLoading ? (
                <p className="text-gray-500 text-center">Loading...</p>
              ) : activityLog.length === 0 ? (
                <p className="text-gray-500 text-center">No activity recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {activityLog.map(activity => (
                    <div key={activity.id} className="p-3 bg-gray-50 rounded-lg border text-sm">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-medium text-gray-800">{activity.userName}</span>
                          <span className="text-gray-600 ml-2">
                            {activity.action === 'completed' && 'completed task'}
                            {activity.action === 'reopened' && 'reopened task'}
                            {activity.action === 'updated' && 'updated task'}
                            {activity.action === 'created' && `created ${activity.entityType}`}
                            {activity.action === 'deleted' && `deleted ${activity.entityType}`}
                          </span>
                        </div>
                        <span className="text-xs text-gray-400">
                          {new Date(activity.timestamp).toLocaleString()}
                        </span>
                      </div>
                      {activity.details && activity.details.taskTitle && (
                        <p className="text-gray-600 mt-1 truncate">
                          "{activity.details.taskTitle}"
                          {activity.details.stage && <span className="text-gray-400 ml-2">in {activity.details.stage}</span>}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-3 border-t bg-gray-50 text-center text-xs text-gray-500">
              Showing last 100 activities
            </div>
          </div>
        </div>
      )}
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
  // Group tasks by phase and stage
  const rawGroupedByPhase = {};
  tasks.forEach(task => {
    const phase = task.phase || 'No Phase';
    if (!rawGroupedByPhase[phase]) {
      rawGroupedByPhase[phase] = {};
    }
    const stage = task.stage || 'General';
    if (!rawGroupedByPhase[phase][stage]) {
      rawGroupedByPhase[phase][stage] = [];
    }
    rawGroupedByPhase[phase][stage].push(task);
  });

  // Ensure all phases and stages are always visible (even if empty)
  const groupedByPhase = ensureAllPhasesAndStages(rawGroupedByPhase);

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
        {PHASE_ORDER.map(phase => {
          const phaseData = groupedByPhase[phase] || {};
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
                      {stageTasks.length === 0 ? (
                        <p className="text-gray-400 text-sm italic">No tasks in this stage</p>
                      ) : (
                        stageTasks.map(task => (
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
                                  {task.completed && task.dateCompleted && (
                                    <span className="text-green-600">Completed: {formatDateForDisplay(task.dateCompleted)}</span>
                                  )}
                                  {task.owner && <span>Owner: {task.owner}</span>}
                                </div>
                              )}
                              {viewMode === 'client' && task.completed && task.dateCompleted && (
                                <p className="mt-1 text-xs text-green-600">
                                  Completed: {formatDateForDisplay(task.dateCompleted)}
                                </p>
                              )}
                            </div>
                          </div>
                        ))
                      )}
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

  const normalizeToDateStr = (date) => {
    if (!date) return '';
    // Handle YYYY-MM-DD format
    if (/^\d{4}-\d{2}-\d{2}/.test(date)) return date.substring(0, 10);
    // Handle MM/DD/YYYY or M/D/YYYY format
    const slashMatch = date.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
    if (slashMatch) {
      let [, month, day, year] = slashMatch;
      if (year.length === 2) year = parseInt(year) > 50 ? '19' + year : '20' + year;
      return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    }
    return date;
  };

  const getTasksForDateStr = (dateStr) => {
    return tasks.filter(t => 
      normalizeToDateStr(t.dueDate) === dateStr || 
      normalizeToDateStr(t.dateCompleted) === dateStr
    );
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
          <button onClick={goToToday} className="text-sm text-primary hover:underline">
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
                      {task.owner && <span>Owner: {task.owner}</span>}
                      {task.dueDate && <span>Due: {task.dueDate}</span>}
                      {task.completed && task.dateCompleted && <span className="text-green-600">Completed: {formatDateForDisplay(task.dateCompleted)}</span>}
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

// ============== SOFT-PILOT CHECKLIST COMPONENT ==============
const SoftPilotChecklist = ({ token, project, tasks, teamMembers, onClose, onSubmitSuccess, onTaskUpdate }) => {
  const [signature, setSignature] = useState({ name: '', title: '', date: new Date().toISOString().split('T')[0] });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [localTasks, setLocalTasks] = useState([]);
  const [hasChanges, setHasChanges] = useState(false);

  const isResubmission = !!project.softPilotChecklistSubmitted;
  
  useEffect(() => {
    const softPilotOnly = tasks.filter(t => t.stage === 'Sprint 3: Soft-Pilot');
    setLocalTasks(JSON.parse(JSON.stringify(softPilotOnly)));
  }, [tasks]);

  const softPilotTasks = localTasks;
  
  const getOwnerName = (email) => {
    if (!email) return '';
    const member = teamMembers.find(m => m.email?.toLowerCase() === email.toLowerCase());
    return member ? member.name : email;
  };

  const toggleTaskCompletion = async (taskId) => {
    const updatedTasks = localTasks.map(t => {
      if (t.id === taskId) {
        const newCompleted = !t.completed;
        return { 
          ...t, 
          completed: newCompleted,
          dateCompleted: newCompleted ? new Date().toISOString().split('T')[0] : null
        };
      }
      return t;
    });
    setLocalTasks(updatedTasks);
    setHasChanges(true);
    
    const task = updatedTasks.find(t => t.id === taskId);
    if (onTaskUpdate && task) {
      await onTaskUpdate(taskId, { 
        completed: task.completed, 
        dateCompleted: task.dateCompleted 
      });
    }
  };

  const toggleSubtaskStatus = async (taskId, subtaskId) => {
    const updatedTasks = localTasks.map(t => {
      if (t.id === taskId && t.subtasks) {
        const updatedSubtasks = t.subtasks.map(st => {
          if (st.id === subtaskId) {
            const statusCycle = ['Pending', 'Complete', 'N/A'];
            const currentIndex = statusCycle.indexOf(st.status || 'Pending');
            const nextStatus = statusCycle[(currentIndex + 1) % statusCycle.length];
            return { ...st, status: nextStatus };
          }
          return st;
        });
        return { ...t, subtasks: updatedSubtasks };
      }
      return t;
    });
    setLocalTasks(updatedTasks);
    setHasChanges(true);
    
    const task = updatedTasks.find(t => t.id === taskId);
    if (onTaskUpdate && task) {
      await onTaskUpdate(taskId, { subtasks: task.subtasks });
    }
  };

  const generateChecklistHtml = () => {
    const taskRows = softPilotTasks.map(task => {
      const subtaskRows = (task.subtasks || []).map(st => `
        <tr style="background-color: #f9fafb;">
          <td style="padding: 8px; border: 1px solid #e5e7eb; padding-left: 30px;">└ ${st.title || ''}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${getOwnerName(st.owner)}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${st.status || 'Pending'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${st.status === 'Complete' ? '☑' : '☐'}</td>
        </tr>
      `).join('');
      
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #e5e7eb; font-weight: ${task.subtasks?.length ? 'bold' : 'normal'};">${task.taskTitle}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${getOwnerName(task.owner)}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb;">${task.completed ? 'Complete' : 'Pending'}</td>
          <td style="padding: 8px; border: 1px solid #e5e7eb; text-align: center;">${task.completed ? '☑' : '☐'}</td>
        </tr>
        ${subtaskRows}
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Soft-Pilot Checklist - ${project.name}</title>
  <style>
    body { font-family: 'Open Sans', Arial, sans-serif; padding: 40px; max-width: 900px; margin: 0 auto; }
    h1 { color: #045E9F; margin-bottom: 5px; }
    h2 { color: #00205A; margin-top: 30px; }
    table { width: 100%; border-collapse: collapse; margin: 20px 0; }
    th { background-color: #045E9F; color: white; padding: 12px 8px; text-align: left; }
    .signature-section { margin-top: 50px; border-top: 2px solid #e5e7eb; padding-top: 30px; }
    .signature-field { margin: 15px 0; }
    .signature-label { font-weight: bold; color: #374151; }
    .signature-value { border-bottom: 1px solid #374151; padding: 5px 0; min-width: 250px; display: inline-block; }
  </style>
</head>
<body>
  <img src="/thrive365-logo.webp" alt="Thrive 365 Labs" style="max-width: 200px; margin-bottom: 20px;">
  <h1>Soft-Pilot Checklist</h1>
  <p style="color: #6b7280; margin-bottom: 5px;"><strong>Project:</strong> ${project.name}</p>
  <p style="color: #6b7280; margin-bottom: 20px;"><strong>Client:</strong> ${project.clientName}</p>
  <p style="color: #6b7280;"><strong>Date Generated:</strong> ${new Date().toLocaleDateString()}</p>

  <h2>Sprint 3: Soft-Pilot Tasks</h2>
  <table>
    <thead>
      <tr>
        <th>Task</th>
        <th>Owner</th>
        <th>Status</th>
        <th>Verified</th>
      </tr>
    </thead>
    <tbody>
      ${taskRows}
    </tbody>
  </table>

  <div class="signature-section">
    <h2>Clinical Application Specialist Signature</h2>
    <div class="signature-field">
      <span class="signature-label">Name:</span>
      <span class="signature-value">${signature.name}</span>
    </div>
    <div class="signature-field">
      <span class="signature-label">Title:</span>
      <span class="signature-value">${signature.title}</span>
    </div>
    <div class="signature-field">
      <span class="signature-label">Date:</span>
      <span class="signature-value">${signature.date}</span>
    </div>
  </div>

  <footer style="margin-top: 50px; text-align: center; color: #9ca3af; font-size: 12px;">
    <p>Powered by Thrive365Labs | Developed by Bianca G. C. Ume, MD, MBA, MS</p>
    <p>Thrive 365 Labs - Portal</p>
  </footer>
</body>
</html>
    `;
  };

  const handleSubmit = async () => {
    if (!signature.name.trim() || !signature.title.trim()) {
      setError('Please enter your name and title');
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const checklistHtml = generateChecklistHtml();
      const result = await api.submitSoftPilotChecklist(token, project.id, {
        signature,
        checklistHtml,
        projectName: project.name,
        clientName: project.clientName,
        isResubmission
      });
      
      if (result.error) {
        setError(result.error);
      } else {
        onSubmitSuccess();
        onClose();
      }
    } catch (err) {
      setError('Failed to submit checklist. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b bg-gradient-to-r from-primary to-accent text-white">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Soft-Pilot Checklist</h2>
              <p className="text-blue-100">{project.name} - {project.clientName}</p>
            </div>
            <button onClick={onClose} className="text-white hover:text-blue-200 text-2xl">&times;</button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {isResubmission && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center gap-2 text-amber-800">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="font-medium">Previously Submitted</span>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Last submitted on {new Date(project.softPilotChecklistSubmitted.submittedAt).toLocaleDateString()} 
                by {project.softPilotChecklistSubmitted.submittedBy}. 
                You can edit and resubmit - an updated note will be sent to HubSpot.
              </p>
            </div>
          )}

          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              Click on tasks to mark them complete or incomplete. Click on subtasks to cycle through Pending → Complete → N/A. Changes are saved automatically.
            </p>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Sprint 3: Soft-Pilot Tasks ({softPilotTasks.length})</h3>
            <div className="space-y-2">
              {softPilotTasks.map(task => (
                <div key={task.id} className="border rounded-lg p-3 hover:bg-gray-50">
                  <div 
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={() => toggleTaskCompletion(task.id)}
                  >
                    <span className={`text-lg ${task.completed ? 'text-green-600' : 'text-gray-400'} hover:scale-110 transition-transform`}>
                      {task.completed ? '☑' : '☐'}
                    </span>
                    <div className="flex-1">
                      <div className={`font-medium ${task.completed ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                        {task.taskTitle}
                      </div>
                      <div className="text-sm text-gray-500">
                        Owner: {getOwnerName(task.owner) || 'Unassigned'}
                      </div>
                    </div>
                  </div>
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="ml-8 mt-2 space-y-1">
                      {task.subtasks.map(st => (
                        <div 
                          key={st.id} 
                          className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer hover:bg-gray-100 p-1 rounded"
                          onClick={(e) => { e.stopPropagation(); toggleSubtaskStatus(task.id, st.id); }}
                        >
                          <span className={`${st.status === 'Complete' ? 'text-green-600' : 'text-gray-400'} hover:scale-110 transition-transform`}>
                            {st.status === 'Complete' ? '☑' : st.status === 'N/A' ? '○' : '☐'}
                          </span>
                          <span className={st.status === 'Complete' ? 'line-through' : ''}>
                            {st.title} - {getOwnerName(st.owner) || 'Unassigned'}
                          </span>
                          <span className={`text-xs px-2 py-0.5 rounded ${
                            st.status === 'Complete' ? 'bg-green-100 text-green-700' :
                            st.status === 'N/A' ? 'bg-gray-100 text-gray-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {st.status || 'Pending'}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Clinical Application Specialist Signature</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={signature.name}
                  onChange={(e) => setSignature({...signature, name: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input
                  type="text"
                  value={signature.title}
                  onChange={(e) => setSignature({...signature, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Clinical Application Specialist"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
                <input
                  type="date"
                  value={signature.date}
                  onChange={(e) => setSignature({...signature, date: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                />
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-4 p-3 bg-red-50 text-red-700 rounded-md">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-between items-center">
          <p className="text-sm text-gray-500">
            {isResubmission 
              ? 'Updated checklist will be saved to Drive > Operations > Installations > Client Onboarding > "Soft" Launches. HubSpot will receive notes automatically.' 
              : 'This checklist will be saved to Drive > Operations > Installations > Client Onboarding > "Soft" Launches. HubSpot will receive notes automatically.'}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || !project.hubspotRecordId}
              className="px-6 py-2 bg-primary text-white rounded-md hover:bg-accent disabled:bg-gray-400"
            >
              {submitting ? 'Submitting...' : isResubmission ? 'Resubmit & Upload' : 'Submit & Upload'}
            </button>
          </div>
        </div>
        
        {!project.hubspotRecordId && (
          <div className="px-6 pb-4 bg-gray-50">
            <p className="text-sm text-amber-600">
              Note: This project needs a HubSpot Record ID to upload the checklist. Edit project details to add one.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============== PROJECT TRACKER COMPONENT ==============
const ProjectTracker = ({ token, user, project, scrollToTaskId, onBack, onLogout }) => {
  const [tasks, setTasks] = useState([]);
  const [viewMode, setViewMode] = useState('internal');
  const [viewType, setViewType] = useState('list');
  const [editingTask, setEditingTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPhases, setSelectedPhases] = useState([]);
  const [selectedOwners, setSelectedOwners] = useState([]);
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showPhaseDropdown, setShowPhaseDropdown] = useState(false);
  const [showOwnerDropdown, setShowOwnerDropdown] = useState(false);
  const [expandedTaskId, setExpandedTaskId] = useState(null);
  const [newNote, setNewNote] = useState('');
  const [editingNote, setEditingNote] = useState(null);
  const [editingNoteContent, setEditingNoteContent] = useState('');
  const [syncingToHubSpot, setSyncingToHubSpot] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [newTask, setNewTask] = useState({ taskTitle: '', owner: '', secondaryOwner: '', dueDate: '', phase: 'Phase 1', stage: '', showToClient: false, clientName: '', dependencies: [] });
  const [teamMembers, setTeamMembers] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [newSubtask, setNewSubtask] = useState({ taskId: null, title: '', owner: '', dueDate: '' });
  const [expandedSubtasksId, setExpandedSubtasksId] = useState(null);
  const [clientPortalDomain, setClientPortalDomain] = useState('');
  const [showSoftPilotChecklist, setShowSoftPilotChecklist] = useState(false);
  const [creatingTemplate, setCreatingTemplate] = useState(false);

  const isAdmin = user.role === 'admin';
  
  const handleCreateTemplate = async () => {
    const templateName = prompt('Enter a name for this template:', `${project.name} Template`);
    if (!templateName) return;
    
    setCreatingTemplate(true);
    try {
      // Create ID mapping from original task IDs to new sequential IDs
      const idMap = {};
      tasks.forEach((task, idx) => {
        idMap[task.id] = idx + 1;
      });
      
      // Create template tasks from current project tasks
      // Preserve task structure but strip runtime data (owners, due dates, completion, notes)
      const templateTasks = tasks.map((task, idx) => ({
        id: idx + 1,
        taskTitle: task.taskTitle,
        phase: task.phase,
        stage: task.stage,
        showToClient: task.showToClient !== undefined ? task.showToClient : true,
        clientName: task.clientName || '',
        description: task.description || '',
        // Remap dependencies to new sequential IDs
        dependencies: (task.dependencies || []).map(depId => idMap[depId]).filter(Boolean),
        order: task.order || idx + 1,
        subtasks: (task.subtasks || []).map((st, stIdx) => ({
          id: stIdx + 1,
          title: st.title,
          description: st.description || '',
          owner: st.owner || '',
          dueDate: st.dueDate || ''
        }))
      }));
      
      // Count subtasks for the success message
      const totalSubtasks = templateTasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0);
      console.log('Creating template with tasks:', templateTasks.length, 'subtasks:', totalSubtasks);
      console.log('Sample task with subtasks:', templateTasks.find(t => t.subtasks?.length > 0));
      
      const result = await api.createTemplate(token, {
        name: templateName,
        description: `Created from ${project.name} on ${new Date().toLocaleDateString()}`,
        tasks: templateTasks
      });
      
      if (result.error) {
        alert('Failed to create template: ' + result.error);
      } else {
        alert(`Template "${templateName}" created successfully with ${templateTasks.length} tasks and ${totalSubtasks} subtasks!`);
      }
    } catch (err) {
      console.error('Failed to create template:', err);
      alert('Failed to create template');
    } finally {
      setCreatingTemplate(false);
    }
  };

  useEffect(() => {
    loadTasks();
    loadTeamMembers();
    loadClientPortalDomain();
  }, []);
  
  // Scroll to specific task if scrollToTaskId is provided
  useEffect(() => {
    if (scrollToTaskId && !loading && tasks.length > 0) {
      // Set view to list to ensure task is visible
      setViewType('list');
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        const taskElement = document.getElementById(`task-${scrollToTaskId}`);
        if (taskElement) {
          taskElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
          // Highlight the task briefly
          taskElement.classList.add('ring-2', 'ring-primary', 'ring-offset-2');
          setTimeout(() => {
            taskElement.classList.remove('ring-2', 'ring-primary', 'ring-offset-2');
          }, 3000);
        }
      }, 300);
    }
  }, [scrollToTaskId, loading, tasks]);

  const loadClientPortalDomain = async () => {
    try {
      const result = await api.getClientPortalDomain(token);
      setClientPortalDomain(result.domain || '');
    } catch (err) {
      console.error('Failed to load client portal domain:', err);
    }
  };

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
      // Pass project ID to filter team members to only those assigned to this project
      const data = await api.getTeamMembers(token, project.id);
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

  // Get all unique owners from tasks AND team members combined
  const getAllOwners = () => {
    const ownerSet = new Set();
    const ownerList = [];
    
    // Add team members first
    teamMembers.forEach(m => {
      if (!ownerSet.has(m.email)) {
        ownerSet.add(m.email);
        ownerList.push({ email: m.email, name: m.name });
      }
    });
    
    // Add unique owners from tasks that aren't already in team members
    tasks.forEach(t => {
      if (t.owner && !ownerSet.has(t.owner)) {
        ownerSet.add(t.owner);
        ownerList.push({ email: t.owner, name: t.owner });
      }
      // Also check subtask owners
      (t.subtasks || []).forEach(st => {
        if (st.owner && !ownerSet.has(st.owner)) {
          ownerSet.add(st.owner);
          ownerList.push({ email: st.owner, name: st.owner });
        }
      });
    });
    
    return ownerList;
  };

  const allOwners = getAllOwners();

  const handleBulkComplete = async (completed) => {
    if (selectedTasks.length === 0) return;
    try {
      await api.bulkUpdateTasks(token, project.id, selectedTasks, completed);
      // Update local state
      const dateCompleted = completed ? new Date().toISOString() : null;
      setTasks(tasks.map(t => 
        selectedTasks.includes(t.id) 
          ? { ...t, completed, dateCompleted: completed ? (t.dateCompleted || dateCompleted) : t.dateCompleted }
          : t
      ));
      setSelectedTasks([]);
      setBulkMode(false);
    } catch (err) {
      console.error('Failed to bulk update tasks:', err);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedTasks.length === 0) return;
    if (!confirm(`Are you sure you want to delete ${selectedTasks.length} tasks? This cannot be undone.`)) return;
    try {
      const result = await api.bulkDeleteTasks(token, project.id, selectedTasks);
      if (result.error) {
        alert(result.error);
      } else {
        alert(result.message);
        // Update local state
        setTasks(tasks.filter(t => !selectedTasks.includes(t.id)));
        setSelectedTasks([]);
        setBulkMode(false);
      }
    } catch (err) {
      console.error('Failed to bulk delete tasks:', err);
      alert('Failed to delete tasks');
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
      const result = await api.addSubtask(token, project.id, taskId, {
        title: newSubtask.title,
        owner: newSubtask.owner,
        dueDate: newSubtask.dueDate,
        showToClient: newSubtask.showToClient !== false
      });
      // Update local state with the new subtask
      setTasks(tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: [...(t.subtasks || []), result.subtask || { id: Date.now().toString(), title: newSubtask.title, owner: newSubtask.owner, dueDate: newSubtask.dueDate, showToClient: newSubtask.showToClient !== false, completed: false, notApplicable: false }]
          };
        }
        return t;
      }));
      setNewSubtask({ taskId: null, title: '', owner: '', dueDate: '' });
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
      // Update local state
      setTasks(tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: (t.subtasks || []).map(s =>
              s.id === subtaskId ? { ...s, ...updates } : s
            )
          };
        }
        return t;
      }));
    } catch (err) {
      console.error('Failed to update subtask:', err);
    }
  };

  const handleSubtaskDueDateChange = async (taskId, subtaskId, dueDate) => {
    try {
      const updates = { dueDate: dueDate || null };
      await api.updateSubtask(token, project.id, taskId, subtaskId, updates);
      // Update local state using functional updater to avoid stale state
      setTasks(prevTasks => prevTasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: (t.subtasks || []).map(s =>
              s.id === subtaskId ? { ...s, ...updates } : s
            )
          };
        }
        return t;
      }));
    } catch (err) {
      console.error('Failed to update subtask due date:', err);
    }
  };

  const handleSubtaskShowToClientChange = async (taskId, subtaskId, showToClient) => {
    try {
      const updates = { showToClient };
      await api.updateSubtask(token, project.id, taskId, subtaskId, updates);
      setTasks(prevTasks => prevTasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: (t.subtasks || []).map(s =>
              s.id === subtaskId ? { ...s, ...updates } : s
            )
          };
        }
        return t;
      }));
    } catch (err) {
      console.error('Failed to update subtask visibility:', err);
    }
  };

  const getSubtaskStatus = (subtask) => {
    // Support both new format (completed boolean) and old format (status string)
    if (subtask.notApplicable || subtask.status === 'N/A' || subtask.status === 'not_applicable') return 'not_applicable';
    if (subtask.completed || subtask.status === 'Complete' || subtask.status === 'completed') return 'completed';
    return 'pending';
  };

  const hasIncompleteSubtasks = (task) => {
    if (!task.subtasks || task.subtasks.length === 0) return false;
    return task.subtasks.some(s => {
      const isComplete = s.completed || s.status === 'Complete' || s.status === 'completed';
      const isNotApplicable = s.notApplicable || s.status === 'N/A' || s.status === 'not_applicable';
      return !isComplete && !isNotApplicable;
    });
  };

  const handleDeleteSubtask = async (taskId, subtaskId) => {
    if (!confirm('Delete this subtask?')) return;
    try {
      await api.deleteSubtask(token, project.id, taskId, subtaskId);
      // Update local state
      setTasks(tasks.map(t => {
        if (t.id === taskId) {
          return {
            ...t,
            subtasks: (t.subtasks || []).filter(s => s.id !== subtaskId)
          };
        }
        return t;
      }));
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
        ? new Date().toISOString()
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
      dateCompleted: normalizeDateForInput(task.dateCompleted) || '',
      dueDate: normalizeDateForInput(task.dueDate) || '',
      owner: task.owner || '',
      secondaryOwner: task.secondaryOwner || '',
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
        dateCompleted: editingTask.dateCompleted || null,
        dependencies: editingTask.dependencies
      };

      if (isAdmin) {
        updates.owner = editingTask.owner;
        updates.secondaryOwner = editingTask.secondaryOwner || null;
        updates.dueDate = editingTask.dueDate || null;
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

  const handleReorderTask = async (taskId, direction) => {
    try {
      const result = await api.reorderTask(token, project.id, taskId, direction);
      if (result.tasks) {
        setTasks(result.tasks);
      }
    } catch (err) {
      console.error('Failed to reorder task:', err);
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

  const handleUpdateNote = async (taskId, noteId) => {
    if (!editingNoteContent.trim()) return;
    try {
      const updatedNote = await api.updateNote(token, project.id, taskId, noteId, editingNoteContent);
      if (updatedNote.error) {
        alert(updatedNote.error);
        return;
      }
      setTasks(tasks.map(t => {
        if (t.id === taskId) {
          return { 
            ...t, 
            notes: (t.notes || []).map(n => n.id === noteId ? updatedNote : n) 
          };
        }
        return t;
      }));
      setEditingNote(null);
      setEditingNoteContent('');
    } catch (err) {
      console.error('Failed to update note:', err);
    }
  };

  const handleDeleteNote = async (taskId, noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) return;
    try {
      const result = await api.deleteNote(token, project.id, taskId, noteId);
      if (result.error) {
        alert(result.error);
        return;
      }
      setTasks(tasks.map(t => {
        if (t.id === taskId) {
          return { 
            ...t, 
            notes: (t.notes || []).filter(n => n.id !== noteId) 
          };
        }
        return t;
      }));
    } catch (err) {
      console.error('Failed to delete note:', err);
    }
  };

  const handleCreateTask = async () => {
    if (!newTask.taskTitle.trim()) return;
    try {
      const created = await api.createTask(token, project.id, newTask);
      setTasks([...tasks, created]);
      setNewTask({ taskTitle: '', owner: '', secondaryOwner: '', dueDate: '', phase: 'Phase 1', stage: '', showToClient: false, clientName: '', dependencies: [] });
      setShowAddTask(false);
    } catch (err) {
      console.error('Failed to create task:', err);
    }
  };

  const handleImportProjectCSV = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvData = parseCSV(event.target.result);
        if (csvData.length === 0) {
          alert('No valid tasks found in CSV');
          return;
        }
        const result = await api.importCsvToProject(token, project.id, csvData);
        if (result.error) {
          alert(result.error);
        } else {
          alert(result.message);
          loadTasks();
        }
      } catch (err) {
        console.error('CSV import error:', err);
        alert('Failed to import CSV');
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const getBaseUrlForProject = (domain) => {
    if (!domain) return 'https://deapps.pro';
    try {
      const url = new URL(domain);
      return url.origin;
    } catch {
      return 'https://deapps.pro';
    }
  };

  const copyClientLink = () => {
    const baseUrl = getBaseUrlForProject(project.clientPortalDomain || clientPortalDomain);
    const link = `${baseUrl}/thrive365labslaunch/${project.clientLinkSlug || project.clientLinkId}`;
    navigator.clipboard.writeText(link);
    alert(`Link copied!\n\n${link}`);
  };

  const getClientLinkDisplay = () => {
    const baseUrl = getBaseUrlForProject(project.clientPortalDomain || clientPortalDomain);
    return `${baseUrl}/thrive365labslaunch/${project.clientLinkSlug || project.clientLinkId}`;
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

    // Multi-select phase filter
    if (selectedPhases.length > 0) {
      filtered = filtered.filter(t => selectedPhases.includes(t.phase));
    }

    // Multi-select owner filter (includes subtask owners)
    if (viewMode === 'internal' && selectedOwners.length > 0) {
      filtered = filtered.filter(t => {
        // Check if task owner matches
        if (selectedOwners.includes('unassigned') && (!t.owner || t.owner.trim() === '')) {
          return true;
        }
        if (t.owner && selectedOwners.includes(t.owner)) {
          return true;
        }
        // Check if any subtask owner matches
        if (t.subtasks && t.subtasks.length > 0) {
          return t.subtasks.some(st => st.owner && selectedOwners.includes(st.owner));
        }
        return false;
      });
    }

    // Status filter
    if (selectedStatus !== 'all') {
      if (selectedStatus === 'completed') {
        filtered = filtered.filter(t => t.completed);
      } else if (selectedStatus === 'uncompleted') {
        filtered = filtered.filter(t => !t.completed);
      }
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(t => {
        const taskTitle = (t.taskTitle || '').toLowerCase();
        const clientName = (t.clientName || '').toLowerCase();
        const owner = (t.owner || '').toLowerCase();
        const ownerName = getOwnerName(t.owner).toLowerCase();
        const phase = (t.phase || '').toLowerCase();
        const stage = (t.stage || '').toLowerCase();
        
        // Check main task fields
        if (taskTitle.includes(query) || clientName.includes(query) || 
            owner.includes(query) || ownerName.includes(query) ||
            phase.includes(query) || stage.includes(query)) {
          return true;
        }
        
        // Check subtasks
        if (t.subtasks && t.subtasks.length > 0) {
          return t.subtasks.some(st => 
            (st.title || '').toLowerCase().includes(query) ||
            (st.owner || '').toLowerCase().includes(query) ||
            getOwnerName(st.owner).toLowerCase().includes(query)
          );
        }
        
        return false;
      });
    }

    return filtered;
  };

  const getTaskName = (task) =>
    (viewMode === 'client' && task.clientName) ? task.clientName : task.taskTitle;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.completed).length;
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Group filtered tasks by phase and stage
  const rawGroupedByPhase = getFilteredTasks().reduce((acc, task, idx) => {
    if (!acc[task.phase]) acc[task.phase] = {};
    const stageKey = task.stage || 'General';
    if (!acc[task.phase][stageKey]) acc[task.phase][stageKey] = [];
    acc[task.phase][stageKey].push({ ...task, _originalIdx: idx });
    return acc;
  }, {});

  // Sort tasks within each stage by stageOrder (or original index as fallback)
  Object.keys(rawGroupedByPhase).forEach(phase => {
    Object.keys(rawGroupedByPhase[phase]).forEach(stage => {
      rawGroupedByPhase[phase][stage].sort((a, b) => 
        (a.stageOrder || a._originalIdx + 1) - (b.stageOrder || b._originalIdx + 1)
      );
    });
  });

  // Ensure all phases and stages are always visible (even if empty)
  const groupedByPhase = ensureAllPhasesAndStages(rawGroupedByPhase);

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
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} onLogout={onLogout}>
        <button onClick={onBack} className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide">
          ← Back
        </button>
        <button
          onClick={() => api.exportProject(token, project.id)}
          className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide"
        >
          Export CSV
        </button>
      </AppHeader>

      <div className="p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
              <p className="text-gray-600">{project.clientName}</p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setViewMode('internal')}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  viewMode === 'internal'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Internal
              </button>
              <button
                onClick={() => setViewMode('client')}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  viewMode === 'client'
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Client View
              </button>
              
              <div className="border-l border-gray-300 mx-2"></div>
              
              <button
                onClick={() => setViewType('list')}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  viewType === 'list'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                List
              </button>
              <button
                onClick={() => setViewType('timeline')}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  viewType === 'timeline'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setViewType('calendar')}
                className={`px-3 py-1.5 rounded-md text-sm ${
                  viewType === 'calendar'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-200 text-gray-700'
                }`}
              >
                Calendar
              </button>
              
              {isAdmin && viewType === 'list' && (
                <>
                  <div className="border-l border-gray-300 mx-2"></div>
                  <button
                    onClick={handleCreateTemplate}
                    disabled={creatingTemplate || tasks.length === 0}
                    className="px-3 py-1.5 rounded-md text-sm bg-green-600 text-white hover:bg-green-700 disabled:bg-gray-400"
                    title="Create a reusable template from this board's tasks"
                  >
                    {creatingTemplate ? 'Creating...' : 'Create Template'}
                  </button>
                </>
              )}
            </div>
          </div>

          {viewMode === 'internal' && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-600">Client Link (embeddable):</span>
                <button
                  onClick={copyClientLink}
                  className="text-primary hover:underline font-mono text-xs"
                >
                  {getClientLinkDisplay()}
                </button>
              </div>
              {project.hubspotRecordId && (
                <div className="flex items-center gap-3 text-sm text-gray-600 flex-wrap">
                  <p>HubSpot Record ID: <span className="font-medium">{project.hubspotRecordId}</span></p>
                  {project.lastHubSpotSync && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Last synced: {new Date(project.lastHubSpotSync).toLocaleString()}
                    </span>
                  )}
                  {isAdmin && (
                    <button
                      onClick={async () => {
                        if (!confirm('This will sync all completed tasks to HubSpot. Continue?')) return;
                        setSyncingToHubSpot(true);
                        try {
                          const result = await api.syncToHubSpot(token, project.id);
                          if (result.error) {
                            alert(result.error);
                          } else {
                            alert(result.message);
                            loadTasks();
                          }
                        } catch (err) {
                          alert('Failed to sync to HubSpot');
                        } finally {
                          setSyncingToHubSpot(false);
                        }
                      }}
                      disabled={syncingToHubSpot}
                      className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded hover:bg-orange-200 disabled:opacity-50"
                    >
                      {syncingToHubSpot ? 'Syncing...' : 'Sync All to HubSpot'}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {/* Search bar - works across all views */}
            <div className="flex gap-3 items-end">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Search Tasks</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by title, owner, phase, stage, or subtask..."
                  className="w-full px-3 py-2 border rounded-md text-sm"
                />
              </div>
              {(searchQuery || selectedPhases.length > 0 || selectedOwners.length > 0 || selectedStatus !== 'all') && (
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setSelectedPhases([]);
                    setSelectedOwners([]);
                    setSelectedStatus('all');
                  }}
                  className="px-3 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  Clear Filters
                </button>
              )}
            </div>

            {viewType === 'list' && (
            <div className="flex flex-wrap gap-3">
              {/* Phase multi-select */}
              <div className="relative">
                <label className="block text-xs text-gray-500 mb-1">Phases</label>
                <div className="relative">
                  <button
                    onClick={() => setShowPhaseDropdown(!showPhaseDropdown)}
                    className="px-3 py-2 border rounded-md text-sm bg-white min-w-[140px] text-left flex justify-between items-center"
                  >
                    <span>{selectedPhases.length === 0 ? 'All Phases' : `${selectedPhases.length} selected`}</span>
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showPhaseDropdown && (
                    <div className="absolute z-50 mt-1 w-48 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                      <div className="p-2 border-b">
                        <button
                          onClick={() => setSelectedPhases([])}
                          className="text-xs text-primary hover:underline"
                        >
                          Clear All
                        </button>
                      </div>
                      {phases.map(phase => (
                        <label key={phase} className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={selectedPhases.includes(phase)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedPhases([...selectedPhases, phase]);
                              } else {
                                setSelectedPhases(selectedPhases.filter(p => p !== phase));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm">{phase}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              {/* Owner multi-select */}
              {viewMode === 'internal' && (
                <div className="relative">
                  <label className="block text-xs text-gray-500 mb-1">Owners</label>
                  <div className="relative">
                    <button
                      onClick={() => setShowOwnerDropdown(!showOwnerDropdown)}
                      className="px-3 py-2 border rounded-md text-sm bg-white min-w-[140px] text-left flex justify-between items-center"
                    >
                      <span>{selectedOwners.length === 0 ? 'All Owners' : `${selectedOwners.length} selected`}</span>
                      <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    {showOwnerDropdown && (
                      <div className="absolute z-50 mt-1 w-56 bg-white border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        <div className="p-2 border-b">
                          <button
                            onClick={() => setSelectedOwners([])}
                            className="text-xs text-primary hover:underline"
                          >
                            Clear All
                          </button>
                        </div>
                        <label className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer border-b">
                          <input
                            type="checkbox"
                            checked={selectedOwners.includes('unassigned')}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedOwners([...selectedOwners, 'unassigned']);
                              } else {
                                setSelectedOwners(selectedOwners.filter(o => o !== 'unassigned'));
                              }
                            }}
                            className="mr-2"
                          />
                          <span className="text-sm italic text-gray-500">Unassigned</span>
                        </label>
                        {owners.map(owner => (
                          <label key={owner} className="flex items-center px-3 py-2 hover:bg-gray-100 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={selectedOwners.includes(owner)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedOwners([...selectedOwners, owner]);
                                } else {
                                  setSelectedOwners(selectedOwners.filter(o => o !== owner));
                                }
                              }}
                              className="mr-2"
                            />
                            <span className="text-sm">{getOwnerName(owner)}</span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
              
              <div>
                <label className="block text-xs text-gray-500 mb-1">Status</label>
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
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                        <button
                          onClick={handleBulkDelete}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        >
                          Delete {selectedTasks.length}
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
                      className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent text-sm"
                    >
                      + Add Task
                    </button>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                    <label className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm inline-block">
                      Import CSV
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleImportProjectCSV}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">&nbsp;</label>
                    <button
                      onClick={downloadSampleCSV}
                      className="px-3 py-2 text-purple-600 hover:text-purple-800 text-sm underline"
                    >
                      Download Template
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex flex-wrap gap-4 text-sm">
            <button
              onClick={() => document.getElementById('phase-Phase 0')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 hover:bg-purple-50 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span>Phase 0: Contract Signature</span>
            </button>
            <button
              onClick={() => document.getElementById('phase-Phase 1')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 hover:bg-blue-50 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span>Phase 1: Pre-Launch</span>
            </button>
            <button
              onClick={() => document.getElementById('phase-Phase 2')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 hover:bg-green-50 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Phase 2: Implementation Sprints</span>
            </button>
            <button
              onClick={() => document.getElementById('phase-Phase 3')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 hover:bg-orange-50 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span>Phase 3: Go-Live</span>
            </button>
            <button
              onClick={() => document.getElementById('phase-Phase 4')?.scrollIntoView({ behavior: 'smooth' })}
              className="flex items-center gap-2 hover:bg-pink-50 px-2 py-1 rounded transition-colors cursor-pointer"
            >
              <div className="w-3 h-3 bg-pink-500 rounded"></div>
              <span>Phase 4: Post-Launch Optimization</span>
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900">Overall Project Progress</h3>
            <span className="text-xl font-bold text-primary">{progressPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-primary to-accent h-5 rounded-full flex items-center justify-center transition-all duration-500"
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
            {PHASE_ORDER.map(phase => (
              <div key={phase} id={`phase-${phase}`} className="space-y-4 scroll-mt-4">
                <div className={`${getPhaseGradient(phase)} p-3 rounded-lg text-white`}>
                  <h2 className="text-lg font-bold">{phaseNames[phase] || phase}</h2>
                  <p className="text-sm opacity-80">
                    {Object.values(groupedByPhase[phase] || {}).flat().filter(t => t.completed).length} of {Object.values(groupedByPhase[phase] || {}).flat().length} complete
                  </p>
                </div>
                {Object.entries(groupedByPhase[phase] || {}).map(([stageName, stageTasks]) => (
                  <div key={stageName} className={`bg-white rounded-lg shadow-sm overflow-hidden border-l-4 ${getPhaseColor(phase)}`}>
                    <div className="bg-gray-50 p-3 border-b flex justify-between items-center">
                      <div>
                        <h3 className="font-semibold text-gray-700">{stageName}</h3>
                        <p className="text-xs text-gray-500">
                          {stageTasks.filter(t => t.completed).length} of {stageTasks.length} complete
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {viewMode === 'internal' && bulkMode && stageTasks.length > 0 && (
                          <>
                            <button
                              onClick={() => {
                                const stageTaskIds = stageTasks.map(t => t.id);
                                const allSelected = stageTaskIds.every(id => selectedTasks.includes(id));
                                if (allSelected) {
                                  setSelectedTasks(selectedTasks.filter(id => !stageTaskIds.includes(id)));
                                } else {
                                  setSelectedTasks([...new Set([...selectedTasks, ...stageTaskIds])]);
                                }
                              }}
                              className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded hover:bg-blue-200"
                            >
                              {stageTasks.every(t => selectedTasks.includes(t.id)) ? 'Deselect Stage' : 'Select Stage'}
                            </button>
                          </>
                        )}
                        {viewMode === 'internal' && stageName === 'Sprint 3: Soft-Pilot' && (
                          <button
                            onClick={() => setShowSoftPilotChecklist(true)}
                            className="px-3 py-1 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700"
                          >
                            View & Complete Checklist
                          </button>
                        )}
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
                            className="text-primary hover:text-accent text-sm font-medium"
                          >
                            + Add Task
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="divide-y divide-gray-200">
                      {stageTasks.length === 0 ? (
                        <div className="p-4 text-gray-400 text-sm italic">No tasks in this stage</div>
                      ) : stageTasks.map(task => (
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
                                {isAdmin && (
                                  <>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Primary Owner <span className="text-red-500">*</span></label>
                                      <select
                                        value={editingTask.owner || ''}
                                        onChange={(e) =>
                                          setEditingTask({...editingTask, owner: e.target.value})
                                        }
                                        className="w-full px-3 py-2 border rounded-md"
                                      >
                                        <option value="">Select Primary Owner</option>
                                        {allOwners.map(owner => (
                                          <option key={owner.email} value={owner.email}>{owner.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div>
                                      <label className="block text-xs text-gray-500 mb-1">Secondary Owner (optional)</label>
                                      <select
                                        value={editingTask.secondaryOwner || ''}
                                        onChange={(e) =>
                                          setEditingTask({...editingTask, secondaryOwner: e.target.value})
                                        }
                                        className="w-full px-3 py-2 border rounded-md"
                                      >
                                        <option value="">None</option>
                                        {allOwners.filter(o => o.email !== editingTask.owner).map(owner => (
                                          <option key={owner.email} value={owner.email}>{owner.name}</option>
                                        ))}
                                      </select>
                                    </div>
                                  </>
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
                                  <div className="flex gap-2">
                                    <input
                                      type="date"
                                      value={editingTask.dateCompleted}
                                      onChange={(e) =>
                                        setEditingTask({...editingTask, dateCompleted: e.target.value})
                                      }
                                      className="flex-1 px-3 py-2 border rounded-md"
                                    />
                                    {editingTask.dateCompleted && (
                                      <button
                                        type="button"
                                        onClick={() => setEditingTask({...editingTask, dateCompleted: ''})}
                                        className="px-3 py-2 bg-red-100 text-red-600 rounded-md text-sm hover:bg-red-200"
                                        title="Clear date"
                                      >
                                        Clear
                                      </button>
                                    )}
                                  </div>
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
                                      onChange={(e) => {
                                        const checked = e.target.checked;
                                        setEditingTask({
                                          ...editingTask, 
                                          showToClient: checked,
                                          clientName: checked && !editingTask.clientName ? editingTask.taskTitle : editingTask.clientName
                                        });
                                      }}
                                      className="w-4 h-4"
                                    />
                                    Show to Client
                                  </label>
                                  {editingTask.showToClient && (
                                    <input
                                      placeholder="Client-Facing Name (defaults to task name)"
                                      value={editingTask.clientName || editingTask.taskTitle}
                                      onChange={(e) =>
                                        setEditingTask({...editingTask, clientName: e.target.value})
                                      }
                                      className="flex-1 px-3 py-2 border rounded-md text-sm"
                                    />
                                  )}
                                </div>
                              )}
                              <div className="flex gap-2 items-center justify-between">
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
                                {isAdmin && (
                                  <div className="flex gap-1 items-center">
                                    <span className="text-xs text-gray-500 mr-2">Reorder:</span>
                                    <button
                                      onClick={() => { handleReorderTask(editingTask.id, 'up'); setEditingTask(null); }}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                                      title="Move task up within stage"
                                    >
                                      ↑ Up
                                    </button>
                                    <button
                                      onClick={() => { handleReorderTask(editingTask.id, 'down'); setEditingTask(null); }}
                                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 text-sm"
                                      title="Move task down within stage"
                                    >
                                      ↓ Down
                                    </button>
                                  </div>
                                )}
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
                                      className="text-gray-400 hover:text-primary"
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
                                    <span className="font-medium">Primary:</span> {getOwnerName(task.owner)}{task.secondaryOwner && <span className="ml-2"><span className="font-medium">Secondary:</span> {getOwnerName(task.secondaryOwner)}</span>}
                                    {!isAdmin && task.owner && (
                                      <span className="text-xs text-gray-400 ml-2">(Admin only can edit)</span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-4 flex-wrap">
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
                                    {task.completed && task.dateCompleted && (
                                      <span className="text-green-600">
                                        ✓ Completed: {formatDateForDisplay(task.dateCompleted)}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              )}
                              {viewMode === 'client' && task.completed && task.dateCompleted && (
                                <p className="mt-1 text-sm text-green-600">
                                  Completed: {formatDateForDisplay(task.dateCompleted)}
                                </p>
                              )}
                              {viewMode === 'internal' && !task.showToClient && (
                                <span className="inline-flex items-center gap-1 text-xs text-orange-700 bg-orange-50 px-2 py-1 rounded mt-2">
                                  Internal Only
                                </span>
                              )}
                              {viewMode === 'internal' && task.dependencies && task.dependencies.length > 0 && (
                                <div className="mt-2 text-xs text-gray-500">
                                  <span className="font-medium">Dependencies:</span>{' '}
                                  {task.dependencies.map((depId, idx) => {
                                    const depTask = tasks.find(t => t.id === depId || t.id === parseInt(depId));
                                    return (
                                      <span key={depId}>
                                        {depTask ? `"${depTask.taskTitle}"` : `Task ${depId}`}
                                        {idx < task.dependencies.length - 1 ? ', ' : ''}
                                      </span>
                                    );
                                  })}
                                </div>
                              )}
                              {viewMode === 'internal' && (
                                <div className="mt-3 flex flex-wrap gap-4">
                                  <button
                                    onClick={() => setExpandedTaskId(expandedTaskId === task.id ? null : task.id)}
                                    className="text-sm text-primary hover:underline"
                                  >
                                    {expandedTaskId === task.id ? 'Hide Notes' : `Notes (${(task.notes || []).length})`}
                                  </button>
                                  <span className="text-sm text-purple-600">
                                    Subtasks ({(task.subtasks || []).filter(s => s.completed || s.notApplicable || s.status === 'Complete' || s.status === 'N/A').length}/{(task.subtasks || []).length})
                                  </span>
                                  <button
                                    onClick={() => setNewSubtask({ taskId: task.id, title: '', owner: '', dueDate: '' })}
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
                                          {editingNote === note.id ? (
                                            <div className="space-y-2">
                                              <textarea
                                                value={editingNoteContent}
                                                onChange={(e) => setEditingNoteContent(e.target.value)}
                                                className="w-full px-2 py-1 border rounded text-sm"
                                                rows={2}
                                              />
                                              <div className="flex gap-2">
                                                <button
                                                  onClick={() => handleUpdateNote(task.id, note.id)}
                                                  className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                                                >
                                                  Save
                                                </button>
                                                <button
                                                  onClick={() => { setEditingNote(null); setEditingNoteContent(''); }}
                                                  className="px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                                >
                                                  Cancel
                                                </button>
                                              </div>
                                            </div>
                                          ) : (
                                            <>
                                              <p className="text-gray-800">{note.content}</p>
                                              <div className="flex justify-between items-center mt-1">
                                                <p className="text-xs text-gray-400">
                                                  {note.author} - {new Date(note.createdAt).toLocaleString()}
                                                  {note.editedAt && <span className="italic"> (edited)</span>}
                                                </p>
                                                {(note.authorId === user.id || isAdmin) && (
                                                  <div className="flex gap-2">
                                                    <button
                                                      onClick={() => { setEditingNote(note.id); setEditingNoteContent(note.content); }}
                                                      className="text-xs text-primary hover:underline"
                                                    >
                                                      Edit
                                                    </button>
                                                    <button
                                                      onClick={() => handleDeleteNote(task.id, note.id)}
                                                      className="text-xs text-red-600 hover:underline"
                                                    >
                                                      Delete
                                                    </button>
                                                  </div>
                                                )}
                                              </div>
                                            </>
                                          )}
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
                                      className="px-3 py-2 bg-primary text-white rounded-md text-sm hover:bg-accent"
                                    >
                                      Add
                                    </button>
                                  </div>
                                </div>
                              )}
                              {viewMode === 'internal' && (task.subtasks || []).length > 0 && (
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
                                          <input
                                            type="date"
                                            value={subtask.dueDate || ''}
                                            onChange={(e) => handleSubtaskDueDateChange(task.id, subtask.id, e.target.value)}
                                            className={`text-xs px-2 py-1 border rounded ${
                                              subtask.dueDate && new Date(subtask.dueDate) < new Date() && getSubtaskStatus(subtask) === 'pending'
                                                ? 'border-red-300 bg-red-50 text-red-700'
                                                : 'border-gray-200'
                                            }`}
                                            title="Due Date"
                                          />
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
                                  <div className="flex gap-2 flex-wrap items-center">
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
                                      {allOwners.map(owner => (
                                        <option key={owner.email} value={owner.email}>{owner.name}</option>
                                      ))}
                                    </select>
                                    <input
                                      type="date"
                                      value={newSubtask.dueDate}
                                      onChange={(e) => setNewSubtask({...newSubtask, dueDate: e.target.value})}
                                      className="px-2 py-2 border rounded-md text-sm"
                                      title="Due Date"
                                    />
                                    <button
                                      onClick={() => handleAddSubtask(task.id)}
                                      className="px-3 py-2 bg-green-600 text-white rounded-md text-sm hover:bg-green-700"
                                    >
                                      Add
                                    </button>
                                    <button
                                      onClick={() => setNewSubtask({ taskId: null, title: '', owner: '', dueDate: '', showToClient: true })}
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
                    <label className="block text-sm font-medium mb-1">Primary Owner <span className="text-red-500">*</span></label>
                    <select
                      value={newTask.owner}
                      onChange={(e) => setNewTask({...newTask, owner: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">Select Primary Owner</option>
                      {allOwners.map(owner => (
                        <option key={owner.email} value={owner.email}>{owner.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Secondary Owner (optional)</label>
                    <select
                      value={newTask.secondaryOwner || ''}
                      onChange={(e) => setNewTask({...newTask, secondaryOwner: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                    >
                      <option value="">None</option>
                      {allOwners.filter(o => o.email !== newTask.owner).map(owner => (
                        <option key={owner.email} value={owner.email}>{owner.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                    className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent"
                  >
                    Create Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showSoftPilotChecklist && (
          <SoftPilotChecklist
            token={token}
            project={project}
            tasks={tasks}
            teamMembers={teamMembers}
            onClose={() => setShowSoftPilotChecklist(false)}
            onSubmitSuccess={() => {
              loadTasks();
              alert(project.softPilotChecklistSubmitted 
                ? 'Soft-Pilot Checklist updated and saved to Google Drive!' 
                : 'Soft-Pilot Checklist submitted and saved to Google Drive!');
            }}
            onTaskUpdate={async (taskId, updates) => {
              try {
                await api.updateTask(token, project.id, taskId, updates);
                setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updates } : t));
              } catch (err) {
                console.error('Failed to update task:', err);
              }
            }}
          />
        )}
      </div>
      </div>
    </div>
  );
};

// ============== USER MANAGEMENT COMPONENT (Admin Only) ==============
const UserManagement = ({ token, user, onBack, onLogout }) => {
  const [users, setUsers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'user', practiceName: '', isNewClient: false, assignedProjects: [], logo: '', hubspotCompanyId: '', hubspotDealId: '', hubspotContactId: '' });
  const [addError, setAddError] = useState('');
  const [passwordResetRequests, setPasswordResetRequests] = useState([]);

  useEffect(() => {
    loadUsers();
    loadProjects();
    loadPasswordResetRequests();
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

  const loadProjects = async () => {
    try {
      const data = await api.getProjects(token);
      setProjects(data);
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  };

  const loadPasswordResetRequests = async () => {
    try {
      const data = await api.getPasswordResetRequests(token);
      setPasswordResetRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load password reset requests:', err);
    }
  };

  const handleResetRequest = async (requestId, userToReset) => {
    // Open edit modal for this user so admin can reset their password
    const userRecord = users.find(u => u.id === userToReset.userId);
    if (userRecord) {
      // Store the pending request ID to mark as completed when password is actually saved
      setEditingUser({ ...userRecord, newPassword: '', assignedProjects: userRecord.assignedProjects || [], pendingResetRequestId: requestId });
      setShowEditModal(true);
    }
  };

  const dismissResetRequest = async (requestId) => {
    try {
      await api.handlePasswordResetRequest(token, requestId, 'dismissed');
      await loadPasswordResetRequests();
    } catch (err) {
      console.error('Failed to dismiss request:', err);
    }
  };

  const toggleProjectAssignment = (projectId) => {
    if (!editingUser) return;
    const current = editingUser.assignedProjects || [];
    const updated = current.includes(projectId)
      ? current.filter(id => id !== projectId)
      : [...current, projectId];
    setEditingUser({ ...editingUser, assignedProjects: updated });
  };

  const openEditModal = (u) => {
    setEditingUser({ ...u, newPassword: '', assignedProjects: u.assignedProjects || [] });
    setShowEditModal(true);
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
    if (newUser.role === 'client' && !newUser.practiceName.trim()) {
      setAddError('Practice name is required for client accounts');
      return;
    }
    try {
      const result = await api.createUser(token, newUser);
      if (result.error) {
        setAddError(result.error);
        return;
      }
      await loadUsers();
      setNewUser({ name: '', email: '', password: '', role: 'user', practiceName: '', isNewClient: false, assignedProjects: [], logo: '', hubspotCompanyId: '', hubspotDealId: '', hubspotContactId: '' });
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
        role: editingUser.role,
        assignedProjects: editingUser.assignedProjects || [],
        practiceName: editingUser.practiceName || '',
        isNewClient: editingUser.isNewClient || false,
        logo: editingUser.logo || '',
        hubspotCompanyId: editingUser.hubspotCompanyId || '',
        hubspotDealId: editingUser.hubspotDealId || '',
        hubspotContactId: editingUser.hubspotContactId || ''
      };
      if (editingUser.newPassword) {
        updates.password = editingUser.newPassword;
      }
      await api.updateUser(token, editingUser.id, updates);
      
      // If this was a password reset request and password was updated, mark request as completed
      if (editingUser.pendingResetRequestId && editingUser.newPassword) {
        try {
          await api.handlePasswordResetRequest(token, editingUser.pendingResetRequestId, 'completed');
          await loadPasswordResetRequests();
        } catch (err) {
          console.error('Failed to mark reset request as completed:', err);
        }
      }
      
      await loadUsers();
      setEditingUser(null);
      setShowEditModal(false);
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
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} onLogout={onLogout}>
        <button onClick={onBack} className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide">
          ← Back
        </button>
        <button
          onClick={() => setShowAddUser(true)}
          className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide"
        >
          + Add User
        </button>
      </AppHeader>

      <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage team member accounts</p>
        </div>

        {passwordResetRequests.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold text-amber-800 mb-3 flex items-center gap-2">
              <span className="w-3 h-3 bg-amber-500 rounded-full animate-pulse"></span>
              Password Reset Requests ({passwordResetRequests.length})
            </h2>
            <p className="text-amber-700 text-sm mb-4">
              The following users have requested password resets. Click "Reset Password" to set a new password for them, then contact them with the new password.
            </p>
            <div className="space-y-3">
              {passwordResetRequests.map(req => (
                <div key={req.id} className="bg-white border border-amber-200 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{req.name}</p>
                    <p className="text-sm text-gray-600">{req.email}</p>
                    <p className="text-xs text-gray-400">Requested: {new Date(req.requestedAt).toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResetRequest(req.id, req)}
                      className="px-3 py-1.5 bg-primary text-white text-sm rounded hover:bg-accent"
                    >
                      Reset Password
                    </button>
                    <button
                      onClick={() => dismissResetRequest(req.id)}
                      className="px-3 py-1.5 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  <option value="user">Team Member</option>
                  <option value="admin">Admin</option>
                  <option value="client">Client</option>
                </select>
              </div>
              {newUser.role === 'client' && (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">Practice Name *</label>
                    <input
                      value={newUser.practiceName}
                      onChange={(e) => setNewUser({...newUser, practiceName: e.target.value})}
                      className="w-full px-3 py-2 border rounded-md"
                      placeholder="e.g., Dallas Medical Center"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Practice Logo</label>
                    <div className="space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            if (file.size > 2 * 1024 * 1024) {
                              setAddError('Logo must be under 2MB');
                              return;
                            }
                            const reader = new FileReader();
                            reader.onload = (ev) => setNewUser({...newUser, logo: ev.target.result});
                            reader.readAsDataURL(file);
                          }
                        }}
                        className="w-full text-sm"
                      />
                      {newUser.logo && (
                        <div className="flex items-center gap-2">
                          <img src={newUser.logo} alt="Preview" className="h-10 object-contain border rounded" />
                          <button type="button" onClick={() => setNewUser({...newUser, logo: ''})} className="text-red-600 text-xs hover:underline">Remove</button>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">Max 2MB. PNG or JPG recommended. Shows in client portal header.</p>
                    </div>
                  </div>
                  <div className="md:col-span-2 border-t pt-4 mt-2">
                    <h4 className="text-sm font-semibold text-gray-700 mb-3">HubSpot Record IDs (for file uploads)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Company ID</label>
                        <input
                          value={newUser.hubspotCompanyId || ''}
                          onChange={(e) => setNewUser({...newUser, hubspotCompanyId: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="e.g., 12345678"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Deal ID</label>
                        <input
                          value={newUser.hubspotDealId || ''}
                          onChange={(e) => setNewUser({...newUser, hubspotDealId: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="e.g., 87654321"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Contact ID</label>
                        <input
                          value={newUser.hubspotContactId || ''}
                          onChange={(e) => setNewUser({...newUser, hubspotContactId: e.target.value})}
                          className="w-full px-3 py-2 border rounded-md text-sm"
                          placeholder="e.g., 11223344"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Files uploaded by this client will be attached to these HubSpot records.</p>
                  </div>
                </>
              )}
            </div>
            {newUser.role === 'client' && (
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Assign to Project</label>
                <div className="max-h-40 overflow-y-auto border rounded-md p-2 space-y-1">
                  {projects.map(p => (
                    <label key={p.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={(newUser.assignedProjects || []).includes(p.id)}
                        onChange={(e) => {
                          const current = newUser.assignedProjects || [];
                          const updated = e.target.checked
                            ? [...current, p.id]
                            : current.filter(id => id !== p.id);
                          setNewUser({...newUser, assignedProjects: updated});
                        }}
                      />
                      {p.name} ({p.clientName})
                    </label>
                  ))}
                </div>
              </div>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleCreateUser}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
              >
                Create User
              </button>
              <button
                onClick={() => { setShowAddUser(false); setAddError(''); setNewUser({ name: '', email: '', password: '', role: 'user', practiceName: '', isNewClient: false, assignedProjects: [], logo: '', hubspotCompanyId: '', hubspotDealId: '', hubspotContactId: '' }); }}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Projects</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Created</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{u.name}</td>
                  <td className="px-6 py-4 text-gray-600">{u.email}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      u.role === 'admin' ? 'bg-purple-100 text-purple-800' : 
                      u.role === 'client' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {u.role === 'client' ? 'Client' : u.role === 'admin' ? 'Admin' : 'Team'}
                    </span>
                    {u.role === 'client' && u.practiceName && (
                      <div className="text-xs text-gray-500 mt-1">{u.practiceName}</div>
                    )}
                    {u.role === 'client' && u.assignedProjects?.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-blue-100 text-blue-700 text-xs rounded">{u.assignedProjects.length} project{u.assignedProjects.length > 1 ? 's' : ''}</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">
                    {u.role === 'admin' ? (
                      <span className="text-green-600 font-medium">All Projects</span>
                    ) : (
                      <span>{(u.assignedProjects || []).length} assigned</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-gray-500 text-sm">
                    {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="px-6 py-4 text-right space-x-2">
                    <button
                      onClick={() => openEditModal(u)}
                      className="text-primary hover:underline text-sm"
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
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Edit User: {editingUser.name}</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({...editingUser, name: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({...editingUser, email: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                  >
                    <option value="user">Team Member</option>
                    <option value="admin">Admin</option>
                    <option value="client">Client</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">New Password (optional)</label>
                  <input
                    type="password"
                    value={editingUser.newPassword || ''}
                    onChange={(e) => setEditingUser({...editingUser, newPassword: e.target.value})}
                    className="w-full px-3 py-2 border rounded-md"
                    placeholder="Leave blank to keep current"
                  />
                </div>
                {editingUser.role === 'client' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Practice Name</label>
                      <input
                        value={editingUser.practiceName || ''}
                        onChange={(e) => setEditingUser({...editingUser, practiceName: e.target.value})}
                        className="w-full px-3 py-2 border rounded-md"
                        placeholder="e.g., Dallas Medical Center"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Practice Logo</label>
                      <div className="space-y-2">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (file) {
                              if (file.size > 2 * 1024 * 1024) {
                                alert('Logo must be under 2MB');
                                return;
                              }
                              const reader = new FileReader();
                              reader.onload = (ev) => setEditingUser({...editingUser, logo: ev.target.result});
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-sm"
                        />
                        {editingUser.logo && (
                          <div className="flex items-center gap-2">
                            <img src={editingUser.logo} alt="Preview" className="h-10 object-contain border rounded" />
                            <button type="button" onClick={() => setEditingUser({...editingUser, logo: ''})} className="text-red-600 text-xs hover:underline">Remove</button>
                          </div>
                        )}
                        <p className="text-xs text-gray-500">Max 2MB. PNG or JPG recommended. Shows in client portal header.</p>
                      </div>
                    </div>
                    <div className="md:col-span-2 border-t pt-4 mt-2">
                      <h4 className="text-sm font-semibold text-gray-700 mb-3">HubSpot Record IDs (for file uploads)</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium mb-1">Company ID</label>
                          <input
                            value={editingUser.hubspotCompanyId || ''}
                            onChange={(e) => setEditingUser({...editingUser, hubspotCompanyId: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="e.g., 12345678"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Deal ID</label>
                          <input
                            value={editingUser.hubspotDealId || ''}
                            onChange={(e) => setEditingUser({...editingUser, hubspotDealId: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="e.g., 87654321"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-1">Contact ID</label>
                          <input
                            value={editingUser.hubspotContactId || ''}
                            onChange={(e) => setEditingUser({...editingUser, hubspotContactId: e.target.value})}
                            className="w-full px-3 py-2 border rounded-md text-sm"
                            placeholder="e.g., 11223344"
                          />
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Files uploaded by this client will be attached to these HubSpot records.</p>
                    </div>
                  </>
                )}
              </div>
              
              {editingUser.role === 'client' && editingUser.slug && (
                <div className="mb-4 p-4 bg-blue-50 rounded-md">
                  <p className="text-sm font-medium text-blue-800">Client Portal URL:</p>
                  <p className="text-blue-600 font-mono text-sm break-all mt-1">
                    {window.location.origin}/portal/{editingUser.slug}
                  </p>
                </div>
              )}

              {editingUser.role !== 'admin' && (
                <div className="mb-6">
                  <label className="block text-sm font-medium mb-2">Assigned Projects</label>
                  <p className="text-xs text-gray-500 mb-3">Select which projects this user can access. Admins can access all projects automatically.</p>
                  <div className="border rounded-md max-h-60 overflow-y-auto">
                    {projects.length === 0 ? (
                      <div className="p-4 text-gray-500 text-center">No projects available</div>
                    ) : (
                      projects.map(p => (
                        <label key={p.id} className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(editingUser.assignedProjects || []).includes(p.id)}
                            onChange={() => toggleProjectAssignment(p.id)}
                            className="w-4 h-4 text-primary rounded"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{p.name}</div>
                            <div className="text-sm text-gray-500">{p.clientName}</div>
                          </div>
                        </label>
                      ))
                    )}
                  </div>
                </div>
              )}

              {editingUser.role === 'admin' && (
                <div className="mb-6 p-4 bg-purple-50 rounded-md">
                  <p className="text-purple-800 font-medium">Admins have access to all projects</p>
                  <p className="text-purple-600 text-sm">This user can view and manage all projects in the system.</p>
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowEditModal(false); setEditingUser(null); }}
                  className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveUser}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

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

  const handleBackToTemplates = () => {
    setSelectedTemplate(null);
    loadTemplates();
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

  const handleCloneTemplate = async (template) => {
    const newName = prompt(`Enter name for the cloned template:`, `${template.name} (Copy)`);
    if (!newName) return;
    try {
      const cloned = await api.cloneTemplate(token, template.id, newName);
      setTemplates([...templates, { ...cloned, taskCount: template.taskCount }]);
      alert('Template cloned successfully!');
    } catch (err) {
      console.error('Failed to clone template:', err);
      alert('Failed to clone template');
    }
  };

  const handleSetDefaultTemplate = async (templateId) => {
    try {
      const result = await api.setDefaultTemplate(token, templateId);
      if (result.error) {
        alert(result.error);
        return;
      }
      // Update local state to reflect new default
      setTemplates(templates.map(t => ({
        ...t,
        isDefault: t.id === templateId
      })));
      alert(result.message);
    } catch (err) {
      console.error('Failed to set default template:', err);
      alert('Failed to set default template');
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

  const handleImportCSV = async (e) => {
    const file = e.target.files[0];
    if (!file || !selectedTemplate) return;
    
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const csvData = parseCSV(event.target.result);
        if (csvData.length === 0) {
          alert('No valid tasks found in CSV');
          return;
        }
        setSaving(true);
        const result = await api.importCsvToTemplate(token, selectedTemplate.id, csvData);
        if (result.error) {
          alert(result.error);
        } else {
          alert(result.message);
          loadTemplateDetails(selectedTemplate.id);
          loadTemplates();
        }
      } catch (err) {
        console.error('CSV import error:', err);
        alert('Failed to import CSV');
      } finally {
        setSaving(false);
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-xl">Loading templates...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} onLogout={onLogout}>
        <button 
          onClick={selectedTemplate ? handleBackToTemplates : onBack} 
          className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide"
        >
          ← {selectedTemplate ? 'Back to Templates' : 'Back'}
        </button>
        {!selectedTemplate && (
          <button
            onClick={() => setShowCreateTemplate(true)}
            className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide"
          >
            + Create Template
          </button>
        )}
      </AppHeader>

      <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
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
                    className="ml-2 text-sm text-primary hover:underline"
                  >
                    (rename)
                  </button>
                </span>
              )
            ) : 'Template Management'}
          </h1>
          <p className="text-gray-600">
            {selectedTemplate ? `${selectedTemplate.tasks.length} tasks, ${selectedTemplate.tasks.reduce((sum, t) => sum + (t.subtasks?.length || 0), 0)} subtasks` : 'Manage project templates'}
          </p>
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
                          className="text-primary hover:underline"
                        >
                          Edit Tasks
                        </button>
                        <button
                          onClick={() => handleCloneTemplate(template)}
                          className="text-purple-600 hover:underline"
                        >
                          Clone
                        </button>
                        {!template.isDefault && (
                          <button
                            onClick={() => handleSetDefaultTemplate(template.id)}
                            className="text-blue-600 hover:underline"
                          >
                            Set Default
                          </button>
                        )}
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
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <label className="cursor-pointer px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700">
                  Import CSV
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleImportCSV}
                    className="hidden"
                    disabled={saving}
                  />
                </label>
                <button
                  onClick={downloadSampleCSV}
                  className="text-purple-600 hover:text-purple-800 text-sm underline"
                >
                  Download Template
                </button>
              </div>
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
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subtasks</th>
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
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {(editingTask.subtasks || []).length} subtasks
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
                          <td className="px-4 py-2 text-sm text-purple-600">
                            {(task.subtasks || []).length > 0 ? (
                              <span title={(task.subtasks || []).map(st => st.title).join(', ')}>
                                {(task.subtasks || []).length} subtask{(task.subtasks || []).length > 1 ? 's' : ''}
                              </span>
                            ) : '-'}
                          </td>
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
                              className="text-primary hover:underline"
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
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} onLogout={onLogout}>
        <button onClick={onBack} className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide">
          ← Back
        </button>
      </AppHeader>

      <div className="p-6">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm mb-6 p-6">
          <h1 className="text-2xl font-bold text-gray-900">HubSpot Integration Settings</h1>
          <p className="text-gray-600 mb-4">Configure how project phases sync with HubSpot deal stages</p>

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
                          className="bg-primary text-white px-6 py-2 rounded-lg hover:bg-accent disabled:opacity-50"
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
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} onLogout={onLogout}>
        <button onClick={onBack} className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide">
          ← Back
        </button>
      </AppHeader>

      <div className="p-6">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Launch Reports</h1>
          <p className="text-gray-600 mb-4">Portal - Thrive 365 Labs</p>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-blue-50 p-4 rounded-lg text-center">
              <div className="text-3xl font-bold text-primary">{reportData.length}</div>
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
                              className="bg-primary h-2 rounded-full"
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
    </div>
  );
};

// ============== PORTAL SETTINGS COMPONENT ==============
const PortalSettings = ({ token, user, onBack, onLogout }) => {
  const [settings, setSettings] = useState({
    inventoryFormEmbed: '',
    filesFormEmbed: '',
    supportUrl: 'https://thrive365labs-49020024.hs-sites.com/support'
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await api.getPortalSettings();
      setSettings(data);
    } catch (err) {
      console.error('Failed to load portal settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setMessage('');
    try {
      await api.updatePortalSettings(token, settings);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err) {
      setMessage('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} onLogout={onLogout}>
        <button onClick={onBack} className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide">
          ← Back
        </button>
      </AppHeader>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Portal Settings</h1>
          <p className="text-gray-600">Configure HubSpot embeds and settings for the client portal</p>
        </div>

        {loading ? (
          <div className="text-center py-12">Loading settings...</div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            {message && (
              <div className={`p-3 rounded ${message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Inventory Form Embed Code
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Paste the HubSpot form embed script for inventory management. Get this from HubSpot {'>'} Marketing {'>'} Forms {'>'} Embed.
              </p>
              <textarea
                value={settings.inventoryFormEmbed}
                onChange={(e) => setSettings({...settings, inventoryFormEmbed: e.target.value})}
                className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                rows={6}
                placeholder='<script charset="utf-8" type="text/javascript" src="//js.hsforms.net/forms/embed/v2.js"></script>...'
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Files Upload Form Embed Code
              </label>
              <p className="text-xs text-gray-500 mb-2">
                Paste the HubSpot form embed script for file uploads. Create a form with file upload fields in HubSpot.
              </p>
              <textarea
                value={settings.filesFormEmbed}
                onChange={(e) => setSettings({...settings, filesFormEmbed: e.target.value})}
                className="w-full px-3 py-2 border rounded-md font-mono text-sm"
                rows={6}
                placeholder='<script charset="utf-8" type="text/javascript" src="//js.hsforms.net/forms/embed/v2.js"></script>...'
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Customer Support URL
              </label>
              <input
                type="url"
                value={settings.supportUrl}
                onChange={(e) => setSettings({...settings, supportUrl: e.target.value})}
                className="w-full px-3 py-2 border rounded-md"
                placeholder="https://thrive365labs-49020024.hs-sites.com/support"
              />
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-6 py-2 bg-primary text-white rounded-md hover:bg-accent disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// ============== ANNOUNCEMENTS MANAGER COMPONENT ==============
const AnnouncementsManager = ({ token, user, onBack, onLogout }) => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ title: '', content: '', type: 'info' });

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await api.getAnnouncements();
      setAnnouncements(data);
    } catch (err) {
      console.error('Failed to load announcements:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      await api.createAnnouncement(token, form);
      setForm({ title: '', content: '', type: 'info' });
      setShowAdd(false);
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to create announcement:', err);
    }
  };

  const handleUpdate = async () => {
    if (!form.title.trim() || !form.content.trim()) return;
    try {
      await api.updateAnnouncement(token, editing.id, form);
      setForm({ title: '', content: '', type: 'info' });
      setEditing(null);
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to update announcement:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try {
      await api.deleteAnnouncement(token, id);
      loadAnnouncements();
    } catch (err) {
      console.error('Failed to delete announcement:', err);
    }
  };

  const startEdit = (ann) => {
    setEditing(ann);
    setForm({ title: ann.title, content: ann.content, type: ann.type || 'info' });
    setShowAdd(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} onLogout={onLogout}>
        <button onClick={onBack} className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide">
          ← Back
        </button>
      </AppHeader>

      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
            <p className="text-gray-600">Create announcements visible to clients in their portal</p>
          </div>
          <button
            onClick={() => { setShowAdd(true); setEditing(null); setForm({ title: '', content: '', type: 'info' }); }}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent"
          >
            + New Announcement
          </button>
        </div>

        {(showAdd || editing) && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">{editing ? 'Edit Announcement' : 'New Announcement'}</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Announcement title"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Content</label>
                <textarea
                  value={form.content}
                  onChange={(e) => setForm({...form, content: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  rows={4}
                  placeholder="Announcement message..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({...form, type: e.target.value})}
                  className="px-3 py-2 border rounded-md"
                >
                  <option value="info">Info (Blue)</option>
                  <option value="success">Success (Green)</option>
                  <option value="warning">Warning (Yellow)</option>
                </select>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={editing ? handleUpdate : handleCreate}
                  className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent"
                >
                  {editing ? 'Save Changes' : 'Create'}
                </button>
                <button
                  onClick={() => { setShowAdd(false); setEditing(null); }}
                  className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Loading announcements...</div>
        ) : announcements.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
            No announcements yet. Create one to share news with your clients.
          </div>
        ) : (
          <div className="space-y-4">
            {announcements.map(ann => (
              <div key={ann.id} className={`bg-white rounded-lg shadow-sm p-6 border-l-4 ${
                ann.type === 'warning' ? 'border-yellow-500' :
                ann.type === 'success' ? 'border-green-500' : 'border-blue-500'
              }`}>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-lg text-gray-900">{ann.title}</h3>
                    <p className="text-gray-600 mt-2">{ann.content}</p>
                    <p className="text-xs text-gray-400 mt-3">
                      By {ann.createdBy} on {new Date(ann.createdAt).toLocaleString()}
                      {ann.updatedAt && <span> (edited)</span>}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => startEdit(ann)}
                      className="text-primary hover:underline text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(ann.id)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ============== CLIENT DOCUMENTS MANAGER COMPONENT ==============
const ClientDocumentsManager = ({ token, user, onBack, onLogout }) => {
  const [documents, setDocuments] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ slug: '', title: '', description: '', url: '', category: 'General' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [docs, clientUsers] = await Promise.all([
        api.getClientDocuments(token),
        api.getClientUsers(token)
      ]);
      setDocuments(docs);
      setClients(clientUsers);
    } catch (err) {
      console.error('Failed to load documents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async () => {
    if (!form.slug || !form.title || !form.url) return;
    try {
      await api.createClientDocument(token, form);
      setForm({ slug: '', title: '', description: '', url: '', category: 'General' });
      setShowAdd(false);
      loadData();
    } catch (err) {
      console.error('Failed to create document:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this document?')) return;
    try {
      await api.deleteClientDocument(token, id);
      loadData();
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const categories = ['General', 'Training', 'Contracts', 'Manuals', 'Compliance', 'Other'];

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader user={user} onLogout={onLogout}>
        <button onClick={onBack} className="text-gray-700 hover:text-primary font-medium text-sm uppercase tracking-wide">
          ← Back
        </button>
      </AppHeader>

      <div className="p-6 max-w-5xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Client Documents</h1>
            <p className="text-gray-600">Upload documents for clients to download in their portal</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent"
          >
            + Add Document
          </button>
        </div>

        {showAdd && (
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <h2 className="text-lg font-bold mb-4">Add Document</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client Portal</label>
                <select
                  value={form.slug}
                  onChange={(e) => setForm({...form, slug: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  <option value="">Select client...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.slug}>{c.practiceName} ({c.slug})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Category</label>
                <select
                  value={form.category}
                  onChange={(e) => setForm({...form, category: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Document Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm({...form, title: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="e.g., Equipment Manual"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Document URL</label>
                <input
                  value={form.url}
                  onChange={(e) => setForm({...form, url: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="https://drive.google.com/..."
                />
                <p className="text-xs text-gray-500 mt-1">Enter a direct link to the document (Google Drive, Dropbox, etc.)</p>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium mb-1">Description (optional)</label>
                <input
                  value={form.description}
                  onChange={(e) => setForm({...form, description: e.target.value})}
                  className="w-full px-3 py-2 border rounded-md"
                  placeholder="Brief description of the document"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleCreate} className="px-4 py-2 bg-primary text-white rounded-md hover:bg-accent">
                Add Document
              </button>
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-300 rounded-md hover:bg-gray-400">
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="text-center py-12">Loading documents...</div>
        ) : documents.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center text-gray-500">
            No documents yet. Add documents for clients to download.
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Client</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Document</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Added</th>
                  <th className="px-4 py-3 text-right text-sm font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {documents.map(doc => (
                  <tr key={doc.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <span className="font-medium">{doc.slug}</span>
                    </td>
                    <td className="px-4 py-3">
                      <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                        {doc.title}
                      </a>
                      {doc.description && <p className="text-xs text-gray-500">{doc.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{doc.category}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleDelete(doc.id)} className="text-red-600 hover:underline text-sm">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const App = () => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [selectedProject, setSelectedProject] = useState(null);
  const [scrollToTaskId, setScrollToTaskId] = useState(null);
  const [view, setView] = useState('list');
  const [pendingInternalSlug, setPendingInternalSlug] = useState(null);

  useEffect(() => {
    const path = window.location.pathname;
    const match = path.match(/\/thrive365labslaunch\/(.+)-internal$/i);
    if (match) {
      setPendingInternalSlug(match[1]);
    }
  }, []);

  useEffect(() => {
    if (token && pendingInternalSlug) {
      api.getProjects(token).then(projects => {
        const project = projects.find(p => 
          p.clientLinkSlug === pendingInternalSlug || p.clientLinkId === pendingInternalSlug
        );
        if (project) {
          setSelectedProject(project);
          setView('tracker');
        }
        setPendingInternalSlug(null);
      }).catch(() => setPendingInternalSlug(null));
    }
  }, [token, pendingInternalSlug]);

  const handleLogin = (newToken, newUser) => {
    // Redirect client users to their portal
    if (newUser.role === 'client' && newUser.slug) {
      // Set portal tokens so they're logged in when redirected
      localStorage.setItem('portal_token', newToken);
      localStorage.setItem('portal_user', JSON.stringify(newUser));
      window.location.href = `/portal/${newUser.slug}`;
      return;
    }
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
    window.history.pushState({}, '', '/thrive365labslaunch/login');
  };

  const handleSelectProject = (project, taskId = null) => {
    setSelectedProject(project);
    setScrollToTaskId(taskId);
    setView('tracker');
    const slug = project.clientLinkSlug || project.clientLinkId;
    window.history.pushState({}, '', `/thrive365labslaunch/${slug}-internal`);
  };

  const handleBackToList = () => {
    setSelectedProject(null);
    setView('list');
    window.history.pushState({}, '', '/thrive365labslaunch/home');
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
        scrollToTaskId={scrollToTaskId}
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
