import { NAV_TABS, type Tab } from '../../app/tabs';
import { Icon } from './Icon';

export function NavBar({ tab, go }: { tab: Tab; go: (t: Tab) => void }) {
  return (
    <nav className="nav" aria-label="Navegação principal">
      {NAV_TABS.map(t => (
        <button key={t.key} className={t.key === tab ? 'on' : ''} aria-current={t.key === tab ? 'page' : undefined} onClick={() => go(t.key)}>
          <Icon name={t.key} />{t.label}
        </button>
      ))}
    </nav>
  );
}
