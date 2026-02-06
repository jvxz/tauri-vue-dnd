<script lang="ts" setup>
const DRAG_UPDATE_THRESHOLD = 10
const list = shallowRef<DragItem[]>([1, 2, 3, 4, 5, 6, 7])

const isDragging = shallowRef(false)

const { dragItem, dragItemElement } = useDragItem()

const pointer = usePointer()
const { pressed: isMouseDown } = useMousePressed({
  onReleased: () => {
    isDragging.value = false

    onDragEnd()

    dragItem.value = null
    dragItemElement.value = null
  },
})

let dragUpdateCount = 0
let potentialDragItem: DragItem | null = null
let potentialDragItemElement: HTMLElement | null = null
const { pause: pausePointerWatch, resume: resumePointerWatch } = watch([pointer.x, pointer.y], () => {
  if (!isMouseDown.value || isDragging.value)
    return pausePointerWatch()

  dragUpdateCount++

  // on drag start
  if (dragUpdateCount >= DRAG_UPDATE_THRESHOLD) {
    pausePointerWatch()
    dragUpdateCount = 0
    isDragging.value = true
    dragItem.value = potentialDragItem
    dragItemElement.value = potentialDragItemElement
    potentialDragItem = null
    potentialDragItemElement = null

    onDragStart()
  }
}, {
  immediate: false,
})

function handlePointerDown(item: DragItem, element: any) {
  if (!(element instanceof HTMLElement))
    return

  isMouseDown.value = true
  resumePointerWatch()
  
  potentialDragItemElement = element
  potentialDragItem = item
}

function onDragStart() {
  const el = unrefElement(dragItemElement)
  if (el) {
    el.style.opacity = '0.5'
  }
}

function onDragEnd() {
  const el = unrefElement(dragItemElement)
  if (el) {
    el.style.opacity = '1'
  }
}
</script>

<template>
  <div class="flex h-screen items-center justify-center">
    <div class="flex w-[100px] flex-col gap-1">
      <UButton
        v-for="item in list"
        :key="item"
        :data-drag-id="item"
        variant="soft"
        @pointerdown="handlePointerDown(item, $event.target)"
      >
        Item {{ item }}
      </UButton>
    </div>
    <pre>{{ dragItem }}</pre>
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
