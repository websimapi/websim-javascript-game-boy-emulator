export class PPU {
    constructor(canvas, memory) {
        this.canvas = canvas;
        this.memory = memory;
        
        this.ctx = canvas.getContext('2d');
        this.imageData = this.ctx.createImageData(160, 144);
        
        // Define color palette (GB classic green shades)
        this.palette = [
            [224, 248, 208], // White (lightest)
            [136, 192, 112], // Light gray
            [52, 104, 86],   // Dark gray
            [8, 24, 32]      // Black (darkest)
        ];
        
        // PPU state
        this.reset();
    }
    
    reset() {
        this.scanline = 0;
        this.cycles = 0;
        this.mode = 0;
        
        // Clear screen
        this.clear();
    }
    
    clear() {
        // Fill with white
        for (let i = 0; i < this.imageData.data.length; i += 4) {
            this.imageData.data[i] = this.palette[0][0];
            this.imageData.data[i + 1] = this.palette[0][1];
            this.imageData.data[i + 2] = this.palette[0][2];
            this.imageData.data[i + 3] = 255; // Alpha
        }
        
        this.ctx.putImageData(this.imageData, 0, 0);
    }
    
    update(cycles) {
        // PPU timing
        this.cycles += cycles;
        
        // Simple PPU state machine
        if (this.cycles >= 456) {
            this.cycles -= 456;
            this.scanline++;
            
            // Update LY register
            this.memory.writeByte(0xFF44, this.scanline);
            
            if (this.scanline === 144) {
                // VBLANK starts
                // Request a VBLANK interrupt
                let interruptFlags = this.memory.readByte(0xFF0F);
                interruptFlags |= 0x01; // Set VBLANK bit
                this.memory.writeByte(0xFF0F, interruptFlags);
            } else if (this.scanline > 153) {
                // End of frame
                this.scanline = 0;
                this.memory.writeByte(0xFF44, 0);
            }
        }
    }
    
    render() {
        const lcdc = this.memory.readByte(0xFF40);
        
        // Check if LCD is enabled
        if (!(lcdc & 0x80)) {
            this.clear();
            return;
        }
        
        // Clear screen before drawing
        for (let i = 0; i < this.imageData.data.length; i += 4) {
            this.imageData.data[i] = this.palette[0][0];
            this.imageData.data[i + 1] = this.palette[0][1];
            this.imageData.data[i + 2] = this.palette[0][2];
            this.imageData.data[i + 3] = 255; // Alpha
        }
        
        // Draw background
        if (lcdc & 0x01) {
            this.renderBackground(lcdc);
        }
        
        // Draw sprites
        if (lcdc & 0x02) {
            this.renderSprites(lcdc);
        }
        
        // Update canvas
        this.ctx.putImageData(this.imageData, 0, 0);
    }
    
    renderBackground(lcdc) {
        // Background tilemap address
        const bgMapAddress = (lcdc & 0x08) ? 0x9C00 : 0x9800;
        
        // Background tile data address
        const bgTileDataAddress = (lcdc & 0x10) ? 0x8000 : 0x8800;
        const signedTileIds = !(lcdc & 0x10);
        
        // Scroll position
        const scrollY = this.memory.readByte(0xFF42);
        const scrollX = this.memory.readByte(0xFF43);
        
        // Background palette
        const bgPalette = this.memory.readByte(0xFF47);
        
        // For each pixel on screen
        for (let y = 0; y < 144; y++) {
            for (let x = 0; x < 160; x++) {
                // Calculate which tile this pixel is in
                const tileY = Math.floor((y + scrollY) / 8) % 32;
                const tileX = Math.floor((x + scrollX) / 8) % 32;
                
                // Get the tile index
                const tileMapOffset = tileY * 32 + tileX;
                let tileIndex = this.memory.readByte(bgMapAddress + tileMapOffset);
                
                // Convert tile index to signed if needed
                if (signedTileIds) {
                    tileIndex = tileIndex < 128 ? tileIndex : tileIndex - 256;
                }
                
                // Calculate the address of the tile data
                const tileDataAddress = bgTileDataAddress + (signedTileIds ? ((tileIndex + 128) * 16) : (tileIndex * 16));
                
                // Calculate which row of the tile we're on
                const tileRow = (y + scrollY) % 8;
                
                // Each row takes 2 bytes
                const rowAddress = tileDataAddress + (tileRow * 2);
                const rowLow = this.memory.readByte(rowAddress);
                const rowHigh = this.memory.readByte(rowAddress + 1);
                
                // Calculate which bit in the row we need
                const bitIndex = 7 - ((x + scrollX) % 8);
                
                // Get the color index (0-3)
                const colorIndex = ((rowHigh >> bitIndex) & 1) << 1 | ((rowLow >> bitIndex) & 1);
                
                // Map the color index through the palette
                const paletteColor = (bgPalette >> (colorIndex * 2)) & 3;
                
                // Set the pixel in the image data
                const pixelIndex = (y * 160 + x) * 4;
                this.imageData.data[pixelIndex] = this.palette[paletteColor][0];
                this.imageData.data[pixelIndex + 1] = this.palette[paletteColor][1];
                this.imageData.data[pixelIndex + 2] = this.palette[paletteColor][2];
                this.imageData.data[pixelIndex + 3] = 255; // Alpha
            }
        }
    }
    
    renderSprites(lcdc) {
        // Sprite size: 8x8 or 8x16
        const spriteHeight = (lcdc & 0x04) ? 16 : 8;
        
        // Object palettes
        const obp0 = this.memory.readByte(0xFF48);
        const obp1 = this.memory.readByte(0xFF49);
        
        // For each sprite
        for (let sprite = 0; sprite < 40; sprite++) {
            // Each sprite takes 4 bytes in OAM
            const oamAddress = 0xFE00 + (sprite * 4);
            
            // Read sprite attributes
            const spriteY = this.memory.readByte(oamAddress) - 16;
            const spriteX = this.memory.readByte(oamAddress + 1) - 8;
            const tileIndex = this.memory.readByte(oamAddress + 2);
            const attributes = this.memory.readByte(oamAddress + 3);
            
            // Check if sprite is on screen
            if (spriteY >= 144 || spriteX >= 160 || spriteY <= -spriteHeight || spriteX <= -8) {
                continue;
            }
            
            // Flip flags
            const flipY = !!(attributes & 0x40);
            const flipX = !!(attributes & 0x20);
            
            // Palette selection
            const paletteNumber = (attributes & 0x10) ? 1 : 0;
            const palette = paletteNumber ? obp1 : obp0;
            
            // Sprite priority
            const behindBG = !!(attributes & 0x80);
            
            // Draw sprite
            for (let y = 0; y < spriteHeight; y++) {
                // Check if this row is on screen
                if (spriteY + y < 0 || spriteY + y >= 144) continue;
                
                // Calculate which tile row to use (considering Y flip)
                const tileRow = flipY ? (spriteHeight - 1 - y) : y;
                
                // Calculate the address of this row of the tile
                const tileAddress = 0x8000 + (tileIndex * 16) + (tileRow * 2);
                
                // Read the tile row data
                const rowLow = this.memory.readByte(tileAddress);
                const rowHigh = this.memory.readByte(tileAddress + 1);
                
                for (let x = 0; x < 8; x++) {
                    // Check if this pixel is on screen
                    if (spriteX + x < 0 || spriteX + x >= 160) continue;
                    
                    // Calculate which bit in the row to use (considering X flip)
                    const bitIndex = flipX ? x : (7 - x);
                    
                    // Get the color index (0-3)
                    const colorIndex = ((rowHigh >> bitIndex) & 1) << 1 | ((rowLow >> bitIndex) & 1);
                    
                    // Color 0 is transparent for sprites
                    if (colorIndex === 0) continue;
                    
                    // Map the color index through the palette
                    const paletteColor = (palette >> (colorIndex * 2)) & 3;
                    
                    // Set the pixel in the image data
                    const pixelIndex = ((spriteY + y) * 160 + (spriteX + x)) * 4;
                    this.imageData.data[pixelIndex] = this.palette[paletteColor][0];
                    this.imageData.data[pixelIndex + 1] = this.palette[paletteColor][1];
                    this.imageData.data[pixelIndex + 2] = this.palette[paletteColor][2];
                    this.imageData.data[pixelIndex + 3] = 255; // Alpha
                }
            }
        }
    }
}

