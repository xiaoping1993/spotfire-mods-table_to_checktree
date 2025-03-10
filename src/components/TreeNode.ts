export interface TreeNode {
    name: string;
    value: number;
    path: number;
    fullName: string;    // 新增fullName属性，存储完整路径
    children?: TreeNode[];
    checked?: boolean;
    indeterminate?: boolean;
    parent?: TreeNode;
}