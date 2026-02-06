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

const { pressed: isMouseDown } = useMousePressed({
  onReleased: () => {
    isDragging.value = false
    pauseHoverWatch()

    onDragEnd()

    dragItem.value = null
  },
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

const barStyles = computed<StyleValue>(() => {
  if (!isDragging.value)
    return null

  const hoveredElement = hoveredDraggableItem.value?.element
  if (!hoveredElement)
    return null

  const hoveredElementRect = hoveredElement.getBoundingClientRect()
  const relativePosition = pointer.y.value - hoveredElementRect.top

  const half = relativePosition > hoveredElementRect.height / 2 ? 'bottom' : 'top'

  const siblingElement = half === 'bottom'
    ? hoveredElement.nextElementSibling ?? hoveredElement.previousElementSibling
    : hoveredElement.previousElementSibling ?? hoveredElement.nextElementSibling
  if (!siblingElement)
    return null

  const siblingElementRect = siblingElement.getBoundingClientRect()

  const top = half === 'bottom'
  ? (hoveredElementRect.height + hoveredElementRect.top + siblingElementRect.top) / 2
  : (siblingElementRect.height + siblingElementRect.top + hoveredElementRect.top) / 2
  
  console.log('top: ', top);
  return {
    top: `${top}px`,
    // top: `${half === 'bottom' ? hoveredElementRect.height + hoveredElementRect.top : hoveredElementRect.top}px`,
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
function onDragEnd() {
  if (dragItem.value) {
    dragItem.value.element.style.opacity = '1'
  }
}

function onDragOver(currentItem: DragItem, prevItem: DragItem | null) {

}
function onMouseMove() {

}
</script>

<template>
  <div class="flex h-screen items-center justify-center">
    <div class="flex w-[100px] flex-col gap-1">
      <div class="pointer-events-none absolute z-10 h-px w-full bg-red-500" :style="barStyles"></div>
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
    <pre>{{ dragItem?.data }}</pre>
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
}
</style>
