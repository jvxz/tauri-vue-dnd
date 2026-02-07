<script lang="ts" setup>
const list = ref<DragData[]>([1, 2, 3, 4, 5, 6, 7])

const container = useTemplateRef('container')

const { barStyles, getDragElementProps } = useDraggable(list, container, {
  _name: 'test1',
  group: '1',
  onDragEnd: (params) => {
    list.value = handleListRearrange(list, params)
  },
})
</script>

<template>
  <div ref="container" class="flex w-[100px] flex-col gap-1">
    <div
      v-if="barStyles"
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
</template>

=
