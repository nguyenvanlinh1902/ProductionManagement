import React from 'react';

function Layout({ children }) {
  return (
    <div className="flex flex-col md:flex-row min-h-screen">
      {/* Sidebar (Left on Desktop, Bottom on Mobile) */}
      <aside className="bg-gray-200 p-4 md:w-64 hidden md:block">
        {/* Sidebar content here */}
      </aside>
      <main className="p-4 md:ml-64 min-h-screen">
        {children}
      </main>
    </div>
  );
}

export default Layout;