import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBarModule, MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AuthService } from '../../../services/auth.service';
import { BiometricSetupDialogComponent } from './biometric-setup-dialog.component';
import { ThemeService } from '../../../services/theme.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatDialogModule,
    RouterLink
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  isLoading = false;
  hidePassword = true;
  biometricAvailable = false;
  hasBiometricCredential = false;
  showBiometricSetup = false;
  tryingAutomaticBiometric = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private themeService: ThemeService
  ) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      rememberMe: [false]
    });

    // Carregar dados salvos se existirem
    this.loadSavedUserData();
    
    // Verificar disponibilidade de biometria
    this.checkBiometricAvailability();
  }

  // Getter para acessar o signal do tema
  get isDarkMode() {
    return this.themeService.isDarkMode;
  }

  toggleTheme(): void {
    this.themeService.toggleTheme();
  }

  async ngOnInit() {
    // Tenta login biométrico automático se disponível
    await this.tryAutomaticBiometricLogin();
  }

  async onSubmit() {
    if (this.loginForm.valid) {
      this.isLoading = true;
      try {
        const { email, password, rememberMe } = this.loginForm.value;
        
        // Login tradicional
        await this.authService.login(email, password, rememberMe);
        
        // Verifica se deve mostrar dialog de biometria
        await this.checkAndShowBiometricSetup(email);
        
        await this.router.navigate(['/dashboard']);
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 100);
      } catch (error: any) {
        let message = 'Erro ao fazer login';
        if (error.code === 'auth/user-not-found') {
          message = 'Usuário não encontrado';
        } else if (error.code === 'auth/wrong-password') {
          message = 'Senha incorreta';
        } else if (error.code === 'auth/invalid-email') {
          message = 'Email inválido';
        } else if (error.code === 'auth/invalid-credential') {
          message = 'Credenciais inválidas';
        }

        this.snackBar.open(message, 'Fechar', {
          duration: 5000,
          panelClass: ['error-snackbar']
        });
      } finally {
        this.isLoading = false;
      }
    }
  }

  /**
   * Tenta login biométrico automaticamente ao carregar
   */
  private async tryAutomaticBiometricLogin() {
    // Aguarda verificação de disponibilidade
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Não tenta se não tiver biometria disponível
    if (!this.biometricAvailable) {
      return;
    }
    
    // Não tenta se não tiver credencial salva
    if (!this.hasBiometricCredential) {
      return;
    }
    
    // Não tenta se já estiver logado
    if (this.authService.getCurrentUser()) {
      return;
    }
    
    // Tenta login biométrico silenciosamente
    try {
      this.tryingAutomaticBiometric = true;
      this.isLoading = true;
      const savedEmail = this.loginForm.get('email')?.value;
      const result = await this.authService.loginWithBiometric(savedEmail || undefined);
      
      if (result.success && !result.needsPassword) {
        // Login bem-sucedido - redireciona para dashboard
        await this.router.navigate(['/dashboard']);
        // Garante que a página está no topo
        setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 100);
      }
    } catch (error: any) {
      // Erro silencioso - usuário pode fazer login manual
      console.log('Login biométrico automático falhou:', error.message);
    } finally {
      this.tryingAutomaticBiometric = false;
      this.isLoading = false;
    }
  }

  /**
   * Login usando biometria (manual - quando clica no botão)
   */
  async loginWithBiometric() {
    this.isLoading = true;
    try {
      const savedEmail = this.loginForm.get('email')?.value;
      const result = await this.authService.loginWithBiometric(savedEmail || undefined);
      
      if (result.success) {
        if (result.needsPassword) {
          // Biometria validada mas precisa de senha
          this.loginForm.patchValue({ email: result.email });
          this.snackBar.open('Biometria verificada! Digite sua senha para completar.', 'OK', {
            duration: 4000,
            panelClass: ['info-snackbar']
          });
        } else {
          // Login completo com sucesso!
          await this.router.navigate(['/dashboard']);
          setTimeout(() => window.scrollTo({ top: 0, behavior: 'instant' }), 100);
        }
      }
    } catch (error: any) {
      let message = error.message || 'Erro na autenticação biométrica';
      
      // Trata erros específicos do Firebase
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        message = 'Credenciais salvas expiradas. Faça login novamente e reative a biometria.';
        // Remove credencial inválida
        const email = this.loginForm.get('email')?.value;
        if (email) {
          this.authService.removeBiometricCredential(email);
          this.hasBiometricCredential = false;
        }
      }
      
      this.snackBar.open(message, 'Fechar', {
        duration: 5000,
        panelClass: ['error-snackbar']
      });
    } finally {
      this.isLoading = false;
    }
  }

  // Método para carregar dados salvos do usuário
  private loadSavedUserData() {
    if (this.authService.shouldRememberUser()) {
      const savedEmail = this.authService.getSavedEmail();
      if (savedEmail) {
        this.loginForm.patchValue({
          email: savedEmail,
          rememberMe: true
        });
        
        // Verifica se há credencial biométrica para este email
        this.hasBiometricCredential = this.authService.hasBiometricCredential(savedEmail);
      }
    }
  }

  /**
   * Verifica disponibilidade de biometria
   */
  private async checkBiometricAvailability() {
    try {
      this.biometricAvailable = await this.authService.isBiometricAvailable();
      
      // Verifica se já tem credencial salva ao carregar o email
      const email = this.loginForm.get('email')?.value;
      if (email) {
        this.hasBiometricCredential = this.authService.hasBiometricCredential(email);
      }
      
      // Monitora mudanças no campo email
      this.loginForm.get('email')?.valueChanges.subscribe(email => {
        if (email && this.biometricAvailable) {
          this.hasBiometricCredential = this.authService.hasBiometricCredential(email);
        } else {
          this.hasBiometricCredential = false;
        }
      });
    } catch (error) {
      console.error('Erro ao verificar biometria:', error);
      this.biometricAvailable = false;
    }
  }

  /**
   * Verifica se deve mostrar dialog de configuração de biometria
   */
  private async checkAndShowBiometricSetup(email: string) {
    // Não mostra se já tem biometria configurada
    if (this.hasBiometricCredential) {
      return;
    }
    
    // Não mostra se biometria não está disponível
    if (!this.biometricAvailable) {
      return;
    }
    
    // Abre dialog perguntando se quer ativar
    const dialogRef = this.dialog.open(BiometricSetupDialogComponent, {
      width: '380px',
      maxWidth: '90vw',
      panelClass: 'biometric-dialog-container',
      disableClose: false,
      data: { email }
    });
    
    const result = await dialogRef.afterClosed().toPromise();
    
    if (result?.setupBiometric) {
      try {
        const password = this.loginForm.get('password')?.value;
        await this.authService.registerBiometric(password);
        this.hasBiometricCredential = true;
        
        this.snackBar.open('Biometria configurada com sucesso! 🎉', 'Fechar', {
          duration: 3000,
          panelClass: ['success-snackbar']
        });
      } catch (error: any) {
        console.error('Erro ao configurar biometria:', error);
      }
    }
  }

  getErrorMessage(field: string): string {
    const control = this.loginForm.get(field);
    if (control?.hasError('required')) {
      return `${field === 'email' ? 'Email' : 'Senha'} é obrigatório`;
    }
    if (control?.hasError('email')) {
      return 'Email inválido';
    }
    if (control?.hasError('minlength')) {
      return 'Senha deve ter pelo menos 6 caracteres';
    }
    return '';
  }
}
