/**
 * Centralized DOM references and application state.
 * 
 * WARNING: This module executes immediately upon import. 
 * Ensure the DOM is fully parsed before importing this module, 
 * or all references will resolve to null.
 */

export const dom = {
    // Editor Inputs & Outputs
    rawMarkdownInput: document.getElementById('raw-markdown'),
    universalMarkdownInput: document.getElementById('universal-markdown'),
    renderedOutput: document.getElementById('rendered-output'),
    hiddenFormInput: document.getElementById('hiddenMarkdownInput'),
    
    // UI Components
    mainToolbar: document.getElementById('main-toolbar'),
    typewriterTitle: document.getElementById('typewriter-title'),
    iconExpand: document.getElementById('icon-expand'),
    btnFullscreen: document.querySelector('#btn-fullscreen svg'),
    editorContainer: document.querySelector('.editor-container'),
    tableFloatMenu: document.getElementById('table-float-menu'),
    
    // Statistics
    selectionInfo: document.getElementById('selection-info'),
    charCount: document.getElementById('char-count'),
    wordCount: document.getElementById('word-count'),
    sentenceCount: document.getElementById('sentence-count'),
    paragraphCount: document.getElementById('paragraph-count'),
    readTime: document.getElementById('read-time'),
    wordCounterPill: document.getElementById('word-counter-pill'),
    
    // FAB (Floating Action Button) Menu
    fabContainer: document.getElementById('fab-container'),
    fabMenu: document.getElementById('fab-menu'),
    fabMainBtn: document.getElementById('fab-main-btn'),
    cycleText: document.getElementById('cycle-text'),
    
    // Status & Forms
    autoSaveStatus: document.getElementById('auto-save-status'),
    convertForm: document.getElementById('convertForm')
};

export const state = {
    savedSelection: null,
    isSyncing: false
};