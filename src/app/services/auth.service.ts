import { Injectable, inject } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user, setPersistence, browserLocalPersistence } from '@angular/fire/auth';
import { Observable } from 'rxjs';
import { BiometricService } from './biometric.service';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;
  private biometricService = inject(BiometricService);

  constructor(private auth: Auth) {
    this.user$ = user(this.auth);
    this.initializePersistence();
  }

  private async initializePersistence() {
    try {
      // Configura persistência local para manter o usuário logado
      await setPersistence(this.auth, browserLocalPersistence);
    } catch (error) {
      console.error('Erro ao configurar persistência:', error);
    }
  }

  async login(email: string, password: string, rememberMe: boolean = true) {
    try {
      if (rememberMe) {
        // Garante que a persistência está configurada para manter o login
        await setPersistence(this.auth, browserLocalPersistence);
      }
      
      const result = await signInWithEmailAndPassword(this.auth, email, password);
      
      // Salva preferência de "lembrar-me" no localStorage
      if (rememberMe) {
        localStorage.setItem('rememberUser', 'true');
        localStorage.setItem('userEmail', email);
      } else {
        localStorage.removeItem('rememberUser');
        localStorage.removeItem('userEmail');
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }

  async register(email: string, password: string) {
    try {
      const result = await createUserWithEmailAndPassword(this.auth, email, password);
      return result;
    } catch (error) {
      throw error;
    }
  }

  async logout() {
    try {
      // Remove dados salvos do localStorage
      localStorage.removeItem('rememberUser');
      localStorage.removeItem('userEmail');
      
      await signOut(this.auth);
    } catch (error) {
      throw error;
    }
  }

  // Método para verificar se o usuário escolheu ser lembrado
  shouldRememberUser(): boolean {
    return localStorage.getItem('rememberUser') === 'true';
  }

  // Método para obter o email salvo
  getSavedEmail(): string | null {
    return localStorage.getItem('userEmail');
  }

  // Método para verificar se há um usuário autenticado
  getCurrentUser() {
    return this.auth.currentUser;
  }

  // ==================== MÉTODOS DE BIOMETRIA ====================

  /**
   * Verifica se a biometria está disponível no dispositivo
   */
  async isBiometricAvailable(): Promise<boolean> {
    return await this.biometricService.isBiometricAvailable();
  }

  /**
   * Registra biometria para o usuário atual
   */
  async registerBiometric(password?: string): Promise<boolean> {
    const currentUser = this.getCurrentUser();
    if (!currentUser || !currentUser.email) {
      throw new Error('Nenhum usuário autenticado');
    }

    try {
      await this.biometricService.registerBiometric(currentUser.email, currentUser.uid, password);
      return true;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Login usando biometria - COMPLETO com auto-login no Firebase
   */
  async loginWithBiometric(email?: string): Promise<any> {
    try {
      // Autentica com biometria para obter credenciais
      const credentials = await this.biometricService.authenticateWithBiometric(email);
      
      if (!credentials.password) {
        // Biometria validada mas não há senha salva
        return { 
          email: credentials.email, 
          success: true,
          needsPassword: true 
        };
      }
      
      // Faz login automático no Firebase com credenciais descriptografadas
      const result = await this.login(credentials.email, credentials.password, true);
      
      return { 
        email: credentials.email, 
        success: true,
        needsPassword: false,
        firebaseResult: result
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verifica se há credencial biométrica para um email
   */
  hasBiometricCredential(email: string): boolean {
    return this.biometricService.hasCredentialForEmail(email);
  }

  /**
   * Remove credencial biométrica
   */
  removeBiometricCredential(email: string): void {
    this.biometricService.removeCredential(email);
  }

  /**
   * Login com email e senha, com opção de registrar biometria
   */
  async loginAndSetupBiometric(email: string, password: string, enableBiometric: boolean = false): Promise<any> {
    try {
      // Faz login tradicional
      const result = await this.login(email, password, true);
      
      // Se solicitado, registra biometria COM a senha
      if (enableBiometric && await this.isBiometricAvailable()) {
        try {
          await this.registerBiometric(password); // Agora passa a senha
        } catch (bioError) {
          console.error('Erro ao registrar biometria:', bioError);
          // Não falha o login se a biometria falhar
        }
      }
      
      return result;
    } catch (error) {
      throw error;
    }
  }
}
