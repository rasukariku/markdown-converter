/**
 * Centralized DOM references and application state.
 * 
 * NOTE: Using dynamic getters ensures that the DOM elements are queried
 * lazily upon access. This completely prevents null reference crashes
 * caused by script execution order or early evaluation.
 */

export const dom = {
    // Editor Inputs & Outputs
    get rawMarkdownInput() { return document.getElementById('raw-markdown'); },
    get universalMarkdownInput() { return document.getElementById('universal-markdown'); },
    get renderedOutput() { return document.getElementById('rendered-output'); },
    get hiddenFormInput() { return document.getElementById('hiddenMarkdownInput'); },
    
    // UI Components
    get mainToolbar() { return document.getElementById('main-toolbar'); },
    get typewriterTitle() { return document.getElementById('typewriter-title'); },
    get iconExpand() { return document.getElementById('icon-expand'); },
    get btnFullscreen() { return document.querySelector('#btn-fullscreen svg'); },
    get editorContainer() { return document.querySelector('.editor-container'); },
    get tableFloatMenu() { return document.getElementById('table-float-menu'); },
    
    // Statistics
    get selectionInfo() { return document.getElementById('selection-info'); },
    get charCount() { return document.getElementById('char-count'); },
    get wordCount() { return document.getElementById('word-count'); },
    get sentenceCount() { return document.getElementById('sentence-count'); },
    get paragraphCount() { return document.getElementById('paragraph-count'); },
    get readTime() { return document.getElementById('read-time'); },
    get wordCounterPill() { return document.getElementById('word-counter-pill'); },
    
    // FAB (Floating Action Button) Menu
    get fabContainer() { return document.getElementById('fab-container'); },
    get fabMenu() { return document.getElementById('fab-menu'); },
    get fabMainBtn() { return document.getElementById('fab-main-btn'); },
    get cycleText() { return document.getElementById('cycle-text'); },
    
    // Status & Forms
    get autoSaveStatus() { return document.getElementById('auto-save-status'); },
    get convertForm() { return document.getElementById('convertForm'); }
};

export const state = {
    savedSelection: null,
    isSyncing: false
};