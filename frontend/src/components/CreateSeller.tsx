import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Card, Button, Input } from './ui/Shared';
import { UserPlus, CheckCircle, Users } from 'lucide-react';
import { motion } from 'motion/react';

export const CreateSeller: React.FC = () => {
  const { signup, user } = useApp();
  const isManager = user?.role?.toLowerCase() === 'manager';

  const emptyForm = {
    username: '', first_name: '', last_name: '', email: '', password: '', confirm: '',
  };

  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  if (!isManager) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-center">
        <div className="bg-red-100 p-4 rounded-full mb-4">
          <UserPlus className="text-red-600" size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">Access Denied</h2>
        <p className="text-gray-500 mt-2 max-w-md">Only managers can create seller accounts.</p>
      </div>
    );
  }

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (form.password !== form.confirm) {
      setError('Passwords do not match');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      await signup({
        username: form.username,
        password: form.password,
        email: form.email,
        first_name: form.first_name,
        last_name: form.last_name,
        role: 'seller',
      });
      setSuccess(`Seller account "${form.username}" created successfully!`);
      setForm(emptyForm);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Create Seller Account</h1>
        <p className="text-gray-500 mt-1">Add a new seller to your team</p>
      </div>

      {/* Success banner */}
      {success && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700"
        >
          <CheckCircle size={20} className="flex-shrink-0" />
          <span className="font-medium">{success}</span>
        </motion.div>
      )}

      <Card className="p-8 border-t-4 border-t-blue-600">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-blue-100 p-2.5 rounded-xl">
            <Users className="text-blue-600" size={20} />
          </div>
          <div>
            <h2 className="font-bold text-gray-900">Seller Details</h2>
            <p className="text-sm text-gray-500">The new account will have Seller role by default</p>
          </div>
        </div>

        {error && (
          <div className="mb-5 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <Input
            label="Username"
            placeholder="seller_username"
            value={form.username}
            onChange={set('username')}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="John"
              value={form.first_name}
              onChange={set('first_name')}
            />
            <Input
              label="Last Name"
              placeholder="Smith"
              value={form.last_name}
              onChange={set('last_name')}
            />
          </div>

          <Input
            label="Email"
            type="email"
            placeholder="seller@example.com"
            value={form.email}
            onChange={set('email')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Password"
              type="password"
              placeholder="Minimum 8 characters"
              value={form.password}
              onChange={set('password')}
              required
            />
            <Input
              label="Confirm Password"
              type="password"
              placeholder="Repeat password"
              value={form.confirm}
              onChange={set('confirm')}
              required
            />
          </div>

          {/* Role badge — fixed, not editable */}
          <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-700">Role</p>
              <p className="text-xs text-gray-400 mt-0.5">Cannot be changed here</p>
            </div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full text-sm font-medium">
              <Users size={13} /> Seller
            </span>
          </div>

          <Button type="submit" className="w-full" size="lg" isLoading={loading}>
            <UserPlus size={18} /> Create Seller Account
          </Button>
        </form>
      </Card>
    </div>
  );
};
