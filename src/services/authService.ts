import { User } from '../types';

const STORAGE_KEY_AUTH = 'geoplot_studio_user';

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

export const authService = {
  getCurrentUser(): User | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY_AUTH);
      if (!data) return null;
      return JSON.parse(data);
    } catch (e) {
      console.error('Failed to parse user session', e);
      return null;
    }
  },

  login(username: string, password?: string): Promise<{ success: boolean; user?: User; message?: string }> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const found = PRESET_USERS.find((u) => u.username.toLowerCase() === username.trim().toLowerCase());
        if (found) {
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(found));
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
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(newUser));
          resolve({ success: true, user: newUser });
          return;
        }

        resolve({ success: false, message: '请输入有效的用户名' });
      }, 250);
    });
  },

  quickLogin(userId: string): User {
    const user = PRESET_USERS.find((u) => u.id === userId) || PRESET_USERS[0];
    localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
    return user;
  },

  logout(): void {
    localStorage.removeItem(STORAGE_KEY_AUTH);
  },

  getPresetUsers(): User[] {
    return PRESET_USERS;
  },
};
