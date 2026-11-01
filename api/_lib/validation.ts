import type { TaskPriority, TaskStatus, UserRole, TeamStatus } from '../../src/types';

export function parseJsonBody(req: any): any {
  if (req.body) {
    if (typeof req.body === 'string') {
      try {
        return JSON.parse(req.body);
      } catch {
        throw new Error('Invalid JSON payload in request body.');
      }
    }
    return req.body;
  }
  return {};
}

export function validateTaskInput(body: any): {
  title: string;
  description: string;
  priority: TaskPriority;
  deadline: string;
  assignedTo?: string;
  category: string;
  isMandatory: boolean;
  remarks?: string;
  status?: TaskStatus;
} {
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
    throw new Error('Task title is required.');
  }

  const validPriorities: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];
  const priority = validPriorities.includes(body.priority) ? body.priority : 'Medium';

  return {
    title: body.title.trim(),
    description: typeof body.description === 'string' ? body.description.trim() : '',
    priority,
    deadline: typeof body.deadline === 'string' ? body.deadline.trim() : '',
    assignedTo: typeof body.assignedTo === 'string' ? body.assignedTo.trim() : undefined,
    category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : 'General',
    isMandatory: body.isMandatory !== false,
    remarks: typeof body.remarks === 'string' ? body.remarks.trim() : '',
    status: body.status === 'Completed' ? 'Completed' : 'Pending',
  };
}

export function validateStatusUpdate(body: any): {
  status: TaskStatus;
  remarks?: string;
} {
  if (!body.status || !['Pending', 'Completed'].includes(body.status)) {
    throw new Error('Invalid status. Must be "Pending" or "Completed".');
  }

  return {
    status: body.status,
    remarks: typeof body.remarks === 'string' ? body.remarks.trim() : undefined,
  };
}

export function validateUserInput(body: any): {
  name: string;
  email: string;
  role: UserRole;
  teamId: string;
  active: boolean;
} {
  if (!body.email || typeof body.email !== 'string' || !body.email.includes('@')) {
    throw new Error('A valid email address is required.');
  }

  const validRoles: UserRole[] = ['admin', 'team_head', 'viewer'];
  const role = validRoles.includes(body.role) ? body.role : 'team_head';

  return {
    name: typeof body.name === 'string' && body.name.trim() ? body.name.trim() : body.email.split('@')[0],
    email: body.email.trim().toLowerCase(),
    role,
    teamId: typeof body.teamId === 'string' && body.teamId.trim() ? body.teamId.trim() : 'team-01',
    active: body.active !== false,
  };
}

export function validateTeamInput(body: any): {
  id: string;
  name: string;
  spreadsheetId: string;
  department?: string;
  headEmail?: string;
  description?: string;
  status: TeamStatus;
} {
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
    throw new Error('Team name is required.');
  }

  const id = typeof body.id === 'string' && body.id.trim()
    ? body.id.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '-')
    : `team-${Date.now().toString().slice(-4)}`;

  const validStatuses: TeamStatus[] = ['Active', 'Deactivated', 'Archived'];
  const status = validStatuses.includes(body.status) ? body.status : 'Active';

  return {
    id,
    name: body.name.trim(),
    spreadsheetId: typeof body.spreadsheetId === 'string' ? body.spreadsheetId.trim() : '',
    department: typeof body.department === 'string' ? body.department.trim() : 'General',
    headEmail: typeof body.headEmail === 'string' ? body.headEmail.trim() : '',
    description: typeof body.description === 'string' ? body.description.trim() : '',
    status,
  };
}
