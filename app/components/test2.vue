<script lang="ts" setup>
const list = shallowRef<DragData[]>([8, 9, 10, 11, 12, 13, 14])

const container = useTemplateRef('container')

const { barStyles, getDragElementProps } = useDraggable(list, container, {
  group: '1',
  onDragEnd: (params) => {
    if (!params.targetIdx && params.targetIdx !== 0)
      return

    list.value = moveArrayMember(list.value, params.prevIdx, params.targetIdx)
  },
})
</script>

<template>
  <div ref="container" class="flex w-[100px] flex-col gap-1">
    <div
      v-if="barStyles"
      class="pointer-events-none absolute z-10 h-px w-full bg-blue-500"
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
</template>
