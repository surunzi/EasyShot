/**
 * @namespace 屏幕裁剪
 * @author surunzi
 */

var screenshot = {
    /** 画布 */
    $canvas: null,
    /** 画布 */
    canvas: null,
    /** 画布内容 */
    ctx: null,
    /** 画布缩放比 */
    ratio: 0,
    /** 下载按钮 */
    $downloadBtn: null,
    /** 确定裁剪按钮 */
    $confirmBtn: null,
    /** 取消按钮 */
    $cancelBtn: null,
    /** 帮助按钮 */
    $helpBtn: null,
    /** Firefox粘贴框 */
    pasteFF: null,
    /** 下载链接 */
    downloadLink: null,
    /** 图像 */
    pastedImg: null,
    /** 文件读取 */
    reader: null,
    /** 绑定按钮 */
    bindBtn: function() {
        this.$downloadBtn.on('click', function() {
            if ($(this).hasClass('disabled')) {
                return;
            }
            if (screenshot.crop.isSelecting == true) {
                screenshot.crop.isSelecting = false;
                screenshot.drawImage();
                screenshot.$confirmBtn.addClass('hidden');
                screenshot.$cancelBtn.addClass('hidden');
            }
            screenshot.downloadImg();
        });
        this.$confirmBtn.on('click', function() {
            screenshot.crop.isSelecting = false;
            screenshot.$cancelBtn.addClass('hidden');
            $(this).addClass('hidden');
            screenshot.cropImg();
        });
        this.$cancelBtn.on('click', function() {
            screenshot.crop.isSelecting = false;
            screenshot.drawImage();
            screenshot.$confirmBtn.addClass('hidden');
            $(this).addClass('hidden');
        });
        this.$helpBtn.on('click', function() {
            var $help = $('#help');
            if ($help.hasClass('hidden')) {
                $('#help').removeClass('hidden');
                screenshot.$canvas.addClass('hidden');
                screenshot.$helpBtn.text('Canvas');
            } else {
                $('#help').addClass('hidden');
                screenshot.$canvas.removeClass('hidden');
                screenshot.$helpBtn.text('Help');
            }
        });
    },
    /** 绑定事件 */
    bindEvent: function() {
        // Chrome
        document.onpaste = function(event) {
            screenshot.pasteData(event);
        };
        $(document).on('mouseup', function() {
            var crop = screenshot.crop;
            crop.isMousedown = false;
            crop.isDraggingAll = false;
        });
        // Firefox
        if (!window.Clipboard) {
            var pasteFF = screenshot.pasteFF;
            pasteFF.focus();
            pasteFF.addEventListener('DOMSubtreeModified',function(){
                if(pasteFF.children.length == 1){
                    screenshot.loadImage(pasteFF.firstElementChild.src);
                    screenshot.$canvas.removeClass('hidden');
                    $('#help').addClass('hidden');
                    screenshot.$downloadBtn.removeClass('disabled');
                    screenshot.$helpBtn.text('Help');
                    pasteFF.innerHTML = '';
                }
            },false);
            setInterval(function() {
                screenshot.pasteFF.focus();
            }, 5000);
        }
    },
    /** 裁剪图像 */
    cropImg: function() {
        var crop = this.crop,
            x = crop.w < 0 ? crop.x + crop.w : crop.x,
            y = crop.h < 0 ? crop.y + crop.h : crop.y,
            w = Math.abs(crop.w),
            h = Math.abs(crop.h);
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.canvas.width = w;
        this.canvas.height = h;
        this.ratio = h / this.$canvas.css('height').replace('px', '');
        this.ctx.drawImage(this.pastedImg, x, y, w, h, 0, 0, w, h);
        var dataURL = this.canvas.toDataURL();
        this.loadImage(dataURL);
    },
    /** 下载图像 */
    downloadImg: function() {
        var dataURL = this.canvas.toDataURL('image/jpeg');
        dataURL = dataURL.replace("image/jpeg", "image/octet-stream");
        this.downloadLink.href = dataURL;
        this.downloadLink.click();
    },
    /**
     * 加载图像
     * @param {String} source 图像原始数据
     */
    loadImage: function(source) {
        this.pastedImg.src = source;
        this.pastedImg.onload = function() {
            screenshot.canvas.width =  this.width;
            screenshot.canvas.height = this.height;
            screenshot.ratio = this.height / screenshot.$canvas.css('height').replace('px', '');
            screenshot.drawImage();
        }
    },
    /** 绘制图像 */
    drawImage: function() {
        this.ctx.drawImage(this.pastedImg, 0, 0);
        if (this.crop.isSelecting) {
            this.crop.draw();
        }
    },
    /** 初始化 */
    init: function() {
        this.reader = new FileReader();
        this.reader.onload = function (event) {
            screenshot.loadImage(event.target.result);
        };
        this.canvas = document.getElementById('screen-shot');
        this.$canvas = $('#screen-shot');
        this.ctx = this.canvas.getContext('2d');
        this.pastedImg = new Image();
        this.$downloadBtn = $('#download-btn');
        this.$cancelBtn = $('#cancel-btn');
        this.$confirmBtn = $('#confirm-btn');
        this.$helpBtn = $('#help-btn');
        this.pasteFF = document.getElementById('paste-ff');
        this.downloadLink = document.getElementById('download-link');
        this.bindBtn();
        this.bindEvent();
        this.crop.init();
    },
    /** 将剪切板的内容粘贴到Canvas中 */
    pasteData: function(event) {
        var clipboardData = event.clipboardData || event.originalEvent.clipboardData,
            items = clipboardData.items, blob = null, i, length;
        if (items) {
            for (i = 0, length = items.length; i < length; i++) {
                if (items[i].type.indexOf('image') == 0) {
                    blob = items[i].getAsFile();
                }
            }
            if (blob != null) {
                this.$canvas.removeClass('hidden');
                $('#help').addClass('hidden');
                this.$downloadBtn.removeClass('disabled');
                this.$helpBtn.text('Help');
                this.reader.readAsDataURL(blob);
            }
        }
    }
};

/** 剪切 */
screenshot.crop = {
    /** 选择框左上x坐标 */
    x: 0,
    /** 选择框左上y坐标 */
    y: 0,
    /** 选择框宽度 */
    w: 0,
    /** 选择框高度 */
    h: 0,
    /** 鼠标相对于选择框x坐标 */
    pX: 0,
    /** 鼠标相对于选择框y坐标 */
    pY: 0,
    /** 是否拖曳全部 */
    isDraggingAll: false,
    /** 控制点的位置 */
    cPostion: [[], [], [], []],
    /** 控制点的大小 */
    csize: 6,
    /** 控制点激活时的大小 */
    csizeOnHover: 10,
    /** 鼠标悬停情况 */
    hoverStatus: [],
    /** 控制点的大小 */
    iCsize: [],
    /** 鼠标拖移状态 */
    dragStatus: [],
    /** 鼠标是否按下 */
    isMousedown: false,
    /** 是否正在选择 */
    isSelecting: false,
    /** 画布内容 */
    ctx: null,
    /** 画布 */
    $canvas: null,
    /** 绑定事件 */
    bindEvent: function() {
        this.$canvas.on('mousemove', function(event) {
            console.log(event);
            var ratio = screenshot.ratio,
                crop = screenshot.crop,
                x = crop.x,
                y = crop.y,
                w = crop.w,
                h = crop.h,
                csize = crop.csize,
                csizeOnHover = crop.csizeOnHover;
            if (event.offsetX == undefined) {
                event.offsetX = event.pageX - crop.$canvas.offset().left;
                event.offsetY = event.pageY - crop.$canvas.offset().top;
            }
            var mouseX = event.offsetX * ratio,
                mouseY = event.offsetY * ratio;
            if (crop.isSelecting) {
                if (crop.isMousedown) {
                    if (crop.isDraggingAll) {
                        crop.x = mouseX - crop.pX;
                        crop.y = mouseY - crop.pY;
                        x = crop.x;
                        y = crop.y;
                        var leftTopX = w > 0 ? x : x + w,
                            leftTopY = h > 0 ? y : y + h,
                            rightBottomX = w > 0 ? x + w : x,
                            rightBottomY = h > 0 ? y + h : y,
                            width = screenshot.canvas.width,
                            height = screenshot.canvas.height;
                        if (leftTopX < 0) {
                            if (w > 0) {
                                crop.x = 0;
                            } else {
                                crop.x = -w;
                            }
                        }
                        if (leftTopY < 0) {
                            if (h > 0) {
                                crop.y = 0;
                            } else {
                                crop.y = -h;
                            }
                        }
                        if (rightBottomX > width) {
                            if (w > 0) {
                                crop.x = width - w;
                            } else {
                                crop.x = width;
                            }
                        }
                        if (rightBottomY > height) {
                            if (h > 0) {
                                crop.y = height - h;
                            } else {
                                crop.y = height;
                            }
                        }
                    } else if (crop.hoverStatus[0]) {
                        crop.x = mouseX;
                        crop.y = mouseY;
                        crop.w = crop.cPostion[1][0] - crop.x;
                        crop.h = crop.cPostion[3][1] - crop.y;
                    } else if (crop.hoverStatus[1]) {
                        crop.w = mouseX - crop.cPostion[3][0];
                        crop.h = crop.cPostion[3][1] - mouseY;
                        crop.x = crop.cPostion[3][0];
                        crop.y = mouseY;
                    } else if (crop.hoverStatus[2]) {
                        crop.x = crop.cPostion[0][0];
                        crop.y = crop.cPostion[0][1];
                        crop.w = mouseX - crop.x;
                        crop.h = mouseY - crop.y;
                    } else if (crop.hoverStatus[3]) {
                        crop.w = crop.cPostion[1][0] - mouseX;
                        crop.h = mouseY - crop.cPostion[1][1];
                        crop.y = crop.cPostion[1][1];
                        crop.x = mouseX;
                    }
                } else {
                    for (var i = 0; i < 4; i++) {
                        crop.hoverStatus[i] = false;
                        crop.iCsize[i] = csize;
                    }
                    if (mouseX > x - csizeOnHover && mouseX < x + csizeOnHover &&
                        mouseY > y - csizeOnHover && mouseY < y + csizeOnHover) {
                        crop.hoverStatus[0] = true;
                        crop.iCsize[0] = csizeOnHover;
                    } else if (mouseX > x + w - csizeOnHover && mouseX < x + w + csizeOnHover &&
                        mouseY > y - csizeOnHover && mouseY < y  + csizeOnHover) {
                        crop.hoverStatus[1] = true;
                        crop.iCsize[1] = csizeOnHover;
                    } else if (mouseX > x + w - csizeOnHover && mouseX < x + w + csizeOnHover &&
                        mouseY > y + h - csizeOnHover && mouseY < y + h + csizeOnHover) {
                        crop.hoverStatus[2] = true;
                        crop.iCsize[2] = csizeOnHover;
                    } else if (mouseX > x - csizeOnHover && mouseX < x + csizeOnHover &&
                        mouseY > y + h - csizeOnHover && mouseY < y + h + csizeOnHover) {
                        crop.hoverStatus[3] = true;
                        crop.iCsize[3] = csizeOnHover;
                    }
                }
                screenshot.drawImage();
            }
        }).on('mousedown', function(event) {
            var ratio = screenshot.ratio,
                crop = screenshot.crop,
                csize = crop.csize,
                csizeOnHover = crop.csizeOnHover;
            if (event.offsetX == undefined) {
                event.offsetX = event.pageX - crop.$canvas.offset().left;
                event.offsetY = event.pageY - crop.$canvas.offset().top;
            }
            var mouseX = event.offsetX * ratio,
                mouseY = event.offsetY * ratio;
            crop.isMousedown = true;
            if (crop.isSelecting == false) {
                screenshot.$confirmBtn.removeClass('hidden');
                screenshot.$cancelBtn.removeClass('hidden');
                crop.isSelecting = true;
                crop.x = mouseX;
                crop.y = mouseY;
                crop.w = 0;
                crop.h = 0;
                x = crop.x;
                y = crop.y;
                for (var i = 0; i < 4; i++) {
                    crop.cPostion[i][0] = x;
                    crop.cPostion[i][1] = y;
                }
                crop.hoverStatus[0] = true;
                crop.iCsize[0] = csizeOnHover;
            } else {
                var x = crop.x,
                    y = crop.y,
                    w = crop.w,
                    h = crop.h;
                crop.pX = mouseX - x;
                crop.pY = mouseY - y;
                crop.cPostion[0][0] = x; crop.cPostion[0][1] = y;
                crop.cPostion[1][0] = x + w; crop.cPostion[1][1] = y;
                crop.cPostion[2][0] = x + w; crop.cPostion[2][1] = y + h;
                crop.cPostion[3][0] = x; crop.cPostion[3][1] = y + h;
                x = crop.w < 0 ? crop.x + crop.w : crop.x;
                y = crop.h < 0 ? crop.y + crop.h : crop.y;
                w = Math.abs(crop.w);
                h = Math.abs(crop.h);
                if (mouseX > x + csizeOnHover && mouseX < x + w - csizeOnHover &&
                    mouseY > y + csizeOnHover && mouseY < y + h - csizeOnHover) {
                    crop.isDraggingAll = true;
                }
            }
            screenshot.drawImage();
        });
    },
    /** 绘制选择框 */
    draw: function() {
        var width = screenshot.canvas.width,
            height = screenshot.canvas.height,
            ctx = this.ctx,
            x = this.w < 0 ? this.x + this.w : this.x,
            y = this.h < 0 ? this.y + this.h : this.y,
            w = Math.abs(this.w),
            h = Math.abs(this.h);
        // 绘制黑色遮挡物
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, width, height);
        // 绘制选择框
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, w, h);
        // 绘制部分图像
        if (w != 0 && h != 0) {
            ctx.drawImage(screenshot.pastedImg, x, y, w, h, x, y, w, h);
        }
        // 绘制控制点
        ctx.fillStyle = 'rgba(39, 174, 96, 0.5)';
        ctx.fillRect(this.x - this.iCsize[0], this.y - this.iCsize[0], this.iCsize[0] * 2, this.iCsize[0] * 2);
        ctx.fillRect(this.x + this.w - this.iCsize[1], this.y - this.iCsize[1], this.iCsize[1] * 2, this.iCsize[1] * 2);
        ctx.fillRect(this.x + this.w - this.iCsize[2], this.y + this.h - this.iCsize[2], this.iCsize[2] * 2, this.iCsize[2] * 2);
        ctx.fillRect(this.x - this.iCsize[3], this.y + this.h - this.iCsize[3], this.iCsize[3] * 2, this.iCsize[3] * 2);
    },
    /** 初始化 */
    init: function() {
        this.hoverStatus = [false, false, false, false];
        this.iCsize = [this.csize, this.csize, this.csize, this.csize];
        this.dragStatus = [false, false, false, false];
        this.ctx = screenshot.ctx;
        this.$canvas = screenshot.$canvas;
        this.bindEvent();
    }
};

screenshot.init();
