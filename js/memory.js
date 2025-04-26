export class Memory {
    constructor(romData) {
        this.reset();
        
        if (romData) {
            this.loadROM(romData);
        }
    }
    
    reset() {
        // Initialize memory
        this.rom = new Uint8Array(0x8000); // 32KB ROM (2 banks of 16KB)
        this.vram = new Uint8Array(0x2000); // 8KB Video RAM
        this.ram = new Uint8Array(0x2000); // 8KB Internal RAM
        this.oam = new Uint8Array(0xA0); // Sprite Attribute Table
        this.io = new Uint8Array(0x80); // I/O Registers
        this.hram = new Uint8Array(0x7F); // High RAM
        
        // Initialize I/O registers with values they would have after the boot ROM
        this.io[0x05] = 0x00; // TIMA
        this.io[0x06] = 0x00; // TMA
        this.io[0x07] = 0x00; // TAC
        this.io[0x10] = 0x80; // NR10
        this.io[0x11] = 0xBF; // NR11
        this.io[0x12] = 0xF3; // NR12
        this.io[0x14] = 0xBF; // NR14
        this.io[0x16] = 0x3F; // NR21
        this.io[0x17] = 0x00; // NR22
        this.io[0x19] = 0xBF; // NR24
        this.io[0x1A] = 0x7F; // NR30
        this.io[0x1B] = 0xFF; // NR31
        this.io[0x1C] = 0x9F; // NR32
        this.io[0x1E] = 0xBF; // NR33
        this.io[0x20] = 0xFF; // NR41
        this.io[0x21] = 0x00; // NR42
        this.io[0x22] = 0x00; // NR43
        this.io[0x23] = 0xBF; // NR44
        this.io[0x24] = 0x77; // NR50
        this.io[0x25] = 0xF3; // NR51
        this.io[0x26] = 0xF1; // NR52
        this.io[0x40] = 0x91; // LCDC
        this.io[0x42] = 0x00; // SCY
        this.io[0x43] = 0x00; // SCX
        this.io[0x45] = 0x00; // LYC
        this.io[0x47] = 0xFC; // BGP
        this.io[0x48] = 0xFF; // OBP0
        this.io[0x49] = 0xFF; // OBP1
        this.io[0x4A] = 0x00; // WY
        this.io[0x4B] = 0x00; // WX
        this.io[0xFF] = 0x00; // IE
        
        this.interruptEnable = 0; // Interrupt Enable Register (IE)
    }
    
    loadROM(data) {
        // Copy ROM data to memory (up to 32KB)
        const len = Math.min(data.length, this.rom.length);
        for (let i = 0; i < len; i++) {
            this.rom[i] = data[i];
        }
    }
    
    readByte(address) {
        // Memory map
        if (address < 0x8000) {
            // ROM
            return this.rom[address];
        } else if (address < 0xA000) {
            // VRAM
            return this.vram[address - 0x8000];
        } else if (address < 0xC000) {
            // External RAM (not implemented)
            return 0xFF;
        } else if (address < 0xE000) {
            // Internal RAM
            return this.ram[address - 0xC000];
        } else if (address < 0xFE00) {
            // Echo RAM (mirror of C000-DDFF)
            return this.ram[address - 0xE000];
        } else if (address < 0xFEA0) {
            // OAM
            return this.oam[address - 0xFE00];
        } else if (address < 0xFF00) {
            // Not usable
            return 0xFF;
        } else if (address < 0xFF80) {
            // I/O registers
            return this.readIO(address);
        } else if (address < 0xFFFF) {
            // High RAM
            return this.hram[address - 0xFF80];
        } else {
            // Interrupt Enable Register
            return this.interruptEnable;
        }
    }
    
    writeByte(address, value) {
        // Ensure value is in 8-bit range
        value = value & 0xFF;
        
        // Memory map
        if (address < 0x8000) {
            // ROM (potentially handle MBC)
            // Typically read-only, but MBC switching would be handled here
        } else if (address < 0xA000) {
            // VRAM
            this.vram[address - 0x8000] = value;
        } else if (address < 0xC000) {
            // External RAM (not implemented)
        } else if (address < 0xE000) {
            // Internal RAM
            this.ram[address - 0xC000] = value;
        } else if (address < 0xFE00) {
            // Echo RAM (mirror of C000-DDFF)
            this.ram[address - 0xE000] = value;
        } else if (address < 0xFEA0) {
            // OAM
            this.oam[address - 0xFE00] = value;
        } else if (address < 0xFF00) {
            // Not usable
        } else if (address < 0xFF80) {
            // I/O registers
            this.writeIO(address, value);
        } else if (address < 0xFFFF) {
            // High RAM
            this.hram[address - 0xFF80] = value;
        } else {
            // Interrupt Enable Register
            this.interruptEnable = value;
        }
    }
    
    readWord(address) {
        return this.readByte(address) | (this.readByte(address + 1) << 8);
    }
    
    writeWord(address, value) {
        this.writeByte(address, value & 0xFF);
        this.writeByte(address + 1, (value >> 8) & 0xFF);
    }
    
    readIO(address) {
        const offset = address - 0xFF00;
        
        // Special handling for certain I/O registers
        if (offset === 0x00) {
            // P1/JOYP (Joypad)
            return (this.io[0x00] & 0xCF) | 0xC0; // Return with top bits set
        }
        
        return this.io[offset];
    }
    
    writeIO(address, value) {
        const offset = address - 0xFF00;
        
        // Special handling for certain I/O registers
        this.io[offset] = value;
    }
}

