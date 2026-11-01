import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Sliders,
  Users,
  LogOut,
  ChevronDown,
  Layers,
  Shield,
  Activity,
  Menu,
  X,
  FlaskConical,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useConfig } from '../../hooks/useConfig';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { mockApi } from '../../services/mockApi';

export const Navbar: React.FC = () => {
  const { user, logout, isAdmin, isTeamHead, assignedTeamId, isDevMode, loginWithDevPersona } = useAuth();
  const { config } = useConfig();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const [testSwitcherOpen, setTestSwitcherOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const handleSwitchPersona = async (personaKey: string, targetPath: string) => {
    setTestSwitcherOpen(false);
    await loginWithDevPersona(personaKey);
    navigate(targetPath);
  };

  const navLinks = isAdmin
    ? [
        { label: 'Overview', path: '/admin', icon: LayoutDashboard },
        { label: 'Control Centre', path: '/admin/control-centre', icon: Sliders },
        { label: 'Users & Roles', path: '/admin/users', icon: Users },
      ]
    : [
        {
          label: 'My Team Dashboard',
          path: assignedTeamId ? `/teams/${assignedTeamId}` : '/login',
          icon: CheckSquare,
        },
      ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      {/* Announcement banner if set in Admin Control Centre */}
      {config.appSettings.announcementBanner && (
        <div className="bg-gradient-to-r from-primary-600 to-indigo-700 text-white text-xs py-1 px-4 text-center font-medium shadow-inner flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
          <span>{config.appSettings.announcementBanner}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link to={isAdmin ? '/admin' : (assignedTeamId ? `/teams/${assignedTeamId}` : '/')} className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary-600 to-indigo-700 flex items-center justify-center text-white font-bold text-lg shadow-sm group-hover:scale-105 transition-all">
              K
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-slate-900">KRITI</span>
                <span className="text-xs px-1.5 py-0.5 rounded font-semibold bg-primary-50 text-primary-700 uppercase">
                  Tracker
                </span>
              </div>
              <p className="hidden sm:block text-[10px] text-slate-500 font-medium truncate max-w-xs">
                {config.appSettings.companyName || 'Multi-Team Progress System'}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation links */}
          <nav className="hidden md:flex items-center space-x-1 pl-4 border-l border-slate-200">
            {navLinks.map(link => {
              const Icon = link.icon;
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-primary-50 text-primary-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User profile & actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
          {/* 🧪 Test Mode Persona Switcher (Dev Mode Only) */}
          {isDevMode && user && (
            <div className="relative">
              <button
                onClick={() => setTestSwitcherOpen(!testSwitcherOpen)}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100/80 text-amber-900 transition-all text-xs font-semibold shadow-xs"
                title="QA Test Persona Switcher (Dev Mode Only)"
              >
                <FlaskConical className="w-3.5 h-3.5 text-amber-600 animate-pulse flex-shrink-0" />
                <span className="hidden sm:inline">🧪 Persona:</span>
                <span className="truncate max-w-[55px] sm:max-w-[85px]">
                  {user.role === 'admin'
                    ? 'Admin'
                    : user.teamId === 'team-engineering'
                    ? 'Eng Head'
                    : user.teamId === 'team-operations'
                    ? 'Ops Head'
                    : user.role}
                </span>
                <ChevronDown className="w-3 h-3 text-amber-600 flex-shrink-0" />
              </button>

              {testSwitcherOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setTestSwitcherOpen(false)} />
                  <div className="absolute right-0 mt-2 w-64 rounded-xl bg-white shadow-xl border border-amber-200 py-2 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-3.5 py-1.5 border-b border-amber-100 bg-amber-50/50">
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1">
                        <FlaskConical className="w-3 h-3 text-amber-600" />
                        <span>QA Role Switcher (Zero-Leak)</span>
                      </p>
                    </div>

                    <div className="p-1.5 space-y-1">
                      <button
                        onClick={() => handleSwitchPersona('admin', '/admin')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors text-left"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">👑 Congress Director</div>
                          <div className="text-[10px] text-slate-400">admin.qa@company.com</div>
                        </div>
                        {user.role === 'admin' && (
                          <span className="text-[10px] font-bold text-emerald-600">Active</span>
                        )}
                      </button>

                      <button
                        onClick={() => handleSwitchPersona('team_head_eng', '/teams/team-scientific')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors text-left"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">🩺 Scientific Head</div>
                          <div className="text-[10px] text-slate-400">lead.eng@company.com</div>
                        </div>
                        {(user.teamId === 'team-scientific' || user.teamId === 'team-engineering') && (
                          <span className="text-[10px] font-bold text-emerald-600">Active</span>
                        )}
                      </button>

                      <button
                        onClick={() => handleSwitchPersona('team_head_ops', '/teams/team-cme-workshops')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors text-left"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">💉 CME Workshops</div>
                          <div className="text-[10px] text-slate-400">lead.ops@company.com</div>
                        </div>
                        {(user.teamId === 'team-cme-workshops' || user.teamId === 'team-operations') && (
                          <span className="text-[10px] font-bold text-emerald-600">Active</span>
                        )}
                      </button>

                      <button
                        onClick={() => handleSwitchPersona('viewer', '/admin')}
                        className="w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg hover:bg-slate-50 transition-colors text-left"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">👁️ Ethics Auditor</div>
                          <div className="text-[10px] text-slate-400">auditor.qa@company.com</div>
                        </div>
                        {user.role === 'viewer' && (
                          <span className="text-[10px] font-bold text-emerald-600">Active</span>
                        )}
                      </button>
                    </div>

                    <div className="mt-1 pt-1 border-t border-slate-100 px-1.5">
                      <button
                        onClick={() => {
                          setTestSwitcherOpen(false);
                          mockApi.resetStore();
                          window.location.reload();
                        }}
                        className="w-full flex items-center gap-2 px-3 py-1.5 text-[11px] text-slate-600 hover:bg-slate-50 rounded-lg text-left"
                      >
                        <RefreshCw className="w-3 h-3 text-slate-400" />
                        Reset Test Data Store
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-all text-left"
              >
                <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 text-slate-700 font-bold flex items-center justify-center text-xs">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block text-xs">
                  <div className="font-semibold text-slate-800 leading-tight">{user.name}</div>
                  <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{user.email}</div>
                </div>
                <Badge
                  variant={isAdmin ? 'danger' : 'info'}
                  className="hidden md:inline-flex text-[10px] uppercase font-bold py-0"
                >
                  {user.role.replace('_', ' ')}
                </Badge>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Dropdown Menu */}
              {userDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setUserDropdownOpen(false)} />
                  <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white shadow-hover border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-2">
                    <div className="px-4 py-2 border-b border-slate-100">
                      <p className="text-xs font-semibold text-slate-900">{user.name}</p>
                      <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase">Team:</span>
                        <span className="text-[11px] font-medium text-slate-700">
                          {user.teamId === 'all' ? 'All Teams (Global Admin)' : user.teamId}
                        </span>
                      </div>
                    </div>

                    {isAdmin && (
                      <Link
                        to="/admin/control-centre"
                        onClick={() => setUserDropdownOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-xs text-slate-700 hover:bg-slate-50"
                      >
                        <Sliders className="w-3.5 h-3.5 text-slate-500" />
                        Admin Control Centre
                      </Link>
                    )}

                    <button
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-rose-600 hover:bg-rose-50 text-left transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Sign Out
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Button size="sm" onClick={() => navigate('/login')}>
              Sign In
            </Button>
          )}

          {/* Mobile hamburger menu button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile nav drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-1">
          {navLinks.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      )}
    </header>
  );
};
