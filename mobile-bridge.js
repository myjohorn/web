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
                // 1. Check if any admin modal is open
                const openAdminModals = Array.from(document.querySelectorAll('.admin-modal, .modal')).filter(m => {
                    const style = window.getComputedStyle(m);
                    return style.display === 'flex' || style.display === 'block';
                });

                if (openAdminModals.length > 0) {
                    const topModal = openAdminModals[openAdminModals.length - 1];
                    const closeBtn = topModal.querySelector('.close-modal-btn, .btn-close, .close');
                    if (closeBtn) {
                        closeBtn.click();
                    } else {
                        topModal.style.display = 'none';
                    }
                    return;
                }

                // 2. Navigation history or Exit prompt
                if (window.history.length > 1 && canGoBack) {
                    window.history.back();
                } else {
                    if (confirm('JohorN 관리자 앱을 종료하시겠습니까?')) {
                        App.exitApp();
                    }
                }
            });
        }
    }
})();
