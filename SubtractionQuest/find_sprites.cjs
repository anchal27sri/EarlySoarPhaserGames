const Jimp = require('jimp');

async function processImage() {
    const image = await Jimp.read('src/assets/sprites.png');
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    const isBg = new Uint8Array(width * height);
    
    function matchesBg(color) {
        if (color.a < 20) return true;
        if (color.r > 240 && color.g > 240 && color.b > 240) return true;
        return false;
    }

    // Flood fill from borders to identify background
    const q = [];
    for(let x=0; x<width; x++) { q.push([x,0]); q.push([x,height-1]); }
    for(let y=0; y<height; y++) { q.push([0,y]); q.push([width-1,y]); }

    while(q.length > 0) {
        const [cx, cy] = q.pop();
        if (cx<0 || cx>=width || cy<0 || cy>=height) continue;
        if (isBg[cy*width+cx]) continue;
        
        const col = Jimp.intToRGBA(image.getPixelColor(cx, cy));
        if (matchesBg(col)) {
            isBg[cy*width+cx] = 1;
            q.push([cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]);
        }
    }

    const visited = new Uint8Array(width * height);
    const boxes = [];

    // Simple BFS for connected components
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (visited[y * width + x] || isBg[y * width + x]) continue;

            let minX = x, maxX = x, minY = y, maxY = y;
            const queue = [[x, y]];
            visited[y * width + x] = 1;

            while (queue.length > 0) {
                const [cx, cy] = queue.pop();
                if (cx < minX) minX = cx;
                if (cx > maxX) maxX = cx;
                if (cy < minY) minY = cy;
                if (cy > maxY) maxY = cy;

                // Check 8 neighbors
                for (let dy = -2; dy <= 2; dy++) {
                    for (let dx = -2; dx <= 2; dx++) {
                        const nx = cx + dx;
                        const ny = cy + dy;
                        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                            if (!visited[ny * width + nx] && !isBg[ny * width + nx]) {
                                visited[ny * width + nx] = 1;
                                queue.push([nx, ny]);
                            }
                        }
                    }
                }
            }
            // Filter out tiny noise
            if ((maxX - minX) > 10 && (maxY - minY) > 10) {
                boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
            }
        }
    }

    // Merge boxes that are very close (to handle disconnected parts like floating sparkles)
    let merged = true;
    while(merged) {
        merged = false;
        for (let i=0; i<boxes.length; i++) {
            for (let j=i+1; j<boxes.length; j++) {
                const b1 = boxes[i];
                const b2 = boxes[j];
                const expand = 15;
                const intersectX = Math.max(0, Math.min(b1.x+b1.w+expand, b2.x+b2.w+expand) - Math.max(b1.x-expand, b2.x-expand));
                const intersectY = Math.max(0, Math.min(b1.y+b1.h+expand, b2.y+b2.h+expand) - Math.max(b1.y-expand, b2.y-expand));
                
                if (intersectX > 0 && intersectY > 0) {
                    const newX = Math.min(b1.x, b2.x);
                    const newY = Math.min(b1.y, b2.y);
                    const newMaxX = Math.max(b1.x+b1.w, b2.x+b2.w);
                    const newMaxY = Math.max(b1.y+b1.h, b2.y+b2.h);
                    boxes[i] = { x: newX, y: newY, w: newMaxX - newX, h: newMaxY - newY };
                    boxes.splice(j, 1);
                    merged = true;
                    break;
                }
            }
            if (merged) break;
        }
    }

    // Sort top-to-bottom, then left-to-right
    boxes.sort((a, b) => {
        if (Math.abs(a.y - b.y) > 40) return a.y - b.y;
        return a.x - b.x;
    });

    console.log(JSON.stringify(boxes, null, 2));
    console.log(`Found ${boxes.length} sprites`);
}

processImage().catch(console.error);
