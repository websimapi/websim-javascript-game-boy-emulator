import { CPU } from './cpu.js';
import { Memory } from './memory.js';
import { PPU } from './ppu.js';
import { Input } from './input.js';

export class GameBoy {
    constructor(canvas, romData) {
        this.memory = new Memory(romData);
        this.ppu = new PPU(canvas, this.memory);
        this.input = new Input(this.memory);
        this.cpu = new CPU(this.memory);
        
        this.animationFrameId = null;
        this.debugCallback = null;
        this.running = false;
    }
    
    setDebugCallback(callback) {
        this.debugCallback = callback;
        this.cpu.setDebugCallback(callback);
    }
    
    debug(message) {
        if (this.debugCallback) {
            this.debugCallback(message);
        }
    }
    
    start() {
        if (this.running) return;
        
        this.running = true;
        this.debug('Emulator started');
        this.runLoop();
    }
    
    pause() {
        this.running = false;
        if (this.animationFrameId) {
            cancelAnimationFrame(this.animationFrameId);
            this.animationFrameId = null;
        }
        this.debug('Emulator paused');
    }
    
    stop() {
        this.pause();
        this.debug('Emulator stopped');
    }
    
    reset() {
        this.stop();
        this.memory.reset();
        this.cpu.reset();
        this.ppu.reset();
        this.input.reset();
        this.start();
    }
    
    setButtonState(button, isPressed) {
        this.input.setButtonState(button, isPressed);
    }
    
    runLoop() {
        if (!this.running) return;
        
        // Execute a batch of CPU cycles (amount chosen for reasonable speed)
        const cyclesPerFrame = 70224; // Approximation of cycles per frame (4MHz / ~60fps)
        let cyclesThisFrame = 0;
        
        while (cyclesThisFrame < cyclesPerFrame) {
            const cycles = this.cpu.step();
            cyclesThisFrame += cycles;
            
            // Update PPU
            this.ppu.update(cycles);
        }
        
        // Render the current frame
        this.ppu.render();
        
        // Schedule the next frame
        this.animationFrameId = requestAnimationFrame(() => this.runLoop());
    }
}

