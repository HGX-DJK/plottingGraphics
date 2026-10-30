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
  // 记住的工号（上次勾选「记住登录状态」时留存）用于预填登录框
  const rememberedAccount = React.useMemo(() => authService.getRememberedAccount(), []);
  const [username, setUsername] = useState(rememberedAccount || 'admin');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => !!rememberedAccount);
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
    // rememberMe 决定会话是持久化还是仅本次有效
    const res = await authService.login(username, password, rememberMe);
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
    <div
      className="relative w-full h-full max-h-screen bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 flex flex-col justify-between px-5 pb-5 sm:pb-6 overflow-hidden select-none transition-colors duration-300"
      style={{
        paddingTop: 'max(calc(env(safe-area-inset-top, 0px) + 16px), 28px)',
        paddingBottom: 'max(calc(env(safe-area-inset-bottom, 0px) + 12px), 20px)',
      }}
    >
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
        {/* 1. 顶部品牌与系统标题：中文大标题与副标字徽 */}
        <div className="text-center flex flex-col items-center">
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight">
            标绘系统
          </h1>

          <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 mt-1.5">
            <Sparkles className="w-3 h-3 text-blue-600 dark:text-cyan-400" />
            <span className="text-[10px] font-bold text-blue-700 dark:text-cyan-300 tracking-wider font-mono">
              PLOTTING SYSTEM
            </span>
          </div>
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
                          : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/90 dark:border-slate-700/60 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
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

              {/* 记住登录状态复选框：勾选则下次打开自动进入系统并预填工号 */}
              <div className="flex items-center justify-between pt-1 text-[11px]">
                <label className="flex items-center gap-2 text-slate-500 dark:text-slate-400 cursor-pointer select-none min-h-[36px]">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded bg-slate-100 dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer shrink-0"
                  />
                  <span>记住登录状态</span>
                </label>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                  {rememberMe ? '下次自动进入' : '仅本次会话有效'}
                </span>
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
                    <span>进入标绘系统</span>
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
