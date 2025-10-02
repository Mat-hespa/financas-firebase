import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {
  private readonly THEME_KEY = 'app-theme';
  
  // Signal para controlar o tema
  isDarkMode = signal<boolean>(false);

  constructor() {
    this.loadTheme();
  }

  private loadTheme(): void {
    const savedTheme = localStorage.getItem(this.THEME_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    
    const isDark = savedTheme ? savedTheme === 'dark' : prefersDark;
    this.setTheme(isDark);
  }

  toggleTheme(): void {
    this.setTheme(!this.isDarkMode());
  }

  setTheme(isDark: boolean): void {
    this.isDarkMode.set(isDark);
    
    // Aplicar a classe no documento
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    
    // Atualizar meta tag theme-color dinamicamente
    this.updateThemeColor(isDark);
    
    // Salvar preferência
    localStorage.setItem(this.THEME_KEY, isDark ? 'dark' : 'light');
  }

  private updateThemeColor(isDark: boolean): void {
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const backgroundColor = isDark ? '#0f172a' : '#fafbfc';
    
    if (themeColorMeta) {
      themeColorMeta.setAttribute('content', backgroundColor);
    }
    
    // Também atualizar para iOS
    const appleStatusBarMeta = document.querySelector('meta[name="apple-mobile-web-app-status-bar-style"]');
    if (appleStatusBarMeta) {
      appleStatusBarMeta.setAttribute('content', isDark ? 'black-translucent' : 'default');
    }
  }
}
