import { NavLink } from 'react-router';

export default function TabBar() {
  return (
    <nav className="tabs" aria-label="Main">
      <NavLink to="/" end>Home</NavLink>
      <NavLink to="/group">Group</NavLink>
      <NavLink to="/history">History</NavLink>
    </nav>
  );
}
