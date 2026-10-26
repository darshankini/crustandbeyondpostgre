import { useMemo, useState } from 'react';
import { money } from './Layout';

// How each sub-item group is picked. `required` means at least one pick from that group.
// Groups not listed here are optional, pick-any. The order of this list is also the order groups are shown in.
export const GROUP_RULES = {
  'Choice of Bread':   { multi: true,  required: true },
  'Choice of Protein': { multi: true,  required: true },
  'Choice of Sauce':   { multi: true,  required: false },
  'Extra Toppings':    { multi: true,  required: false },
};
const DEFAULT_RULE = { multi: true, required: false };
const ruleFor = (group) => GROUP_RULES[group] || DEFAULT_RULE;
const ORDER = Object.keys(GROUP_RULES);
const rank = (g) => (ORDER.includes(g) ? ORDER.indexOf(g) : ORDER.length);

// Modal shown when adding a product that offers sub-items (e.g. a sandwich), or editing a cart line's choices.
// `subitems` is the full active list from /api/subitems; only the product's groups are shown.
// `initial` is the line's current choices when editing; they start out selected.
export default function SubitemPicker({ product, subitems, initial, onConfirm, onCancel }) {
  // id -> subitem. Prefer the current list's copy so a changed price shows up.
  const [picked, setPicked] = useState(() =>
    Object.fromEntries((initial || []).map((s) => [s.id, subitems.find((x) => x.id === s.id) || s]))
  );
  const editing = !!initial;

  const groups = useMemo(() => {
    const names = [...(product.subitem_groups || [])].sort((a, b) => rank(a) - rank(b));
    return names
      .map((name) => ({ name, rule: ruleFor(name), items: subitems.filter((s) => s.group_name === name) }))
      .filter((g) => g.items.length);
  }, [product, subitems]);

  const toggle = (group, item) => {
    setPicked((prev) => {
      const next = { ...prev };
      if (next[item.id]) {
        delete next[item.id];
        return next;
      }
      // Single-choice group: picking one replaces the previous pick.
      if (!group.rule.multi) {
        for (const id of Object.keys(next)) if (next[id].group_name === group.name) delete next[id];
      }
      next[item.id] = item;
      return next;
    });
  };

  const selected = Object.values(picked);
  const missing = groups.filter((g) => g.rule.required && !selected.some((s) => s.group_name === g.name));
  const extra = selected.reduce((s, x) => s + Number(x.price), 0);

  const confirm = () => {
    if (missing.length) return;
    // Keep the receipt order the same as the groups on screen.
    const ordered = groups.flatMap((g) => g.items.filter((i) => picked[i.id]));
    onConfirm(ordered.map(({ id, group_name, name, price }) => ({ id, group_name, name, price: Number(price) })));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-0 sm:p-4">
      <div className="w-full sm:max-w-lg md:max-w-2xl max-h-[90vh] sm:max-h-full flex flex-col overflow-hidden rounded-t-2xl sm:rounded-xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <h2 className="font-semibold">{product.name}</h2>
          <button onClick={onCancel} className="-mr-2 p-2 text-2xl leading-none text-gray-400 hover:text-gray-700" aria-label="Close">
            &times;
          </button>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 space-y-4">
          {groups.map((g) => (
            <div key={g.name}>
              <div className="mb-1.5 flex flex-wrap items-baseline gap-x-2">
                <h3 className="text-sm font-semibold">{g.name}</h3>
                <span className="text-xs text-gray-500">
                  {g.rule.required
                    ? (g.rule.multi ? 'Pick at least 1' : 'Pick 1 (required)')
                    : (g.rule.multi ? 'Optional, pick any' : 'Optional, pick 1')}
                </span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-1.5">
                {g.items.map((item) => {
                  const on = !!picked[item.id];
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggle(g, item)}
                      aria-pressed={on}
                      className={
                        'flex min-h-[2.75rem] items-center justify-between gap-2 rounded-md border px-2.5 py-2 text-left text-sm transition ' +
                        (on ? 'border-brand bg-brand text-white' : 'hover:border-brand')
                      }
                    >
                      <span className="leading-tight">{item.name}</span>
                      {Number(item.price) > 0 && (
                        <span className={'whitespace-nowrap text-xs ' + (on ? 'text-white/90' : 'text-gray-500')}>
                          +{money(item.price)}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="border-t px-4 py-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="basis-full sm:basis-auto sm:flex-1 text-xs text-red-600 empty:hidden sm:empty:block">
            {missing.length ? 'Choose ' + missing.map((g) => g.name.replace(/^Choice of /, '').toLowerCase()).join(' and ') : ''}
          </span>
          <button onClick={onCancel} className="flex-1 sm:flex-none px-3 py-2.5 rounded-md bg-gray-200 hover:bg-gray-300 text-sm">Cancel</button>
          <button
            onClick={confirm}
            disabled={missing.length > 0}
            className="flex-1 sm:flex-none px-4 py-2.5 rounded-md bg-brand hover:bg-brand-dark text-white text-sm font-semibold disabled:opacity-40"
          >
            {editing ? 'Save' : 'Add'}{extra > 0 ? ` · +${money(extra)}` : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
