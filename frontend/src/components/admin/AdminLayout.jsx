import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminHeader from './AdminHeader';
import AdminSidebar from './AdminSidebar';

export default function AdminLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  return <div className="min-h-screen bg-[#F5F7FA] text-[#172033]">
    <AdminSidebar collapsed={collapsed} drawerOpen={drawerOpen} onClose={() => setDrawerOpen(false)} onToggleCollapse={() => setCollapsed((value) => !value)} />
    <div className={`min-h-screen transition-[margin] duration-200 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-[260px]'}`}>
      <AdminHeader onOpenDrawer={() => setDrawerOpen(true)} />
      <main className="mx-auto max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8"><Outlet /></main>
    </div>
  </div>;
}
