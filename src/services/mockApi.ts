import type {
  UserProfile,
  TeamOverview,
  Task,
  TaskStatus,
  TaskPriority,
  AdminDashboardMetrics,
  GlobalActivityItem,
  ActivityLogItem,
  AppConfig,
  SyncResult,
} from '../types';

export const isDevBypassEnabled = (): boolean => {
  return (
    import.meta.env.DEV ||
    import.meta.env.VITE_ENABLE_DEV_LOGIN === 'true'
  );
};

export const DEV_TEST_PERSONAS: Record<string, UserProfile & { title: string; badge: string }> = {
  admin: {
    id: 'USR-DEV-ADMIN-001',
    name: 'Dr. Robert Hayes (Congress Director)',
    email: 'admin.qa@company.com',
    role: 'admin',
    teamId: 'all',
    active: true,
    title: 'Medical Congress Director',
    badge: '👑 Congress Director',
  },
  team_head_eng: {
    id: 'USR-DEV-ENG-002',
    name: 'Dr. Alex Rivera (Scientific Head)',
    email: 'lead.eng@company.com',
    role: 'team_head',
    teamId: 'team-scientific',
    active: true,
    title: 'Scientific Committee Chair',
    badge: '🩺 Scientific Head',
  },
  team_head_ops: {
    id: 'USR-DEV-OPS-003',
    name: 'Dr. Jordan Lee (CME Director)',
    email: 'lead.ops@company.com',
    role: 'team_head',
    teamId: 'team-cme-workshops',
    active: true,
    title: 'Clinical CME Director',
    badge: '💉 CME Director',
  },
  viewer: {
    id: 'USR-DEV-VIEWER-004',
    name: 'Dr. Sam Morgan (Ethics Officer)',
    email: 'auditor.qa@company.com',
    role: 'viewer',
    teamId: 'all',
    active: true,
    title: 'Medical Ethics Auditor',
    badge: '👁️ Ethics Auditor',
  },
};

const STORAGE_KEY_STORE = 'kriti_mock_store_v3';
const STORAGE_KEY_USER = 'kriti_mock_active_user_v3';

const INITIAL_TEAMS: TeamOverview[] = [
  {
    id: 'team-scientific',
    name: 'Team 01 - Scientific Committee & Medical Abstracts',
    department: 'Academic & Clinical Affairs',
    headEmail: 'lead.eng@company.com',
    totalTasks: 4,
    completedTasks: 2,
    pendingTasks: 2,
    completionPercentage: 50.0,
    latestPendingTask: 'Finalize peer-review approvals for 250 clinical oral abstracts',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-01',
    status: 'Active',
    description: 'Abstract reviews, clinical tracks, symposia selection, and journal publication coordination',
  },
  {
    id: 'team-cme-workshops',
    name: 'Team 02 - Clinical Workshops & CME Accreditation',
    department: 'Continuing Medical Education',
    headEmail: 'lead.ops@company.com',
    totalTasks: 3,
    completedTasks: 2,
    pendingTasks: 1,
    completionPercentage: 66.67,
    latestPendingTask: 'Submit CME credit syllabus to State Medical Council for 12 credit hours',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-02',
    status: 'Active',
    description: 'Hands-on clinical stations, ultrasound simulations, and medical council credit hours',
  },
  {
    id: 'team-faculty',
    name: 'Team 03 - Keynote Speakers & Faculty Coordination',
    department: 'Faculty Relations',
    headEmail: 'faculty@medevent.org',
    totalTasks: 2,
    completedTasks: 2,
    pendingTasks: 0,
    completionPercentage: 100.0,
    latestPendingTask: 'All tasks completed.',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-03',
    status: 'Active',
    description: 'International keynote professors, speaker honorarium, and preview green rooms',
  },
  {
    id: 'team-surgical-labs',
    name: 'Team 04 - Surgical Wet-Labs & Simulators',
    department: 'Surgical Training',
    headEmail: 'surgical.labs@medevent.org',
    totalTasks: 3,
    completedTasks: 1,
    pendingTasks: 2,
    completionPercentage: 33.33,
    latestPendingTask: 'Calibrate Da Vinci robotic surgical console simulator & trainer modules',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-04',
    status: 'Active',
    description: 'Laparoscopic simulators, robotic surgery console stations, and cadaver tissue handling',
  },
  {
    id: 'team-exhibition',
    name: 'Team 05 - Medical Exhibition & Pharma Sponsors',
    department: 'Industry Partnerships',
    headEmail: 'exhibition@medevent.org',
    totalTasks: 3,
    completedTasks: 2,
    pendingTasks: 1,
    completionPercentage: 66.67,
    latestPendingTask: 'Audit 45 pharma exhibitor booths for IFPMA medical compliance',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-05',
    status: 'Active',
    description: 'Pharmaceutical pavilions, medical technology demo booths, and sponsorship logistics',
  },
  {
    id: 'team-registration',
    name: 'Team 06 - Delegate Registration & Health Badging',
    department: 'Delegate Services',
    headEmail: 'registration@medevent.org',
    totalTasks: 3,
    completedTasks: 1,
    pendingTasks: 2,
    completionPercentage: 33.33,
    latestPendingTask: 'Program 1,500 RFID delegate doctor badges with integrated CME chip tracking',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-06',
    status: 'Active',
    description: 'RFID physician delegate badges, on-site check-in kiosks, and welcome kits',
  },
  {
    id: 'team-av-telemed',
    name: 'Team 07 - Audio-Visual, Telemedicine & Live Surgery Broadcast',
    department: 'Medical Broadcast',
    headEmail: 'telemed.av@medevent.org',
    totalTasks: 2,
    completedTasks: 1,
    pendingTasks: 1,
    completionPercentage: 50.0,
    latestPendingTask: 'Establish encrypted low-latency fiber link for live operating theatre telecast',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-07',
    status: 'Active',
    description: '4K surgical video feeds, live telemedicine operating theatre broadcast, and plenary audio sync',
  },
  {
    id: 'team-hospitality',
    name: 'Team 08 - Hospitality, VIP Doctors & Travel Logistics',
    department: 'Hospitality & VIP Concierge',
    headEmail: 'hospitality@medevent.org',
    totalTasks: 2,
    completedTasks: 1,
    pendingTasks: 1,
    completionPercentage: 50.0,
    latestPendingTask: 'Finalize presidential banquet seating chart and dietary requirements for VIP surgeons',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-08',
    status: 'Active',
    description: 'Airport doctor concierge, presidential suite bookings, and dedicated executive shuttles',
  },
  {
    id: 'team-emergency-ops',
    name: 'Team 09 - Emergency Medical Protocol & First Aid Ops',
    department: 'Emergency Medicine & Safety',
    headEmail: 'emergency.ops@medevent.org',
    totalTasks: 2,
    completedTasks: 2,
    pendingTasks: 0,
    completionPercentage: 100.0,
    latestPendingTask: 'All tasks completed.',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-09',
    status: 'Active',
    description: 'Onsite emergency triage station, automated defibrillators (AED), and hospital trauma dispatch',
  },
  {
    id: 'team-medical-press',
    name: 'Team 10 - Medical Press, Media & Journal Publications',
    department: 'Communications & Media',
    headEmail: 'press@medevent.org',
    totalTasks: 2,
    completedTasks: 1,
    pendingTasks: 1,
    completionPercentage: 50.0,
    latestPendingTask: 'Coordinate embargoed press briefing on Phase III clinical trial outcomes',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-10',
    status: 'Active',
    description: 'Medical journalism briefings, clinical trial press releases, and symposium media embargoes',
  },
  {
    id: 'team-biohazard-venue',
    name: 'Team 11 - Venue Facilities, Bio-Hazard & Infection Control',
    department: 'Facility & Biosafety Operations',
    headEmail: 'venue.safety@medevent.org',
    totalTasks: 3,
    completedTasks: 2,
    pendingTasks: 1,
    completionPercentage: 66.67,
    latestPendingTask: 'Verify HEPA air filtration turnover cycles across Auditoriums 1 and 2',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-11',
    status: 'Active',
    description: 'HEPA filtration monitoring, biomedical waste disposal, and infection control cycles',
  },
  {
    id: 'team-ethics-compliance',
    name: 'Team 12 - Compliance, Ethics Board & Medical Regulatory',
    department: 'Regulatory & Ethics',
    headEmail: 'ethics.compliance@medevent.org',
    totalTasks: 2,
    completedTasks: 1,
    pendingTasks: 1,
    completionPercentage: 50.0,
    latestPendingTask: 'Verify patient de-identification and consent releases for all surgical videos',
    lastUpdated: new Date().toISOString(),
    spreadsheetId: 'MOCK-SHEET-TEAM-12',
    status: 'Active',
    description: 'Declaration of Helsinki adherence, patient privacy redactions, and ethical oversight',
  },
];

const INITIAL_ENG_TASKS: Task[] = [
  {
    id: 'TSK-MED-001',
    title: 'Verify conflict-of-interest disclosures for 48 symposium speakers',
    description: 'Ensure all CME-accredited faculty submit signed financial and industry relationship disclosures.',
    category: 'Scientific & Clinical Program',
    isMandatory: true,
    status: 'Completed',
    priority: 'High',
    assignedTo: 'lead.eng@company.com',
    deadline: '2026-11-05',
    remarks: 'All 48 disclosures verified and archived for State Medical Council inspection.',
    displayOrder: 1,
    createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    completedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'TSK-MED-002',
    title: 'Finalize peer-review approvals for 250 clinical oral abstracts',
    description: 'Aggregate blind reviewer scores and notify selected primary authors for oral presentations.',
    category: 'Scientific & Clinical Program',
    isMandatory: true,
    status: 'Pending',
    priority: 'Critical',
    assignedTo: 'lead.eng@company.com',
    deadline: '2026-11-10',
    remarks: '210/250 peer reviews complete. Final review panel convenes tomorrow.',
    displayOrder: 2,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: 'TSK-MED-003',
    title: 'Publish indexed abstract supplement to International Medical Congress Journal',
    description: 'Format DOI citations, author indices, and clinical category cross-references.',
    category: 'Scientific & Clinical Program',
    isMandatory: true,
    status: 'Pending',
    priority: 'Medium',
    assignedTo: 'lead.eng@company.com',
    deadline: '2026-11-15',
    remarks: 'Draft manuscript proofs received from publisher.',
    displayOrder: 3,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'TSK-MED-004',
    title: 'Schedule digital e-poster terminals and presentation time slots',
    description: 'Allocate 60 interactive touchscreen terminals across halls B and C with 15-minute rotation intervals.',
    category: 'Scientific & Clinical Program',
    isMandatory: false,
    status: 'Completed',
    priority: 'High',
    assignedTo: 'lead.eng@company.com',
    deadline: '2026-11-02',
    remarks: 'E-poster digital staging completed and tested.',
    displayOrder: 4,
    createdAt: new Date(Date.now() - 86400000 * 4).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
];

const INITIAL_CONFIG: AppConfig = {
  dashboardWidgets: {
    showKpiMetrics: true,
    showTeamOverviewTable: true,
    showGlobalActivityFeed: true,
    showOverdueAlerts: true,
    showSyncHealthStatus: true,
  },
  visibleTeamFields: [
    'teamName',
    'department',
    'headEmail',
    'progress',
    'tasksCount',
    'latestPending',
    'lastUpdated',
    'status',
  ],
  categories: [
    'Scientific & Clinical Program',
    'Continuing Medical Education (CME)',
    'Surgical Simulators & Wet-Labs',
    'Medical Exhibition & Pharma Compliance',
    'Venue, Bio-Safety & Infection Control',
    'Delegate Operations & Triage',
  ],
  appSettings: {
    companyName: 'KRITI Medical Congress & Healthcare Summit Operations',
    announcementBanner: '🩺 Clinical Congress Checklist Active — Multi-committee synchronization enabled',
    allowTeamHeadReopen: true,
    requireRemarksOnCompletion: false,
  },
};

const INITIAL_USERS: UserProfile[] = [
  DEV_TEST_PERSONAS.admin,
  DEV_TEST_PERSONAS.team_head_eng,
  DEV_TEST_PERSONAS.team_head_ops,
  DEV_TEST_PERSONAS.viewer,
];

interface MockDataStore {
  teams: TeamOverview[];
  tasksByTeam: Record<string, Task[]>;
  config: AppConfig;
  users: UserProfile[];
  activity: GlobalActivityItem[];
}

function loadStore(): MockDataStore {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY_STORE);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      // fallback
    }
  }

  const initialStore: MockDataStore = {
    teams: INITIAL_TEAMS,
    tasksByTeam: {
      'team-scientific': INITIAL_ENG_TASKS,
      'team-engineering': INITIAL_ENG_TASKS,
    },
    config: INITIAL_CONFIG,
    users: INITIAL_USERS,
    activity: [
      {
        id: 'ACT-001',
        timestamp: new Date().toISOString(),
        teamId: 'team-scientific',
        teamName: 'Team 01 - Scientific Committee & Medical Abstracts',
        taskId: 'TSK-MED-004',
        user: 'lead.eng@company.com',
        action: 'Completed Task: Scheduled digital e-poster terminals and presentation time slots',
      },
      {
        id: 'ACT-002',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        teamId: 'team-cme-workshops',
        teamName: 'Team 02 - Clinical Workshops & CME Accreditation',
        taskId: 'TSK-CME-001',
        user: 'lead.ops@company.com',
        action: 'Submitted CME syllabus to State Medical Council for 12 credit hours',
      },
    ],
  };

  saveStore(initialStore);
  return initialStore;
}

function saveStore(store: MockDataStore) {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY_STORE, JSON.stringify(store));
    } catch (e) {
      console.warn('Failed to persist mock store to localStorage:', e);
    }
  }
}

export const mockApi = {
  loginWithDevPersona(personaKey: string): { user: UserProfile; csrfToken: string } {
    const user = DEV_TEST_PERSONAS[personaKey] || DEV_TEST_PERSONAS.admin;
    localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(user));
    return {
      user,
      csrfToken: 'mock-csrf-token-' + Date.now(),
    };
  },

  getCurrentUser(): UserProfile | null {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_USER);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      // ignore
    }
    return null;
  },

  clearSession() {
    localStorage.removeItem(STORAGE_KEY_USER);
  },

  resetStore() {
    localStorage.removeItem(STORAGE_KEY_STORE);
    localStorage.removeItem(STORAGE_KEY_USER);
  },

  getTeams(): TeamOverview[] {
    const store = loadStore();
    return store.teams;
  },

  getTeamOverview(teamId: string): TeamOverview {
    const store = loadStore();
    const team = store.teams.find(
      t =>
        t.id === teamId ||
        (teamId === 'team-engineering' && t.id === 'team-scientific') ||
        (teamId === 'team-operations' && t.id === 'team-cme-workshops')
    );
    if (!team) {
      throw new Error(`Team not found: ${teamId}`);
    }
    return team;
  },

  getTeamTasks(teamId: string): {
    teamId: string;
    tasks: Task[];
    metrics: {
      totalTasks: number;
      completedTasks: number;
      pendingTasks: number;
      completionPercentage: number;
      latestPendingTask: string;
    };
    activity: ActivityLogItem[];
  } {
    const store = loadStore();
    const resolvedId =
      teamId === 'team-engineering' && !store.tasksByTeam['team-engineering'] && store.tasksByTeam['team-scientific']
        ? 'team-scientific'
        : teamId;
    let tasks = store.tasksByTeam[resolvedId] || store.tasksByTeam[teamId];
    if (!tasks) {
      tasks = [
        {
          id: `TSK-${teamId.slice(-3).toUpperCase()}-001`,
          title: `Initial milestone review for ${teamId}`,
          description: 'Review core deliverables and pending dependencies.',
          category: 'Operations',
          isMandatory: true,
          status: 'Pending',
          priority: 'High',
          assignedTo: 'team.head@company.com',
          deadline: '2026-11-20',
          remarks: 'Awaiting team sync.',
          displayOrder: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      store.tasksByTeam[teamId] = tasks;
      saveStore(store);
    }

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(t => t.status === 'Completed').length;
    const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
    const completionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 10000) / 100 : 0;
    const firstPending = tasks
      .filter(t => t.status === 'Pending')
      .sort((a, b) => a.displayOrder - b.displayOrder)[0];
    const latestPendingTask = firstPending ? firstPending.title : 'All tasks completed.';

    const activity: ActivityLogItem[] = [
      {
        id: `LOG-${Date.now().toString().slice(-4)}`,
        taskId: tasks[0]?.id || 'TSK-001',
        action: 'STATUS_CHANGED',
        performedBy: this.getCurrentUser()?.email || 'qa@company.com',
        timestamp: new Date().toISOString(),
      },
    ];

    return {
      teamId,
      tasks: [...tasks].sort((a, b) => a.displayOrder - b.displayOrder),
      metrics: {
        totalTasks,
        completedTasks,
        pendingTasks,
        completionPercentage,
        latestPendingTask,
      },
      activity,
    };
  },

  updateTaskStatus(teamId: string, taskId: string, status: TaskStatus, remarks?: string): SyncResult {
    const store = loadStore();
    let tasks = store.tasksByTeam[teamId] || [];
    const taskIndex = tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found.`);
    }

    tasks[taskIndex].status = status;
    if (remarks !== undefined) {
      tasks[taskIndex].remarks = remarks;
    }
    tasks[taskIndex].updatedAt = new Date().toISOString();
    if (status === 'Completed') {
      tasks[taskIndex].completedAt = new Date().toISOString();
    } else {
      tasks[taskIndex].completedAt = undefined;
    }

    // Recalculate metrics
    const total = tasks.length;
    const completed = tasks.filter(t => t.status === 'Completed').length;
    const pending = tasks.filter(t => t.status === 'Pending').length;
    const pct = total > 0 ? Math.round((completed / total) * 10000) / 100 : 0;
    const firstPending = tasks.filter(t => t.status === 'Pending').sort((a, b) => a.displayOrder - b.displayOrder)[0];
    const latestPending = firstPending ? firstPending.title : 'All tasks completed.';

    // Update team overview
    const teamIndex = store.teams.findIndex(t => t.id === teamId);
    if (teamIndex !== -1) {
      store.teams[teamIndex].completedTasks = completed;
      store.teams[teamIndex].pendingTasks = pending;
      store.teams[teamIndex].completionPercentage = pct;
      store.teams[teamIndex].latestPendingTask = latestPending;
      store.teams[teamIndex].lastUpdated = new Date().toISOString();
    }

    // Add activity log
    const currentUser = this.getCurrentUser();
    store.activity.unshift({
      id: `ACT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      teamId,
      teamName: store.teams[teamIndex]?.name || teamId,
      taskId,
      user: currentUser?.email || 'qa@company.com',
      action: `Status → ${status.toUpperCase()}: ${tasks[taskIndex].title}`,
    });

    saveStore(store);

    return {
      teamId,
      totalTasks: total,
      completedTasks: completed,
      pendingTasks: pending,
      completionPercentage: pct,
      latestPendingTask: latestPending,
      masterSynced: true,
    };
  },

  createTask(teamId: string, taskData: Partial<Task>): Task {
    const store = loadStore();
    const tasks = store.tasksByTeam[teamId] || [];
    const maxOrder = tasks.reduce((max, t) => Math.max(max, t.displayOrder), 0);

    const newTask: Task = {
      id: `TSK-${Date.now().toString().slice(-6)}`,
      title: taskData.title || 'New Task',
      description: taskData.description || '',
      category: taskData.category || 'Backend & Infrastructure',
      isMandatory: taskData.isMandatory ?? true,
      status: taskData.status || 'Pending',
      priority: taskData.priority || 'Medium',
      assignedTo: taskData.assignedTo || '',
      deadline: taskData.deadline || new Date().toISOString().split('T')[0],
      remarks: taskData.remarks || '',
      displayOrder: maxOrder + 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tasks.push(newTask);
    store.tasksByTeam[teamId] = tasks;
    saveStore(store);
    return newTask;
  },

  reorderTasks(teamId: string, taskIds: string[]) {
    const store = loadStore();
    const tasks = store.tasksByTeam[teamId] || [];
    taskIds.forEach((id, index) => {
      const task = tasks.find(t => t.id === id);
      if (task) {
        task.displayOrder = index + 1;
      }
    });
    saveStore(store);
  },

  getAdminDashboard(): {
    metrics: AdminDashboardMetrics;
    teams: TeamOverview[];
    recentActivity: GlobalActivityItem[];
    config: AppConfig;
  } {
    const store = loadStore();
    const totalTeams = store.teams.length;
    const totalTasks = store.teams.reduce((sum, t) => sum + t.totalTasks, 0);
    const completedTasks = store.teams.reduce((sum, t) => sum + t.completedTasks, 0);
    const pendingTasks = store.teams.reduce((sum, t) => sum + t.pendingTasks, 0);
    const overallCompletionPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 10000) / 100 : 0;
    const teamsWithAllTasksCompleted = store.teams.filter(t => t.completionPercentage === 100).length;
    const teamsWithPendingTasks = store.teams.filter(t => t.pendingTasks > 0).length;
    const teamsWithOverdueTasks = store.teams.filter(t => t.hasOverdueTasks).length;

    return {
      metrics: {
        totalTeams,
        teamsWithPendingTasks,
        teamsWithAllTasksCompleted,
        totalTasks,
        completedTasks,
        pendingTasks,
        overallCompletionPercentage,
        teamsWithOverdueTasks,
      },
      teams: store.teams,
      recentActivity: store.activity.slice(0, 8),
      config: store.config,
    };
  },

  getGlobalActivity(): GlobalActivityItem[] {
    const store = loadStore();
    return store.activity;
  },

  getSyncStatus(): any {
    return {
      status: 'healthy',
      lastSynced: new Date().toISOString(),
      totalTeams: loadStore().teams.length,
      mode: 'Mock Sandbox QA Store (Local Testing Active)',
    };
  },

  reconcileAll(): SyncResult[] {
    const store = loadStore();
    return store.teams.map(t => ({
      teamId: t.id,
      totalTasks: t.totalTasks,
      completedTasks: t.completedTasks,
      pendingTasks: t.pendingTasks,
      completionPercentage: t.completionPercentage,
      latestPendingTask: t.latestPendingTask,
      masterSynced: true,
    }));
  },

  getUsers(): UserProfile[] {
    const store = loadStore();
    return store.users;
  },

  createUser(userData: Partial<UserProfile>): UserProfile {
    const store = loadStore();
    const newUser: UserProfile = {
      id: `USR-${Date.now().toString().slice(-4)}`,
      name: userData.name || 'New User',
      email: (userData.email || '').toLowerCase().trim(),
      role: userData.role || 'viewer',
      teamId: userData.teamId || 'all',
      active: userData.active ?? true,
    };
    store.users.push(newUser);
    saveStore(store);
    return newUser;
  },

  updateUser(userId: string, updates: Partial<UserProfile>): UserProfile {
    const store = loadStore();
    const idx = store.users.findIndex(u => u.id === userId);
    if (idx === -1) throw new Error('User not found.');
    store.users[idx] = { ...store.users[idx], ...updates };
    saveStore(store);
    return store.users[idx];
  },

  deleteUser(userId: string) {
    const store = loadStore();
    store.users = store.users.filter(u => u.id !== userId);
    saveStore(store);
  },

  getConfig(): AppConfig {
    const store = loadStore();
    return store.config;
  },

  updateConfig(updates: Partial<AppConfig>): AppConfig {
    const store = loadStore();
    store.config = { ...store.config, ...updates };
    saveStore(store);
    return store.config;
  },

  saveTeam(teamData: Partial<TeamOverview>): TeamOverview {
    const store = loadStore();
    const existing = store.teams.find(t => t.id === teamData.id);
    if (existing && teamData.id) {
      return this.updateTeam(teamData.id, teamData);
    }
    return this.createTeam(teamData);
  },

  createTeam(teamData: any): TeamOverview {
    const store = loadStore();
    const targetId = teamData.id?.trim() || `team-${Date.now().toString().slice(-4)}`;

    // Check if team with this ID already exists
    const existingIdx = store.teams.findIndex(t => t.id === targetId);
    if (existingIdx !== -1) {
      store.teams[existingIdx] = {
        ...store.teams[existingIdx],
        ...teamData,
        lastUpdated: new Date().toISOString(),
      };
      saveStore(store);
      return store.teams[existingIdx];
    }

    const newTeam: TeamOverview = {
      id: targetId,
      name: teamData.name?.trim() || 'New Team',
      department: teamData.department?.trim() || 'General',
      headEmail: teamData.headEmail?.trim() || '',
      description: teamData.description?.trim() || '',
      spreadsheetId: teamData.spreadsheetId?.trim() || `MOCK-SHEET-${targetId.toUpperCase()}`,
      status: teamData.status || 'Active',
      totalTasks: 0,
      completedTasks: 0,
      pendingTasks: 0,
      completionPercentage: 0,
      latestPendingTask: 'All tasks completed.',
      lastUpdated: new Date().toISOString(),
    };
    store.teams.push(newTeam);
    if (!store.tasksByTeam[newTeam.id]) {
      store.tasksByTeam[newTeam.id] = [];
    }

    const currentUser = this.getCurrentUser();
    store.activity.unshift({
      id: `ACT-${Date.now().toString().slice(-4)}`,
      timestamp: new Date().toISOString(),
      teamId: newTeam.id,
      teamName: newTeam.name,
      taskId: 'TEAM_MGMT',
      user: currentUser?.email || 'admin.qa@company.com',
      action: `Created new team: ${newTeam.name} (${newTeam.id})`,
    });

    saveStore(store);
    return newTeam;
  },

  updateTeam(teamId: string, updates: Partial<TeamOverview>): TeamOverview {
    const store = loadStore();
    const idx = store.teams.findIndex(t => t.id === teamId);
    if (idx === -1) {
      return this.createTeam({ ...updates, id: teamId });
    }
    store.teams[idx] = {
      ...store.teams[idx],
      ...updates,
      lastUpdated: new Date().toISOString(),
    };
    saveStore(store);
    return store.teams[idx];
  },
};

