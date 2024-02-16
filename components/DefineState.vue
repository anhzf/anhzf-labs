<script lang="ts" setup generic="D">
interface Props {
  val: D;
}

const props = defineProps<Props>();

const state = ref(props.value);
syncRefs(() => props.val, state);

const setState = (value: D) => {
  state.value = value;
};
</script>

<template>
  <slot
    :state="state"
    :set-state="setState"
  />
</template>
