<script lang="ts" setup>
import type { RendererNode } from 'vue'

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

const lastHoveredDraggableItem = computed<DragItem | null>((prev) => {
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

const { pause: pauseHoveredElementWatch, resume: resumeHoveredElementWatch } = watch(lastHoveredDraggableItem, (currentItem, prevItem) => {
  if (!currentItem || !validDraggableElements.value.has(currentItem))
    return

  onDragOver(currentItem, prevItem)
})

let dragUpdateCount = 0
let potentialDragItem: DragItem | null = null
const { pause: pausePointerWatch, resume: resumePointerWatch } = watch([pointer.x, pointer.y], () => {
  if (!isMouseDown.value || isDragging.value)
    return pausePointerWatch()

  dragUpdateCount++

  // on drag start
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
  console.log('currentItem: ', currentItem)
}
</script>

<template>
  <div class="flex h-screen items-center justify-center">
    <div class="flex w-[100px] flex-col gap-1">
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
