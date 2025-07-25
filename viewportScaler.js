// viewportScaler.js
class ViewportScaler {
    constructor() {
        this.baseWidth = 1920;
        this.baseHeight = 1080;
        this.gameContainer = null;
        this.loadingScreen = null;
        this.currentScale = 1;
    }

    init() {
        this.gameContainer = document.getElementById('gameContainer');
        this.loadingScreen = document.getElementById('loadingScreen');
        
        if (!this.gameContainer) {
            console.error('Game container not found!');
            return;
        }

        // Apply initial scale to both loading screen and game container
        this.updateScale();

        // Update scale on window resize
        window.addEventListener('resize', () => this.updateScale());

        // Also update on orientation change for mobile
        window.addEventListener('orientationchange', () => {
            setTimeout(() => this.updateScale(), 100);
        });
    }

    updateScale() {
        const windowWidth = window.innerWidth;
        const windowHeight = window.innerHeight;

        // Calculate scale to fit window while maintaining aspect ratio
        const scaleX = windowWidth / this.baseWidth;
        const scaleY = windowHeight / this.baseHeight;
        
        // Use the smaller scale to ensure the entire game fits
        this.currentScale = Math.min(scaleX, scaleY);

        // Apply to both loading screen and game container
        const elements = [this.gameContainer, this.loadingScreen].filter(el => el);
        
        elements.forEach(element => {
            // Apply the scale transform
            element.style.transform = `scale(${this.currentScale})`;

            // Calculate margins to center the element
            const scaledWidth = this.baseWidth * this.currentScale;
            const scaledHeight = this.baseHeight * this.currentScale;
            
            const marginLeft = (windowWidth - scaledWidth) / 2;
            const marginTop = (windowHeight - scaledHeight) / 2;

            // Apply margins for centering
            element.style.marginLeft = `${marginLeft}px`;
            element.style.marginTop = `${marginTop}px`;

            // Adjust position to account for transform origin
            element.style.left = '0';
            element.style.top = '0';
            element.style.position = 'absolute';
        });
    }

    // Get mouse position adjusted for scale
    getScaledMousePosition(event) {
        const rect = this.gameContainer.getBoundingClientRect();
        const x = (event.clientX - rect.left) / this.currentScale;
        const y = (event.clientY - rect.top) / this.currentScale;
        return { x, y };
    }

    // Get the current scale factor
    getScale() {
        return this.currentScale;
    }
}

// Create global instance
window.viewportScaler = new ViewportScaler();
