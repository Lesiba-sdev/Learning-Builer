"use client";

import type { ReactNode } from "react";
import type { GeneratedActivity } from "../lib/schemas";

const inputClass =
  "mt-1 w-full min-h-[44px] rounded-xl border-2 border-gray-300 bg-white px-3 py-2 text-gray-900";

function newId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}`;
}

function scanText(v: unknown, key = ""): string | null {
  if (typeof v === "string") {
    if (v.length > 400) return "Some text is longer than 400 characters.";
    if (!v.trim() && key !== "explanation" && key !== "instructions") {
      return "Please fill in every empty box.";
    }
    return null;
  }
  if (Array.isArray(v)) {
    for (const x of v) {
      const p = scanText(x, key);
      if (p) return p;
    }
    return null;
  }
  if (v && typeof v === "object") {
    for (const [k, x] of Object.entries(v)) {
      const p = scanText(x, k);
      if (p) return p;
    }
  }
  return null;
}

// Returns a friendly message if the activity isn't ready to save.
export function activityProblem(activity: GeneratedActivity): string | null {
  if (!activity.title.trim()) return "The title can't be empty.";
  const list = Object.values(activity.content).find(Array.isArray) as
    | unknown[]
    | undefined;
  if (!list || list.length === 0) {
    return "The activity needs at least one item.";
  }
  const text = scanText(activity.content);
  if (text) return text;
  if (activity.type === "multiple-choice") {
    for (const q of activity.content.questions) {
      const distinct = new Set(q.options.map((o) => o.trim().toLowerCase()));
      if (distinct.size !== q.options.length) {
        return "A question has two identical options.";
      }
    }
  }
  return null;
}

function Field({
  label,
  value,
  onChange,
  multiline = false,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  multiline?: boolean;
}) {
  return (
    <label className="mt-3 block text-sm font-medium text-gray-700">
      {label}
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={inputClass}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={inputClass}
        />
      )}
    </label>
  );
}

function ItemList<T extends { id: string }>({
  label,
  items,
  onItems,
  blank,
  addLabel,
  render,
}: {
  label: string;
  items: T[];
  onItems: (items: T[]) => void;
  blank: () => T;
  addLabel: string;
  render: (item: T, update: (patch: Partial<T>) => void) => ReactNode;
}) {
  function update(i: number, patch: Partial<T>) {
    onItems(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  }
  function move(i: number, d: number) {
    const j = i + d;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    onItems(next);
  }
  function remove(i: number) {
    onItems(items.filter((_, idx) => idx !== i));
  }

  return (
    <div className="mt-6">
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li
            key={item.id}
            className="rounded-2xl border border-gray-200 bg-white p-4"
          >
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-semibold text-gray-700">
                {label} {i + 1}
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  aria-label={`Move ${label} ${i + 1} up`}
                  disabled={i === 0}
                  onClick={() => move(i, -1)}
                  className="min-h-[44px] min-w-[44px] rounded-lg border border-gray-300 bg-white disabled:opacity-40"
                >
                  ▲
                </button>
                <button
                  type="button"
                  aria-label={`Move ${label} ${i + 1} down`}
                  disabled={i === items.length - 1}
                  onClick={() => move(i, 1)}
                  className="min-h-[44px] min-w-[44px] rounded-lg border border-gray-300 bg-white disabled:opacity-40"
                >
                  ▼
                </button>
                <button
                  type="button"
                  aria-label={`Delete ${label} ${i + 1}`}
                  disabled={items.length <= 1}
                  onClick={() => remove(i)}
                  className="min-h-[44px] rounded-lg border-2 border-red-300 bg-white px-3 text-red-700 disabled:opacity-40"
                >
                  Delete
                </button>
              </div>
            </div>
            {render(item, (patch) => update(i, patch))}
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={() => onItems([...items, blank()])}
        className="mt-3 min-h-[44px] rounded-xl border-2 border-blue-600 bg-white px-5 text-blue-700"
      >
        + {addLabel}
      </button>
    </div>
  );
}

export default function ActivityEditor({
  activity,
  onChange,
}: {
  activity: GeneratedActivity;
  onChange: (next: GeneratedActivity) => void;
}) {
  function renderItems(): ReactNode {
    switch (activity.type) {
      case "multiple-choice": {
        const a = activity;
        return (
          <ItemList
            label="Question"
            items={a.content.questions}
            onItems={(questions) =>
              onChange({ ...a, content: { ...a.content, questions } })
            }
            blank={() => ({
              id: newId("q"),
              question: "",
              options: ["", "", "", ""],
              correctAnswerIndex: 0,
              explanation: "",
            })}
            addLabel="Add a question"
            render={(q, update) => (
              <>
                <Field
                  label="Question"
                  value={q.question}
                  onChange={(v) => update({ question: v })}
                  multiline
                />
                <p className="mt-3 text-sm font-medium text-gray-700">
                  Options (select the circle next to the correct answer)
                </p>
                {q.options.map((opt, oi) => (
                  <div key={oi} className="mt-2 flex items-center gap-2">
                    <input
                      type="radio"
                      name={`correct-${q.id}`}
                      checked={q.correctAnswerIndex === oi}
                      onChange={() => update({ correctAnswerIndex: oi })}
                      aria-label={`Option ${oi + 1} is the correct answer`}
                      className="h-5 w-5 shrink-0"
                    />
                    <input
                      value={opt}
                      onChange={(e) =>
                        update({
                          options: q.options.map((o, k) =>
                            k === oi ? e.target.value : o
                          ),
                        })
                      }
                      aria-label={`Option ${oi + 1}`}
                      className="min-h-[44px] w-full rounded-xl border-2 border-gray-300 bg-white px-3 text-gray-900"
                    />
                  </div>
                ))}
                <Field
                  label="Explanation"
                  value={q.explanation}
                  onChange={(v) => update({ explanation: v })}
                  multiline
                />
              </>
            )}
          />
        );
      }

      case "true-false": {
        const a = activity;
        return (
          <ItemList
            label="Statement"
            items={a.content.statements}
            onItems={(statements) =>
              onChange({ ...a, content: { ...a.content, statements } })
            }
            blank={() => ({
              id: newId("s"),
              statement: "",
              isTrue: true,
              explanation: "",
            })}
            addLabel="Add a statement"
            render={(s, update) => (
              <>
                <Field
                  label="Statement"
                  value={s.statement}
                  onChange={(v) => update({ statement: v })}
                  multiline
                />
                <label className="mt-3 block text-sm font-medium text-gray-700">
                  Correct answer
                  <select
                    value={s.isTrue ? "true" : "false"}
                    onChange={(e) =>
                      update({ isTrue: e.target.value === "true" })
                    }
                    className={inputClass}
                  >
                    <option value="true">True</option>
                    <option value="false">False</option>
                  </select>
                </label>
                <Field
                  label="Explanation"
                  value={s.explanation}
                  onChange={(v) => update({ explanation: v })}
                  multiline
                />
              </>
            )}
          />
        );
      }

      case "flashcards": {
        const a = activity;
        return (
          <ItemList
            label="Card"
            items={a.content.cards}
            onItems={(cards) =>
              onChange({ ...a, content: { ...a.content, cards } })
            }
            blank={() => ({ id: newId("c"), front: "", back: "" })}
            addLabel="Add a card"
            render={(c, update) => (
              <>
                <Field
                  label="Front"
                  value={c.front}
                  onChange={(v) => update({ front: v })}
                  multiline
                />
                <Field
                  label="Back"
                  value={c.back}
                  onChange={(v) => update({ back: v })}
                  multiline
                />
              </>
            )}
          />
        );
      }

      case "matching-pairs": {
        const a = activity;
        return (
          <ItemList
            label="Pair"
            items={a.content.pairs}
            onItems={(pairs) =>
              onChange({ ...a, content: { ...a.content, pairs } })
            }
            blank={() => ({ id: newId("p"), left: "", right: "" })}
            addLabel="Add a pair"
            render={(p, update) => (
              <>
                <Field
                  label="Term (left)"
                  value={p.left}
                  onChange={(v) => update({ left: v })}
                />
                <Field
                  label="Match (right)"
                  value={p.right}
                  onChange={(v) => update({ right: v })}
                />
              </>
            )}
          />
        );
      }

      case "put-in-order": {
        const a = activity;
        const ordered = [...a.content.items].sort(
          (x, y) => x.correctOrderIndex - y.correctOrderIndex
        );
        return (
          <>
            <p className="mt-6 text-sm text-gray-600">
              Items are listed in the correct order. Students will see them
              shuffled.
            </p>
            <ItemList
              label="Step"
              items={ordered}
              onItems={(items) =>
                onChange({
                  ...a,
                  content: {
                    ...a.content,
                    items: items.map((it, i) => ({
                      ...it,
                      correctOrderIndex: i,
                    })),
                  },
                })
              }
              blank={() => ({
                id: newId("o"),
                text: "",
                correctOrderIndex: 0,
              })}
              addLabel="Add a step"
              render={(it, update) => (
                <Field
                  label="Text"
                  value={it.text}
                  onChange={(v) => update({ text: v })}
                  multiline
                />
              )}
            />
          </>
        );
      }

      default:
        return null;
    }
  }

  return (
    <div>
      <Field
        label="Title"
        value={activity.title}
        onChange={(v) =>
          onChange({ ...activity, title: v } as GeneratedActivity)
        }
      />
      <Field
        label="Instructions"
        value={activity.content.instructions}
        onChange={(v) =>
          onChange({
            ...activity,
            content: { ...activity.content, instructions: v },
          } as GeneratedActivity)
        }
        multiline
      />
      {renderItems()}
    </div>
  );
}