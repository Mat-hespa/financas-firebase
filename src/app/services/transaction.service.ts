import { Injectable, inject } from '@angular/core';
import { Firestore, collection, addDoc, query, where, orderBy, getDocs, doc, updateDoc, deleteDoc, Timestamp, collectionData, CollectionReference } from '@angular/fire/firestore';
import { AuthService } from './auth.service';
import { Observable, from, map, switchMap, of, startWith, catchError } from 'rxjs';
import { Transaction, Category, MonthlyAnalysis, CategoryBreakdown } from '../models/transaction.model';

@Injectable({
  providedIn: 'root'
})
export class TransactionService {
  private firestore = inject(Firestore);
  private authService = inject(AuthService);

  // Propriedades necessárias
  private transactionsCollection = collection(this.firestore, 'transactions');
  user$ = this.authService.user$;

  private readonly defaultCategories: Category[] = [
    // Receitas
    { id: 'salary', name: 'Salário', icon: 'work', type: 'income', color: '#10b981' },
    { id: 'freelance', name: 'Freelance', icon: 'computer', type: 'income', color: '#3b82f6' },
    { id: 'investment', name: 'Investimentos', icon: 'trending_up', type: 'income', color: '#8b5cf6' },
    { id: 'other_income', name: 'Outros', icon: 'attach_money', type: 'income', color: '#06b6d4' },

    // Gastos
    { id: 'food', name: 'Alimentação', icon: 'restaurant', type: 'expense', color: '#ef4444' },
    { id: 'transport', name: 'Transporte', icon: 'directions_car', type: 'expense', color: '#f97316' },
    { id: 'shopping', name: 'Compras', icon: 'shopping_bag', type: 'expense', color: '#ec4899' },
    { id: 'bills', name: 'Contas', icon: 'receipt', type: 'expense', color: '#8b5cf6' },
    { id: 'health', name: 'Saúde', icon: 'local_hospital', type: 'expense', color: '#06b6d4' },
    { id: 'entertainment', name: 'Lazer', icon: 'movie', type: 'expense', color: '#f59e0b' },
    { id: 'education', name: 'Educação', icon: 'school', type: 'expense', color: '#10b981' },
    { id: 'other_expense', name: 'Outros', icon: 'more_horiz', type: 'expense', color: '#6b7280' }
  ];

  async createTransaction(transaction: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const user = await this.authService.getCurrentUser();
    if (!user) throw new Error('Usuário não autenticado');

    const transactionData = {
      ...transaction,
      userId: user.uid,
      date: Timestamp.fromDate(transaction.date),
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    };

    const docRef = await addDoc(collection(this.firestore, 'transactions'), transactionData);
    return docRef.id;
  }

  getUserTransactions(): Observable<Transaction[]> {
    return this.authService.user$.pipe(
      switchMap(user => {
        if (!user) {
          return from(Promise.resolve([])); // Retorna array vazio imediatamente
        }

        const q = query(
          collection(this.firestore, 'transactions'),
          where('userId', '==', user.uid),
          orderBy('date', 'desc')
        );

        return from(getDocs(q)).pipe(
          map(snapshot => {
            if (snapshot.empty) {
              return []; // Retorna array vazio quando não há documentos
            }
            return snapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
              date: doc.data()['date'].toDate(),
              createdAt: doc.data()['createdAt'].toDate(),
              updatedAt: doc.data()['updatedAt'].toDate()
            } as Transaction));
          })
        );
      })
    );
  }

  // Método para obter transações do mês atual (versão simplificada sem índice composto)
  getTransactionsThisMonth(): Observable<Transaction[]> {
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

    return this.getUserTransactions().pipe(
      map(transactions => {
        // Filtragem e ordenação no cliente
        return transactions
          .filter(transaction => {
            const transactionDate = transaction.date;
            return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
          })
          .sort((a, b) => b.date.getTime() - a.date.getTime());
      })
    );
  }

  // Método para obter transações de um mês específico
  getMonthlyTransactions(month: number, year: number): Observable<Transaction[]> {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59);

    return this.getUserTransactions().pipe(
      map(transactions => {
        return transactions
          .filter(transaction => {
            const transactionDate = transaction.date;
            return transactionDate >= startOfMonth && transactionDate <= endOfMonth;
          })
          .sort((a, b) => b.date.getTime() - a.date.getTime());
      }),
      startWith([]), // Emite array vazio imediatamente
      catchError(() => of([])) // Em caso de erro, retorna array vazio
    );
  }

  async updateTransaction(id: string, updates: Partial<Transaction>): Promise<void> {
    const transactionRef = doc(this.firestore, 'transactions', id);
    const updateData: any = {
      ...updates,
      updatedAt: Timestamp.now()
    };

    if (updates.date) {
      updateData.date = Timestamp.fromDate(updates.date);
    }

    await updateDoc(transactionRef, updateData);
  }

  async deleteTransaction(id: string): Promise<void> {
    const transactionRef = doc(this.firestore, 'transactions', id);
    await deleteDoc(transactionRef);
  }

  getCategories(type?: 'income' | 'expense'): Category[] {
    if (type) {
      return this.defaultCategories.filter(cat => cat.type === type);
    }
    return this.defaultCategories;
  }

  getCategoryById(id: string): Category | undefined {
    return this.defaultCategories.find(cat => cat.id === id);
  }

  getMonthlyAnalysis(month: number, year: number): Observable<MonthlyAnalysis> {
    return this.getMonthlyTransactions(month, year).pipe(
      map((transactions: Transaction[]) => {
        const totalIncome = transactions
          .filter((t: Transaction) => t.type === 'income')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        const totalExpense = transactions
          .filter((t: Transaction) => t.type === 'expense')
          .reduce((sum: number, t: Transaction) => sum + t.amount, 0);

        const categoryBreakdown = this.calculateCategoryBreakdown(transactions);

        return {
          month,
          year,
          totalIncome,
          totalExpense,
          balance: totalIncome - totalExpense,
          transactions,
          categoryBreakdown
        };
      })
    );
  }

  private calculateCategoryBreakdown(transactions: Transaction[]): CategoryBreakdown[] {
    const categoryTotals = new Map<string, number>();

    transactions.forEach(transaction => {
      const current = categoryTotals.get(transaction.category) || 0;
      categoryTotals.set(transaction.category, current + transaction.amount);
    });

    const total = Array.from(categoryTotals.values()).reduce((sum, amount) => sum + amount, 0);

    return Array.from(categoryTotals.entries()).map(([categoryId, amount]) => {
      const category = this.getCategoryById(categoryId);
      return {
        category: category?.name || categoryId,
        amount,
        percentage: total > 0 ? (amount / total) * 100 : 0,
        color: category?.color || '#64748b',
        icon: category?.icon || 'category'
      };
    }).sort((a, b) => b.amount - a.amount);
  }

  getCurrentBalance(): Observable<number> {
    return this.getUserTransactions().pipe(
      map(transactions => {
        if (!transactions || transactions.length === 0) {
          return 0; // Retorna 0 explicitamente quando não há transações
        }
        
        const totalIncome = transactions
          .filter(t => t.type === 'income')
          .reduce((sum, t) => sum + t.amount, 0);

        const totalExpense = transactions
          .filter(t => t.type === 'expense')
          .reduce((sum, t) => sum + t.amount, 0);

        return totalIncome - totalExpense;
      }),
      startWith(0), // Emite 0 imediatamente
      catchError(() => of(0)) // Em caso de erro, retorna 0
    );
  }

  getRecentTransactions(limit: number = 5): Observable<Transaction[]> {
    return this.getUserTransactions().pipe(
      map(transactions => transactions.slice(0, limit)),
      startWith([]), // Emite array vazio imediatamente
      catchError(() => of([])) // Em caso de erro, retorna array vazio
    );
  }
}
