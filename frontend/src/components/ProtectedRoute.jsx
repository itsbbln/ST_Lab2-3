import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { isAuthenticated, loading, user } = useAuth();

  if (loading) {
    return <div className="page-shell"><div className="loading-box">Checking session...</div></div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return (
      <main className="state-page">
        <h1>Access denied</h1>
        <p>Your {user?.role || 'account'} role cannot open this page.</p>
        <Link className="secondary-btn" to="/dashboard">Return to dashboard</Link>
      </main>
    );
  }

  return children;
}
