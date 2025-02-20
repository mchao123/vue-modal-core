import { type Component, shallowReactive, getCurrentInstance, type AllowedComponentProps, type VNodeProps, type InjectionKey, provide, inject, h, onUnmounted } from 'vue';

/**
 * 从组件中提取 Props 类型，排除 Vue 内置的 VNodeProps 和 AllowedComponentProps
 */
type ComponentProps<C extends Component> = C extends new (...args: any) => any
    ? Omit<InstanceType<C>['$props'], keyof VNodeProps | keyof AllowedComponentProps>
    : never;

/**
 * 从组件选项中排除内部使用的 visible 相关属性
 */
type ExtractOptions<T extends Record<string, any>> = Omit<T, 'onUpdate:visible' | 'visible'>;

export type ExtractComponentOptions<T extends Component> = ExtractOptions<ComponentProps<T>>;

/**
 * 模态框元数据接口
 * @property isClosing - 标识模态框是否正在关闭过程中
 * @property closePromises - 存储关闭前的钩子函数集合
 */
export interface ModalMeta {
    isClosing?: boolean;
    closePromises: Map<symbol, (() => Promise<void | boolean> | void | boolean)[]>;
}

/**
 * 模态框上下文接口，用于管理模态框的状态和操作
 * @property modalsMap - 存储所有模态框实例的 Map
 * @property closeModal - 关闭指定模态框的方法
 * @property addClosePromise - 添加关闭前钩子函数
 * @property removeComponentPromises - 移除组件相关的所有钩子函数
 */
export interface ModalContext {
    modalsMap: Map<symbol, {
        comp: Component;
        props: Record<string, unknown> & { visible: boolean; };
        meta: ModalMeta;
    }>;
    closeModal: (id: symbol) => Promise<boolean>;
    addClosePromise: (modalId: symbol, componentId: symbol, fn: () => Promise<void | boolean> | void | boolean) => void;
    removeComponentPromises: (modalId: symbol, componentId: symbol) => void;
}

/**
 * 模态框上下文的注入键
 */
export const ModalKey: InjectionKey<ModalContext> = Symbol('modal-context');
export const ModalIdKey: InjectionKey<symbol> = Symbol('modal-id');

/**
 * 模态框配置选项接口
 * @property baseZIndex - 基础 z-index 值
 * @property allowMultiple - 是否允许多个模态框同时存在
 * @property debug - 是否启用调试模式
 */
export interface ModalOptions {
    baseZIndex?: number;
    allowMultiple?: boolean;
    debug?: boolean;
}

// 默认配置
const DEFAULT_OPTIONS: Required<ModalOptions> = {
    baseZIndex: 1000,
    allowMultiple: true,
    debug: false
};

/**
 * 添加模态框关闭前的钩子函数
 * @param fn 钩子函数，返回 false 可以阻止模态框关闭
 * @throws 如果在组件外部使用或未找到模态框上下文会打印警告
 */
export const onBeforeClose = (fn: () => Promise<void | boolean> | void | boolean) => {
    const ctx = getCurrentInstance();
    if (!ctx) {
        console.warn('onBeforeClose must be used in a component');
        return;
    }

    const modalContext = inject(ModalKey);
    if (!modalContext) {
        console.warn('Modal context not found, make sure ModalRenderer is mounted');
        return;
    }

    const modalId = inject(ModalIdKey);
    if (!modalId) {
        console.warn('ModalId not found, make sure the component is used inside a modal');
        return;
    }

    const fnId = Symbol('fnKey');
    modalContext.addClosePromise(modalId, fnId, fn);

    // 在组件卸载时清理
    onUnmounted(() => {
        modalContext.removeComponentPromises(modalId, fnId);
    });
};

/**
 * 创建模态框上下文
 * @param options 配置选项
 * @returns 返回模态框管理器实例
 */
export function createModalContext(options: ModalOptions = {}) {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    const modalsMap = shallowReactive(new Map<symbol, {
        comp: Component;
        props: Record<string, unknown> & { visible: boolean; };
        meta: ModalMeta;
    }>());

    const modalQueue: symbol[] = [];

    const log = (message: string, ...args: any[]) => {
        if (mergedOptions.debug) {
            console.log(`[Modal] ${message}`, ...args);
        }
    };

    const addClosePromise = (modalId: symbol, componentId: symbol, fn: () => Promise<void | boolean> | void | boolean) => {
        const modal = modalsMap.get(modalId);
        if (modal) {
            if (!modal.meta.closePromises) {
                modal.meta.closePromises = new Map();
            }
            const componentPromises = modal.meta.closePromises.get(componentId) || [];
            // 新的钩子添加到数组开头，以实现后进先出
            componentPromises.unshift(fn);
            modal.meta.closePromises.set(componentId, componentPromises);
        }
    };

    const removeComponentPromises = (modalId: symbol, componentId: symbol) => {
        const modal = modalsMap.get(modalId);
        if (modal?.meta.closePromises) {
            modal.meta.closePromises.delete(componentId);
            log('Removed promises for component', componentId);
        }
    };

    const closeModal = async (id: symbol) => {
        const modal = modalsMap.get(id);
        if (!modal || modal.meta.isClosing) return false;
        modal.props.visible = false;
        modal.meta.isClosing = true;
        log('Closing modal', id);

        try {
            // 收集所有组件的函数并按后进先出顺序执行
            const allFns = Array.from(modal.meta.closePromises.values())
                .flat();

            // 依次执行每个函数，如果任何一个返回 false 则取消关闭
            for (const fn of allFns) {
                const result = await Promise.resolve(fn());
                if (result === false) {
                    modal.meta.isClosing = false;
                    modal.props.visible = true;
                    log('Modal closing cancelled', id);
                    return false;
                }
            }
        } catch (e) {
            console.error('[Modal] Error in close promises:', e);
            modal.meta.isClosing = false;
            return false;
        }

        if (modal.meta.isClosing) {
            modalsMap.delete(id);
            const queueIndex = modalQueue.indexOf(id);
            if (queueIndex > -1) {
                modalQueue.splice(queueIndex, 1);
            }
            log('Modal closed', id);
            return true;
        }
        return false;
    };

    function makeModal<C extends Component<{ visible?: boolean; }>>(comp: C, id = Symbol('ModalId')) {
        return {
            id,
            isVisible: () => {
                const modal = modalsMap.get(id);
                return modal ? modal.props.visible : false;
            },
            open: (props: ExtractComponentOptions<C>) => {
                if (!mergedOptions.allowMultiple && modalQueue.length > 0) {
                    log('Multiple modals not allowed, closing existing modal');
                    const lastModalId = modalQueue[modalQueue.length - 1];
                    const lastModal = modalsMap.get(lastModalId);
                    if (lastModal) {
                        closeModal(lastModalId);
                    }
                }

                const modal = modalsMap.get(id);
                if (modal) {
                    Object.assign(modal.props, props);
                    if (!modal.meta.isClosing) {
                        return;
                    }
                    modal.meta.isClosing = false;
                    modalsMap.delete(id);
                }

                const zIndex = mergedOptions.baseZIndex + modalQueue.length;
                modalQueue.push(id);

                modalsMap.set(id, {
                    comp: {
                        ...comp,
                        setup: (props: any, context: any) => {
                            provide(ModalIdKey, id);
                            return typeof comp === 'object' && comp.setup
                                ? comp.setup(props, context)
                                : undefined;
                        }
                    },
                    props: shallowReactive({
                        ...props,
                        visible: true,
                        style: { zIndex }
                    }),
                    meta: {
                        closePromises: new Map()
                    }
                });

                log('Modal opened', { id, zIndex });
            },
            close: async () => {
                const modal = modalsMap.get(id);
                if (modal) {
                    return closeModal(id);
                }
                return false;
            }
        };
    }

    const ModalRenderer = {
        name: 'ModalRenderer',
        setup() {
            provide(ModalKey, {
                modalsMap,
                closeModal,
                addClosePromise,
                removeComponentPromises
            });
        },
        render() {
            return Array.from(modalsMap.entries()).map(([id, { comp, props }]) =>
                h(comp, {
                    key: id,
                    ...props,
                    'onUpdate:visible': async (value: boolean) => {
                        if (value) {
                            props.visible = true;
                        } else {
                            const closed = await closeModal(id);
                            if (!closed) {
                                props.visible = true;
                            }
                        }
                    }
                })
            );
        }
    };

    return {
        makeModal,
        ModalRenderer,
        modalsMap,
        closeModal,
        options: mergedOptions
    };
} 
