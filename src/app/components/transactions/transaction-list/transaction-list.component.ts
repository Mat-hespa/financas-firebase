import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TransactionService } from '../../../services/transaction.service';
import { Transaction } from '../../../models/transaction.model';
import { FooterComponent } from '../../shared/footer/footer.component';
import { Observable, BehaviorSubject, combineLatest } from 'rxjs';
import { map } from 'rxjs/operators';

type FilterType = 'all' | 'income' | 'expense';

@Component({
  selector: 'app-transaction-list',
  standalone: true,
  imports: [CommonModule, FooterComponent],
  templateUrl: './transaction-list.component.html',
  styleUrls: ['./transaction-list.component.scss']
})
export class TransactionListComponent implements OnInit {
  private transactionService = inject(TransactionService);
  private router = inject(Router);

  transactions$!: Observable<Transaction[]>;
  filteredTransactions$!: Observable<Transaction[]>;
  isLoading = true;
  dataLoaded = false;
  
  selectedFilter: FilterType = 'all';
  private filterSubject = new BehaviorSubject<FilterType>('all');

  ngOnInit() {
    this.loadTransactions();
  }

  loadTransactions() {
    this.isLoading = true;
    this.dataLoaded = false;
    this.transactions$ = this.transactionService.getUserTransactions();
    
    // Combinar transações com filtros
    this.filteredTransactions$ = combineLatest([
      this.transactions$,
      this.filterSubject.asObservable()
    ]).pipe(
      map(([transactions, filter]) => {
        if (filter === 'all') {
          return transactions;
        }
        return transactions.filter(transaction => transaction.type === filter);
      })
    );
    
    // Aguardar dados reais carregarem
    this.transactions$.subscribe({
      next: (transactions) => {
        this.dataLoaded = true;
        // Pequeno delay apenas para garantir que o DOM foi atualizado
        setTimeout(() => {
          this.isLoading = false;
        }, 100);
      },
      error: (error) => {
        console.error('Erro ao carregar transações:', error);
        this.dataLoaded = true;
        this.isLoading = false;
      }
    });
  }

  setFilter(filter: FilterType) {
    this.selectedFilter = filter;
    this.filterSubject.next(filter);
  }

  formatDate(date: any): string {
    if (!date) return '';
    
    let dateObj: Date;
    if (date.toDate) {
      dateObj = date.toDate(); // Firestore timestamp
    } else if (typeof date === 'string') {
      dateObj = new Date(date);
    } else {
      dateObj = date;
    }
    
    return dateObj.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  getCategoryIcon(categoryId: string): string {
    const categoryMap: { [key: string]: string } = {
      'food': 'restaurant',
      'transport': 'directions_car',
      'entertainment': 'movie',
      'health': 'local_hospital',
      'shopping': 'shopping_bag',
      'bills': 'receipt_long',
      'education': 'school',
      'salary': 'payments',
      'freelance': 'work',
      'investment': 'trending_up',
      'gift': 'card_giftcard',
      'other': 'category'
    };
    return categoryMap[categoryId] || 'category';
  }

  getCategoryName(categoryId: string): string {
    const categoryMap: { [key: string]: string } = {
      'food': 'Alimentação',
      'transport': 'Transporte',
      'entertainment': 'Entretenimento',
      'health': 'Saúde',
      'shopping': 'Compras',
      'bills': 'Contas',
      'education': 'Educação',
      'salary': 'Salário',
      'freelance': 'Freelance',
      'investment': 'Investimento',
      'gift': 'Presente',
      'other': 'Outros'
    };
    return categoryMap[categoryId] || 'Outros';
  }

  getCategoryColor(categoryId: string): string {
    const colorMap: { [key: string]: string } = {
      'food': '#FF6B6B',
      'transport': '#4ECDC4',
      'entertainment': '#45B7D1',
      'health': '#96CEB4',
      'shopping': '#FFEAA7',
      'bills': '#DDA0DD',
      'education': '#74B9FF',
      'salary': '#00B894',
      'freelance': '#FDCB6E',
      'investment': '#E17055',
      'gift': '#FD79A8',
      'other': '#636E72'
    };
    return colorMap[categoryId] || '#636E72';
  }

  addTransaction() {
    this.router.navigate(['/add-transaction']);
  }
}