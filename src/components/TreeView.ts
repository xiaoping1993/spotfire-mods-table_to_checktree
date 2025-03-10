import './TreeView.css'
import { TreeNode } from './TreeNode';


interface TreeViewOptions {
    onCheckChange?: (currentNode: TreeNode | undefined, checked: boolean, allCheckedNodes: TreeNode[]) => void;
}

export class TreeView {
    private container: HTMLElement;
    private data: TreeNode[];
    private options: TreeViewOptions;

    constructor(container: HTMLElement, data: TreeNode[], options: TreeViewOptions = {}) {
        this.container = container;
        this.data = data;
        this.options = options;
        this.initializeParentReferences(this.data);
        this.render();
    }

    private createTreeNode(data: TreeNode): HTMLElement {
        const nodeDiv = document.createElement('div');
        nodeDiv.className = 'tree-node';

        // 为节点div添加data属性，存储fullName
        nodeDiv.setAttribute('data-full-name', data.fullName);

        // 创建展开/折叠按钮
        const toggleBtn = document.createElement('span');
        toggleBtn.className = 'toggle-btn';
        toggleBtn.textContent = data.children?.length ? '▼' : '•';
        toggleBtn.onclick = () => {
            if (data.children?.length) {
                const childrenDiv = nodeDiv.querySelector('.node-children');
                if (childrenDiv) {
                    const isExpanded = (childrenDiv as HTMLElement).style.display !== 'none';
                    (childrenDiv as HTMLElement).style.display = isExpanded ? 'none' : 'block';
                    toggleBtn.textContent = isExpanded ? '▶' : '▼';
                }
            }
        };

        // 创建复选框
        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.className = 'node-checkbox';
        checkbox.addEventListener('change', (e) => {
            const checked = (e.target as HTMLInputElement).checked;
            // 更新子节点的选中状态
            const childCheckboxes = nodeDiv.querySelectorAll('.node-checkbox');
            childCheckboxes.forEach((cb: Element) => {
                (cb as HTMLInputElement).checked = checked;
            });
            
            // 获取所有选中的节点
            const allCheckedNodes = this.getCheckedNodes();
            
            // 触发回调，传递当前节点、选中状态和所有选中节点
            this.options.onCheckChange?.(data, checked, allCheckedNodes);
        });

        // 创建节点内容
        const content = document.createElement('div');
        content.className = 'node-content';
        
        const label = document.createElement('span');
        label.className = 'node-label';
        label.textContent = data.name;
        label.title = data.fullName;  // 添加tooltip显示完整路径

        const value = document.createElement('span');
        value.className = 'node-value';
        value.textContent = data.value.toString();

        content.appendChild(label);
        content.appendChild(value);

        nodeDiv.appendChild(toggleBtn);
        nodeDiv.appendChild(checkbox);
        nodeDiv.appendChild(content);

        // 处理子节点
        if (data.children && data.children.length > 0) {
            const childrenDiv = document.createElement('div');
            childrenDiv.className = 'node-children';
            data.children.forEach(child => {
                childrenDiv.appendChild(this.createTreeNode(child));
            });
            nodeDiv.appendChild(childrenDiv);
        }

        return nodeDiv;
    }

    private render(): void {
        // 清空容器
        // this.container.innerHTML = '';
        // 如果有tree-container，移除他
        const tcontainer = this.container.querySelector('.tree-container');
        if (tcontainer) {
            this.container.removeChild(tcontainer);
        }
        
        // 创建树形结构的根容器
        const treeContainer = document.createElement('div');
        treeContainer.className = 'tree-container';
        
        // 渲染所有节点
        this.data.forEach(node => {
            treeContainer.appendChild(this.createTreeNode(node));
        });

        this.container.appendChild(treeContainer);
    }

    // 公共方法：更新数据
    public updateData(newData: TreeNode[]): void {
        this.data = newData;
        this.render();
    }

    // 公共方法：获取所有选中的节点
    public getCheckedNodes(): TreeNode[] {
        const checkedNodes: TreeNode[] = [];
        const checkboxes = this.container.querySelectorAll('.node-checkbox:checked');
        
        checkboxes.forEach((checkbox: Element) => {
            const nodeDiv = checkbox.closest('.tree-node');
            if (nodeDiv) {
                const label = nodeDiv.querySelector('.node-label');
                if (label) {
                    const nodeName = label.textContent || '';
                    const node = this.findNodeByName(nodeName);
                    if (node) {
                        checkedNodes.push(node);
                    }
                }
            }
        });

        return checkedNodes;
    }

    private findNodeByName(name: string): TreeNode | null {
        const find = (nodes: TreeNode[]): TreeNode | null => {
            for (const node of nodes) {
                if (node.name === name) return node;
                if (node.children) {
                    const found = find(node.children);
                    if (found) return found;
                }
            }
            return null;
        };
        return find(this.data);
    }

    /**
     * 根据节点全路径字符串设置选中状态
     * @param fullPathStr 用逗号分隔的节点全路径字符串
     */
    public setSelectedByFullPaths(fullPathStr: string) {
        if (!fullPathStr) return;
        
        // 将输入字符串分割成数组
        const fullPaths = fullPathStr.split(',');
        
        // 清除现有选择
        this.clearSelection();
        
        // 遍历每个全路径
        fullPaths.forEach(fullPath => {
            // 查找对应的节点
            const node = this.findNodeByFullPath(fullPath);
            if (node) {
                // 设置节点选中状态
                this.setNodeSelected(node, true);
                // 更新父节点状态
                this.updateParentCheckState(node);
                
                // 更新UI中的复选框状态
                const nodeDiv = this.container.querySelector(`[data-full-name="${node.fullName}"]`);
                if (nodeDiv) {
                    const checkbox = nodeDiv.querySelector('.node-checkbox') as HTMLInputElement;
                    if (checkbox) {
                        checkbox.checked = true;
                    }
                }
            }
        });
        
        // 触发选择改变事件
        this.triggerSelectionChanged();
    }
    
    /**
     * 根据全路径查找节点
     * @param fullPath 节点全路径
     */
    private findNodeByFullPath(fullPath: string): TreeNode | null {
        const pathParts = fullPath.split(' » ').map(part => part.trim());
        let currentNode: TreeNode | null = null;
        let searchNodes = this.data;
        
        // 逐级查找节点
        for (const part of pathParts) {
            currentNode = searchNodes.find(node => node.name === part) || null;
            if (!currentNode) return null;
            searchNodes = currentNode.children || [];
        }
        
        return currentNode;
    }
    
    /**
     * 清除所有选择
     */
    public clearSelection() {
        const clearNode = (node: TreeNode) => {
            if (!node) return;
            
            node.checked = false;
            node.indeterminate = false;
            if (node.children) {
                node.children.forEach(clearNode);
            }
        };
        
        this.data.forEach(clearNode);
        // 添加重新渲染调用
        this.render();
    }

    private setNodeSelected(node: TreeNode, checked: boolean) {
        if (!node) return;
        
        node.checked = checked;
        node.indeterminate = false;
        if (node.children) {
            node.children.forEach(child => this.setNodeSelected(child, checked));
        }
    }

    private updateParentCheckState(node: TreeNode) {
        if (node.children && node.children.length > 0) {
            let allChecked = true;
            let allUnchecked = true;
            let someChecked = false;
            let someUnchecked = false;

            for (const child of node.children) {
                if (child.checked) {
                    allUnchecked = false;
                    someChecked = true;
                } else {
                    allChecked = false;
                    someUnchecked = true;
                }
            }

            if (allChecked) {
                node.checked = true;
                node.indeterminate = false;
            } else if (allUnchecked) {
                node.checked = false;
                node.indeterminate = false;
            } else {
                node.checked = false;
                node.indeterminate = true;
            }

            // 添加空值检查
            if (node.parent) {
                this.updateParentCheckState(node.parent);
            }
        }
    }

    private triggerSelectionChanged() {
        this.options.onCheckChange?.(undefined, false, this.getCheckedNodes());
    }

    private initializeParentReferences(nodes: TreeNode[], parent?: TreeNode) {
        nodes.forEach(node => {
            node.parent = parent;
            if (node.children) {
                this.initializeParentReferences(node.children, node);
            }
        });
    }
} 