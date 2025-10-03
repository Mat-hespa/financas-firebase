import { Injectable } from '@angular/core';
import { Auth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, user, setPersistence, browserLocalPersistence } from '@angular/fire/auth';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  user$: Observable<any>;

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
}
