import type { MaybeElementRef } from '@vueuse/core'
import type { RendererNode, StyleValue, VNodeProps } from 'vue'

export type DragData = number
export interface DragItem<T> {
  data: T
  element: Element
  group?: string
}

interface HookParams<T> {
  prevIdx: number
  targetIdx: number | null
  targetItem: DragItem<T> | null
  prevItem: DragItem<T>
}

type Options<T> = Partial<{
  onDragStart: (draggingItem: DragItem<T>) => void
  onDragEnd: (params: HookParams<T>) => void
  onDragOver: (params: HookParams<T>) => void
  group: string
}>

const DRAG_UPDATE_THRESHOLD = 10

export const useDraggableData = createGlobalState(() => {
  const validElements = new WeakMap<RendererNode, DragItem<unknown>>()
  const draggingItem = shallowRef<DragItem<unknown> | null>()
  const isDragging = shallowRef(false)

  const pointer = useGlobalPointer()
  const { element: hoveredElement, pause: pauseElementByPointWatch, resume: resumeElementByPointWatch } = useElementByPoint({
    immediate: false,
    x: pointer.x,
    y: pointer.y,
  })

  return {
    draggingItem,
    hoveredElement,
    isDragging,
    pauseElementByPointWatch,
    resumeElementByPointWatch,
    validElements,
  }
})

export function useDraggable<T>(list: Ref<T[]>, container: MaybeRef<MaybeElementRef>, options: Options<T> = {}) {
  const {
    draggingItem,
    hoveredElement,
    isDragging,
    pauseElementByPointWatch,
    resumeElementByPointWatch,
    validElements,
  } = useDraggableData()
  const pointer = useGlobalPointer()

  let barGap: string | null = null

  const dropTargetItem = computed<DragItem<T> | null>((prev) => {
    const el = unrefElement(hoveredElement)
    if (!el)
      return null

    const item = lookupElement(el)
    if (!item || item.group !== options.group)
      return prev ?? null

    return item
  })

  const { pressed: isMouseDown } = useMousePressed({
    onReleased: () => {
      pauseHoverWatch()

      if (
        isDragging.value
        && draggingItem.value
        && dropTargetItem.value
        && draggingItem.value?.group === options.group
      ) {
        options.onDragEnd?.(createHookParams())
        draggingItem.value = null
        isDragging.value = false
      }

      barGap = null
    },
  })

  const { pause: pauseHoveredElementWatch, resume: resumeHoveredElementWatch } = watch(dropTargetItem, (currentItem) => {
    if (!currentItem || !lookupElement(currentItem.element))
      return

    if (currentItem.group === options.group) {
      options.onDragOver?.(createHookParams())
    }
  })

  let dragUpdateCount = 0
  let potentialDraggingItem: DragItem<T> | null = null
  const { pause: pausePointerWatch, resume: resumePointerWatch } = watch([pointer.x, pointer.y], () => {
    if (!isMouseDown.value || isDragging.value) {
      return pausePointerWatch()
    }

    if (!potentialDraggingItem) {
      console.error('paused because no potential dragging item in variable')
      return pausePointerWatch()
    }

    dragUpdateCount++

    if (dragUpdateCount >= DRAG_UPDATE_THRESHOLD) {
      pausePointerWatch()
      resumeHoverWatch()
      dragUpdateCount = 0
      isDragging.value = true

      draggingItem.value = potentialDraggingItem
      options.onDragStart?.(potentialDraggingItem)

      potentialDraggingItem = null
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
      group: options.group,
    }
  }

  const barStyles = computed<StyleValue>((prev) => {
    if (!isDragging.value)
      return null

    const hoveredElement = dropTargetItem.value?.element
    if (!hoveredElement)
      return null

    if (!document.elementsFromPoint(pointer.x.value, pointer.y.value).includes(unrefElement(toValue(container))!))
      return null

    if (
      draggingItem.value
      && draggingItem.value.group
      && draggingItem.value.group !== options.group
    ) {
      return prev
    }

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

    if (!siblingElement || !lookupElement(siblingElement)) {
      const topValue = half === 'bottom'
        ? (hoveredElementRect.height + hoveredElementRect.top)
        : (hoveredElementRect.top)

      const top = `calc(${topValue}px ${half === 'bottom' ? '+' : '-'} ${barGap} / 2)`

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
    const onVnodeMounted: VNodeProps['onVnodeMounted'] = e => e.el && e.el instanceof Element && validElements.set(e.el, {
      data,
      element: e.el,
      group: options.group,
    })
    const onVnodeUnmounted: VNodeProps['onVnodeUnmounted'] = e => e.el && validElements.delete(e.el)
    const onPointerdown = (event: any) => handlePointerDown(data, event.target)

    return {
      onPointerdown,
      onVnodeMounted,
      onVnodeUnmounted,
    }
  }

  function createHookParams(): HookParams<T> {
    const targetItem = lookupElement(dropTargetItem.value?.element ?? null)
    if (!dropTargetItem.value || !targetItem) {
      throw new Error('Attempted to make hook params when targetItem was undefined')
    }

    const prevItem = lookupElement(draggingItem.value?.element ?? null)
    if (!draggingItem.value || !prevItem) {
      throw new Error('Attempted to make hook params when prevItem was undefined')
    }

    return {
      prevIdx: list.value.indexOf(prevItem.data),
      prevItem,
      targetIdx: list.value.indexOf(targetItem.data),
      targetItem,
    }
  }

  function lookupElement(el: DragItem<T>['element'] | null): DragItem<T> | null {
    if (!el)
      return null

    const data = validElements.get(el)
    if (!data)
      return null

    return data as DragItem<T>
  }

  return {
    barStyles,
    draggingItem,
    getDragElementProps,
    isDragging,
  }
}

export function moveArrayMember<T>(arr: T[], from: number, to: number) {
  const clone: T[] = [...arr]
  Array.prototype.splice.call(clone, to, 0, Array.prototype.splice.call(clone, from, 1)[0])
  return clone
}
