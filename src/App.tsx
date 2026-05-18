import { useEffect, useState } from 'react';
import { BackToTop } from '@/components/BackToTop';
import { BottomTabNav, type MainTab } from '@/components/BottomTabNav';
import { SplashScreen } from '@/components/SplashScreen';
import { AccountManagementPage } from '@/features/account/AccountManagementPage';
import { BillsPage } from '@/features/bills/BillsPage';
import { BudgetPage } from '@/features/budget/BudgetPage';
import { CategoryManagementPage } from '@/features/category/CategoryManagementPage';
import { HomePage } from '@/features/home/HomePage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { StatisticsPage } from '@/features/statistics/StatisticsPage';
import { NewTransactionPage } from '@/features/transaction/NewTransactionPage';
import { getCurrentMonthKey } from '@/utils/month';

type AppView =
  | MainTab
  | 'new-transaction'
  | 'budget'
  | 'categories'
  | 'accounts-detail';

const mainTabs: MainTab[] = ['home', 'bills', 'statistics', 'accounts', 'settings'];

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
        onOpenCategoryManagement={() => setView('categories')}
      />
    );
  } else if (view === 'categories') {
    content = <CategoryManagementPage onBack={() => setView('settings')} />;
  } else if (view === 'accounts-detail') {
    content = <AccountManagementPage onBack={() => setView('settings')} />;
  } else if (view === 'accounts') {
    content = <AccountManagementPage />;
  } else if (view === 'bills') {
    content = (
      <BillsPage
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        onCreateTransaction={() => {
          setSuccessMessage('');
          setView('new-transaction');
        }}
      />
    );
  } else {
    content = (
      <HomePage
        selectedMonth={selectedMonth}
        onMonthChange={setSelectedMonth}
        successMessage={successMessage}
        onOpenStatistics={() => {
          setSuccessMessage('');
          setView('statistics');
        }}
        onOpenBills={() => {
          setSuccessMessage('');
          setView('bills');
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
      {mainTabs.includes(view as MainTab) ? (
        <BottomTabNav
          activeTab={view as MainTab}
          onChange={(nextTab) => {
            setSuccessMessage('');
            setView(nextTab);
          }}
        />
      ) : null}
      <BackToTop />
      <SplashScreen />
    </>
  );
}
