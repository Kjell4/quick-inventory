import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { LayoutDashboard, Package, ShoppingCart, User, LogOut, Menu, X, Briefcase, ChevronDown, ChevronRight, ListChecks, PlusCircle, FileText, BarChart2 } from 'lucide-react';
import { cn } from './ui/Shared';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, logout, currentPage, navigateTo } = useApp();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [productSectionOpen, setProductSectionOpen] = useState(
    currentPage === 'products' || currentPage === 'add-product'
  );

  if (!user) {
    return <div className="min-h-screen bg-gray-50">{children}</div>;
  }

  const isManager = user.role?.toLowerCase() === 'manager';
  const isProductPage = currentPage === 'products' || currentPage === 'add-product';

  const NavItem = ({ page, icon: Icon, label }: { page: string, icon: any, label: string }) => (
    <button
      onClick={() => {
        navigateTo(page);
        setIsMobileMenuOpen(false);
      }}
      className={cn(
        "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
        currentPage === page
          ? "bg-blue-50 text-blue-600 font-medium"
          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
      )}
    >
      <Icon size={20} />
      <span>{label}</span>
    </button>
  );

  const ProductSection = () => (
    <div>
      <button
        onClick={() => setProductSectionOpen(prev => !prev)}
        className={cn(
          "w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
          isProductPage
            ? "bg-blue-50 text-blue-600 font-medium"
            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
        )}
      >
        <Package size={20} />
        <span className="flex-1 text-left">Product Management</span>
        {productSectionOpen
          ? <ChevronDown size={16} className="flex-shrink-0" />
          : <ChevronRight size={16} className="flex-shrink-0" />
        }
      </button>

      {productSectionOpen && (
        <div className="ml-4 mt-1 space-y-1 border-l-2 border-gray-100 pl-3">
          <button
            onClick={() => { navigateTo('products'); setIsMobileMenuOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
              currentPage === 'products'
                ? "bg-blue-50 text-blue-600 font-medium"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            )}
          >
            <ListChecks size={16} />
            <span>Product List</span>
          </button>
          <button
            onClick={() => { navigateTo('add-product'); setIsMobileMenuOpen(false); }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-sm",
              currentPage === 'add-product'
                ? "bg-blue-50 text-blue-600 font-medium"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-800"
            )}
          >
            <PlusCircle size={16} />
            <span>Add Product</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar for Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-200 fixed h-full z-30">
        <div className="p-6 border-b border-gray-100 flex items-center gap-2">
          <div className="bg-blue-600 p-2 rounded-lg">
            <Briefcase className="text-white" size={24} />
          </div>
          <div>
            <h1 className="font-bold text-xl text-gray-900">QuickInventory</h1>
            <p className="text-xs text-gray-500 font-medium">MANAGEMENT SYSTEM</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <NavItem page="dashboard" icon={LayoutDashboard} label="Dashboard" />
          {isManager && <ProductSection />}
          <NavItem page="sales" icon={ShoppingCart} label="Daily Sales" />
          {isManager && <NavItem page="receipts"   icon={FileText}   label="Receipts"  />}
          {isManager && <NavItem page="analytics"  icon={BarChart2}  label="Analytics" />}
          <NavItem page="profile" icon={User} label="Profile" />
        </nav>

        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 mb-2">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold">
              {user.name[0].toUpperCase()}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
              <p className="text-xs text-gray-500 truncate">{user.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-white border-b border-gray-200 z-30 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="bg-blue-600 p-1.5 rounded-lg">
            <Briefcase className="text-white" size={20} />
          </div>
          <span className="font-bold text-lg">QuickInventory</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-gray-600">
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="md:hidden fixed inset-0 bg-white z-20 pt-16 px-4 pb-4 flex flex-col">
          <nav className="flex-1 space-y-2 overflow-y-auto">
            <NavItem page="dashboard" icon={LayoutDashboard} label="Dashboard" />
            {isManager && <ProductSection />}
            <NavItem page="sales" icon={ShoppingCart} label="Daily Sales" />
            {isManager && <NavItem page="receipts"   icon={FileText}   label="Receipts"  />}
            {isManager && <NavItem page="analytics"  icon={BarChart2}  label="Analytics" />}
            <NavItem page="profile" icon={User} label="Profile" />
          </nav>
          <div className="border-t border-gray-100 pt-4">
            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium"
            >
              <LogOut size={20} />
              Logout
            </button>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 min-h-screen">
        <div className="max-w-[1440px] mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
};
