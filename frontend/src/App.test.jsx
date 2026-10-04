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
    expect(await screen.findByRole('button', { name: 'Add program' })).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(screen.getByRole('button', { name: 'Add program' }));
    expect(await screen.findByRole('heading', { name: 'Add Program' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Close form' }));
    await waitFor(() => expect(screen.queryByRole('heading', { name: 'Add Program' })).not.toBeInTheDocument());

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
});
