import { Component, inject } from '@angular/core';
import { Router, RouterOutlet, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { filter } from 'rxjs/operators';
import { ThemeService } from './services/theme.service';
import { ScrollService } from './services/scroll.service';
import { FooterComponent } from './components/shared/footer/footer.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CommonModule, FooterComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  private themeService = inject(ThemeService);
  private scrollService = inject(ScrollService); // Injeta o serviço de scroll para inicializá-lo
  private router = inject(Router);
  
  private authenticatedRoutes = ['/dashboard', '/add-transaction', '/analytics'];
  private currentRoute = '';

  constructor() {
    // Escutar mudanças de rota
    this.router.events
      .pipe(filter(event => event instanceof NavigationEnd))
      .subscribe((event: NavigationEnd) => {
        this.currentRoute = event.url;
      });
  }

  // Getter para acessar o signal do tema
  isDarkMode = this.themeService.isDarkMode;

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  showFooter(): boolean {
    return this.authenticatedRoutes.includes(this.currentRoute);
  }

  showThemeToggle(): boolean {
    return this.authenticatedRoutes.includes(this.currentRoute);
  }
}
