class WritingApp {
    constructor() {
        this.cursor = document.querySelector('.cursor');
        this.textContainer = document.getElementById('textContainer');
        this.targetWords = 24;
        this.currentText = '';
        this.isRTL = false; // Add this line
        this.init();
    }

    init() {
        this.calculateFontSize();
        this.positionElements();
        this.setupEventListeners();
        
        // Make the page focusable for keyboard input
        document.body.tabIndex = 0;
        document.body.focus();
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => this.handleKeypress(e));
        window.addEventListener('resize', () => {
            this.calculateFontSize();
            this.positionElements();
        });
    }

    handleKeypress(e) {
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
            // Regular character input
            this.currentText += e.key;
            this.updateDisplay();
        } else if (e.key === 'Backspace') {
            // Backspace
            this.currentText = this.currentText.slice(0, -1);
            this.updateDisplay();
        }
        e.preventDefault();
    }


    updateDisplay() {
        // Break text into lines with exact character count
        const formattedText = this.formatTextIntoLines(this.currentText);
        this.textContainer.textContent = formattedText;
        this.textContainer.style.fontSize = `${this.fontSize}px`;
        
        // Detect Hebrew and apply RTL if needed
        this.detectRTL();
        
        this.positionCursor();
    }
    
    formatTextIntoLines(text) {
        if (!text) return '';
        
        const lines = [];
        for (let i = 0; i < text.length; i += this.charsPerLine) {
            lines.push(text.slice(i, i + this.charsPerLine));
        }
        return lines.join('\n');
    }

    calculateFontSize() {
        const viewportWidth = window.innerWidth * 0.9;
        const viewportHeight = window.innerHeight * 0.9;
        const totalChars = 100; // Total characters that should fit on entire screen
        
        let bestFontSize = 4;
        let bestCharWidth = 0;
        let bestLineHeight = 0;
        let bestCharsPerLine = 0;
        
        // Try different font sizes to find the one that fits exactly 100 characters on screen
        for (let fontSize = 4; fontSize <= 200; fontSize += 1) {
            const tempChar = document.createElement('div');
            tempChar.style.cssText = `
                position: absolute;
                visibility: hidden;
                font-family: 'Courier New', monospace;
                font-size: ${fontSize}px;
                white-space: pre;
            `;
            tempChar.textContent = 'M';
            document.body.appendChild(tempChar);
            
            const charWidth = tempChar.offsetWidth;
            const lineHeight = tempChar.offsetHeight * 1.2;
            
            document.body.removeChild(tempChar);
            
            // Calculate how many characters fit horizontally and vertically
            const charsPerLine = Math.floor(viewportWidth / charWidth);
            const linesOnScreen = Math.floor(viewportHeight / lineHeight);
            const totalCharsOnScreen = charsPerLine * linesOnScreen;
            
            // Find the largest font where exactly 100 chars (or close) fit on screen
            if (totalCharsOnScreen >= totalChars) {
                bestFontSize = fontSize;
                bestCharWidth = charWidth;
                bestLineHeight = lineHeight;
                bestCharsPerLine = charsPerLine;
            } else {
                // Stop when we can't fit 100 characters anymore
                break;
            }
        }
        
        this.fontSize = bestFontSize;
        this.lineHeight = bestLineHeight;
        this.charWidth = bestCharWidth;
        this.charsPerLine = bestCharsPerLine;
        this.maxLines = Math.floor(viewportHeight / bestLineHeight);
        
        const totalCapacity = this.charsPerLine * this.maxLines;
        console.log(`Font: ${this.fontSize}px | ${this.charsPerLine} chars/line | ${this.maxLines} lines | Total capacity: ${totalCapacity} chars`);
    }

    positionElements() {
        this.positionCursor();
    }

    positionCursor() {
        if (!this.charsPerLine) return;
        
        // Calculate which line and column the cursor is on
        const cursorPosition = this.currentText.length;
        const lineNumber = Math.floor(cursorPosition / this.charsPerLine);
        const columnNumber = cursorPosition % this.charsPerLine;
        
        // Get the actual character dimensions
        const tempChar = document.createElement('div');
        tempChar.style.cssText = `
            position: absolute;
            visibility: hidden;
            font-family: 'Courier New', monospace;
            font-size: ${this.fontSize}px;
            white-space: pre;
        `;
        tempChar.textContent = 'M';
        document.body.appendChild(tempChar);
        
        const actualCharWidth = tempChar.offsetWidth;
        const actualCharHeight = tempChar.offsetHeight;
        
        document.body.removeChild(tempChar);
        
        // Calculate pixel position relative to container
        const containerRect = this.textContainer.getBoundingClientRect();
        
        let x, y;
        
        if (this.isRTL) {
            // For RTL: cursor position from right edge
            x = containerRect.right - (columnNumber) * actualCharWidth;
        } else {
            // For LTR: cursor position from left edge
            x = containerRect.left + (columnNumber * actualCharWidth);
        }
        
        y = containerRect.top + (lineNumber * actualCharHeight);
        
        this.cursor.style.left = `${x}px`;
        this.cursor.style.top = `${y}px`;
        this.cursor.style.height = `${actualCharHeight}px`;
    }

    detectRTL() {
        // Hebrew Unicode range: U+0590 to U+05FF
        const hebrewRegex = /[\u0590-\u05FF]/;
        const hasHebrew = hebrewRegex.test(this.currentText);
        
        if (hasHebrew !== this.isRTL) {
            this.isRTL = hasHebrew;
            this.textContainer.classList.toggle('rtl', this.isRTL);
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new WritingApp();
});