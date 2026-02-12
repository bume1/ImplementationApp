// ============================================================
// analytics.js - AI-Powered Time-to-Value Analytics Engine
// ============================================================
// Tracks and analyzes implementation metrics including:
// - Time to value (contract → go-live)
// - Phase-by-phase velocity
// - Bottleneck identification
// - Predictive completion estimates
// - Cross-project benchmarking
// ============================================================

const config = require('./config');

// ---- Phase Definitions ----
const PHASE_ORDER = config.PHASE_ORDER; // ['Phase 1', 'Phase 2', ..., 'Phase 10']

// ---- Core Metric Calculations ----

// Calculate time-to-value for a single project
function calculateProjectTimeToValue(project, tasks) {
  const metrics = {
    projectId: project.id,
    projectName: project.name,
    clientName: project.clientName,
    status: project.status || 'active',
    createdAt: project.createdAt,
    goLiveDateTarget: project.goLiveDate || null,

    // Overall time-to-value
    contractSignedDate: null,
    goLiveActualDate: null,
    timeToValueDays: null,
    timeToValueWeeks: null,

    // Phase-by-phase breakdown
    phases: {},

    // Task velocity
    totalTasks: tasks.length,
    completedTasks: 0,
    progressPercent: 0,
    avgTaskCompletionDays: null,

    // Bottleneck analysis
    overdueTaskCount: 0,
    blockedTaskCount: 0,
    longestOpenTaskDays: null,
    longestOpenTask: null,

    // Predicted completion
    estimatedCompletionDate: null,
    estimatedRemainingDays: null,
    isOnTrack: null
  };

  if (!tasks || tasks.length === 0) return metrics;

  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const completedTasks = tasks.filter(t => t.completed);
  metrics.completedTasks = completedTasks.length;
  metrics.progressPercent = tasks.length > 0
    ? Math.round((completedTasks.length / tasks.length) * 100)
    : 0;

  // Find contract signed task (Phase 1)
  const contractTask = tasks.find(t =>
    t.taskTitle && t.taskTitle.toLowerCase().includes('contract signed')
  );
  if (contractTask?.dateCompleted) {
    metrics.contractSignedDate = contractTask.dateCompleted;
  }

  // Find first live patient samples task (Phase 9)
  const goLiveTask = tasks.find(t =>
    t.taskTitle && t.taskTitle.toLowerCase().includes('first live patient samples')
  );
  if (goLiveTask?.dateCompleted) {
    metrics.goLiveActualDate = goLiveTask.dateCompleted;
  }

  // Calculate time-to-value
  if (metrics.contractSignedDate && metrics.goLiveActualDate) {
    const contractDate = new Date(metrics.contractSignedDate);
    const goLiveDate = new Date(metrics.goLiveActualDate);
    const diffMs = goLiveDate - contractDate;
    metrics.timeToValueDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
    metrics.timeToValueWeeks = Math.round(diffMs / (7 * 1000 * 60 * 60 * 24));
  }

  // Phase-by-phase analysis
  for (const phaseKey of PHASE_ORDER) {
    const phaseTasks = tasks.filter(t => t.phase === phaseKey);
    if (phaseTasks.length === 0) {
      metrics.phases[phaseKey] = { totalTasks: 0, completedTasks: 0, progressPercent: 0 };
      continue;
    }

    const phaseCompleted = phaseTasks.filter(t => t.completed);
    const phaseCompletionDates = phaseCompleted
      .filter(t => t.dateCompleted)
      .map(t => new Date(t.dateCompleted))
      .sort((a, b) => a - b);

    // Find earliest and latest completion in the phase
    const firstCompleted = phaseCompletionDates[0] || null;
    const lastCompleted = phaseCompletionDates[phaseCompletionDates.length - 1] || null;

    // Phase duration (first task completed → last task completed)
    let phaseDurationDays = null;
    if (firstCompleted && lastCompleted) {
      phaseDurationDays = Math.round((lastCompleted - firstCompleted) / (1000 * 60 * 60 * 24));
    }

    // Phase start (earliest due date or first completion)
    const phaseDueDates = phaseTasks.filter(t => t.dueDate).map(t => t.dueDate).sort();
    const phaseStartDate = phaseDueDates[0] || (firstCompleted ? firstCompleted.toISOString().split('T')[0] : null);

    metrics.phases[phaseKey] = {
      name: config.STANDARD_PHASES[phaseKey]?.name || phaseKey,
      totalTasks: phaseTasks.length,
      completedTasks: phaseCompleted.length,
      progressPercent: Math.round((phaseCompleted.length / phaseTasks.length) * 100),
      startDate: phaseStartDate,
      firstCompletedDate: firstCompleted ? firstCompleted.toISOString() : null,
      lastCompletedDate: lastCompleted ? lastCompleted.toISOString() : null,
      durationDays: phaseDurationDays,
      isComplete: phaseCompleted.length === phaseTasks.length
    };
  }

  // Task velocity (average days to complete a task from its start/due date)
  const completionDurations = completedTasks
    .filter(t => t.dateCompleted && (t.startDate || t.dueDate))
    .map(t => {
      const start = new Date(t.startDate || t.dueDate);
      const end = new Date(t.dateCompleted);
      return Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
    });

  if (completionDurations.length > 0) {
    metrics.avgTaskCompletionDays = Math.round(
      completionDurations.reduce((a, b) => a + b, 0) / completionDurations.length * 10
    ) / 10;
  }

  // Bottleneck analysis
  const incompleteTasks = tasks.filter(t => !t.completed);
  for (const task of incompleteTasks) {
    if (task.dueDate && task.dueDate < today) {
      metrics.overdueTaskCount++;
    }

    // Check for blocked tasks (dependencies not met)
    if (task.dependencies && task.dependencies.length > 0) {
      const allDepsMet = task.dependencies.every(depId => {
        const depTask = tasks.find(t => String(t.id) === String(depId));
        return depTask && depTask.completed;
      });
      if (!allDepsMet) metrics.blockedTaskCount++;
    }

    // Track longest open task
    if (task.startDate || task.dueDate) {
      const taskStart = new Date(task.startDate || task.dueDate);
      const daysOpen = Math.round((now - taskStart) / (1000 * 60 * 60 * 24));
      if (daysOpen > 0 && (metrics.longestOpenTaskDays === null || daysOpen > metrics.longestOpenTaskDays)) {
        metrics.longestOpenTaskDays = daysOpen;
        metrics.longestOpenTask = {
          id: String(task.id),
          title: task.taskTitle,
          phase: task.phase,
          daysOpen
        };
      }
    }
  }

  // Predicted completion estimate
  if (metrics.contractSignedDate && metrics.completedTasks > 0 && metrics.completedTasks < metrics.totalTasks) {
    const contractDate = new Date(metrics.contractSignedDate);
    const elapsedDays = (now - contractDate) / (1000 * 60 * 60 * 24);
    const tasksPerDay = metrics.completedTasks / elapsedDays;
    const remainingTasks = metrics.totalTasks - metrics.completedTasks;

    if (tasksPerDay > 0) {
      const estimatedRemainingDays = Math.round(remainingTasks / tasksPerDay);
      metrics.estimatedRemainingDays = estimatedRemainingDays;

      const estimatedCompletion = new Date(now);
      estimatedCompletion.setDate(estimatedCompletion.getDate() + estimatedRemainingDays);
      metrics.estimatedCompletionDate = estimatedCompletion.toISOString().split('T')[0];

      // Check if on track vs target go-live date
      if (project.goLiveDate) {
        metrics.isOnTrack = metrics.estimatedCompletionDate <= project.goLiveDate;
      }
    }
  }

  return metrics;
}

// ---- Cross-Project Benchmarks ----

function calculateBenchmarks(projectMetrics) {
  const completed = projectMetrics.filter(m => m.timeToValueDays !== null);
  const active = projectMetrics.filter(m => m.status === 'active');

  const benchmarks = {
    totalProjects: projectMetrics.length,
    completedProjects: completed.length,
    activeProjects: active.length,

    // Time-to-value benchmarks
    avgTimeToValueDays: null,
    avgTimeToValueWeeks: null,
    minTimeToValueDays: null,
    maxTimeToValueDays: null,
    medianTimeToValueDays: null,

    // Phase duration benchmarks
    avgPhaseDurations: {},

    // Active project health
    avgProgressPercent: null,
    projectsOnTrack: 0,
    projectsAtRisk: 0,
    totalOverdueTasks: 0,
    totalBlockedTasks: 0,

    // Velocity benchmarks
    avgTaskCompletionDays: null,
    fastestProject: null,
    slowestProject: null
  };

  // Time-to-value stats from completed projects
  if (completed.length > 0) {
    const ttvDays = completed.map(m => m.timeToValueDays).sort((a, b) => a - b);
    benchmarks.avgTimeToValueDays = Math.round(ttvDays.reduce((a, b) => a + b, 0) / ttvDays.length);
    benchmarks.avgTimeToValueWeeks = Math.round(benchmarks.avgTimeToValueDays / 7);
    benchmarks.minTimeToValueDays = ttvDays[0];
    benchmarks.maxTimeToValueDays = ttvDays[ttvDays.length - 1];
    benchmarks.medianTimeToValueDays = ttvDays[Math.floor(ttvDays.length / 2)];

    // Fastest and slowest
    const sorted = completed.sort((a, b) => a.timeToValueDays - b.timeToValueDays);
    benchmarks.fastestProject = {
      name: sorted[0].projectName,
      clientName: sorted[0].clientName,
      days: sorted[0].timeToValueDays
    };
    benchmarks.slowestProject = {
      name: sorted[sorted.length - 1].projectName,
      clientName: sorted[sorted.length - 1].clientName,
      days: sorted[sorted.length - 1].timeToValueDays
    };
  }

  // Phase duration benchmarks across all completed projects
  for (const phaseKey of PHASE_ORDER) {
    const phaseDurations = completed
      .filter(m => m.phases[phaseKey]?.durationDays !== null)
      .map(m => m.phases[phaseKey].durationDays);

    if (phaseDurations.length > 0) {
      benchmarks.avgPhaseDurations[phaseKey] = {
        name: config.STANDARD_PHASES[phaseKey]?.name || phaseKey,
        avgDays: Math.round(phaseDurations.reduce((a, b) => a + b, 0) / phaseDurations.length),
        minDays: Math.min(...phaseDurations),
        maxDays: Math.max(...phaseDurations),
        sampleSize: phaseDurations.length
      };
    }
  }

  // Active project health
  if (active.length > 0) {
    const activeMetrics = projectMetrics.filter(m => m.status === 'active');
    benchmarks.avgProgressPercent = Math.round(
      activeMetrics.reduce((sum, m) => sum + m.progressPercent, 0) / activeMetrics.length
    );
    benchmarks.projectsOnTrack = activeMetrics.filter(m => m.isOnTrack === true).length;
    benchmarks.projectsAtRisk = activeMetrics.filter(m => m.isOnTrack === false).length;
    benchmarks.totalOverdueTasks = activeMetrics.reduce((sum, m) => sum + m.overdueTaskCount, 0);
    benchmarks.totalBlockedTasks = activeMetrics.reduce((sum, m) => sum + m.blockedTaskCount, 0);
  }

  // Avg task completion days across all projects
  const taskCompletionDays = projectMetrics
    .filter(m => m.avgTaskCompletionDays !== null)
    .map(m => m.avgTaskCompletionDays);
  if (taskCompletionDays.length > 0) {
    benchmarks.avgTaskCompletionDays = Math.round(
      taskCompletionDays.reduce((a, b) => a + b, 0) / taskCompletionDays.length * 10
    ) / 10;
  }

  return benchmarks;
}

// ---- AI Insights Generation ----
// Rule-based insight engine that identifies patterns and generates recommendations

function generateInsights(projectMetrics, benchmarks) {
  const insights = [];
  const now = new Date();

  // 1. Overall portfolio health
  if (benchmarks.activeProjects > 0) {
    if (benchmarks.projectsAtRisk > 0) {
      insights.push({
        type: 'warning',
        category: 'portfolio',
        title: 'Projects at Risk',
        message: `${benchmarks.projectsAtRisk} of ${benchmarks.activeProjects} active projects are behind schedule based on current velocity. Review their task backlogs and consider re-prioritizing.`,
        priority: 'high'
      });
    }
    if (benchmarks.totalOverdueTasks > 10) {
      insights.push({
        type: 'warning',
        category: 'portfolio',
        title: 'High Overdue Task Count',
        message: `${benchmarks.totalOverdueTasks} tasks are overdue across active projects. This may indicate resource constraints or scope creep.`,
        priority: 'high'
      });
    }
    if (benchmarks.totalBlockedTasks > 5) {
      insights.push({
        type: 'info',
        category: 'portfolio',
        title: 'Blocked Tasks Detected',
        message: `${benchmarks.totalBlockedTasks} tasks are blocked by incomplete dependencies. Resolving dependency bottlenecks could accelerate delivery.`,
        priority: 'medium'
      });
    }
  }

  // 2. Per-project insights
  for (const pm of projectMetrics) {
    if (pm.status !== 'active') continue;

    // Stalled project detection
    if (pm.completedTasks > 0 && pm.progressPercent < 50) {
      const daysSinceCreation = pm.createdAt
        ? Math.round((now - new Date(pm.createdAt)) / (1000 * 60 * 60 * 24))
        : null;
      if (daysSinceCreation && daysSinceCreation > 90) {
        insights.push({
          type: 'warning',
          category: 'project',
          projectId: pm.projectId,
          projectName: pm.projectName,
          title: 'Slow Progress',
          message: `"${pm.projectName}" is ${daysSinceCreation} days old but only ${pm.progressPercent}% complete. Average time-to-value is ${benchmarks.avgTimeToValueDays || 'N/A'} days. Consider a review meeting.`,
          priority: 'high'
        });
      }
    }

    // Phase bottleneck detection
    for (const [phaseKey, phase] of Object.entries(pm.phases)) {
      if (phase.isComplete || phase.totalTasks === 0) continue;

      const benchmark = benchmarks.avgPhaseDurations[phaseKey];
      if (benchmark && phase.durationDays !== null && phase.durationDays > benchmark.avgDays * 1.5) {
        insights.push({
          type: 'info',
          category: 'phase',
          projectId: pm.projectId,
          projectName: pm.projectName,
          title: `${phase.name} Taking Longer Than Average`,
          message: `${phase.name} for "${pm.projectName}" has been active for ${phase.durationDays} days vs average of ${benchmark.avgDays} days.`,
          priority: 'medium'
        });
      }
    }

    // Longest open task alert
    if (pm.longestOpenTask && pm.longestOpenTask.daysOpen > 30) {
      insights.push({
        type: 'warning',
        category: 'task',
        projectId: pm.projectId,
        projectName: pm.projectName,
        title: 'Long-Running Open Task',
        message: `"${pm.longestOpenTask.title}" in "${pm.projectName}" has been open for ${pm.longestOpenTask.daysOpen} days. This may be blocking downstream work.`,
        priority: 'medium'
      });
    }

    // Prediction vs target mismatch
    if (pm.isOnTrack === false && pm.estimatedCompletionDate && pm.goLiveDateTarget) {
      const overrunDays = Math.round(
        (new Date(pm.estimatedCompletionDate) - new Date(pm.goLiveDateTarget)) / (1000 * 60 * 60 * 24)
      );
      insights.push({
        type: 'warning',
        category: 'prediction',
        projectId: pm.projectId,
        projectName: pm.projectName,
        title: 'Projected Go-Live Delay',
        message: `"${pm.projectName}" is projected to complete ~${overrunDays} days after the target go-live date of ${pm.goLiveDateTarget}. Current velocity: ${pm.avgTaskCompletionDays || 'N/A'} days per task.`,
        priority: 'high'
      });
    }
  }

  // 3. Benchmark insights for completed projects
  if (benchmarks.completedProjects >= 2) {
    insights.push({
      type: 'success',
      category: 'benchmark',
      title: 'Time-to-Value Benchmark',
      message: `Across ${benchmarks.completedProjects} completed implementations: average time-to-value is ${benchmarks.avgTimeToValueWeeks} weeks (${benchmarks.avgTimeToValueDays} days). Range: ${benchmarks.minTimeToValueDays}-${benchmarks.maxTimeToValueDays} days.`,
      priority: 'low'
    });

    // Identify slowest phase
    const slowestPhase = Object.entries(benchmarks.avgPhaseDurations)
      .sort((a, b) => b[1].avgDays - a[1].avgDays)[0];
    if (slowestPhase) {
      insights.push({
        type: 'info',
        category: 'benchmark',
        title: 'Longest Average Phase',
        message: `${slowestPhase[1].name} takes the longest on average (${slowestPhase[1].avgDays} days). Optimizing this phase could have the biggest impact on time-to-value.`,
        priority: 'medium'
      });
    }
  }

  // Sort by priority
  const priorityOrder = { high: 0, medium: 1, low: 2 };
  insights.sort((a, b) => (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2));

  return insights;
}

// ---- Trend Analysis ----

// Calculate time-to-value trend over completed projects (ordered by completion date)
function calculateTrend(projectMetrics) {
  const completed = projectMetrics
    .filter(m => m.timeToValueDays !== null && m.goLiveActualDate)
    .sort((a, b) => new Date(a.goLiveActualDate) - new Date(b.goLiveActualDate));

  if (completed.length < 2) {
    return { trend: 'insufficient_data', dataPoints: completed.length, direction: null };
  }

  // Simple trend: compare first half average to second half average
  const mid = Math.floor(completed.length / 2);
  const firstHalf = completed.slice(0, mid);
  const secondHalf = completed.slice(mid);

  const firstAvg = firstHalf.reduce((s, m) => s + m.timeToValueDays, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((s, m) => s + m.timeToValueDays, 0) / secondHalf.length;

  const changePercent = Math.round(((secondAvg - firstAvg) / firstAvg) * 100);

  return {
    trend: changePercent < -5 ? 'improving' : changePercent > 5 ? 'declining' : 'stable',
    direction: changePercent < 0 ? 'faster' : changePercent > 0 ? 'slower' : 'same',
    changePercent: Math.abs(changePercent),
    firstHalfAvgDays: Math.round(firstAvg),
    secondHalfAvgDays: Math.round(secondAvg),
    dataPoints: completed.length,
    series: completed.map(m => ({
      projectName: m.projectName,
      clientName: m.clientName,
      completedDate: m.goLiveActualDate,
      timeToValueDays: m.timeToValueDays
    }))
  };
}

// ---- Exports ----

module.exports = {
  calculateProjectTimeToValue,
  calculateBenchmarks,
  generateInsights,
  calculateTrend
};
