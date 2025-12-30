const { useState, useEffect, useMemo } = React;

const api = (path, { method = "GET", token, body } = {}) => {
  const opts = { method, headers: { "Content-Type": "application/json" } };
  if (token) opts.headers["Authorization"] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  return fetch(path, opts).then(async (r) => {
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error || `HTTP ${r.status}`);
    return data;
  });
};

const formatDateISO = (d) => {
  const pad = (n) => `${n}`.padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const Badge = ({ children, tone = "gray" }) => {
  const map = {
    gray: "bg-gray-100 text-gray-800",
    blue: "bg-blue-100 text-blue-800",
    green: "bg-green-100 text-green-800",
    red: "bg-red-100 text-red-800",
    amber: "bg-amber-100 text-amber-800",
  };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[tone] || map.gray}`}>
      {children}
    </span>
  );
};

const Modal = ({ title, open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-2xl rounded-xl shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b flex items-center justify-between">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-900">✕</button>
          </div>
          <div className="p-6">{children}</div>
        </div>
      </div>
    </div>
  );
};

const Input = ({ label, value, onChange, placeholder, type = "text" }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
    />
  </label>
);

const Select = ({ label, value, onChange, options }) => (
  <label className="block">
    <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-300 px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  </label>
);

const Checkbox = ({ checked, onChange, label }) => (
  <label className="inline-flex items-center gap-2 cursor-pointer">
    <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span className="text-sm text-gray-700">{label}</span>
  </label>
);

const Button = ({ children, onClick, tone = "blue", disabled = false, type="button" }) => {
  const map = {
    blue: "bg-blue-600 hover:bg-blue-700 text-white",
    gray: "bg-gray-200 hover:bg-gray-300 text-gray-900",
    red: "bg-red-600 hover:bg-red-700 text-white",
    green: "bg-green-600 hover:bg-green-700 text-white",
    white: "bg-white hover:bg-gray-50 text-gray-900 border border-gray-300",
  };
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-medium transition ${map[tone] || map.blue} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      {children}
    </button>
  );
};

const Auth = ({ onAuthed }) => {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    setErr("");
    try {
      if (mode === "signup") {
        await api("/api/auth/signup", { method: "POST", body: { email, password, name } });
        setMode("login");
        setPassword("");
      } else {
        const res = await api("/api/auth/login", { method: "POST", body: { email, password } });
        onAuthed(res);
      }
    } catch (ex) {
      setErr(ex.message || "Error");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-2xl font-bold text-gray-900">Project Tracker</h1>
        <p className="text-gray-600 mt-1">Thrive 365 Labs</p>

        <div className="mt-6 flex gap-2">
          <Button tone={mode === "login" ? "blue" : "white"} onClick={() => setMode("login")}>Login</Button>
          <Button tone={mode === "signup" ? "blue" : "white"} onClick={() => setMode("signup")}>Sign Up</Button>
        </div>

        {err && <div className="mt-4 text-sm text-red-600">{err}</div>}

        <form onSubmit={submit} className="mt-4 space-y-4">
          {mode === "signup" && (
            <Input label="Name" value={name} onChange={setName} placeholder="Full name" />
          )}
          <Input label="Email" value={email} onChange={setEmail} placeholder="name@company.com" type="email" />
          <Input label="Password" value={password} onChange={setPassword} placeholder="••••••••" type="password" />

          <Button type="submit" tone="blue" disabled={!email || !password || (mode === "signup" && !name)}>
            {mode === "login" ? "Login" : "Create Account"}
          </Button>

          <div className="text-xs text-gray-500 leading-5">
            Admin default: <span className="font-mono">bianca@thrive365labs.com</span> / <span className="font-mono">Thrive2025!</span>
          </div>
        </form>
      </div>
    </div>
  );
};

const ProjectList = ({ token, user, onOpenProject }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const refresh = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api("/api/projects", { token });
      setProjects(res);
    } catch (ex) {
      setErr(ex.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Projects</h2>
          <p className="text-sm text-gray-600 mt-1">View active launches and open a project to manage tasks.</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge tone={user.role === "admin" ? "blue" : "gray"}>{user.role}</Badge>
          <Button tone="gray" onClick={refresh}>Refresh</Button>
        </div>
      </div>

      {err && <div className="mt-4 text-sm text-red-600">{err}</div>}
      {loading ? (
        <div className="mt-6 text-gray-600">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="mt-6 text-gray-600">No projects yet.</div>
      ) : (
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.slice().sort((a,b)=> (b.createdAt||"").localeCompare(a.createdAt||"")).map((p) => (
            <button
              key={p.id}
              onClick={() => onOpenProject(p)}
              className="text-left border border-gray-200 hover:border-blue-300 hover:bg-blue-50/40 rounded-xl p-4 transition"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-lg font-semibold text-gray-900">{p.name}</div>
                  <div className="text-sm text-gray-600">{p.clientName}</div>
                </div>
                <Badge tone={p.status === "active" ? "green" : "gray"}>{p.status}</Badge>
              </div>
              <div className="mt-3 text-xs text-gray-500">
                PM: {p.projectManager || "—"} • HubSpot Deal: {p.hubspotDealId || "—"}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

const CreateProject = ({ token, open, onClose, onCreated }) => {
  const [name, setName] = useState("");
  const [clientName, setClientName] = useState("");
  const [projectManager, setProjectManager] = useState("");
  const [hubspotDealId, setHubspotDealId] = useState("");
  const [hubspotDealStage, setHubspotDealStage] = useState("");
  const [template, setTemplate] = useState("biolis-au480-clia");
  const [err, setErr] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setErr("");
      setSaving(false);
    }
  }, [open]);

  const submit = async () => {
    setErr("");
    setSaving(true);
    try {
      const res = await api("/api/projects", {
        token,
        method: "POST",
        body: { name, clientName, projectManager, hubspotDealId, hubspotDealStage, template }
      });
      setName(""); setClientName(""); setProjectManager(""); setHubspotDealId(""); setHubspotDealStage("");
      onCreated(res);
      onClose();
    } catch (ex) {
      setErr(ex.message || "Failed to create project");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="Create Project" open={open} onClose={onClose}>
      <div className="space-y-4">
        {err && <div className="text-sm text-red-600">{err}</div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input label="Project Name" value={name} onChange={setName} placeholder="e.g., Macon Medical Group - AU480 Launch" />
          <Input label="Client Name" value={clientName} onChange={setClientName} placeholder="e.g., Macon Medical Group" />
          <Input label="Project Manager" value={projectManager} onChange={setProjectManager} placeholder="Internal owner" />
          <Input label="HubSpot Deal ID" value={hubspotDealId} onChange={setHubspotDealId} placeholder="Optional" />
          <Input label="HubSpot Deal Stage" value={hubspotDealStage} onChange={setHubspotDealStage} placeholder="Optional" />
          <Select
            label="Template"
            value={template}
            onChange={setTemplate}
            options={[
              { value: "biolis-au480-clia", label: "Biolis / AU480 CLIA (102 tasks)" }
            ]}
          />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button tone="gray" onClick={onClose}>Cancel</Button>
          <Button tone="blue" onClick={submit} disabled={saving || !name || !clientName}>
            {saving ? "Creating…" : "Create"}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

const TaskRow = ({ task, canEditOwner, onUpdate, onDelete, isAdmin }) => {
  const [saving, setSaving] = useState(false);

  const update = async (patch) => {
    setSaving(true);
    try {
      await onUpdate(task.id, patch);
    } finally {
      setSaving(false);
    }
  };

  const toggleCompleted = async (val) => {
    const patch = { completed: val };
    if (val) patch.dateCompleted = task.dateCompleted || formatDateISO(new Date());
    await update(patch);
  };

  return (
    <tr className="border-t">
      <td className="px-3 py-3">
        <input type="checkbox" checked={!!task.completed} onChange={(e) => toggleCompleted(e.target.checked)} />
      </td>
      <td className="px-3 py-3 text-sm text-gray-800">
        <div className="font-medium">{task.taskTitle}</div>
        {task.clientName ? <div className="text-xs text-gray-500 mt-1">Client label: {task.clientName}</div> : null}
      </td>
      <td className="px-3 py-3 text-sm text-gray-700">{task.phase}</td>
      <td className="px-3 py-3 text-sm text-gray-700">{task.stage || "—"}</td>
      <td className="px-3 py-3">
        <input
          className={`w-44 rounded-md border px-2 py-1 text-sm ${!canEditOwner ? "bg-gray-100" : ""}`}
          value={task.owner || ""}
          disabled={!canEditOwner}
          onChange={(e) => update({ owner: e.target.value })}
          placeholder="Owner"
        />
      </td>
      <td className="px-3 py-3">
        <input
          className="w-36 rounded-md border px-2 py-1 text-sm"
          value={task.startDate || ""}
          onChange={(e) => update({ startDate: e.target.value })}
          placeholder="Start"
        />
      </td>
      <td className="px-3 py-3">
        <input
          className="w-36 rounded-md border px-2 py-1 text-sm"
          value={task.dueDate || ""}
          onChange={(e) => update({ dueDate: e.target.value })}
          placeholder="Due"
        />
      </td>
      <td className="px-3 py-3">
        <input
          className="w-36 rounded-md border px-2 py-1 text-sm"
          value={task.dateCompleted || ""}
          onChange={(e) => update({ dateCompleted: e.target.value })}
          placeholder="Completed"
        />
      </td>
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={!!task.showToClient}
          onChange={(e) => update({ showToClient: e.target.checked })}
        />
      </td>
      <td className="px-3 py-3 text-right">
        {isAdmin ? (
          <button
            onClick={() => onDelete(task.id)}
            className="text-sm text-red-600 hover:text-red-800"
            title="Delete task"
          >
            Delete
          </button>
        ) : (
          <span className="text-xs text-gray-400">—</span>
        )}
      </td>
    </tr>
  );
};

const ProjectDetail = ({ token, user, project, onBack, onProjectUpdated }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [creatingTask, setCreatingTask] = useState(false);

  // New task form
  const [ntTitle, setNtTitle] = useState("");
  const [ntPhase, setNtPhase] = useState("Phase 1");
  const [ntStage, setNtStage] = useState("");
  const [ntOwner, setNtOwner] = useState("");
  const [ntDue, setNtDue] = useState("");
  const [ntShow, setNtShow] = useState(false);
  const [ntClientName, setNtClientName] = useState("");

  const refresh = async () => {
    setLoading(true);
    setErr("");
    try {
      const res = await api(`/api/projects/${project.id}/tasks`, { token });
      setTasks(res);
    } catch (ex) {
      setErr(ex.message || "Failed to load tasks");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, [project.id]);

  const progress = useMemo(() => {
    const total = tasks.length || 0;
    const done = tasks.filter(t => t.completed).length;
    return { total, done, pct: total ? Math.round((done/total)*100) : 0 };
  }, [tasks]);

  const updateTask = async (taskId, patch) => {
    try {
      const updated = await api(`/api/projects/${project.id}/tasks/${taskId}`, { token, method: "PUT", body: patch });
      setTasks((prev) => prev.map(t => (t.id === taskId ? updated : t)));
    } catch (ex) {
      setErr(ex.message || "Update failed");
    }
  };

  const deleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;
    try {
      await api(`/api/projects/${project.id}/tasks/${taskId}`, { token, method: "DELETE" });
      setTasks((prev) => prev.filter(t => t.id !== taskId));
    } catch (ex) {
      setErr(ex.message || "Delete failed");
    }
  };

  const createTask = async () => {
    setErr("");
    try {
      const created = await api(`/api/projects/${project.id}/tasks`, {
        token,
        method: "POST",
        body: {
          taskTitle: ntTitle,
          phase: ntPhase,
          stage: ntStage,
          owner: ntOwner,
          dueDate: ntDue,
          showToClient: ntShow,
          clientName: ntClientName
        }
      });
      setTasks((prev) => [...prev, created]);
      setCreatingTask(false);
      setNtTitle(""); setNtPhase("Phase 1"); setNtStage(""); setNtOwner(""); setNtDue(""); setNtShow(false); setNtClientName("");
    } catch (ex) {
      setErr(ex.message || "Failed to create task");
    }
  };

  const filteredTasks = useMemo(() => {
    return tasks
      .filter(t => {
        if (filter === "open") return !t.completed;
        if (filter === "done") return !!t.completed;
        if (filter === "client") return !!t.showToClient;
        return true;
      })
      .filter(t => {
        if (!search.trim()) return true;
        const s = search.trim().toLowerCase();
        return `${t.taskTitle} ${t.phase} ${t.stage} ${t.owner} ${t.clientName}`.toLowerCase().includes(s);
      })
      .sort((a,b) => a.id - b.id);
  }, [tasks, filter, search]);

  const clientLink = `${window.location.origin}/client/${project.clientLinkId}`;

  const exportCsv = async () => {
    setErr("");
    try {
      const r = await fetch(`/api/projects/${project.id}/export`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.error || `Export failed (HTTP ${r.status})`);
      }
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${project.name}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (ex) {
      setErr(ex.message || "Export failed");
    }
  };

  const saveProjectMeta = async (patch) => {
    setErr("");
    try {
      const updated = await api(`/api/projects/${project.id}`, { token, method: "PUT", body: patch });
      onProjectUpdated(updated);
    } catch (ex) {
      setErr(ex.message || "Failed to update project");
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <button onClick={onBack} className="text-sm text-blue-600 hover:text-blue-800">← Back to projects</button>
          <h2 className="text-2xl font-bold text-gray-900 mt-2">{project.name}</h2>
          <p className="text-gray-600">{project.clientName}</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Badge tone="green">{progress.done}/{progress.total} complete</Badge>
            <Badge tone="blue">{progress.pct}% overall</Badge>
            {project.hubspotDealStage ? <Badge tone="amber">HubSpot: {project.hubspotDealStage}</Badge> : null}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="flex gap-2 flex-wrap justify-end">
            <Button tone="gray" onClick={refresh}>Refresh</Button>
            <Button tone="white" onClick={exportCsv}>Export CSV</Button>
            {user.role === "admin" ? (
              <Button tone="blue" onClick={() => setCreatingTask(true)}>Add Task</Button>
            ) : null}
          </div>
          <div className="text-xs text-gray-500">
            Client view link:
            <div className="mt-1 flex items-center gap-2">
              <input className="w-[340px] max-w-full rounded-md border px-2 py-1" value={clientLink} readOnly />
              <Button tone="gray" onClick={() => navigator.clipboard.writeText(clientLink)}>Copy</Button>
            </div>
          </div>
        </div>
      </div>

      {err && <div className="mt-4 text-sm text-red-600">{err}</div>}

      <div className="mt-6 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 border rounded-xl p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm font-semibold text-gray-900">Tasks</div>
            <div className="flex items-center gap-2">
              <select className="rounded-md border px-2 py-1 text-sm" value={filter} onChange={(e)=>setFilter(e.target.value)}>
                <option value="all">All</option>
                <option value="open">Open</option>
                <option value="done">Completed</option>
                <option value="client">Client-visible</option>
              </select>
              <input
                className="rounded-md border px-2 py-1 text-sm w-52"
                value={search}
                onChange={(e)=>setSearch(e.target.value)}
                placeholder="Search tasks…"
              />
            </div>
          </div>

          {loading ? (
            <div className="mt-4 text-gray-600">Loading…</div>
          ) : (
            <div className="mt-4 overflow-auto">
              <table className="min-w-[1100px] w-full">
                <thead>
                  <tr className="text-left text-xs text-gray-500 border-b">
                    <th className="px-3 py-2">Done</th>
                    <th className="px-3 py-2">Task</th>
                    <th className="px-3 py-2">Phase</th>
                    <th className="px-3 py-2">Stage</th>
                    <th className="px-3 py-2">Owner</th>
                    <th className="px-3 py-2">Start</th>
                    <th className="px-3 py-2">Due</th>
                    <th className="px-3 py-2">Completed</th>
                    <th className="px-3 py-2">Show to Client</th>
                    <th className="px-3 py-2 text-right">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      isAdmin={user.role === "admin"}
                      canEditOwner={user.role === "admin"}
                      onUpdate={updateTask}
                      onDelete={deleteTask}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="border rounded-xl p-4">
          <div className="text-sm font-semibold text-gray-900">HubSpot / Metadata</div>
          <p className="text-xs text-gray-500 mt-1">Store deal identifiers and stage; does not sync automatically unless you add a HubSpot token later.</p>

          <div className="mt-4 space-y-3">
            <Input label="Project Manager" value={project.projectManager || ""} onChange={(v)=>saveProjectMeta({ projectManager: v })} placeholder="Owner" />
            <Input label="HubSpot Deal ID" value={project.hubspotDealId || ""} onChange={(v)=>saveProjectMeta({ hubspotDealId: v })} placeholder="Deal ID" />
            <Input label="HubSpot Deal Stage" value={project.hubspotDealStage || ""} onChange={(v)=>saveProjectMeta({ hubspotDealStage: v })} placeholder="Deal stage" />
            <Select
              label="Status"
              value={project.status || "active"}
              onChange={(v)=>saveProjectMeta({ status: v })}
              options={[
                { value: "active", label: "Active" },
                { value: "paused", label: "Paused" },
                { value: "complete", label: "Complete" },
              ]}
            />
          </div>

          <div className="mt-6">
            <div className="text-sm font-semibold text-gray-900">Progress</div>
            <div className="mt-2 w-full bg-gray-200 rounded-full h-4">
              <div className="bg-blue-600 h-4 rounded-full" style={{ width: `${progress.pct}%` }} />
            </div>
            <div className="mt-2 text-xs text-gray-600">{progress.pct}% ({progress.done} of {progress.total})</div>
          </div>
        </div>
      </div>

      <Modal title="Add Task (Admin)" open={creatingTask} onClose={()=>setCreatingTask(false)}>
        <div className="space-y-4">
          <Input label="Task Title" value={ntTitle} onChange={setNtTitle} placeholder="What needs to be done?" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Phase" value={ntPhase} onChange={setNtPhase} placeholder="Phase 1" />
            <Input label="Stage" value={ntStage} onChange={setNtStage} placeholder="Sprint / Stage" />
            <Input label="Owner" value={ntOwner} onChange={setNtOwner} placeholder="Internal owner" />
            <Input label="Due Date" value={ntDue} onChange={setNtDue} placeholder="e.g., 7/14/25" />
          </div>
          <Input label="Client-friendly Label (optional)" value={ntClientName} onChange={setNtClientName} placeholder="What the client sees in portal" />
          <Checkbox checked={ntShow} onChange={setNtShow} label="Show to client in portal" />
          <div className="flex justify-end gap-2">
            <Button tone="gray" onClick={()=>setCreatingTask(false)}>Cancel</Button>
            <Button tone="blue" onClick={createTask} disabled={!ntTitle}>Create</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

const AppShell = ({ token, user, onLogout }) => {
  const [projectsRefreshKey, setProjectsRefreshKey] = useState(0);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);

  const openProject = (p) => setSelectedProject(p);

  const onProjectUpdated = (updated) => setSelectedProject(updated);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Project Tracker</h1>
            <div className="text-sm text-gray-600">Signed in as {user.name} ({user.email})</div>
          </div>
          <div className="flex items-center gap-2">
            {user.role === "admin" && !selectedProject ? (
              <Button tone="blue" onClick={() => setShowCreate(true)}>Create Project</Button>
            ) : null}
            <Button tone="gray" onClick={onLogout}>Logout</Button>
          </div>
        </header>

        {selectedProject ? (
          <ProjectDetail
            token={token}
            user={user}
            project={selectedProject}
            onBack={() => setSelectedProject(null)}
            onProjectUpdated={onProjectUpdated}
          />
        ) : (
          <ProjectList
            key={projectsRefreshKey}
            token={token}
            user={user}
            onOpenProject={openProject}
          />
        )}

        <CreateProject
          token={token}
          open={showCreate}
          onClose={() => setShowCreate(false)}
          onCreated={() => setProjectsRefreshKey(k => k + 1)}
        />
      </div>
    </div>
  );
};

const Root = () => {
  const [auth, setAuth] = useState(() => {
    try {
      const raw = localStorage.getItem("auth");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const onAuthed = (res) => {
    const payload = { token: res.token, user: res.user };
    localStorage.setItem("auth", JSON.stringify(payload));
    setAuth(payload);
  };

  const onLogout = () => {
    localStorage.removeItem("auth");
    setAuth(null);
  };

  if (!auth) return <Auth onAuthed={onAuthed} />;

  return <AppShell token={auth.token} user={auth.user} onLogout={onLogout} />;
};

ReactDOM.createRoot(document.getElementById("root")).render(<Root />);
