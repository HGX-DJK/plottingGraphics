import React, { useState } from 'react';
import { User } from '../../types';
import { authService } from '../../services/authService';
import { ThemeMode } from '../../services/themeService';
import {
  User as UserIcon,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
  Sparkles,
  Loader2,
  XCircle,
  Sun,
  Moon,
  ShieldCheck,
} from 'lucide-react';

interface MobileLoginViewProps {
  onLoginSuccess: (user: User) => void;
  theme: ThemeMode;
  onToggleTheme: () => void;
}

export const MobileLoginView: React.FC<MobileLoginViewProps> = ({
  onLoginSuccess,
  theme,
  onToggleTheme,
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
      setErrorMsg('请输入有效的工程工号或用户名');
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

  const quickRoles = [
    { id: 'admin', label: '系统主管', role: '全功能调度' },
    { id: 'surveyor', label: '外业勘察员', role: '标绘采集' },
    { id: 'commander', label: '应急指挥官', role: '态势推演' },
  ];

  return (
    <div className="relative w-full h-full max-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between safe-top safe-bottom px-5 py-5 sm:py-6 overflow-hidden select-none transition-colors duration-300">
      {/* 背景柔光氛围 (浅色为清透微蓝天际光，暗色为极夜深邃光晕) */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-[380px] h-[380px] bg-gradient-to-b from-blue-500/15 dark:from-blue-600/20 via-cyan-400/10 dark:via-indigo-600/10 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-64 h-64 bg-indigo-500/10 dark:bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* 顶部操作条：包含轻量主题切换按钮 */}
      <div className="w-full flex items-center justify-between z-20 shrink-0">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border border-slate-200/80 dark:border-slate-800 text-[10px] font-mono text-slate-500 dark:text-slate-400 shadow-sm">
          <ShieldCheck className="w-3 h-3 text-emerald-500" />
          <span>离线安全沙箱 • V2.5</span>
        </div>

        {/* 浅色 / 暗色主题切换按钮 */}
        <button
          type="button"
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/90 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-sm hover:scale-105 active:scale-95 transition-all cursor-pointer ring-1 ring-slate-900/5 dark:ring-white/10"
          title={theme === 'dark' ? '切换为清新浅色模式' : '切换为极夜深色模式'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400 animate-spin-slow" />
              <span className="text-[11px] font-medium">浅色模式</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-indigo-600" />
              <span className="text-[11px] font-medium">暗色模式</span>
            </>
          )}
        </button>
      </div>

      {/* 主体居中登录卡片容器 */}
      <div className="max-w-sm w-full mx-auto my-auto flex flex-col justify-center gap-4 sm:gap-5 z-10 py-1">
        {/* 1. 顶部品牌徽标与系统标题 */}
        <div className="text-center flex flex-col items-center">
          <div className="relative mb-3 group">
            {/* 辉光底衬 */}
            <div className="absolute -inset-2 rounded-[28px] bg-gradient-to-tr from-blue-500/30 via-cyan-400/25 to-indigo-500/30 blur-lg opacity-70 group-hover:opacity-100 transition-opacity" />

            {/* 极简精致 3D 空间罗盘徽标 */}
            <div className="relative w-16 h-16 rounded-[22px] bg-gradient-to-b from-white via-slate-50 to-blue-50/80 dark:from-slate-850 dark:via-slate-900 dark:to-blue-950 p-[1.5px] shadow-xl shadow-blue-500/10 dark:shadow-blue-950/80 ring-1 ring-slate-900/10 dark:ring-white/20 overflow-hidden flex items-center justify-center">
              {/* 表面玻璃微反光 */}
              <div className="absolute top-0 left-0 right-0 h-[45%] bg-gradient-to-b from-white/40 dark:from-white/15 to-transparent rounded-t-[22px] pointer-events-none" />

              {/* 空间多边形与动态罗盘 SVG */}
              <svg
                className="relative w-10 h-10 drop-shadow-sm"
                viewBox="0 0 64 64"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="northGrad" x1="32" y1="12" x2="32" y2="32" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#38bdf8" />
                    <stop offset="1" stopColor="#0284c7" />
                  </linearGradient>
                  <linearGradient id="southGrad" x1="32" y1="32" x2="32" y2="52" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#94a3b8" />
                    <stop offset="1" stopColor="#475569" />
                  </linearGradient>
                </defs>

                {/* 外圈微刻度轨道 */}
                <circle cx="32" cy="32" r="22" stroke="#0284c7" strokeWidth="1.2" strokeDasharray="3 3" strokeOpacity="0.45" />
                <circle cx="32" cy="32" r="17" stroke="#38bdf8" strokeWidth="0.8" strokeOpacity="0.3" />

                {/* 标绘空间几何菱形底纹 */}
                <polygon points="32,16 48,32 32,48 16,32" fill="#38bdf8" fillOpacity="0.08" stroke="#0284c7" strokeWidth="0.8" strokeOpacity="0.3" />

                {/* 北向指针 (高亮蓝/青) */}
                <polygon points="32,12 37,32 32,29.5" fill="#7dd3fc" />
                <polygon points="32,12 27,32 32,29.5" fill="url(#northGrad)" />

                {/* 南向指针 (金属灰) */}
                <polygon points="32,52 37,32 32,29.5" fill="#cbd5e1" />
                <polygon points="32,52 27,32 32,29.5" fill="url(#southGrad)" />

                {/* 中心轴承点 */}
                <circle cx="32" cy="31" r="3" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.2" />
                <circle cx="32" cy="31" r="1.2" fill="#38bdf8" />
              </svg>
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 mb-1">
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-cyan-400" />
            <span className="text-[10px] font-bold text-blue-700 dark:text-cyan-300 tracking-wider font-mono">
              GEOPLOT STUDIO
            </span>
          </div>

          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            移动外业标绘系统
          </h1>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            空间地理协同采集与现场态势推演平台
          </p>
        </div>

        {/* 2. 现代清爽双色自适应登录表单卡片 */}
        <div className="w-full">
          <div className="bg-white/90 dark:bg-slate-900/80 backdrop-blur-2xl border border-slate-200/90 dark:border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl shadow-slate-900/5 dark:shadow-2xl ring-1 ring-slate-900/5 dark:ring-white/10 space-y-4">
            <form onSubmit={handleCustomLogin} className="space-y-3.5">
              {errorMsg && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-500/40 rounded-2xl text-xs text-rose-700 dark:text-rose-200 flex items-center gap-2 animate-in fade-in duration-200">
                  <XCircle className="w-4 h-4 text-rose-500 shrink-0" />
                  <span className="truncate">{errorMsg}</span>
                </div>
              )}

              {/* 用户名/工号输入框 */}
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300 ml-1">
                  工程工号 / 登录账号
                </label>
                <div className="relative group">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="请输入工号或管理员账号"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-inner font-mono"
                    autoCapitalize="none"
                    autoCorrect="off"
                  />
                </div>
              </div>

              {/* 密码凭据输入框 */}
              <div className="space-y-1">
                <div className="flex items-center justify-between ml-1">
                  <label className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                    访问凭证 / 密码
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">演示环境免密</span>
                </div>
                <div className="relative group">
                  <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 group-focus-within:text-blue-500 transition" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="请输入密码凭据"
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-50 dark:bg-slate-950/80 border border-slate-200 dark:border-slate-800 rounded-2xl text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition shadow-inner font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 transition p-0.5"
                    title={showPassword ? '隐藏密码' : '显示密码'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 快捷身份芯片组 (一键自动填入，告别死板按钮) */}
              <div className="pt-1">
                <span className="text-[10px] text-slate-500 dark:text-slate-400 ml-1 mb-1.5 block">
                  快捷身份填入：
                </span>
                <div className="grid grid-cols-3 gap-1.5">
                  {quickRoles.map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => fillCredential(role.id)}
                      className={`px-2 py-1.5 rounded-xl border text-center transition flex flex-col items-center justify-center ${
                        username === role.id
                          ? 'bg-blue-50 dark:bg-blue-500/15 border-blue-500 text-blue-600 dark:text-blue-400 font-bold ring-1 ring-blue-500/30'
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/90 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-750'
                      }`}
                    >
                      <span className="text-[11px] leading-tight">{role.label}</span>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 leading-none mt-0.5">
                        {role.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 记住工号复选框 */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <label className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-3.5 h-3.5 rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                  />
                  <span>记住工号信息</span>
                </label>
              </div>

              {/* 登录操作主按钮 */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:opacity-95 active:scale-[0.98] text-white font-bold rounded-2xl text-xs shadow-lg shadow-blue-500/25 flex items-center justify-center gap-2 transition duration-200 mt-4 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
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

      {/* 底部版权与环境说明 */}
      <div className="text-center text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
        GeoPlot Studio Mobile • MapTalks GL
      </div>
    </div>
  );
};
