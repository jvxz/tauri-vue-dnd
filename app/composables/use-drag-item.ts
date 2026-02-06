export type DragItem = number

export const useDragItem = createGlobalState(() => {
  const dragItem = shallowRef<DragItem | null>(null)
  const dragItemElement = shallowRef<HTMLElement | null>(null)

  return {
    dragItem,
    dragItemElement,
  }
})
