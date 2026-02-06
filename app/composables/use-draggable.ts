import type { RendererNode, StyleValue, VNodeProps } from 'vue'

export type DragData = number
export interface DraggingItem<T> {
  data: T
  element: HTMLElement
}

interface HookParams<T> {
  prevIdx: number
  targetIdx: number | null
  targetItem: DraggingItem<T> | null
  prevItem: DraggingItem<T>
}

type Hooks<T> = Partial<{
  onDragStart: (draggingItem: DraggingItem<T>) => void
  onDragEnd: (params: HookParams<T>) => void
  onDragOver: (params: HookParams<T>) => void
}>

const DRAG_UPDATE_THRESHOLD = 10
export function useDraggable<T>(list: Ref<T[]>, hooks: Hooks<T> = {}) {
  const isDragging = shallowRef(false)
  const draggingItem = shallowRef<T | null>(null)
  const validDraggableElements = shallowRef(new WeakMap<RendererNode, T>())

  let barGap: string | null = null

  const pointer = usePointer()
  const { element: hoveredElement, pause: pauseElementByPointWatch, resume: resumeElementByPointWatch } = useElementByPoint({
    immediate: false,
    x: pointer.x,
    y: pointer.y,
  })

  const dropTargetItem = computed<DraggingItem<T> | null>((prev) => {
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
      const wasDragging = isDragging.value
      isDragging.value = false
      pauseHoverWatch()

      if (wasDragging && draggingItem.value && dropTargetItem.value) {
        hooks.onDragEnd?.(createHookParams())
      }

      draggingItem.value = null
      barGap = null
    },
  })

  const { pause: pauseHoveredElementWatch, resume: resumeHoveredElementWatch } = watch(dropTargetItem, (currentItem) => {
    if (!currentItem || !validDraggableElements.value.has(currentItem.element))
      return

    hooks.onDragOver?.(createHookParams())
  })

  let dragUpdateCount = 0
  let potentialDraggingItem: DraggingItem<T> | null = null
  const { pause: pausePointerWatch, resume: resumePointerWatch } = watch([pointer.x, pointer.y], () => {
    if (!isMouseDown.value || isDragging.value)
      return pausePointerWatch()

    dragUpdateCount++

    if (dragUpdateCount >= DRAG_UPDATE_THRESHOLD) {
      pausePointerWatch()
      resumeHoverWatch()
      dragUpdateCount = 0
      isDragging.value = true
      draggingItem.value = potentialDraggingItem
      potentialDraggingItem = null

      hooks.onDragStart?.(draggingItem.value)
    }
  }, {
    immediate: false,
  })

  function handlePointerDown(data: T, element: any) {
    if (!(element instanceof HTMLElement))
      return

    isMouseDown.value = true
    resumePointerWatch()

    potentialDraggingItem = {
      data,
      element,
    }
  }

  const barStyles = computed<StyleValue>(() => {
    if (!isDragging.value)
      return null

    const hoveredElement = dropTargetItem.value?.element
    if (!hoveredElement)
      return null

    const hoveredElementRect = hoveredElement.getBoundingClientRect()
    const relativePosition = pointer.y.value - hoveredElementRect.top

    const half = relativePosition > hoveredElementRect.height / 2 ? 'bottom' : 'top'

    const parentElement = hoveredElement.parentElement
    if (parentElement && !barGap) {
      barGap = getComputedStyle(parentElement).gap
    }

    const siblingElement = half === 'bottom'
      ? hoveredElement.nextElementSibling
      : hoveredElement.previousElementSibling

    if (!siblingElement || !validDraggableElements.value.has(siblingElement)) {
      const topValue = half === 'bottom'
        ? (hoveredElementRect.height + hoveredElementRect.top)
        : (hoveredElementRect.top)

      const top = `calc(${topValue}px ${half === 'bottom' ? '+' : '-'} ${barGap}/2)`

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

  function createHookParams(): HookParams<T> {
    if (!dropTargetItem.value) {
      throw new Error('Attempted to make hook params when dropTargetItem was undefined')
    }

    return {
      prevIdx: list.value.indexOf(draggingItem.value.data),
      prevItem: dropTargetItem.value,
      targetIdx: list.value.indexOf(dropTargetItem.value.data),
      targetItem: draggingItem.value,
    }
  }

  return {
    barStyles,
    draggingItem,
    getDragElementProps,
    isDragging,
  }
}

export function swapArrayMembers<T>(arr: T[], from: number, to: number) {
  const clone: T[] = [...arr]
  Array.prototype.splice.call(clone, to, 0, Array.prototype.splice.call(clone, from, 1)[0])
  return clone
}
