//import * as echarts from 'echarts';

Spotfire.initialize(async (mod: Spotfire.Mod) => {
    /**
     * Create the read function.
     */
    const reader = mod.createReader(mod.visualization.data(), mod.windowSize(), mod.property("myProperty"));

    //初始化文档属性
    let modsHcrpDiagnoseFilter = null;
    try {
        modsHcrpDiagnoseFilter = await mod.document.property("modsHcrpDiagnoseFilter");
    } catch (error) {
        mod.controls.errorOverlay.show("请先创建文档属性modsHcrpDiagnoseFilter!");
    }
    /**
     * Store the context.
     */
    const context = mod.getRenderContext();

    /**
     * Initiate the read loop
     */
    reader.subscribe(render);
    

    async function render(dataView: Spotfire.DataView, windowSize: Spotfire.Size, prop: Spotfire.ModProperty<string>) {
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
        const xRoot = await xHierarchy.root();
        if (xRoot == null) {
            // User interaction caused the data view to expire.
            // Don't clear the mod content here to avoid flickering.
            return;
        }
        //定义树状图接口
        interface TreeNode {
            name:string,
            value:number,
            children?:TreeNode[]
        }
        //创建树状数据结构
        let treeData:TreeNode[] = [];
        const childNodes = xRoot.children;
        if (childNodes) {
            for (let i = 0; i < childNodes?.length; ++i) {
                //这是二级分类 例如：E10-E14
                const childNode = childNodes[i];
                const levels1Name = childNode.key==null?"":childNode.key;
                const level1Data:TreeNode = {
                    name:levels1Name,
                    value:0,
                    children:[]
                }
                const childNodes2 = childNode.children;
                if(childNodes2){
                    for (let j = 0; j < childNodes2?.length; ++j) {
                        // 这是 三级分类：例如：E10 E11 E12
                        const childNode2 = childNodes2[j];
                        const level2Name = childNode2.key==null?"":childNode2.key;
                        const level2Data:TreeNode = {
                            name:level2Name,
                            value:0,
                            children:[]
                        }
                        const childNodes3 = childNode2.children;
                        if(childNodes3){
                            for (let k = 0; k < childNodes3?.length; ++k) {
                                // 再拿 末尾节点：例如：E10.000 E10.001 E10.002
                                const childNode3 = childNodes3[k];
                                const level3Name = childNode3.key==null?"":childNode3.key;
                                let level3Value = childNode3.rows()[0].continuous("childs-count").value();
                                level3Value = level3Value==null?0:Number(level3Value);
                                //添加叶子节点
                                level2Data.children?.push({name:level3Name,value:level3Value});
                                //累加到父节点
                                level2Data.value += level3Value;
                            }
                        }
                        //添加二级节点
                        level1Data.children?.push(level2Data);
                        //累加到父节点
                        level1Data.value += level2Data.value;

                    }
                }
                treeData.push(level1Data);
            }
        }
        // 打印树状结构验证数据
        console.log('Tree Data:', JSON.stringify(treeData, null, 2));

        /**
         * 准备图表容器
         */
        const container = document.querySelector("#mod-container");
        if (!container) {
            mod.controls.errorOverlay.show(
                "Failed to find the DOM node with id #mod-container which should contain the visualization."
            );
            return;
        }
        
        // 清空容器内容
        container.innerHTML = '';
        
        // 创建图表容器
        const chartContainer = document.createElement('div');
        chartContainer.style.width = '100%';
        chartContainer.style.height = '100%';
        container.appendChild(chartContainer);

        // 初始化 ECharts
        const chart = echarts.init(chartContainer);
        
        // 配置项
        const option = {
            tooltip: {
                trigger: 'item',
                formatter: '{b}: {c}'
            },
            series: [
                {
                    type: 'tree',
                    data: treeData,
                    top: '5%',
                    left: '7%',
                    bottom: '5%',
                    right: '7%',
                    symbolSize: 7,
                    label: {
                        position: 'left',
                        verticalAlign: 'middle',
                        align: 'right',
                        fontSize: 12
                    },
                    leaves: {
                        label: {
                            position: 'right',
                            verticalAlign: 'middle',
                            align: 'left'
                        }
                    },
                    emphasis: {
                        focus: 'descendant'
                    },
                    expandAndCollapse: true,
                    animationDuration: 550,
                    animationDurationUpdate: 750
                }
            ]
        };

        // 使用配置项设置图表
        chart.setOption(option);

        // 监听窗口大小变化
        const resizeObserver = new ResizeObserver(() => {
            chart.resize();
        });
        resizeObserver.observe(container);

        /**
         * 已准备好，可以打印输出
         */
        context.signalRenderComplete();   
    }
});
