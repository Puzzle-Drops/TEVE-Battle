// viewportScaler.js
class ViewportScaler {
    constructor() {
        this.baseWidth = 1920;
        this.baseHeight = 1080;
        this.aspectRatio = this.baseWidth / this.baseHeight;
        this.gameContainer = null;
        this.loadingScreen = null;
        this.currentScale = 1;
        this.scalingWrapper = null;
    }

    init() {
        // Create a wrapper div for proper scaling
        this.createScalingWrapper();
        
        this.gameContainer = document.getElementById('gameContainer');
        this.loadingScreen = document.getElementById('loadingScreen');
        
        if (!this.gameContainer) {
            console.error('Game container not found!');
            return;
        }

        // Move game container and loading screen into the wrapper
        this.scalingWrapper.appendChild(this.loadingScreen);
        this.scalingWrapper.appendChild(this.gameContainer);

        // Apply initial scale
        this.updateScale();

        // Update scale on window resize
        window.addEventListener('resize', () => this.updateScale());

        // Also update on orientation change for mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.updateScale(), 100);
        });
    }

    createScalingWrapper() {
        this.scalingWrapper = document.createElement('div');
        this.scalingWrapper.id = 'scalingWrapper';
        this.scalingWrapper.style.cssText = `
            position: absolute;
            width: ${this.baseWidth}px;
            height: ${this.baseHeight}px;
            transform-origin: center center;
            left: 50%;
            top: 50%;
        `;
        document.body.appendChild(this.scalingWrapper);
    }

    updateScale() {
        if (!this.scalingWrapper) return;

        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Calculate scale to fit window while maintaining aspect ratio
        const scaleX = windowWidth / this.baseWidth;
        const scaleY = windowHeight / this.baseHeight;
        
        // Use the smaller scale to ensure the entire game fits
        this.currentScale = Math.min(scaleX, scaleY);

        // Apply scale and center the wrapper
        this.scalingWrapper.style.transform = `translate(-50%, -50%) scale(${this.currentScale})`;
    }

    // Get mouse position adjusted for scale
    getScaledMousePosition(event) {
        if (!this.scalingWrapper) return { x: 0, y: 0 };
        
        const rect = this.scalingWrapper.getBoundingClientRect();
        const scaleX = rect.width / this.baseWidth;
        const scaleY = rect.height / this.baseHeight;
        
        const x = (event.clientX - rect.left) / scaleX;
        const y = (event.clientY - rect.top) / scaleY;
        
        return { x, y };
    }

    // Get the current scale factor
    getScale() {
        return this.currentScale;
    }
}

// Create global instance
window.viewportScaler = new ViewportScaler();
