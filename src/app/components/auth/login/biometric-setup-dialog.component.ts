import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-biometric-setup-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="biometric-dialog">
      <button class="close-btn" mat-icon-button (click)="onCancel()">
        <span class="material-icons">close</span>
      </button>
      
      <div class="dialog-body">
        <div class="icon-wrapper">
          <span class="material-icons">fingerprint</span>
        </div>
        
        <h2>Ativar Biometria?</h2>
        <p>Entre mais rápido com Face ID ou Touch ID</p>
        
        <div class="actions">
          <button class="btn-primary" (click)="onConfirm()">
            Ativar
          </button>
          <button class="btn-secondary" (click)="onCancel()">
            Agora não
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .biometric-dialog {
      position: relative;
      padding: 0;
      overflow: hidden;
      background: var(--background-primary);
      border-radius: 24px;
    }

    .close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      color: var(--text-tertiary);
      z-index: 10;
      transition: all 0.2s ease;
    }

    .close-btn:hover {
      color: var(--text-primary);
      background: var(--background-secondary);
    }

    .dialog-body {
      padding: 48px 32px;
      text-align: center;
    }

    .icon-wrapper {
      width: 100px;
      height: 100px;
      margin: 0 auto 24px;
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 8px 32px rgba(59, 130, 246, 0.3);
      animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .icon-wrapper .material-icons {
      font-size: 56px;
      color: white;
    }

    @keyframes scaleIn {
      0% {
        transform: scale(0);
        opacity: 0;
      }
      100% {
        transform: scale(1);
        opacity: 1;
      }
    }

    h2 {
      font-size: 28px;
      font-weight: 800;
      color: var(--text-primary);
      margin: 0 0 12px 0;
      letter-spacing: -0.5px;
    }

    p {
      font-size: 16px;
      color: var(--text-secondary);
      margin: 0 0 32px 0;
      line-height: 1.5;
    }

    .actions {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .btn-primary,
    .btn-secondary {
      width: 100%;
      height: 56px;
      border: none;
      border-radius: 16px;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.3s ease;
      font-family: inherit;
    }

    .btn-primary {
      background: linear-gradient(135deg, #3b82f6, #8b5cf6);
      color: white;
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3);
    }

    .btn-primary:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 24px rgba(59, 130, 246, 0.4);
    }

    .btn-primary:active {
      transform: translateY(0);
    }

    .btn-secondary {
      background: transparent;
      color: var(--text-secondary);
      border: 2px solid var(--border-color);
    }

    .btn-secondary:hover {
      background: var(--background-secondary);
      color: var(--text-primary);
    }

    @media (max-width: 768px) {
      .dialog-body {
        padding: 40px 24px;
      }

      .icon-wrapper {
        width: 80px;
        height: 80px;
      }

      .icon-wrapper .material-icons {
        font-size: 48px;
      }

      h2 {
        font-size: 24px;
      }

      p {
        font-size: 15px;
      }

      .btn-primary,
      .btn-secondary {
        height: 52px;
        font-size: 15px;
      }
    }
  `]
})
export class BiometricSetupDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<BiometricSetupDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { email: string }
  ) {}

  onCancel(): void {
    this.dialogRef.close({ setupBiometric: false });
  }

  onConfirm(): void {
    this.dialogRef.close({ setupBiometric: true });
  }
}
