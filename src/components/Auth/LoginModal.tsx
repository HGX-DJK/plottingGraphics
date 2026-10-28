import React, { useState } from 'react';
import { User } from '../../types';
import { authService, PRESET_USERS } from '../../services/authService';
import {
  ShieldCheck,
  User as UserIcon,
  Lock,
  ArrowRight,
  Sparkles,
  Command,
} from 'lucide-react';

interface LoginModalProps {
  isOpen: boolean;
  onLoginSuccess: (user: User) => void;
  onClose?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onLoginSuccess,
  onClose,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('请输入用户名');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    const res = await authService.login(username, password);
    setLoading(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setErrorMsg(res.message || '登录失败');
    }
  };

  const handleQuickLogin = (presetUser: User) => {
    const user = authService.quickLogin(presetUser.id);
    onLoginSuccess(user);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/80 backdrop-blur-md p-4">
      {/* 科技感主弹窗 */}
      <div className="w-full max-w-lg bg-gray-900 border border-blue-500/30 rounded-2xl shadow-2xl shadow-blue-950/50 overflow-hidden relative">
        {/* 顶部科技发光边条 */}
        <div className="h-1 bg-gradient-to-r from-blue-600 via-cyan-400 to-indigo-600" />

        <div className="p-8">
          {/* 系统标头 */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/30 text-blue-400 mb-3 shadow-inner">
              <Command className="w-8 h-8" />
            </div>
            <h1 className="text-xl font-bold tracking-wider text-white">
              标绘系统
            </h1>
            <p className="text-xs text-gray-400 mt-1">
              矢量标绘 • 多图层协同推演平台
            </p>
          </div>

          {/* 快速一键进入 (测试/指挥模式) */}
          <div className="mb-6">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>快速一键授权登录 (预设测试账号)</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {PRESET_USERS.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => handleQuickLogin(u)}
                  className="flex flex-col items-center p-3 rounded-xl border border-gray-800 bg-gray-950/60 hover:bg-blue-950/30 hover:border-blue-500/50 text-center transition group"
                >
                  <span className="text-xl mb-1 group-hover:scale-110 transition">
                    {u.avatar}
                  </span>
                  <span className="text-xs font-semibold text-gray-200 group-hover:text-blue-300">
                    {u.displayName.split(' ')[0]}
                  </span>
                  <span className="text-[10px] text-gray-500 group-hover:text-gray-400 mt-0.5 truncate w-full">
                    {u.roleName.split('/')[0]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="relative flex items-center justify-center my-6">
            <div className="border-t border-gray-800 w-full" />
            <span className="bg-gray-900 px-3 text-[11px] text-gray-500 uppercase tracking-wider">
              或使用自定义账号
            </span>
          </div>

          {/* 自定义账号密码登录表单 */}
          <form onSubmit={handleCustomLogin} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-red-950/50 border border-red-800/80 rounded-lg text-xs text-red-300">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                用户名
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin / analyst / operator 或任意用户名"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                访问凭证 / 密码
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="输入密码 (本地免后端模拟认证)"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-950 border border-gray-800 rounded-xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-2.5 px-4 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-xl text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition disabled:opacity-50"
            >
              <span>{loading ? '正在验证态势权限...' : '进入标绘协同系统'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* 底部信息栏 */}
        <div className="px-8 py-3 bg-gray-950/90 border-t border-gray-800/80 flex items-center justify-between text-[11px] text-gray-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-500" />
            <span>本地 LocalStorage 隔离存储已开启</span>
          </span>
          <span>v1.0.0 Pro</span>
        </div>
      </div>
    </div>
  );
};
