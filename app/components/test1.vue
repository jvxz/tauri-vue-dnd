<script lang="ts" setup>
const list = shallowRef<DragData[]>([1, 2, 3, 4, 5, 6, 7])

const container = useTemplateRef('container')


const { barStyles, getDragElementProps } = useDraggable(list, container, {
  group: '1',
  onDragEnd: (params) => {
    if (!params.targetIdx && params.targetIdx !== 0)
      return

    list.value = moveArrayMember(list.value, params.prevIdx, params.targetIdx)
    console.log('params.targetIdx: ', params.targetIdx)
    console.log('params.prevIdx: ', params.prevIdx)
  },
})
</script>

<template>
  <div class="flex w-[100px] flex-col gap-1" ref="container">
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
