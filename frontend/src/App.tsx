import React from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { Layout } from './components/Layout';
import { LoginPage, SignupPage } from './components/Auth';
import { Dashboard } from './components/Dashboard';
import { ProductManagement } from './components/ProductManagement';
import { DailySales } from './components/DailySales';
import { ProfilePage } from './components/ProfilePage';

const AppContent: React.FC = () => {
  const { currentPage, user, loading } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-500">Загрузка...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (currentPage === 'signup') return <SignupPage />;
    return <LoginPage />;
  }

  return (
    <Layout>
      {currentPage === 'dashboard' && <Dashboard />}
      {currentPage === 'products' && <ProductManagement />}
      {currentPage === 'sales' && <DailySales />}
      {currentPage === 'profile' && <ProfilePage />}
    </Layout>
  );
};

const App: React.FC = () => (
  <AppProvider>
    <AppContent />
  </AppProvider>
);

export default App;
