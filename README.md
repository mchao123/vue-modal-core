# vue-modal-core

## 📖 Description

一个好用的vue3模态框的api核心，可以简单的封装一个函数式的模态框，注意：这个项目只提供api不包含模态框

## 📦 安装

```bash
npm install vue-modal-core
```


## 🛠️ 依赖

[Vue](https://vuejs.org/)


## 🤖 使用

App.vue
```vue
<script setup lang="ts">
import { RouterView } from 'vue-router'
import ModalRenderer from 'vue-modal-core';
</script>

<template>
  <ModalRenderer />
  <RouterView />
</template>
```

Modal.vue
```vue
<script lang="ts" setup>
import Dialog from '../layout/DialogContent.vue';
import { onUnmounted } from 'vue';

const $show = defineModel<boolean>('show');
const $props = withDefaults(defineProps<{
    onClose?: (isConfirm: boolean) => void;
    /**标题 */
    title?: string;
    /**内容 */
    content: string;
    /**用户提示 */
    tip?: string;
    /**确认按钮文本 */
    confirmText?: string;
    /**取消按钮文本 */
    cancelText?: string;
    /**是否可以通过点击外部关闭按钮 */
    closeOnClickOutside?: boolean;
}>(), {
    title: '提示',
    closeOnClickOutside: true,
    confirmText: '确定',
    onClose: () => { }
});

const closeModal = (isConfirm: boolean) => {
    $props.onClose(isConfirm);
    $show.value = false;
};

onUnmounted(() => {
    closeModal(false);
});
</script>

<template>
    <Dialog @click-outside="$props.closeOnClickOutside && closeModal(false)">
        <h3 class="text-lg font-bold mb-4" v-if="$props.title">{{ $props.title }}</h3>
        <p class="mb-4" v-html="$props.content.replace(/\n/g, '<br/>')" />
        <div class="flex space-x-2">
            <span class="flex-1">{{ $props.tip }}</span>
            <button class="px-4 py-2 bg-gray-200 text-gray-800 rounded hover:bg-gray-300 transition duration-300"
                v-if="$props.cancelText" @click="closeModal(false)">
                {{ $props.cancelText }}
            </button>
            <button class="px-4 py-2 bg-blue text-white rounded hover:bg-blue-300 transition duration-300"
                v-if="$props.confirmText" @click="closeModal(true)">{{ $props.confirmText }}</button>
        </div>
    </Dialog>
</template>

<style lang="scss" scoped></style>
```

任意位置
```ts
import DialogComp from './Modal.vue'
const { open, close } = makeModal(DialogComp);
open({
  content: "对话框"
})
```

## 更加高级的用法
modal.ts
```ts
import { defineAsyncComponent } from 'vue';
import { makeModal, type ExtractComponentOptions } from 'vue-modal-core';


const DialogComp = defineAsyncComponent(() => import('./components/Dialog.vue'));

export const dialog = (opts: Omit<ExtractComponentOptions<typeof DialogComp>, 'onClose'>) => {
    const { open, close } = makeModal(DialogComp);
    // @ts-ignore
    const result: Promise<boolean> & {
        close: () => void;
        setOption: (opts: Omit<ExtractComponentOptions<typeof DialogComp>, 'onClose'>) => void;
    } = new Promise<boolean>((resolve) => {
        open({
            ...opts,
            onClose: (value) => {
                result.setOption = () => { };
                resolve(value);
            },
        });
    });
    result.close = close;
    result.setOption = open;
    return result;

};

```

```ts
import { dialog } from './modal';

const e = await dialog({
  content: "确认要关闭吗",
  confirmText: "确认",
  cancelText: "取消",
})
if (e) {
  await dialog({
    content:"你点击了确认"
  })
} else {
  await dialog({
    content:"你点击了取消"
  })
}
```


## Thanks
- [vue3](https://github.com/vuejs/core)

## License

MIT
