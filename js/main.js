import { GameBoy } from './gameboy.js';

document.addEventListener('DOMContentLoaded', () => {
    const debugOutput = document.getElementById('debug-output');
    const romInput = document.getElementById('rom-input');
    const pauseBtn = document.getElementById('pause-btn');
    const resetBtn = document.getElementById('reset-btn');
    const canvas = document.getElementById('screen');
    
    let gameboy = null;
    let paused = false;
    
    function log(message) {
        debugOutput.textContent += '\n' + message;
        debugOutput.scrollTop = debugOutput.scrollHeight;
    }
    
    romInput.addEventListener('change', async (event) => {
        const file = event.target.files[0];
        if (!file) return;
        
        try {
            const arrayBuffer = await file.arrayBuffer();
            const romData = new Uint8Array(arrayBuffer);
            
            if (gameboy) {
                gameboy.stop();
            }
            
            log(`Loading ROM: ${file.name} (${romData.length} bytes)`);
            
            gameboy = new GameBoy(canvas, romData);
            gameboy.setDebugCallback(log);
            gameboy.start();
            
            paused = false;
            pauseBtn.textContent = 'Pause';
        } catch (error) {
            log(`Error loading ROM: ${error}`);
        }
    });
    
    pauseBtn.addEventListener('click', () => {
        if (!gameboy) return;
        
        if (paused) {
            gameboy.start();
            pauseBtn.textContent = 'Pause';
        } else {
            gameboy.pause();
            pauseBtn.textContent = 'Resume';
        }
        
        paused = !paused;
    });
    
    resetBtn.addEventListener('click', () => {
        if (!gameboy) return;
        
        gameboy.reset();
        log('Emulator reset');
    });
    
    // Handle physical keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!gameboy) return;
        handleKeyEvent(e, true);
    });
    
    document.addEventListener('keyup', (e) => {
        if (!gameboy) return;
        handleKeyEvent(e, false);
    });
    
    // Handle on-screen controls
    document.querySelectorAll('.d-pad button, .action-buttons button, .menu-buttons button').forEach(button => {
        button.addEventListener('mousedown', () => {
            if (!gameboy) return;
            gameboy.setButtonState(button.dataset.key, true);
        });
        
        button.addEventListener('mouseup', () => {
            if (!gameboy) return;
            gameboy.setButtonState(button.dataset.key, false);
        });
        
        button.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (!gameboy) return;
            gameboy.setButtonState(button.dataset.key, true);
        });
        
        button.addEventListener('touchend', (e) => {
            e.preventDefault();
            if (!gameboy) return;
            gameboy.setButtonState(button.dataset.key, false);
        });
    });
    
    function handleKeyEvent(e, isPressed) {
        const keyMap = {
            'ArrowUp': 'up',
            'ArrowDown': 'down',
            'ArrowLeft': 'left',
            'ArrowRight': 'right',
            'z': 'a',
            'x': 'b',
            'Enter': 'start',
            'Shift': 'select'
        };
        
        if (keyMap[e.key]) {
            gameboy.setButtonState(keyMap[e.key], isPressed);
        }
    }
});

