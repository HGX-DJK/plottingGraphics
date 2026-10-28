import React, { useState } from 'react';
import { User } from '../../types';
import { authService } from '../../services/authService';
import {
  User as UserIcon,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Compass,
  Sparkles,
  Loader2,
  XCircle,
} from 'lucide-react';

interface MobileLoginViewProps {
  onLoginSuccess: (user: User) => void;
}

export const MobileLoginView: React.FC<MobileLoginViewProps> = ({
  onLoginSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleCustomLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      setErrorMsg('请输入有效的工程账号或姓名');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    const res = await authService.login(username, password);
    setLoading(false);

    if (res.success && res.user) {
      onLoginSuccess(res.user);
    } else {
      setErrorMsg(res.message || '账号或凭证有误，请核验后重试');
    }
  };

  const fillCredential = (name: string) => {
    setUsername(name);
    setPassword('admin123');
    setErrorMsg('');
  };

  return (
    <div className="relative w-full h-full max-h-screen bg-gray-950 flex flex-col items-center justify-between safe-top safe-bottom px-5 py-6 sm:py-8 overflow-hidden select-none">
      {/* 顶部背景微光氛围装饰 */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 主体居中容器 (按黄金比例呼吸留白，彻底解决顶部贴边与内部拥挤) */}
      <div className="max-w-sm w-full mx-auto flex-1 flex flex-col justify-center gap-5 sm:gap-7 z-10 py-2">
        {/* 1. 顶部品牌徽标与系统标题 (适度下沉，不再紧贴顶部边缘) */}
        <div className="text-center flex flex-col items-center">
          <div className="relative mb-3.5">
            <div className="absolute inset-0 rounded-3xl bg-blue-500/25 blur-md animate-pulse" />
            <div className="relative w-16 h-16 rounded-3xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-400 p-[1.5px] shadow-2xl shadow-blue-500/30">
              <div className="w-full h-full bg-gray-950 rounded-[22px] flex items-center justify-center">
                <Compass className="w-8 h-8 text-cyan-400 stroke-[2.2]" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-emerald-500 border-2 border-gray-950 text-[9px] font-black text-gray-950 shadow">
              GL
            </span>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 mb-2">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-[10.5px] font-bold text-cyan-300 tracking-wide font-mono">
              GEOPLOT STUDIO MOBILE
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            移动外业标绘系统
          </h1>
        </div>

        {/* 2. 现代磨砂玻璃登录表单卡片 (留白充足、触控间距舒适，无拥挤感) */}
        <div className="w-full">
          <div className="bg-gray-900/75 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl ring-1 ring-white/5 space-y-4 sm:space-y-5">
            <form onSubmit={handleCustomLogin} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-950/60 border border-red-500/40 rounded-2xl text-xs text-red-200 flex items-center gap-2 animate-in fade-in duration-200">
                  <XCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span className="truncate">{errorMsg}</span>
                </div>
              )}

              {/* 用户名输入框 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-300 ml-1">
                  工程工号 / 用户名
                </label>
                <div className="relative group">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="如 admin / surveyor 或自定义姓名"
                    className="w-full pl-10 pr-3.5 py-3 bg-gray-950/80 border border-gray-800 rounded-2xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-inner font-mono"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              {/* 密码输入框 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-semibold text-gray-300">
                    访问密钥 / 密码
                  </label>
                  <span className="text-[10px] text-gray-400 font-mono">离线凭证任意</span>
                </div>
                <div className="relative group">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-500 group-focus-within:text-blue-400 transition" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码凭据"
                    className="w-full pl-10 pr-10 py-3 bg-gray-950/80 border border-gray-800 rounded-2xl text-xs text-gray-100 placeholder-gray-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-inner font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition p-0.5"
                    title={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 辅助操作栏与账号快捷轻标签 */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <label className="flex items-center gap-1.5 text-gray-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-gray-950 border-gray-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>记住工号</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillCredential('admin')}
                    className="px-2.5 py-1 rounded-xl bg-gray-800/80 hover:bg-gray-750 text-gray-300 hover:text-white transition text-[10.5px] font-mono border border-gray-700/60"
                    title="填入系统主管管理员工号"
                  >
                    填入主管
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredential('surveyor')}
                    className="px-2.5 py-1 rounded-xl bg-gray-800/80 hover:bg-gray-750 text-gray-300 hover:text-white transition text-[10.5px] font-mono border border-gray-700/60"
                    title="填入外业调查员工号"
                  >
                    填入外业员
                  </button>
                </div>
              </div>

              {/* 登录操作主按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 active:scale-[0.98] text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition duration-200 mt-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-cyan-200" />
                    <span>正在校验工程权限...</span>
                  </>
                ) : (
                  <>
                    <span>进入外业标绘系统</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* 3. 底部空间引擎与状态信息 */}
        <div className="text-center flex flex-col items-center gap-1">
          <div className="flex items-center gap-2 text-[10px] text-gray-400 font-mono">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>离线工程沙箱就绪</span>
            <span>•</span>
            <span>MapTalks GL Native</span>
          </div>
          <div className="text-[9px] text-gray-400">
            GeoPlot Studio Mobile • GIS 空间标绘与外业采集终端
          </div>
        </div>
      </div>
    </div>
  );
};
