import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { TransactionService } from '../../../services/transaction.service';
import { Category } from '../../../models/transaction.model';

@Component({
  selector: 'app-add-transaction',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './add-transaction.component.html',
  styleUrl: './add-transaction.component.scss'
})
export class AddTransactionComponent {
  private fb = inject(FormBuilder);
  private router = inject(Router);
  private transactionService = inject(TransactionService);

  transactionForm: FormGroup;
  selectedType: 'income' | 'expense' = 'expense';
  categories: Category[] = [];
  selectedCategory: string = '';
  isLoading = false;
  error = '';

  constructor() {
    this.transactionForm = this.fb.group({
      amount: ['', [Validators.required, Validators.min(0.01)]],
      description: ['', [Validators.required, Validators.minLength(3)]],
      date: [new Date().toISOString().split('T')[0], Validators.required]
    });

    this.updateCategories();
  }

  selectType(type: 'income' | 'expense') {
    this.selectedType = type;
    this.selectedCategory = '';
    this.updateCategories();
  }

  updateCategories() {
    this.categories = this.transactionService.getCategories(this.selectedType);
    if (this.categories.length > 0) {
      this.selectedCategory = this.categories[0].id;
    }
  }

  selectCategory(categoryId: string) {
    this.selectedCategory = categoryId;
  }

  async onSubmit() {
    if (this.transactionForm.invalid || !this.selectedCategory) {
      this.error = 'Por favor, preencha todos os campos obrigatórios';
      return;
    }

    this.isLoading = true;
    this.error = '';

    try {
      const formValue = this.transactionForm.value;

      // Corrigir problema de fuso horário - criar data em horário local
      const selectedDate = new Date(formValue.date + 'T12:00:00');

      await this.transactionService.createTransaction({
        type: this.selectedType,
        amount: parseFloat(formValue.amount),
        description: formValue.description,
        category: this.selectedCategory,
        date: selectedDate
      });

      this.router.navigate(['/dashboard']);
    } catch (error) {
      console.error('Erro ao criar transação:', error);
      this.error = 'Erro ao salvar transação. Tente novamente.';
    } finally {
      this.isLoading = false;
    }
  }

  goBack() {
    this.router.navigate(['/dashboard']);
  }
}
