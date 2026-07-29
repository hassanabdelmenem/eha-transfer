const fs = require('fs');
let content = fs.readFileSync('src/components/layout/AppLayout.tsx', 'utf8');

content = content.replace(
  "import { Bell, LogOut, Activity, Users, PlusCircle, LayoutDashboard, BookOpen, Settings, Moon, Sun, Bed } from 'lucide-react';", 
  "import { Bell, LogOut, Activity, Users, PlusCircle, LayoutDashboard, BookOpen, Settings, Moon, Sun, Bed, Cloud, Database } from 'lucide-react';"
);

const targetStatus = `          {!isOnline && (
            <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded text-white text-xs font-bold uppercase tracking-wide">
              <WifiOff className="w-4 h-4" />
              Offline Mode
              {pendingSyncCount > 0 && <span className="bg-red-500 px-1.5 rounded">{pendingSyncCount} pending</span>}
            </div>
          )}
          {isOnline && pendingSyncCount > 0 && (
            <div className="flex items-center gap-2 bg-blue-500/20 px-3 py-1.5 rounded text-white text-xs font-bold uppercase tracking-wide">
              <RefreshCw className="w-4 h-4 animate-spin" />
              Syncing {pendingSyncCount}...
            </div>
          )}`;
          
const newStatus = `          {!isOnline && (
            <div className="flex items-center gap-2 bg-red-500/20 px-3 py-1.5 rounded text-red-100 text-[10px] font-bold uppercase tracking-wide" title="IndexedDB Offline Mode active">
              <WifiOff className="w-3.5 h-3.5" />
              Offline
              {pendingSyncCount > 0 && <span className="bg-red-500/50 px-1.5 py-0.5 rounded ml-1">{pendingSyncCount} pending upload</span>}
            </div>
          )}
          {isOnline && pendingSyncCount > 0 && (
            <div className="flex items-center gap-2 bg-amber-500/20 px-3 py-1.5 rounded text-amber-100 text-[10px] font-bold uppercase tracking-wide" title="Uploading IndexedDB data to server">
              <Database className="w-3.5 h-3.5 animate-pulse" />
              Pending Upload ({pendingSyncCount})
            </div>
          )}
          {isOnline && pendingSyncCount === 0 && (
            <div className="flex items-center gap-2 bg-emerald-500/20 px-3 py-1.5 rounded text-emerald-100 text-[10px] font-bold uppercase tracking-wide" title="IndexedDB fully synced with server">
              <Cloud className="w-3.5 h-3.5" />
              Database Synced
            </div>
          )}`;

content = content.replace(targetStatus, newStatus);
fs.writeFileSync('src/components/layout/AppLayout.tsx', content);
