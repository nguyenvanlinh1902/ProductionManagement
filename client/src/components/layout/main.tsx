
import React from 'react';
import { Sidebar } from './sidebar';

function Layout({ children }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar />
        <main className="flex-1 p-4 md:ml-64">
          <div className="md:pt-16">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default Layout;
