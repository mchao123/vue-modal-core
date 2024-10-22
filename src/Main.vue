<script setup lang="ts">
import { modals, closeModal } from './core';

</script>
<template>
    <component v-for="{ id, comp, props, meta } in modals" :key="id" :is="comp" v-bind="props"
        @update:show="(it: boolean) => { props.show = it; closeModal(id, meta); }" />
</template>