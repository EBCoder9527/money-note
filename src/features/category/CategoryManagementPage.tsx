import { useEffect, useState } from 'react';
import { liveQuery } from 'dexie';
import { db } from '@/data/db';
import type { Category } from '@/data/models';
import { categoryRepository } from '@/data/repositories';

type CategoryManagementPageProps = {
  onBack: () => void;
};

type CategoryFormState = {
  name: string;
  color: string;
};

const colorOptions = ['#4CB782', '#14b8a6', '#0ea5e9', '#8b5cf6', '#ec4899', '#f97316', '#d65a54', '#64748b'];

const initialForm: CategoryFormState = {
  name: '',
  color: colorOptions[0],
};

export function CategoryManagementPage({ onBack }: CategoryManagementPageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState<CategoryFormState>(initialForm);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    void categoryRepository.ensureDefaultCategories();

    const subscription = liveQuery(async () => {
      const expenseCategories = await db.categories.where('type').equals('expense').sortBy('sortOrder');
      return expenseCategories.filter((category) => !category.deletedAt);
    }).subscribe({
      next: setCategories,
      error: () => setError('分类读取失败，请稍后再试。'),
    });

    return () => subscription.unsubscribe();
  }, []);

  const editingCategory = editingCategoryId
    ? categories.find((category) => category.id === editingCategoryId)
    : undefined;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    const name = form.name.trim();

    if (!name) {
      setError('请输入分类名称。');
      return;
    }

    setIsSaving(true);

    try {
      if (editingCategory) {
        await categoryRepository.update(editingCategory.id, {
          name,
          color: form.color,
          icon: editingCategory.icon,
          sortOrder: editingCategory.sortOrder,
        });
        setMessage('分类已更新');
      } else {
        await categoryRepository.create({
          name,
          color: form.color,
          icon: 'circle',
          type: 'expense',
          isDefault: false,
        });
        setMessage('分类已新增');
      }

      setForm(initialForm);
      setEditingCategoryId(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : '保存失败，请稍后再试。');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(category: Category) {
    setMessage('');
    setError('');

    if (category.isDefault) {
      setError('默认分类不能直接删除。');
      return;
    }

    const confirmed = window.confirm(
      `确定删除“${category.name}”吗？如果它已被历史账单使用，将只从新增账单分类中隐藏，不会影响历史账单。`,
    );

    if (!confirmed) {
      return;
    }

    try {
      await categoryRepository.remove(category.id);
      if (editingCategoryId === category.id) {
        setEditingCategoryId(null);
        setForm(initialForm);
      }
      setMessage('分类已删除');
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : '删除失败，请稍后再试。');
    }
  }

  function handleEdit(category: Category) {
    setMessage('');
    setError('');
    setEditingCategoryId(category.id);
    setForm({
      name: category.name,
      color: category.color,
    });
  }

  function handleCancelEdit() {
    setEditingCategoryId(null);
    setForm(initialForm);
    setError('');
  }

  return (
    <main className="min-h-screen bg-[#F7FBF9] text-[#17352a]">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-4 py-5 sm:px-6 sm:py-8">
        <header className="flex items-center justify-between pt-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-[#6f8178] shadow-[0_10px_28px_rgba(23,53,42,0.06)] transition hover:text-[#2f8f66]"
          >
            返回
          </button>
          <h1 className="text-xl font-semibold tracking-normal">分类管理</h1>
          <div className="w-16" />
        </header>

        <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
          <p className="text-sm font-medium text-[#7a8d84]">支出分类</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-normal">
            {editingCategory ? '编辑自定义分类' : '新增自定义分类'}
          </h2>

          <form onSubmit={handleSubmit} className="mt-5 grid gap-4">
            <label className="block">
              <span className="text-sm font-medium text-[#7a8d84]">分类名称</span>
              <input
                type="text"
                value={form.name}
                maxLength={12}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                placeholder="例如 咖啡、宠物、运动"
                className="mt-2 h-12 w-full rounded-[1.1rem] border border-[#dcefe6] bg-[#F7FBF9] px-4 text-base outline-none placeholder:text-[#9fb6aa] focus:border-[#4CB782]"
              />
            </label>

            <div>
              <span className="text-sm font-medium text-[#7a8d84]">颜色</span>
              <div className="mt-3 grid grid-cols-8 gap-2">
                {colorOptions.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setForm((current) => ({ ...current, color }))}
                    className={`h-9 rounded-full border-2 transition ${
                      form.color === color ? 'border-[#17352a]' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color }}
                    aria-label={`选择颜色 ${color}`}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="submit"
                disabled={isSaving}
                className="h-13 rounded-[1.25rem] bg-[#4CB782] px-4 py-3 text-base font-semibold text-white shadow-[0_16px_34px_rgba(76,183,130,0.24)] transition hover:bg-[#3fa574] disabled:cursor-not-allowed disabled:bg-[#bdd7cb]"
              >
                {isSaving ? '保存中' : editingCategory ? '保存修改' : '新增分类'}
              </button>
              <button
                type="button"
                onClick={handleCancelEdit}
                className="h-13 rounded-[1.25rem] border border-[#dcefe6] bg-[#F7FBF9] px-4 py-3 text-base font-semibold text-[#2f8f66] transition hover:border-[#4CB782]"
              >
                取消
              </button>
            </div>
          </form>
        </section>

        <section className="rounded-[1.75rem] bg-white p-5 shadow-[0_18px_45px_rgba(23,53,42,0.07)]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">全部支出分类</h2>
            <span className="rounded-full bg-[#EAF7F1] px-3 py-1 text-sm text-[#2f8f66]">
              {categories.length} 个
            </span>
          </div>

          <ul className="mt-4 divide-y divide-[#edf4f0]">
            {categories.map((category) => (
              <li key={category.id} className="flex items-center gap-3 py-4">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-[0_10px_22px_rgba(23,53,42,0.10)]"
                  style={{ backgroundColor: category.color }}
                >
                  {category.name[0]}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#17352a]">{category.name}</p>
                  <p className="mt-1 text-xs text-[#7a8d84]">
                    {category.isDefault ? '默认分类' : '自定义分类'}
                  </p>
                </div>

                {category.isDefault ? (
                  <span className="rounded-full bg-[#F7FBF9] px-3 py-1 text-xs font-semibold text-[#7a8d84]">
                    受保护
                  </span>
                ) : (
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => handleEdit(category)}
                      className="rounded-full bg-[#EAF7F1] px-3 py-2 text-sm font-semibold text-[#2f8f66]"
                    >
                      编辑
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(category)}
                      className="rounded-full bg-[#fff0ec] px-3 py-2 text-sm font-semibold text-[#8f2c18]"
                    >
                      删除
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>

        {message ? (
          <div className="rounded-[1.35rem] border border-[#bfe8d4] bg-white p-4 text-sm font-semibold text-[#2f8f66] shadow-[0_12px_36px_rgba(76,183,130,0.10)]">
            {message}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl border border-[#f3b4a8] bg-[#fff0ec] p-4 text-sm font-semibold text-[#8f2c18]">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
