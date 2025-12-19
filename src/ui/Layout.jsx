import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Plane, Users, Settings as SettingsIcon, Calendar, FileText } from 'lucide-react';
import { cn } from '../lib/utils';
import { USCGLogo } from '../components/USCGLogo';

const NAV_ITEMS = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Deployments', path: '/deployments', icon: Plane },
    { label: 'Calendar', path: '/calendar', icon: Calendar },
    { label: 'Billing', path: '/billing', icon: FileText },
    { label: 'Invoices', path: '/invoices', icon: FileText },
    { label: 'Labor', path: '/labor', icon: Users },
    { label: 'Settings', path: '/settings', icon: SettingsIcon },
];

export default function Layout({ children }) {
    const location = useLocation();

    return (
        <div className="flex h-screen bg-slate-950">
            {/* Sidebar */}
            <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col">
                <div className="p-6 border-b border-slate-800">
                    <h1 className="text-xl font-bold text-slate-100 flex items-center gap-3">
                        <USCGLogo className="h-8 w-8" />
                        <span className="text-lg">USCG COCO</span>
                    </h1>
                </div>

                <nav className="flex-1 p-4 space-y-1">
                    {NAV_ITEMS.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.path;
                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={cn(
                                    "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-blue-900/50 text-blue-400"
                                        : "text-slate-400 hover:bg-slate-800 hover:text-slate-100"
                                )}
                            >
                                <Icon className="h-5 w-5" />
                                {item.label}
                            </Link>
                        );
                    })}
                </nav>

                <div className="p-4 border-t border-slate-800">
                    <div className="flex items-center gap-3 px-4 py-2">
                        <div className="h-8 w-8 rounded-full bg-blue-900/50 flex items-center justify-center text-blue-400 font-bold text-xs border border-blue-800">
                            US
                        </div>
                        <div className="text-sm">
                            <p className="font-medium text-slate-200">User</p>
                            <p className="text-xs text-slate-500">Admin</p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto bg-slate-950">
                <div className="p-8 max-w-7xl mx-auto">
                    {children}
                </div>
            </main>
        </div>
    );
}
