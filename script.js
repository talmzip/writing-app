/**
 * Minimalist Writing App
 * A clean, responsive writing interface with dynamic font scaling and smooth rendering
 */

class WritingApp {
    constructor() {
        this.textArea = document.getElementById('textArea');
        this.cursor = document.getElementById('cursor');
        
        // Configuration
        this.MIN_WORDS_ON_SCREEN = 20;
        this.MAX_WORDS_ON_SCREEN = 110;
        this.INITIAL_FONT_SIZE = 32;
        this.MIN_FONT_SIZE = 8;
        
        // State
        this.currentText = '';
        this.cursorPosition = 0;
        this.currentFontSize = this.INITIAL_FONT_SIZE;
        this.isRTL = false;
        this.charsPerLine = 0;
        this.maxLines = 0;
        
        // Bind methods
        this.handleInput = this.handleInput.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
        this.handlePaste = this.handlePaste.bind(this);
        this.updateDisplay = this.updateDisplay.bind(this);
        this.updateCursor = this.updateCursor.bind(this);
        
        this.init();
    }
    
    init() {
        // Set initial font size
        this.textArea.style.fontSize = `${this.currentFontSize}px`;
        
        // Calculate initial layout
        this.calculateLayout();
        
        // Event listeners
        this.textArea.addEventListener('input', this.handleInput);
        this.textArea.addEventListener('keydown', this.handleKeyDown);
        this.textArea.addEventListener('paste', this.handlePaste);
        window.addEventListener('resize', () => this.calculateLayout());
        
        // Focus the text area and position cursor
        this.textArea.focus();
        this.updateCursor();
        
        // Prevent default text selection behavior
        this.textArea.addEventListener('selectstart', (e) => e.preventDefault());
    }
    
    /**
     * Calculate characters per line and maximum lines based on current font size
     */
    calculateLayout() {
        const containerWidth = this.textArea.clientWidth;
        const containerHeight = this.textArea.clientHeight;
        
        // Create temporary element to measure character dimensions
        const tempElement = document.createElement('div');
        tempElement.style.cssText = `
            position: absolute;
            visibility: hidden;
            font-family: ${getComputedStyle(this.textArea).fontFamily};
            font-size: ${this.currentFontSize}px;
            line-height: ${getComputedStyle(this.textArea).lineHeight};
            white-space: pre;
        `;
        tempElement.textContent = 'M'; // Use 'M' as it's typically the widest character
        document.body.appendChild(tempElement);
        
        const charWidth = tempElement.offsetWidth;
        const lineHeight = tempElement.offsetHeight;
        
        document.body.removeChild(tempElement);
        
        // Calculate layout
        this.charsPerLine = Math.floor(containerWidth / charWidth);
        this.maxLines = Math.floor(containerHeight / lineHeight);
        
        // Ensure minimum values
        this.charsPerLine = Math.max(this.charsPerLine, 10);
        this.maxLines = Math.max(this.maxLines, 3);
    }
    
    /**
     * Handle text input and update display
     */
    handleInput(event) {
        event.preventDefault();
        
        // Get the actual content
        const newText = this.textArea.textContent || '';
        this.currentText = newText;
        this.cursorPosition = this.getCaretPosition();
        
        // Check for RTL text (Hebrew detection)
        this.detectRTL();
        
        // Update font size based on word count
        this.updateFontSize();
        
        // Format and display text
        this.updateDisplay();
        
        // Update cursor position
        this.updateCursor();
    }
    
    /**
     * Handle special key presses
     */
    handleKeyDown(event) {
        switch (event.key) {
            case 'Backspace':
                event.preventDefault();
                this.handleBackspace();
                break;
            case 'Delete':
                event.preventDefault();
                this.handleDelete();
                break;
            case 'ArrowLeft':
                event.preventDefault();
                this.moveCursor(-1);
                break;
            case 'ArrowRight':
                event.preventDefault();
                this.moveCursor(1);
                break;
            case 'ArrowUp':
                event.preventDefault();
                this.moveCursor(-this.charsPerLine);
                break;
            case 'ArrowDown':
                event.preventDefault();
                this.moveCursor(this.charsPerLine);
                break;
            case 'Home':
                event.preventDefault();
                this.moveCursorToLineStart();
                break;
            case 'End':
                event.preventDefault();
                this.moveCursorToLineEnd();
                break;
            default:
                if (event.key.length === 1 && !event.ctrlKey && !event.altKey && !event.metaKey) {
                    event.preventDefault();
                    this.insertCharacter(event.key);
                }
                break;
        }
    }
    
    /**
     * Handle paste events
     */
    handlePaste(event) {
        event.preventDefault();
        const pastedText = (event.clipboardData || window.clipboardData).getData('text');
        this.insertText(pastedText);
    }
    
    /**
     * Insert a single character at cursor position
     */
    insertCharacter(char) {
        this.currentText = this.currentText.slice(0, this.cursorPosition) + 
                          char + 
                          this.currentText.slice(this.cursorPosition);
        this.cursorPosition++;
        
        this.detectRTL();
        this.updateFontSize();
        this.updateDisplay();
        this.updateCursor();
    }
    
    /**
     * Insert text at cursor position
     */
    insertText(text) {
        this.currentText = this.currentText.slice(0, this.cursorPosition) + 
                          text + 
                          this.currentText.slice(this.cursorPosition);
        this.cursorPosition += text.length;
        
        this.detectRTL();
        this.updateFontSize();
        this.updateDisplay();
        this.updateCursor();
    }
    
    /**
     * Handle backspace
     */
    handleBackspace() {
        if (this.cursorPosition > 0) {
            this.currentText = this.currentText.slice(0, this.cursorPosition - 1) + 
                              this.currentText.slice(this.cursorPosition);
            this.cursorPosition--;
            
            this.updateFontSize();
            this.updateDisplay();
            this.updateCursor();
        }
    }
    
    /**
     * Handle delete
     */
    handleDelete() {
        if (this.cursorPosition < this.currentText.length) {
            this.currentText = this.currentText.slice(0, this.cursorPosition) + 
                              this.currentText.slice(this.cursorPosition + 1);
            
            this.updateDisplay();
            this.updateCursor();
        }
    }
    
    /**
     * Move cursor by offset
     */
    moveCursor(offset) {
        this.cursorPosition = Math.max(0, Math.min(this.currentText.length, this.cursorPosition + offset));
        this.updateCursor();
    }
    
    /**
     * Move cursor to start of current line
     */
    moveCursorToLineStart() {
        const currentLine = Math.floor(this.cursorPosition / this.charsPerLine);
        this.cursorPosition = currentLine * this.charsPerLine;
        this.updateCursor();
    }
    
    /**
     * Move cursor to end of current line
     */
    moveCursorToLineEnd() {
        const currentLine = Math.floor(this.cursorPosition / this.charsPerLine);
        const lineEnd = Math.min((currentLine + 1) * this.charsPerLine - 1, this.currentText.length);
        this.cursorPosition = lineEnd;
        this.updateCursor();
    }
    
    /**
     * Detect if text contains Hebrew characters
     */
    detectRTL() {
        const hebrewRegex = /[\u0590-\u05FF]/;
        const newIsRTL = hebrewRegex.test(this.currentText);
        
        if (newIsRTL !== this.isRTL) {
            this.isRTL = newIsRTL;
            this.textArea.classList.toggle('rtl', this.isRTL);
        }
    }
    
    /**
     * Update font size based on word count
     */
    updateFontSize() {
        const wordCount = this.countWords();
        
        if (wordCount <= this.MIN_WORDS_ON_SCREEN) {
            this.currentFontSize = this.INITIAL_FONT_SIZE;
        } else if (wordCount >= this.MAX_WORDS_ON_SCREEN) {
            this.currentFontSize = this.MIN_FONT_SIZE;
        } else {
            // Linear interpolation between min and max
            const ratio = (wordCount - this.MIN_WORDS_ON_SCREEN) / (this.MAX_WORDS_ON_SCREEN - this.MIN_WORDS_ON_SCREEN);
            this.currentFontSize = this.INITIAL_FONT_SIZE - (this.INITIAL_FONT_SIZE - this.MIN_FONT_SIZE) * ratio;
        }
        
        this.textArea.style.fontSize = `${this.currentFontSize}px`;
        this.calculateLayout();
    }
    
    /**
     * Count words in current text
     */
    countWords() {
        if (!this.currentText.trim()) return 0;
        return this.currentText.trim().split(/\s+/).length;
    }
    
    /**
     * Format text into fixed-width lines and update display
     */
    updateDisplay() {
        if (!this.currentText) {
            this.textArea.textContent = '';
            return;
        }
        
        // Break text into fixed-width lines (character-based, not word-based)
        const lines = [];
        for (let i = 0; i < this.currentText.length; i += this.charsPerLine) {
            lines.push(this.currentText.slice(i, i + this.charsPerLine));
        }
        
        // Handle scrolling when we reach max words
        const wordCount = this.countWords();
        if (wordCount >= this.MAX_WORDS_ON_SCREEN) {
            this.textArea.classList.add('scrollable');
            
            // Auto-scroll to keep current line visible
            const currentLine = Math.floor(this.cursorPosition / this.charsPerLine);
            if (currentLine >= this.maxLines) {
                const scrollToLine = currentLine - this.maxLines + 2;
                this.textArea.scrollTop = scrollToLine * this.currentFontSize * 1.2;
            }
        } else {
            this.textArea.classList.remove('scrollable');
            this.textArea.scrollTop = 0;
        }
        
        // Update text content
        this.textArea.textContent = lines.join('\n');
    }
    
    /**
     * Update cursor position visually
     */
    updateCursor() {
        if (this.charsPerLine === 0) return;
        
        const line = Math.floor(this.cursorPosition / this.charsPerLine);
        const column = this.cursorPosition % this.charsPerLine;
        
        const charWidth = this.currentFontSize * 0.6; // Approximate character width
        const lineHeight = this.currentFontSize * 1.2;
        
        const textAreaRect = this.textArea.getBoundingClientRect();
        const scrollTop = this.textArea.scrollTop;
        
        let x, y;
        
        if (this.isRTL) {
            x = textAreaRect.right - (column + 1) * charWidth - textAreaRect.left;
        } else {
            // Center the cursor based on text alignment
            const textWidth = Math.min(this.currentText.length, this.charsPerLine) * charWidth;
            const startX = (textAreaRect.width - textWidth) / 2;
            x = startX + column * charWidth;
        }
        
        y = line * lineHeight - scrollTop;
        
        this.cursor.style.left = `${x}px`;
        this.cursor.style.top = `${y}px`;
        this.cursor.style.height = `${lineHeight}px`;
    }
    
    /**
     * Get current caret position (fallback for contenteditable)
     */
    getCaretPosition() {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return this.cursorPosition;
        
        const range = selection.getRangeAt(0);
        const preCaretRange = range.cloneRange();
        preCaretRange.selectNodeContents(this.textArea);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        
        return preCaretRange.toString().length;
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new WritingApp();
});
