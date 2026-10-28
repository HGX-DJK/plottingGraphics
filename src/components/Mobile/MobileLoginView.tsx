import React, { useState } from 'react';
import { User } from '../../types';
import { authService, PRESET_USERS } from '../../services/authService';
import {
  Shield,
  User as UserIcon,
  Lock,
  ArrowRight,
  Fingerprint,
  Zap,
} from 'lucide-react';

interface MobileLoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const MobileLoginView: React.FC<MobileLoginViewProps> = ({
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

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
    <div className="fixed inset-0 z-50 bg-gray-950 flex flex-col justify-between safe-top safe-bottom p-6 overflow-y-auto">
      {/* 顶部标题与战术徽标 */}
      <div className="pt-8 text-center flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-xl shadow-blue-500/30">
            <Shield className="w-9 h-9 text-white" />
          </div>
          <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-gray-950 flex items-center justify-center text-[10px]">
            ⚡
          </span>
        </div>

        <h1 className="text-xl font-black text-white tracking-wider">
          GeoPlot GIS 移动标绘系统
        </h1>
        <p className="text-xs text-blue-400/80 mt-1 font-medium">
          通用空间数据采集 • 矢量标绘 • 多图层协同 (MapTalks GL)
        </p>
        <span className="text-[10px] text-gray-500 mt-0.5">
          标准 GIS 矢量要素 • 属性表与量算 • 纯前端免后端
        </span>
      </div>

      {/* 核心登录表单与快捷通道 */}
      <div className="my-6 max-w-sm mx-auto w-full space-y-5">
        {/* 预设账号快速直登 */}
        <div>
          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>一键快捷授权登录</span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {PRESET_USERS.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => handleQuickLogin(u)}
                className="p-3 rounded-2xl border border-gray-800 bg-gray-900/90 active:bg-blue-950/40 active:border-blue-500 text-center transition flex flex-col items-center"
              >
                <span className="text-2xl mb-1">{u.avatar}</span>
                <span className="text-xs font-bold text-gray-200 truncate w-full">
                  {u.displayName.split(' ')[0]}
                </span>
                <span className="text-[9px] text-gray-500 mt-0.5 truncate w-full">
                  {u.roleName.split('/')[0]}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-gray-800 w-full" />
          <span className="bg-gray-950 px-3 text-[10px] text-gray-500 uppercase tracking-wider">
            或账号密码登录
          </span>
        </div>

        {/* 输入框 */}
        <form onSubmit={handleCustomLogin} className="space-y-3">
          {errorMsg && (
            <div className="p-2.5 bg-red-950/50 border border-red-800 rounded-xl text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <div>
            <div className="relative">
              <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="用户名 (如 admin / analyst)"
                className="w-full pl-10 pr-3 py-3 bg-gray-900 border border-gray-800 rounded-2xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="访问凭证 / 密码"
                className="w-full pl-10 pr-3 py-3 bg-gray-900 border border-gray-800 rounded-2xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 active:from-blue-500 active:to-indigo-500 text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition"
          >
            <span>{loading ? '正在验证身份...' : '进入移动标绘系统'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 底部微认证说明 */}
      <div className="text-center pb-2 text-[10px] text-gray-500">
        <span>已启用免后端本地离线安全沙箱 • v1.0.0 Mobile</span>
      </div>
    </div>
  );
};
