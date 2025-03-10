import { TreeView } from './components/TreeView';
import { TreeNode } from './components/TreeNode';

Spotfire.initialize(async (mod: Spotfire.Mod) => {

    /**
     * 后续优化计划
     * 1：能动态根据绑定的x轴字段数，来动态确定树状图多少层数，目前是固定的三层 （已完成）
     * 2：给树状图结构增加path属性，用以记录层级路径 （已完成）
     * 3：手动选复选框不触发reader，resetFilter clearMark会触发reader（已完成）
     * 4：增加一个操作按钮选项，mark,filter,clearMark,resetFilter (已完成)
     * 5：内容超过容器高度时，自动出现滚动条（已完成）
     * 6：此mods在同一spotfire页面中mark filter clearMark resetFilter 会相互影响，需要优化（已完成）
     * 7：filter内容为数值型时，filter效果失效，需按column类型，构建filter 字符串（已完成）
     * 8：调整容器高度，使之与页面高度一致（已完成）
     * 
     * 问题1：为何我我在其中一个组件勾选了几个节点，去其他页面再回来后，这组件树状图就只剩选中的那几个节点了，其他未选中节点不显示了
     * 首先理论上来说dataview发生变化 组件结构都会相应变化，
     * 正在操作的组件，我们阻止他收到dataview变化的通知，所以不会变，但你从其他页面回来，我们无法阻止，就变化了，想要继续看到其他节点，就resetFilter即可。
     * 其中，还需保证当前组件的操作，其他组件不会被阻止，需要他接收到dataview的变化，树状结构需要动态构建
     
     * 


    */
    /**
     * 经验积累
     * 1：mods中的propertiy是可以被用于保存mods状态信息的容器，这样spotfire中切换到其他页面时再回来状态还能通过他恢复
     */


    //为了只监听mark filter得变化，这里创建一个变量代表mark filter是否变化供reader监听
    let markFilterChanged = false;
    
    /**
     * Create the read function.
     */
    const reader = mod.createReader(mod.visualization.data(), mod.windowSize());

    //初始化文档属性
    let modsHcrpDiagnoseFilter:any = null;
    try {
        modsHcrpDiagnoseFilter = await mod.document.property("modFilters");
    } catch (error) {
        mod.controls.errorOverlay.show(`
            请先创建文档属性modFilters!，同时构建对应ironPython脚本\n
            脚本名称：filterAction\n
            脚本内容：\n
                from Spotfire.Dxp.Application.Filters import *
                from Spotfire.Dxp.Application.Visuals import VisualContent
                from System import Guid
                import json

                page = Application.Document.ActivePageReference
                filterPanel = page.FilterPanel
                for fs in Document.FilteringSchemes:
                    if fs.FilteringSelectionReference.Name == "Filtering scheme": 
                        filterPanel.FilteringSchemeReference = fs
                #定义参数变量
                modFilter = Document.Properties["modFilters"]
                modFilter = modFilter.strip("'")
                modFilterJson = json.loads(modFilter)
                tableName = modFilterJson["tableName"]
                columnName = modFilterJson["columnName"]
                filterType = modFilterJson["filterType"]
                filterValue = modFilterJson["filterValue"]
                print filterValue
                dataTable = Document.Data.Tables[tableName]
                filterReference = Document.FilteringSchemes.DefaultFilteringSchemeReference[dataTable][columnName]
                if filterType=="ListBoxFilter":    
                    lbFilter = filterReference.As[ListBoxFilter]()
                    _array = filterValue
                    lbFilter.IncludeAllValues=False
                    lbFilter.SetSelection(_array)
                if filterType=='resetFilter':
                    Document.FilteringSchemes.DefaultFilteringSchemeReference[dataTable].ResetAllFilters()    
            `);
        return;
    }
    let previousMarkingInfo: Spotfire.MarkingInfo | null = null;
    /**
     * Store the context.
     */
    const context = mod.getRenderContext();

    /**
     * Initiate the read loop
     */
    reader.subscribe(render);
    

    async function render(dataView: Spotfire.DataView, windowSize: Spotfire.Size) {
        // // 获取当前的 marking 信息
        // const currentMarkingInfo = await dataView.marking();
        
        // // 检查是否只有 marking 发生了变化
        // const onlyMarkingChanged = 
        //     previousMarkingInfo !== currentMarkingInfo && 
        //     !reader.hasValueChanged(windowSize)

        // // 更新 previousMarkingInfo
        // previousMarkingInfo = currentMarkingInfo;

        if (markFilterChanged) {
            console.log("只有 marking filter 发生变化，跳过渲染");
            markFilterChanged=false;
            return;
        }
        /**
         * Check the data view for errors
         */
        let errors = await dataView.getErrors();
        if (errors.length > 0) {
            // Showing an error overlay will hide the mod iframe.
            // Clear the mod content here to avoid flickering effect of
            // an old configuration when next valid data view is received.
            mod.controls.errorOverlay.show(errors);
            return;
        }
        mod.controls.errorOverlay.hide();

        /**
         * Get the hierarchy of the categorical X-axis.
         */
        const xHierarchy = await dataView.hierarchy("multistage-separation");
        if (!xHierarchy) {
            mod.controls.errorOverlay.show("Cannot find hierarchy in data view for axis 'X'.");
            return;
        }
        //拿到x轴信息
        const x = await mod.visualization.axis("multistage-separation");
        const XColumns = x.parts.map(part=>part.displayName);
        // 获取主数据表
        const mainTable = await mod.visualization.mainTable();
        const tableName = mainTable.name;
        
        const xRoot = await xHierarchy.root();
        if (xRoot == null) {
            // User interaction caused the data view to expire.
            // Don't clear the mod content here to avoid flickering.
            return;
        }
        //创建树状数据结构
        
        const childNodes = xRoot.children;
        //初始化树状图数据结构
        let treeData:TreeNode[] = [];
        // 创建树状数据结构
        if (childNodes) {
            for (const childNode of childNodes) {
                treeData.push(createTreeNode(childNode));
            }
        }
        const columnsCount = XColumns.length;
        /**
         * 准备容器
         */
        const container = document.querySelector("#mod-container") as HTMLElement;
        if (!container) {
            mod.controls.errorOverlay.show(
                "Failed to find the DOM node with id #mod-container which should contain the visualization."
            );
            return;
        }
        
        // 清空容器内容
        container.innerHTML = '';
        // 创建一个控制面板容器
        const controlPanel = document.createElement("div");
        controlPanel.style.cssText = `
            display: flex;
            justify-content: flex-end;
            position: absolute;
            right: 50px;
            width: 200px;
            top: 25px;
            z-index: 1000;
        `;
        // 添加操作选择器
        const operateSelect = document.createElement("select");
        operateSelect.innerHTML = `
            <option value="mark">Mark</option>
            <option value="filter">Filter</option>
            <option value="clearMark">ClearMark</option>
            <option value="resetFilter">ResetFilter</option>
        `;
        operateSelect.style.cssText = `
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #ccc;
        `;
        // 默认选择filter
        operateSelect.value = 'filter';
        controlPanel.appendChild(operateSelect);
        container.appendChild(controlPanel);

        // 创建确定按钮
        const confirmButton = document.createElement("button");
        confirmButton.innerText = "确定";
        confirmButton.style.display = "none"; // 默认隐藏
        confirmButton.onclick = async () => {
            markFilterChanged = false;
            const operationTypeValue = operateSelect.value;
            if (operationTypeValue === 'clearMark') {
                // 触发清除标记的事件
                const dataView = await mod.visualization.data();
                dataView.clearMarking();
                // treeView 也需要清除选中复选框
                treeView.clearSelection();
                // property 也需要清除选中复选框
                const prop = await mod.property("myProperty");
                prop.set('');
            } else if (operationTypeValue === 'resetFilter') {
                // 触发重置过滤的事件
                const modFilter:any = {};
                const mainTable = await mod.visualization.mainTable();
                const tableName = mainTable.name;
                modFilter['tableName'] = tableName;
                modFilter['columnName'] = XColumns[columnsCount-1];
                modFilter['filterType'] = 'resetFilter';
                modFilter['filterValue'] = [];
                const modFilterString = JSON.stringify(modFilter);
                modsHcrpDiagnoseFilter.set(modFilterString);
                // treeView 也需要清除选中复选框
                treeView.clearSelection();
                // property 也需要清除选中复选框
                const prop = await mod.property("myProperty");
                prop.set('');
            }
        };
        controlPanel.appendChild(confirmButton);

        // 监听操作选择器的变化
        operateSelect.onchange = () => {
            const operationTypeValue = operateSelect.value;
            confirmButton.style.display = (operationTypeValue === 'clearMark' || operationTypeValue === 'resetFilter') ? 'block' : 'none';
        };
        // 初始化树形控件
        const treeView = new TreeView(container, treeData, {
            onCheckChange: async (currentNode, checked, allCheckedNodes) => {
                //console.log('当前操作的节点:', currentNode);
                //console.log('当前节点的选中状态:', checked);
                //console.log('所有选中的节点:', allCheckedNodes);
                markFilterChanged=true;//确保不会因为你点击了这个就触发页面刷选
                dataView = await mod.visualization.data();
                const prop = await mod.property("myProperty");
                //allCheckedNodes = allCheckedNodes.filter(allCheckedNode => allCheckedNode.path==columnsCount);
                const propValue = allCheckedNodes.map(allCheckedNode => allCheckedNode.fullName);
                prop.set(propValue.join(','));
                // marking操作还是filtering操作
                let operationTypeValue = operateSelect.value;
                if(operationTypeValue == 'mark'){
                    // 获取所有行
                    const allRows = await dataView.allRows();
                    if (!allRows) return;
                    // 找到所有匹配当前节点名称的行
                    const matchingRows = allRows.filter(row => {
                        const value = row.categorical("multistage-separation").formattedValue();
                        return propValue.includes(value);
                    });
                    dataView.clearMarking();
                    dataView = await mod.visualization.data();
                    dataView.mark(matchingRows);
                }else if( operationTypeValue == 'filter'){
                    // 获取指定列
                    const columnName = XColumns[columnsCount-1]
                    const column = await mainTable.column(columnName);
                    const dataType = column.dataType;
                    let propValue:any[] = allCheckedNodes.map(allCheckedNode => allCheckedNode.name);
                    if(dataType.isNumber()){
                        propValue = propValue.map(prop=> Number(prop))
                    }
                    
                    const modFilter:any = {};
                    modFilter['tableName'] = tableName;
                    modFilter['columnName'] = columnName;
                    modFilter['filterType'] = 'ListBoxFilter';
                    modFilter['filterValue'] = propValue;
                    const modFilterString = JSON.stringify(modFilter);
                    modsHcrpDiagnoseFilter.set(modFilterString);
                }

            }
        });
        //给这个treeView赋值之前的过滤条件
        const prop = await mod.property("myProperty");
        let propValue = prop.value();
        propValue = propValue==null? '': propValue.toString();
        treeView.setSelectedByFullPaths(propValue);

        /**
         * 已准备好，可以打印输出
         */
        context.signalRenderComplete();   
        
    }
});

    //定义递归创建树节点的函数
    function createTreeNode(node: Spotfire.DataViewHierarchyNode, level: number = 1, parentPath: string = ''): TreeNode {
        const nodeName = node.key == null ? "" : node.key;
        const fullName = parentPath ? `${parentPath} » ${nodeName}` : nodeName;
        
        const treeNode: TreeNode = {
            name: nodeName,
            path: level,
            fullName: fullName,  // 添加完整路径
            value: 0,
            children: []
        };
    
        // 如果是叶子节点，获取值并返回
        if (!node.children) {
            let nodeValue = node.rows()[0].continuous("childs-count").value();
            treeNode.value = nodeValue == null ? 0 : Number(nodeValue);
            delete treeNode.children;
            return treeNode;
        }
    
        // 递归处理子节点，并传递当前的完整路径
        for (const childNode of node.children) {
            const childTreeNode = createTreeNode(childNode, level + 1, fullName);
            treeNode.children?.push(childTreeNode);
            treeNode.value += childTreeNode.value;
        }
        return treeNode;
    }
    /**
     * 自定义函数集合结束
     */
