export type Category = {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  type: 'receita' | 'despesa' | 'ambos';
  is_default: boolean;
  created_at: string;
};

export type Transaction = {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  type: 'receita' | 'despesa';
  date: string;
  is_recurring: boolean;
  recurrence_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
};

export type Bill = {
  id: string;
  user_id: string;
  category_id: string | null;
  description: string;
  amount: number;
  due_date: string;
  type: 'pagar' | 'receber';
  status: 'pending' | 'paid' | 'late';
  paid_at: string | null;
  is_recurring: boolean;
  recurrence_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  category?: Category;
};

export type Goal = {
  id: string;
  user_id: string;
  category_id: string | null;
  name: string;
  target_amount: number;
  current_amount: number;
  period: 'monthly' | 'yearly' | 'total';
  type: 'budget' | 'savings';
  start_date: string;
  end_date: string | null;
  created_at: string;
  category?: Category;
};
