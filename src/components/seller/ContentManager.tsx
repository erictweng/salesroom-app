"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  pointerWithin,
  rectIntersection,
  useDroppable,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  setResourceOrderAction,
  setResourceCategoryAction,
  toggleResourceHiddenAction,
  setCategoryHiddenAction,
} from "@/server/actions";
import { Badge, type BadgeTone } from "@/components/ui/Badge";
import { contentTypeLabel } from "@/lib/format";
import { CATEGORY_ORDER, orderCategories } from "@/lib/categories";
import { parseYouTubeId } from "@/lib/youtube";
import { VideoPlayer } from "@/components/content/VideoPlayer";
import type { ResourceWithContent } from "@/server/loaders";

const TYPE_TONE: Record<string, BadgeTone> = {
  video: "red",
  document: "blue",
  case_study: "violet",
  one_pager: "amber",
};

interface Item {
  content_id: string;
  title: string;
  type: string;
  hidden: boolean;
  videoId: string | null;
  thumbnail: string | null;
  description: string | null;
  durationSeconds: number | null;
}
type Board = Record<string, Item[]>;

function buildBoard(resources: ResourceWithContent[], columns: string[]): Board {
  const board: Board = Object.fromEntries(columns.map((c) => [c, []]));
  for (const r of resources) {
    const col = board[r.effectiveCategory] ? r.effectiveCategory : columns[0];
    board[col].push({
      content_id: r.content_id,
      title: r.content.title,
      type: r.content.type,
      hidden: r.hidden === 1,
      videoId: r.content.type === "video" ? parseYouTubeId(r.content.url) : null,
      thumbnail: r.content.thumbnail_url,
      description: r.content.description,
      durationSeconds: r.content.duration_seconds,
    });
  }
  return board;
}

/**
 * Pointer-first collision detection. `pointerWithin` reliably detects the column
 * the cursor is inside — including EMPTY columns, which closestCorners often
 * misses — so a card can always be dropped back into an emptied category. Falls
 * back to rectIntersection when the pointer is between droppables.
 */
const collisionStrategy: CollisionDetection = (args) => {
  const pointer = pointerWithin(args);
  return pointer.length > 0 ? pointer : rectIntersection(args);
};

/**
 * Seller Content Hub as a Kanban board. Columns are content categories (fixed
 * canonical order, all shown even when empty). Drag a card within a column to
 * reorder it; drag it to another column to recategorize — one gesture does both.
 *
 * Uses the dnd-kit multi-container pattern: onDragOver moves a card between
 * columns live; onDragEnd finalizes order and persists. Persistence is one order
 * write (flattened across columns -> positions) plus a category write when the
 * card changed columns. Everything is optimistic; local state re-syncs to the
 * server on the builder's auto-refresh. The buyer view groups by the same
 * effective category + order.
 */
export function ContentManager({
  slug,
  resources,
  hiddenCategories = [],
}: {
  slug: string;
  resources: ResourceWithContent[];
  hiddenCategories?: string[];
}) {
  const columns = useMemo(
    () =>
      orderCategories([
        ...new Set([...CATEGORY_ORDER, ...resources.map((r) => r.effectiveCategory)]),
      ]),
    [resources],
  );

  const [board, setBoard] = useState<Board>(() => buildBoard(resources, columns));
  const [activeId, setActiveId] = useState<string | null>(null);
  const startColumn = useRef<string | null>(null);

  // Hidden categories (optimistic). Re-synced from props when the saved set changes.
  const [hiddenCols, setHiddenCols] = useState<Set<string>>(
    () => new Set(hiddenCategories),
  );
  const hiddenSig = [...hiddenCategories].sort().join("|");
  useEffect(() => {
    setHiddenCols(new Set(hiddenCategories));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenSig]);

  function onToggleCategoryHidden(category: string, hidden: boolean) {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (hidden) next.add(category);
      else next.delete(category);
      return next;
    });
    void setCategoryHiddenAction(slug, category, hidden);
  }

  const signature = useMemo(
    () =>
      resources
        .map((r) => `${r.content_id}:${r.hidden}:${r.effectiveCategory}`)
        .join("|"),
    [resources],
  );
  useEffect(() => {
    setBoard(buildBoard(resources, columns));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function findColumn(id: string): string | undefined {
    if (id in board) return id;
    return columns.find((c) => board[c]?.some((i) => i.content_id === id));
  }

  function activeItem(): Item | null {
    if (!activeId) return null;
    for (const c of columns) {
      const found = board[c]?.find((i) => i.content_id === activeId);
      if (found) return found;
    }
    return null;
  }

  function persist(next: Board, movedId: string, endColumn: string | undefined) {
    const ids = columns.flatMap((c) => (next[c] ?? []).map((i) => i.content_id));
    void setResourceOrderAction(slug, ids);
    if (startColumn.current && endColumn && startColumn.current !== endColumn) {
      void setResourceCategoryAction(slug, movedId, endColumn);
    }
  }

  function onDragStart(e: DragStartEvent) {
    const id = String(e.active.id);
    setActiveId(id);
    startColumn.current = findColumn(id) ?? null;
  }

  // Live-move a card into the hovered column (cross-column only).
  function onDragOver(e: DragOverEvent) {
    const id = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    if (!overId) return;
    const from = findColumn(id);
    const to = findColumn(overId);
    if (!from || !to || from === to) return;

    setBoard((prev) => {
      const moving = prev[from].find((i) => i.content_id === id);
      if (!moving) return prev;
      const toItems = prev[to];
      const overIsColumn = overId in prev;
      const idx = overIsColumn
        ? toItems.length
        : Math.max(0, toItems.findIndex((i) => i.content_id === overId));
      return {
        ...prev,
        [from]: prev[from].filter((i) => i.content_id !== id),
        [to]: [...toItems.slice(0, idx), moving, ...toItems.slice(idx)],
      };
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const id = String(e.active.id);
    const overId = e.over ? String(e.over.id) : null;
    setActiveId(null);
    const endColumn = findColumn(id);

    if (!overId || !endColumn) {
      persist(board, id, endColumn);
      startColumn.current = null;
      return;
    }

    const overColumn = findColumn(overId);
    let next = board;
    if (overColumn === endColumn) {
      const items = board[endColumn];
      const oldIdx = items.findIndex((i) => i.content_id === id);
      const newIdx =
        overId in board
          ? items.length - 1
          : items.findIndex((i) => i.content_id === overId);
      if (oldIdx >= 0 && newIdx >= 0 && oldIdx !== newIdx) {
        next = { ...board, [endColumn]: arrayMove(items, oldIdx, newIdx) };
        setBoard(next);
      }
    }
    persist(next, id, endColumn);
    startColumn.current = null;
  }

  function onToggleHide(id: string, hidden: boolean) {
    setBoard((prev) => {
      const out: Board = {};
      for (const c of columns) {
        out[c] = prev[c].map((i) =>
          i.content_id === id ? { ...i, hidden } : i,
        );
      }
      return out;
    });
    void toggleResourceHiddenAction(slug, id, hidden);
  }

  const dragged = activeItem();

  return (
    <div>
      <p className="mb-3 text-sm text-slate-500">
        Drag cards to reorder within a category or move them to another. Buyers
        see visible items grouped this way.
      </p>
      <DndContext
        sensors={sensors}
        collisionDetection={collisionStrategy}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="flex gap-4 overflow-x-auto pb-2">
          {columns.map((col) => (
            <Column
              key={col}
              id={col}
              items={board[col] ?? []}
              hidden={hiddenCols.has(col)}
              onToggleHide={onToggleHide}
              onToggleCategoryHidden={onToggleCategoryHidden}
            />
          ))}
        </div>
        <DragOverlay>
          {dragged ? <CardFace item={dragged} dragging /> : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function Column({
  id,
  items,
  hidden,
  onToggleHide,
  onToggleCategoryHidden,
}: {
  id: string;
  items: Item[];
  hidden: boolean;
  onToggleHide: (id: string, hidden: boolean) => void;
  onToggleCategoryHidden: (category: string, hidden: boolean) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div className="flex w-64 shrink-0 flex-col">
      <div className="mb-2 flex items-center gap-2 px-1">
        <h3
          className={`truncate text-sm font-semibold ${
            hidden ? "text-slate-400" : "text-slate-700"
          }`}
          title={id}
        >
          {id}
        </h3>
        <span className="text-xs text-slate-400">{items.length}</span>
        <button
          type="button"
          onClick={() => onToggleCategoryHidden(id, !hidden)}
          aria-pressed={hidden}
          aria-label={
            hidden ? `Show ${id} to buyers` : `Hide ${id} from buyers`
          }
          title={hidden ? "Hidden from buyer — click to show" : "Hide category from buyer"}
          className={`ml-auto rounded p-1 transition hover:bg-slate-200 ${
            hidden ? "text-amber-600" : "text-slate-400 hover:text-slate-700"
          }`}
        >
          {hidden ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {hidden && (
        <p className="mb-1 px-1 text-[10px] font-medium uppercase tracking-wide text-amber-600">
          Hidden from buyer
        </p>
      )}
      <div
        ref={setNodeRef}
        className={`min-h-[80px] flex-1 space-y-2 rounded-lg p-2 transition ${
          isOver ? "bg-brand-50 ring-1 ring-brand-300" : "bg-slate-50"
        } ${hidden ? "opacity-60" : ""}`}
      >
        <SortableContext
          items={items.map((i) => i.content_id)}
          strategy={verticalListSortingStrategy}
        >
          {items.map((item) => (
            <SortableCard key={item.content_id} item={item} onToggleHide={onToggleHide} />
          ))}
        </SortableContext>
        {items.length === 0 && (
          <p className="px-1 py-6 text-center text-xs text-slate-300">Drop here</p>
        )}
      </div>
    </div>
  );
}

function SortableCard({
  item,
  onToggleHide,
}: {
  item: Item;
  onToggleHide: (id: string, hidden: boolean) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: item.content_id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <CardFace
        item={item}
        dragHandleProps={{ ...attributes, ...listeners }}
        onToggleHide={onToggleHide}
      />
    </div>
  );
}

/** The visual card, shared by the sortable card and the drag overlay. */
function CardFace({
  item,
  dragHandleProps,
  onToggleHide,
  dragging,
}: {
  item: Item;
  dragHandleProps?: React.HTMLAttributes<HTMLButtonElement>;
  onToggleHide?: (id: string, hidden: boolean) => void;
  dragging?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-2.5 ${
        dragging ? "border-brand-400 shadow-lg" : "border-slate-200 shadow-sm"
      } ${item.hidden ? "opacity-50" : ""}`}
    >
      <div className="flex items-center gap-2">
        <button
          {...dragHandleProps}
          aria-label="Drag"
          className="cursor-grab touch-none text-slate-400 hover:text-slate-700 active:cursor-grabbing"
        >
          ⠿
        </button>
        <Badge tone={TYPE_TONE[item.type] ?? "slate"}>
          {contentTypeLabel(item.type)}
        </Badge>
        {onToggleHide && (
          <button
            onClick={() => onToggleHide(item.content_id, !item.hidden)}
            className="ml-auto rounded border border-slate-300 px-1.5 py-0.5 text-[11px] text-slate-600 transition hover:bg-slate-50"
          >
            {item.hidden ? "Unhide" : "Hide"}
          </button>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-sm text-slate-800">{item.title}</p>
      <div className="mt-1 flex items-center justify-between">
        {item.hidden ? (
          <span className="text-[10px] uppercase tracking-wide text-slate-400">
            Hidden from buyer
          </span>
        ) : (
          <span />
        )}
        {/* Inline preview so a rep can watch without switching to the buyer view.
            Untracked (no events) — it's the rep previewing, not buyer engagement.
            Hidden in the drag overlay to avoid a live player while dragging. */}
        {!dragging && item.videoId && (
          <VideoPlayer
            variant="link"
            videoId={item.videoId}
            title={item.title}
            thumbnail={item.thumbnail}
            description={item.description}
            durationSeconds={item.durationSeconds}
          />
        )}
      </div>
    </div>
  );
}

function EyeIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
      <path d="M9.9 4.2A10.9 10.9 0 0 1 12 4c6.5 0 10 7 10 7a18 18 0 0 1-2.4 3.4M6.1 6.1A18 18 0 0 0 2 12s3.5 7 10 7a10.9 10.9 0 0 0 4.1-.8M3 3l18 18M9.5 9.5a3 3 0 0 0 4.2 4.2" />
    </svg>
  );
}
