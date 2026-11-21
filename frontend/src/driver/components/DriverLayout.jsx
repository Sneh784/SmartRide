import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import DriverHeader from './DriverHeader';
import DriverSidebar from './DriverSidebar';

export default function DriverLayout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  return (
    <div className="min-h-screen bg-[#F5F7FA] text-[#172033]">
      <DriverSidebar
        collapsed={collapsed}
        drawerOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onToggleCollapse={() => setCollapsed((value) => !value)}
      />
      <div className={`min-h-screen transition-[margin] duration-200 ${collapsed ? 'lg:ml-[88px]' : 'lg:ml-[270px]'}`}>
        <DriverHeader onOpenDrawer={() => setDrawerOpen(true)} />
        <main className="mx-auto max-w-[1500px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
