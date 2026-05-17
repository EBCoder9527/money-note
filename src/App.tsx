import { useEffect, useState } from 'react';
import { BackToTop } from '@/components/BackToTop';
import { SplashScreen } from '@/components/SplashScreen';
import { AccountManagementPage } from '@/features/account/AccountManagementPage';
import { BudgetPage } from '@/features/budget/BudgetPage';
import { CategoryManagementPage } from '@/features/category/CategoryManagementPage';
import { HomePage } from '@/features/home/HomePage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { StatisticsPage } from '@/features/statistics/StatisticsPage';
import { NewTransactionPage } from '@/features/transaction/NewTransactionPage';
import { getCurrentMonthKey } from '@/utils/month';

type AppView =
  | 'home'
  | 'new-transaction'
  | 'budget'
  | 'statistics'
  | 'settings'
  | 'categories'
  | 'accounts';

export function App() {
  const [view, setView] = useState<AppView>('home');
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSuccessMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  let content;

  if (view === 'new-transaction') {
    content = (
      <NewTransactionPage
        onCancel={() => setView('home')}
        onSaved={() => {
          setSuccessMessage('账单已保存');
          setView('home');
        }}
      />
    );
  } else if (view === 'budget') {
    content = (
      <BudgetPage
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onCancel={() => setView('home')}
        onSaved={() => {
          setSuccessMessage('预算已保存');
          setView('home');
        }}
      />
    );
  } else if (view === 'statistics') {
    content = (
      <StatisticsPage
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onBack={() => setView('home')}
      />
    );
  } else if (view === 'settings') {
    content = (
      <SettingsPage
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onOpenAccountManagement={() => setView('accounts')}
        onOpenCategoryManagement={() => setView('categories')}
        onBack={() => setView('home')}
      />
    );
  } else if (view === 'categories') {
    content = <CategoryManagementPage onBack={() => setView('settings')} />;
  } else if (view === 'accounts') {
    content = <AccountManagementPage onBack={() => setView('settings')} />;
  } else {
    content = (
      <HomePage
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        successMessage={successMessage}
        onOpenSettings={() => {
          setSuccessMessage('');
          setView('settings');
        }}
        onOpenStatistics={() => {
          setSuccessMessage('');
          setView('statistics');
        }}
        onManageBudget={() => {
          setSuccessMessage('');
          setView('budget');
        }}
        onCreateTransaction={() => {
          setSuccessMessage('');
          setView('new-transaction');
        }}
      />
    );
  }

  return (
    <>
      {content}
      <BackToTop />
      <SplashScreen />
    </>
  );
}
