import { Injectable } from '@angular/core';

export interface BiometricCredential {
  id: string;
  publicKey: string;
  email: string;
  createdAt: number;
}

export interface SecureCredential {
  email: string;
  encryptedPassword: string;
  biometricId: string;
  createdAt: number;
}

@Injectable({
  providedIn: 'root'
})
export class BiometricService {
  private readonly STORAGE_KEY = 'biometric_credentials';
  private readonly SECURE_STORAGE_KEY = 'secure_credentials';
  private readonly RP_NAME = 'FinanceApp';
  private readonly RP_ID = window.location.hostname;
  private readonly ENCRYPTION_KEY = 'finance-app-secure-key-2026';

  constructor() {}

  /**
   * Verifica se o navegador suporta WebAuthn
   */
  isSupported(): boolean {
    return !!(window.PublicKeyCredential && navigator.credentials);
  }

  /**
   * Verifica se há biometria disponível no dispositivo
   */
  async isBiometricAvailable(): Promise<boolean> {
    if (!this.isSupported()) {
      return false;
    }

    try {
      const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
      return available;
    } catch (error) {
      console.error('Erro ao verificar disponibilidade de biometria:', error);
      return false;
    }
  }

  /**
   * Registra credencial biométrica e salva senha criptografada
   */
  async registerBiometric(email: string, userId: string, password?: string): Promise<boolean> {
    if (!await this.isBiometricAvailable()) {
      throw new Error('Biometria não disponível neste dispositivo');
    }

    try {
      const challenge = this.generateChallenge();
      const userIdBuffer = this.stringToBuffer(userId);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge: challenge as BufferSource,
        rp: {
          name: this.RP_NAME,
          id: this.RP_ID
        },
        user: {
          id: userIdBuffer as BufferSource,
          name: email,
          displayName: email
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },
          { alg: -257, type: 'public-key' }
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform',
          userVerification: 'required',
          requireResidentKey: false
        },
        timeout: 60000,
        attestation: 'none'
      };

      const credential = await navigator.credentials.create({
        publicKey: publicKeyCredentialCreationOptions
      }) as PublicKeyCredential;

      if (!credential) {
        throw new Error('Falha ao criar credencial');
      }

      const credentialData: BiometricCredential = {
        id: this.bufferToBase64(credential.rawId),
        publicKey: this.bufferToBase64((credential.response as AuthenticatorAttestationResponse).getPublicKey()!),
        email: email,
        createdAt: Date.now()
      };

      this.saveCredential(credentialData);
      
      // Salva senha criptografada se fornecida
      if (password) {
        const secureCredential: SecureCredential = {
          email: email,
          encryptedPassword: this.encrypt(password),
          biometricId: credentialData.id,
          createdAt: Date.now()
        };
        this.saveSecureCredential(secureCredential);
      }
      
      return true;
    } catch (error: any) {
      console.error('Erro ao registrar biometria:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Registro de biometria cancelado pelo usuário');
      } else if (error.name === 'InvalidStateError') {
        throw new Error('Esta credencial já foi registrada');
      }
      
      throw new Error('Erro ao registrar biometria. Tente novamente.');
    }
  }

  /**
   * Autentica usando biometria e retorna credenciais
   */
  async authenticateWithBiometric(email?: string): Promise<{ email: string; password?: string }> {
    if (!await this.isBiometricAvailable()) {
      throw new Error('Biometria não disponível neste dispositivo');
    }

    try {
      const credentials = this.getStoredCredentials();
      
      if (credentials.length === 0) {
        throw new Error('Nenhuma credencial biométrica registrada');
      }

      const allowCredentials = email 
        ? credentials.filter(c => c.email === email)
        : credentials;

      if (allowCredentials.length === 0) {
        throw new Error('Nenhuma credencial biométrica encontrada para este usuário');
      }

      const challenge = this.generateChallenge();

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge: challenge as BufferSource,
        allowCredentials: allowCredentials.map(cred => ({
          id: this.base64ToBuffer(cred.id) as BufferSource,
          type: 'public-key' as const,
          transports: ['internal'] as AuthenticatorTransport[]
        })),
        timeout: 60000,
        userVerification: 'required',
        rpId: this.RP_ID
      };

      const assertion = await navigator.credentials.get({
        publicKey: publicKeyCredentialRequestOptions
      }) as PublicKeyCredential;

      if (!assertion) {
        throw new Error('Falha na autenticação');
      }

      const credentialId = this.bufferToBase64(assertion.rawId);
      const usedCredential = credentials.find(c => c.id === credentialId);

      if (!usedCredential) {
        throw new Error('Credencial não encontrada');
      }

      // Busca credencial segura associada
      const secureCredential = this.getSecureCredential(usedCredential.email);
      
      // Retorna email e senha descriptografada (se existir)
      return {
        email: usedCredential.email,
        password: secureCredential ? this.decrypt(secureCredential.encryptedPassword) : undefined
      };
    } catch (error: any) {
      console.error('Erro na autenticação biométrica:', error);
      
      if (error.name === 'NotAllowedError') {
        throw new Error('Autenticação biométrica cancelada');
      }
      
      throw new Error(error.message || 'Erro na autenticação biométrica');
    }
  }

  /**
   * Verifica se há credencial biométrica registrada para um email
   */
  hasCredentialForEmail(email: string): boolean {
    const credentials = this.getStoredCredentials();
    return credentials.some(c => c.email === email);
  }

  /**
   * Remove credencial biométrica de um email
   */
  removeCredential(email: string): void {
    const credentials = this.getStoredCredentials();
    const filtered = credentials.filter(c => c.email !== email);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
    
    // Remove também credencial segura
    this.removeSecureCredential(email);
  }

  /**
   * Remove todas as credenciais
   */
  clearAllCredentials(): void {
    localStorage.removeItem(this.STORAGE_KEY);
    localStorage.removeItem(this.SECURE_STORAGE_KEY);
  }

  /**
   * Obtém todas as credenciais armazenadas
   */
  private getStoredCredentials(): BiometricCredential[] {
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Salva uma credencial
   */
  private saveCredential(credential: BiometricCredential): void {
    const credentials = this.getStoredCredentials();
    const filtered = credentials.filter(c => c.email !== credential.email);
    filtered.push(credential);
    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Gera um challenge aleatório
   */
  private generateChallenge(): Uint8Array {
    const challenge = new Uint8Array(32);
    window.crypto.getRandomValues(challenge);
    return challenge;
  }

  /**
   * Converte string para ArrayBuffer
   */
  private stringToBuffer(str: string): Uint8Array {
    return new TextEncoder().encode(str);
  }

  /**
   * Converte ArrayBuffer para Base64
   */
  private bufferToBase64(buffer: ArrayBuffer): string {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return window.btoa(binary);
  }

  /**
   * Converte Base64 para ArrayBuffer
   */
  private base64ToBuffer(base64: string): Uint8Array {
    const binary = window.atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  // ==================== CREDENCIAIS SEGURAS ====================

  /**
   * Salva credencial criptografada
   */
  private saveSecureCredential(credential: SecureCredential): void {
    const credentials = this.getSecureCredentials();
    const filtered = credentials.filter(c => c.email !== credential.email);
    filtered.push(credential);
    localStorage.setItem(this.SECURE_STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Obtém credencial segura por email
   */
  private getSecureCredential(email: string): SecureCredential | undefined {
    const credentials = this.getSecureCredentials();
    return credentials.find(c => c.email === email);
  }

  /**
   * Obtém todas as credenciais seguras
   */
  private getSecureCredentials(): SecureCredential[] {
    const stored = localStorage.getItem(this.SECURE_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  }

  /**
   * Remove credencial segura
   */
  private removeSecureCredential(email: string): void {
    const credentials = this.getSecureCredentials();
    const filtered = credentials.filter(c => c.email !== email);
    localStorage.setItem(this.SECURE_STORAGE_KEY, JSON.stringify(filtered));
  }

  /**
   * Criptografa senha (Base64 simples - para produção, use Web Crypto API)
   */
  private encrypt(text: string): string {
    const combined = this.ENCRYPTION_KEY + text;
    return window.btoa(encodeURIComponent(combined));
  }

  /**
   * Descriptografa senha
   */
  private decrypt(encrypted: string): string {
    try {
      const combined = decodeURIComponent(window.atob(encrypted));
      return combined.substring(this.ENCRYPTION_KEY.length);
    } catch (error) {
      console.error('Erro ao descriptografar:', error);
      return '';
    }
  }
}
