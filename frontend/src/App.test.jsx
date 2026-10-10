import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App.jsx';

function jsonResponse(payload, status = 200) {
  return { ok: status >= 200 && status < 300, status, json: async () => payload };
}

function renderApp(initialEntry = '/login') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>
  );
}

describe('frontend authentication and route protection', () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it('shows invalid credential feedback without creating a session', async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({
      success: false,
      message: 'The provided credentials are invalid.',
      errors: [],
    }, 401));
    vi.stubGlobal('fetch', fetchMock);
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('The provided credentials are invalid.')).toBeInTheDocument();
    expect(localStorage.getItem('sim_token')).toBeNull();
  });

  it('shows the public landing page and links into the existing login flow', async () => {
    renderApp('/');

    expect(await screen.findByRole('heading', { name: 'Every part of the academic journey.' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Access the portal/ })).toHaveAttribute('href', '/login');
    expect(screen.getByRole('heading', { name: 'From enrollment to academic history.' })).toBeInTheDocument();
  });

  it('logs in, loads role-scoped dashboard data, and clears the session on logout', async () => {
    const user = { id: 1, name: 'System Administrator', email: 'admin@example.com', role: 'administrator', status: 'active' };
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('/auth/login')) return jsonResponse({ success: true, data: { token: 'demo-token', user } });
      if (url.endsWith('/auth/me')) return jsonResponse({ success: true, data: user });
      if (url.endsWith('/auth/logout')) return jsonResponse({ success: true, data: null });
      return jsonResponse({ success: true, data: [], meta: { total: 100, current_page: 1, last_page: 1, per_page: 1 } });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderApp();

    fireEvent.click(screen.getByRole('button', { name: 'Login' }));

    expect(await screen.findByText('Total Students')).toBeInTheDocument();
    expect(screen.getAllByText('System Administrator').length).toBeGreaterThan(0);
    expect(screen.getAllByText('administrator').length).toBeGreaterThan(0);
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/students?page=1&per_page=1'))).toBe(true);
    expect(localStorage.getItem('sim_token')).toBe('demo-token');

    fireEvent.click(screen.getByRole('link', { name: 'Programs' }));
    fireEvent.click(await screen.findByRole('link', { name: 'Add program' }));
    expect(await screen.findByRole('heading', { name: 'Add Program' })).toBeInTheDocument();
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Programs' })).toBeInTheDocument();
    expect(document.querySelector('.workflow-backdrop')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Program code *'), { target: { value: 'BSCS' } });
    fireEvent.change(screen.getByLabelText('Program name *'), { target: { value: 'Computer Science' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save Program' }));
    expect(await screen.findByRole('region', { name: 'programs list controls' })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url, options]) => url.endsWith('/programs') && options?.method === 'POST')).toBe(true);
    await waitFor(() => expect(fetchMock.mock.calls.filter(([url]) => url.includes('/programs?')).length).toBeGreaterThanOrEqual(2));
    expect(fetchMock.mock.calls.some(([url]) => url.includes('/programs?') && url.includes('sort=-updated_at'))).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: 'Log out' }));

    await waitFor(() => expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument());
    expect(localStorage.getItem('sim_token')).toBeNull();
  });

  it('denies a student opening a management route directly', async () => {
    const student = { id: 5, name: 'Demo Student', email: 'student@example.com', role: 'student', status: 'active' };
    localStorage.setItem('sim_token', 'student-token');
    localStorage.setItem('sim_user', JSON.stringify(student));
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse({ success: true, data: student })));
    renderApp('/programs');

    expect(await screen.findByRole('heading', { name: 'Access denied' })).toBeInTheDocument();
    expect(screen.getByText('Your student role cannot open this page.')).toBeInTheDocument();
  });

  it('requests five students per page from the backend', async () => {
    const user = { id: 1, name: 'System Administrator', email: 'admin@example.com', role: 'administrator', status: 'active' };
    localStorage.setItem('sim_token', 'demo-token');
    localStorage.setItem('sim_user', JSON.stringify(user));
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('/auth/me')) return jsonResponse({ success: true, data: user });
      if (url.includes('/students?')) return jsonResponse({ success: true, data: [], meta: { current_page: 1, last_page: 20, total: 100, per_page: 5 } });
      return jsonResponse({ success: true, data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 100 } });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderApp('/students');

    expect(await screen.findByRole('region', { name: 'Student list controls' })).toBeInTheDocument();
    await waitFor(() => expect(fetchMock.mock.calls.some(([url]) => url.includes('/students?per_page=5&page=1'))).toBe(true));
    expect(await screen.findByText('Showing 1-5 of 100 · Page 1 of 20')).toBeInTheDocument();
  });

  it('loads a detail page directly from its URL', async () => {
    const user = { id: 1, name: 'System Administrator', email: 'admin@example.com', role: 'administrator', status: 'active' };
    localStorage.setItem('sim_token', 'demo-token');
    localStorage.setItem('sim_user', JSON.stringify(user));
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('/auth/me')) return jsonResponse({ success: true, data: user });
      if (url.endsWith('/programs/7')) return jsonResponse({ success: true, data: { id: 7, code: 'BSIT', name: 'Information Technology', status: 'active' } });
      return jsonResponse({ success: true, data: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderApp('/programs/7');

    expect(await screen.findByRole('heading', { name: 'Information Technology' })).toBeInTheDocument();
    expect(screen.getByText('BSIT')).toBeInTheDocument();
    expect(fetchMock.mock.calls.some(([url]) => url.endsWith('/programs/7'))).toBe(true);
  });

  it('shows every editable student profile field with the current record values', async () => {
    const user = { id: 1, name: 'System Administrator', email: 'admin@example.com', role: 'administrator', status: 'active' };
    const student = {
      id: 17,
      student_number: '2023300821',
      first_name: 'Baby Lyn',
      middle_name: 'M',
      last_name: 'Oinal',
      suffix: 'Jr.',
      birth_date: '2004-02-03',
      email: 'student@example.com',
      contact_number: '09171234567',
      address: 'Cebu City',
      program_id: 1,
      year_level: 4,
      status: 'active',
      program: { id: 1, code: 'BSIT', name: 'Bachelor of Science in Information Technology' },
    };
    localStorage.setItem('sim_token', 'demo-token');
    localStorage.setItem('sim_user', JSON.stringify(user));
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('/auth/me')) return jsonResponse({ success: true, data: user });
      if (url.includes('/students?')) return jsonResponse({ success: true, data: [student], meta: { current_page: 1, last_page: 1, total: 1, per_page: 5 } });
      if (url.endsWith('/students/17')) return jsonResponse({ success: true, data: student });
      if (url.includes('/programs?')) return jsonResponse({ success: true, data: [student.program] });
      return jsonResponse({ success: true, data: [] });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderApp('/students');

    fireEvent.click(await screen.findByRole('button', { name: 'Edit Baby Lyn Oinal' }));

    expect(await screen.findByRole('heading', { name: 'Edit Student' })).toBeInTheDocument();
    expect(screen.getByLabelText('Middle name')).toHaveValue('M');
    expect(screen.getByLabelText('Suffix')).toHaveValue('Jr.');
    expect(screen.getByLabelText('Birth date')).toHaveValue('2004-02-03');
    expect(screen.getByLabelText('Contact number')).toHaveValue('09171234567');
    expect(screen.getByLabelText('Address')).toHaveValue('Cebu City');
    expect(screen.getByLabelText('Student number *')).toHaveValue('2023300821');
    expect(screen.getByLabelText('Program *')).toHaveValue('1');
  });

  it('automatically refreshes a resource search after typing', async () => {
    const user = { id: 1, name: 'System Administrator', email: 'admin@example.com', role: 'administrator', status: 'active' };
    localStorage.setItem('sim_token', 'demo-token');
    localStorage.setItem('sim_user', JSON.stringify(user));
    const fetchMock = vi.fn(async (url) => {
      if (url.endsWith('/auth/me')) return jsonResponse({ success: true, data: user });
      return jsonResponse({ success: true, data: [], meta: { current_page: 1, last_page: 1, total: 0, per_page: 10 } });
    });
    vi.stubGlobal('fetch', fetchMock);
    renderApp('/programs');

    fireEvent.change(await screen.findByLabelText('Search programs'), { target: { value: 'computing' } });

    await waitFor(() => {
      expect(fetchMock.mock.calls.some(([url]) => url.includes('/programs?') && url.includes('search=computing'))).toBe(true);
    });
  });
});
