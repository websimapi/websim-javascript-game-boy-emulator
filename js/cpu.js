export class CPU {
    constructor(memory) {
        this.memory = memory;
        this.debugCallback = null;
        
        this.reset();
    }
    
    setDebugCallback(callback) {
        this.debugCallback = callback;
    }
    
    debug(message) {
        if (this.debugCallback) {
            this.debugCallback(message);
        }
    }
    
    reset() {
        // CPU registers
        this.registers = {
            a: 0, f: 0,  // Accumulator & flags
            b: 0, c: 0,  // BC pair
            d: 0, e: 0,  // DE pair
            h: 0, l: 0,  // HL pair
            sp: 0xFFFE,  // Stack pointer
            pc: 0x0100   // Program counter (skip boot ROM)
        };
        
        // Flag bits in F register
        this.FLAGS = {
            Z: 7, // Zero flag
            N: 6, // Subtract flag
            H: 5, // Half carry flag
            C: 4  // Carry flag
        };
        
        // Initialize the flag register (F)
        this.setFlag(this.FLAGS.Z, true);
        this.setFlag(this.FLAGS.H, true);
        this.setFlag(this.FLAGS.C, true);
        
        this.ime = true; // Interrupt Master Enable flag
        this.halted = false;
        
        this.debug('CPU reset');
    }
    
    // Flag operations
    setFlag(flag, value) {
        if (value) {
            this.registers.f |= (1 << flag);
        } else {
            this.registers.f &= ~(1 << flag);
        }
    }
    
    getFlag(flag) {
        return !!(this.registers.f & (1 << flag));
    }
    
    // 16-bit register pairs
    getBC() {
        return (this.registers.b << 8) | this.registers.c;
    }
    
    setBC(value) {
        this.registers.b = (value >> 8) & 0xFF;
        this.registers.c = value & 0xFF;
    }
    
    getDE() {
        return (this.registers.d << 8) | this.registers.e;
    }
    
    setDE(value) {
        this.registers.d = (value >> 8) & 0xFF;
        this.registers.e = value & 0xFF;
    }
    
    getHL() {
        return (this.registers.h << 8) | this.registers.l;
    }
    
    setHL(value) {
        this.registers.h = (value >> 8) & 0xFF;
        this.registers.l = value & 0xFF;
    }
    
    // Memory access
    readByte(address) {
        return this.memory.readByte(address);
    }
    
    readWord(address) {
        return this.memory.readWord(address);
    }
    
    writeByte(address, value) {
        this.memory.writeByte(address, value);
    }
    
    writeWord(address, value) {
        this.memory.writeWord(address, value);
    }
    
    // Stack operations
    push(value) {
        this.registers.sp = (this.registers.sp - 2) & 0xFFFF;
        this.writeWord(this.registers.sp, value);
    }
    
    pop() {
        const value = this.readWord(this.registers.sp);
        this.registers.sp = (this.registers.sp + 2) & 0xFFFF;
        return value;
    }
    
    // CPU execution step
    step() {
        if (this.halted) {
            return 4; // When halted, just return a default number of cycles
        }
        
        // Fetch
        const opcode = this.readByte(this.registers.pc++);
        this.registers.pc &= 0xFFFF; // Ensure PC stays within 16-bit range
        
        // Decode and execute
        return this.executeInstruction(opcode);
    }
    
    executeInstruction(opcode) {
        let cycles = 4; // Default cycle count
        
        switch (opcode) {
            // NOP
            case 0x00:
                // Do nothing
                break;
                
            // LD BC, nn
            case 0x01:
                this.setBC(this.readWord(this.registers.pc));
                this.registers.pc = (this.registers.pc + 2) & 0xFFFF;
                cycles = 12;
                break;
                
            // LD (BC), A
            case 0x02:
                this.writeByte(this.getBC(), this.registers.a);
                cycles = 8;
                break;
                
            // INC BC
            case 0x03:
                this.setBC((this.getBC() + 1) & 0xFFFF);
                cycles = 8;
                break;
                
            // INC B
            case 0x04:
                this.registers.b = this.inc8(this.registers.b);
                break;
                
            // DEC B
            case 0x05:
                this.registers.b = this.dec8(this.registers.b);
                break;
                
            // LD B, n
            case 0x06:
                this.registers.b = this.readByte(this.registers.pc++);
                this.registers.pc &= 0xFFFF;
                cycles = 8;
                break;
                
            // RLCA
            case 0x07:
                this.registers.a = this.rlc(this.registers.a);
                this.setFlag(this.FLAGS.Z, false);
                cycles = 4;
                break;
                
            // LD (nn), SP
            case 0x08:
                const address = this.readWord(this.registers.pc);
                this.registers.pc = (this.registers.pc + 2) & 0xFFFF;
                this.writeWord(address, this.registers.sp);
                cycles = 20;
                break;
                
            // ADD HL, BC
            case 0x09:
                this.addHL(this.getBC());
                cycles = 8;
                break;
                
            // LD A, (BC)
            case 0x0A:
                this.registers.a = this.readByte(this.getBC());
                cycles = 8;
                break;
                
            // DEC BC
            case 0x0B:
                this.setBC((this.getBC() - 1) & 0xFFFF);
                cycles = 8;
                break;
                
            // INC C
            case 0x0C:
                this.registers.c = this.inc8(this.registers.c);
                break;
                
            // DEC C
            case 0x0D:
                this.registers.c = this.dec8(this.registers.c);
                break;
                
            // LD C, n
            case 0x0E:
                this.registers.c = this.readByte(this.registers.pc++);
                this.registers.pc &= 0xFFFF;
                cycles = 8;
                break;
                
            // RRCA
            case 0x0F:
                this.registers.a = this.rrc(this.registers.a);
                this.setFlag(this.FLAGS.Z, false);
                cycles = 4;
                break;
                
            // ... Many more opcodes would be implemented here...
            
            // HALT
            case 0x76:
                this.halted = true;
                break;
                
            // ... More opcodes ...
                
            default:
                this.debug(`Unknown opcode: 0x${opcode.toString(16).padStart(2, '0')}`);
                break;
        }
        
        return cycles;
    }
    
    // 8-bit operations
    inc8(value) {
        const result = (value + 1) & 0xFF;
        this.setFlag(this.FLAGS.Z, result === 0);
        this.setFlag(this.FLAGS.N, false);
        this.setFlag(this.FLAGS.H, (value & 0xF) === 0xF);
        return result;
    }
    
    dec8(value) {
        const result = (value - 1) & 0xFF;
        this.setFlag(this.FLAGS.Z, result === 0);
        this.setFlag(this.FLAGS.N, true);
        this.setFlag(this.FLAGS.H, (value & 0xF) === 0);
        return result;
    }
    
    add8(a, b) {
        const result = (a + b) & 0xFF;
        this.setFlag(this.FLAGS.Z, result === 0);
        this.setFlag(this.FLAGS.N, false);
        this.setFlag(this.FLAGS.H, ((a & 0xF) + (b & 0xF)) > 0xF);
        this.setFlag(this.FLAGS.C, (a + b) > 0xFF);
        return result;
    }
    
    sub8(a, b) {
        const result = (a - b) & 0xFF;
        this.setFlag(this.FLAGS.Z, result === 0);
        this.setFlag(this.FLAGS.N, true);
        this.setFlag(this.FLAGS.H, (a & 0xF) < (b & 0xF));
        this.setFlag(this.FLAGS.C, a < b);
        return result;
    }
    
    // Bit operations
    rlc(value) {
        const carry = value >> 7;
        const result = ((value << 1) | carry) & 0xFF;
        this.setFlag(this.FLAGS.C, carry === 1);
        return result;
    }
    
    rrc(value) {
        const carry = value & 1;
        const result = ((value >> 1) | (carry << 7)) & 0xFF;
        this.setFlag(this.FLAGS.C, carry === 1);
        return result;
    }
    
    // 16-bit operations
    addHL(value) {
        const hl = this.getHL();
        const result = (hl + value) & 0xFFFF;
        
        this.setFlag(this.FLAGS.N, false);
        this.setFlag(this.FLAGS.H, ((hl & 0xFFF) + (value & 0xFFF)) > 0xFFF);
        this.setFlag(this.FLAGS.C, (hl + value) > 0xFFFF);
        
        this.setHL(result);
    }
}

