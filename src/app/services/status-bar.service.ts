import { Injectable, inject } from '@angular/core';
import { Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { ThemeService } from './theme.service';

@Injectable({
  providedIn: 'root'
})
export class StatusBarService {
  private router = inject(Router);
  private themeService = inject(ThemeService);

  constructor() {
    this.setupStatusBarListener();
    // Força atualização inicial
    setTimeout(() => this.updateStatusBarColor(), 0);
  }

  private setupStatusBarListener(): void {
    // Atualiza a cor da status bar quando a rota muda
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      // Pequeno delay para garantir que o DOM foi renderizado
      setTimeout(() => {
        this.updateStatusBarColor();
        // Força múltiplas tentativas para iOS
        setTimeout(() => this.updateStatusBarColor(), 100);
        setTimeout(() => this.updateStatusBarColor(), 300);
      }, 0);
    });
  }

  updateStatusBarColor(): void {
    const currentRoute = this.router.url;
    const isDark = this.themeService.isDarkMode();
    let color: string;

    // Define a cor baseado na rota e tema
    if (currentRoute === '/' || currentRoute.includes('/login') || currentRoute.includes('/register')) {
      // Login/Register: preto ou branco baseado no tema
      color = isDark ? '#000000' : '#ffffff';
    } else if (currentRoute.includes('/dashboard')) {
      // Dashboard: roxo do gradiente
      color = isDark ? '#7c3aed' : '#6d28d9';
    } else if (currentRoute.includes('/transactions') || currentRoute.includes('/analytics')) {
      // Outras telas: cor de fundo secundária
      color = isDark ? '#0a0a0a' : '#f5f5f5';
    } else {
      // Default: branco ou preto
      color = isDark ? '#000000' : '#ffffff';
    }

    this.setMetaThemeColor(color);
  }

  private setMetaThemeColor(color: string): void {
    // Remove todas as meta tags de theme-color existentes
    const existingTags = document.querySelectorAll('meta[name="theme-color"]');
    existingTags.forEach(tag => tag.remove());
    
    // Cria uma nova meta tag
    const metaTag = document.createElement('meta');
    metaTag.setAttribute('name', 'theme-color');
    metaTag.setAttribute('content', color);
    document.head.appendChild(metaTag);
  }
}
