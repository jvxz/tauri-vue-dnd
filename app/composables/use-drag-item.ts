export type DragData = number
export interface DragItem {
  data: DragData
  element: HTMLElement
}

export const useDragItem = createGlobalState(() => {
  const dragItem = shallowRef<DragItem | null>(null)

  return {
    dragItem,
  }
})
