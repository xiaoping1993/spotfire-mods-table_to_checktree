"use strict";(()=>{var k=class{container;data;options;constructor(e,t,n={}){this.container=e,this.data=t,this.options=n,this.initializeParentReferences(this.data),this.render()}createTreeNode(e){let t=document.createElement("div");t.className="tree-node",t.setAttribute("data-full-name",e.fullName);let n=document.createElement("span");n.className="toggle-btn",n.textContent=e.children?.length?"\u25BC":"\u2022",n.onclick=()=>{if(e.children?.length){let c=t.querySelector(".node-children");if(c){let s=c.style.display!=="none";c.style.display=s?"none":"block",n.textContent=s?"\u25B6":"\u25BC"}}};let o=document.createElement("input");o.type="checkbox",o.className="node-checkbox",o.addEventListener("change",c=>{let s=c.target.checked;t.querySelectorAll(".node-checkbox").forEach(f=>{f.checked=s});let M=this.getCheckedNodes();this.options.onCheckChange?.(e,s,M)});let r=document.createElement("div");r.className="node-content";let l=document.createElement("span");l.className="node-label",l.textContent=e.name,l.title=e.fullName;let a=document.createElement("span");if(a.className="node-value",a.textContent=e.value.toString(),r.appendChild(l),r.appendChild(a),t.appendChild(n),t.appendChild(o),t.appendChild(r),e.children&&e.children.length>0){let c=document.createElement("div");c.className="node-children",e.children.forEach(s=>{c.appendChild(this.createTreeNode(s))}),t.appendChild(c)}return t}render(){let e=this.container.querySelector(".tree-container");e&&this.container.removeChild(e);let t=document.createElement("div");t.className="tree-container",this.data.forEach(n=>{t.appendChild(this.createTreeNode(n))}),this.container.appendChild(t)}updateData(e){this.data=e,this.render()}getCheckedNodes(){let e=[];return this.container.querySelectorAll(".node-checkbox:checked").forEach(n=>{let o=n.closest(".tree-node");if(o){let r=o.querySelector(".node-label");if(r){let l=r.textContent||"",a=this.findNodeByName(l);a&&e.push(a)}}}),e}findNodeByName(e){let t=n=>{for(let o of n){if(o.name===e)return o;if(o.children){let r=t(o.children);if(r)return r}}return null};return t(this.data)}setSelectedByFullPaths(e){if(!e)return;let t=e.split(",");this.clearSelection(),t.forEach(n=>{let o=this.findNodeByFullPath(n);if(o){this.setNodeSelected(o,!0),this.updateParentCheckState(o);let r=this.container.querySelector(`[data-full-name="${o.fullName}"]`);if(r){let l=r.querySelector(".node-checkbox");l&&(l.checked=!0)}}}),this.triggerSelectionChanged()}findNodeByFullPath(e){let t=e.split(" \xBB ").map(r=>r.trim()),n=null,o=this.data;for(let r of t){if(n=o.find(l=>l.name===r)||null,!n)return null;o=n.children||[]}return n}clearSelection(){let e=t=>{t&&(t.checked=!1,t.indeterminate=!1,t.children&&t.children.forEach(e))};this.data.forEach(e),this.render()}setNodeSelected(e,t){e&&(e.checked=t,e.indeterminate=!1,e.children&&e.children.forEach(n=>this.setNodeSelected(n,t)))}updateParentCheckState(e){if(e.children&&e.children.length>0){let t=!0,n=!0,o=!1,r=!1;for(let l of e.children)l.checked?(n=!1,o=!0):(t=!1,r=!0);t?(e.checked=!0,e.indeterminate=!1):n?(e.checked=!1,e.indeterminate=!1):(e.checked=!1,e.indeterminate=!0),e.parent&&this.updateParentCheckState(e.parent)}}triggerSelectionChanged(){this.options.onCheckChange?.(void 0,!1,this.getCheckedNodes())}initializeParentReferences(e,t){e.forEach(n=>{n.parent=t,n.children&&this.initializeParentReferences(n.children,n)})}};Spotfire.initialize(async i=>{let e=!1,t=i.createReader(i.visualization.data(),i.windowSize()),n=null;try{n=await i.document.property("modFilters")}catch{i.controls.errorOverlay.show(`
            \u8BF7\u5148\u521B\u5EFA\u6587\u6863\u5C5E\u6027modFilters!\uFF0C\u540C\u65F6\u6784\u5EFA\u5BF9\u5E94ironPython\u811A\u672C

            \u811A\u672C\u540D\u79F0\uFF1AfilterAction

            \u811A\u672C\u5185\u5BB9\uFF1A

                from Spotfire.Dxp.Application.Filters import *
                from Spotfire.Dxp.Application.Visuals import VisualContent
                from System import Guid
                import json

                page = Application.Document.ActivePageReference
                filterPanel = page.FilterPanel
                for fs in Document.FilteringSchemes:
                    if fs.FilteringSelectionReference.Name == "Filtering scheme": 
                        filterPanel.FilteringSchemeReference = fs
                #\u5B9A\u4E49\u53C2\u6570\u53D8\u91CF
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
            `);return}let o=null,r=i.getRenderContext();t.subscribe(l);async function l(a,c){if(e){console.log("\u53EA\u6709 marking filter \u53D1\u751F\u53D8\u5316\uFF0C\u8DF3\u8FC7\u6E32\u67D3"),e=!1;return}let s=await a.getErrors();if(s.length>0){i.controls.errorOverlay.show(s);return}i.controls.errorOverlay.hide();let F=await a.hierarchy("multistage-separation");if(!F){i.controls.errorOverlay.show("Cannot find hierarchy in data view for axis 'X'.");return}let f=(await i.visualization.axis("multistage-separation")).parts.map(d=>d.displayName),P=await i.visualization.mainTable(),B=P.name,R=await F.root();if(R==null)return;let V=R.children,z=[];if(V)for(let d of V)z.push(A(d));let L=f.length,y=document.querySelector("#mod-container");if(!y){i.controls.errorOverlay.show("Failed to find the DOM node with id #mod-container which should contain the visualization.");return}y.innerHTML="";let b=document.createElement("div");b.style.cssText=`
            display: flex;
            justify-content: flex-end;
            position: absolute;
            right: 50px;
            width: 200px;
            top: 25px;
            z-index: 1000;
        `;let p=document.createElement("select");p.innerHTML=`
            <option value="mark">Mark</option>
            <option value="filter">Filter</option>
            <option value="clearMark">ClearMark</option>
            <option value="resetFilter">ResetFilter</option>
        `,p.style.cssText=`
            padding: 5px;
            border-radius: 4px;
            border: 1px solid #ccc;
        `,p.value="filter",b.appendChild(p),y.appendChild(b);let m=document.createElement("button");m.innerText="\u786E\u5B9A",m.style.display="none",m.onclick=async()=>{e=!1;let d=p.value;if(d==="clearMark")(await i.visualization.data()).clearMarking(),S.clearSelection(),(await i.property("myProperty")).set("");else if(d==="resetFilter"){let u={},C=(await i.visualization.mainTable()).name;u.tableName=C,u.columnName=f[L-1],u.filterType="resetFilter",u.filterValue=[];let T=JSON.stringify(u);n.set(T),S.clearSelection(),(await i.property("myProperty")).set("")}},b.appendChild(m),p.onchange=()=>{let d=p.value;m.style.display=d==="clearMark"||d==="resetFilter"?"block":"none"};let S=new k(y,z,{onCheckChange:async(d,u,v)=>{e=!0,a=await i.visualization.data();let C=await i.property("myProperty"),T=v.map(h=>h.fullName);C.set(T.join(","));let w=p.value;if(w=="mark"){let h=await a.allRows();if(!h)return;let H=h.filter(E=>{let N=E.categorical("multistage-separation").formattedValue();return T.includes(N)});a.clearMarking(),a=await i.visualization.data(),a.mark(H)}else if(w=="filter"){let h=f[L-1],E=(await P.column(h)).dataType,N=v.map(D=>D.name);E.isNumber()&&(N=N.map(D=>Number(D)));let g={};g.tableName=B,g.columnName=h,g.filterType="ListBoxFilter",g.filterValue=N;let O=JSON.stringify(g);n.set(O)}}}),x=(await i.property("myProperty")).value();x=x==null?"":x.toString(),S.setSelectedByFullPaths(x),r.signalRenderComplete()}});function A(i,e=1,t=""){let n=i.key==null?"":i.key,o=t?`${t} \xBB ${n}`:n,r={name:n,path:e,fullName:o,value:0,children:[]};if(!i.children){let l=i.rows()[0].continuous("childs-count").value();return r.value=l==null?0:Number(l),delete r.children,r}for(let l of i.children){let a=A(l,e+1,o);r.children?.push(a),r.value+=a.value}return r}})();
