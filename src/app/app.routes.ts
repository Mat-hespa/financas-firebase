import { Routes } from '@angular/router';
import { LoginComponent } from './components/auth/login/login.component';
import { RegisterComponent } from './components/auth/register/register.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { AddTransactionComponent } from './components/transactions/add-transaction/add-transaction.component';
import { TransactionListComponent } from './components/transactions/transaction-list/transaction-list.component';
import { MonthlyAnalysisComponent } from './components/analytics/monthly-analysis/monthly-analysis.component';

export const routes: Routes = [
  { path: '', redirectTo: '/login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'add-transaction', component: AddTransactionComponent },
  { path: 'transactions', component: TransactionListComponent },
  { path: 'analytics', component: MonthlyAnalysisComponent },
  { path: '**', redirectTo: '/login' }
];
