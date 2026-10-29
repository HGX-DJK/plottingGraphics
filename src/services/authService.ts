import { User } from '../types';

const STORAGE_KEY_AUTH = 'geoplot_studio_user';
const STORAGE_KEY_REMEMBERED = 'geoplot_studio_remembered_account';

export const PRESET_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    displayName: '李工 (GIS系统主管)',
    role: 'admin',
    roleName: '超级管理员 / 资深GIS工程师',
    avatar: '🗺️',
  },
  {
    id: 'user-surveyor',
    username: 'surveyor',
    displayName: '张工 (外业调查员)',
    role: 'surveyor',
    roleName: '实地测绘与空间调查员',
    avatar: '📐',
  },
  {
    id: 'user-analyst',
    username: 'analyst',
    displayName: '陈工 (数据分析师)',
    role: 'analyst',
    roleName: '空间地理数据分析师',
    avatar: '📊',
  },
];

/** 从指定存储中解析登录会话，解析失败返回 null 且不抛出 */
function readUserFrom(storage: Storage | undefined): User | null {
  if (!storage) return null;
  try {
    const data = storage.getItem(STORAGE_KEY_AUTH);
    if (!data) return null;
    return JSON.parse(data) as User;
  } catch (e) {
    console.error('Failed to parse user session', e);
    return null;
  }
}

/**
 * 持久化登录会话。
 * remember = true  -> 写入 localStorage，关闭浏览器后依然保持登录，并记住工号；
 * remember = false -> 仅写入 sessionStorage，关闭标签页即失效，且不记住工号。
 */
function persistUser(user: User, remember: boolean) {
  const payload = JSON.stringify(user);
  try {
    if (remember) {
      localStorage.setItem(STORAGE_KEY_AUTH, payload);
      localStorage.setItem(STORAGE_KEY_REMEMBERED, user.username);
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
    } else {
      sessionStorage.setItem(STORAGE_KEY_AUTH, payload);
      localStorage.removeItem(STORAGE_KEY_AUTH);
      localStorage.removeItem(STORAGE_KEY_REMEMBERED);
    }
  } catch (e) {
    console.error('Failed to persist user session', e);
  }
}

export const authService = {
  getCurrentUser(): User | null {
    // 先查持久会话，再查本次会话
    return readUserFrom(localStorage) || readUserFrom(sessionStorage);
  },

  /** 读取已记住的工号 / 登录账号（用于登录页预填） */
  getRememberedAccount(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY_REMEMBERED);
    } catch (e) {
      return null;
    }
  },

  login(
    username: string,
    password?: string,
    remember = true
  ): Promise<{ success: boolean; user?: User; message?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const found = PRESET_USERS.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
        if (found) {
          persistUser(found, remember);
          resolve({ success: true, user: found });
          return;
        }

        // 允许任意新用户名登录
        if (username.trim()) {
          const newUser: User = {
            id: `user-${Date.now()}`,
            username: username.trim(),
            displayName: `${username.trim()} (外业工程师)`,
            role: 'surveyor',
            roleName: '外业标绘调查员',
            avatar: '👤',
          };
          persistUser(newUser, remember);
          resolve({ success: true, user: newUser });
          return;
        }

        resolve({ success: false, message: '请输入有效的用户名' });
      }, 250);
    });
  },

  quickLogin(userId: string, remember = true): User {
    const user = PRESET_USERS.find((u) => u.id === userId) || PRESET_USERS[0];
    persistUser(user, remember);
    return user;
  },

  logout(): void {
    // 退出仅清除登录态，已记住的工号保留，便于下次快速登录
    try {
      localStorage.removeItem(STORAGE_KEY_AUTH);
      sessionStorage.removeItem(STORAGE_KEY_AUTH);
    } catch (e) {
      console.error('Failed to clear user session', e);
    }
  },

  getPresetUsers(): User[] {
    return PRESET_USERS;
  },
};
