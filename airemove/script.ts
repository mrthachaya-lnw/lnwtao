type Point = { x: number; y: number };

type AppState = {
    img: HTMLImageElement | null;
    imgWidth: number;
    imgHeight: number;
    drawing: boolean;
    brush: number;
    radius: number;
    lastPoint: Point | null;
};

type CvLike = {
    Mat: new () => any;
    CV_8UC4: number;
    CV_8UC1: number;
    COLOR_RGBA2RGB: number;
    COLOR_RGBA2GRAY: number;
    INPAINT_TELEA: number;
    matFromImageData: (data: ImageData) => any;
    imshow: (canvas: HTMLCanvasElement | string, mat: any) => void;
    cvtColor: (src: any, dst: any, code: number) => void;
    inpaint: (src: any, inpaintMask: any, dst: any, inpaintRadius: number, flags: number) => void;
    threshold: (src: any, dst: any, thresh: number, maxval: number, type: number) => void;
    THRESH_BINARY: number;
};

function qs<T extends Element>(selector: string): T {
    const el = document.querySelector(selector);
    if (!el) throw new Error(`Missing element: ${selector}`);
    return el as T;
}

function clamp(n: number, min: number, max: number) {
    return Math.max(min, Math.min(max, n));
}

function isCvReady(): boolean {
    const cv = (window as any).cv as CvLike | undefined;
    return !!(cv && (cv as any).Mat);
}

function waitForCvReady(timeoutMs = 20000): Promise<void> {
    if (isCvReady()) return Promise.resolve();

    const start = Date.now();
    return new Promise((resolve, reject) => {
        const tick = () => {
            if (isCvReady()) {
                resolve();
                return;
            }
            if (Date.now() - start > timeoutMs) {
                reject(new Error('OpenCV.js load timeout'));
                return;
            }
            window.setTimeout(tick, 50);
        };
        tick();
    });
}

function getCanvasPoint(canvas: HTMLCanvasElement, e: PointerEvent): Point {
    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;
    return { x, y };
}

function drawBrush(ctx: CanvasRenderingContext2D, p: Point, brush: number) {
    ctx.beginPath();
    ctx.arc(p.x, p.y, brush / 2, 0, Math.PI * 2);
    ctx.fill();
}

function drawLine(ctx: CanvasRenderingContext2D, a: Point, b: Point, brush: number) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = Math.max(1, brush / 3);
    const steps = Math.ceil(dist / step);

    for (let i = 0; i <= steps; i++) {
        const t = steps === 0 ? 0 : i / steps;
        drawBrush(ctx, { x: a.x + dx * t, y: a.y + dy * t }, brush);
    }
}

function clearMask(maskCtx: CanvasRenderingContext2D, w: number, h: number) {
    maskCtx.clearRect(0, 0, w, h);
}

function renderImage(imgCanvas: HTMLCanvasElement, imgCtx: CanvasRenderingContext2D, maskCanvas: HTMLCanvasElement, maskCtx: CanvasRenderingContext2D, img: HTMLImageElement) {
    const maxW = 960;
    const maxH = 640;

    const scale = Math.min(maxW / img.naturalWidth, maxH / img.naturalHeight, 1);
    const w = Math.max(1, Math.round(img.naturalWidth * scale));
    const h = Math.max(1, Math.round(img.naturalHeight * scale));

    imgCanvas.width = w;
    imgCanvas.height = h;
    maskCanvas.width = w;
    maskCanvas.height = h;

    imgCtx.clearRect(0, 0, w, h);
    imgCtx.drawImage(img, 0, 0, w, h);

    clearMask(maskCtx, w, h);

    return { w, h };
}

function inpaintToCanvas(cv: CvLike, imgCanvas: HTMLCanvasElement, maskCanvas: HTMLCanvasElement, outCanvas: HTMLCanvasElement, radius: number) {
    const imgCtx = imgCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!imgCtx || !maskCtx) throw new Error('Missing canvas context');

    const imgData = imgCtx.getImageData(0, 0, imgCanvas.width, imgCanvas.height);
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    const srcRgba = cv.matFromImageData(imgData);
    const srcRgb = new cv.Mat();
    cv.cvtColor(srcRgba, srcRgb, cv.COLOR_RGBA2RGB);

    const maskRgba = cv.matFromImageData(maskData);
    const maskGray = new cv.Mat();
    cv.cvtColor(maskRgba, maskGray, cv.COLOR_RGBA2GRAY);

    const maskBin = new cv.Mat();
    cv.threshold(maskGray, maskBin, 1, 255, cv.THRESH_BINARY);

    const dst = new cv.Mat();
    const safeRadius = clamp(radius, 1, 30);
    cv.inpaint(srcRgb, maskBin, dst, safeRadius, cv.INPAINT_TELEA);

    cv.imshow(outCanvas, dst);

    srcRgba.delete();
    srcRgb.delete();
    maskRgba.delete();
    maskGray.delete();
    maskBin.delete();
    dst.delete();
}

(() => {
    const fileInput = qs<HTMLInputElement>('#fileInput');
    const brushSize = qs<HTMLInputElement>('#brushSize');
    const inpaintRadius = qs<HTMLInputElement>('#inpaintRadius');

    const btnRemove = qs<HTMLButtonElement>('#btnRemove');
    const btnClear = qs<HTMLButtonElement>('#btnClear');
    const btnDownload = qs<HTMLButtonElement>('#btnDownload');

    const status = qs<HTMLDivElement>('#status');
    const meta = qs<HTMLDivElement>('#meta');
    const emptyState = qs<HTMLDivElement>('#emptyState');
    const stage = qs<HTMLDivElement>('#stage');

    const imgCanvas = qs<HTMLCanvasElement>('#imgCanvas');
    const maskCanvas = qs<HTMLCanvasElement>('#maskCanvas');

    const outCanvas = document.createElement('canvas');

    const imgCtx = imgCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    if (!imgCtx || !maskCtx) throw new Error('Canvas unsupported');

    const state: AppState = {
        img: null,
        imgWidth: imgCanvas.width,
        imgHeight: imgCanvas.height,
        drawing: false,
        brush: Number(brushSize.value),
        radius: Number(inpaintRadius.value),
        lastPoint: null
    };

    maskCtx.fillStyle = 'rgba(0,0,0,1)';

    const syncControls = () => {
        state.brush = Number(brushSize.value);
        state.radius = Number(inpaintRadius.value);

        const canWork = !!state.img && imgCanvas.width > 0 && imgCanvas.height > 0;
        btnRemove.disabled = !canWork;
        btnClear.disabled = !canWork;

        const canDownload = canWork && outCanvas.width > 0 && outCanvas.height > 0;
        btnDownload.disabled = !canDownload;
    };

    const setStatus = (text: string) => {
        status.textContent = text;
    };

    const setMeta = (text: string) => {
        meta.textContent = text;
    };

    const setEmpty = (isEmpty: boolean) => {
        emptyState.style.display = isEmpty ? 'grid' : 'none';
    };

    const loadImageFromFile = async (file: File) => {
        const url = URL.createObjectURL(file);
        const img = new Image();
        img.decoding = 'async';
        img.src = url;

        await new Promise<void>((resolve, reject) => {
            img.onload = () => resolve();
            img.onerror = () => reject(new Error('Image load failed'));
        });

        state.img = img;

        const dims = renderImage(imgCanvas, imgCtx, maskCanvas, maskCtx, img);
        state.imgWidth = dims.w;
        state.imgHeight = dims.h;

        outCanvas.width = dims.w;
        outCanvas.height = dims.h;
        const outCtx = outCanvas.getContext('2d');
        if (outCtx) {
            outCtx.clearRect(0, 0, outCanvas.width, outCanvas.height);
        }

        setMeta(`${file.name} • ${img.naturalWidth}×${img.naturalHeight}`);
        setEmpty(false);
        setStatus('พร้อมใช้งาน: ระบายทับลายน้ำ แล้วกด “ลบลายน้ำ”');
        syncControls();

        URL.revokeObjectURL(url);
    };

    const ensureCv = async () => {
        try {
            await waitForCvReady();
            setStatus('พร้อมใช้งาน: อัปโหลดรูปเพื่อเริ่ม');
        } catch {
            setStatus('โหลด OpenCV.js ไม่สำเร็จ ลองรีเฟรชหน้าเว็บ');
        }
    };

    const pointerDown = (e: PointerEvent) => {
        if (!state.img) return;
        state.drawing = true;
        state.lastPoint = getCanvasPoint(maskCanvas, e);
        drawBrush(maskCtx, state.lastPoint, state.brush);
        maskCanvas.setPointerCapture(e.pointerId);
    };

    const pointerMove = (e: PointerEvent) => {
        if (!state.drawing || !state.img) return;
        const p = getCanvasPoint(maskCanvas, e);
        const last = state.lastPoint;

        if (e.shiftKey && last) {
            drawLine(maskCtx, last, p, state.brush);
        } else {
            drawBrush(maskCtx, p, state.brush);
        }

        state.lastPoint = p;
    };

    const pointerUp = () => {
        state.drawing = false;
        state.lastPoint = null;
    };

    maskCanvas.addEventListener('pointerdown', pointerDown);
    maskCanvas.addEventListener('pointermove', pointerMove);
    maskCanvas.addEventListener('pointerup', pointerUp);
    maskCanvas.addEventListener('pointercancel', pointerUp);

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            state.drawing = false;
            state.lastPoint = null;
        }
    });

    brushSize.addEventListener('input', syncControls);
    inpaintRadius.addEventListener('input', syncControls);

    btnClear.addEventListener('click', () => {
        if (!state.img) return;
        clearMask(maskCtx, maskCanvas.width, maskCanvas.height);
        setStatus('ล้างมาสก์แล้ว');
    });

    btnRemove.addEventListener('click', async () => {
        if (!state.img) return;
        const cv = (window as any).cv as CvLike | undefined;
        if (!cv || !isCvReady()) {
            setStatus('OpenCV.js ยังไม่พร้อม');
            return;
        }

        btnRemove.disabled = true;
        setStatus('กำลังลบลายน้ำ…');

        await new Promise<void>((resolve) => window.setTimeout(resolve, 20));

        try {
            inpaintToCanvas(cv, imgCanvas, maskCanvas, outCanvas, state.radius);
            imgCtx.clearRect(0, 0, imgCanvas.width, imgCanvas.height);
            imgCtx.drawImage(outCanvas, 0, 0);
            setStatus('เสร็จแล้ว: ถ้าจำเป็น ระบายเพิ่มแล้วกดลบซ้ำได้');
        } catch {
            setStatus('ประมวลผลไม่สำเร็จ ลองลดขนาดรูปหรือรีเฟรชหน้าเว็บ');
        }

        btnRemove.disabled = false;
        syncControls();
    });

    btnDownload.addEventListener('click', () => {
        if (!state.img) return;

        const url = imgCanvas.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = url;
        a.download = 'airemove.png';
        document.body.appendChild(a);
        a.click();
        a.remove();
    });

    fileInput.addEventListener('change', async () => {
        const f = fileInput.files?.[0];
        if (!f) return;
        await loadImageFromFile(f);
    });

    const onDrop = async (e: DragEvent) => {
        e.preventDefault();
        const f = e.dataTransfer?.files?.[0];
        if (!f) return;
        await loadImageFromFile(f);
    };

    const onDragOver = (e: DragEvent) => {
        e.preventDefault();
    };

    stage.addEventListener('drop', onDrop);
    stage.addEventListener('dragover', onDragOver);

    setEmpty(true);
    syncControls();
    ensureCv();
})();
