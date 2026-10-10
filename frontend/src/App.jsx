import { useEffect, useRef, useState } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { ArrowRight, BookOpen, ClipboardList, FileText, GraduationCap, Layers3, Menu, Pencil, Plus, Search, UserX, X } from 'lucide-react';
import apiRequest from './api.js';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { CourseOfferingRosterPage, ResourceDetailPage, ResourceFormPage, StudentAcademicRecordPage } from './ResourcePages.jsx';

const MANAGEMENT_ROLES = ['administrator', 'registrar', 'staff'];
const ACADEMIC_ROLES = [...MANAGEMENT_ROLES, 'instructor'];
const AUTHENTICATED_ROLES = [...ACADEMIC_ROLES, 'student'];
const STUDENT_PAGE_SIZE = 5;

function backgroundRouteState(location) {
  return { state: { backgroundLocation: location.state?.backgroundLocation || location } };
}

function refreshListRoute(navigate, location, notice) {
  navigate(location.pathname, {
    replace: true,
    state: { notice, refreshList: `${Date.now()}-${Math.random()}` },
  });
}

function useListRefresh(location, resetList) {
  const [refreshToken, setRefreshToken] = useState(0);
  const resetListRef = useRef(resetList);
  const handledRefreshRef = useRef(null);
  resetListRef.current = resetList;

  useEffect(() => {
    const refreshId = location.state?.refreshList;
    if (!refreshId || refreshId === handledRefreshRef.current) return;
    handledRefreshRef.current = refreshId;
    resetListRef.current();
    setRefreshToken((current) => current + 1);
  }, [location.key]);

  return refreshToken;
}

function ModuleHeading({ title, description, action }) {
  const location = useLocation();
  return (
    <>
      <header className="module-heading">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </header>
      {location.state?.notice && <div className="alert success" role="status">{location.state.notice}</div>}
    </>
  );
}

function CreateLink({ to, label }) {
  const location = useLocation();
  return (
    <NavLink className="primary-btn" to={to} {...backgroundRouteState(location)}><Plus size={16} aria-hidden="true" /><span>{label}</span></NavLink>
  );
}

function CollectionControls({
  id,
  searchValue,
  onSearchValueChange,
  onSearch,
  sortValue,
  sortOptions,
  onSortChange,
  filters = [],
  onFilterChange,
  onReset,
}) {
  const searchHandler = useRef(onSearch);
  const skipInitialSearch = useRef(true);
  searchHandler.current = onSearch;

  useEffect(() => {
    if (skipInitialSearch.current) {
      skipInitialSearch.current = false;
      return undefined;
    }
    const timer = window.setTimeout(() => searchHandler.current(), 300);
    return () => window.clearTimeout(timer);
  }, [searchValue]);

  return (
    <section className="collection-tools" aria-label={`${id} list controls`}>
      <form className="search-row" onSubmit={(event) => { event.preventDefault(); onSearch(); }}>
        <div className="field search-field">
          <label htmlFor={`${id}-search`}>Search {id}</label>
          <input id={`${id}-search`} value={searchValue} onChange={(event) => onSearchValueChange(event.target.value)} placeholder={`Search ${id.toLowerCase()}`} />
        </div>
        <button className="primary-btn" type="submit"><Search size={15} aria-hidden="true" /><span>Search</span></button>
        <label className="field sort-field" htmlFor={`${id}-sort`}>
          <span>Sort</span>
          <select id={`${id}-sort`} value={sortValue} onChange={(event) => onSortChange(event.target.value)}>
            {sortOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      </form>
      {filters.length > 0 && (
        <div className="filter-row">
          {filters.map((filter) => (
            <label className="field" htmlFor={`${id}-${filter.key}`} key={filter.key}>
              <span>{filter.label}</span>
              <select id={`${id}-${filter.key}`} value={filter.value} onChange={(event) => onFilterChange(filter.key, event.target.value)}>
                <option value="">{filter.allLabel || `All ${filter.label.toLowerCase()}`}</option>
                {filter.options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </label>
          ))}
          <button className="ghost-btn" type="button" onClick={onReset}>Clear filters</button>
        </div>
      )}
    </section>
  );
}

function PaginationControls({ meta, page, onPageChange, loading }) {
  const total = meta?.total || 0;
  const perPage = meta?.per_page || 10;
  const lastPage = meta?.last_page || 1;
  const firstRecord = total ? (page - 1) * perPage + 1 : 0;
  const lastRecord = Math.min(page * perPage, total);

  return (
    <div className="pagination-bar" aria-label="List pagination">
      <span>Showing {firstRecord}-{lastRecord} of {total} · Page {page} of {lastPage}</span>
      <div className="action-row">
        <button className="ghost-btn" type="button" onClick={() => onPageChange(Math.max(1, page - 1))} disabled={loading || page <= 1}>Previous</button>
        <button className="ghost-btn" type="button" onClick={() => onPageChange(Math.min(lastPage, page + 1))} disabled={loading || page >= lastPage}>Next</button>
      </div>
    </div>
  );
}

function StatusLabel({ children }) {
  return <span className={`status-label status-${String(children).toLowerCase()}`}>{children}</span>;
}

function LandingPage() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  const areas = [
    { icon: GraduationCap, number: '01', title: 'Student records', description: 'Profiles, programs, and academic standing.' },
    { icon: BookOpen, number: '02', title: 'Academic catalog', description: 'Courses, terms, sections, and schedules.' },
    { icon: ClipboardList, number: '03', title: 'Course activity', description: 'Enrollment, class rosters, and grades.' },
    { icon: Layers3, number: '04', title: 'Academic history', description: 'A term-by-term view of each student journey.' },
  ];

  return (
    <main className="landing-page">
      <header className="landing-header">
        <NavLink className="landing-brand" to="/" aria-label="Student Information Management home">
          <span className="landing-brand-mark">SIM</span>
          <span>Student Information<br />Management</span>
        </NavLink>
        <nav className="landing-nav" aria-label="Main navigation">
          <a href="#academic-record">The system</a>
          <NavLink className="landing-signin" to="/login">Sign in <ArrowRight size={16} aria-hidden="true" /></NavLink>
        </nav>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <img
          className="landing-hero-image"
          src="https://images.unsplash.com/photo-1562774053-701939374585?auto=format&fit=crop&w=2400&q=85"
          alt="University campus building framed by trees"
        />
        <div className="landing-hero-shade" aria-hidden="true" />
        <div className="landing-hero-content">
          <p className="landing-eyebrow">ACADEMIC SERVICES · STUDENT INFORMATION SYSTEM</p>
          <h1 id="landing-title">Every part of<br />the academic journey.</h1>
          <p className="landing-intro">Student profiles, course activity, and academic records brought together in one connected system.</p>
          <NavLink className="landing-primary" to="/login">Access the portal <ArrowRight size={18} aria-hidden="true" /></NavLink>
          <p className="landing-note">Secure access for administrators, registrars, instructors, and students.</p>
        </div>
        <div className="landing-hero-index" aria-hidden="true"><span>01</span><span className="landing-index-rule" /><span>04</span></div>
      </section>

      <section className="landing-academic" id="academic-record" aria-labelledby="academic-title">
        <div className="landing-section-intro">
          <p className="landing-eyebrow">A CONNECTED RECORD</p>
          <h2 id="academic-title">From enrollment<br />to academic history.</h2>
        </div>
        <div className="landing-area-list">
          {areas.map(({ icon: Icon, number, title, description }) => (
            <article className="landing-area" key={number}>
              <span className="landing-area-number">{number}</span>
              <Icon className="landing-area-icon" size={22} strokeWidth={1.7} aria-hidden="true" />
              <div>
                <h3>{title}</h3>
                <p>{description}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="landing-footer">
        <span>Student Information Management System</span>
        <span>Academic records, clearly connected.</span>
        <NavLink to="/login">Enter the portal <ArrowRight size={15} aria-hidden="true" /></NavLink>
      </footer>
    </main>
  );
}

function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('password');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-shell">
      <div className="login-card">
        <div className="brand">Student Information</div>
        <p className="subtitle">Management portal</p>

        <form onSubmit={handleSubmit} className="form-grid">
          {error && <div className="alert error">{error}</div>}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>

          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </div>

          <button className="primary-btn" type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardLayout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isManager = MANAGEMENT_ROLES.includes(user?.role);
  const navigation = [
    { label: 'Dashboard', path: '/dashboard', roles: AUTHENTICATED_ROLES },
    { label: 'Students', path: '/students', roles: [...MANAGEMENT_ROLES, 'student'] },
    { label: 'Programs', path: '/programs', roles: MANAGEMENT_ROLES },
    { label: 'Courses', path: '/courses', roles: MANAGEMENT_ROLES },
    { label: 'Academic Terms', path: '/academic-terms', roles: MANAGEMENT_ROLES },
    { label: 'Course Offerings', path: '/course-offerings', roles: ACADEMIC_ROLES },
    { label: 'Enrollments', path: '/enrollments', roles: AUTHENTICATED_ROLES },
    { label: 'Grades', path: '/grades', roles: AUTHENTICATED_ROLES },
    { label: 'Profile', path: '/profile', roles: AUTHENTICATED_ROLES },
  ].filter((item) => item.roles.includes(user?.role));
  const navigationGroups = [
    { label: 'Workspace', paths: ['/dashboard', '/students'] },
    { label: 'Academic management', paths: ['/programs', '/courses', '/academic-terms', '/course-offerings', '/enrollments', '/grades'] },
    { label: 'Account', paths: ['/profile'] },
  ].map((group) => ({ ...group, items: navigation.filter((item) => group.paths.includes(item.path)) })).filter((group) => group.items.length > 0);
  const workspaceTitle = isManager ? 'Academic Operations' : `${user?.role || 'Account'} Workspace`;
  const workspaceDescription = isManager
    ? 'Student records, academic data, and course activity.'
    : 'Your role-based student information workspace.';

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/login');
    }
  };

  useEffect(() => {
    if (!drawerOpen) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [drawerOpen]);

  return (
    <div className="app-shell">
      {drawerOpen && <button className="sidebar-backdrop" type="button" aria-label="Close navigation drawer" onClick={() => setDrawerOpen(false)} />}
      <aside className={`sidebar ${drawerOpen ? 'sidebar-open' : ''}`} id="app-sidebar">
        <NavLink className="sidebar-brand" to="/dashboard">
          <span className="sidebar-brand-mark">SIM</span>
          <span className="sidebar-brand-copy"><strong>Student Information</strong><small>Management System</small></span>
        </NavLink>
        <div className="sidebar-context">
          <span className="sidebar-context-label">SIGNED IN AS</span>
          <strong>{user?.name || user?.email}</strong>
          <span className="sidebar-role">{user?.role}</span>
        </div>
        <nav className="nav-list" aria-label="Workspace navigation">
          {navigationGroups.map((group) => (
            <div className="nav-group" key={group.label}>
              <h2 className="nav-group-heading">{group.label}</h2>
              {group.items.map((item) => (
                <NavLink key={item.path} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`} to={item.path} onClick={() => setDrawerOpen(false)}>
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span>ACADEMIC SERVICES</span>
          <span>STUDENT INFORMATION SYSTEM</span>
          <button className="sidebar-logout" type="button" onClick={handleLogout}>Log out</button>
        </div>
      </aside>

      <main className="content">
        <div className="topbar">
          <div className="topbar-heading">
            <p className="topbar-kicker">ACADEMIC SERVICES</p>
            <h1>{workspaceTitle}</h1>
            <p className="topbar-description">{workspaceDescription}</p>
          </div>
          <button
            className="mobile-nav-toggle"
            type="button"
            aria-label={drawerOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-controls="app-sidebar"
            aria-expanded={drawerOpen}
            onClick={() => setDrawerOpen((open) => !open)}
          >
            {drawerOpen ? <X size={21} aria-hidden="true" /> : <Menu size={21} aria-hidden="true" />}
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}

function DashboardPage() {
  const { user } = useAuth();
  const isManager = MANAGEMENT_ROLES.includes(user?.role);
  const isInstructor = user?.role === 'instructor';
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const fetchStats = async () => {
      setLoading(true);
      setError('');
      const resources = isManager
        ? [
            ['students', '/students?page=1&per_page=1'],
            ['programs', '/programs?page=1&per_page=1'],
            ['courses', '/courses?page=1&per_page=1'],
            ['terms', '/academic-terms?page=1&per_page=1'],
            ['offerings', '/course-offerings?page=1&per_page=1'],
            ['enrollments', '/enrollments?page=1&per_page=1'],
            ['grades', '/grades?page=1&per_page=1'],
          ]
        : isInstructor
          ? [['offerings', '/course-offerings?page=1&per_page=1'], ['enrollments', '/enrollments?page=1&per_page=1'], ['grades', '/grades?page=1&per_page=1']]
          : [['enrollments', '/enrollments?page=1&per_page=1'], ['grades', '/grades?page=1&per_page=1']];

      const results = await Promise.allSettled(resources.map(([, path]) => apiRequest(path)));
      if (!active) return;
      const nextStats = {};
      results.forEach((result, index) => {
        if (result.status === 'fulfilled') nextStats[resources[index][0]] = result.value.meta?.total || 0;
      });
      setStats(nextStats);
      const failureCount = results.filter((result) => result.status === 'rejected').length;
      if (failureCount > 0) {
        setError(failureCount === results.length
          ? 'Dashboard data is unavailable. Check the API connection and retry.'
          : 'Some dashboard summaries could not be loaded. Retry to refresh them.');
      }
      setLoading(false);
    };

    fetchStats();
    return () => { active = false; };
  }, [isInstructor, isManager]);

  const cards = isManager
    ? [['students', 'Total Students'], ['programs', 'Programs'], ['courses', 'Courses'], ['terms', 'Academic Terms'], ['offerings', 'Offerings'], ['enrollments', 'Enrollments'], ['grades', 'Grades']]
    : isInstructor
      ? [['offerings', 'Assigned Offerings'], ['enrollments', 'Enrolled Students'], ['grades', 'Recorded Grades']]
      : [['enrollments', 'My Enrollments'], ['grades', 'My Grades']];
  const quickLinks = isManager
    ? [
        ['Students', '/students', 'Find, filter, and maintain student records'],
        ['Programs', '/programs', 'Manage academic programs'],
        ['Courses', '/courses', 'Review the course catalog'],
        ['Academic Terms', '/academic-terms', 'Manage academic years and semesters'],
        ['Course Offerings', '/course-offerings', 'Schedule sections and manage rosters'],
        ['Enrollments', '/enrollments', 'Register students for sections'],
        ['Grades', '/grades', 'Record and review academic results'],
      ]
    : isInstructor
      ? [['Course Offerings', '/course-offerings', 'Review assigned sections and rosters'], ['Grades', '/grades', 'Manage grades for assigned enrollments']]
      : [['Students', '/students', 'View your profile and academic record'], ['Enrollments', '/enrollments', 'Review your course registrations'], ['Grades', '/grades', 'Review your recorded grades']];

  return (
    <>
      {error && <div className="alert error" role="alert">{error} <button className="ghost-btn" type="button" onClick={() => window.location.reload()}>Retry</button></div>}
      <div className="card-grid">
        {cards.map(([key, label]) => <div className="stat-card" key={key}><div className="label">{label}</div><div className="value">{loading ? '...' : stats[key] ?? 0}</div></div>)}
      </div>
      <section className="quick-access" aria-labelledby="quick-access-title">
        <div className="section-heading">
          <div>
            <h2 id="quick-access-title">Quick access</h2>
            <p>Continue with the work available to your role.</p>
          </div>
        </div>
        <div className="quick-link-grid">
          {quickLinks.map(([label, path, description]) => (
            <NavLink className="quick-link" to={path} key={path}>
              <span><strong>{label}</strong><small>{description}</small></span>
              <ArrowRight size={17} aria-hidden="true" />
            </NavLink>
          ))}
        </div>
      </section>
    </>
  );
}

function ProgramPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-updated_at');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [form, setForm] = useState({ code: '', name: '', description: '', status: 'active' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const refreshToken = useListRefresh(location, () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setSort('-updated_at');
    setPage(1);
  });

  const resetForm = () => {
    setForm({ code: '', name: '', description: '', status: 'active' });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const loadPrograms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '10', page: String(page), sort });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const response = await apiRequest(`/programs?${params.toString()}`);
      setPrograms(response.data || []);
      setMeta(response.meta || {});
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPrograms();
  }, [page, search, sort, status, refreshToken]);

  const applySearch = () => {
    setPage(1);
    setSearch(searchInput.trim());
  };

  const resetControls = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setSort('-updated_at');
    setPage(1);
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await apiRequest(`/programs/${editingId}`, {
          method: 'PATCH',
          body: form,
        });
        setMessage('Program updated successfully.');
      } else {
        await apiRequest('/programs', {
          method: 'POST',
          body: form,
        });
        setMessage('Program created successfully.');
      }

      setMessageType('success');
      resetForm();
      await loadPrograms();
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  const handleEdit = (program) => {
    navigate(`/programs/${program.id}/edit`, backgroundRouteState(location));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this program?')) {
      return;
    }

    try {
      await apiRequest(`/programs/${id}`, { method: 'DELETE' });
      refreshListRoute(navigate, location, 'Program deactivated successfully.');
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  return (
    <>
      <ModuleHeading
        title="Programs"
        description={`${meta.total || 0} academic programs`}
        action={<CreateLink to="/programs/new" label="Add program" />}
      />
      {message && <div className={`alert ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</div>}
      {(isFormOpen || editingId) && <div className="form-panel management-form">
        <h3>{editingId ? 'Edit Program' : 'Add Program'}</h3>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid-2">
            <div className="field">
              <label>Code</label>
              <input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <div className="field">
            <label>Name</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>

          <div className="action-row">
            <button className="primary-btn" type="submit">{editingId ? 'Update Program' : 'Save Program'}</button>
            {editingId && (
              <button type="button" className="ghost-btn" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>
      </div>}

      <CollectionControls
        id="programs"
        searchValue={searchInput}
        onSearchValueChange={setSearchInput}
        onSearch={applySearch}
        sortValue={sort}
        sortOptions={[{ value: '-updated_at', label: 'Recently updated' }, { value: 'name', label: 'Name, A-Z' }, { value: '-name', label: 'Name, Z-A' }, { value: 'code', label: 'Code' }]}
        onSortChange={(value) => { setSort(value); setPage(1); }}
        filters={[{ key: 'status', label: 'Status', value: status, options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] }]}
        onFilterChange={(key, value) => { if (key === 'status') setStatus(value); setPage(1); }}
        onReset={resetControls}
      />

      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="4" className="loading-box">Loading...</td></tr>
            ) : programs.length ? (
              programs.map((program) => (
                <tr key={program.id}>
                  <td>{program.code}</td>
                  <td>{program.name}</td>
                  <td><StatusLabel>{program.status}</StatusLabel></td>
                  <td>
                    <div className="action-row">
                      <NavLink className="ghost-btn" to={`/programs/${program.id}`} {...backgroundRouteState(location)}>View</NavLink>
                      <button type="button" className="secondary-btn" onClick={() => handleEdit(program)}>Edit</button>
                      <button type="button" className="danger-btn" onClick={() => handleDelete(program.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="4" className="empty-state">No programs found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls meta={meta} page={page} onPageChange={setPage} loading={loading} />
    </>
  );
}

function StudentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canManage = MANAGEMENT_ROLES.includes(user?.role);
  const [students, setStudents] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [recordLoading, setRecordLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('-updated_at');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ current_page: 1, last_page: 1, total: 0, per_page: STUDENT_PAGE_SIZE });
  const [fieldErrors, setFieldErrors] = useState({});
  const [filters, setFilters] = useState({ programId: '', yearLevel: '', status: '' });
  const [form, setForm] = useState({
    student_number: '',
    first_name: '',
    last_name: '',
    email: '',
    program_id: '',
    year_level: '1',
    status: 'active',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const refreshToken = useListRefresh(location, () => {
    setSearchInput('');
    setSearch('');
    setSort('-updated_at');
    setPage(1);
    setFilters({ programId: '', yearLevel: '', status: '' });
  });

  const resetForm = () => {
    setForm({
      student_number: '',
      first_name: '',
      last_name: '',
      email: '',
      program_id: programs[0]?.id || '',
      year_level: '1',
      status: 'active',
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: String(STUDENT_PAGE_SIZE), page: String(page), sort });
      if (search) params.set('search', search);
      if (filters.programId) params.set('program_id', filters.programId);
      if (filters.yearLevel) params.set('year_level', filters.yearLevel);
      if (filters.status) params.set('status', filters.status);

      const [studentResponse, programResponse] = await Promise.all([
        apiRequest(`/students?${params.toString()}`),
        apiRequest('/programs?per_page=100&sort=name'),
      ]);
      setStudents(studentResponse.data || []);
      setMeta(studentResponse.meta || { current_page: 1, last_page: 1, total: 0, per_page: STUDENT_PAGE_SIZE });
      setPrograms(programResponse.data || []);
      if (!form.program_id && programResponse.data?.[0]) {
        setForm((prev) => ({ ...prev, program_id: String(programResponse.data[0].id) }));
      }
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filters.programId, filters.yearLevel, filters.status, page, search, sort, refreshToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const handleSearch = (event) => {
    event.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    try {
      const payload = {
        ...form,
        program_id: Number(form.program_id),
        year_level: Number(form.year_level),
      };

      if (editingId) {
        await apiRequest(`/students/${editingId}`, {
          method: 'PATCH',
          body: payload,
        });
        setMessage('Student updated successfully.');
      } else {
        await apiRequest('/students', {
          method: 'POST',
          body: payload,
        });
        setMessage('Student created successfully.');
      }

      setMessageType('success');
      resetForm();
      await loadData();
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
      setFieldErrors(error.errors || {});
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (student) => {
    navigate(`/students/${student.id}/edit`, backgroundRouteState(location));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this student?')) return;

    try {
      await apiRequest(`/students/${id}`, { method: 'DELETE' });
      refreshListRoute(navigate, location, 'Student deactivated successfully.');
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  const viewAcademicRecord = async (student) => {
    navigate(`/students/${student.id}/academic-record`, backgroundRouteState(location));
  };

  return (
    <>
      <ModuleHeading
        title="Students"
        description={canManage ? 'Search, filter, and maintain student records.' : 'Your profile and academic record.'}
        action={canManage && <CreateLink to="/students/new" label="Add student" />}
      />
      {message && <div className={`alert ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</div>}
      {canManage && (isFormOpen || editingId) && <div className="form-panel management-form">
        <h3>{editingId ? 'Edit Student' : 'Add Student'}</h3>

        <form onSubmit={submit} className="form-grid">
          <div className="form-grid-2">
            <div className="field">
              <label>Student Number</label>
              <input value={form.student_number} onChange={(e) => setForm({ ...form, student_number: e.target.value })} required />
              {fieldErrors.student_number?.map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label>Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              {fieldErrors.email?.map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label>First Name</label>
              <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} required />
              {fieldErrors.first_name?.map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label>Last Name</label>
              <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} required />
              {fieldErrors.last_name?.map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label>Program</label>
              <select value={form.program_id} onChange={(e) => setForm({ ...form, program_id: e.target.value })} required>
                <option value="">Select program</option>
                {programs.map((program) => (
                  <option key={program.id} value={program.id}>{program.name}</option>
                ))}
              </select>
              {fieldErrors.program_id?.map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label>Year Level</label>
              <select value={form.year_level} onChange={(e) => setForm({ ...form, year_level: e.target.value })}>
                {[1, 2, 3, 4, 5, 6].map((level) => (
                  <option key={level} value={level}>{level}</option>
                ))}
              </select>
              <span className="field-help">Program lengths vary; approved extensions may reach year 6.</span>
              {fieldErrors.year_level?.map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="graduated">Graduated</option>
              </select>
            </div>
          </div>

          <div className="action-row">
            <button className="primary-btn" type="submit" disabled={submitting}>{submitting ? 'Saving...' : editingId ? 'Update Student' : 'Save Student'}</button>
            {editingId && (
              <button type="button" className="ghost-btn" onClick={resetForm}>Cancel</button>
            )}
          </div>
        </form>
      </div>}

      <section className="collection-tools" aria-label="Student list controls">
        <form className="search-row" onSubmit={handleSearch}>
          <div className="field search-field">
            <label htmlFor="student-search">Search students</label>
            <input id="student-search" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Name, email, or student number" />
          </div>
          <button className="primary-btn" type="submit"><Search size={15} aria-hidden="true" /><span>Search</span></button>
          <label className="field sort-field" htmlFor="student-sort">
            <span>Sort by</span>
            <select id="student-sort" value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}>
              <option value="-updated_at">Recently updated</option>
              <option value="last_name">Last name, A-Z</option>
              <option value="-last_name">Last name, Z-A</option>
              <option value="student_number">Student number</option>
              <option value="-created_at">Recently added</option>
            </select>
          </label>
        </form>
        {canManage && <div className="filter-row">
          <div className="field">
            <label htmlFor="program-filter">Program</label>
            <select id="program-filter" value={filters.programId} onChange={(e) => { setFilters({ ...filters, programId: e.target.value }); setPage(1); }}>
              <option value="">All Programs</option>
              {programs.map((program) => (
                <option key={program.id} value={program.id}>{program.name}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="year-filter">Year Level</label>
            <select id="year-filter" value={filters.yearLevel} onChange={(e) => { setFilters({ ...filters, yearLevel: e.target.value }); setPage(1); }}>
              <option value="">All Levels</option>
              {[1, 2, 3, 4, 5, 6].map((level) => (
                <option key={level} value={level}>{level}</option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="status-filter">Status</label>
            <select id="status-filter" value={filters.status} onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}>
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="graduated">Graduated</option>
            </select>
          </div>
        </div>}
      </section>

      <div className="table-panel student-table">
        <table>
          <thead>
            <tr>
              <th>Student #</th>
              <th>Name</th>
              <th>Program</th>
              <th>Year</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="loading-box">Loading...</td></tr>
            ) : students.length ? (
              students.map((student) => (
                <tr key={student.id}>
                  <td>{student.student_number}</td>
                  <td>{student.first_name} {student.last_name}</td>
                  <td>{student.program?.name || '-'}</td>
                  <td>{student.year_level}</td>
                  <td>{student.status}</td>
                  <td>
                    <div className="action-row">
                      {canManage && (
                        <button type="button" className="icon-action" onClick={() => handleEdit(student)} title="Edit student" aria-label={`Edit ${student.first_name} ${student.last_name}`}>
                          <Pencil size={15} aria-hidden="true" />
                        </button>
                      )}
                      <NavLink className="icon-action" to={`/students/${student.id}`} {...backgroundRouteState(location)} title="View student details" aria-label={`View details for ${student.first_name} ${student.last_name}`}><Search size={15} aria-hidden="true" /></NavLink>
                      <button type="button" className="icon-action" onClick={() => viewAcademicRecord(student)} title="View academic record" aria-label={`View academic record for ${student.first_name} ${student.last_name}`}>
                        <FileText size={15} aria-hidden="true" />
                      </button>
                      {canManage && (
                        <button type="button" className="icon-action danger" onClick={() => handleDelete(student.id)} title="Deactivate student" aria-label={`Deactivate ${student.first_name} ${student.last_name}`}>
                          <UserX size={15} aria-hidden="true" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="empty-state">No students found.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <PaginationControls meta={meta} page={page} onPageChange={setPage} loading={loading} />

      {selectedRecord && (
        <div className="form-panel" style={{ marginTop: 24 }}>
          <h3>Academic Record for {selectedRecord.student?.first_name} {selectedRecord.student?.last_name}</h3>
          {selectedRecord.terms?.length ? (
            selectedRecord.terms.map((termGroup) => (
              <div key={termGroup.term.id} style={{ marginBottom: 16 }}>
                <h4>{termGroup.term.academic_year} - {termGroup.term.semester}</h4>
                <div className="table-panel">
                  <table>
                    <thead>
                      <tr>
                        <th>Course</th>
                        <th>Section</th>
                        <th>Midterm</th>
                        <th>Final</th>
                        <th>Remarks</th>
                      </tr>
                    </thead>
                    <tbody>
                      {termGroup.enrollments.map((enrollment) => (
                        <tr key={enrollment.id}>
                          <td>{enrollment.course_offering?.course?.course_title || '-'}</td>
                          <td>{enrollment.course_offering?.section || '-'}</td>
                          <td>{enrollment.grade?.midterm_grade ?? '-'}</td>
                          <td>{enrollment.grade?.final_grade ?? '-'}</td>
                          <td>{enrollment.grade?.remarks || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="empty-state">No academic record available.</div>
          )}
        </div>
      )}
    </>
  );
}

function CoursePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-updated_at');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [form, setForm] = useState({ course_code: '', course_title: '', description: '', units: 3, status: 'active' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const refreshToken = useListRefresh(location, () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setSort('-updated_at');
    setPage(1);
  });

  const resetForm = () => {
    setForm({ course_code: '', course_title: '', description: '', units: 3, status: 'active' });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const loadCourses = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '10', page: String(page), sort });
      if (search) params.set('search', search);
      if (status) params.set('status', status);
      const response = await apiRequest(`/courses?${params.toString()}`);
      setCourses(response.data || []);
      setMeta(response.meta || {});
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [page, search, sort, status, refreshToken]);

  const resetControls = () => {
    setSearchInput('');
    setSearch('');
    setStatus('');
    setSort('-updated_at');
    setPage(1);
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = { ...form, units: Number(form.units) };
      if (editingId) {
        await apiRequest(`/courses/${editingId}`, { method: 'PATCH', body: payload });
        setMessage('Course updated successfully.');
      } else {
        await apiRequest('/courses', { method: 'POST', body: payload });
        setMessage('Course created successfully.');
      }
      setMessageType('success');
      resetForm();
      await loadCourses();
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  const handleEdit = (course) => {
    navigate(`/courses/${course.id}/edit`, backgroundRouteState(location));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this course?')) return;
    try {
      await apiRequest(`/courses/${id}`, { method: 'DELETE' });
      refreshListRoute(navigate, location, 'Course deactivated successfully.');
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  return (
    <>
      <ModuleHeading
        title="Courses"
        description={`${meta.total || 0} courses in the catalog`}
        action={<CreateLink to="/courses/new" label="Add course" />}
      />
      {message && <div className={`alert ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</div>}
      {(isFormOpen || editingId) && <div className="form-panel management-form">
        <h3>{editingId ? 'Edit Course' : 'Add Course'}</h3>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid-2">
            <div className="field">
              <label>Course Code</label>
              <input value={form.course_code} onChange={(e) => setForm({ ...form, course_code: e.target.value })} required />
            </div>
            <div className="field">
              <label>Units</label>
              <input type="number" min="1" max="12" value={form.units} onChange={(e) => setForm({ ...form, units: e.target.value })} required />
            </div>
          </div>
          <div className="field">
            <label>Course Title</label>
            <input value={form.course_title} onChange={(e) => setForm({ ...form, course_title: e.target.value })} required />
          </div>
          <div className="field">
            <label>Description</label>
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="action-row">
            <button className="primary-btn" type="submit">{editingId ? 'Update Course' : 'Save Course'}</button>
            {editingId && <button type="button" className="ghost-btn" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>}

      <CollectionControls
        id="courses"
        searchValue={searchInput}
        onSearchValueChange={setSearchInput}
        onSearch={() => { setPage(1); setSearch(searchInput.trim()); }}
        sortValue={sort}
        sortOptions={[{ value: '-updated_at', label: 'Recently updated' }, { value: 'course_title', label: 'Title, A-Z' }, { value: '-course_title', label: 'Title, Z-A' }, { value: 'course_code', label: 'Course code' }, { value: 'units', label: 'Units' }]}
        onSortChange={(value) => { setSort(value); setPage(1); }}
        filters={[{ key: 'status', label: 'Status', value: status, options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }] }]}
        onFilterChange={(key, value) => { if (key === 'status') setStatus(value); setPage(1); }}
        onReset={resetControls}
      />

      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Code</th>
              <th>Title</th>
              <th>Units</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="5" className="loading-box">Loading...</td></tr>
            ) : courses.length ? (
              courses.map((course) => (
                <tr key={course.id}>
                  <td>{course.course_code}</td>
                  <td>{course.course_title}</td>
                  <td>{course.units}</td>
                  <td><StatusLabel>{course.status}</StatusLabel></td>
                  <td>
                    <div className="action-row">
                      <NavLink className="ghost-btn" to={`/courses/${course.id}`} {...backgroundRouteState(location)}>View</NavLink>
                      <button type="button" className="secondary-btn" onClick={() => handleEdit(course)}>Edit</button>
                      <button type="button" className="danger-btn" onClick={() => handleDelete(course.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="5" className="empty-state">No courses found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls meta={meta} page={page} onPageChange={setPage} loading={loading} />
    </>
  );
}

function AcademicTermPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [academicYear, setAcademicYear] = useState('');
  const [semester, setSemester] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('-updated_at');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [form, setForm] = useState({ academic_year: '2026-2027', semester: '1st Semester', start_date: '2026-08-01', end_date: '2026-12-20', status: 'active' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const refreshToken = useListRefresh(location, () => {
    setSearchInput('');
    setSearch('');
    setAcademicYear('');
    setSemester('');
    setStatus('');
    setSort('-updated_at');
    setPage(1);
  });

  const loadTerms = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '10', page: String(page), sort });
      if (search) params.set('search', search);
      if (academicYear) params.set('academic_year', academicYear);
      if (semester) params.set('semester', semester);
      if (status) params.set('status', status);
      const response = await apiRequest(`/academic-terms?${params.toString()}`);
      setTerms(response.data || []);
      setMeta(response.meta || {});
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTerms();
  }, [page, search, academicYear, semester, status, sort, refreshToken]);

  const resetControls = () => {
    setSearchInput('');
    setSearch('');
    setAcademicYear('');
    setSemester('');
    setStatus('');
    setSort('-updated_at');
    setPage(1);
  };

  const resetForm = () => {
    setForm({ academic_year: '2026-2027', semester: '1st Semester', start_date: '2026-08-01', end_date: '2026-12-20', status: 'active' });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      if (editingId) {
        await apiRequest(`/academic-terms/${editingId}`, { method: 'PATCH', body: form });
        setMessage('Academic term updated successfully.');
      } else {
        await apiRequest('/academic-terms', { method: 'POST', body: form });
        setMessage('Academic term created successfully.');
      }
      setMessageType('success');
      resetForm();
      await loadTerms();
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  const handleEdit = (term) => {
    navigate(`/academic-terms/${term.id}/edit`, backgroundRouteState(location));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Deactivate this academic term?')) return;
    try {
      await apiRequest(`/academic-terms/${id}`, { method: 'DELETE' });
      refreshListRoute(navigate, location, 'Academic term deactivated successfully.');
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  return (
    <>
      <ModuleHeading
        title="Academic Terms"
        description={`${meta.total || 0} academic terms`}
        action={<CreateLink to="/academic-terms/new" label="Add term" />}
      />
      {message && <div className={`alert ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</div>}
      {(isFormOpen || editingId) && <div className="form-panel management-form">
        <h3>{editingId ? 'Edit Academic Term' : 'Add Academic Term'}</h3>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid-2">
            <div className="field">
              <label>Academic Year</label>
              <input value={form.academic_year} onChange={(e) => setForm({ ...form, academic_year: e.target.value })} required />
            </div>
            <div className="field">
              <label>Semester</label>
              <input value={form.semester} onChange={(e) => setForm({ ...form, semester: e.target.value })} required />
            </div>
            <div className="field">
              <label>Start Date</label>
              <input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} required />
            </div>
            <div className="field">
              <label>End Date</label>
              <input type="date" value={form.end_date} onChange={(e) => setForm({ ...form, end_date: e.target.value })} required />
            </div>
          </div>
          <div className="field">
            <label>Status</label>
            <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="closed">Closed</option>
            </select>
          </div>
          <div className="action-row">
            <button className="primary-btn" type="submit">{editingId ? 'Update Term' : 'Save Term'}</button>
            {editingId && <button type="button" className="ghost-btn" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>}

      <CollectionControls
        id="academic-terms"
        searchValue={searchInput}
        onSearchValueChange={setSearchInput}
        onSearch={() => { setPage(1); setSearch(searchInput.trim()); }}
        sortValue={sort}
        sortOptions={[{ value: '-updated_at', label: 'Recently updated' }, { value: 'academic_year', label: 'Academic year' }, { value: '-academic_year', label: 'Newest year' }, { value: 'semester', label: 'Semester' }, { value: 'status', label: 'Status' }]}
        onSortChange={(value) => { setSort(value); setPage(1); }}
        filters={[
          { key: 'academic_year', label: 'Academic year', value: academicYear, options: Array.from(new Set(terms.map((term) => term.academic_year))).map((value) => ({ value, label: value })) },
          { key: 'semester', label: 'Semester', value: semester, options: Array.from(new Set(terms.map((term) => term.semester))).map((value) => ({ value, label: value })) },
          { key: 'status', label: 'Status', value: status, options: [{ value: 'active', label: 'Active' }, { value: 'inactive', label: 'Inactive' }, { value: 'closed', label: 'Closed' }] },
        ]}
        onFilterChange={(key, value) => { if (key === 'academic_year') setAcademicYear(value); if (key === 'semester') setSemester(value); if (key === 'status') setStatus(value); setPage(1); }}
        onReset={resetControls}
      />

      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Academic Year</th>
              <th>Semester</th>
              <th>Start</th>
              <th>End</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="loading-box">Loading...</td></tr>
            ) : terms.length ? (
              terms.map((term) => (
                <tr key={term.id}>
                  <td>{term.academic_year}</td>
                  <td>{term.semester}</td>
                  <td>{new Date(term.start_date).toLocaleDateString()}</td>
                  <td>{new Date(term.end_date).toLocaleDateString()}</td>
                  <td><StatusLabel>{term.status}</StatusLabel></td>
                  <td>
                    <div className="action-row">
                      <NavLink className="ghost-btn" to={`/academic-terms/${term.id}`} {...backgroundRouteState(location)}>View</NavLink>
                      <button type="button" className="secondary-btn" onClick={() => handleEdit(term)}>Edit</button>
                      <button type="button" className="danger-btn" onClick={() => handleDelete(term.id)}>Delete</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="empty-state">No academic terms found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls meta={meta} page={page} onPageChange={setPage} loading={loading} />
    </>
  );
}

function CourseOfferingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canManage = MANAGEMENT_ROLES.includes(user?.role);
  const [offerings, setOfferings] = useState([]);
  const [courses, setCourses] = useState([]);
  const [terms, setTerms] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [selectedRoster, setSelectedRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courseFilter, setCourseFilter] = useState('');
  const [termFilter, setTermFilter] = useState('');
  const [sort, setSort] = useState('-updated_at');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [form, setForm] = useState({
    course_id: '',
    academic_term_id: '',
    instructor_id: '',
    section: 'A',
    schedule: '',
    room: '',
    capacity: 40,
    status: 'open',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const refreshToken = useListRefresh(location, () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setCourseFilter('');
    setTermFilter('');
    setSort('-updated_at');
    setPage(1);
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '10', page: String(page), sort });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (courseFilter) params.set('course_id', courseFilter);
      if (termFilter) params.set('academic_term_id', termFilter);
      const [offeringResponse, courseResponse, termResponse] = await Promise.all([
        apiRequest(`/course-offerings?${params.toString()}`),
        apiRequest('/courses?per_page=100&sort=course_title'),
        apiRequest('/academic-terms?per_page=100&sort=academic_year'),
      ]);
      setOfferings(offeringResponse.data || []);
      setMeta(offeringResponse.meta || {});
      setCourses(courseResponse.data || []);
      setTerms(termResponse.data || []);
      const availableInstructors = new Map();
      (offeringResponse.data || []).forEach((offering) => {
        if (offering.instructor) availableInstructors.set(offering.instructor.id, offering.instructor);
      });
      setInstructors(Array.from(availableInstructors.values()));
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, search, sort, statusFilter, courseFilter, termFilter, refreshToken]);

  const resetControls = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setCourseFilter('');
    setTermFilter('');
    setSort('-updated_at');
    setPage(1);
  };

  useEffect(() => {
    if (!editingId) {
      setForm((prev) => ({
        ...prev,
        course_id: prev.course_id || (courses[0]?.id ? String(courses[0].id) : ''),
        academic_term_id: prev.academic_term_id || (terms[0]?.id ? String(terms[0].id) : ''),
        instructor_id: prev.instructor_id || (instructors[0]?.id ? String(instructors[0].id) : ''),
      }));
    }
  }, [courses, terms, instructors, editingId]);

  const resetForm = () => {
    setForm({
      course_id: courses[0]?.id ? String(courses[0].id) : '',
      academic_term_id: terms[0]?.id ? String(terms[0].id) : '',
      instructor_id: instructors[0]?.id ? String(instructors[0].id) : '',
      section: 'A',
      schedule: '',
      room: '',
      capacity: 40,
      status: 'open',
    });
    setEditingId(null);
    setIsFormOpen(false);
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        course_id: Number(form.course_id),
        academic_term_id: Number(form.academic_term_id),
        instructor_id: Number(form.instructor_id),
        capacity: Number(form.capacity),
      };

      if (editingId) {
        await apiRequest(`/course-offerings/${editingId}`, { method: 'PATCH', body: payload });
        setMessage('Course offering updated successfully.');
      } else {
        await apiRequest('/course-offerings', { method: 'POST', body: payload });
        setMessage('Course offering created successfully.');
      }
      setMessageType('success');
      resetForm();
      await loadData();
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  const handleEdit = (offering) => {
    navigate(`/course-offerings/${offering.id}/edit`, backgroundRouteState(location));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Cancel this course offering?')) return;
    try {
      await apiRequest(`/course-offerings/${id}`, { method: 'DELETE' });
      refreshListRoute(navigate, location, 'Course offering cancelled successfully.');
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  const viewRoster = async (offering) => {
    navigate(`/course-offerings/${offering.id}/roster`, backgroundRouteState(location));
  };

  return (
    <>
      <ModuleHeading
        title="Course Offerings"
        description={`${meta.total || 0} sections · review schedules and rosters`}
        action={canManage && <CreateLink to="/course-offerings/new" label="Add offering" />}
      />
      {message && <div className={`alert ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</div>}
      {canManage && (isFormOpen || editingId) && <div className="form-panel management-form">
        <h3>{editingId ? 'Edit Course Offering' : 'Add Course Offering'}</h3>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid-2">
            <div className="field">
              <label>Course</label>
              <select value={form.course_id} onChange={(e) => setForm({ ...form, course_id: e.target.value })} required>
                <option value="">Select course</option>
                {courses.map((course) => <option key={course.id} value={course.id}>{course.course_title}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Academic Term</label>
              <select value={form.academic_term_id} onChange={(e) => setForm({ ...form, academic_term_id: e.target.value })} required>
                <option value="">Select term</option>
                {terms.map((term) => <option key={term.id} value={term.id}>{term.academic_year} - {term.semester}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Instructor</label>
              <select value={form.instructor_id} onChange={(e) => setForm({ ...form, instructor_id: e.target.value })} required>
                {instructors.map((instructor) => <option key={instructor.id} value={instructor.id}>{instructor.name}</option>)}
              </select>
              {!instructors.length && <span className="field-help">No instructors were returned by the API yet.</span>}
            </div>
            <div className="field">
              <label>Section</label>
              <input value={form.section} onChange={(e) => setForm({ ...form, section: e.target.value })} required />
            </div>
            <div className="field">
              <label>Schedule</label>
              <input value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })} />
            </div>
            <div className="field">
              <label>Room</label>
              <input value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
            </div>
            <div className="field">
              <label>Capacity</label>
              <input type="number" min="1" max="500" value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} required />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="open">Open</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          <div className="action-row">
            <button className="primary-btn" type="submit">{editingId ? 'Update Offering' : 'Save Offering'}</button>
            {editingId && <button type="button" className="ghost-btn" onClick={resetForm}>Cancel</button>}
          </div>
        </form>
      </div>}

      <CollectionControls
        id="course-offerings"
        searchValue={searchInput}
        onSearchValueChange={setSearchInput}
        onSearch={() => { setPage(1); setSearch(searchInput.trim()); }}
        sortValue={sort}
        sortOptions={[{ value: '-updated_at', label: 'Recently updated' }, { value: 'section', label: 'Section' }, { value: 'status', label: 'Status' }]}
        onSortChange={(value) => { setSort(value); setPage(1); }}
        filters={[
          { key: 'course_id', label: 'Course', value: courseFilter, options: courses.map((course) => ({ value: String(course.id), label: `${course.course_code} · ${course.course_title}` })) },
          { key: 'academic_term_id', label: 'Term', value: termFilter, options: terms.map((term) => ({ value: String(term.id), label: `${term.academic_year} · ${term.semester}` })) },
          { key: 'status', label: 'Status', value: statusFilter, options: [{ value: 'open', label: 'Open' }, { value: 'closed', label: 'Closed' }, { value: 'cancelled', label: 'Cancelled' }] },
        ]}
        onFilterChange={(key, value) => { if (key === 'course_id') setCourseFilter(value); if (key === 'academic_term_id') setTermFilter(value); if (key === 'status') setStatusFilter(value); setPage(1); }}
        onReset={resetControls}
      />

      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Course</th>
              <th>Term</th>
              <th>Section</th>
              <th>Instructor</th>
              <th>Capacity</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="7" className="loading-box">Loading...</td></tr>
            ) : offerings.length ? (
              offerings.map((offering) => (
                <tr key={offering.id}>
                  <td>{offering.course?.course_title || '-'}</td>
                  <td>{offering.academic_term?.academic_year || '-'} / {offering.academic_term?.semester || '-'}</td>
                  <td>{offering.section}</td>
                  <td>{offering.instructor?.name || 'Instructor'}</td>
                  <td>{offering.capacity}</td>
                  <td><StatusLabel>{offering.status}</StatusLabel></td>
                  <td>
                    <div className="action-row">
                      <NavLink className="ghost-btn" to={`/course-offerings/${offering.id}`} {...backgroundRouteState(location)}>View</NavLink>
                      <button type="button" className="ghost-btn" onClick={() => viewRoster(offering)}>Roster</button>
                      {canManage && <button type="button" className="secondary-btn" onClick={() => handleEdit(offering)}>Edit</button>}
                      {canManage && <button type="button" className="danger-btn" onClick={() => handleDelete(offering.id)}>Cancel offering</button>}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="7" className="empty-state">No course offerings found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls meta={meta} page={page} onPageChange={setPage} loading={loading} />
      {selectedRoster && (
        <section className="table-panel roster-panel" aria-label="Course offering roster">
          <div className="section-heading">
            <h3>{selectedRoster.offering.course?.course_title} · Section {selectedRoster.offering.section}</h3>
            <button type="button" className="ghost-btn" onClick={() => setSelectedRoster(null)}>Close roster</button>
          </div>
          {selectedRoster.students.length ? (
            <table>
              <thead><tr><th>Student number</th><th>Student</th><th>Enrollment status</th></tr></thead>
              <tbody>{selectedRoster.students.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td>{enrollment.student?.student_number}</td>
                  <td>{enrollment.student?.first_name} {enrollment.student?.last_name}</td>
                  <td>{enrollment.status}</td>
                </tr>
              ))}</tbody>
            </table>
          ) : <p className="empty-state">No students are enrolled in this offering.</p>}
        </section>
      )}
    </>
  );
}

function EnrollmentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canManage = MANAGEMENT_ROLES.includes(user?.role);
  const [enrollments, setEnrollments] = useState([]);
  const [students, setStudents] = useState([]);
  const [offerings, setOfferings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');
  const [offeringFilter, setOfferingFilter] = useState('');
  const [sort, setSort] = useState('-updated_at');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [form, setForm] = useState({
    student_id: '',
    course_offering_id: '',
    enrollment_date: new Date().toISOString().slice(0, 10),
    status: 'enrolled',
  });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const refreshToken = useListRefresh(location, () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setStudentFilter('');
    setOfferingFilter('');
    setSort('-updated_at');
    setPage(1);
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '10', page: String(page), sort });
      if (search) params.set('search', search);
      if (statusFilter) params.set('status', statusFilter);
      if (studentFilter) params.set('student_id', studentFilter);
      if (offeringFilter) params.set('course_offering_id', offeringFilter);
      const enrollResponse = await apiRequest(`/enrollments?${params.toString()}`);
      setEnrollments(enrollResponse.data || []);
      setMeta(enrollResponse.meta || {});
      if (canManage) {
        const [studentResponse, offeringResponse] = await Promise.all([
          apiRequest('/students?per_page=100&sort=last_name'),
          apiRequest('/course-offerings?per_page=100&sort=section'),
        ]);
        setStudents(studentResponse.data || []);
        setOfferings(offeringResponse.data || []);
      } else if (user?.role === 'instructor') {
        const offeringResponse = await apiRequest('/course-offerings?per_page=100&sort=section');
        setOfferings(offeringResponse.data || []);
      }
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, search, sort, statusFilter, studentFilter, offeringFilter, refreshToken]);

  const resetControls = () => {
    setSearchInput('');
    setSearch('');
    setStatusFilter('');
    setStudentFilter('');
    setOfferingFilter('');
    setSort('-updated_at');
    setPage(1);
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        student_id: Number(form.student_id),
        course_offering_id: Number(form.course_offering_id),
      };
      await apiRequest('/enrollments', { method: 'POST', body: payload });
      setMessage('Enrollment created successfully.');
      setMessageType('success');
      setForm({ student_id: '', course_offering_id: '', enrollment_date: new Date().toISOString().slice(0, 10), status: 'enrolled' });
      setIsFormOpen(false);
      await loadData();
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  const handleUpdate = async (id, status) => {
    try {
      await apiRequest(`/enrollments/${id}`, { method: 'PATCH', body: { status } });
      refreshListRoute(navigate, location, 'Enrollment updated successfully.');
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  return (
    <>
      <ModuleHeading
        title="Enrollments"
        description={`${meta.total || 0} registrations · review course and student status`}
        action={canManage && <CreateLink to="/enrollments/new" label="Enroll student" />}
      />
      {message && <div className={`alert ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</div>}
      {canManage && isFormOpen && <div className="form-panel management-form">
        <h3>Enroll Student</h3>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid-2">
            <div className="field">
              <label>Student</label>
              <select value={form.student_id} onChange={(e) => setForm({ ...form, student_id: e.target.value })} required>
                <option value="">Select student</option>
                {students.map((student) => <option key={student.id} value={student.id}>{student.first_name} {student.last_name}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Course Offering</label>
              <select value={form.course_offering_id} onChange={(e) => setForm({ ...form, course_offering_id: e.target.value })} required>
                <option value="">Select offering</option>
                {offerings.map((offering) => <option key={offering.id} value={offering.id}>{offering.course?.course_title || '-'} / {offering.section}</option>)}
              </select>
            </div>
            <div className="field">
              <label>Enrollment Date</label>
              <input type="date" value={form.enrollment_date} onChange={(e) => setForm({ ...form, enrollment_date: e.target.value })} />
            </div>
            <div className="field">
              <label>Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                <option value="enrolled">Enrolled</option>
                <option value="dropped">Dropped</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </div>
          <button className="primary-btn" type="submit">Save Enrollment</button>
        </form>
      </div>}

      <CollectionControls
        id="enrollments"
        searchValue={searchInput}
        onSearchValueChange={setSearchInput}
        onSearch={() => { setPage(1); setSearch(searchInput.trim()); }}
        sortValue={sort}
        sortOptions={[{ value: '-updated_at', label: 'Recently updated' }, { value: 'enrollment_date', label: 'Oldest enrollment' }, { value: '-enrollment_date', label: 'Newest enrollment' }, { value: 'status', label: 'Status' }]}
        onSortChange={(value) => { setSort(value); setPage(1); }}
        filters={[
          ...(canManage ? [{ key: 'student_id', label: 'Student', value: studentFilter, options: students.map((student) => ({ value: String(student.id), label: `${student.student_number} · ${student.first_name} ${student.last_name}` })) }] : []),
          ...(user?.role !== 'student' ? [{ key: 'course_offering_id', label: 'Offering', value: offeringFilter, options: offerings.map((offering) => ({ value: String(offering.id), label: `${offering.course?.course_code || ''} · ${offering.section}` })) }] : []),
          { key: 'status', label: 'Status', value: statusFilter, options: [{ value: 'enrolled', label: 'Enrolled' }, { value: 'completed', label: 'Completed' }, { value: 'dropped', label: 'Dropped' }] },
        ]}
        onFilterChange={(key, value) => { if (key === 'student_id') setStudentFilter(value); if (key === 'course_offering_id') setOfferingFilter(value); if (key === 'status') setStatusFilter(value); setPage(1); }}
        onReset={resetControls}
      />

      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Section</th>
              <th>Date</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="loading-box">Loading...</td></tr>
            ) : enrollments.length ? (
              enrollments.map((enrollment) => (
                <tr key={enrollment.id}>
                  <td>{enrollment.student?.first_name} {enrollment.student?.last_name}</td>
                  <td>{enrollment.course_offering?.course?.course_title || '-'}</td>
                  <td>{enrollment.course_offering?.section || '-'}</td>
                  <td>{new Date(enrollment.enrollment_date).toLocaleDateString()}</td>
                  <td><StatusLabel>{enrollment.status}</StatusLabel></td>
                  <td>
                    <div className="action-row">
                      <NavLink className="ghost-btn" to={`/enrollments/${enrollment.id}`} {...backgroundRouteState(location)}>View</NavLink>
                      {canManage && <NavLink className="secondary-btn" to={`/enrollments/${enrollment.id}/edit`} {...backgroundRouteState(location)}>Update</NavLink>}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="empty-state">No enrollments found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls meta={meta} page={page} onPageChange={setPage} loading={loading} />
    </>
  );
}

function GradePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const canManage = MANAGEMENT_ROLES.includes(user?.role);
  const canGrade = canManage || user?.role === 'instructor';
  const [grades, setGrades] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGradeId, setEditingGradeId] = useState(null);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [enrollmentFilter, setEnrollmentFilter] = useState('');
  const [sort, setSort] = useState('-updated_at');
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({});
  const [form, setForm] = useState({ enrollment_id: '', midterm_grade: '', final_grade: '', remarks: '' });
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const refreshToken = useListRefresh(location, () => {
    setSearchInput('');
    setSearch('');
    setEnrollmentFilter('');
    setSort('-updated_at');
    setPage(1);
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ per_page: '10', page: String(page), sort });
      if (search) params.set('search', search);
      if (enrollmentFilter) params.set('enrollment_id', enrollmentFilter);
      const [gradeResponse, enrollmentResponse] = await Promise.all([
        apiRequest(`/grades?${params.toString()}`),
        apiRequest('/enrollments?per_page=100&sort=enrollment_date'),
      ]);
      setGrades(gradeResponse.data || []);
      setMeta(gradeResponse.meta || {});
      setEnrollments(enrollmentResponse.data || []);
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [page, search, sort, enrollmentFilter, refreshToken]);

  const resetControls = () => {
    setSearchInput('');
    setSearch('');
    setEnrollmentFilter('');
    setSort('-updated_at');
    setPage(1);
  };

  const submit = async (event) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        enrollment_id: Number(form.enrollment_id),
        midterm_grade: form.midterm_grade === '' ? null : Number(form.midterm_grade),
        final_grade: form.final_grade === '' ? null : Number(form.final_grade),
      };
      if (editingGradeId) {
        delete payload.enrollment_id;
        await apiRequest(`/grades/${editingGradeId}`, { method: 'PATCH', body: payload });
        setMessage('Grade updated successfully.');
      } else {
        await apiRequest('/grades', { method: 'POST', body: payload });
        setMessage('Grade recorded successfully.');
      }
      setMessageType('success');
      setEditingGradeId(null);
      setIsFormOpen(false);
      setForm({ enrollment_id: '', midterm_grade: '', final_grade: '', remarks: '' });
      await loadData();
    } catch (error) {
      setMessage(error.message);
      setMessageType('error');
    }
  };

  const handleEdit = (grade) => {
    navigate(`/grades/${grade.id}/edit`, backgroundRouteState(location));
  };

  return (
    <>
      <ModuleHeading
        title="Grades"
        description={`${meta.total || 0} grade records · authorized users can record or update results`}
        action={canGrade && <CreateLink to="/grades/new" label="Record grade" />}
      />
      {message && <div className={`alert ${messageType}`} role={messageType === 'error' ? 'alert' : 'status'}>{message}</div>}
      {canGrade && (isFormOpen || editingGradeId) && <div className="form-panel management-form">
        <h3>{editingGradeId ? 'Update Grade' : 'Record Grade'}</h3>
        <form onSubmit={submit} className="form-grid">
          <div className="form-grid-2">
            <div className="field">
              <label>Enrollment</label>
              <select value={form.enrollment_id} onChange={(e) => setForm({ ...form, enrollment_id: e.target.value })} required>
                <option value="">Select enrollment</option>
                {enrollments.filter((enrollment) => !editingGradeId || enrollment.id === Number(form.enrollment_id)).map((enrollment) => (
                  <option key={enrollment.id} value={enrollment.id}>
                    {enrollment.student?.first_name} {enrollment.student?.last_name} - {enrollment.course_offering?.course?.course_title || '-'}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label>Midterm Grade</label>
              <input type="number" min="0" max="100" value={form.midterm_grade} onChange={(e) => setForm({ ...form, midterm_grade: e.target.value })} />
            </div>
            <div className="field">
              <label>Final Grade</label>
              <input type="number" min="0" max="100" value={form.final_grade} onChange={(e) => setForm({ ...form, final_grade: e.target.value })} />
            </div>
            <div className="field">
              <label>Remarks</label>
              <input value={form.remarks} onChange={(e) => setForm({ ...form, remarks: e.target.value })} />
            </div>
          </div>
          <div className="action-row">
            <button className="primary-btn" type="submit">{editingGradeId ? 'Update Grade' : 'Save Grade'}</button>
            {editingGradeId && <button type="button" className="ghost-btn" onClick={() => { setEditingGradeId(null); setIsFormOpen(false); setForm({ enrollment_id: '', midterm_grade: '', final_grade: '', remarks: '' }); }}>Cancel</button>}
          </div>
        </form>
      </div>}

      <CollectionControls
        id="grades"
        searchValue={searchInput}
        onSearchValueChange={setSearchInput}
        onSearch={() => { setPage(1); setSearch(searchInput.trim()); }}
        sortValue={sort}
        sortOptions={[{ value: '-updated_at', label: 'Recently updated' }, { value: '-created_at', label: 'Newest created' }, { value: 'created_at', label: 'Oldest created' }]}
        onSortChange={(value) => { setSort(value); setPage(1); }}
        filters={[{ key: 'enrollment_id', label: 'Enrollment', value: enrollmentFilter, options: enrollments.map((enrollment) => ({ value: String(enrollment.id), label: `${enrollment.student?.student_number || enrollment.student?.id} · ${enrollment.course_offering?.course?.course_code || 'Course'} ${enrollment.course_offering?.section || ''}` })) }]}
        onFilterChange={(key, value) => { if (key === 'enrollment_id') setEnrollmentFilter(value); setPage(1); }}
        onReset={resetControls}
      />

      <div className="table-panel">
        <table>
          <thead>
            <tr>
              <th>Student</th>
              <th>Course</th>
              <th>Midterm</th>
              <th>Final</th>
              <th>Remarks</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" className="loading-box">Loading...</td></tr>
            ) : grades.length ? (
              grades.map((grade) => (
                <tr key={grade.id}>
                  <td>{grade.enrollment?.student?.first_name} {grade.enrollment?.student?.last_name}</td>
                  <td>{grade.enrollment?.course_offering?.course?.course_title || '-'}</td>
                  <td>{grade.midterm_grade ?? '-'}</td>
                  <td>{grade.final_grade ?? '-'}</td>
                  <td>{grade.remarks || '-'}</td>
                  <td>
                    <div className="action-row">
                      <NavLink className="ghost-btn" to={`/grades/${grade.id}`} {...backgroundRouteState(location)}>View</NavLink>
                      {canGrade && <button type="button" className="secondary-btn" onClick={() => handleEdit(grade)}>Edit grade</button>}
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" className="empty-state">No grades found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <PaginationControls meta={meta} page={page} onPageChange={setPage} loading={loading} />
    </>
  );
}

function ProfilePage() {
  const { user } = useAuth();

  return (
    <div className="form-panel">
      <h3>Profile</h3>
      <div className="form-grid">
        <div className="field">
          <label>Name</label>
          <input value={user?.name || ''} readOnly />
        </div>
        <div className="field">
          <label>Email</label>
          <input value={user?.email || ''} readOnly />
        </div>
        <div className="field">
          <label>Role</label>
          <input value={user?.role || ''} readOnly />
        </div>
        <div className="field">
          <label>Status</label>
          <input value={user?.status || ''} readOnly />
        </div>
      </div>
    </div>
  );
}

function ProtectedScreen({ children, allowedRoles = AUTHENTICATED_ROLES }) {
  return (
    <ProtectedRoute allowedRoles={allowedRoles}>
      {children}
    </ProtectedRoute>
  );
}

function ProtectedPage({ children, allowedRoles = AUTHENTICATED_ROLES }) {
  return (
    <ProtectedScreen allowedRoles={allowedRoles}>
      <DashboardLayout>{children}</DashboardLayout>
    </ProtectedScreen>
  );
}

function ModalRoute({ children }) {
  const navigate = useNavigate();
  return (
    <div className="workflow-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) navigate(-1);
    }}>
      <section className="workflow-dialog" role="dialog" aria-modal="true" aria-label="Record workflow">
        <button className="workflow-dialog-close" type="button" onClick={() => navigate(-1)} aria-label="Close dialog">
          <X size={20} aria-hidden="true" />
        </button>
        {children}
      </section>
    </div>
  );
}

function NotFoundPage() {
  return (
    <main className="state-page">
      <h1>Page not found</h1>
      <p>This route is not part of the Student Information System.</p>
      <NavLink className="secondary-btn" to="/dashboard">Return to dashboard</NavLink>
    </main>
  );
}

function AppContent() {
  const location = useLocation();
  const backgroundLocation = location.state?.backgroundLocation;
  return (
    <>
      <Routes location={backgroundLocation || location}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<ProtectedPage><DashboardPage /></ProtectedPage>} />
        <Route path="/students" element={<ProtectedPage allowedRoles={[...MANAGEMENT_ROLES, 'student']}><StudentPage /></ProtectedPage>} />
        <Route path="/students/new" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="students" /></ProtectedPage>} />
        <Route path="/students/:id/edit" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="students" /></ProtectedPage>} />
        <Route path="/students/:id/academic-record" element={<ProtectedPage allowedRoles={[...MANAGEMENT_ROLES, 'student']}><StudentAcademicRecordPage /></ProtectedPage>} />
        <Route path="/students/:id" element={<ProtectedPage allowedRoles={[...MANAGEMENT_ROLES, 'student']}><ResourceDetailPage resource="students" /></ProtectedPage>} />
        <Route path="/programs" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ProgramPage /></ProtectedPage>} />
        <Route path="/programs/new" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="programs" /></ProtectedPage>} />
        <Route path="/programs/:id/edit" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="programs" /></ProtectedPage>} />
        <Route path="/programs/:id" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceDetailPage resource="programs" /></ProtectedPage>} />
        <Route path="/courses" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><CoursePage /></ProtectedPage>} />
        <Route path="/courses/new" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="courses" /></ProtectedPage>} />
        <Route path="/courses/:id/edit" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="courses" /></ProtectedPage>} />
        <Route path="/courses/:id" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceDetailPage resource="courses" /></ProtectedPage>} />
        <Route path="/academic-terms" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><AcademicTermPage /></ProtectedPage>} />
        <Route path="/academic-terms/new" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="academic-terms" /></ProtectedPage>} />
        <Route path="/academic-terms/:id/edit" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="academic-terms" /></ProtectedPage>} />
        <Route path="/academic-terms/:id" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceDetailPage resource="academic-terms" /></ProtectedPage>} />
        <Route path="/course-offerings" element={<ProtectedPage allowedRoles={ACADEMIC_ROLES}><CourseOfferingPage /></ProtectedPage>} />
        <Route path="/course-offerings/new" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="course-offerings" /></ProtectedPage>} />
        <Route path="/course-offerings/:id/edit" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="course-offerings" /></ProtectedPage>} />
        <Route path="/course-offerings/:id/roster" element={<ProtectedPage allowedRoles={ACADEMIC_ROLES}><CourseOfferingRosterPage /></ProtectedPage>} />
        <Route path="/course-offerings/:id" element={<ProtectedPage allowedRoles={ACADEMIC_ROLES}><ResourceDetailPage resource="course-offerings" /></ProtectedPage>} />
        <Route path="/enrollments" element={<ProtectedPage><EnrollmentPage /></ProtectedPage>} />
        <Route path="/enrollments/new" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="enrollments" /></ProtectedPage>} />
        <Route path="/enrollments/:id/edit" element={<ProtectedPage allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="enrollments" /></ProtectedPage>} />
        <Route path="/enrollments/:id" element={<ProtectedPage><ResourceDetailPage resource="enrollments" /></ProtectedPage>} />
        <Route path="/grades" element={<ProtectedPage><GradePage /></ProtectedPage>} />
        <Route path="/grades/new" element={<ProtectedPage allowedRoles={ACADEMIC_ROLES}><ResourceFormPage resource="grades" /></ProtectedPage>} />
        <Route path="/grades/:id/edit" element={<ProtectedPage allowedRoles={ACADEMIC_ROLES}><ResourceFormPage resource="grades" /></ProtectedPage>} />
        <Route path="/grades/:id" element={<ProtectedPage><ResourceDetailPage resource="grades" /></ProtectedPage>} />
        <Route path="/profile" element={<ProtectedPage><ProfilePage /></ProtectedPage>} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
      {backgroundLocation && (
        <Routes location={location}>
          <Route path="/students/new" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="students" /></ProtectedScreen></ModalRoute>} />
          <Route path="/students/:id/edit" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="students" /></ProtectedScreen></ModalRoute>} />
          <Route path="/students/:id/academic-record" element={<ModalRoute><ProtectedScreen allowedRoles={[...MANAGEMENT_ROLES, 'student']}><StudentAcademicRecordPage /></ProtectedScreen></ModalRoute>} />
          <Route path="/students/:id" element={<ModalRoute><ProtectedScreen allowedRoles={[...MANAGEMENT_ROLES, 'student']}><ResourceDetailPage resource="students" /></ProtectedScreen></ModalRoute>} />
          <Route path="/programs/new" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="programs" /></ProtectedScreen></ModalRoute>} />
          <Route path="/programs/:id/edit" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="programs" /></ProtectedScreen></ModalRoute>} />
          <Route path="/programs/:id" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceDetailPage resource="programs" /></ProtectedScreen></ModalRoute>} />
          <Route path="/courses/new" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="courses" /></ProtectedScreen></ModalRoute>} />
          <Route path="/courses/:id/edit" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="courses" /></ProtectedScreen></ModalRoute>} />
          <Route path="/courses/:id" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceDetailPage resource="courses" /></ProtectedScreen></ModalRoute>} />
          <Route path="/academic-terms/new" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="academic-terms" /></ProtectedScreen></ModalRoute>} />
          <Route path="/academic-terms/:id/edit" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="academic-terms" /></ProtectedScreen></ModalRoute>} />
          <Route path="/academic-terms/:id" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceDetailPage resource="academic-terms" /></ProtectedScreen></ModalRoute>} />
          <Route path="/course-offerings/new" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="course-offerings" /></ProtectedScreen></ModalRoute>} />
          <Route path="/course-offerings/:id/edit" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="course-offerings" /></ProtectedScreen></ModalRoute>} />
          <Route path="/course-offerings/:id/roster" element={<ModalRoute><ProtectedScreen allowedRoles={ACADEMIC_ROLES}><CourseOfferingRosterPage /></ProtectedScreen></ModalRoute>} />
          <Route path="/course-offerings/:id" element={<ModalRoute><ProtectedScreen allowedRoles={ACADEMIC_ROLES}><ResourceDetailPage resource="course-offerings" /></ProtectedScreen></ModalRoute>} />
          <Route path="/enrollments/new" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="enrollments" /></ProtectedScreen></ModalRoute>} />
          <Route path="/enrollments/:id/edit" element={<ModalRoute><ProtectedScreen allowedRoles={MANAGEMENT_ROLES}><ResourceFormPage resource="enrollments" /></ProtectedScreen></ModalRoute>} />
          <Route path="/enrollments/:id" element={<ModalRoute><ProtectedScreen><ResourceDetailPage resource="enrollments" /></ProtectedScreen></ModalRoute>} />
          <Route path="/grades/new" element={<ModalRoute><ProtectedScreen allowedRoles={ACADEMIC_ROLES}><ResourceFormPage resource="grades" /></ProtectedScreen></ModalRoute>} />
          <Route path="/grades/:id/edit" element={<ModalRoute><ProtectedScreen allowedRoles={ACADEMIC_ROLES}><ResourceFormPage resource="grades" /></ProtectedScreen></ModalRoute>} />
          <Route path="/grades/:id" element={<ModalRoute><ProtectedScreen><ResourceDetailPage resource="grades" /></ProtectedScreen></ModalRoute>} />
        </Routes>
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
