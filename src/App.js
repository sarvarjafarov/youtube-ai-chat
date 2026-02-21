import { useState } from 'react';
import Auth from './components/Auth';
import Chat from './components/Chat';
import './App.css';

function App() {
  const [user, setUser] = useState(() => localStorage.getItem('chatapp_user'));
  const [firstName, setFirstName] = useState(() => localStorage.getItem('chatapp_firstName') || '');
  const [lastName, setLastName] = useState(() => localStorage.getItem('chatapp_lastName') || '');

  const handleLogin = (username, fName = '', lName = '') => {
    localStorage.setItem('chatapp_user', username);
    localStorage.setItem('chatapp_firstName', fName);
    localStorage.setItem('chatapp_lastName', lName);
    setUser(username);
    setFirstName(fName);
    setLastName(lName);
  };

  const handleLogout = () => {
    localStorage.removeItem('chatapp_user');
    localStorage.removeItem('chatapp_firstName');
    localStorage.removeItem('chatapp_lastName');
    setUser(null);
    setFirstName('');
    setLastName('');
  };

  if (user) {
    return <Chat username={user} firstName={firstName} lastName={lastName} onLogout={handleLogout} />;
  }
  return <Auth onLogin={handleLogin} />;
}

export default App;
