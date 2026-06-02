"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { CollapsibleSection } from "@/components/ui/CollapsibleSection";
import {
  setSectionOrderAction,
  resetSectionLayoutAction,
} from "@/server/actions";
import { DEFAULT_SECTION_ORDER } from "@/lib/sections";

export interface SectionDescriptor {
  id: string;
  title: string;
  storageKey: string;
  content: ReactNode;
}

function SortableItem({ section }: { section: SectionDescriptor }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: section.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <CollapsibleSection
        title={section.title}
        storageKey={section.storageKey}
        dragHandleProps={{ ...attributes, ...listeners }}
      >
        {section.content}
      </CollapsibleSection>
    </div>
  );
}

/**
 * Drag-to-reorder the room's panels. Order lives in component state but the
 * panel CONTENT is always read from the latest props, so live updates (the
 * auto-refreshing feed/insights) keep flowing while the order stays put. Only
 * the set of section ids drives a re-sync from props (e.g. if a panel is added),
 * so an in-flight reorder isn't clobbered by a background refresh. Order persists
 * per room via a server action; a reset returns to the default layout.
 */
export function SortableSections({
  slug,
  sections,
}: {
  slug: string;
  sections: SectionDescriptor[];
}) {
  const byId = useMemo(
    () => Object.fromEntries(sections.map((s) => [s.id, s])),
    [sections],
  );
  const idsKey = sections.map((s) => s.id).join(",");

  const [order, setOrder] = useState<string[]>(() => sections.map((s) => s.id));
  useEffect(() => {
    setOrder((prev) => {
      const incoming = sections.map((s) => s.id);
      const kept = prev.filter((id) => incoming.includes(id));
      const added = incoming.filter((id) => !kept.includes(id));
      return [...kept, ...added];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idsKey]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const from = order.indexOf(String(active.id));
    const to = order.indexOf(String(over.id));
    if (from < 0 || to < 0) return;
    const next = arrayMove(order, from, to);
    setOrder(next);
    void setSectionOrderAction(slug, next);
  }

  function reset() {
    const present = DEFAULT_SECTION_ORDER.filter((k) => byId[k]);
    setOrder(present);
    void resetSectionLayoutAction(slug);
  }

  const ordered = order.map((id) => byId[id]).filter(Boolean) as SectionDescriptor[];

  return (
    <div className="space-y-5">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
      >
        <SortableContext
          items={ordered.map((s) => s.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-5">
            {ordered.map((s) => (
              <SortableItem key={s.id} section={s} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="text-right">
        <button
          onClick={reset}
          className="text-xs text-slate-400 transition hover:text-slate-600"
        >
          Reset layout
        </button>
      </div>
    </div>
  );
}
