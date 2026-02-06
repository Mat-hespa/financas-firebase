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
  }

  private setupStatusBarListener(): void {
    // Atualiza a cor da status bar quando a rota muda
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.updateStatusBarColor();
    });

    // Também atualiza quando o tema muda
    // Como o ThemeService usa signals, vamos usar effect para observar mudanças
  }

  updateStatusBarColor(): void {
    const currentRoute = this.router.url;
    const isDark = this.themeService.isDarkMode();
    let color: string;

    // Define a cor baseado na rota e tema
    if (currentRoute.includes('/dashboard')) {
      // Dashboard: roxo do gradiente
      color = isDark ? '#7c3aed' : '#6d28d9';
    } else if (currentRoute.includes('/login') || currentRoute.includes('/register')) {
      // Login/Register: preto ou branco baseado no tema
      color = isDark ? '#000000' : '#ffffff';
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
    let metaTag = document.querySelector('meta[name="theme-color"]');
    
    if (!metaTag) {
      metaTag = document.createElement('meta');
      metaTag.setAttribute('name', 'theme-color');
      document.head.appendChild(metaTag);
    }
    
    metaTag.setAttribute('content', color);
  }
}
