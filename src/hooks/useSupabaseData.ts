/// <reference types="vite/client" />
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { ExpenseGroup, CreditCard, Expense, DailyExpense, Income, DEFAULT_GROUPS } from '../types';

export function useSupabaseData(userId: string) {
    const [groups, setGroups] = useState<ExpenseGroup[]>([]);
    const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
    const [expenses, setExpenses] = useState<Expense[]>([]);
    const [dailyExpenses, setDailyExpenses] = useState<DailyExpense[]>([]);
    const [incomes, setIncomes] = useState<Income[]>([]);
    const [loading, setLoading] = useState(true);

    // ─── Fetch all data ────────────────────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        setLoading(true);
        const [groupsRes, cardsRes, expensesRes, dailyRes, incomesRes] = await Promise.all([
            supabase.from('expense_groups').select('*').eq('user_id', userId),
            supabase.from('credit_cards').select('*').eq('user_id', userId),
            supabase.from('expenses').select('*').eq('user_id', userId),
            supabase.from('daily_expenses').select('*').eq('user_id', userId),
            supabase.from('incomes').select('*').eq('user_id', userId),
        ]);

        // Map snake_case → camelCase
        const mapGroup = (g: any): ExpenseGroup => ({ id: g.id, name: g.name, categories: g.categories || [] });
        const mapCard = (c: any): CreditCard => ({ id: c.id, name: c.name, closingDay: c.closing_day, dueDay: c.due_day });
        const mapExpense = (e: any): Expense => ({
            id: e.id, name: e.name, installmentValue: e.installment_value,
            totalInstallments: e.total_installments, startMonth: e.start_month,
            dueDay: e.due_day, ownerType: e.owner_type, ownerName: e.owner_name,
            groupId: e.group_id, category: e.category, creditCardId: e.credit_card_id,
        });
        const mapDaily = (d: any): DailyExpense => ({ id: d.id, name: d.name, value: d.value, date: d.date, category: d.category });
        const mapIncome = (i: any): Income => ({ id: i.id, value: i.value, month: i.month });

        let fetchedGroups = (groupsRes.data || []).map(mapGroup);

        // Se usuário não tem grupos, insere os padrões
        if (fetchedGroups.length === 0) {
            const defaultsToInsert = DEFAULT_GROUPS.map(g => ({ name: g.name, categories: g.categories, user_id: userId }));
            const { data: inserted } = await supabase.from('expense_groups').insert(defaultsToInsert).select();
            fetchedGroups = (inserted || []).map(mapGroup);
        }

        setGroups(fetchedGroups);
        setCreditCards((cardsRes.data || []).map(mapCard));
        setExpenses((expensesRes.data || []).map(mapExpense));
        setDailyExpenses((dailyRes.data || []).map(mapDaily));
        setIncomes((incomesRes.data || []).map(mapIncome));
        setLoading(false);
    }, [userId]);

    useEffect(() => { fetchAll(); }, [fetchAll]);

    // ─── Groups ────────────────────────────────────────────────────────────────
    const addGroup = async (name: string) => {
        const { data } = await supabase.from('expense_groups').insert({ name, categories: [], user_id: userId }).select().single();
        if (data) setGroups(prev => [...prev, { id: data.id, name: data.name, categories: data.categories }]);
    };

    const removeGroup = async (id: string) => {
        await supabase.from('expense_groups').delete().eq('id', id);
        setGroups(prev => prev.filter(g => g.id !== id));
    };

    const addCategory = async (groupId: string, category: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        const newCategories = [...group.categories, category];
        await supabase.from('expense_groups').update({ categories: newCategories }).eq('id', groupId);
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, categories: newCategories } : g));
    };

    const removeCategory = async (groupId: string, category: string) => {
        const group = groups.find(g => g.id === groupId);
        if (!group) return;
        const newCategories = group.categories.filter(c => c !== category);
        await supabase.from('expense_groups').update({ categories: newCategories }).eq('id', groupId);
        setGroups(prev => prev.map(g => g.id === groupId ? { ...g, categories: newCategories } : g));
    };

    // ─── Credit Cards ──────────────────────────────────────────────────────────
    const addCreditCard = async (card: Omit<CreditCard, 'id'>) => {
        const { data } = await supabase.from('credit_cards').insert({
            name: card.name, closing_day: card.closingDay, due_day: card.dueDay, user_id: userId
        }).select().single();
        if (data) setCreditCards(prev => [...prev, { id: data.id, name: data.name, closingDay: data.closing_day, dueDay: data.due_day }]);
    };

    const deleteCreditCard = async (id: string) => {
        await supabase.from('credit_cards').delete().eq('id', id);
        // Reset credit_card_id in affected expenses
        const affected = expenses.filter(e => e.creditCardId === id);
        for (const e of affected) {
            await supabase.from('expenses').update({ credit_card_id: null, due_day: 1 }).eq('id', e.id);
        }
        setCreditCards(prev => prev.filter(c => c.id !== id));
        setExpenses(prev => prev.map(e => e.creditCardId === id ? { ...e, creditCardId: undefined, dueDay: 1 } : e));
    };

    // ─── Expenses ──────────────────────────────────────────────────────────────
    const addExpense = async (expense: Omit<Expense, 'id'>) => {
        const { data } = await supabase.from('expenses').insert({
            name: expense.name, installment_value: expense.installmentValue,
            total_installments: expense.totalInstallments, start_month: expense.startMonth,
            due_day: expense.dueDay, owner_type: expense.ownerType, owner_name: expense.ownerName || null,
            group_id: expense.groupId, category: expense.category,
            credit_card_id: expense.creditCardId || null, user_id: userId,
        }).select().single();
        if (data) setExpenses(prev => [...prev, {
            id: data.id, name: data.name, installmentValue: data.installment_value,
            totalInstallments: data.total_installments, startMonth: data.start_month,
            dueDay: data.due_day, ownerType: data.owner_type, ownerName: data.owner_name,
            groupId: data.group_id, category: data.category, creditCardId: data.credit_card_id,
        }]);
    };

    const deleteExpense = async (id: string) => {
        await supabase.from('expenses').delete().eq('id', id);
        setExpenses(prev => prev.filter(e => e.id !== id));
    };

    // ─── Daily Expenses ────────────────────────────────────────────────────────
    const addDailyExpense = async (daily: Omit<DailyExpense, 'id'>) => {
        const { data } = await supabase.from('daily_expenses').insert({
            name: daily.name, value: daily.value, date: daily.date, category: daily.category, user_id: userId,
        }).select().single();
        if (data) setDailyExpenses(prev => [...prev, { id: data.id, name: data.name, value: data.value, date: data.date, category: data.category }]);
    };

    const deleteDailyExpense = async (id: string) => {
        await supabase.from('daily_expenses').delete().eq('id', id);
        setDailyExpenses(prev => prev.filter(e => e.id !== id));
    };

    // ─── Income ────────────────────────────────────────────────────────────────
    const setIncome = async (value: number, month: string) => {
        const existing = incomes.find(i => i.month === month);
        if (existing) {
            await supabase.from('incomes').update({ value }).eq('id', existing.id);
            setIncomes(prev => prev.map(i => i.month === month ? { ...i, value } : i));
        } else {
            const { data } = await supabase.from('incomes').insert({ value, month, user_id: userId }).select().single();
            if (data) setIncomes(prev => [...prev, { id: data.id, value: data.value, month: data.month }]);
        }
    };

    return {
        loading,
        groups, addGroup, removeGroup, addCategory, removeCategory,
        creditCards, addCreditCard, deleteCreditCard,
        expenses, addExpense, deleteExpense,
        dailyExpenses, addDailyExpense, deleteDailyExpense,
        incomes, setIncome,
    };
}
