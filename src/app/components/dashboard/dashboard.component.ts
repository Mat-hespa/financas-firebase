import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { TransactionService } from '../../services/transaction.service';
import { Transaction } from '../../models/transaction.model';
import { Observable, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  private authService = inject(AuthService);
  private transactionService = inject(TransactionService);
  private router = inject(Router);

  user: any = null;
  currentBalance$: Observable<number>;
  recentTransactions$: Observable<Transaction[]>;
  monthlyTotals$: Observable<{income: number, expense: number}>;

  constructor() {
    this.currentBalance$ = this.transactionService.getCurrentBalance();
    this.recentTransactions$ = this.transactionService.getRecentTransactions(3);

    const currentMonth = new Date().getMonth() + 1;
    const currentYear = new Date().getFullYear();

    this.monthlyTotals$ = this.transactionService.getMonthlyTransactions(currentMonth, currentYear).pipe(
      map(transactions => ({
        income: transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0),
        expense: transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      }))
    );
  }

  ngOnInit() {
    this.authService.user$.subscribe(user => {
      this.user = user;
      if (!user) {
        this.router.navigate(['/login']);
      }
    });
  }

  async logout() {
    try {
      await this.authService.logout();
      this.router.navigate(['/login']);
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  }

  addTransaction() {
    this.router.navigate(['/add-transaction']);
  }

  viewAnalytics() {
    this.router.navigate(['/analytics']);
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  formatDate(date: Date): string {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Hoje, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Ontem, ${date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
    } else {
      const diffTime = Math.abs(today.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return `${diffDays} dias atrás`;
    }
  }

  getCategoryIcon(categoryId: string): string {
    const category = this.transactionService.getCategoryById(categoryId);
    return category?.icon || 'category';
  }

  isLargeValue(value: number): boolean {
    // Considera um valor "grande" se tiver mais de 4 dígitos antes da vírgula
    return value >= 10000;
  }
}
