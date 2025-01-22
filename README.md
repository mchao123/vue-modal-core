# vue-modal-core

一个轻量级且灵活的 Vue 3 模态框组件库，为您的 Vue 应用提供更好的模态框管理方案。

[![npm version](https://img.shields.io/npm/v/vue-modal-core.svg)](https://www.npmjs.com/package/vue-modal-core)
[![license](https://img.shields.io/npm/l/vue-modal-core.svg)](https://github.com/mchao123/vue-modal-core/blob/main/LICENSE)

## 特性

- 🎯 完全基于 TypeScript 开发，提供完整的类型支持
- 🚀 轻量级设计，无外部依赖
- 💪 支持异步关闭控制
- 🎨 灵活的自定义样式
- 📦 支持多模态框管理
- 🔧 简单易用的 API

## 安装

```bash
npm install vue-modal-core
# 或
yarn add vue-modal-core
# 或
pnpm add vue-modal-core
```

## 快速开始

1.创建实例

```typescript
// dialog.ts
import { createModalContext } from 'vue-modal-core';

export { makeModal, ModalRenderer } = createModalContext({
  baseZIndex: 1000,
  allowMultiple: true
});
```

2. 创建模态框组件：

```vue
<!-- MyModal.vue -->
<script setup lang="ts">
import { onBeforeClose } from 'vue-modal-core';

defineProps<{
  content: string;
}>()
defineModel<boolean>('visible')

// 在模态框组件中使用关闭前钩子
onBeforeClose(async () => {
  await new Promise(resolve => setTimeout(resolve, 1000));// 等待 1 秒
  // 返回 false 可以阻止模态框关闭
});
</script>
<template>
  <div class="modal" :class="{ 'show': visible }">
    <div class="modal-content">
      {{ content }}
      <button @click="$emit('update:visible', false)">关闭</button>
    </div>
  </div>
</template>
```

3. 在应用中使用：

```typescript
import { makeModal } from './dialog';
import MyModal from './MyModal.vue';

// 创建模态框上下文


// 创建模态框实例
const modal = makeModal(MyModal);

// 打开模态框
modal.open({
  // 传入 props
  content: 'Hello, World!'
});

setTimeout(() => {
  modal.close();
}, 3000);


```

4. 在应用根组件中挂载渲染器：

```vue
<!-- App.vue -->
<script setup lang="ts">
import { ModalRenderer } from './dialog';
</script>
<template>
  <Teleport to="body">
    <ModalRenderer />
  </Teleport>
  <!-- Page Content -->
</template>
```

## API 文档

### createModalContext

创建模态框上下文，返回模态框管理器实例。

```typescript
interface ModalOptions {
  baseZIndex?: number;      // 基础 z-index 值
  enableAnimation?: boolean; // 是否启用动画
  allowMultiple?: boolean;   // 是否允许多个模态框同时存在
  debug?: boolean;          // 是否启用调试模式
}

const context = createModalContext(options?: ModalOptions);
```

### makeModal

创建模态框实例。

```typescript
const modal = makeModal(YourModalComponent);

// 返回的实例包含以下方法：
interface ModalInstance {
  open: (props: ComponentProps) => void;  // 打开模态框
  close: () => Promise<boolean>;          // 关闭模态框
  isVisible: () => boolean;               // 获取模态框可见状态
}
```

### onBeforeClose

添加模态框关闭前的钩子函数。

```typescript
onBeforeClose(() => {
  // 返回 false 可以阻止模态框关闭
  return true;
});
```

## 其它

- 这个项目基本是我自己一个人在使用的，所以可能会有一些问题，欢迎提交 PR 和 Issue

## 许可证

[MIT](LICENSE)

