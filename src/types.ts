export type ExpenseGroup = {
  id: string;
  name: string;
  categories: string[];
};

export type CreditCard = {
  id: string;
  name: string;
  closingDay: number;
  dueDay: number;
};

export type Expense = {
  id: string;
  name: string;
  installmentValue: number;
  totalInstallments: number;
  startMonth: string; // YYYY-MM
  dueDay: number; // Ignored if creditCardId is set
  ownerType: 'Minha' | 'Outros';
  ownerName?: string;
  groupId: string;
  category: string;
  creditCardId?: string;
};

export type DailyExpense = {
  id: string;
  name: string;
  value: number;
  date: string; // YYYY-MM-DD
  category: string;
};

export type Income = {
  id: string;
  value: number;
  month: string; // YYYY-MM
};

export const DEFAULT_GROUPS: ExpenseGroup[] = [
  { id: '1', name: 'Despesa da Casa', categories: ['Aluguel', 'Energia', 'Água', 'Internet', 'Mercado'] },
  { id: '2', name: 'Despesa Pessoal', categories: ['Alimentação', 'Saúde', 'Lazer', 'Educação', 'Roupas'] },
  { id: '3', name: 'Veículo', categories: ['Combustível', 'Seguro', 'Manutenção', 'IPVA'] }
];
