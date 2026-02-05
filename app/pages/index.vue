<script lang="ts" setup>
const list = shallowRef([1, 2, 3, 4, 5, 6, 7])

// whether the user is dragging an item
const isDragging = shallowRef(false)

// item that is currently being dragged
const draggingItem = shallowRef<number | null>(null)

const pointer = usePointer()
const { pressed: isMouseDown } = useMousePressed()

const DRAG_UPDATE_THRESHOLD = 10
let dragUpdateCount = 0
let potentialDraggingItem: number | null = null
const { pause: pausePointerWatch, resume: resumePointerWatch } = watch([pointer.x, pointer.y], () => {
  if (!isMouseDown.value || isDragging.value)
    return pausePointerWatch()

  dragUpdateCount++

  if (dragUpdateCount >= DRAG_UPDATE_THRESHOLD) {
    dragUpdateCount = 0
    isDragging.value = true
    draggingItem.value = potentialDraggingItem
    potentialDraggingItem = null
  }
}, {
  immediate: false,
})

whenever(() => !isMouseDown.value, () => {
  pausePointerWatch()
  isDragging.value = false
  draggingItem.value = null
})

function handleDragStart(item: number) {
  isMouseDown.value = true
  resumePointerWatch()
  potentialDraggingItem = item
}
</script>

<template>
  <div class="flex h-screen items-center justify-center">
    <div class="flex w-[100px] flex-col gap-1">
      <UButton
        v-for="item in list"
        :key="item"
        variant="soft"
        @pointerdown="handleDragStart(item)"
      >
        Item {{ item }}
      </UButton>
    </div>
    <pre>{{ draggingItem }}</pre>
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
