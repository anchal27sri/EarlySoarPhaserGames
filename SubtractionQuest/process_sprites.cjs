const Jimp = require('jimp');
const fs = require('fs');

function colorDist(c1, c2) {
    return Math.sqrt(
        Math.pow(c1.r - c2.r, 2) +
        Math.pow(c1.g - c2.g, 2) +
        Math.pow(c1.b - c2.b, 2)
    );
}

async function processImage() {
    console.log("Loading image...");
    const image = await Jimp.read('src/assets/sprites.png');
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    
    // 1. Remove Background (Flood Fill with tolerance)
    console.log("Removing background...");
    const isBg = new Uint8Array(width * height);
    const bgColor = Jimp.intToRGBA(image.getPixelColor(0, 0));
    
    const q = [[0, 0]];
    isBg[0] = 1;
    
    while(q.length > 0) {
        const [cx, cy] = q.pop();
        
        // 4 neighbors
        const neighbors = [
            [cx+1, cy], [cx-1, cy], [cx, cy+1], [cx, cy-1]
        ];
        
        for (let [nx, ny] of neighbors) {
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const idx = ny * width + nx;
                if (!isBg[idx]) {
                    const col = Jimp.intToRGBA(image.getPixelColor(nx, ny));
                    if (colorDist(col, bgColor) < 45) { // tolerance
                        isBg[idx] = 1;
                        q.push([nx, ny]);
                    }
                }
            }
        }
    }

    // Make background transparent
    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            if (isBg[y * width + x]) {
                image.setPixelColor(0x00000000, x, y); // transparent
            }
        }
    }
    
    console.log("Saving transparent image...");
    await image.writeAsync('src/assets/sprites_alpha.png');

    // 2. Find Bounding Boxes (CCL)
    console.log("Finding sprites...");
    const visited = new Uint8Array(width * height);
    const boxes = [];

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
            if ((maxX - minX) > 20 && (maxY - minY) > 20) { // minimum size 20x20
                boxes.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 });
            }
        }
    }

    // Merge close boxes (expand slightly)
    let merged = true;
    while(merged) {
        merged = false;
        for (let i=0; i<boxes.length; i++) {
            for (let j=i+1; j<boxes.length; j++) {
                const b1 = boxes[i];
                const b2 = boxes[j];
                const expand = 2;
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

    console.log(`Found ${boxes.length} sprites!`);

    // Convert to Phaser Atlas JSON Array format
    const frames = boxes.map((box, index) => ({
        filename: `sprite_${index}`,
        frame: { x: box.x, y: box.y, w: box.w, h: box.h },
        rotated: false,
        trimmed: false,
        spriteSourceSize: { x: 0, y: 0, w: box.w, h: box.h },
        sourceSize: { w: box.w, h: box.h }
    }));

    const atlas = {
        textures: [{
            image: "sprites_alpha.png",
            format: "RGBA8888",
            size: { w: width, h: height },
            scale: "1",
            frames: frames
        }]
    };

    fs.writeFileSync('src/assets/sprites.json', JSON.stringify(atlas, null, 2));
    console.log("Saved sprites.json");
}

processImage().catch(console.error);
