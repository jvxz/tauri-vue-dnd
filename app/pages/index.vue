<script lang="ts" setup>
const DRAG_UPDATE_THRESHOLD = 10
const list = shallowRef([1, 2, 3, 4, 5, 6, 7])

// whether the user is dragging an item
const isDragging = shallowRef(false)

// item that is currently being dragged
const draggingItem = shallowRef<number | null>(null)

const pointer = usePointer()
const { pressed: isMouseDown } = useMousePressed({
  onReleased: () => {
    // reset the dragging state when the mouse button is released
    isDragging.value = false
    draggingItem.value = null
  },
})

// counter for the number of times the pointer has been updated
let dragUpdateCount = 0
// item that is potentially being dragged
let potentialDraggingItem: number | null = null
const { pause: pausePointerWatch, resume: resumePointerWatch } = watch([pointer.x, pointer.y], () => {
  // pause the watcher if the the user is not pressing the mouse button
  // or if the item is already being dragged
  if (!isMouseDown.value || isDragging.value)
    return pausePointerWatch()

  // increment the counter when the pointer is updated (moved)
  dragUpdateCount++

  // if the pointer has been updated (moved) enough times,
  // declare that the item is being dragged
  if (dragUpdateCount >= DRAG_UPDATE_THRESHOLD) {
    dragUpdateCount = 0
    isDragging.value = true
    draggingItem.value = potentialDraggingItem
    potentialDraggingItem = null
  }
}, {
  immediate: false,
})

function handleDragStart(item: number) {
  // set mousedown manually because the watcher thinks 
  // the mouse is not down
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
