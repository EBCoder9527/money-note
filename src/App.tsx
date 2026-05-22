import { useEffect, useState } from 'react';
import { BackToTop } from '@/components/BackToTop';
import { BackupReminderDialog } from '@/components/BackupReminderDialog';
import { BottomTabNav, type MainTab } from '@/components/BottomTabNav';
import { SplashScreen } from '@/components/SplashScreen';
import { Toast } from '@/components/Toast';
import { AccountManagementPage } from '@/features/account/AccountManagementPage';
import { BillsPage } from '@/features/bills/BillsPage';
import { BudgetPage } from '@/features/budget/BudgetPage';
import { CategoryManagementPage } from '@/features/category/CategoryManagementPage';
import { HomePage } from '@/features/home/HomePage';
import { SettingsPage } from '@/features/settings/SettingsPage';
import { StatisticsPage } from '@/features/statistics/StatisticsPage';
import { NewTransactionPage } from '@/features/transaction/NewTransactionPage';
import { exportBackupJson } from '@/utils/backup';
import { dismissBackupReminder, shouldShowBackupReminder } from '@/utils/backupReminder';
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
  const [globalToast, setGlobalToast] = useState<{ message: string; type: 'success' | 'error' }>({
    message: '',
    type: 'success',
  });
  const [isBackupReminderOpen, setIsBackupReminderOpen] = useState(false);
  const [isBackupExporting, setIsBackupExporting] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonthKey);

  useEffect(() => {
    if (!successMessage) {
      return;
    }

    const timer = window.setTimeout(() => setSuccessMessage(''), 2400);
    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    if (view !== 'home') {
      return;
    }

    const timer = window.setTimeout(() => {
      if (shouldShowBackupReminder()) {
        setIsBackupReminderOpen(true);
      }
    }, 800);

    return () => window.clearTimeout(timer);
  }, [view]);

  function handleDismissBackupReminder() {
    dismissBackupReminder();
    setIsBackupReminderOpen(false);
  }

  async function handleReminderBackupExport() {
    setIsBackupExporting(true);
    setGlobalToast({ message: '', type: 'success' });

    try {
      await exportBackupJson();
      setIsBackupReminderOpen(false);
      setGlobalToast({ message: '备份已导出，请妥善保存文件。', type: 'success' });
    } catch {
      setGlobalToast({ message: '备份导出失败，请稍后重试。', type: 'error' });
    } finally {
      setIsBackupExporting(false);
    }
  }

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
        onSuccessMessageClose={() => setSuccessMessage('')}
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
      <Toast
        message={globalToast.message}
        type={globalToast.type}
        onClose={() => setGlobalToast((current) => ({ ...current, message: '' }))}
      />
      <BackupReminderDialog
        open={isBackupReminderOpen}
        isExporting={isBackupExporting}
        onDismiss={handleDismissBackupReminder}
        onExport={() => void handleReminderBackupExport()}
      />
      <SplashScreen />
    </>
  );
}
