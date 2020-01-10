import { VNodeFlags, ChildrenFlags } from "./flags";
import { mount } from "./mount";

function replaceVNode(prevVNode, nextVNode, container) {
  // 将旧的 VNode 所渲染的 DOM 从容器中移除
  container.removeChild(prevVNode.el);
  // 再把新的 VNode 挂载到容器中
  mount(nextVNode, container);
}

function patchData(el, key, prevValue, nextValue) {
  switch (key) {
    case "style":
      // 遍历新 VNodeData 中的 style 数据， 将新的样式应用到元素
      for (let k in nextValue) {
        el.style[k] = nextValue[k];
        console.log(el);
      }
      // 遍历旧 VNodeData 中的 style 数据，将已经不存在与新的 VNodeData 的数据移除
      for (let k in prevValue) {
        if (!nextValue.hasOwnProperty(k)) {
          el.style[k] = "";
        }
      }
      break;
    case "class":
      el.className = nextValue;
      break;
    default:
      if (key[0] === "o" && key[1] === "n") {
        // 移除旧事件
        if (prevValue) {
          el.removeEventListener(key.slice(2), prevValue);
        }
        // 添加新事件
        if (nextValue) {
          el.addEventListener(key.slice(2), data[key]);
        }
      } else if (domPropsRE.test(key)) {
        el[key] = data[key];
      } else {
        el.setAttribute(key, data[key]);
      }
      break;
  }
}

function patchChildren(
  prevChildFlags,
  nextChildFlags,
  prevChildren,
  nextChildren,
  container
) {
  switch (prevChildFlags) {
    // 旧的 children 是单个子节点
    case ChildrenFlags.SINGLE_VNODE:
      switch (nextChildFlags) {
        case ChildrenFlags.SINGLE_VNODE:
          // 新的 children 也是单个子节点时
          patch(prevChildren, nextChildren, container);
          break;
        case ChildrenFlags.NO_CHILDREN:
          // 新的 children 中没有子节点时
          container.removeChild(prevChildren.el);
          break;
        default:
          // 新的 children 是多个子节点的时候
          // 将旧的单个子节点移除，再将新的多个子节点挂载上去
          container.removeChild(prevChildren.el);

          for (let i = 0; i < nextChildren.length; i++) {
            mount(nextChildren[i], container);
          }
          break;
      }
      break;
    // 旧的 children 没有子节点的时候
    case ChildrenFlags.NO_CHILDREN:
      switch (nextChildFlags) {
        case ChildrenFlags.SINGLE_VNODE:
          // 新的 children 也是单个子节点时
          // 使用 mount 函数 将新的子节点挂载到容器元素
          mount(nextChildren, container);
          break;
        case ChildrenFlags.NO_CHILDREN:
          // 新的 children 中没有子节点时
          // 什么都不做
          break;
        default:
          // 新的 children 是多个子节点的时候
          // 遍历多个新的子节点，逐个使用 mount 函数挂载到容器元素中
          for (let i = 0; i < nextChildren.length; i++) {
            mount(nextChildren[i], container);
          }
          break;
      }
      break;
    default:
      // 旧的 children 是多个子节点的时候
      switch (nextChildFlags) {
        case ChildrenFlags.SINGLE_VNODE:
          // 新的 children 也是单个子节点时
          // 移除所有旧的子节点， 挂载新的子节点
          for (let i = 0; i < prevChildren.length; i++) {
            container.removeChild(prevChildren[i].el);
          }
          mount(nextChildren, container);
          break;
        case ChildrenFlags.NO_CHILDREN:
          // 新的 children 中没有子节点时
          // 移除所有旧的子节点
          for (let i = 0; i < prevChildren.length; i++) {
            container.removeChild(prevChildren[i].el);
          }
          break;
        default:
          // 新的 children 是多个子节点的时候

          /* // 比较暴力的方法
          // 遍历旧的子节点，全部移除
          for (let i = 0; i < prevChildren.length; i++) {
            container.removeChild(prevChildren[i].el)
          }
          // 遍历新的子节点，将其全部添加
          for (let i = 0; i < nextChildren.length; i++) {
            mount(nextChildren[i], container)
          } */

          /*  // React diff 算法单端比较
          // 用来存储寻找过程中遇到的最大索引值
          let lastIndex = 0;
          for (let i = 0; i < nextChildren.length; i++) {
            const nextVNode = nextChildren[i];
            let j = 0,
              find = false;
            for (j; j < prevChildren.length; j++) {
              const prevVNode = prevChildren[j];
              if (nextVNode.key === prevVNode.key) {
                find = true;
                patch(prevVNode, nextVNode, container);
                if (j < lastIndex) {
                  // 需要移动
                  const refNode = nextChildren[i - 1].el.nextSibling;
                  container.insertBefore(prevVNode.el, refNode);
                  break;
                } else {
                  // 更新 lastIndex
                  lastIndex = j;
                }
              }
            }
            if (!find) {
              // 挂载新节点
              const refNode =
                i - 1 < 0
                  ? prevChildren[0].el
                  : nextChildren[i - 1].el.nextSibling;
              mount(nextVNode, container, false, refNode);
            }
          }
          // 移除已经不存在的节点
          for (let i = 0; i < prevChildren.length; i++) {
            const prevVNode = prevChildren[i];
            const has = nextChildren.find(
              nextVNode => nextVNode.key === prevVNode.key
            );
            if (!has) {
              // 移除
              container.removeChild(prevVNode.el);
            }
          } */

          // 双端比较算法
          let oldStartIdx = 0;
          let oldEndIdx = prevChildren.length - 1;
          let newStartIdx = 0;
          let newEndIdx = nextChildren.length - 1;
          let oldStartVNode = prevChildren[oldStartIdx];
          let oldEndVNode = prevChildren[oldEndIdx];
          let newStartVNode = nextChildren[newStartIdx];
          let newEndVNode = nextChildren[newEndIdx];
          while (oldStartIdx <= oldEndIdx && newStartIdx <= newEndIdx) {
            if (!oldStartVNode) {
              oldStartVNode = prevChildren[++oldStartIdx];
            } else if (!oldEndVNode) {
              oldEndVNode = prevChildren[--oldEndIdx];
            } else if (oldStartVNode.key === newStartVNode.key) {
              patch(oldStartVNode, newStartVNode, container);
              oldStartVNode = prevChildren[++oldStartIdx];
              newStartVNode = nextChildren[++newStartIdx];
            } else if (oldEndVNode.key === newEndVNode.key) {
              patch(oldEndVNode, newEndVNode, container);
              oldEndVNode = prevChildren[--oldEndIdx];
              newEndVNode = nextChildren[--newEndIdx];
            } else if (oldStartVNode.key === newEndVNode.key) {
              patch(oldStartVNode, newEndVNode, container);
              container.insertBefore(
                oldStartVNode.el,
                oldEndVNode.el.nextSibling
              );
              oldStartVNode = prevChildren[++oldStartIdx];
              newEndVNode = nextChildren[--newEndIdx];
            } else if (oldEndVNode.key === newStartVNode.key) {
              patch(oldEndVNode, newStartVNode, container);
              container.insertBefore(oldEndVNode.el, oldStartVNode.el);
              oldEndVNode = prevChildren[--oldEndIdx];
              newStartVNode = nextChildren[++newStartIdx];
            } else {
              const idxInOld = prevChildren.findIndex(
                node => node.key === newStartVNode.key
              );
              if (idxInOld >= 0) {
                const vnodeToMove = prevChildren[idxInOld];
                patch(vnodeToMove, newStartVNode, container);
                prevChildren[idxInOld] = undefined;
                container.insertBefore(vnodeToMove.el, oldStartVNode.el);
              } else {
                // 新节点
                mount(newStartVNode, container, false, oldStartVNode.el);
              }
              newStartVNode = nextChildren[++newStartIdx];
            }
          }
          if (oldEndIdx < oldStartIdx) {
            // 添加新节点
            for (let i = newStartIdx; i <= newEndIdx; i++) {
              mount(nextChildren[i], container, false, oldStartVNode.el);
            }
          } else if (newEndIdx < newStartIdx) {
            // 移除操作
            for (let i = oldStartIdx; i <= oldEndIdx; i++) {
              container.removeChild(prevChildren[i].el);
            }
          }

          break;
      }
  }
}

function patchElement(prevVNode, nextVNode, container) {
  // 如果新旧 VNode 描述的是不同标签，则调用 replaceVNode 函数，使用新的 VNode 替换 旧的 VNode

  if (prevVNode.tag !== nextVNode.tag) {
    replaceVNode(prevVNode, nextVNode, container);
    return;
  }

  // 拿到 el 元素，注意这时要让 nextVNode.el 也引用该元素
  const el = (nextVNode.el = prevVNode.el);
  //  对比 data
  // 拿到 新旧 VNodeData
  const prevData = prevVNode.data;
  const nextData = nextVNode.data;
  // 新的 VNodeData 存在时才有必要更新
  if (nextData) {
    // 遍历新的 VNodeData
    for (let key in nextData) {
      const prevValue = prevData[key],
        nextValue = nextData[key];
      patchData(el, key, prevValue, nextValue);
    }
  }

  // 旧的 prevData 存在时，才有必要对比移除
  if (prevData) {
    // 遍历旧的 VNodeData，将已经不存在于新的 VNodeData 中的数据移除
    for (let key in prevData) {
      const prevValue = prevData[key];
      if (prevValue && !nextData.hasOwnProperty(key)) {
        // 第四个参数为null 代表移除数据，
        patchData(el, key, prevValue, null);
      }
    }
  }

  // 调用 patchChildren 函数递归更新子节点
  patchChildren(
    prevVNode.childFlags,
    nextVNode.childFlags,
    prevVNode.children,
    nextVNode.children,
    el
  );
}

function patchText(prevVNode, nextVNode) {
  // 拿到文本元素 el, 同时让 nextVNode.el 指向该文本元素
  const el = (nextVNode.el = prevVNode.el);
  // 只有当新旧文本内容不一致时才有必要更新
  if (nextVNode.children !== prevVNode.children) {
    el.nodeValue = nextVNode.children;
  }
}

function patchFragment(prevVNode, nextVNode, container) {
  // 直接调用 patchChildren 函数更新 新旧片段的子节点即可
  patchChildren(
    prevVNode.childFlags, // 旧片段的子节点类型
    nextVNode.childFlags, // 新片段的子节点类型
    prevVNode.children, // 旧片段的子节点
    nextVNode.children, // 新片段的子节点
    container
  );

  // 更新引用
  switch (nextVNode.childFlags) {
    case ChildrenFlags.SINGLE_VNODE:
      nextVNode.el = nextVNode.children.el;
      break;
    case ChildrenFlags.NO_CHILDREN:
      nextVNode.el = prevVNode.el;
      break;
    default:
      nextVNode.el = nextVNode.children[0].el;
  }
}

function patchPortal(prevVNode, nextVNode) {
  console.log(prevVNode.tag);
  patchChildren(
    prevVNode.childFlags,
    nextVNode.childFlags,
    prevVNode.children,
    nextVNode.children,
    prevVNode.tag // 注意容器元素是旧的 container
  );

  nextVNode.el = prevVNode.el;

  // 如果新旧容器不同，需要搬运
  if (nextVNode.tag !== prevVNode.tag) {
    const container =
      typeof nextVNode.tag === "string"
        ? document.querySelector(nextVNode.tag)
        : nextVNode.tag;

    switch (nextVNode.childFlags) {
      case ChildrenFlags.SINGLE_VNODE:
        // 单个子节点直接搬运
        container.appendChild(nextVNode.children.el);
        break;
      case ChildrenFlags.NO_CHILDREN:
        // 新的 Portal 没有子节点，不需要搬运
        break;
      default:
        // 多个子节点，逐个遍历搬运
        nextVNode.children.forEach(item => {
          container.appendChild(item.el);
        });
        break;
    }
  }
}

export function patch(prevVNode, nextVNode, container) {
  // 分别拿到新旧 VNode 的类型，即 flags

  const nextFlags = nextVNode.flags,
    prevFlags = prevVNode.flags;

  // 检查新旧 VNode 的类型是否相同，如果类型不同，则直接调用 replaceVNode 函数替换 VNode
  // 如果新旧 VNode 的类型相同，则根据不同的类型调用不同的对比函数

  if (prevFlags !== nextFlags) {
    replaceVNode(prevVNode, nextVNode, container);
  } else if (nextFlags & VNodeFlags.ELEMENT) {
    patchElement(prevVNode, nextVNode, container);
  } else if (nextFlags & VNodeFlags.COMPONENT) {
    patchComponent(prevVNode, nextVNode, container);
  } else if (nextFlags & VNodeFlags.TEXT) {
    patchText(prevVNode, nextVNode);
  } else if (nextFlags & VNodeFlags.FRAGMENT) {
    console.log("fragment");
    patchFragment(prevVNode, nextVNode, container);
  } else if (nextFlags & VNodeFlags.PORTAL) {
    patchPortal(prevVNode, nextVNode);
  }
}
