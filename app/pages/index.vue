<script lang="ts" setup>
const list = shallowRef<DragData[]>([1, 2, 3, 4, 5, 6, 7])

const { barStyles, getDragElementProps, isDragging } = useDraggable(list)
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
        v-bind="getDragElementProps(item)"
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
