// Mobile Native Bridge for JohorN Admin App (Android/Capacitor)
(function() {
    if (window.Capacitor) {
        console.log('[JohorN Admin App] Capacitor native environment detected.');

        // Initialize status bar style
        if (window.Capacitor.Plugins && window.Capacitor.Plugins.StatusBar) {
            const { StatusBar, Style } = window.Capacitor.Plugins;
            StatusBar.setStyle({ style: 'DARK' }).catch(() => {});
            StatusBar.setBackgroundColor({ color: '#0f172a' }).catch(() => {});
        }

        // Hardware Back Button Handler
        if (window.Capacitor.Plugins && window.Capacitor.Plugins.App) {
            const { App } = window.Capacitor.Plugins;
            App.addListener('backButton', ({ canGoBack }) => {
                // Check if any modal is currently open
                const openModals = document.querySelectorAll('.modal.show, .modal-backdrop, .dialog-active, [style*="display: block"]');
                const closeBtn = document.querySelector('.modal.show .btn-close, .modal.show .close, .modal.show [data-bs-dismiss="modal"]');
                
                if (closeBtn) {
                    closeBtn.click();
                    return;
                }

                if (window.history.length > 1 && canGoBack) {
                    window.history.back();
                } else {
                    // Prompt or minimize
                    if (confirm('JohorN 관리자 앱을 종료하시겠습니까?')) {
                        App.exitApp();
                    }
                }
            });
        }
    }
})();
