import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Button, Input, Card } from './ui/Shared';
import { Briefcase, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export const LoginPage: React.FC = () => {
  const { login, navigateTo, setError } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLocalError('');
    try {
      await login(username, password);
    } catch (err: any) {
      setLocalError(err.message || 'Ошибка входа');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/30 blur-[100px] animate-pulse" />
        <div className="absolute top-[40%] -right-[10%] w-[40%] h-[40%] rounded-full bg-purple-500/30 blur-[100px] animate-pulse delay-1000" />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        className="w-full max-w-md relative z-10"
      >
        <Card className="p-8 backdrop-blur-sm bg-white/95 shadow-2xl border-white/20">
          <div className="text-center mb-8">
            <div className="mx-auto bg-blue-600 w-12 h-12 rounded-xl flex items-center justify-center mb-4 shadow-lg shadow-blue-600/30">
              <Briefcase className="text-white" size={24} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Quick Inventory</h2>
            <p className="text-gray-500 mt-2">Войдите в панель управления</p>
          </div>

          {localError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {localError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <Input
              label="Имя пользователя"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700">Пароль</label>
              <Input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            <Button type="submit" className="w-full" size="lg" isLoading={loading}>
              Войти <ArrowRight size={18} />
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Нет аккаунта?{' '}
            <button onClick={() => navigateTo('signup')} className="text-blue-600 font-medium hover:text-blue-700 hover:underline">
              Создать аккаунт
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};

export const SignupPage: React.FC = () => {
  const { signup, navigateTo } = useApp();
  const [role, setRole] = useState<'manager' | 'seller'>('seller');
  const [loading, setLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const [form, setForm] = useState({
    username: '', first_name: '', last_name: '', email: '', password: '', confirm: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (form.password !== form.confirm) {
      setLocalError('Пароли не совпадают');
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
        role,
      });
    } catch (err: any) {
      setLocalError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [field]: e.target.value }));

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-600 via-indigo-700 to-purple-800 p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -bottom-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/30 blur-[100px] animate-pulse" />
        <div className="absolute top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/30 blur-[100px] animate-pulse delay-700" />
      </div>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}
        className="w-full max-w-lg relative z-10"
      >
        <Card className="p-8 backdrop-blur-sm bg-white/95 shadow-2xl border-white/20">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Создать аккаунт</h2>
            <p className="text-gray-500 mt-2">Зарегистрируйтесь для управления складом</p>
          </div>

          {localError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {localError}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input label="Имя пользователя" placeholder="myusername" value={form.username} onChange={set('username')} required />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Имя" placeholder="Иван" value={form.first_name} onChange={set('first_name')} />
              <Input label="Фамилия" placeholder="Иванов" value={form.last_name} onChange={set('last_name')} />
            </div>
            <Input label="Email" type="email" placeholder="ivan@example.com" value={form.email} onChange={set('email')} />
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Роль</label>
              <div className="grid grid-cols-2 gap-3">
                {(['manager', 'seller'] as const).map(r => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`p-3 text-sm font-medium rounded-lg border text-center transition-all ${role === r ? 'bg-blue-50 border-blue-500 text-blue-700 ring-1 ring-blue-500' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                    {r === 'manager' ? 'Менеджер' : 'Продавец'}
                  </button>
                ))}
              </div>
            </div>
            <Input label="Пароль" type="password" placeholder="Минимум 8 символов" value={form.password} onChange={set('password')} required />
            <Input label="Подтвердить пароль" type="password" placeholder="Повторите пароль" value={form.confirm} onChange={set('confirm')} required />
            <Button type="submit" className="w-full mt-2" size="lg" isLoading={loading}>
              Зарегистрироваться
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            Уже есть аккаунт?{' '}
            <button onClick={() => navigateTo('login')} className="text-blue-600 font-medium hover:text-blue-700 hover:underline">
              Войти
            </button>
          </div>
        </Card>
      </motion.div>
    </div>
  );
};
