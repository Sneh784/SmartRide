import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import CustomerHeader from './CustomerHeader';
import CustomerSidebar from './CustomerSidebar';

export default function CustomerLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033]">
      <CustomerSidebar
        collapsed={collapsed}
        drawerOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />
      <div className={`min-h-screen transition-[margin] duration-200 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-[260px]'}`}>
        <CustomerHeader onOpenDrawer={() => setDrawerOpen(true)} />
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
