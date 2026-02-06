<script lang="ts" setup>
import type { RendererNode, StyleValue } from 'vue'

const DRAG_UPDATE_THRESHOLD = 10
const list = shallowRef<DragData[]>([1, 2, 3, 4, 5, 6, 7])

const validDraggableElements = shallowRef(new WeakMap<RendererNode, DragData>())

const isDragging = shallowRef(false)

const { dragItem } = useDragItem()

const pointer = usePointer()
const { element: hoveredElement, pause: pauseElementByPointWatch, resume: resumeElementByPointWatch } = useElementByPoint({
  immediate: false,
  x: pointer.x,
  y: pointer.y,
})

const hoveredDraggableItem = computed<DragItem | null>((prev) => {
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

    onDragEnd({
      prevIdx: list.value.indexOf(dragItem.value.data),
      prevItem: hoveredDraggableItem.value,
      targetIdx: list.value.indexOf(hoveredDraggableItem.value.data),
      targetItem: dragItem.value,
    })

    dragItem.value = null
  },
})

const { pause: pauseHoveredElementWatch, resume: resumeHoveredElementWatch } = watch(hoveredDraggableItem, (currentItem, prevItem) => {
  if (!currentItem || !validDraggableElements.value.has(currentItem.element))
    return

  onDragOver(currentItem, prevItem)
})

let dragUpdateCount = 0
let potentialDragItem: DragItem | null = null
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

    onDragStart()
  }
}, {
  immediate: false,
})

function handlePointerDown(data: DragData, element: any) {
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

function onDragStart() {
  if (dragItem.value) {
    dragItem.value.element.style.opacity = '0.5'
  }
}
function onDragEnd(params: {
  prevIdx: number
  targetIdx: number
  targetItem: DragItem
  prevItem: DragItem
}) {
  list.value = swapArrayMembers(list.value, params.prevIdx, params.targetIdx)
}

function onDragOver(currentItem: DragItem, prevItem: DragItem | null) {

}
function onMouseMove() {

}

function swapArrayMembers<T>(arr: T[], from: number, to: number) {
  const clone: T[] = [...arr]
  Array.prototype.splice.call(clone, to, 0, Array.prototype.splice.call(clone, from, 1)[0])
  return clone
};
</script>

<template>
  <div class="flex h-screen items-center justify-center">
    <div class="flex w-[100px] flex-col gap-1">
      <div
        v-if="isDragging"
        class="pointer-events-none absolute z-10 h-px w-full bg-red-500"
        :style="barStyles"
      ></div>
      <UButton
        v-for="item in list"
        :key="item"
        variant="soft"
        @pointerdown="handlePointerDown(item, $event.target)"
        @vue:mounted="(e) => e.el && validDraggableElements.set(e.el, item)"
        @vue:unmounted="e => e.el && validDraggableElements.delete(e.el)"
      >
        Item {{ item }}
      </UButton>
    </div>
    <!-- <pre>{{ dragItem?.data }}</pre> -->
  </div>
</template>

<style>
*,
*::after,
*::before {
  -webkit-user-select: none;
  -webkit-user-drag: none;
  -webkit-app-region: no-drag;
  cursor: default;
  font-size: calc();
}
</style>
