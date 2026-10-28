import React, { useState } from 'react';
import { User } from '../../types';
import { authService } from '../../services/authService';
import {
  User as UserIcon,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
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
      setErrorMsg('请输入有效的工程工号或姓名');
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
    <div className="relative w-full h-full max-h-screen bg-slate-950 flex flex-col items-center justify-center safe-top safe-bottom px-5 py-6 overflow-hidden select-none">
      {/* 顶部与侧向环境柔光氛围光晕 */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[420px] h-[420px] bg-gradient-to-b from-blue-600/20 via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-72 h-72 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 主体居中登录卡片容器 */}
      <div className="max-w-sm w-full mx-auto flex flex-col justify-center gap-5 sm:gap-6 z-10 py-1">
        {/* 1. 顶部品牌徽标与系统标题 (全新旗舰级 3D 拟物与磨砂玻璃 GIS 空间罗盘徽标) */}
        <div className="text-center flex flex-col items-center">
          <div className="relative mb-3.5 group">
            {/* 柔光环境辉光 */}
            <div className="absolute -inset-2.5 rounded-[34px] bg-gradient-to-tr from-blue-600/40 via-cyan-500/30 to-indigo-600/40 blur-xl opacity-80 group-hover:opacity-100 transition-opacity" />

            {/* 主应用图标容器 (Apple Squircle 拟物深度圆角与微质感玻璃反光) */}
            <div className="relative w-20 h-20 rounded-[26px] bg-gradient-to-b from-slate-900 via-slate-950 to-blue-950 p-[1.5px] shadow-2xl shadow-blue-950/80 ring-1 ring-white/20 overflow-hidden flex items-center justify-center">
              {/* 玻璃拟物反光层 */}
              <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-transparent pointer-events-none" />
              <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/15 to-transparent rounded-t-[26px] pointer-events-none" />

              {/* 内部空间网格/拓扑微底纹 */}
              <div
                className="absolute inset-0 opacity-25 pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(circle at center, rgba(56, 189, 248, 0.45) 1px, transparent 1px)',
                  backgroundSize: '12px 12px',
                }}
              />

              {/* 核心高精微拟物罗盘星盘 SVG */}
              <svg
                className="relative w-13 h-13 drop-shadow-[0_4px_12px_rgba(56,189,248,0.5)]"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="needleNorth" x1="32" y1="12" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" />
                    <stop offset="1" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="needleSouth" x1="32" y1="32" x2="32" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#64748b" />
                    <stop offset="1" stopColor="#1e293b" />
                  </linearGradient>
                  <linearGradient id="ringGrad" x1="12" y1="12" x2="52" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" stopOpacity="0.85" />
                    <stop offset="0.5" stopColor="#818cf8" stopOpacity="0.4" />
                    <stop offset="1" stopColor="#38bdf8" stopOpacity="0.85" />
                  </linearGradient>
                </defs>

                {/* 外圈极坐标刻度轨道 */}
                <circle cx="32" cy="32" r="23" stroke="url(#ringGrad)" strokeWidth="1.5" strokeDasharray="3 3" />
                <circle cx="32" cy="32" r="18.5" stroke="#38bdf8" strokeWidth="0.75" strokeOpacity="0.3" />

                {/* 四主方向微小刻度点 */}
                <circle cx="32" cy="9" r="1.5" fill="#38bdf8" />
                <circle cx="32" cy="55" r="1.5" fill="#64748b" />
                <circle cx="9" cy="32" r="1.5" fill="#64748b" />
                <circle cx="55" cy="32" r="1.5" fill="#64748b" />

                {/* 标绘空间几何层叠多边形微底色 */}
                <polygon points="32,15 49,32 32,49 15,32" fill="#38bdf8" fillOpacity="0.08" stroke="#38bdf8" strokeWidth="1" strokeOpacity="0.35" />

                {/* 核心立体双色指针 */}
                {/* 北向指针 (Electric Cyan / Royal Blue) */}
                <polygon points="32,12 37,32 32,29.5" fill="#7dd3fc" />
                <polygon points="32,12 27,32 32,29.5" fill="url(#needleNorth)" />

                {/* 南向指针 (Slate Metallic) */}
                <polygon points="32,52 37,32 32,29.5" fill="#94a3b8" />
                <polygon points="32,52 27,32 32,29.5" fill="url(#needleSouth)" />

                {/* 中心枢纽宝石轴承点 */}
                <circle cx="32" cy="31" r="3.5" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
                <circle cx="32" cy="31" r="1.5" fill="#38bdf8" />
              </svg>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/25 mb-1.5">
            <Sparkles className="w-3 h-3 text-cyan-400" />
            <span className="text-[10px] font-bold text-cyan-300 tracking-wide font-mono">
              GEOPLOT STUDIO MOBILE
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-white tracking-wide">
            移动外业标绘系统
          </h1>
        </div>

        {/* 2. 现代磨砂玻璃登录表单卡片 (留白充足、触控间距舒适，无拥挤感) */}
        <div className="w-full">
          <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-6 sm:p-7 shadow-2xl ring-1 ring-white/5 space-y-4 sm:space-y-5">
            <form onSubmit={handleCustomLogin} className="space-y-4">
              {errorMsg && (
                <div className="p-3 bg-rose-950/60 border border-rose-500/40 rounded-2xl text-xs text-rose-200 flex items-center gap-2 animate-in fade-in duration-200">
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span className="truncate">{errorMsg}</span>
                </div>
              )}

              {/* 用户名输入框 */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300 ml-1">
                  工程工号 / 用户名
                </label>
                <div className="relative group">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="如 admin / surveyor 或自定义姓名"
                    className="w-full pl-10 pr-3.5 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-inner font-mono"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              {/* 密码输入框 */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-xs font-semibold text-slate-300">
                    访问密钥 / 密码
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">离线凭证任意</span>
                </div>
                <div className="relative group">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within:text-blue-400 transition" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码凭据"
                    className="w-full pl-10 pr-10 py-3 bg-slate-950/80 border border-slate-800 rounded-2xl text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-inner font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition p-0.5"
                    title={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 辅助操作栏与账号快捷轻标签 */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-950 border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>记住工号</span>
                </label>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => fillCredential('admin')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white transition text-[10.5px] font-mono border border-slate-700/60"
                    title="填入系统主管管理员工号"
                  >
                    填入主管
                  </button>
                  <button
                    type="button"
                    onClick={() => fillCredential('surveyor')}
                    className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-slate-750 text-slate-300 hover:text-white transition text-[10.5px] font-mono border border-slate-700/60"
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
      </div>
    </div>
  );
};
