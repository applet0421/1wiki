"use client";

import { useRef, useState } from "react";
import {
  flattenCategoryOptions,
  getCategoryHref,
  type CategoryTreeItem,
} from "@/lib/content/category-tree";
import type { Locale } from "@/lib/i18n/config";

type FormAction = (formData: FormData) => void | Promise<void>;

export type CategoryFeedback =
  | { kind: "success"; message: "分類已建立。" | "分類已更新。" | "分類已刪除。" }
  | { kind: "error"; message: string }
  | null;

type Props = {
  locale: Locale;
  categories: CategoryTreeItem[];
  feedback: CategoryFeedback;
  createAction: FormAction;
  updateAction: FormAction;
  deleteAction: FormAction;
};

function descendantIds(category: CategoryTreeItem): Set<string> {
  return new Set(category.children.flatMap((child) => [child.id, ...descendantIds(child)]));
}

function subtreeHeight(category: CategoryTreeItem): number {
  return category.children.length === 0
    ? 1
    : 1 + Math.max(...category.children.map(subtreeHeight));
}

function EditCategoryForm({
  category,
  categories,
  updateAction,
}: {
  category: CategoryTreeItem;
  categories: CategoryTreeItem[];
  updateAction: FormAction;
}) {
  const [parentId, setParentId] = useState(category.parentId || "");
  const excludedIds = descendantIds(category);
  excludedIds.add(category.id);
  const height = subtreeHeight(category);
  const parentOptions = flattenCategoryOptions(categories).filter(
    (option) => !excludedIds.has(option.id) && option.depth + height <= 3,
  );

  return (
    <form action={updateAction} className="category-edit-form form-grid">
      <input type="hidden" name="id" value={category.id} />
      <input type="hidden" name="locale" value={category.locale} />
      <label>名稱（{category.name}）<input name="name" required maxLength={80} defaultValue={category.name} /></label>
      <label>網址代稱（{category.name}）<input name="slug" required maxLength={160} defaultValue={category.slug} /></label>
      <label>上層分類（{category.name}）
        <select name="parentId" value={parentId} onChange={(event) => setParentId(event.currentTarget.value)}>
          <option value="">無上層分類</option>
          {parentOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
        </select>
      </label>
      <label>排序（{category.name}）<input name="sortOrder" type="number" min={0} max={9999} defaultValue={category.sortOrder} /></label>
      <label className="span-2">說明（{category.name}）<textarea name="description" maxLength={300} rows={3} defaultValue={category.description} /></label>
      {!parentId ? <label className="checkbox-label"><input type="checkbox" name="showInNavigation" defaultChecked={category.showInNavigation} />顯示於頂部導覽</label> : null}
      <p className="form-warning span-2">修改網址代稱或上層分類會改變此分類及子分類的公開網址。</p>
      <button className="button button-primary" type="submit">儲存 {category.name}</button>
    </form>
  );
}

function CategoryRow({
  category,
  allCategories,
  onAddChild,
  updateAction,
  deleteAction,
}: {
  category: CategoryTreeItem;
  allCategories: CategoryTreeItem[];
  onAddChild: (categoryId: string) => void;
  updateAction: FormAction;
  deleteAction: FormAction;
}) {
  const deleteReason = category.directPostCount > 0
    ? "分類仍有文章，無法刪除"
    : category.children.length > 0
      ? "分類仍有子分類，無法刪除"
      : null;

  return (
    <div className="category-tree-row" style={{ marginInlineStart: `${(category.depth - 1) * 1.5}rem` }}>
      <div className="category-tree-summary">
        <div>
          <p className="eyebrow">{getCategoryHref(category.locale, category.segments)}</p>
          <h2>{category.name}</h2>
          <p className="muted">{category.description || "尚無說明"}</p>
          <p>{category.directPostCount} 篇直屬／{category.aggregatePostCount} 篇合計</p>
          {category.depth === 1 && category.showInNavigation ? <span className="status status-published">導覽 {category.sortOrder}</span> : null}
        </div>
        <div className="row-actions">
          {category.depth < 3 ? <button className="button button-quiet" type="button" aria-label={`新增 ${category.name} 的子分類`} onClick={() => onAddChild(category.id)}>新增子分類</button> : null}
          <details>
            <summary className="button button-quiet">編輯</summary>
            <EditCategoryForm category={category} categories={allCategories} updateAction={updateAction} />
          </details>
          <form action={deleteAction}>
            <input type="hidden" name="id" value={category.id} />
            <input type="hidden" name="locale" value={category.locale} />
            <button className="button button-danger" type="submit" aria-label={`刪除 ${category.name}`} disabled={Boolean(deleteReason)}>刪除</button>
          </form>
        </div>
      </div>
      {deleteReason ? <p className="form-hint">{deleteReason}</p> : null}
      {category.children.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          allCategories={allCategories}
          onAddChild={onAddChild}
          updateAction={updateAction}
          deleteAction={deleteAction}
        />
      ))}
    </div>
  );
}

export function CategoryManager({ locale, categories, feedback, createAction, updateAction, deleteAction }: Props) {
  const [parentId, setParentId] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const parentOptions = flattenCategoryOptions(categories).filter((option) => option.depth < 3);

  function prepareChild(categoryId: string) {
    setParentId(categoryId);
    formRef.current?.querySelector<HTMLInputElement>('input[name="name"]')?.focus();
  }

  return (
    <>
      {feedback ? <p className={feedback.kind === "error" ? "form-error" : "form-success"} role={feedback.kind === "error" ? "alert" : undefined}>{feedback.message}</p> : null}
      <form ref={formRef} action={createAction} className="panel form-grid">
        <h2 className="span-2">建立分類</h2>
        <input type="hidden" name="locale" value={locale} />
        <label>名稱<input name="name" required maxLength={80} /></label>
        <label>網址代稱<input name="slug" maxLength={160} /></label>
        <label>上層分類
          <select name="parentId" value={parentId} onChange={(event) => setParentId(event.currentTarget.value)}>
            <option value="">無上層分類</option>
            {parentOptions.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
          </select>
        </label>
        <label>排序<input name="sortOrder" type="number" min={0} max={9999} defaultValue={0} /></label>
        <label className="span-2">說明<textarea name="description" maxLength={300} rows={3} /></label>
        {!parentId ? <label className="checkbox-label"><input type="checkbox" name="showInNavigation" />顯示於頂部導覽</label> : null}
        <button className="button button-primary" type="submit">建立分類</button>
      </form>
      <div className="category-tree">
        {categories.map((category) => (
          <CategoryRow
            key={category.id}
            category={category}
            allCategories={categories}
            onAddChild={prepareChild}
            updateAction={updateAction}
            deleteAction={deleteAction}
          />
        ))}
      </div>
    </>
  );
}
