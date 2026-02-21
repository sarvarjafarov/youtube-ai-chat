import { useState } from 'react';
import { createUser, findUser } from '../services/mongoApi';
import './Auth.css';

export default function Auth({ onLogin }) {
  const [mode, setMode] = useState('login');
  const [username, setUsername] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const name = username.trim().toLowerCase();
      if (mode === 'create') {
        await createUser(name, password, email.trim(), firstName.trim(), lastName.trim());
        setError('');
        setMode('login');
        setPassword('');
        setEmail('');
        setFirstName('');
        setLastName('');
      } else {
        const user = await findUser(name, password);
        if (!user) throw new Error('User not found or invalid password');
        onLogin(user.username, user.firstName, user.lastName);
      }
    } catch (err) {
      try {
        const j = JSON.parse(err.message);
        setError(j.error || err.message);
      } catch {
        setError(err.message || 'Something went wrong');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <div className="auth-header">
          <h1>Chat</h1>
          <p className="auth-subtitle">Yale · Modern</p>
        </div>
        <form onSubmit={handleSubmit} className="auth-form">
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
            autoComplete="username"
          />
          {mode === 'create' && (
            <>
              <input
                type="text"
                placeholder="First Name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                autoComplete="given-name"
              />
              <input
                type="text"
                placeholder="Last Name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
                autoComplete="family-name"
              />
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </>
          )}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
          />
          {error && (
        <p className="auth-error">
          {error}
          {error.includes('already exists') && ' Try logging in instead.'}
        </p>
      )}
          <button type="submit" disabled={loading}>
            {loading ? '...' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
        </form>
        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode((m) => (m === 'login' ? 'create' : 'login'));
            setError('');
          }}
        >
          {mode === 'login' ? 'Create an account' : 'Already have an account? Log in'}
        </button>
      </div>
    </div>
  );
}
