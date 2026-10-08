import { Link, Navigate, Route, Routes } from 'react-router';
import { useAuth } from './auth.jsx';
import SlowBanner from './components/SlowBanner.jsx';
import TabBar from './components/TabBar.jsx';
import Group from './screens/Group.jsx';
import History from './screens/History.jsx';
import Home from './screens/Home.jsx';
import PactSetup from './screens/PactSetup.jsx';
import Settings from './screens/Settings.jsx';
import Welcome from './screens/Welcome.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <>
        <SlowBanner />
        <p className="splash">Proof of Grass</p>
      </>
    );
  }

  if (!user) {
    return (
      <>
        <SlowBanner />
        <Welcome />
      </>
    );
  }

  return (
    <div className="app">
      <SlowBanner />
      <header className="top">
        <Link to="/" className="brand">Proof of Grass</Link>
        <Link to="/settings" className="icon-link" aria-label="Settings">⚙</Link>
      </header>
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/setup" element={<PactSetup />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/group" element={<Group />} />
          <Route path="/history" element={<History />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <TabBar />
    </div>
  );
}
