import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Shield,
  CheckCircle,
  XCircle,
  Edit2,
  Trash2,
  ArrowLeft,
  AlertCircle,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { api } from '../services/api';
import type { UserProfile, UserRole, TeamOverview } from '../types';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Modal } from '../components/ui/Modal';
import { Input, Select } from '../components/ui/Input';

export const UserManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [teams, setTeams] = useState<TeamOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>('team_head');
  const [teamId, setTeamId] = useState('team-01');
  const [active, setActive] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadUsersAndTeams = async () => {
    try {
      setIsLoading(true);
      const [usersData, teamsData] = await Promise.all([
        api.getUsers(),
        api.getTeams(),
      ]);
      setUsers(usersData);
      setTeams(teamsData);
    } catch (err: any) {
      console.error('Error loading users:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsersAndTeams();
  }, []);

  const handleOpenInvite = () => {
    setEditingUser(null);
    setName('');
    setEmail('');
    setRole('team_head');
    setTeamId(teams[0]?.id || 'team-01');
    setActive(true);
    setError(null);
    setModalOpen(true);
  };

  const handleOpenEdit = (u: UserProfile) => {
    setEditingUser(u);
    setName(u.name);
    setEmail(u.email);
    setRole(u.role);
    setTeamId(u.teamId);
    setActive(u.active);
    setError(null);
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !email.includes('@')) {
      setError('A valid email address is required.');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      await api.saveUser({
        id: editingUser ? editingUser.id : undefined,
        name: name.trim(),
        email: email.trim().toLowerCase(),
        role,
        teamId: role === 'admin' ? 'all' : teamId,
        active,
      });
      setModalOpen(false);
      setSuccessMsg(`User ${email.toLowerCase()} whitelisted successfully.`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadUsersAndTeams();
    } catch (err: any) {
      setError(err.message || 'Failed to save user.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleActive = async (targetUser: UserProfile) => {
    if (currentUser?.email.toLowerCase() === targetUser.email.toLowerCase()) {
      alert('You cannot deactivate your own account.');
      return;
    }

    try {
      await api.saveUser({
        id: targetUser.id,
        name: targetUser.name,
        email: targetUser.email,
        role: targetUser.role,
        teamId: targetUser.teamId,
        active: !targetUser.active,
      });
      loadUsersAndTeams();
    } catch (err: any) {
      alert(`Failed to update status: ${err.message}`);
    }
  };

  const handleRevoke = async (targetEmail: string) => {
    if (currentUser?.email.toLowerCase() === targetEmail.toLowerCase()) {
      alert('You cannot revoke your own administrator account.');
      return;
    }

    if (!confirm(`Are you sure you want to revoke whitelist authorization for ${targetEmail}? This user will immediately lose all system access.`)) {
      return;
    }

    try {
      await api.deleteUser(targetEmail);
      setSuccessMsg(`Revoked authorization for ${targetEmail}`);
      setTimeout(() => setSuccessMsg(null), 3000);
      loadUsersAndTeams();
    } catch (err: any) {
      alert(`Failed to revoke user: ${err.message}`);
    }
  };

  const roleOptions = [
    { value: 'admin', label: 'Super Admin (All Teams & Settings)' },
    { value: 'team_head', label: 'Team Head (Assigned Team Edit Access)' },
    { value: 'viewer', label: 'Viewer (Read-Only Assigned Team)' },
  ];

  const teamOptions = teams.map(t => ({ value: t.id, label: `${t.id} - ${t.name}` }));

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <button
            onClick={() => navigate('/admin')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Dashboard</span>
          </button>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Authorised User Registry & Whitelist
            </h1>
            <span className="text-xs px-2 py-0.5 font-bold uppercase rounded-md bg-emerald-100 text-emerald-800">
              Mandatory Whitelist
            </span>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Only emails registered below can access the application. Authorization and active status are verified on every request.
          </p>
        </div>

        <Button size="sm" onClick={handleOpenInvite} className="flex items-center gap-2">
          <UserPlus className="w-4 h-4" />
          <span>Add Authorised Email</span>
        </Button>
      </div>

      {successMsg && (
        <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-700 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-card overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[560px]">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">User & Email</th>
              <th className="py-3 px-4">Role</th>
              <th className="py-3 px-4">Assigned Team</th>
              <th className="py-3 px-4">Account Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => {
              const isSelf = currentUser?.email.toLowerCase() === u.email.toLowerCase();
              return (
                <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-slate-100 font-bold text-slate-700 flex items-center justify-center text-xs">
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-slate-900">{u.name}</span>
                          {isSelf && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-200 text-slate-700 font-bold">
                              You
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 block font-mono">{u.email}</span>
                      </div>
                    </div>
                  </td>

                  <td className="py-3.5 px-4">
                    <Badge variant={u.role === 'admin' ? 'danger' : 'info'} className="capitalize text-[10px]">
                      {u.role.replace('_', ' ')}
                    </Badge>
                  </td>

                  <td className="py-3.5 px-4 font-mono font-medium text-slate-700">
                    {u.teamId === 'all' ? 'All Teams' : u.teamId}
                  </td>

                  <td className="py-3.5 px-4">
                    <button
                      type="button"
                      disabled={isSelf}
                      onClick={() => handleToggleActive(u)}
                      className={`inline-flex items-center gap-1 text-xs font-semibold ${
                        isSelf ? 'cursor-default' : 'cursor-pointer hover:underline'
                      } ${u.active ? 'text-emerald-700' : 'text-rose-700'}`}
                      title={isSelf ? 'Cannot toggle self' : 'Click to toggle status'}
                    >
                      {u.active ? (
                        <>
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span>Deactivated</span>
                        </>
                      )}
                    </button>
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEdit(u)}
                        className="h-8 text-xs flex items-center gap-1"
                        title="Edit permissions"
                      >
                        <Edit2 className="w-3 h-3 text-slate-500" />
                        <span>Edit</span>
                      </Button>

                      {!isSelf && (
                        <button
                          type="button"
                          onClick={() => handleRevoke(u.email)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Revoke whitelist authorization"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editingUser ? 'Edit User Permissions' : 'Authorize New Email'}
        description="The authorized user will be permitted to sign in using their Google account."
      >
        <form onSubmit={handleSave} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Input
            label="Full Name"
            id="user-name"
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Alex Mercer"
          />

          <Input
            label="Google Account Email *"
            id="user-email"
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="alex@company.com"
            disabled={Boolean(editingUser)}
            required
          />

          <Select
            label="Role"
            id="user-role"
            value={role}
            onChange={e => setRole(e.target.value as UserRole)}
            options={roleOptions}
          />

          {role !== 'admin' && (
            <Select
              label="Assigned Team"
              id="user-team"
              value={teamId}
              onChange={e => setTeamId(e.target.value)}
              options={teamOptions}
            />
          )}

          <div className="flex items-center gap-2 pt-1">
            <input
              type="checkbox"
              id="user-active"
              checked={active}
              onChange={e => setActive(e.target.checked)}
              className="w-4 h-4 rounded text-primary-600 focus:ring-primary-500 border-slate-300"
            />
            <label htmlFor="user-active" className="text-xs font-semibold text-slate-700 cursor-pointer">
              Account Active (Whitelisted for system access)
            </label>
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button type="button" variant="outline" size="sm" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSaving}>
              {editingUser ? 'Save Permissions' : 'Whitelist User'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
