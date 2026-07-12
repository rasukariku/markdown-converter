import { dom } from '../core/state.js';

// =========================================================================
// MODULE-LEVEL CONSTANTS
// =========================================================================

// Extract magic numbers to improve maintainability and clarify UI constraints
const DRAG_BOUNDARY_PX = 15;
const DRAG_THRESHOLD_PX = 5;
const FAB_MENU_HEIGHT_APPROX_PX = 180;

// =========================================================================
// EXPORTED FUNCTIONS
// =========================================================================

/**
 * Initializes the draggable functionality for the Floating Action Button (FAB)
 * and its associated menu positioning logic.
 */
export function initializeDrag() {
    let isFabDragging = false;
    let fabOffsetX = 0;
    let fabOffsetY = 0;
    let fabDragDistance = 0;
    
    // Cache container dimensions to prevent synchronous layout recalculations (reflows)
    // during high-frequency mousemove events.
    let cachedContainerWidth = 0;
    let cachedContainerHeight = 0;

    dom.fabContainer.addEventListener('mousedown', (e) => {
        if (e.target.closest('.fab-menu')) return;
        
        isFabDragging = true;
        fabDragDistance = 0;
        
        const rect = dom.fabContainer.getBoundingClientRect();
        
        // Cache dimensions once at the start of the drag operation
        cachedContainerWidth = dom.fabContainer.offsetWidth;
        cachedContainerHeight = dom.fabContainer.offsetHeight;
        
        fabOffsetX = e.clientX - rect.left;
        fabOffsetY = e.clientY - rect.top;
        
        dom.fabContainer.style.bottom = 'auto';
        dom.fabContainer.style.right = 'auto';
        dom.fabContainer.style.margin = '0';
        dom.fabContainer.style.left = `${rect.left}px`;
        dom.fabContainer.style.top = `${rect.top}px`;
    });

    document.addEventListener('mousemove', (e) => {
        if (!isFabDragging) return;
        
        fabDragDistance++;
        
        const newLeft = e.clientX - fabOffsetX;
        const newTop = e.clientY - fabOffsetY;
        
        // Use cached dimensions to avoid triggering layout thrashing
        const boundedLeft = Math.max(
            DRAG_BOUNDARY_PX, 
            Math.min(newLeft, window.innerWidth - cachedContainerWidth - DRAG_BOUNDARY_PX)
        );
        const boundedTop = Math.max(
            DRAG_BOUNDARY_PX, 
            Math.min(newTop, window.innerHeight - cachedContainerHeight - DRAG_BOUNDARY_PX)
        );
        
        dom.fabContainer.style.left = `${boundedLeft}px`;
        dom.fabContainer.style.top = `${boundedTop}px`;
    });

    document.addEventListener('mouseup', () => {
        if (isFabDragging) {
            isFabDragging = false;
        }
    });

    function updateFabMenuPosition() {
        const rect = dom.fabContainer.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        
        dom.fabMenu.classList.remove('open-up', 'open-down');
        
        if (spaceBelow < FAB_MENU_HEIGHT_APPROX_PX) {
            dom.fabMenu.classList.add('open-up');
        } else {
            dom.fabMenu.classList.add('open-down');
        }
    }

    updateFabMenuPosition();

    dom.fabMainBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        if (fabDragDistance < DRAG_THRESHOLD_PX) {
            updateFabMenuPosition();
            dom.fabMenu.classList.toggle('active');
        }
    });

    document.addEventListener('click', (e) => {
        if (dom.fabMenu.classList.contains('active') && !e.target.closest('#fab-container')) {
            dom.fabMenu.classList.remove('active');
        }
    });
}