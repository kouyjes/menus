import util from './util';
var defaultConstant = {
    centerSize:30,
    radiusStep:0,
    offsetRadius:80,
    arcAngle:Math.PI / 3
};
interface MenuConfig{
    angle?:number;
    style?:Function;
}
interface Menu extends MenuConfig{
    name:String;
    caption:String;
    html?:String;
    icon?:String;
    menuList?:MenuList;
}
interface MenuList extends MenuConfig{
    items:Menu[];
    radiusStep?:number;
    offsetRadius?:number;
}
interface ContextMenuOption{
    el:SVGElement;
    menuList:MenuList;
    centerSize?:number;
}
interface Point{
    x:number;
    y:number;
}
class ContextMenu implements ContextMenuOption{
    el:SVGElement;
    menuList:MenuList = {
        items:[]
    };
    centerSize = defaultConstant.centerSize;
    private contentEl;
    constructor(option:ContextMenuOption){
        this.assignOption(option);
    }
    private assignOption(option:ContextMenuOption){
        if(!option){
            return;
        }
        Object.keys(option).forEach((key) => {
            var value = option[key];
            if(typeof value === typeof this[key]){
                this[key] = value;
            }
        });
    }
    show(position:Point,parent?:HTMLElement){
        parent = parent || document.body;
        if(!this.el){
            this.render();
            parent.appendChild(this.el);
        }
        this.contentEl.setAttribute('transform','translate(' + position.x + ',' + position.y + ')');

    }

    /**
     * render menu center
     */
    private renderMenuCenter(){
        var centerSize = this.centerSize;
        var center = util.createSvgElement('circle');
        center.setAttribute('r','' + centerSize);
        center.setAttribute('cx','0');
        center.setAttribute('cy','0');
        center.setAttribute('fill','#ccc');
        this.contentEl.appendChild(center);
    }
    private renderMenuRoot(){
        var svg = util.createSvgElement('svg');
        svg.setAttribute('class','here-ui-menus');
        this.el = <SVGElement>svg;

        var contentEl = util.createSvgElement('g');
        contentEl.setAttribute('class','menu-position')
        this.contentEl = contentEl;
        svg.appendChild(contentEl);
    }
    private renderMenuContent(menu:Menu,offsetAngle:number,baseRadius:number,offsetRadius:number){

        var tempDeg = offsetAngle;
        var arcCenterX = (baseRadius + offsetRadius/2) * Math.cos(tempDeg) - offsetRadius / 2,
            arcCenterY = -(baseRadius + offsetRadius/2) * Math.sin(tempDeg) - offsetRadius / 2;
        var objectEle = util.createSvgElement('foreignObject');
        objectEle.setAttribute('width','' + offsetRadius);
        objectEle.setAttribute('height','' + offsetRadius);
        objectEle.setAttribute('x','' + arcCenterX);
        objectEle.setAttribute('y','' + arcCenterY);


        var html = document.createElement('div');
        html.className = 'menu-html';
        objectEle.appendChild(html);

        if(menu.html){
            html.innerHTML = menu.html;
        }else{
            let icon;
            if(menu.icon){
                icon = document.createElement('div');
                icon.className = 'menu-icon';
                util.style(icon,{
                    height: '70%'
                });
            }

            let img = document.createElement('img');
            img.src = menu.icon;
            icon.appendChild(img);

            let text = document.createElement('div');
            text.className = 'menu-text';
            text.innerText = menu.caption;
            text.style.height = '20%';

            html.appendChild(icon);
            html.appendChild(text);
        }

        if(util.isFunction(menu.style)){
            menu.style.call(undefined,html);
        }


        return objectEle;
    }
    private renderMenus(menuList:MenuList,startDeg:number = 0,baseRadius:number = this.centerSize){


        var offsetRadius = util.valueOf(menuList.offsetRadius,defaultConstant.offsetRadius);
        var radiusStep = util.valueOf(menuList.radiusStep,defaultConstant.radiusStep);

        baseRadius += radiusStep;

        var pg = util.createSvgElement('g');
        pg.setAttribute('class','menu-items');
        var menus = menuList.items;
        var offsetAngle = 0;
        menus.forEach((menu) => {

            var angle = menu.angle;
            var tempDeg = startDeg + angle + offsetAngle;
            var arcG = <SVGElement>(util.createSvgElement('g'));
            arcG.__menuData__ = {
                menu:menu,
                angle:angle,
                radius:baseRadius + offsetRadius,
                offsetAngle:startDeg + offsetAngle
            };
            var p = util.createSvgElement('path');
            var paths = [];
            var pointA = {
                x:Math.cos(tempDeg) * baseRadius,
                y:-Math.sin(tempDeg) * baseRadius
            };
            paths.push('M' + pointA.x + ' ' + pointA.y);
            var radius = baseRadius + offsetRadius;
            var pointB = {
                x:Math.cos(tempDeg) * radius,
                y:-Math.sin(tempDeg) * radius
            };
            paths.push('L' + pointB.x + ' ' + pointB.y);
            tempDeg = startDeg + offsetAngle;
            var pointC = {
                x:Math.cos(tempDeg) * radius,
                y:-Math.sin(tempDeg) * radius
            };
            paths.push('A' + radius + ' ' + radius + ' 0 0 1 ' + pointC.x + ' ' + pointC.y);
            var pointD = {
                x:Math.cos(tempDeg) * baseRadius,
                y:-Math.sin(tempDeg) * baseRadius
            };
            paths.push('L' + pointD.x + ' ' + pointD.y);
            paths.push('A' + baseRadius + ' ' + baseRadius + ' 0 0 0 ' + pointA.x + ' ' + pointA.y);

            p.setAttribute('d',paths.join(''))
            p.setAttribute('stroke','blue');


            //create text area
            var contentAngle = startDeg + offsetAngle + angle / 2;
            var menuContent = this.renderMenuContent(menu,contentAngle,baseRadius,offsetRadius);

            arcG.appendChild(p);
            arcG.appendChild(menuContent);
            pg.appendChild(arcG);


            offsetAngle += angle;
        });

        if(util.isFunction(menuList.style)){
            menuList.style.call(undefined,pg);
        }

        return pg;
    }
    protected render(){

        this.renderMenuRoot();
        this.renderMenuCenter();

        var menuList = this.menuList;
        var menus = menuList && menuList.items;
        if(!menus || menus.length === 0){
            return;
        }
        var angle = menuList.angle;
        angle = angle || 2 * Math.PI / menus.length;
        menus.forEach((menu:Menu) => {
            menu.angle = menu.angle || angle;
        });
        var pg = this.renderMenus(this.menuList);
        this.contentEl.appendChild(pg);

        this.bindEvent();

    }
    private bindEvent(){
        this.el.addEventListener('click',(e) => {
            var target = <HTMLElement>e.target;
            while(true){
                if(target.__menuData__){
                    this.menuClick(target);
                    break;
                }
                if(target === this.el){
                    break;
                }
                if(target = target.parentElement){
                }else{
                    break;
                }
            }
        });
    }
    private menuClick(target:HTMLElement){
        var selector = '.menu-items';
        var elements = Array.prototype.slice.call(target.parentElement.querySelectorAll(selector));
        elements.forEach((el) => {
            el.setAttribute('hidden','');
        });
        var menusElement = target.querySelector(selector);
        if(menusElement){
            menusElement.removeAttribute('hidden');
            return;
        }
        var menuData = <MenuData>target.__menuData__;
        var currentMenu = menuData.menu;
        var menuList = currentMenu.menuList;
        var menus = menuList && menuList.items;
        if(!menus || menus.length === 0){
            return;
        }
        var angle = menuList.angle || defaultConstant.arcAngle;
        var totalAngle = 0;
        menus.forEach((menu:Menu) => {
            menu.angle = menu.angle || angle;
            totalAngle += menu.angle;
        });
        var startAngle = menuData.offsetAngle - (totalAngle - menuData.angle) / 2;

        var pg = this.renderMenus(currentMenu.menuList,startAngle,menuData.radius);
        target.appendChild(pg);
    }
}
export { ContextMenu };