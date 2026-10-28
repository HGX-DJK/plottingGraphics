import { User } from '../types';

const STORAGE_KEY_AUTH = 'geoplot_studio_user';

export const PRESET_USERS: User[] = [
  {
    id: 'user-admin',
    username: 'admin',
    displayName: '陈指挥长 (特级指挥官)',
    role: 'admin',
    roleName: '超级管理员 / 作战总指挥',
    avatar: '🛡️',
  },
  {
    id: 'user-analyst',
    username: 'analyst',
    displayName: '林参谋 (态势分析官)',
    role: 'analyst',
    roleName: '高级态势分析师',
    avatar: '📊',
  },
  {
    id: 'user-operator',
    username: 'operator',
    displayName: '王值班 (标绘操务员)',
    role: 'operator',
    roleName: '前沿标绘值班员',
    avatar: '🎯',
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
            displayName: `${username.trim()} (作战员)`,
            role: 'operator',
            roleName: '标绘操作员',
            avatar: '👤',
          };
          localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(newUser));
          resolve({ success: true, user: newUser });
          return;
        }

        resolve({ success: false, message: '请输入有效的用户名' });
      }, 300);
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
