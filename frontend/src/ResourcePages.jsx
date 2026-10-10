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

function detailValue(value) {
  if (value == null || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return `${value.length} item${value.length === 1 ? '' : 's'}`;
  if (typeof value === 'object') {
    return Object.entries(value)
      .filter(([key]) => !['id', 'created_at', 'updated_at', 'deleted_at', 'password', 'remember_token', 'pivot'].includes(key))
      .map(([key, nested]) => `${key.replaceAll('_', ' ')}: ${detailValue(nested)}`)
      .join(' · ') || '—';
  }
  return String(value);
}

export function ResourceDetailPage({ resource }) {
  const config = RESOURCE_CONFIG[resource];
  const { id } = useParams();
  const { user } = useAuth();
  const location = useLocation();
  const [record, setRecord] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;
    apiRequest(`/${resource}/${id}`)
      .then((response) => { if (active) setRecord(response.data); })
      .catch((error) => { if (active) setMessage(error.message); });
    return () => { active = false; };
  }, [id, resource]);

  if (!config) return <p className="alert error">This record is not available.</p>;
  const title = record
    ? record.name || record.course_title || record.academic_year || record.student_number || record.course?.course_title || `${config.title} #${id}`
    : `${config.title} #${id}`;
  const excluded = new Set(['id', 'created_at', 'updated_at', 'deleted_at', 'password', 'remember_token']);
  const canEdit = ['administrator', 'registrar', 'staff'].includes(user?.role)
    || (resource === 'grades' && user?.role === 'instructor');

  return (
    <section className="workflow-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb"><Link to={config.listPath}>{config.title}s</Link><span aria-hidden="true">/</span><span>Details</span></nav>
      <header className="workflow-heading"><div><p className="eyebrow">RECORD DETAILS</p><h2>{title}</h2><p>Review this {config.title.toLowerCase()} record.</p></div></header>
      {message && <div className="alert error" role="alert">{message}</div>}
      {!record && !message ? <p className="loading-box">Loading record…</p> : record && (
        <dl className="detail-grid">
          {Object.entries(record).filter(([key]) => !excluded.has(key)).map(([key, value]) => (
            <div className="detail-item" key={key}><dt>{key.replaceAll('_', ' ')}</dt><dd>{detailValue(value)}</dd></div>
          ))}
        </dl>
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
