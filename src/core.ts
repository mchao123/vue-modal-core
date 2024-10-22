import { type Component, shallowReactive, getCurrentInstance, type AllowedComponentProps, type VNodeProps } from 'vue';

type ComponentProps<C extends Component> = C extends new (...args: any) => any
    ? Omit<
        InstanceType<C>['$props'],
        keyof VNodeProps | keyof AllowedComponentProps
    >
    : never;

type ExtractOptions<T extends Record<string, any>> = Omit<
    T,
    'onUpdate:show' | 'show'
>;

export type ExtractComponentOptions<T extends Component> = ExtractOptions<ComponentProps<T>>;
export interface ModalMeta {
    isClosing?: boolean;
    beforeClose?: () => Promise<void> | void;
}

export const modals = shallowReactive<{
    id: symbol,
    comp: Component,
    props: Record<string, unknown> & { show: boolean; },
    meta: ModalMeta;
}[]>([]);

export const closeModal = async (id: Symbol, meta: ModalMeta) => {
    if (meta.isClosing) return;
    meta.isClosing = true;
    if (meta.beforeClose) {
        try {
            await meta.beforeClose();
        } catch (e) {
            console.warn(e);
        }
    }
    if (meta.isClosing) {
        const index = modals.findIndex(m => m.id === id);
        index > -1 && modals.splice(index, 1);
    }
};



/** 模态框关闭之前触发，传入异步函数时，对话框将会等待异步结束之后再关闭该对话框 */
export const onBeforeClose = (fn: Required<ModalMeta>['beforeClose']) => {
    const ctx = getCurrentInstance();
    if (!ctx)
        throw new Error('onBeforeClose must be used in a component');
    const id = ctx.vnode.key;
    const modal = modals.find(m => m.id === id);
    if (modal)
        modal.meta.beforeClose = fn;
    
};


export function makeModal<C extends Component<{ show?: boolean; }>>(comp: C, id = Symbol('ModalId')) {
    const open = (props: ExtractComponentOptions<C>) => {
        const index = modals.findIndex(m => m.id === id);
        const modal = modals[index];
        if (modal) {
            Object.assign(modal.props, props);
            if (!modal.meta.isClosing) {
                return;
            }
            modal.meta.isClosing = false;
            modals.splice(index, 1);
        }

        modals.push(shallowReactive({
            id,
            comp,
            props: shallowReactive({
                ...props,
                show: true
            }),
            meta: {},
        }));
    };
    return {
        id,
        isShow: () => {
            const modal = modals.find(m => m.id === id);
            return modal ? modal.props.show : false;
        },
        open,
        close: () => {
            console.log('close');
            // const index = modals.findIndex(m => m.id === id);
            // if (index !== -1)
            //     modals.splice(index, 1);
            const modal = modals.find(m => m.id === id);
            if (modal) {
                modal.props.show = false;
                closeModal(modal.id, modal.meta);
            }
        },
    };
};





