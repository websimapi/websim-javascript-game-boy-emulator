export class Input {
    constructor(memory) {
        this.memory = memory;
        this.reset();
    }
    
    reset() {
        // Button states (1 = not pressed, 0 = pressed)
        this.buttonStates = {
            up: true,
            down: true,
            left: true,
            right: true,
            a: true,
            b: true,
            start: true,
            select: true
        };
        
        // Initialize joypad register
        this.memory.writeByte(0xFF00, 0xFF);
    }
    
    setButtonState(button, isPressed) {
        if (this.buttonStates.hasOwnProperty(button)) {
            this.buttonStates[button] = !isPressed;
            this.updateJoypadRegister();
        }
    }
    
    updateJoypadRegister() {
        // Read current joypad register value
        let joypadReg = this.memory.readByte(0xFF00);
        
        // Determine which button set is selected (direction or action)
        const directionSelected = !(joypadReg & 0x10);
        const actionSelected = !(joypadReg & 0x20);
        
        // Start with all buttons not pressed
        let newValue = joypadReg & 0xF0;
        newValue |= 0x0F;
        
        // Update selected button states
        if (directionSelected) {
            if (!this.buttonStates.right) newValue &= ~0x01;
            if (!this.buttonStates.left) newValue &= ~0x02;
            if (!this.buttonStates.up) newValue &= ~0x04;
            if (!this.buttonStates.down) newValue &= ~0x08;
        }
        
        if (actionSelected) {
            if (!this.buttonStates.a) newValue &= ~0x01;
            if (!this.buttonStates.b) newValue &= ~0x02;
            if (!this.buttonStates.select) newValue &= ~0x04;
            if (!this.buttonStates.start) newValue &= ~0x08;
        }
        
        // Write back to memory
        this.memory.writeByte(0xFF00, newValue);
        
        // Check if an interrupt should be requested
        if ((joypadReg & 0x0F) === 0x0F && (newValue & 0x0F) !== 0x0F) {
            // Request joypad interrupt
            let interruptFlags = this.memory.readByte(0xFF0F);
            interruptFlags |= 0x10; // Set joypad interrupt bit
            this.memory.writeByte(0xFF0F, interruptFlags);
        }
    }
}

