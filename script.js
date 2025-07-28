document.addEventListener('DOMContentLoaded', () => {
    // ... (all your existing const and let declarations) ...

    const canvas = document.getElementById('imageCanvas');
    const ctx = canvas.getContext('2d');

    const baseImageInput = document.getElementById('baseImageInput');
    const addMoneyBtn = document.getElementById('addMoney');
    const addSyringeBtn = document.getElementById('addSyringe');
    const addCarBtn = document.getElementById('addCar');
    const addAnimeGirlBtn = document.getElementById('addAnimeGirl');
    const addSydneySweeneyBtn = document.getElementById('addSydneySweeney');
    const bwToggle = document.getElementById('bwToggle');
    const downloadBtn = document.getElementById('downloadBtn');
    const canvasPlaceholder = document.getElementById('canvasPlaceholder');

    let baseImage = null;
    let overlays = [];

    let isDragging = false;
    let isResizing = false;
    let isRotating = false;
    let selectedOverlayIndex = -1;
    let dragOffsetX = 0;
    let dragOffsetY = 0;

    let rotationStartAngle = 0;
    let objectStartRotation = 0;

    const HANDLE_SIZE = 10;
    const ROTATE_HANDLE_OFFSET = 20;

    // --- Helper Functions (No changes needed here for this fix) ---

    function drawAll() {
        if (!baseImage) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.width = 0;
            canvas.height = 0;
            canvasPlaceholder.style.display = 'flex';
            return;
        }

        canvasPlaceholder.style.display = 'none';
        canvas.width = baseImage.naturalWidth;
        canvas.height = baseImage.naturalHeight;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(baseImage, 0, 0);

        overlays.forEach((overlay, index) => {
            if (overlay.img.complete && overlay.img.naturalWidth > 0) {
                ctx.save();
                const centerX = overlay.x + overlay.width / 2;
                const centerY = overlay.y + overlay.height / 2;
                ctx.translate(centerX, centerY);
                ctx.rotate(overlay.rotation);
                ctx.drawImage(overlay.img, -overlay.width / 2, -overlay.height / 2, overlay.width, overlay.height);
                ctx.restore();

                // ONLY draw selection border and handles IF an overlay is selected
                // AND we are NOT in the process of downloading (which will be temporarily de-selected)
                if (index === selectedOverlayIndex && !isDragging && !isResizing && !isRotating) {
                    drawSelectionBorderAndHandles(overlay);
                }
            }
        });

        if (bwToggle.checked) {
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
                data[i] = avg;
                data[i + 1] = avg;
                data[i + 2] = avg;
            }
            ctx.putImageData(imageData, 0, 0);
        }
    }

    function drawSelectionBorderAndHandles(overlay) {
        ctx.save();
        const centerX = overlay.x + overlay.width / 2;
        const centerY = overlay.y + overlay.height / 2;
        ctx.translate(centerX, centerY);
        ctx.rotate(overlay.rotation);

        // In drawSelectionBorderAndHandles(overlay) function:

// For resize handle (blue becomes primary green)
        ctx.strokeStyle = '#3498db'; // Change this to: var(--primary-green) if possible, but JS needs hardcoded
        ctx.lineWidth = 2;
        ctx.strokeRect(-overlay.width / 2, -overlay.height / 2, overlay.width, overlay.height);

        const resizeHandleX = overlay.width / 2 - HANDLE_SIZE / 2;
        const resizeHandleY = overlay.height / 2 - HANDLE_SIZE / 2;
        ctx.fillStyle = '#2ecc71'; // Changed from #3498db to primary green
        ctx.fillRect(resizeHandleX, resizeHandleY, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeStyle = '#27ae60'; // Changed from #2980b9 to darker green
        ctx.strokeRect(resizeHandleX, resizeHandleY, HANDLE_SIZE, HANDLE_SIZE);

// For rotate handle (red stays red, but maybe a specific shade)
        const rotateHandleX = 0 - HANDLE_SIZE / 2;
        const rotateHandleY = -overlay.height / 2 - ROTATE_HANDLE_OFFSET - HANDLE_SIZE / 2;
        ctx.fillStyle = '#e74c3c'; // Keep red, matches var(--red-alert)
        ctx.fillRect(rotateHandleX, rotateHandleY, HANDLE_SIZE, HANDLE_SIZE);
        ctx.strokeStyle = '#c0392b'; // Matches var(--red-alert-dark)
        ctx.strokeRect(rotateHandleX, rotateHandleY, HANDLE_SIZE, HANDLE_SIZE);
        ctx.restore();
    }

    function addOverlay(src, initialWidth = 100, initialHeight = 100) {
        if (!baseImage) {
            alert("Please upload a base image first!");
            return;
        }

        const img = new Image();
        img.src = src;
        img.onload = () => {
            let scaledWidth = initialWidth;
            let scaledHeight = initialHeight;
            const aspectRatio = img.naturalWidth / img.naturalHeight;

            const minCanvasDim = Math.min(canvas.width, canvas.height);
            const targetSizeFactor = 0.2;

            if (img.naturalWidth > minCanvasDim * targetSizeFactor || img.naturalHeight > minCanvasDim * targetSizeFactor) {
                scaledWidth = minCanvasDim * targetSizeFactor;
                scaledHeight = scaledWidth / aspectRatio;
                if (scaledHeight > minCanvasDim * targetSizeFactor) {
                    scaledHeight = minCanvasDim * targetSizeFactor;
                    scaledWidth = scaledHeight * aspectRatio;
                }
            } else {
                scaledWidth = img.naturalWidth;
                scaledHeight = img.naturalHeight;
            }

            overlays.push({
                img: img,
                x: (canvas.width / 2) - (scaledWidth / 2),
                y: (canvas.height / 2) - (scaledHeight / 2),
                width: scaledWidth,
                height: scaledHeight,
                aspect: aspectRatio,
                rotation: 0
            });

            selectedOverlayIndex = overlays.length - 1;
            drawAll();
        };
        img.onerror = () => {
            console.error('Failed to load image:', src);
            alert(`Could not load image: ${src}. Make sure it exists in the 'assets/' folder.`);
        };
    }

    // --- Event Listeners ---

    baseImageInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                baseImage = new Image();
                baseImage.onload = () => {
                    overlays = [];
                    selectedOverlayIndex = -1;
                    drawAll();
                };
                baseImage.src = event.target.result;
            };
            reader.readAsDataURL(file);
        }
    });

    addMoneyBtn.addEventListener('click', () => addOverlay('assets/money.png', 100, 100));
    addSyringeBtn.addEventListener('click', () => addOverlay('assets/syringe.png', 80, 80));
    addCarBtn.addEventListener('click', () => addOverlay('assets/car.png', 150, 100));
    addAnimeGirlBtn.addEventListener('click', () => addOverlay('assets/anime_girl.png', 120, 180));
    addSydneySweeneyBtn.addEventListener('click', () => addOverlay('assets/sydney_sweeney.png', 100, 150));


    bwToggle.addEventListener('change', drawAll);

    downloadBtn.addEventListener('click', () => {
        if (!baseImage) {
            alert("Upload an image first!");
            return;
        }

        // Store the current selected state
        const previouslySelectedOverlayIndex = selectedOverlayIndex;
        
        // Temporarily deselect the overlay so handles/borders aren't drawn
        selectedOverlayIndex = -1;
        drawAll(); // Redraw the canvas without the selection indicators

        // Now, get the data URL of the clean canvas
        const dataURL = canvas.toDataURL('image/png'); // Using 'image/png' for transparency support

        // Create a temporary link element to trigger the download
        const link = document.createElement('a');
        link.download = 'my-custom-image.png'; // Suggested filename
        link.href = dataURL;
        document.body.appendChild(link); // Append to body (required for Firefox)
        link.click(); // Programmatically click the link
        document.body.removeChild(link); // Clean up the link element

        // After download, restore the selection if there was one
        selectedOverlayIndex = previouslySelectedOverlayIndex;
        if (selectedOverlayIndex !== -1) {
            drawAll(); // Redraw to show the selection indicators again
        }
    });

    // --- Canvas Interaction Logic (Mouse & Touch) (No changes needed here for this fix) ---
    function getMousePos(canvas, clientX, clientY) {
        const rect = canvas.getBoundingClientRect();
        return {
            x: (clientX - rect.left) * (canvas.width / rect.width),
            y: (clientY - rect.top) * (canvas.height / rect.height)
        };
    }

    function getTransformedPoint(x, y, centerX, centerY, rotation) {
        const dx = x - centerX;
        const dy = y - centerY;

        const rotatedX = dx * Math.cos(-rotation) - dy * Math.sin(-rotation);
        const rotatedY = dx * Math.sin(-rotation) + dy * Math.cos(-rotation);

        return { x: rotatedX + centerX, y: rotatedY + centerY };
    }

    function isPointInRotatedOverlay(pointX, pointY, overlay) {
        const centerX = overlay.x + overlay.width / 2;
        const centerY = overlay.y + overlay.height / 2;

        const transformedPoint = getTransformedPoint(pointX, pointY, centerX, centerY, overlay.rotation);

        return transformedPoint.x >= overlay.x && transformedPoint.x <= overlay.x + overlay.width &&
               transformedPoint.y >= overlay.y && transformedPoint.y <= overlay.y + overlay.height;
    }

    function isPointInResizeHandle(pointX, pointY, overlay) {
        const centerX = overlay.x + overlay.width / 2;
        const centerY = overlay.y + overlay.height / 2;

        const transformedPoint = getTransformedPoint(pointX, pointY, centerX, centerY, overlay.rotation);

        const handleXLocal = overlay.x + overlay.width - HANDLE_SIZE / 2;
        const handleYLocal = overlay.y + overlay.height - HANDLE_SIZE / 2;

        return transformedPoint.x >= handleXLocal && transformedPoint.x <= handleXLocal + HANDLE_SIZE &&
               transformedPoint.y >= handleYLocal && transformedPoint.y <= handleYLocal + HANDLE_SIZE;
    }

    function isPointInRotateHandle(pointX, pointY, overlay) {
        const centerX = overlay.x + overlay.width / 2;
        const centerY = overlay.y + overlay.height / 2;

        const transformedPoint = getTransformedPoint(pointX, pointY, centerX, centerY, overlay.rotation);

        const rotateHandleXLocal = overlay.x + overlay.width / 2 - HANDLE_SIZE / 2;
        const rotateHandleYLocal = overlay.y - ROTATE_HANDLE_OFFSET - HANDLE_SIZE / 2;

        return transformedPoint.x >= rotateHandleXLocal && transformedPoint.x <= rotateHandleXLocal + HANDLE_SIZE &&
               transformedPoint.y >= rotateHandleYLocal && transformedPoint.y <= rotateHandleYLocal + HANDLE_SIZE;
    }


    canvas.addEventListener('mousedown', (e) => {
        e.preventDefault();
        const mousePos = getMousePos(canvas, e.clientX, e.clientY);
        const mouseX = mousePos.x;
        const mouseY = mousePos.y;

        isDragging = false;
        isResizing = false;
        isRotating = false;
        selectedOverlayIndex = -1;

        for (let i = overlays.length - 1; i >= 0; i--) {
            const overlay = overlays[i];
            
            if (isPointInRotateHandle(mouseX, mouseY, overlay)) {
                selectedOverlayIndex = i;
                isRotating = true;
                const centerX = overlay.x + overlay.width / 2;
                const centerY = overlay.y + overlay.height / 2;
                rotationStartAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
                objectStartRotation = overlay.rotation;
                canvas.style.cursor = 'grab';
                
                const [movedOverlay] = overlays.splice(i, 1);
                overlays.push(movedOverlay);
                selectedOverlayIndex = overlays.length - 1;
                drawAll();
                return;
            } else if (isPointInResizeHandle(mouseX, mouseY, overlay)) {
                selectedOverlayIndex = i;
                isResizing = true;
                dragOffsetX = mouseX - overlay.width;
                dragOffsetY = mouseY - overlay.height;
                canvas.style.cursor = 'nwse-resize';
                
                const [movedOverlay] = overlays.splice(i, 1);
                overlays.push(movedOverlay);
                selectedOverlayIndex = overlays.length - 1;
                drawAll();
                return;
            } else if (isPointInRotatedOverlay(mouseX, mouseY, overlay)) {
                selectedOverlayIndex = i;
                isDragging = true;
                dragOffsetX = mouseX - overlay.x;
                dragOffsetY = mouseY - overlay.y;
                canvas.style.cursor = 'grabbing';
                
                const [movedOverlay] = overlays.splice(i, 1);
                overlays.push(movedOverlay);
                selectedOverlayIndex = overlays.length - 1;
                drawAll();
                return;
            }
        }

        drawAll();
    });

    canvas.addEventListener('mousemove', (e) => {
        e.preventDefault();
        const mousePos = getMousePos(canvas, e.clientX, e.clientY);
        const mouseX = mousePos.x;
        const mouseY = mousePos.y;

        if (isRotating) {
            const overlay = overlays[selectedOverlayIndex];
            const centerX = overlay.x + overlay.width / 2;
            const centerY = overlay.y + overlay.height / 2;

            const currentAngle = Math.atan2(mouseY - centerY, mouseX - centerX);
            const angleDelta = currentAngle - rotationStartAngle;
            overlay.rotation = objectStartRotation + angleDelta;
            drawAll();
            return;
        }

        if (isResizing) {
            const overlay = overlays[selectedOverlayIndex];
            const newWidth = mouseX - overlay.x;
            const newHeight = newWidth / overlay.aspect;

            const minSize = 20;
            if (newWidth > minSize && newHeight > minSize) {
                overlay.width = newWidth;
                overlay.height = newHeight;
            }
            drawAll();
            return;
        }

        if (isDragging) {
            const overlay = overlays[selectedOverlayIndex];
            overlay.x = mouseX - dragOffsetX;
            overlay.y = mouseY - dragOffsetY;
            drawAll();
            return;
        }

        let cursorChanged = false;
        if (selectedOverlayIndex !== -1) {
            const selected = overlays[selectedOverlayIndex];
            if (isPointInRotateHandle(mouseX, mouseY, selected)) {
                canvas.style.cursor = 'grab';
                cursorChanged = true;
            } else if (isPointInResizeHandle(mouseX, mouseY, selected)) {
                canvas.style.cursor = 'nwse-resize';
                cursorChanged = true;
            } else if (isPointInRotatedOverlay(mouseX, mouseY, selected)) {
                canvas.style.cursor = 'grab';
                cursorChanged = true;
            }
        }
        
        if (!cursorChanged) {
            canvas.style.cursor = 'default';
        }
    });

    canvas.addEventListener('mouseup', () => {
        isDragging = false;
        isResizing = false;
        isRotating = false;
        canvas.style.cursor = 'default';
        drawAll();
    });

    canvas.addEventListener('mouseleave', () => {
        isDragging = false;
        isResizing = false;
        isRotating = false;
        canvas.style.cursor = 'default';
        drawAll();
    });

    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const touchPos = getMousePos(canvas, touch.clientX, touch.clientY);
        const touchX = touchPos.x;
        const touchY = touchPos.y;

        isDragging = false;
        isResizing = false;
        isRotating = false;
        selectedOverlayIndex = -1;

        for (let i = overlays.length - 1; i >= 0; i--) {
            const overlay = overlays[i];
            if (isPointInRotateHandle(touchX, touchY, overlay)) {
                selectedOverlayIndex = i;
                isRotating = true;
                const centerX = overlay.x + overlay.width / 2;
                const centerY = overlay.y + overlay.height / 2;
                rotationStartAngle = Math.atan2(touchY - centerY, touchX - centerX);
                objectStartRotation = overlay.rotation;
                
                const [movedOverlay] = overlays.splice(i, 1);
                overlays.push(movedOverlay);
                selectedOverlayIndex = overlays.length - 1;
                drawAll();
                return;
            } else if (isPointInResizeHandle(touchX, touchY, overlay)) {
                selectedOverlayIndex = i;
                isResizing = true;
                dragOffsetX = touchX - overlay.width;
                dragOffsetY = touchY - overlay.height;
                
                const [movedOverlay] = overlays.splice(i, 1);
                overlays.push(movedOverlay);
                selectedOverlayIndex = overlays.length - 1;
                drawAll();
                return;
            } else if (isPointInRotatedOverlay(touchX, touchY, overlay)) {
                selectedOverlayIndex = i;
                isDragging = true;
                dragOffsetX = touchX - overlay.x;
                dragOffsetY = touchY - overlay.y;
                
                const [movedOverlay] = overlays.splice(i, 1);
                overlays.push(movedOverlay);
                selectedOverlayIndex = overlays.length - 1;
                drawAll();
                return;
            }
        }
        drawAll();
    });

    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        const touch = e.touches[0];
        const touchPos = getMousePos(canvas, touch.clientX, touch.clientY);
        const touchX = touchPos.x;
        const touchY = touchPos.y;

        if (isRotating) {
            const overlay = overlays[selectedOverlayIndex];
            const centerX = overlay.x + overlay.width / 2;
            const centerY = overlay.y + overlay.height / 2;

            const currentAngle = Math.atan2(touchY - centerY, touchX - centerX);
            const angleDelta = currentAngle - rotationStartAngle;
            overlay.rotation = objectStartRotation + angleDelta;
            drawAll();
            return;
        }

        if (isResizing) {
            const overlay = overlays[selectedOverlayIndex];
            const newWidth = touchX - overlay.x;
            const newHeight = newWidth / overlay.aspect;

            const minSize = 20;
            if (newWidth > minSize && newHeight > minSize) {
                overlay.width = newWidth;
                overlay.height = newHeight;
            }
            drawAll();
            return;
        }

        if (isDragging) {
            const overlay = overlays[selectedOverlayIndex];
            overlay.x = touchX - dragOffsetX;
            overlay.y = touchY - dragOffsetY;
            drawAll();
            return;
        }
    });

    canvas.addEventListener('touchend', () => {
        isDragging = false;
        isResizing = false;
        isRotating = false;
        drawAll();
    });

    drawAll();
});