<script setup lang="ts">
import type { TabsListProps } from 'reka-ui'
import type { HTMLAttributes } from 'vue'

const props = defineProps<TabsListProps & { class?: HTMLAttributes['class'] }>()

const delegatedProps = reactiveOmit(props, 'class')
</script>

<template>
  <TabsList
    v-bind="delegatedProps"
    :class="cn(
      staticStyles.base,
      staticStyles.variant.default,
      interactiveStyles.size.lg,
      'relative inline-flex w-fit items-center justify-center gap-2 p-1',
      props.class,
    )"
  >
    <slot />
  </TabsList>
</template>
