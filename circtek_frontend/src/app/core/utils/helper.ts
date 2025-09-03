export interface IAuthUser {
  id: number;
  name: string;
  email: string;
  roleSlug: string;
  clientId?: number;
}

export function getAuthUserData(): IAuthUser | null {
  try {
    const userData = localStorage.getItem('user');
    if (userData) {
      return JSON.parse(userData);
    }
    return null;
  } catch (error) {
    console.error('Error parsing user data from localStorage:', error);
    return null;
  }
}

export function setAuthUserData(user: IAuthUser): void {
  try {
    localStorage.setItem('user', JSON.stringify(user));
  } catch (error) {
    console.error('Error saving user data to localStorage:', error);
  }
}

export function clearAuthUserData(): void {
  try {
    localStorage.removeItem('user');
  } catch (error) {
    console.error('Error clearing user data from localStorage:', error);
  }
}
