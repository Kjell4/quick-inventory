import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input } from './ui/Shared';
import { Shield, LogOut } from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, logout } = useApp();
  const [saved, setSaved] = useState(false);

  if (!user) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      <Card className="p-8">
        <div className="flex flex-col sm:flex-row items-center gap-6 mb-8">
          <div className="w-24 h-24 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-3xl font-bold">
            {user.name[0]?.toUpperCase()}
          </div>
          <div className="text-center sm:text-left space-y-1">
            <h2 className="text-2xl font-bold text-gray-900">{user.name}</h2>
            <p className="text-gray-500">@{user.username}</p>
            <p className="text-gray-400 text-sm">{user.email}</p>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium border border-blue-100 mt-2">
              <Shield size={12} /> {user.role === 'manager' || user.role === 'Manager' ? 'Manager' : 'Seller'}
            </span>
          </div>
          <div className="sm:ml-auto">
            <Button variant="danger" onClick={logout}>
              <LogOut size={18} /> Sign Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t border-gray-100 pt-8">
          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 mb-4">Personal Details</h3>
            <form onSubmit={handleSave} className="space-y-4">
              <Input label="Username" defaultValue={user.username} disabled />
              <Input label="Email" defaultValue={user.email} type="email" />
              {saved && <p className="text-green-600 text-sm">Saved ✓</p>}
              <Button type="submit" className="mt-2">Save</Button>
            </form>
          </div>

          <div className="space-y-4">
            <h3 className="font-bold text-gray-900 mb-4">Security</h3>
            <Input label="Current Password" type="password" placeholder="••••••••" />
            <Input label="New Password" type="password" placeholder="••••••••" />
            <Button variant="secondary" className="mt-2">Change Password</Button>
          </div>
        </div>
      </Card>

      <Card className="p-6 bg-blue-50 border-blue-100">
        <div className="flex gap-4">
          <div className="bg-blue-100 p-3 rounded-full h-fit"><Shield className="text-blue-600" size={24} /></div>
          <div>
            <h3 className="font-bold text-blue-900">Role Permissions: {user.role === 'manager' || user.role === 'Manager' ? 'Manager' : 'Seller'}</h3>
            <p className="text-blue-700 text-sm mt-1">
              {(user.role === 'manager' || user.role === 'Manager')
                ? 'Full access: product management, analytics, closing the day, deleting sales.'
                : 'Access to recording sales and viewing daily statistics.'}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};
