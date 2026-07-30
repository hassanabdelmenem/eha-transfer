import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, Activity, Settings, Bed, PlusCircle } from 'lucide-react';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
}

interface SidebarProps {
  navItems: NavItem[];
  isDoctor: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ navItems, isDoctor }) => {
  const location = useLocation();

  return (
    <aside className="w-60 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex-col p-4 shrink-0 hidden sm:flex">
      <nav className="space-y-1">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`px-2 py-3 flex items-center gap-3 transition-colors ${
                isActive 
                  ? 'bg-blue-50 text-blue-900 border-r-4 border-blue-900' 
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 border-r-4 border-transparent'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-sm font-bold uppercase">{item.name}</span>
            </Link>
          );
        })}
        {isDoctor && (
          <Link
            to="/referrals/new"
            className={`px-2 py-3 flex items-center gap-3 transition-colors ${
              location.pathname.startsWith('/referrals/new')
                ? 'bg-blue-50 text-blue-900 border-r-4 border-blue-900' 
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:bg-slate-950 border-r-4 border-transparent'
            }`}
          >
            <PlusCircle className="w-5 h-5" />
            <span className="text-sm font-bold uppercase">New Referral</span>
          </Link>
        )}
      </nav>
    </aside>
  );
};
