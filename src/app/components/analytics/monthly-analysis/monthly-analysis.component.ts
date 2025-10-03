import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { TransactionService } from '../../../services/transaction.service';
import { MonthlyAnalysis, Transaction } from '../../../models/transaction.model';

interface CategoryExpense {
  id: string;
  name: string;
  icon: string;
  color: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

interface PieSegment {
  path: string;
  color: string;
  startAngle: number;
  endAngle: number;
}

interface MonthlyData {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  transactions: Transaction[];
}

@Component({
  selector: 'app-monthly-analysis',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './monthly-analysis.component.html',
  styleUrl: './monthly-analysis.component.scss'
})
export class MonthlyAnalysisComponent implements OnInit {
  private router = inject(Router);
  private transactionService = inject(TransactionService);

  currentMonth = new Date().getMonth() + 1;
  currentYear = new Date().getFullYear();
  monthlyAnalysis: MonthlyAnalysis | null = null;
  monthlyData: MonthlyData | null = null;
  expensesByCategory: CategoryExpense[] = [];
  topExpenseCategory: CategoryExpense | null = null;
  pieSegments: PieSegment[] = [];
  isLoading = true;
  isLoadingAnalysis = false;
  dataReady = false;
  isMonthDropdownOpen = false;

  months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  ngOnInit() {
    this.loadMonthlyAnalysis();
    
    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.month-dropdown')) {
        this.isMonthDropdownOpen = false;
      }
    });
  }

  loadMonthlyAnalysis() {
    this.isLoading = true;
    this.isLoadingAnalysis = true;
    this.dataReady = false;
    // Limpa dados anteriores
    this.monthlyData = null;
    this.expensesByCategory = [];
    this.topExpenseCategory = null;
    this.pieSegments = [];
    
    this.transactionService.getMonthlyAnalysis(this.currentMonth, this.currentYear)
      .subscribe({
        next: (analysis) => {
          this.monthlyAnalysis = analysis;
          
          // Processa todos os dados primeiro
          this.processMonthlyData(analysis);
          
          // Marca dados como prontos
          this.dataReady = true;
          
          // Remove skeleton apenas quando tudo está processado
          setTimeout(() => {
            this.isLoading = false;
            // Depois remove o loading das análises condicionais
            setTimeout(() => {
              this.isLoadingAnalysis = false;
            }, 50);
          }, 100);
        },
        error: (error) => {
          console.error('Erro ao carregar análise:', error);
          this.isLoading = false;
          this.isLoadingAnalysis = false;
          this.dataReady = false;
        }
      });
  }

  processMonthlyData(analysis: MonthlyAnalysis) {
    this.monthlyData = {
      totalIncome: analysis.totalIncome,
      totalExpense: analysis.totalExpense,
      balance: analysis.balance,
      transactions: analysis.transactions
    };

    // Processar gastos por categoria
    this.expensesByCategory = this.processExpensesByCategory(analysis);
    this.topExpenseCategory = this.expensesByCategory.length > 0 ? this.expensesByCategory[0] : null;
    this.pieSegments = this.generatePieSegments(this.expensesByCategory);
  }

  processExpensesByCategory(analysis: MonthlyAnalysis): CategoryExpense[] {
    const categoryMap = new Map<string, { amount: number; count: number }>();

    // Agrupar transações de gasto por categoria
    const expenseTransactions = analysis.transactions.filter(t => t.type === 'expense');

    expenseTransactions.forEach(transaction => {
      const current = categoryMap.get(transaction.category) || { amount: 0, count: 0 };
      categoryMap.set(transaction.category, {
        amount: current.amount + transaction.amount,
        count: current.count + 1
      });
    });

    // Converter para array de CategoryExpense
    const categories: CategoryExpense[] = [];
    categoryMap.forEach((data, categoryId) => {
      const category = this.transactionService.getCategoryById(categoryId);
      if (category) {
        categories.push({
          id: categoryId,
          name: category.name,
          icon: category.icon,
          color: category.color,
          amount: data.amount,
          percentage: analysis.totalExpense > 0 ? Math.round((data.amount / analysis.totalExpense) * 100 * 10) / 10 : 0,
          transactionCount: data.count
        });
      }
    });

    // Ordenar por valor (maior primeiro)
    return categories.sort((a, b) => b.amount - a.amount);
  }

  generatePieSegments(categories: CategoryExpense[]): PieSegment[] {
    if (categories.length === 0) return [];

    const segments: PieSegment[] = [];
    let currentAngle = 0;
    const radius = 60;
    const centerX = 100;
    const centerY = 100;

    categories.forEach(category => {
      const angleSize = (category.percentage / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angleSize;

      // Converter ângulos para radianos
      const startRad = (startAngle * Math.PI) / 180;
      const endRad = (endAngle * Math.PI) / 180;

      // Calcular pontos do arco
      const x1 = centerX + radius * Math.cos(startRad);
      const y1 = centerY + radius * Math.sin(startRad);
      const x2 = centerX + radius * Math.cos(endRad);
      const y2 = centerY + radius * Math.sin(endRad);

      // Determinar se é um arco grande
      const largeArc = angleSize > 180 ? 1 : 0;

      // Criar path SVG
      const path = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');

      segments.push({
        path,
        color: category.color,
        startAngle: startAngle,
        endAngle: endAngle
      });

      currentAngle = endAngle;
    });

    return segments;
  }

  getMonthName(month: number): string {
    return this.months[month - 1];
  }

  previousMonth() {
    this.currentMonth--;
    if (this.currentMonth < 1) {
      this.currentMonth = 12;
      this.currentYear--;
    }
    this.loadMonthlyAnalysis();
  }

  nextMonth() {
    this.currentMonth++;
    if (this.currentMonth > 12) {
      this.currentMonth = 1;
      this.currentYear++;
    }
    this.loadMonthlyAnalysis();
  }

  isCurrentMonth(): boolean {
    const now = new Date();
    return this.currentMonth === now.getMonth() + 1 && this.currentYear === now.getFullYear();
  }

  // Métodos para o seletor modernizado
  toggleMonthDropdown(): void {
    this.isMonthDropdownOpen = !this.isMonthDropdownOpen;
  }

  selectMonth(month: number): void {
    if (!this.isMonthDisabled(month)) {
      this.currentMonth = month;
      this.isMonthDropdownOpen = false;
      this.loadMonthlyAnalysis();
    }
  }

  changeYear(delta: number): void {
    const newYear = this.currentYear + delta;
    const currentDate = new Date();
    if (newYear <= currentDate.getFullYear()) {
      this.currentYear = newYear;
    }
  }

  isMonthDisabled(month: number): boolean {
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth() + 1;
    
    return this.currentYear === currentYear && month > currentMonth;
  }

  formatCurrency(amount: number): string {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(amount);
  }

  formatDate(date: Date): string {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: 'short'
    }).format(date);
  }

  getBalanceColor(): string {
    if (!this.monthlyAnalysis) return '#64748b';
    return this.monthlyAnalysis.balance >= 0 ? '#10b981' : '#ef4444';
  }

  getBalanceIcon(): string {
    if (!this.monthlyAnalysis) return 'remove';
    return this.monthlyAnalysis.balance >= 0 ? 'trending_up' : 'trending_down';
  }

  addTransaction() {
    this.router.navigate(['/add-transaction']);
  }

  getCurrentYear(): number {
    return new Date().getFullYear();
  }

  // Métodos para estatísticas e porcentagens
  getIncomeGrowthPercentage(): string {
    // Placeholder - pode ser implementado com dados históricos
    return '12.5';
  }

  getExpensePercentageOfIncome(): string {
    if (!this.monthlyData || this.monthlyData.totalIncome === 0) return '0';
    const percentage = (this.monthlyData.totalExpense / this.monthlyData.totalIncome) * 100;
    return percentage.toFixed(1);
  }

  getSavingsPercentage(): string {
    if (!this.monthlyData || this.monthlyData.totalIncome === 0) return '0';
    const percentage = (Math.abs(this.monthlyData.balance) / this.monthlyData.totalIncome) * 100;
    return percentage.toFixed(1);
  }

  getIncomeTransactionCount(): number {
    if (!this.monthlyData) return 0;
    return this.monthlyData.transactions.filter(t => t.type === 'income').length;
  }

  getExpenseTransactionCount(): number {
    if (!this.monthlyData) return 0;
    return this.monthlyData.transactions.filter(t => t.type === 'expense').length;
  }

  getSavingsMessage(): string {
    if (!this.monthlyData) return '';
    
    if (this.monthlyData.balance >= 0) {
      const percentage = parseFloat(this.getSavingsPercentage());
      if (percentage >= 20) return 'Excelente economia!';
      if (percentage >= 10) return 'Boa economia!';
      return 'Continue economizando!';
    } else {
      return 'Reduza os gastos!';
    }
  }
}
