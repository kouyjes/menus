import util from './util';
import { nextFrame,cancelFrame } from './util';
import { MenuConfig,Menu,MenuList,AnnularMenuOption,Point,EventListeners,MenuEvent } from './interface';
import { defaultConstant,classNames } from './config';
class AnnularMenu implements AnnularMenuOption {
    element:SVGElement;
    menuList:MenuList = {
        __data__:{},
        items: []
    };
    startAngle:number = 0;
    collapsible:boolean = true;
    draggable:boolean = true;
    centerSize = defaultConstant.centerSize;
    private listeners:EventListeners = {
        click: [],
        mouseover: [],
        menuClick: [],
        menuHover: []
    };
    private contentEl;

    constructor(option:AnnularMenuOption) {
        this.assignOption(option);
    }

    private assignOption(option:AnnularMenuOption) {
        if (!option) {
            return;
        }
        Object.keys(option).forEach((key) => {
            var value = option[key];
            if (typeof value === typeof this[key]) {
                this[key] = value;
            }
        });
    }

    /**
     * render menu center
     */
    private _renderCenterEl() {
        var centerSize = this.centerSize;
        var center = util.createSvgElement('circle');
        util.addClass(center,classNames.center);
        center.setAttribute('r', '' + centerSize);
        center.setAttribute('cx', '0');
        center.setAttribute('cy', '0');

        var g = util.createSvgElement('g');
        g.appendChild(center);
        return g;
    }

    private _renderContentEl() {
        var contentEl = util.createSvgElement('g');
        util.addClass(contentEl,classNames.position);
        return contentEl;
    }

    private _renderRootEl() {
        var svg = util.createSvgElement('svg');
        util.addClass(svg,classNames.root);
        util.toggleVisible(svg,true);
        return svg;
    }

    private renderMenuContentEl(menu:Menu, offsetAngle:number, baseRadius:number, offsetRadius:number) {

        var tempDeg = offsetAngle;
        var arcCenterX = (baseRadius + offsetRadius / 2) * Math.cos(tempDeg) - offsetRadius / 2,
            arcCenterY = -(baseRadius + offsetRadius / 2) * Math.sin(tempDeg) - offsetRadius / 2;
        var objectEle = util.createSvgElement('foreignObject');
        objectEle.setAttribute('width', '' + offsetRadius);
        objectEle.setAttribute('height', '' + offsetRadius);
        objectEle.setAttribute('x', '' + arcCenterX);
        objectEle.setAttribute('y', '' + arcCenterY);


        var html = util.createElement('div');
        html.className = classNames.menuContent;
        objectEle.appendChild(html);

        if (menu.html) {
            html.innerHTML = menu.html;
        } else {
            let icon, img;
            if (menu.icon) {
                icon = util.createElement('div');
                icon.className = classNames.menuIcon;

                img = util.createElement('img');
                img.src = menu.icon;
                icon.appendChild(img);
                html.appendChild(icon);
            }
            if(menu.caption){
                let text = util.createElement('div');
                text.className = classNames.menuText;
                text.innerText = menu.caption;
                html.appendChild(text);
            }

        }

        return objectEle;
    }

    private renderMenuList(menuList:MenuList, startDeg:number = 0, baseRadius:number = this.centerSize) {


        var offsetRadius = util.valueOf(menuList.offsetRadius, defaultConstant.offsetRadius);
        var radiusStep = util.valueOf(menuList.radiusStep, defaultConstant.radiusStep);

        baseRadius += radiusStep;

        var pg = util.createSvgElement('g');
        util.addClass(pg,classNames.menuItems);
        var menus = menuList.items;
        var offsetAngle = 0;
        menus.forEach((menu) => {

            var angle = menu.angle;
            var tempDeg = startDeg + angle + offsetAngle;
            var arcG = <SVGElement>(util.createSvgElement('g'));
            util.addClass(arcG,classNames.menuPathGroup);
            arcG.__menuData__ = {
                menu: menu,
                radius: baseRadius + offsetRadius,
                offsetAngle: startDeg + offsetAngle
            };
            var p = util.createSvgElement('path');
            util.addClass(p,classNames.menuPath);
            var paths = [];
            var pointA = {
                x: Math.cos(tempDeg) * baseRadius,
                y: -Math.sin(tempDeg) * baseRadius
            };
            paths.push('M' + pointA.x + ' ' + pointA.y);
            var radius = baseRadius + offsetRadius;
            var pointB = {
                x: Math.cos(tempDeg) * radius,
                y: -Math.sin(tempDeg) * radius
            };
            paths.push('L' + pointB.x + ' ' + pointB.y);
            tempDeg = startDeg + offsetAngle;
            var pointC = {
                x: Math.cos(tempDeg) * radius,
                y: -Math.sin(tempDeg) * radius
            };
            paths.push('A' + radius + ' ' + radius + ' 0 0 1 ' + pointC.x + ' ' + pointC.y);
            var pointD = {
                x: Math.cos(tempDeg) * baseRadius,
                y: -Math.sin(tempDeg) * baseRadius
            };
            paths.push('L' + pointD.x + ' ' + pointD.y);
            paths.push('A' + baseRadius + ' ' + baseRadius + ' 0 0 0 ' + pointA.x + ' ' + pointA.y);

            p.setAttribute('d', paths.join(''))


            //create text area
            var contentAngle = startDeg + offsetAngle + angle / 2;
            var menuContent = this.renderMenuContentEl(menu, contentAngle, baseRadius, offsetRadius);

            arcG.appendChild(p);
            arcG.appendChild(menuContent);

            if (util.isFunction(menu.callback)) {
                menu.callback.call(undefined, arcG);
            }
            arcG._parent = pg;
            pg.appendChild(arcG);

            offsetAngle += angle + menu.angleStep;
        });

        if (util.isFunction(menuList.callback)) {
            menuList.callback.call(undefined, pg);
        }

        return pg;
    }

    render(position?:Point):SVGElement {

        var rootEl = this._renderRootEl(),
            contentEl = this._renderContentEl(),
            menuCenter = this._renderCenterEl();

        contentEl.appendChild(menuCenter);
        rootEl.appendChild(contentEl);

        this.element = rootEl;
        this.contentEl = contentEl;

        if(position){
            this.position(position);
        }

        var menuList = this.menuList;
        var menus = menuList && menuList.items;
        if (!menus || menus.length === 0) {
            return;
        }

        menuList.angle = menuList.angle || 2 * Math.PI / menus.length;
        this._initMenuListData(menuList);
        var pg = this.renderMenuList(this.menuList,this.startAngle);
        util.addClass(pg,classNames.menuItemsRoot)
        util.preAppend(contentEl, pg);

        this.bindEvent();

        return this.element;

    }
    private _initMenuListData(menuList:MenuList){
        var totalAngle = 0;
        var angle = util.isNumber(menuList.angle) ? menuList.angle : defaultConstant.arcAngle;
        var angleStep = util.isNumber(menuList.angleStep) ? menuList.angleStep : defaultConstant.angleStep;
        menuList.items.forEach((menu:Menu) => {
            menu.angle = util.isNumber(menu.angle) ? menu.angle : angle;
            menu.angleStep = util.isNumber(menu.angleStep) ? menu.angleStep : angleStep
            totalAngle += (menu.angle + menu.angleStep);
        });
        if(!menuList.__data__){
            menuList.__data__ = {};
        }
        menuList.__data__.totalAngle = totalAngle;
    }
    getCurrentCenterSize(){
        var scale = this.scale();
        return {
            width:this.centerSize * scale.x,
            height:this.centerSize * scale.y
        };
    }
    scale(point?:Point) {

        return util.transform(this.contentEl,'scale',point,{
            x:1,
            y:1
        });

    }
    position(point?:Point) {

        return util.transform(this.contentEl,'translate',point,{
            x:0,
            y:0
        });

    }

    toggleCollapse(collapse?:boolean) {

        var className = 'collapse';

        if (collapse === void 0) {
            collapse = !util.hasClass(this.contentEl,className);
        }
        if (collapse) {
            util.addClass(this.contentEl,className);
            this.collapseAllSubMenus();
        } else {
            util.removeClass(this.contentEl,className);
        }

    }
    toggleVisible(visible?:boolean){
        util.toggleVisible(this.element,visible);
    }
    private _findMenuTarget(target:HTMLElement) {
        while (true) {
            if (target.__menuData__) {
                return target;
            }
            if (target === this.element) {
                break;
            }
            if (target = util.parent(target)) {
            } else {
                break;
            }
        }
        return null;
    }

    private bindEvent() {

        // bind collapse event
        if (this.collapsible) {
            this.bindCollapseEvent();
        }

        if (this.draggable) {
            this.bindDragEvent();
        }

        // bind mouse over event
        this.bindHoverEvent();

    }

    protected bindDragEvent() {
        var events;
        var circleEl = this.contentEl.querySelector(this._selector(classNames.center));
        var className = 'event-source';
        var startPoint:Point,startPos:Point = null;
        var stopEvent = (e) => {
            e.stopPropagation();
            e.preventDefault();
        };
        var mouseDown = (e) => {
            util.addClass(this.element,className);
            startPoint = util.getPosition(e);;
            startPos = this.position();
        };
        var mouseMove = (e) => {
            if(!startPoint){
                return;
            }
            var curPoint = util.getPosition(e);

            var pos = {
                x:curPoint.x - startPoint.x + startPos.x,
                y:curPoint.y - startPoint.y + startPos.y
            };
            var size = util.sizeOf(this.element),
                centerSize = this.getCurrentCenterSize();
            pos.x = Math.max(centerSize.width,pos.x);
            pos.x = Math.min(pos.x,size.width - centerSize.width);
            pos.y = Math.max(centerSize.height,pos.y);
            pos.y = Math.min(pos.y,size.height - centerSize.height);
            this.position(pos);
            stopEvent(e);
        };
        var mouseUp = (e) => {
            util.removeClass(this.element,className);
            var curPoint = util.getPosition(e);
            if(startPoint && Math.pow(curPoint.x - startPoint.x,2) + Math.pow(curPoint.y - startPoint.y,2) > Math.pow(5,2)){
                circleEl.moved = true;
                stopEvent(e);
            }else{
                circleEl.moved = false;
            }
            startPoint = null;
            startPos = null;
        };
        events = [
            {
                el: circleEl,
                types: ['touchstart', 'mousedown'],
                handler: mouseDown
            },
            {
                el: this.element,
                types: ['touchmove', 'mousemove'],
                handler: mouseMove
            },
            {
                el: this.element,
                types: ['touchend', 'mouseup'],
                handler: mouseUp
            },
            {
                el: this.element,
                types: ['mouseleave'],
                handler: mouseUp
            }
        ];
        events.some((eventItem) => {
            eventItem.types.some((type) => {
                if(util.isEventSupport(type)){
                    eventItem.el.addEventListener(type, eventItem.handler);
                    return true;
                }
            });
        });
    }

    protected bindCollapseEvent() {
        var circleEl:HTMLElement = this.contentEl.querySelector(this._selector(classNames.center));
        circleEl.addEventListener('click', (e) => {
            !circleEl.moved && this.toggleCollapse();
            e.stopPropagation();
        });
    }

    protected bindHoverEvent() {
        var currentMenuEl, subMenuRenderTimeout;
        var renderSubMenus = (menuTarget) => {
            if (currentMenuEl === menuTarget) {
                return;
            }
            subMenuRenderTimeout && cancelFrame(subMenuRenderTimeout);
            subMenuRenderTimeout = nextFrame(() => {
                currentMenuEl = menuTarget;
                this.renderSubMenus(menuTarget);
            });
        }


        ['mouseover', 'click'].forEach((evtType) => {
            this.element.addEventListener(evtType, (e) => {
                var target = <HTMLElement>e.target;
                var menuTarget = this._findMenuTarget(target);
                renderSubMenus(menuTarget);

                if (menuTarget) {
                    let menu = menuTarget.__menuData__.menu;
                    if (e.type === 'click') {
                        this.listeners.menuClick.forEach((handler) => {
                            handler.call(this,this.createEvent(e,menuTarget,'menuClick',menu));
                        })
                    } else {
                        this.listeners.menuHover.forEach((handler) => {
                            handler.call(this, this.createEvent(e,menuTarget,'menuHover',menu));
                        })
                    }
                }

                this.listeners[evtType].forEach((handler) => {
                    handler.call(this, this.createEvent(e,this.element,evtType));
                });

            });
        });

    }
    private createEvent(e,target:HTMLElement,type:String,data?:any):MenuEvent{
        return {
            type:type,
            target:target,
            data:data,
            native:e
        };
    }
    addEventListener(type:String, handler:Function) {
        var listeners:Function[] = this.listeners[type];
        if(!listeners){
            return;
        }
        var index = listeners.indexOf(handler);
        if (index === -1 && handler) {
            listeners.push(handler);
        }
    }

    removeEventListener(type:String, handler:Function) {
        var listeners:Function[] = this.listeners[type];
        if(!listeners){
            return;
        }
        var index = listeners.indexOf(handler);
        if (index >= 0) {
            listeners.splice(index, 1);
        }
    }

    private getMenuPathEls(target:HTMLElement) {
        var pathElements = [];
        while (target && target !== this.element) {
            if (target.__menuData__) {
                pathElements.unshift(target);
            }
            target = target._parent;
        }
        return pathElements;
    }

    private _className(className:String, prefix?:String) {
        if (!prefix) {
            return className;
        }
        return prefix + '-' + className;
    }

    private _selector(className:String, prefix?:String) {
        className = this._className(className, prefix);
        return '.' + className;
    }

    getAllMenuEls() {
        var selector = this._selector(classNames.menuPathGroup);
        var slice = Array.prototype.slice;
        return slice.call(this.element.querySelectorAll(selector));
    }

    private collapseAllSubMenus() {
        this.getAllMenuEls().forEach((el) => {
            this.toggleMenuElVisible(el,false);
        });
    }
    private toggleMenuElVisible(el:HTMLElement,visible?:boolean){
        util.toggleVisible(el,visible);
        el._child && util.toggleVisible(el._child, visible);
    }
    private unSelectAllMenus(){
        this.getAllMenuEls().forEach((el) => {
             util.toggleSelect(el, false);
        });
    }
    private selectMenuEl(target:HTMLElement){
        if (!target) {
            return;
        }
        this.unSelectAllMenus();
        var pathElements = this.getMenuPathEls(target);
        pathElements.forEach((el) => {
            util.toggleSelect(el, true);
        });

    }
    private renderSubMenus(target:HTMLElement) {


        this.collapseAllSubMenus();

        if (!target) {
            return;
        }

        var menuGroupEl:HTMLElement = target._child;
        if (!menuGroupEl) {
            let menuData = <MenuData>target.__menuData__;
            let currentMenu = menuData.menu;
            let menuList = currentMenu.menuList;
            let menus = menuList && menuList.items;
            if (menus && menus.length > 0) {
                this._initMenuListData(menuList);

                let totalAngle = menuList.__data__.totalAngle;

                var startAngle = menuData.offsetAngle - (totalAngle - currentMenu.angle) / 2;

                menuGroupEl = this.renderMenuList(currentMenu.menuList, startAngle, menuData.radius);
                target._child = menuGroupEl;
                menuGroupEl._parent = target;
                util.preAppend(this.contentEl, menuGroupEl);
            }

        }

        var pathElements = this.getMenuPathEls(target);
        pathElements.forEach((el) => {
            this.toggleMenuElVisible(el,true);
        });

    }
}
export { AnnularMenu };