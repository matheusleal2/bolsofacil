import React, { useState, useEffect, useMemo } from 'react';
import { Plus, Trash2, ChevronLeft, ChevronRight, DollarSign, Users, Wallet, Coffee, Tag, Calendar, LogOut, TrendingUp, TrendingDown, Edit3, CreditCard as CreditCardIcon, Settings, X, List, Menu, PieChart } from 'lucide-react';
import { Auth } from './components/Auth';
import { Expense, DailyExpense, Income, CreditCard, ExpenseGroup } from './types';
import { supabase } from './supabaseClient';
import { useSupabaseData } from './hooks/useSupabaseData';

export default function App() {
  const [session, setSession] = useState<{ userId: string; userName: string } | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session?.user) {
        const name = data.session.user.user_metadata?.name || data.session.user.email?.split('@')[0] || 'Usuário';
        setSession({ userId: data.session.user.id, userName: name });
      }
      setAuthLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      if (s?.user) {
        const name = s.user.user_metadata?.name || s.user.email?.split('@')[0] || 'Usuário';
        setSession({ userId: s.user.id, userName: name });
      } else {
        setSession(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => { await supabase.auth.signOut(); setSession(null); };
  const handleLogin = (userId: string, userName: string) => setSession({ userId, userName });

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Auth onLogin={handleLogin} />;

  return <Dashboard userId={session.userId} userName={session.userName} onLogout={handleLogout} />;
}

function Dashboard({ userId, userName, onLogout }: { userId: string, userName: string, onLogout: () => void }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  });

  const [activeTab, setActiveTab] = useState<'resumo' | 'fixas' | 'cartoes' | 'panorama' | 'config'>('resumo');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Config States
  const [newGroupName, setNewGroupName] = useState('');
  const [addingCategoryTo, setAddingCategoryTo] = useState<string | null>(null);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Supabase Data
  const {
    loading,
    groups, addGroup, removeGroup, addCategory, removeCategory,
    creditCards, addCreditCard, deleteCreditCard,
    expenses, addExpense, deleteExpense,
    dailyExpenses, addDailyExpense, deleteDailyExpense,
    incomes, setIncome,
  } = useSupabaseData(userId);

  // Modals & Forms
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [expenseForm, setExpenseForm] = useState({
    name: '',
    installmentValue: '',
    totalInstallments: '',
    startMonth: currentMonth,
    dueDay: '',
    ownerType: 'Minha' as 'Minha' | 'Outros',
    ownerName: '',
    isCreditCard: false,
    creditCardId: '',
    groupId: groups[0]?.id || '',
    category: groups[0]?.categories[0] || ''
  });

  const [isDailyModalOpen, setIsDailyModalOpen] = useState(false);
  const [dailyForm, setDailyForm] = useState({
    name: '',
    value: '',
    date: new Date().toISOString().split('T')[0],
    category: groups[0]?.categories[0] || ''
  });

  const [isIncomeModalOpen, setIsIncomeModalOpen] = useState(false);
  const [incomeForm, setIncomeForm] = useState({ value: '' });

  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [cardForm, setCardForm] = useState({ name: '', closingDay: '', dueDay: '' });

  // Filters
  const [cardFilter, setCardFilter] = useState<'Todas' | 'Minhas' | 'Outros'>('Todas');

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.name || !expenseForm.installmentValue || !expenseForm.totalInstallments) return;
    if (!expenseForm.isCreditCard && !expenseForm.dueDay) return;
    if (expenseForm.isCreditCard && !expenseForm.creditCardId) return;
    await addExpense({
      name: expenseForm.name, installmentValue: parseFloat(expenseForm.installmentValue),
      totalInstallments: parseInt(expenseForm.totalInstallments), startMonth: expenseForm.startMonth,
      dueDay: expenseForm.isCreditCard ? 0 : parseInt(expenseForm.dueDay),
      ownerType: expenseForm.ownerType, ownerName: expenseForm.ownerType === 'Outros' ? expenseForm.ownerName : undefined,
      groupId: expenseForm.groupId, category: expenseForm.category,
      creditCardId: expenseForm.isCreditCard ? expenseForm.creditCardId : undefined,
    });
    setIsExpenseModalOpen(false);
    setExpenseForm({ ...expenseForm, name: '', installmentValue: '', totalInstallments: '', dueDay: '', ownerName: '' });
  };

  const handleAddDaily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!dailyForm.name || !dailyForm.value || !dailyForm.date) return;
    await addDailyExpense({ name: dailyForm.name, value: parseFloat(dailyForm.value), date: dailyForm.date, category: dailyForm.category });
    setDailyForm({ ...dailyForm, name: '', value: '' });
    setIsDailyModalOpen(false);
  };

  const handleSetIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incomeForm.value) return;
    await setIncome(parseFloat(incomeForm.value), currentMonth);
    setIncomeForm({ value: '' });
    setIsIncomeModalOpen(false);
  };

  const handleAddCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardForm.name || !cardForm.closingDay || !cardForm.dueDay) return;
    await addCreditCard({ name: cardForm.name, closingDay: parseInt(cardForm.closingDay), dueDay: parseInt(cardForm.dueDay) });
    setIsCardModalOpen(false);
    setCardForm({ name: '', closingDay: '', dueDay: '' });
  };

  const handleRemoveGroup = (id: string) => removeGroup(id);
  const handleRemoveCategory = (groupId: string, category: string) => removeCategory(groupId, category);
  const deleteExpenseHandler = (id: string) => deleteExpense(id);
  const deleteDailyHandler = (id: string) => deleteDailyExpense(id);
  const deleteCardHandler = (id: string) => deleteCreditCard(id);

  // Month navigation
  const prevMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month - 2);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const nextMonth = () => {
    const [year, month] = currentMonth.split('-').map(Number);
    const d = new Date(year, month);
    setCurrentMonth(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const formatMonth = (yyyyMM: string) => {
    const [year, month] = yyyyMM.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  // Calculations for current month
  const currentMonthExpenses = useMemo(() => {
    const [currYear, currMonth] = currentMonth.split('-').map(Number);

    return expenses.map(exp => {
      const [startYear, startMonth] = exp.startMonth.split('-').map(Number);
      const monthsDiff = (currYear - startYear) * 12 + (currMonth - startMonth);

      if (monthsDiff >= 0 && monthsDiff < exp.totalInstallments) {
        return { ...exp, currentInstallment: monthsDiff + 1 };
      }
      return null;
    }).filter(Boolean) as (Expense & { currentInstallment: number })[];
  }, [expenses, currentMonth]);

  const fixedExpenses = currentMonthExpenses.filter(e => !e.creditCardId);
  const cardExpenses = currentMonthExpenses.filter(e => e.creditCardId);

  const currentMonthDaily = useMemo(() => {
    return dailyExpenses.filter(e => e.date.startsWith(currentMonth));
  }, [dailyExpenses, currentMonth]);

  const currentIncome = useMemo(() => incomes.find(i => i.month === currentMonth)?.value || 0, [incomes, currentMonth]);

  // Summaries
  const totalMinhasDespesas = currentMonthExpenses.filter(d => d.ownerType === 'Minha').reduce((acc, d) => acc + d.installmentValue, 0);
  const totalOutros = currentMonthExpenses.filter(d => d.ownerType === 'Outros').reduce((acc, d) => acc + d.installmentValue, 0);
  const totalGastosDiarios = currentMonthDaily.reduce((acc, e) => acc + e.value, 0);

  const totalMeuMes = totalMinhasDespesas + totalGastosDiarios;
  const saldo = currentIncome - totalMeuMes;

  // Cycles (Only for fixed expenses)
  const ciclo1 = fixedExpenses.filter(d => d.dueDay <= 15).sort((a, b) => a.dueDay - b.dueDay);
  const ciclo2 = fixedExpenses.filter(d => d.dueDay > 15).sort((a, b) => a.dueDay - b.dueDay);

  // All Categories for Daily Expenses
  const allCategories = groups.flatMap(g => g.categories);

  // Panorama Calculations
  const calculatePanorama = (monthsBack: number) => {
    const [currYear, currMonth] = currentMonth.split('-').map(Number);
    let totalInc = 0;
    let totalExp = 0;

    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(currYear, currMonth - 1 - i);
      const targetMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      totalInc += incomes.find(inc => inc.month === targetMonth)?.value || 0;

      const targetDaily = dailyExpenses.filter(e => e.date.startsWith(targetMonth)).reduce((acc, e) => acc + e.value, 0);

      const targetFixed = expenses.map(exp => {
        const [startYear, startMonth] = exp.startMonth.split('-').map(Number);
        const monthsDiff = (d.getFullYear() - startYear) * 12 + (d.getMonth() + 1 - startMonth);
        if (monthsDiff >= 0 && monthsDiff < exp.totalInstallments && exp.ownerType === 'Minha') {
          return exp.installmentValue;
        }
        return 0;
      }).reduce((acc, val) => acc + val, 0);

      totalExp += targetDaily + targetFixed;
    }

    return { income: totalInc, expense: totalExp, balance: totalInc - totalExp };
  };

  const panoramaMensal = calculatePanorama(1);
  const panoramaSemestral = calculatePanorama(6);
  const panoramaAnual = calculatePanorama(12);

  const tabs = [
    { id: 'resumo', label: 'Resumo', icon: <List className="w-4 h-4" /> },
    { id: 'fixas', label: 'Despesas Fixas', icon: <Calendar className="w-4 h-4" /> },
    { id: 'cartoes', label: 'Cartões', icon: <CreditCardIcon className="w-4 h-4" /> },
    { id: 'panorama', label: 'Panorama', icon: <PieChart className="w-4 h-4" /> },
    { id: 'config', label: 'Configurações', icon: <Settings className="w-4 h-4" /> }
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <span className="w-10 h-10 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans pb-24 relative overflow-x-hidden">
      <div className="fixed top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/30 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>
      <div className="fixed bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-600/30 rounded-full mix-blend-screen filter blur-[100px] pointer-events-none"></div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Wallet className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-200 to-purple-200 hidden sm:block">
              BolsoFácil
            </h1>
          </div>

          <div className="flex items-center gap-2 sm:gap-4 bg-white/5 rounded-full p-1 border border-white/10">
            <button onClick={prevMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-medium capitalize min-w-[100px] text-center text-sm sm:text-base">
              {formatMonth(currentMonth)}
            </span>
            <button onClick={nextMonth} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-400 hidden sm:block">Olá, <span className="text-white font-medium">{userName}</span></span>
            <button onClick={onLogout} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors hidden sm:block" title="Sair">
              <LogOut className="w-5 h-5" />
            </button>
            <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors sm:hidden">
              {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="sm:hidden absolute top-full left-0 right-0 bg-slate-900/95 backdrop-blur-xl border-b border-white/10 p-4 flex flex-col gap-2 shadow-2xl animate-in slide-in-from-top-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => { setActiveTab(tab.id as any); setIsMobileMenuOpen(false); }}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-sm ${activeTab === tab.id ? 'bg-indigo-500 text-white' : 'text-slate-300 hover:bg-white/10'}`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
            <div className="h-px bg-white/10 my-2"></div>
            <button onClick={onLogout} className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-red-400 hover:bg-red-500/10 transition-colors text-sm">
              <LogOut className="w-4 h-4" />
              Sair
            </button>
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6 relative z-10">

        {/* Top Cards (Mobile Optimized) */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
              <TrendingUp className="w-16 h-16 sm:w-24 sm:h-24 text-emerald-400" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-1 sm:mb-2">
                <div className="flex items-center gap-1.5 sm:gap-2 text-slate-300">
                  <div className="p-1.5 sm:p-2 bg-emerald-500/20 text-emerald-400 rounded-lg sm:rounded-xl">
                    <DollarSign className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <h3 className="font-medium text-xs sm:text-base">Receita</h3>
                </div>
                <button onClick={() => setIsIncomeModalOpen(true)} className="p-1 sm:p-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors">
                  <Edit3 className="w-3 h-3 sm:w-4 sm:h-4 text-slate-300" />
                </button>
              </div>
              <p className="text-lg sm:text-3xl font-bold text-white">{formatCurrency(currentIncome)}</p>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-40 transition-opacity">
              <TrendingDown className="w-16 h-16 sm:w-24 sm:h-24 text-red-400" />
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-300 mb-1 sm:mb-2">
                <div className="p-1.5 sm:p-2 bg-red-500/20 text-red-400 rounded-lg sm:rounded-xl">
                  <Tag className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h3 className="font-medium text-xs sm:text-base">Despesas</h3>
              </div>
              <p className="text-lg sm:text-3xl font-bold text-white">{formatCurrency(totalMeuMes)}</p>
            </div>
          </div>

          <div className={`col-span-2 md:col-span-1 backdrop-blur-md border p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-xl relative overflow-hidden ${saldo >= 0 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="relative z-10">
              <div className="flex items-center gap-1.5 sm:gap-2 text-slate-300 mb-1 sm:mb-2">
                <div className={`p-1.5 sm:p-2 rounded-lg sm:rounded-xl ${saldo >= 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}>
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5" />
                </div>
                <h3 className="font-medium text-sm sm:text-base">Balanço (Saldo)</h3>
              </div>
              <p className={`text-2xl sm:text-3xl font-bold ${saldo >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {formatCurrency(saldo)}
              </p>
            </div>
          </div>
        </div>

        {/* Desktop Tabs Navigation */}
        <div className="hidden sm:flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl whitespace-nowrap font-medium transition-colors text-sm ${activeTab === tab.id ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-white/5'}`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content: Resumo */}
        {activeTab === 'resumo' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {totalOutros > 0 && (
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-4 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm text-slate-400">Despesas de Outros</p>
                    <p className="font-bold text-lg">{formatCurrency(totalOutros)}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 max-w-[150px] text-right">Valores que você deve cobrar de outras pessoas.</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <button onClick={() => setIsExpenseModalOpen(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors shadow-lg shadow-indigo-500/20">
                <Plus className="w-6 h-6" />
                <span className="font-medium text-sm text-center">Nova Despesa</span>
              </button>
              <button onClick={() => setIsDailyModalOpen(true)} className="bg-purple-500 hover:bg-purple-600 text-white p-4 rounded-2xl flex flex-col items-center justify-center gap-2 transition-colors shadow-lg shadow-purple-500/20">
                <Coffee className="w-6 h-6" />
                <span className="font-medium text-sm text-center">Gasto Diário</span>
              </button>
            </div>

            {/* Ciclos */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Ciclo 1 */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="font-semibold text-lg">Ciclo 1</h3>
                    <p className="text-sm text-slate-400">Vencimentos até dia 15</p>
                  </div>
                  <span className="font-bold text-indigo-400 text-lg">
                    {formatCurrency(ciclo1.reduce((acc, d) => acc + d.installmentValue, 0))}
                  </span>
                </div>
                {ciclo1.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Nenhuma despesa neste ciclo.</p>
                ) : (
                  <div className="space-y-3">
                    {ciclo1.map(exp => (
                      <ExpenseCard key={exp.id} expense={exp} creditCards={creditCards} onDelete={() => deleteExpense(exp.id)} />
                    ))}
                  </div>
                )}
              </div>

              {/* Ciclo 2 */}
              <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
                <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="font-semibold text-lg">Ciclo 2</h3>
                    <p className="text-sm text-slate-400">Vencimentos dia 16 ao 31</p>
                  </div>
                  <span className="font-bold text-indigo-400 text-lg">
                    {formatCurrency(ciclo2.reduce((acc, d) => acc + d.installmentValue, 0))}
                  </span>
                </div>
                {ciclo2.length === 0 ? (
                  <p className="text-slate-500 text-sm text-center py-4">Nenhuma despesa neste ciclo.</p>
                ) : (
                  <div className="space-y-3">
                    {ciclo2.map(exp => (
                      <ExpenseCard key={exp.id} expense={exp} creditCards={creditCards} onDelete={() => deleteExpense(exp.id)} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-white/10">
                <h3 className="font-semibold text-lg flex items-center gap-2">
                  <Tag className="w-5 h-5 text-purple-400" />
                  Gastos Diários
                </h3>
                <span className="font-bold text-purple-400 text-lg">
                  {formatCurrency(totalGastosDiarios)}
                </span>
              </div>
              {currentMonthDaily.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">Nenhum gasto diário registrado.</p>
              ) : (
                <div className="space-y-3">
                  {currentMonthDaily.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(expense => (
                    <div key={expense.id} className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors group border border-transparent hover:border-white/10">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                          {expense.date.split('-')[2]}
                        </div>
                        <div>
                          <p className="font-medium text-slate-200">{expense.name}</p>
                          <p className="text-xs text-slate-400">{expense.category}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-semibold text-slate-300">{formatCurrency(expense.value)}</span>
                        <button onClick={() => deleteDailyHandler(expense.id)} className="text-slate-500 hover:text-red-400 transition-colors p-2">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab Content: Despesas Fixas */}
        {activeTab === 'fixas' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-end">
              <button onClick={() => { setExpenseForm({ ...expenseForm, isCreditCard: false }); setIsExpenseModalOpen(true); }} className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl flex items-center gap-2 transition-colors text-sm font-medium">
                <Plus className="w-4 h-4" /> Nova Despesa Fixa
              </button>
            </div>

            {groups.map(group => {
              const groupExps = fixedExpenses.filter(e => e.groupId === group.id);
              if (groupExps.length === 0) return null;
              const totalGroup = groupExps.reduce((acc, e) => acc + e.installmentValue, 0);

              return (
                <div key={group.id} className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
                  <div className="flex justify-between items-center mb-4 pb-4 border-b border-white/10">
                    <h3 className="text-lg font-bold text-slate-200">{group.name}</h3>
                    <span className="font-bold text-indigo-400">{formatCurrency(totalGroup)}</span>
                  </div>
                  <div className="space-y-3">
                    {groupExps.map(exp => (
                      <ExpenseCard key={exp.id} expense={exp} groupName={group.name} creditCards={creditCards} onDelete={() => deleteExpense(exp.id)} />
                    ))}
                  </div>
                </div>
              );
            })}
            {fixedExpenses.length === 0 && (
              <div className="text-center py-12 bg-white/5 border border-white/10 rounded-3xl">
                <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-50" />
                <p className="text-slate-400">Nenhuma despesa fixa neste mês.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Cartões */}
        {activeTab === 'cartoes' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex gap-2 bg-white/5 p-1 rounded-xl border border-white/10 w-full sm:w-auto overflow-x-auto">
                {['Todas', 'Minhas', 'Outros'].map(f => (
                  <button key={f} onClick={() => setCardFilter(f as any)} className={`flex-1 sm:flex-none px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${cardFilter === f ? 'bg-purple-500 text-white shadow-md' : 'text-slate-400 hover:text-slate-200'}`}>
                    {f}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={() => setIsCardModalOpen(true)} className="flex-1 sm:flex-none bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-medium border border-white/10">
                  <Plus className="w-4 h-4" /> Novo Cartão
                </button>
                <button onClick={() => { setExpenseForm({ ...expenseForm, isCreditCard: true }); setIsExpenseModalOpen(true); }} className="flex-1 sm:flex-none bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-xl flex items-center justify-center gap-2 transition-colors text-sm font-medium shadow-lg shadow-purple-500/20">
                  <Plus className="w-4 h-4" /> Despesa
                </button>
              </div>
            </div>

            {creditCards.map(card => {
              const cardExps = cardExpenses.filter(e => e.creditCardId === card.id && (cardFilter === 'Todas' || e.ownerType === cardFilter));
              const totalCard = cardExps.reduce((acc, e) => acc + e.installmentValue, 0);

              return (
                <div key={card.id} className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl relative group">
                  <button onClick={() => deleteCardHandler(card.id)} className="absolute top-4 right-4 p-2 text-slate-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center">
                        <CreditCardIcon className="w-6 h-6 text-purple-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-slate-200">{card.name}</h3>
                        <p className="text-xs text-slate-400">Vence dia {card.dueDay} • Fecha dia {card.closingDay}</p>
                      </div>
                    </div>
                    <div className="sm:text-right bg-white/5 sm:bg-transparent p-3 sm:p-0 rounded-xl">
                      <p className="text-xs text-slate-400 mb-0.5">Fatura de {formatMonth(currentMonth)}</p>
                      <p className="text-2xl font-bold text-purple-400">{formatCurrency(totalCard)}</p>
                    </div>
                  </div>

                  {cardExps.length === 0 ? (
                    <p className="text-slate-500 text-sm text-center py-4 border-t border-white/5">Nenhuma despesa nesta fatura.</p>
                  ) : (
                    <div className="space-y-3 pt-4 border-t border-white/5">
                      {cardExps.map(exp => (
                        <ExpenseCard key={exp.id} expense={exp} groupName={groups.find(g => g.id === exp.groupId)?.name} creditCards={creditCards} onDelete={() => deleteExpense(exp.id)} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {creditCards.length === 0 && (
              <div className="text-center py-12 bg-white/5 border border-white/10 rounded-3xl">
                <CreditCardIcon className="w-12 h-12 text-slate-500 mx-auto mb-3 opacity-50" />
                <p className="text-slate-400">Nenhum cartão de crédito cadastrado.</p>
              </div>
            )}
          </div>
        )}

        {/* Tab Content: Panorama */}
        {activeTab === 'panorama' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <PieChart className="w-6 h-6 text-emerald-400" />
              Panorama Financeiro
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PanoramaCard title="Último Mês" data={panoramaMensal} formatCurrency={formatCurrency} />
              <PanoramaCard title="Últimos 6 Meses" data={panoramaSemestral} formatCurrency={formatCurrency} />
              <PanoramaCard title="Último Ano" data={panoramaAnual} formatCurrency={formatCurrency} />
            </div>
          </div>
        )}

        {/* Tab Content: Configurações */}
        {activeTab === 'config' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <List className="w-5 h-5 text-indigo-400" />
                  Tipos e Categorias de Despesa
                </h3>
              </div>

              <div className="flex gap-2 mb-6">
                <input
                  type="text"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  placeholder="Novo tipo de despesa..."
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && newGroupName.trim()) {
                      addGroup(newGroupName.trim());
                      setNewGroupName('');
                    }
                  }}
                />
                <button
                  onClick={() => {
                    if (newGroupName.trim()) {
                      addGroup(newGroupName.trim());
                      setNewGroupName('');
                    }
                  }}
                  className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-xl font-medium transition-colors"
                >
                  Adicionar
                </button>
              </div>

              <div className="space-y-4">
                {groups.map(g => (
                  <div key={g.id} className="bg-white/5 border border-white/5 p-4 rounded-2xl">
                    <div className="flex justify-between items-center mb-3">
                      <span className="font-bold text-slate-200">{g.name}</span>
                      <button onClick={() => handleRemoveGroup(g.id)} className="text-slate-500 hover:text-red-400 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                      {g.categories.map(c => (
                        <span key={c} className="bg-white/10 border border-white/5 px-3 py-1 rounded-xl text-sm flex items-center gap-2 text-slate-300">
                          {c}
                          <button onClick={() => handleRemoveCategory(g.id, c)} className="text-slate-500 hover:text-red-400">
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}

                      {addingCategoryTo === g.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            autoFocus
                            value={newCategoryName}
                            onChange={e => setNewCategoryName(e.target.value)}
                            placeholder="Nova categoria..."
                            className="px-3 py-1 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none text-white text-sm w-32"
                            onKeyDown={e => {
                              if (e.key === 'Enter' && newCategoryName.trim()) {
                                addCategory(g.id, newCategoryName.trim());
                                setAddingCategoryTo(null);
                                setNewCategoryName('');
                              } else if (e.key === 'Escape') {
                                setAddingCategoryTo(null);
                                setNewCategoryName('');
                              }
                            }}
                          />
                          <button
                            onClick={() => {
                              if (newCategoryName.trim()) {
                                addCategory(g.id, newCategoryName.trim());
                              }
                              setAddingCategoryTo(null);
                              setNewCategoryName('');
                            }}
                            className="text-emerald-400 hover:text-emerald-300 text-sm font-medium"
                          >
                            Salvar
                          </button>
                          <button onClick={() => { setAddingCategoryTo(null); setNewCategoryName(''); }} className="text-slate-500 hover:text-slate-300">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <button onClick={() => setAddingCategoryTo(g.id)} className="border border-dashed border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 px-3 py-1 rounded-xl text-sm transition-colors">
                          + Categoria
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              {expenseForm.isCreditCard ? <CreditCardIcon className="w-5 h-5 text-purple-400" /> : <Plus className="w-5 h-5 text-indigo-400" />}
              {expenseForm.isCreditCard ? 'Nova Despesa no Cartão' : 'Nova Despesa Fixa'}
            </h2>

            <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-xl border border-white/10">
              <button type="button" onClick={() => setExpenseForm({ ...expenseForm, isCreditCard: false })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${!expenseForm.isCreditCard ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Fixa/Boleto</button>
              <button type="button" onClick={() => setExpenseForm({ ...expenseForm, isCreditCard: true })} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${expenseForm.isCreditCard ? 'bg-purple-500 text-white' : 'text-slate-400 hover:text-slate-200'}`}>Cartão de Crédito</button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
                <input required type="text" value={expenseForm.name} onChange={e => setExpenseForm({ ...expenseForm, name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white placeholder-slate-500" placeholder="Ex: Aluguel, Celular..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Valor Parcela</label>
                  <input required type="number" step="0.01" min="0" value={expenseForm.installmentValue} onChange={e => setExpenseForm({ ...expenseForm, installmentValue: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white placeholder-slate-500" placeholder="R$ 0,00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Qtd Parcelas</label>
                  <input required type="number" min="1" value={expenseForm.totalInstallments} onChange={e => setExpenseForm({ ...expenseForm, totalInstallments: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white placeholder-slate-500" placeholder="Ex: 12 (1 para fixa)" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    {expenseForm.isCreditCard ? 'Mês da 1ª Fatura' : 'Mês Início'}
                  </label>
                  <input required type="month" value={expenseForm.startMonth} onChange={e => setExpenseForm({ ...expenseForm, startMonth: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white [color-scheme:dark]" />
                </div>
                {expenseForm.isCreditCard ? (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Cartão</label>
                    <select required value={expenseForm.creditCardId} onChange={e => setExpenseForm({ ...expenseForm, creditCardId: e.target.value })} className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-white">
                      <option value="">Selecione...</option>
                      {creditCards.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Dia Venc.</label>
                    <input required type="number" min="1" max="31" value={expenseForm.dueDay} onChange={e => setExpenseForm({ ...expenseForm, dueDay: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white placeholder-slate-500" placeholder="Ex: 10" />
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Tipo</label>
                  <select required value={expenseForm.groupId} onChange={e => {
                    const newGroup = groups.find(g => g.id === e.target.value);
                    setExpenseForm({ ...expenseForm, groupId: e.target.value, category: newGroup?.categories[0] || '' });
                  }} className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white">
                    {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Categoria</label>
                  <select required value={expenseForm.category} onChange={e => setExpenseForm({ ...expenseForm, category: e.target.value })} className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white">
                    {groups.find(g => g.id === expenseForm.groupId)?.categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">De quem é?</label>
                <div className="flex gap-4 mb-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="ownerType" value="Minha" checked={expenseForm.ownerType === 'Minha'} onChange={() => setExpenseForm({ ...expenseForm, ownerType: 'Minha' })} className="text-indigo-500 focus:ring-indigo-500 bg-white/10 border-white/20" />
                    <span className="text-sm">Minha</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="ownerType" value="Outros" checked={expenseForm.ownerType === 'Outros'} onChange={() => setExpenseForm({ ...expenseForm, ownerType: 'Outros' })} className="text-indigo-500 focus:ring-indigo-500 bg-white/10 border-white/20" />
                    <span className="text-sm">Outros</span>
                  </label>
                </div>
                {expenseForm.ownerType === 'Outros' && (
                  <input required type="text" value={expenseForm.ownerName} onChange={e => setExpenseForm({ ...expenseForm, ownerName: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-white placeholder-slate-500" placeholder="Nome da pessoa (Ex: João)" />
                )}
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsExpenseModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-slate-300 hover:bg-white/10 transition-colors">Cancelar</button>
                <button type="submit" className={`flex-1 text-white font-medium py-3 rounded-xl transition-colors shadow-lg ${expenseForm.isCreditCard ? 'bg-purple-500 hover:bg-purple-600 shadow-purple-500/20' : 'bg-indigo-500 hover:bg-indigo-600 shadow-indigo-500/20'}`}>Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isDailyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl relative">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Coffee className="w-5 h-5 text-purple-400" />
              Novo Gasto Diário
            </h2>
            <form onSubmit={handleAddDaily} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Descrição</label>
                <input required type="text" value={dailyForm.name} onChange={e => setDailyForm({ ...dailyForm, name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-white placeholder-slate-500" placeholder="Ex: Almoço, Uber..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Valor</label>
                  <input required type="number" step="0.01" min="0" value={dailyForm.value} onChange={e => setDailyForm({ ...dailyForm, value: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-white placeholder-slate-500" placeholder="R$ 0,00" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Data</label>
                  <input required type="date" value={dailyForm.date} onChange={e => setDailyForm({ ...dailyForm, date: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-white [color-scheme:dark]" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Categoria</label>
                <select value={dailyForm.category} onChange={e => setDailyForm({ ...dailyForm, category: e.target.value })} className="w-full px-4 py-3 bg-slate-800 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-white">
                  {allCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsDailyModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-slate-300 hover:bg-white/10 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-purple-500/20">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isIncomeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Receita do Mês
            </h2>
            <form onSubmit={handleSetIncome} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Valor Recebido ({formatMonth(currentMonth)})</label>
                <input required type="number" step="0.01" min="0" value={incomeForm.value} onChange={e => setIncomeForm({ ...incomeForm, value: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-white placeholder-slate-500" placeholder="R$ 0,00" />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsIncomeModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-slate-300 hover:bg-white/10 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-emerald-500/20">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isCardModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-sm shadow-2xl relative">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <CreditCardIcon className="w-5 h-5 text-purple-400" />
              Novo Cartão
            </h2>
            <form onSubmit={handleAddCard} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nome do Cartão</label>
                <input required type="text" value={cardForm.name} onChange={e => setCardForm({ ...cardForm, name: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-white placeholder-slate-500" placeholder="Ex: Nubank, Itaú..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Dia Fechamento</label>
                  <input required type="number" min="1" max="31" value={cardForm.closingDay} onChange={e => setCardForm({ ...cardForm, closingDay: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-white placeholder-slate-500" placeholder="Ex: 25" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Dia Vencimento</label>
                  <input required type="number" min="1" max="31" value={cardForm.dueDay} onChange={e => setCardForm({ ...cardForm, dueDay: e.target.value })} className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all text-white placeholder-slate-500" placeholder="Ex: 5" />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setIsCardModalOpen(false)} className="flex-1 py-3 rounded-xl font-medium text-slate-300 hover:bg-white/10 transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 bg-purple-500 hover:bg-purple-600 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-purple-500/20">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ExpenseCard({ expense, groupName, creditCards, onDelete }: { expense: Expense & { currentInstallment: number }, groupName?: string, creditCards: CreditCard[], onDelete: () => void | Promise<void> }) {
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  const dueDayDisplay = expense.creditCardId
    ? creditCards.find(c => c.id === expense.creditCardId)?.dueDay || '?'
    : expense.dueDay;

  const isCard = !!expense.creditCardId;
  const colorClass = isCard ? 'text-purple-400 bg-purple-500/20' : 'text-indigo-400 bg-indigo-500/20';

  return (
    <div className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-colors group border border-transparent hover:border-white/10">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm ${colorClass}`}>
          {dueDayDisplay}
        </div>
        <div>
          <p className="font-medium text-slate-200">{expense.name}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs mt-1">
            <span className="bg-white/10 text-slate-300 px-2 py-0.5 rounded-md">
              {expense.currentInstallment}/{expense.totalInstallments}
            </span>
            {groupName && (
              <span className="bg-white/5 text-slate-400 px-2 py-0.5 rounded-md">
                {groupName} • {expense.category}
              </span>
            )}
            {expense.ownerType === 'Outros' && (
              <span className="bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Users className="w-3 h-3" />
                {expense.ownerName}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className="font-semibold text-slate-300">{formatCurrency(expense.installmentValue)}</span>
        <button onClick={onDelete} className="text-slate-500 hover:text-red-400 transition-colors p-2">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function PanoramaCard({ title, data, formatCurrency }: { title: string, data: { income: number, expense: number, balance: number }, formatCurrency: (v: number) => string }) {
  return (
    <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-3xl">
      <h3 className="text-lg font-bold text-slate-200 mb-4 pb-4 border-b border-white/10">{title}</h3>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Receitas</span>
          <span className="font-medium text-emerald-400">{formatCurrency(data.income)}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-slate-400">Despesas</span>
          <span className="font-medium text-red-400">{formatCurrency(data.expense)}</span>
        </div>
        <div className="pt-4 border-t border-white/10 flex justify-between items-center">
          <span className="font-bold text-slate-200">Saldo</span>
          <span className={`font-bold text-lg ${data.balance >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
            {formatCurrency(data.balance)}
          </span>
        </div>
      </div>
    </div>
  );
}
