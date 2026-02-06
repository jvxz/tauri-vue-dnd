import type { RendererNode, StyleValue, VNodeProps } from 'vue'

export type DragData = number
export interface DragItem<T> {
  data: T
  element: HTMLElement
}

interface HookParams<T> {
  prevIdx: number
  targetIdx: number | null
  targetItem: DragItem<T> | null
  prevItem: DragItem<T>
}

type Hooks<T> = Partial<{
  onDragStart: (draggedItem: DragItem<T>) => void
  onDragEnd: (params: HookParams<T>) => void
  onDragOver: (params: HookParams<T>) => void
}>

const DRAG_UPDATE_THRESHOLD = 10
export function useDraggable<T>(list: Ref<T[]>, hooks: Hooks<T> = {}) {
  const isDragging = shallowRef(false)

  const dragItem = shallowRef<T | null>(null)
  const validDraggableElements = shallowRef(new WeakMap<RendererNode, T>())

  const pointer = usePointer()
  const { element: hoveredElement, pause: pauseElementByPointWatch, resume: resumeElementByPointWatch } = useElementByPoint({
    immediate: false,
    x: pointer.x,
    y: pointer.y,
  })

  const hoveredDraggableItem = computed<DragItem<T> | null>((prev) => {
    const el = unrefElement(hoveredElement)
    if (!el)
      return null

    const data = validDraggableElements.value.get(el)
    if (!data)
      return prev ?? null

    return {
      data,
      element: el,
    }
  })

  const { pressed: isMouseDown } = useMousePressed({
    onReleased: () => {
      if (!isDragging.value || !dragItem.value || !hoveredDraggableItem.value)
        return

      isDragging.value = false
      pauseHoverWatch()

      hooks.onDragEnd?.({
        prevIdx: list.value.indexOf(dragItem.value.data),
        prevItem: hoveredDraggableItem.value,
        targetIdx: list.value.indexOf(hoveredDraggableItem.value.data),
        targetItem: dragItem.value,
      })

      dragItem.value = null
    },
  })

  const { pause: pauseHoveredElementWatch, resume: resumeHoveredElementWatch } = watch(hoveredDraggableItem, (currentItem) => {
    if (!currentItem || !validDraggableElements.value.has(currentItem.element))
      return

    hooks.onDragOver?.(makeHookParams())
  })

  let dragUpdateCount = 0
  let potentialDragItem: DragItem<T> | null = null
  const { pause: pausePointerWatch, resume: resumePointerWatch } = watch([pointer.x, pointer.y], () => {
    if (!isMouseDown.value || isDragging.value)
      return pausePointerWatch()

    dragUpdateCount++

    if (dragUpdateCount >= DRAG_UPDATE_THRESHOLD) {
      pausePointerWatch()
      resumeHoverWatch()
      dragUpdateCount = 0
      isDragging.value = true
      dragItem.value = potentialDragItem
      potentialDragItem = null

      hooks.onDragStart?.(dragItem.value)
    }
  }, {
    immediate: false,
  })

  function handlePointerDown(data: T, element: any) {
    if (!(element instanceof HTMLElement))
      return

    isMouseDown.value = true
    resumePointerWatch()

    potentialDragItem = {
      data,
      element,
    }
  }

  let gap: string | null = null
  const barStyles = computed<StyleValue>(() => {
    if (!isDragging.value)
      return null

    const hoveredElement = hoveredDraggableItem.value?.element
    if (!hoveredElement)
      return null

    const hoveredElementRect = hoveredElement.getBoundingClientRect()
    const relativePosition = pointer.y.value - hoveredElementRect.top

    const half = relativePosition > hoveredElementRect.height / 2 ? 'bottom' : 'top'

    const parentElement = hoveredElement.parentElement
    if (parentElement && !gap) {
      gap = getComputedStyle(parentElement).gap
    }

    const siblingElement = half === 'bottom'
      ? hoveredElement.nextElementSibling
      : hoveredElement.previousElementSibling

    if (!siblingElement || !validDraggableElements.value.has(siblingElement)) {
      const topValue = half === 'bottom'
        ? (hoveredElementRect.height + hoveredElementRect.top)
        : (hoveredElementRect.top)

      const top = `calc(${topValue}px ${half === 'bottom' ? '+' : '-'} ${gap}/2)`

      return {
        top,
        width: `${hoveredElementRect.width}px`,
      }
    }

    const siblingElementRect = siblingElement.getBoundingClientRect()

    const topValue = half === 'bottom'
      ? (hoveredElementRect.height + hoveredElementRect.top + siblingElementRect.top) / 2
      : (siblingElementRect.height + siblingElementRect.top + hoveredElementRect.top) / 2

    const top = `${topValue}px`

    return {
      top,
      width: `${hoveredElementRect.width}px`,
    }
  })

  function pauseHoverWatch() {
    pauseElementByPointWatch()
    pauseHoveredElementWatch()
  }

  function resumeHoverWatch() {
    resumeElementByPointWatch()
    resumeHoveredElementWatch()
  }

  const getDragElementProps = (data: T) => {
    const onVnodeMounted: VNodeProps['onVnodeMounted'] = e => e.el && validDraggableElements.value.set(e.el, data)
    const onVnodeUnmounted: VNodeProps['onVnodeUnmounted'] = e => e.el && validDraggableElements.value.delete(e.el)
    const onPointerdown = (event: any) => handlePointerDown(data, event.target)

    return {
      onPointerdown,
      onVnodeMounted,
      onVnodeUnmounted,
    }
  }

  function makeHookParams(): HookParams<T> {
    if (!hoveredDraggableItem.value) {
      throw new Error('Attempted to make hook params when hoveredDraggableItem was undefined')
    }

    return {
      prevIdx: list.value.indexOf(dragItem.value.data),
      prevItem: hoveredDraggableItem.value,
      targetIdx: list.value.indexOf(hoveredDraggableItem.value.data),
      targetItem: dragItem.value,
    }
  }

  return {
    barStyles,
    dragItem,
    getDragElementProps,
    isDragging,
  }
}

export function swapArrayMembers<T>(arr: T[], from: number, to: number) {
  const clone: T[] = [...arr]
  Array.prototype.splice.call(clone, to, 0, Array.prototype.splice.call(clone, from, 1)[0])
  return clone
}
