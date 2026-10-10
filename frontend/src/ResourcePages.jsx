import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import apiRequest from './api.js';
import { useAuth } from './context/AuthContext.jsx';

const RESOURCE_CONFIG = {
  programs: {
    title: 'Program',
    listPath: '/programs',
    fields: [
      { name: 'code', label: 'Program code', required: true },
      { name: 'name', label: 'Program name', required: true },
      { name: 'description', label: 'Description', type: 'textarea' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], required: true },
    ],
  },
  students: {
    title: 'Student',
    listPath: '/students',
    fields: [
      { name: 'student_number', label: 'Student number', required: true },
      { name: 'first_name', label: 'First name', required: true },
      { name: 'middle_name', label: 'Middle name' },
      { name: 'last_name', label: 'Last name', required: true },
      { name: 'suffix', label: 'Suffix' },
      { name: 'birth_date', label: 'Birth date', type: 'date' },
      { name: 'email', label: 'Email', type: 'email' },
      { name: 'contact_number', label: 'Contact number' },
      { name: 'address', label: 'Address', type: 'textarea' },
      { name: 'program_id', label: 'Program', type: 'options', source: 'programs', required: true },
      { name: 'year_level', label: 'Year level', type: 'select', options: ['1', '2', '3', '4', '5', '6'], required: true, help: 'Program lengths vary. Year 5 or 6 may be used for approved extensions; maximum is 6.' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'graduated'], required: true },
    ],
  },
  courses: {
    title: 'Course',
    listPath: '/courses',
    fields: [
      { name: 'course_code', label: 'Course code', required: true },
      { name: 'course_title', label: 'Course title', required: true },
      { name: 'units', label: 'Units', type: 'number', min: 1, max: 12, required: true },
      { name: 'description', label: 'Description' },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], required: true },
    ],
  },
  'academic-terms': {
    title: 'Academic term',
    listPath: '/academic-terms',
    fields: [
      { name: 'academic_year', label: 'Academic year', required: true },
      { name: 'semester', label: 'Semester', required: true },
      { name: 'start_date', label: 'Start date', type: 'date', required: true },
      { name: 'end_date', label: 'End date', type: 'date', required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive', 'closed'], required: true },
    ],
  },
  'course-offerings': {
    title: 'Course offering',
    listPath: '/course-offerings',
    fields: [
      { name: 'course_id', label: 'Course', type: 'options', source: 'courses', required: true },
      { name: 'academic_term_id', label: 'Academic term', type: 'options', source: 'academic-terms', required: true },
      { name: 'instructor_id', label: 'Instructor', type: 'options', source: 'instructors', required: true },
      { name: 'section', label: 'Section', required: true },
      { name: 'schedule', label: 'Schedule' },
      { name: 'room', label: 'Room' },
      { name: 'capacity', label: 'Capacity', type: 'number', min: 1, required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['open', 'closed', 'cancelled'], required: true },
    ],
  },
  enrollments: {
    title: 'Enrollment',
    listPath: '/enrollments',
    fields: [
      { name: 'student_id', label: 'Student', type: 'options', source: 'students', required: true },
      { name: 'course_offering_id', label: 'Course offering', type: 'options', source: 'course-offerings', required: true },
      { name: 'enrollment_date', label: 'Enrollment date', type: 'date' },
      { name: 'status', label: 'Status', type: 'select', options: ['enrolled', 'completed', 'dropped'], required: true },
    ],
  },
  grades: {
    title: 'Grade',
    listPath: '/grades',
    fields: [
      { name: 'enrollment_id', label: 'Enrollment', type: 'options', source: 'enrollments', required: true },
      { name: 'midterm_grade', label: 'Midterm grade', type: 'number', min: 0, max: 100 },
      { name: 'final_grade', label: 'Final grade', type: 'number', min: 0, max: 100 },
      { name: 'remarks', label: 'Remarks', type: 'textarea' },
    ],
  },
  users: {
    title: 'User',
    listPath: '/users',
    fields: [
      { name: 'name', label: 'Full name', required: true },
      { name: 'email', label: 'Email', type: 'email', required: true },
      { name: 'password', label: 'Password', type: 'password' },
      { name: 'role', label: 'Role', type: 'select', options: ['administrator', 'registrar', 'staff', 'instructor', 'student'], required: true },
      { name: 'status', label: 'Status', type: 'select', options: ['active', 'inactive'], required: true },
      { name: 'student_id', label: 'Linked student', type: 'options', source: 'students' },
    ],
  },
};

const NUMERIC_FIELDS = new Set([
  'program_id', 'year_level', 'units', 'course_id', 'academic_term_id',
  'instructor_id', 'capacity', 'student_id', 'course_offering_id', 'enrollment_id',
]);

function optionLabel(source, item) {
  if (source === 'programs') return `${item.code} · ${item.name}`;
  if (source === 'courses') return `${item.course_code} · ${item.course_title}`;
  if (source === 'academic-terms') return `${item.academic_year} · ${item.semester}`;
  if (source === 'instructors') return item.name || item.email || `Instructor ${item.id}`;
  if (source === 'students') return `${item.student_number} · ${item.first_name} ${item.last_name}`;
  if (source === 'course-offerings') return `${item.course?.course_code || 'Course'} · ${item.section} · ${item.academic_term?.academic_year || ''}`;
  if (source === 'enrollments') return `${item.student?.first_name || 'Student'} ${item.student?.last_name || ''} · ${item.course_offering?.course?.course_title || 'Course'}`;
  return String(item.name || item.id);
}

function backgroundRouteState(location) {
  return { state: { backgroundLocation: location.state?.backgroundLocation || location } };
}

function initialValue(field) {
  if (field.name === 'status') return field.options?.[0] || '';
  if (field.name === 'capacity') return '40';
  if (field.name === 'year_level') return '1';
  if (field.name === 'enrollment_date') return new Date().toISOString().slice(0, 10);
  return '';
}

export function ResourceFormPage({ resource }) {
  const config = RESOURCE_CONFIG[resource];
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState(() => Object.fromEntries(config.fields.map((field) => [field.name, initialValue(field)])));
  const [options, setOptions] = useState({});
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const optionSources = useMemo(() => [...new Set(config.fields.filter((field) => field.type === 'options').map((field) => field.source))], [config]);

  useEffect(() => {
    let active = true;
    const requests = optionSources.map(async (source) => {
      if (source === 'instructors') {
        const response = await apiRequest('/course-offerings?per_page=100&sort=section');
        const instructors = new Map();
        (response.data || []).forEach((offering) => {
          if (offering.instructor) instructors.set(offering.instructor.id, offering.instructor);
        });
        return [source, Array.from(instructors.values())];
      }
      const response = await apiRequest(`/${source}?per_page=100${source === 'courses' ? '&sort=course_title' : ''}`);
      return [source, response.data || []];
    });
    const recordRequest = editing ? apiRequest(`/${resource}/${id}`) : Promise.resolve(null);
    Promise.all([Promise.all(requests), recordRequest])
      .then(([optionEntries, response]) => {
        if (!active) return;
        setOptions(Object.fromEntries(optionEntries));
        if (response?.data) {
          setForm((current) => Object.fromEntries(config.fields.map((field) => [
            field.name,
            response.data[field.name] == null ? '' : String(response.data[field.name]),
          ])));
        }
      })
      .catch((error) => {
        if (active) setMessage(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [config, editing, id, optionSources, resource]);

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setMessage('');
    const payload = Object.fromEntries(config.fields.map((field) => {
      const value = form[field.name];
      if (NUMERIC_FIELDS.has(field.name)) return [field.name, value === '' ? '' : Number(value)];
      if (['midterm_grade', 'final_grade'].includes(field.name)) return [field.name, value === '' ? null : Number(value)];
      return [field.name, value];
    }));
    if (editing && resource === 'grades') delete payload.enrollment_id;
    try {
      await apiRequest(editing ? `/${resource}/${id}` : `/${resource}`, {
        method: editing ? 'PATCH' : 'POST',
        body: payload,
      });
      navigate(config.listPath, {
        replace: true,
        state: {
          notice: `${config.title} ${editing ? 'updated' : 'created'} successfully.`,
          refreshList: `${Date.now()}-${Math.random()}`,
        },
      });
    } catch (error) {
      setMessage(error.message);
      setFieldErrors(error.errors || {});
    } finally {
      setSubmitting(false);
    }
  };

  if (!config) return <p className="alert error">This form is not available.</p>;

  return (
    <section className="workflow-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to={config.listPath}>{config.title}s</Link><span aria-hidden="true">/</span><span>{editing ? 'Edit' : 'Add'} {config.title}</span>
      </nav>
      <header className="workflow-heading">
        <div><p className="eyebrow">{editing ? 'UPDATE RECORD' : 'NEW RECORD'}</p><h2>{editing ? `Edit ${config.title}` : `Add ${config.title}`}</h2><p>Complete the fields below. Required fields are marked by your browser.</p></div>
      </header>
      {message && <div className="alert error" role="alert">{message}</div>}
      <div className="form-panel workflow-form">
        {loading ? <p className="loading-box">Loading record…</p> : (
          <form onSubmit={submit} className="workflow-fields">
            {config.fields.map((field) => (
              <div className="field" key={field.name}>
                <label htmlFor={`resource-${field.name}`}>{field.label}{field.required ? ' *' : ''}</label>
                {field.type === 'options' ? (
                  <select id={`resource-${field.name}`} value={form[field.name]} required={field.required} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}>
                    <option value="">Select {field.label.toLowerCase()}</option>
                    {(options[field.source] || []).map((item) => <option key={item.id} value={item.id}>{optionLabel(field.source, item)}</option>)}
                  </select>
                ) : field.type === 'select' ? (
                  <select id={`resource-${field.name}`} value={form[field.name]} required={field.required} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))}>
                    {field.options.map((option) => <option key={option} value={option}>{option.charAt(0).toUpperCase() + option.slice(1)}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea id={`resource-${field.name}`} value={form[field.name]} required={field.required} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} rows="4" />
                ) : (
                  <input id={`resource-${field.name}`} type={field.type || 'text'} min={field.min} max={field.max} value={form[field.name]} required={field.required} onChange={(event) => setForm((current) => ({ ...current, [field.name]: event.target.value }))} />
                )}
                {field.help && <span className="field-help">{field.help}</span>}
                {(fieldErrors[field.name] || []).map((error) => <span className="field-error" key={error}>{error}</span>)}
              </div>
            ))}
            <div className="workflow-actions">
              <button className="primary-btn" type="submit" disabled={submitting}>{submitting ? 'Saving…' : editing ? `Update ${config.title}` : `Save ${config.title}`}</button>
              <button className="ghost-btn" type="button" onClick={() => navigate(config.listPath)}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

const USER_ROLES = ['administrator', 'registrar', 'staff', 'instructor', 'student'];

export function UserFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'instructor', status: 'active', student_id: '' });
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;
    const requests = [apiRequest('/students?per_page=100&sort=last_name')];
    if (editing) requests.push(apiRequest(`/users/${id}`));
    Promise.all(requests)
      .then(([studentResponse, userResponse]) => {
        if (!active) return;
        setStudents(studentResponse.data || []);
        if (userResponse?.data) {
          const user = userResponse.data;
          setForm({
            name: user.name || '',
            email: user.email || '',
            password: '',
            role: user.role || 'instructor',
            status: user.status || 'active',
            student_id: user.student_id == null ? '' : String(user.student_id),
          });
        }
      })
      .catch((error) => { if (active) setMessage(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editing, id]);

  const isStudentRole = form.role === 'student';
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setMessage('');
    const payload = { name: form.name, email: form.email, role: form.role, status: form.status };
    if (form.password) payload.password = form.password;
    if (isStudentRole) payload.student_id = form.student_id === '' ? '' : Number(form.student_id);
    try {
      await apiRequest(editing ? `/users/${id}` : '/users', { method: editing ? 'PATCH' : 'POST', body: payload });
      navigate('/users', {
        replace: true,
        state: { notice: `User ${editing ? 'updated' : 'created'} successfully.`, refreshList: `${Date.now()}-${Math.random()}` },
      });
    } catch (error) {
      setMessage(error.message);
      setFieldErrors(error.errors || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="workflow-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/users">Users</Link><span aria-hidden="true">/</span><span>{editing ? 'Edit' : 'Add'} user</span>
      </nav>
      <header className="workflow-heading">
        <div>
          <p className="eyebrow">{editing ? 'UPDATE ACCOUNT' : 'NEW ACCOUNT'}</p>
          <h2>{editing ? 'Edit user account' : 'Add user account'}</h2>
          <p>Assign a role and status. Student accounts must be linked to a student profile.</p>
        </div>
      </header>
      {message && <div className="alert error" role="alert">{message}</div>}
      <div className="form-panel workflow-form">
        {loading ? <p className="loading-box">Loading account…</p> : (
          <form onSubmit={submit} className="workflow-fields">
            <div className="field">
              <label htmlFor="user-name">Full name *</label>
              <input id="user-name" value={form.name} onChange={(event) => update('name', event.target.value)} required />
              {(fieldErrors.name || []).map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label htmlFor="user-email">Email *</label>
              <input id="user-email" type="email" value={form.email} onChange={(event) => update('email', event.target.value)} required />
              {(fieldErrors.email || []).map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label htmlFor="user-password">Password {editing ? '(leave blank to keep current)' : '*'}</label>
              <input id="user-password" type="password" value={form.password} onChange={(event) => update('password', event.target.value)} required={!editing} minLength="8" />
              {(fieldErrors.password || []).map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label htmlFor="user-role">Role *</label>
              <select id="user-role" value={form.role} onChange={(event) => update('role', event.target.value)} required>
                {USER_ROLES.map((role) => <option key={role} value={role}>{prettyEnum(role)}</option>)}
              </select>
              {(fieldErrors.role || []).map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label htmlFor="user-status">Status *</label>
              <select id="user-status" value={form.status} onChange={(event) => update('status', event.target.value)} required>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              {(fieldErrors.status || []).map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            {isStudentRole && (
              <div className="field">
                <label htmlFor="user-student">Linked student *</label>
                <select id="user-student" value={form.student_id} onChange={(event) => update('student_id', event.target.value)} required>
                  <option value="">Select student</option>
                  {students.map((student) => <option key={student.id} value={student.id}>{student.student_number} · {studentFullName(student)}</option>)}
                </select>
                {(fieldErrors.student_id || []).map((error) => <span className="field-error" key={error}>{error}</span>)}
              </div>
            )}
            <div className="workflow-actions">
              <button className="primary-btn" type="submit" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Update user' : 'Create user'}</button>
              <button className="ghost-btn" type="button" onClick={() => navigate('/users')}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

export function GradeFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(id);
  const [enrollments, setEnrollments] = useState([]);
  const [record, setRecord] = useState(null);
  const [form, setForm] = useState({ enrollment_id: '', period: 'midterm', midterm_grade: '', final_grade: '', remarks: '' });
  const [loading, setLoading] = useState(editing);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  useEffect(() => {
    let active = true;
    const requests = [apiRequest('/enrollments?per_page=100&sort=enrollment_date')];
    if (editing) requests.push(apiRequest(`/grades/${id}`));
    Promise.all(requests)
      .then(([enrollmentResponse, gradeResponse]) => {
        if (!active) return;
        setEnrollments(enrollmentResponse.data || []);
        if (gradeResponse?.data) {
          const grade = gradeResponse.data;
          setRecord(grade);
          const period = isBlank(grade.midterm_grade) ? 'midterm' : (isBlank(grade.final_grade) ? 'final' : 'midterm');
          setForm({
            enrollment_id: grade.enrollment_id == null ? '' : String(grade.enrollment_id),
            period,
            midterm_grade: isBlank(grade.midterm_grade) ? '' : formatGrade(grade.midterm_grade),
            final_grade: isBlank(grade.final_grade) ? '' : formatGrade(grade.final_grade),
            remarks: grade.remarks || '',
          });
        }
      })
      .catch((error) => { if (active) setMessage(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editing, id]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const periodField = form.period === 'midterm' ? 'midterm_grade' : 'final_grade';
  const selectedEnrollment = enrollments.find((enrollment) => String(enrollment.id) === String(form.enrollment_id));

  const submit = async (event) => {
    event.preventDefault();
    setSubmitting(true);
    setFieldErrors({});
    setMessage('');
    const payload = {
      period: form.period,
      [periodField]: form[periodField] === '' ? null : Number(form[periodField]),
      remarks: form.remarks,
    };
    if (!editing) payload.enrollment_id = Number(form.enrollment_id);
    try {
      const response = await apiRequest(editing ? `/grades/${id}` : '/grades', {
        method: editing ? 'PATCH' : 'POST',
        body: payload,
      });
      navigate('/grades', {
        replace: true,
        state: { notice: response.message || `Grade ${editing ? 'updated' : 'recorded'} successfully.`, refreshList: `${Date.now()}-${Math.random()}` },
      });
    } catch (error) {
      setMessage(error.message);
      setFieldErrors(error.errors || {});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="workflow-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/grades">Grades</Link><span aria-hidden="true">/</span><span>{editing ? 'Update' : 'Record'} grade</span>
      </nav>
      <header className="workflow-heading">
        <div>
          <p className="eyebrow">{editing ? 'UPDATE RESULT' : 'NEW RESULT'}</p>
          <h2>{editing ? 'Update grade' : 'Record grade'}</h2>
          <p>Midterm and final grades follow separate timelines and are recorded as each period closes.</p>
        </div>
      </header>
      {message && <div className="alert error" role="alert">{message}</div>}
      <div className="form-panel workflow-form">
        {loading ? <p className="loading-box">Loading record…</p> : (
          <form onSubmit={submit} className="workflow-fields">
            <div className="field">
              <label htmlFor="grade-enrollment">Enrollment *</label>
              {editing ? (
                <input
                  id="grade-enrollment"
                  value={selectedEnrollment
                    ? `${studentFullName(selectedEnrollment.student)} · ${selectedEnrollment.course_offering?.course?.course_title || 'Course'}`
                    : `Enrollment #${form.enrollment_id}`}
                  disabled
                />
              ) : (
                <select id="grade-enrollment" value={form.enrollment_id} onChange={(event) => update('enrollment_id', event.target.value)} required>
                  <option value="">Select enrollment</option>
                  {enrollments.map((enrollment) => (
                    <option key={enrollment.id} value={enrollment.id}>
                      {studentFullName(enrollment.student)} · {enrollment.course_offering?.course?.course_title || 'Course'} ({enrollment.course_offering?.section || '—'})
                    </option>
                  ))}
                </select>
              )}
              {(fieldErrors.enrollment_id || []).map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label htmlFor="grade-period">Grading period *</label>
              <select id="grade-period" value={form.period} onChange={(event) => update('period', event.target.value)} required>
                <option value="midterm">Midterm</option>
                <option value="final">Final</option>
              </select>
              <span className="field-help">Select the period being submitted. Both periods merge into a single grade record for the enrollment.</span>
            </div>
            <div className="field">
              <label htmlFor="grade-value">{form.period === 'midterm' ? 'Midterm grade' : 'Final grade'} *</label>
              <input id="grade-value" type="number" min="0" max="100" step="0.01" value={form[periodField]} onChange={(event) => update(periodField, event.target.value)} required />
              {(fieldErrors[periodField] || []).map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            <div className="field">
              <label htmlFor="grade-remarks">Remarks</label>
              <textarea id="grade-remarks" rows="3" value={form.remarks} onChange={(event) => update('remarks', event.target.value)} />
              {(fieldErrors.remarks || []).map((error) => <span className="field-error" key={error}>{error}</span>)}
            </div>
            {editing && record && (
              <div className="field">
                <label>Recorded so far</label>
                <p className="grade-recorded">
                  Midterm: {formatGrade(record.midterm_grade) ?? 'Pending'} · Final: {formatGrade(record.final_grade) ?? 'Pending'}
                </p>
              </div>
            )}
            <div className="workflow-actions">
              <button className="primary-btn" type="submit" disabled={submitting}>{submitting ? 'Saving…' : editing ? 'Update grade' : 'Save grade'}</button>
              <button className="ghost-btn" type="button" onClick={() => navigate('/grades')}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

const MANAGEMENT_ROLES = ['administrator', 'registrar', 'staff'];

function isBlank(value) {
  return value == null || value === '';
}

function humanizeKey(key) {
  return key.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function prettyEnum(value) {
  if (isBlank(value)) return '';
  const text = String(value).replaceAll('_', ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function formatDate(value) {
  if (isBlank(value)) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatDateTime(value) {
  if (isBlank(value)) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function formatGrade(value) {
  if (isBlank(value)) return null;
  const number = Number(value);
  if (Number.isNaN(number)) return String(value);
  return number.toFixed(2).replace(/\.00$/, '');
}

function formatBoolean(value) {
  if (isBlank(value)) return '—';
  return value ? 'Yes' : 'No';
}

function StatusBadge({ value }) {
  if (isBlank(value)) return <span className="detail-muted">—</span>;
  const text = String(value);
  return <span className={`status-label status-${text.toLowerCase().replace(/\s+/g, '-')}`}>{prettyEnum(text)}</span>;
}

function DetailSection({ title, description, badge, actions, children }) {
  return (
    <section className="detail-section">
      <header className="detail-section-head">
        <div>
          <h3>{title}</h3>
          {description && <p>{description}</p>}
        </div>
        {badge}
        {actions && <div className="detail-section-actions">{actions}</div>}
      </header>
      <dl className="detail-list">{children}</dl>
    </section>
  );
}

function DetailField({ label, full, children }) {
  const content = children == null || children === '' ? <span className="detail-muted">—</span> : children;
  return (
    <div className={`detail-field${full ? ' detail-field-full' : ''}`}>
      <dt>{label}</dt>
      <dd>{content}</dd>
    </div>
  );
}

function relatedLink(to, label, location) {
  return <Link className="detail-link" to={to} {...backgroundRouteState(location)}>{label}</Link>;
}

function studentFullName(student) {
  if (!student) return '—';
  const middle = student.middle_name ? ` ${student.middle_name.charAt(0).toUpperCase()}.` : '';
  const suffix = student.suffix ? `, ${student.suffix}` : '';
  return `${student.first_name || ''}${middle} ${student.last_name || ''}${suffix}`.trim();
}

function GradeSummary({ grade }) {
  if (!grade) return <span className="detail-muted">No grade recorded yet.</span>;
  const midterm = formatGrade(grade.midterm_grade);
  const final = formatGrade(grade.final_grade);
  const average = (midterm != null && final != null) ? formatGrade((Number(midterm) + Number(final)) / 2) : null;
  const passing = average != null && Number(average) >= 75;
  return (
    <div className="grade-summary">
      <div className="grade-metric">
        <span>Midterm</span>
        <strong>{midterm ?? 'Pending'}</strong>
        <small className="grade-metric-note">{isBlank(grade.midterm_submitted_at) ? 'Not yet submitted' : `Submitted ${formatDateTime(grade.midterm_submitted_at)}`}</small>
      </div>
      <div className="grade-metric">
        <span>Final</span>
        <strong>{final ?? 'Pending'}</strong>
        <small className="grade-metric-note">{isBlank(grade.final_submitted_at) ? 'Not yet submitted' : `Submitted ${formatDateTime(grade.final_submitted_at)}`}</small>
      </div>
      <div className="grade-metric"><span>Average</span><strong>{average ?? '—'}</strong></div>
      <div className="grade-metric">
        <span>Standing</span>
        <strong className={average == null ? 'detail-muted' : passing ? 'grade-pass' : 'grade-fail'}>
          {average == null ? '—' : passing ? 'Passed' : 'Failed'}
        </strong>
      </div>
      {grade.remarks && <p className="grade-remarks">Remarks: {grade.remarks}</p>}
    </div>
  );
}

function ProgramDetail({ record }) {
  return (
    <DetailSection title="Program overview" badge={<StatusBadge value={record.status} />}>
      <DetailField label="Program code">{record.code}</DetailField>
      <DetailField label="Program name">{record.name}</DetailField>
      <DetailField label="Description" full>{record.description}</DetailField>
    </DetailSection>
  );
}

function StudentDetail({ record, location, user }) {
  const canViewPrograms = MANAGEMENT_ROLES.includes(user?.role);
  return (
    <>
      <DetailSection title="Personal information" badge={<StatusBadge value={record.status} />}>
        <DetailField label="Full name">{studentFullName(record)}</DetailField>
        <DetailField label="Student number">{record.student_number}</DetailField>
        <DetailField label="Birth date">{formatDate(record.birth_date)}</DetailField>
        <DetailField label="Year level">{record.year_level ?? '—'}</DetailField>
      </DetailSection>
      <DetailSection title="Contact details">
        <DetailField label="Email">{record.email}</DetailField>
        <DetailField label="Contact number">{record.contact_number}</DetailField>
        <DetailField label="Address" full>{record.address}</DetailField>
      </DetailSection>
      <DetailSection title="Academic placement">
        <DetailField label="Program">
          {record.program
            ? (canViewPrograms ? relatedLink(`/programs/${record.program.id}`, record.program.name, location) : record.program.name)
            : '—'}
        </DetailField>
        <DetailField label="Program code">{record.program?.code}</DetailField>
        <DetailField label="Status"><StatusBadge value={record.status} /></DetailField>
      </DetailSection>
    </>
  );
}

function CourseDetail({ record }) {
  return (
    <DetailSection title="Course overview" badge={<StatusBadge value={record.status} />}>
      <DetailField label="Course code">{record.course_code}</DetailField>
      <DetailField label="Units">{record.units}</DetailField>
      <DetailField label="Course title" full>{record.course_title}</DetailField>
      <DetailField label="Description" full>{record.description}</DetailField>
    </DetailSection>
  );
}

function AcademicTermDetail({ record }) {
  const start = record.start_date ? new Date(record.start_date) : null;
  const end = record.end_date ? new Date(record.end_date) : null;
  const days = start && end && !Number.isNaN(start) && !Number.isNaN(end)
    ? Math.max(0, Math.round((end - start) / 86400000))
    : null;
  return (
    <DetailSection title="Term overview" badge={<StatusBadge value={record.status} />}>
      <DetailField label="Academic year">{record.academic_year}</DetailField>
      <DetailField label="Semester">{record.semester}</DetailField>
      <DetailField label="Start date">{formatDate(record.start_date)}</DetailField>
      <DetailField label="End date">{formatDate(record.end_date)}</DetailField>
      <DetailField label="Duration" full>{days == null ? '—' : `${days} days`}</DetailField>
    </DetailSection>
  );
}

function CourseOfferingDetail({ record, location }) {
  const offering = record;
  return (
    <>
      <DetailSection title="Course" badge={<StatusBadge value={offering.status} />}>
        <DetailField label="Course code">{offering.course?.course_code}</DetailField>
        <DetailField label="Units">{offering.course?.units}</DetailField>
        <DetailField label="Course title" full>
          {offering.course ? relatedLink(`/courses/${offering.course.id}`, offering.course.course_title, location) : '—'}
        </DetailField>
      </DetailSection>
      <DetailSection title="Schedule & section">
        <DetailField label="Academic term">
          {offering.academic_term
            ? relatedLink(`/academic-terms/${offering.academic_term.id}`, `${offering.academic_term.academic_year} · ${offering.academic_term.semester}`, location)
            : '—'}
        </DetailField>
        <DetailField label="Section">{offering.section}</DetailField>
        <DetailField label="Schedule">{offering.schedule}</DetailField>
        <DetailField label="Room">{offering.room}</DetailField>
        <DetailField label="Capacity">{offering.capacity ?? '—'}</DetailField>
        <DetailField label="Status"><StatusBadge value={offering.status} /></DetailField>
      </DetailSection>
      <DetailSection title="Instructor">
        <DetailField label="Name">{offering.instructor?.name}</DetailField>
        <DetailField label="Email">{offering.instructor?.email}</DetailField>
      </DetailSection>
    </>
  );
}

function EnrollmentDetail({ record, location, user, onDrop, dropping }) {
  const offering = record.course_offering || {};
  const canManage = MANAGEMENT_ROLES.includes(user?.role);
  return (
    <>
      <DetailSection title="Student" description="The student linked to this enrollment.">
        <DetailField label="Name">
          {record.student ? relatedLink(`/students/${record.student.id}`, studentFullName(record.student), location) : '—'}
        </DetailField>
        <DetailField label="Student number">{record.student?.student_number}</DetailField>
        <DetailField label="Email">{record.student?.email}</DetailField>
        <DetailField label="Status"><StatusBadge value={record.student?.status} /></DetailField>
      </DetailSection>
      <DetailSection title="Course offering" description="The section this enrollment belongs to.">
        <DetailField label="Course">
          {offering.course ? relatedLink(`/course-offerings/${offering.id}`, `${offering.course.course_code || ''} · ${offering.course.course_title || ''}`, location) : '—'}
        </DetailField>
        <DetailField label="Section">{offering.section}</DetailField>
        <DetailField label="Academic term">
          {offering.academic_term ? `${offering.academic_term.academic_year} · ${offering.academic_term.semester}` : '—'}
        </DetailField>
        <DetailField label="Instructor">{offering.instructor?.name}</DetailField>
        <DetailField label="Schedule">{offering.schedule}</DetailField>
        <DetailField label="Room">{offering.room}</DetailField>
      </DetailSection>
      <DetailSection title="Enrollment record" badge={<StatusBadge value={record.status} />}>
        <DetailField label="Enrollment date">{formatDate(record.enrollment_date)}</DetailField>
        <DetailField label="Status"><StatusBadge value={record.status} /></DetailField>
      </DetailSection>
      <DetailSection title="Grade" description="Recorded results for this enrollment.">
        <div className="detail-field detail-field-full">
          <GradeSummary grade={record.grade} />
        </div>
      </DetailSection>
      {canManage && record.status !== 'dropped' && (
        <div className="detail-danger-zone">
          <div>
            <strong>Drop enrollment</strong>
            <p>Marking this enrollment as dropped keeps the record for auditing but removes the student from the active roster.</p>
          </div>
          <button className="danger-btn" type="button" onClick={onDrop} disabled={dropping}>{dropping ? 'Dropping…' : 'Drop enrollment'}</button>
        </div>
      )}
    </>
  );
}

function GradeDetail({ record, location }) {
  const enrollment = record.enrollment || {};
  const offering = enrollment.course_offering || {};
  return (
    <>
      <DetailSection title="Student">
        <DetailField label="Name">
          {enrollment.student ? relatedLink(`/students/${enrollment.student.id}`, studentFullName(enrollment.student), location) : '—'}
        </DetailField>
        <DetailField label="Student number">{enrollment.student?.student_number}</DetailField>
      </DetailSection>
      <DetailSection title="Course">
        <DetailField label="Course">
          {offering.course ? `${offering.course.course_code || ''} · ${offering.course.course_title || ''}` : '—'}
        </DetailField>
        <DetailField label="Section">{offering.section}</DetailField>
        <DetailField label="Academic term">
          {offering.academic_term ? `${offering.academic_term.academic_year} · ${offering.academic_term.semester}` : '—'}
        </DetailField>
      </DetailSection>
      <DetailSection title="Result">
        <div className="detail-field detail-field-full">
          <GradeSummary grade={record} />
        </div>
      </DetailSection>
    </>
  );
}

function UserDetail({ record, location }) {
  return (
    <>
      <DetailSection title="Account" badge={<StatusBadge value={record.status} />}>
        <DetailField label="Full name">{record.name}</DetailField>
        <DetailField label="Email">{record.email}</DetailField>
        <DetailField label="Role">{prettyEnum(record.role)}</DetailField>
        <DetailField label="Status"><StatusBadge value={record.status} /></DetailField>
      </DetailSection>
      <DetailSection title="Linked profile">
        <DetailField label="Student record">
          {record.student_id
            ? relatedLink(`/students/${record.student_id}`, `Student ID ${record.student_id}`, location)
            : 'No student profile linked.'}
        </DetailField>
      </DetailSection>
      <DetailSection title="Record activity">
        <DetailField label="Created">{formatDateTime(record.created_at)}</DetailField>
        <DetailField label="Last updated">{formatDateTime(record.updated_at)}</DetailField>
      </DetailSection>
    </>
  );
}

function GenericDetail({ record }) {
  const excluded = new Set(['id', 'created_at', 'updated_at', 'deleted_at', 'password', 'remember_token', 'pivot']);
  const scalarEntries = Object.entries(record).filter(([key]) => !excluded.has(key));
  return (
    <DetailSection title="Record fields">
      {scalarEntries.map(([key, value]) => {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          return null;
        }
        return <DetailField key={key} label={humanizeKey(key)}>{formatBoolean(value) === '—' ? '—' : prettyEnum(String(value))}</DetailField>;
      })}
    </DetailSection>
  );
}

const DETAIL_COMPONENTS = {
  programs: ProgramDetail,
  students: StudentDetail,
  courses: CourseDetail,
  'academic-terms': AcademicTermDetail,
  'course-offerings': CourseOfferingDetail,
  enrollments: EnrollmentDetail,
  grades: GradeDetail,
  users: UserDetail,
};

function detailTitle(resource, record) {
  if (!record) return null;
  switch (resource) {
    case 'programs': return record.name;
    case 'students': return studentFullName(record);
    case 'courses': return record.course_title;
    case 'academic-terms': return `${record.academic_year} · ${record.semester}`;
    case 'course-offerings': return `${record.course?.course_title || 'Course offering'}${record.section ? ` · Section ${record.section}` : ''}`;
    case 'enrollments': return record.student ? `${studentFullName(record.student)} · ${record.course_offering?.course?.course_title || 'Enrollment'}` : 'Enrollment';
    case 'grades': return record.enrollment?.student ? studentFullName(record.enrollment.student) : 'Grade record';
    case 'users': return record.name;
    default: return `${RESOURCE_CONFIG[resource]?.title || 'Record'}`;
  }
}

export function ResourceDetailPage({ resource }) {
  const config = RESOURCE_CONFIG[resource];
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [record, setRecord] = useState(null);
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [dropping, setDropping] = useState(false);

  useEffect(() => {
    let active = true;
    apiRequest(`/${resource}/${id}`)
      .then((response) => { if (active) setRecord(response.data); })
      .catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [id, resource]);

  const handleDrop = async () => {
    if (!window.confirm('Drop this enrollment? The student will be removed from the active roster.')) return;
    setDropping(true);
    try {
      await apiRequest(`/enrollments/${id}`, { method: 'DELETE' });
      setNotice('Enrollment dropped successfully.');
      const response = await apiRequest(`/enrollments/${id}`);
      setRecord(response.data);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setDropping(false);
    }
  };

  if (!config) return <p className="alert error">This record is not available.</p>;

  const DetailComponent = DETAIL_COMPONENTS[resource] || GenericDetail;
  const title = detailTitle(resource, record) || `${config.title} #${id}`;
  const canEdit = MANAGEMENT_ROLES.includes(user?.role)
    || (resource === 'grades' && user?.role === 'instructor');

  return (
    <section className="workflow-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to={config.listPath}>{config.title}s</Link><span aria-hidden="true">/</span><span>Details</span></nav>
      <header className="workflow-heading detail-heading">
        <div>
          <p className="eyebrow">RECORD DETAILS</p>
          <h2>{title}</h2>
          <p>Review this {config.title.toLowerCase()} record.</p>
        </div>
        <div className="detail-heading-meta">
          <span className="detail-id"># {id}</span>
          {record && <StatusBadge value={record.status} />}
        </div>
      </header>
      {notice && <div className="alert success" role="status">{notice}</div>}
      {message && <div className="alert error" role="alert">{message}</div>}
      {!record && !message ? <p className="loading-box">Loading record…</p> : record && (
        <div className="detail-content">
          <DetailComponent record={record} location={location} user={user} onDrop={handleDrop} dropping={dropping} />
        </div>
      )}
      <div className="workflow-actions">
        <Link className="secondary-btn" to={config.listPath}>Back to {config.title}s</Link>
        {canEdit && <Link className="primary-btn" to={`/${resource}/${id}/edit`} {...backgroundRouteState(location)}>Edit {config.title}</Link>}
        {resource === 'students' && <Link className="ghost-btn" to={`/students/${id}/academic-record`} {...backgroundRouteState(location)}>Academic record</Link>}
        {resource === 'course-offerings' && <Link className="ghost-btn" to={`/course-offerings/${id}/roster`} {...backgroundRouteState(location)}>View roster</Link>}
      </div>
    </section>
  );
}

export function StudentAcademicRecordPage() {
  const { id } = useParams();
  const location = useLocation();
  const [record, setRecord] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    apiRequest(`/students/${id}/academic-record`)
      .then((response) => { if (active) setRecord(response.data); })
      .catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [id]);

  return (
    <section className="workflow-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/students">Students</Link><span aria-hidden="true">/</span><span>Academic record</span></nav>
      <header className="workflow-heading"><div><p className="eyebrow">ACADEMIC HISTORY</p><h2>{record?.student ? `${record.student.first_name} ${record.student.last_name}` : 'Academic record'}</h2><p>Course results grouped by academic term.</p></div></header>
      {message && <div className="alert error" role="alert">{message}</div>}
      {!record && !message ? <p className="loading-box">Loading academic record…</p> : record?.terms?.length ? record.terms.map((group) => (
        <section className="table-panel workflow-section" key={group.term.id}>
          <div className="section-heading"><h3>{group.term.academic_year} · {group.term.semester}</h3></div>
          <table><thead><tr><th>Course</th><th>Section</th><th>Midterm</th><th>Final</th><th>Remarks</th></tr></thead>
            <tbody>{group.enrollments.map((enrollment) => <tr key={enrollment.id}>
              <td>{enrollment.course_offering?.course?.course_title || '—'}</td><td>{enrollment.course_offering?.section || '—'}</td>
              <td>{enrollment.grade?.midterm_grade ?? '—'}</td><td>{enrollment.grade?.final_grade ?? '—'}</td><td>{enrollment.grade?.remarks || '—'}</td>
            </tr>)}</tbody>
          </table>
        </section>
      )) : record && <p className="empty-state">No academic history is available.</p>}
      <Link className="secondary-btn" to={`/students/${id}`} {...backgroundRouteState(location)}>Back to student details</Link>
    </section>
  );
}

export function CourseOfferingRosterPage() {
  const { id } = useParams();
  const location = useLocation();
  const [roster, setRoster] = useState(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    Promise.all([
      apiRequest(`/course-offerings/${id}`),
      apiRequest(`/course-offerings/${id}/students?per_page=100`),
    ])
      .then(([offeringResponse, studentResponse]) => {
        if (active) setRoster({ offering: offeringResponse.data, students: studentResponse.data || [] });
      })
      .catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [id]);

  return (
    <section className="workflow-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to="/course-offerings">Course offerings</Link><span aria-hidden="true">/</span><span>Roster</span></nav>
      <header className="workflow-heading"><div><p className="eyebrow">CLASS ROSTER</p><h2>{roster?.offering?.course?.course_title || 'Course offering'}{roster?.offering?.section ? ` · Section ${roster.offering.section}` : ''}</h2><p>{roster?.students?.length || 0} enrolled students</p></div></header>
      {message && <div className="alert error" role="alert">{message}</div>}
      {!roster && !message ? <p className="loading-box">Loading roster…</p> : roster?.students?.length ? (
        <div className="table-panel"><table><thead><tr><th>Student number</th><th>Student</th><th>Enrollment status</th></tr></thead>
          <tbody>{roster.students.map((enrollment) => <tr key={enrollment.id}><td>{enrollment.student?.student_number || '—'}</td><td>{enrollment.student?.first_name} {enrollment.student?.last_name}</td><td>{enrollment.status}</td></tr>)}</tbody>
        </table></div>
      ) : roster && <p className="empty-state">No students are enrolled in this offering.</p>}
      <Link className="secondary-btn" to={`/course-offerings/${id}`} {...backgroundRouteState(location)}>Back to offering details</Link>
    </section>
  );
}
