import React, { useState, useEffect } from 'react';
import { LogIn, ShieldCheck, User, LogOut, Coffee, Lock } from 'lucide-react';
import StudentView from './components/StudentView';
import AdminDashboard from './components/AdminDashboard';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const ADMIN_PASSWORD = 'Esec@2026'; // Hardcoded admin password as requested

export default function App() {
  const [currentView, setCurrentView] = useState('student'); // student, admin
  const [student, setStudent] = useState(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  
  // Student Login form states
  const [rollNo, setRollNo] = useState('');
  const [pin, setPin] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // Admin Login form states
  const [adminInputPassword, setAdminInputPassword] = useState('');
  const [adminLoginError, setAdminLoginError] = useState('');

  useEffect(() => {
    // Check if student session exists in localStorage
    const savedStudent = localStorage.getItem('mess_student_session');
    if (savedStudent) {
      try {
        setStudent(JSON.parse(savedStudent));
      } catch (e) {
        localStorage.removeItem('mess_student_session');
      }
    }

    // Check if admin session exists in sessionStorage
    const adminSession = sessionStorage.getItem('mess_admin_session');
    if (adminSession === 'true') {
      setIsAdminAuthenticated(true);
    }
  }, []);

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoggingIn(true);

    if (!rollNo.trim() || !pin.trim()) {
      setLoginError('Please enter both Roll Number and PIN.');
      setLoggingIn(false);
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roll_no: rollNo.trim(), pin: pin.trim() })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Invalid credentials.');
      }

      // Success
      localStorage.setItem('mess_student_session', JSON.stringify(data.student));
      setStudent(data.student);
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('mess_student_session');
    setStudent(null);
    setRollNo('');
    setPin('');
  };

  const handleAdminLoginSubmit = (e) => {
    e.preventDefault();
    setAdminLoginError('');

    if (adminInputPassword === ADMIN_PASSWORD) {
      sessionStorage.setItem('mess_admin_session', 'true');
      setIsAdminAuthenticated(true);
      setAdminInputPassword('');
    } else {
      setAdminLoginError('Incorrect Admin Password.');
    }
  };

  const handleAdminLogout = () => {
    sessionStorage.removeItem('mess_admin_session');
    setIsAdminAuthenticated(false);
    setAdminInputPassword('');
  };

  return (
    <div className="app-container">
      {/* Navbar Header */}
      <header className="navbar">
        <div className="nav-brand">
          <Coffee size={24} style={{ color: 'var(--accent-primary)' }} />
          <span>MessSync</span>
        </div>

        <div className="nav-controls">
          <div className="nav-toggle-group">
            <button
              className={`nav-toggle-btn ${currentView === 'student' ? 'active' : ''}`}
              onClick={() => setCurrentView('student')}
            >
              Student Portal
            </button>
            <button
              className={`nav-toggle-btn ${currentView === 'admin' ? 'active' : ''}`}
              onClick={() => setCurrentView('admin')}
            >
              Admin Dashboard
            </button>
          </div>

          {student && currentView === 'student' && (
            <div className="user-info">
              <span className="user-tag" title={`Room ${student.room_no}`}>
                <User size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                {student.name} ({student.roll_no})
              </span>
              <button className="logout-btn" onClick={handleLogout} title="Log Out Student">
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}

          {isAdminAuthenticated && currentView === 'admin' && (
            <div className="user-info">
              <span className="user-tag" style={{ borderColor: 'rgba(99, 102, 241, 0.3)', color: 'var(--accent-secondary)' }}>
                <ShieldCheck size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                Authorized Admin
              </span>
              <button className="logout-btn" onClick={handleAdminLogout} title="Log Out Admin">
                <LogOut size={14} /> Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="content-wrapper">
        {currentView === 'student' ? (
          student ? (
            <StudentView student={student} onLogout={handleLogout} />
          ) : (
            <div className="login-container">
              <div className="glass-card login-card">
                <div className="login-header">
                  <div className="login-icon">
                    <LogIn size={28} style={{ color: '#fff' }} />
                  </div>
                  <h2>Student Login</h2>
                  <p>Access today's menu and submit daily reviews.</p>
                </div>

                {loginError && (
                  <div className="alert-error">
                    <ShieldCheck size={20} style={{ color: 'var(--danger)' }} />
                    <span>{loginError}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit}>
                  <div className="form-group">
                    <label htmlFor="roll-no">Roll Number</label>
                    <div className="input-icon-wrapper">
                      <User className="input-icon" size={18} />
                      <input
                        type="text"
                        id="roll-no"
                        className="form-input"
                        placeholder="Enter Roll Number"
                        value={rollNo}
                        onChange={(e) => setRollNo(e.target.value)}
                        autoComplete="username"
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="pin">PIN Code</label>
                    <div className="input-icon-wrapper">
                      <ShieldCheck className="input-icon" size={18} />
                      <input
                        type="password"
                        id="pin"
                        className="form-input"
                        placeholder="Enter PIN"
                        value={pin}
                        onChange={(e) => setPin(e.target.value)}
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    disabled={loggingIn}
                    style={{ marginTop: '1rem' }}
                  >
                    {loggingIn ? 'Authenticating...' : 'Sign In'}
                  </button>
                </form>
              </div>
            </div>
          )
        ) : (
          isAdminAuthenticated ? (
            <AdminDashboard />
          ) : (
            <div className="login-container">
              <div className="glass-card login-card">
                <div className="login-header">
                  <div className="login-icon" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)' }}>
                    <Lock size={28} style={{ color: '#fff' }} />
                  </div>
                  <h2>Admin Authentication</h2>
                  <p>Authorized access only. Enter password to view dashboard.</p>
                </div>

                {adminLoginError && (
                  <div className="alert-error">
                    <ShieldCheck size={20} style={{ color: 'var(--danger)' }} />
                    <span>{adminLoginError}</span>
                  </div>
                )}

                <form onSubmit={handleAdminLoginSubmit}>
                  <div className="form-group">
                    <label htmlFor="admin-password">Admin Password</label>
                    <div className="input-icon-wrapper">
                      <Lock className="input-icon" size={18} />
                      <input
                        type="password"
                        id="admin-password"
                        className="form-input"
                        placeholder="Enter Password"
                        value={adminInputPassword}
                        onChange={(e) => setAdminInputPassword(e.target.value)}
                        autoComplete="current-password"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="btn-primary"
                    style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', marginTop: '1rem' }}
                  >
                    Authenticate
                  </button>
                </form>
              </div>
            </div>
          )
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>Hostel Mess Menu & Feedback Analytics Dashboard &copy; 2026.</p>
      </footer>
    </div>
  );
}
