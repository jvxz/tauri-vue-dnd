import type { MaybeElementRef } from '@vueuse/core'
import type { RendererNode, StyleValue, VNodeProps } from 'vue'

export type DragData = number
export interface DragItem<T> {
  _listId: string
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

export type DraggableOptions<T = unknown> = Partial<{
  onDragStart: (draggingItem: DragItem<T>) => void
  onDragEnd: (params: HookParams<T>) => void
  onDragOver: (params: HookParams<T>) => void
  direction: 'vertical' | 'horizontal'
  group: string
  _name: string
}>

const DRAG_UPDATE_THRESHOLD = 10

export const useDraggableData = createGlobalState(() => {
  const validElements = new WeakMap<RendererNode, DragItem<unknown>>()
  const draggingItem = shallowRef<DragItem<unknown> | null>(null)
  const isDragging = shallowRef(false)

  const pointer = useGlobalPointer()
  const { element: hoveredElement, pause: pauseElementByPointWatch, resume: resumeElementByPointWatch } = useElementByPoint({
    immediate: false,
    x: pointer.x,
    y: pointer.y,
  })

  const { on: onMouseRelease, trigger } = createEventHook()
  const { pressed: isMouseDown } = useMousePressed({ onReleased: () => {
    if (!isDragging.value)
      return

    trigger()
    queueMicrotask(() => {
      draggingItem.value = null
      isDragging.value = false
    })
  } })

  return {
    /**
     * the item that is being dragged
     */
    draggingItem,
    hoveredElement,
    isDragging,
    isMouseDown,
    onMouseRelease,
    pauseElementByPointWatch,
    resumeElementByPointWatch,
    validElements,
  }
})

export function useDraggable<T>(list: Ref<T[]>, container: MaybeRef<MaybeElementRef>, options = {
  direction: 'vertical',
} as MaybeRefOrGetter<DraggableOptions<T>>) {
  const {
    draggingItem,
    hoveredElement,
    isDragging,
    isMouseDown,
    onMouseRelease,
    pauseElementByPointWatch,
    resumeElementByPointWatch,
    validElements,
  } = useDraggableData()
  const listId = useId()
  const pointer = useGlobalPointer()

  let barGap: string | null = null

  /**
   * the item that is being hovered
   */
  const dropTargetItem = computed<DragItem<T> | null>((prev) => {
    const el = unrefElement(hoveredElement)
    if (!el)
      return null

    const item = lookupElement(el)
    if (!item || item.group !== toValue(options).group)
      return prev ?? null

    return item
  })

  onMouseRelease(() => {
    pauseHoverWatch()
    barGap = null

    const draggedFromList = draggingItem.value?._listId === listId
    const draggedToList = dropTargetItem.value?._listId === listId
    const isFromSameGroup = draggingItem.value?.group === toValue(options).group || dropTargetItem.value?.group === toValue(options).group

    if (
      isDragging.value
      && draggingItem.value
      && dropTargetItem.value
      && isFromSameGroup
      && (draggedFromList || draggedToList)
    ) {
      toValue(options).onDragEnd?.(createHookParams())
    }
  })

  const { pause: pauseHoveredElementWatch, resume: resumeHoveredElementWatch } = watch(dropTargetItem, (currentItem) => {
    if (!currentItem || !lookupElement(currentItem.element))
      return

    if (currentItem.group === toValue(options).group) {
      toValue(options).onDragOver?.(createHookParams())
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
      toValue(options).onDragStart?.(potentialDraggingItem)

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
      _listId: listId,
      data,
      element,
      group: toValue(options).group,
    }
  }

  const inElementHalf = shallowRef<'bottom/right' | 'top/left' | null>()
  const barStyles = shallowRef<StyleValue | null>(null)
  const { pause: pauseRafFn, resume: resumeRafFn } = useRafFn(() => {
    handleElementHalf()
    handleBar()

    function handleElementHalf() {
      const hoveredElement = dropTargetItem.value?.element
      if (!hoveredElement)
        return inElementHalf.value = null

      if (toValue(options).direction === 'horizontal') {
        const hoveredElementRect = hoveredElement.getBoundingClientRect()
        const relativePosition = pointer.x.value - hoveredElementRect.left

        return inElementHalf.value = relativePosition > hoveredElementRect.width / 2 ? 'bottom/right' : 'top/left'
      }

      const hoveredElementRect = hoveredElement.getBoundingClientRect()
      const relativePosition = pointer.y.value - hoveredElementRect.top

      return inElementHalf.value = relativePosition > hoveredElementRect.height / 2 ? 'bottom/right' : 'top/left'
    }

    function handleBar() {
      if (!isDragging.value || !inElementHalf.value)
        return barStyles.value = null

      const hoveredElement = dropTargetItem.value?.element
      if (!hoveredElement)
        return barStyles.value = null

      if (!document.elementsFromPoint(pointer.x.value, pointer.y.value).includes(unrefElement(toValue(container))!))
        return barStyles.value = null

      if (
        draggingItem.value
        && draggingItem.value.group
        && draggingItem.value.group !== toValue(options).group
      ) {
        return barStyles.value
      }

      const half = inElementHalf.value

      const parentElement = hoveredElement.parentElement
      if (parentElement && !barGap) {
        barGap = getComputedStyle(parentElement).gap
      }

      const siblingElement = half === 'bottom/right'
        ? hoveredElement.nextElementSibling
        : hoveredElement.previousElementSibling

      const hoveredElementRect = hoveredElement.getBoundingClientRect()

      if (!siblingElement || !lookupElement(siblingElement)) {
        if (toValue(options).direction === 'vertical') {
          const topValue = half === 'bottom/right'
            ? (hoveredElementRect.height + hoveredElementRect.top)
            : (hoveredElementRect.top)

          const top = `calc(${topValue}px ${half === 'bottom/right' ? '+' : '-'} ${barGap} / 2)`

          return barStyles.value = {
            top,
            width: `${hoveredElementRect.width}px`,
          }
        }

        const leftValue = half === 'bottom/right'
          ? (hoveredElementRect.width + hoveredElementRect.left)
          : (hoveredElementRect.left)

        const left = `calc(${leftValue}px ${half === 'bottom/right' ? '+' : '-'} ${barGap} / 2)`

        return barStyles.value = {
          height: `${hoveredElementRect.height}px`,
          left,
        }
      }

      const siblingElementRect = siblingElement.getBoundingClientRect()

      if (toValue(options).direction === 'vertical') {
        const topValue = half === 'bottom/right'
          ? (hoveredElementRect.height + hoveredElementRect.top + siblingElementRect.top) / 2
          : (siblingElementRect.height + siblingElementRect.top + hoveredElementRect.top) / 2

        const top = `${topValue}px`

        return barStyles.value = {
          top,
          width: `${hoveredElementRect.width}px`,
        }
      }

      const leftValue = half === 'bottom/right'
        ? (hoveredElementRect.width + hoveredElementRect.left + siblingElementRect.left) / 2
        : (siblingElementRect.width + siblingElementRect.left + hoveredElementRect.left) / 2

      const left = `${leftValue}px`

      return barStyles.value = {
        height: `${hoveredElementRect.height}px`,
        left,
      }
    }
  }, {
    immediate: false,
  })

  watch(isDragging, (v) => {
    if (v) {
      return resumeRafFn()
    }
    else {
      pauseRafFn()
      barStyles.value = null
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
      _listId: listId,
      data,
      element: e.el,
      group: toValue(options).group,
    })
    const onVnodeBeforeUnmount: VNodeProps['onVnodeBeforeUnmount'] = e => e.el && validElements.delete(e.el)
    const onPointerdown = (event: any) => handlePointerDown(data, event.target)

    return {
      onPointerdown,
      onVnodeBeforeUnmount,
      onVnodeMounted,
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

    const targetIdx = list.value.indexOf(targetItem.data)
    const prevIdx = list.value.indexOf(prevItem.data)

    if (prevIdx === targetIdx) {
      return {
        prevIdx,
        prevItem,
        targetIdx: prevIdx,
        targetItem,
      }
    }

    let insertionIdx = targetIdx + (inElementHalf.value === 'bottom/right' ? 1 : 0)

    if (prevIdx !== -1 && prevIdx < insertionIdx) {
      insertionIdx--
    }

    return {
      prevIdx,
      prevItem,
      targetIdx: Math.max(insertionIdx, 0),
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

type Filter = (() => boolean) | boolean
export function handleListRearrange<T>(listRef: MaybeRefOrGetter<T[]>, paramsRef: MaybeRefOrGetter<HookParams<T>>, filters: {
  doRemoval?: Filter
  doMoving?: Filter
  doAdding?: Filter
} = {}) {
  const list = toValue(listRef)
  const params = toValue(paramsRef)

  if (!params.targetItem?.data || (!params.targetIdx && params.targetIdx !== 0))
    return list

  // handle moving to different list (remove)
  if (params.prevIdx !== -1 && params.prevItem._listId !== params.targetItem._listId) {
    if (!check(filters.doRemoval))
      return list

    const arr = [...list]
    arr.splice(params.prevIdx, 1)
    return arr
  }

  // handle recieving from different list (add at index)
  if (params.prevIdx === -1) {
    return check(filters.doAdding) ? insertAt(list, params.targetIdx, params.prevItem.data) : list
  }

  return check(filters.doMoving) ? moveArrayMember(list, params.prevIdx, params.targetIdx) : list

  function check(f: Filter | undefined): boolean {
    if (!f)
      return true

    if (typeof f === 'function') {
      return f()
    }

    return f
  }
}

export function moveArrayMember<T>(arr: T[], from: number, to: number) {
  const clone: T[] = [...arr]
  Array.prototype.splice.call(clone, to, 0, Array.prototype.splice.call(clone, from, 1)[0])
  return clone
}

export function insertAt<T>(arr: T[], index: number, element: T): T[] {
  return [...arr.slice(0, index), element, ...arr.slice(index)]
}
