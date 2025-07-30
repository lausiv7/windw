// [의도] 프리뷰 WebView의 UI 동작을 담당합니다.
// [책임] iframe을 통한 개발서버 로드, 새로고침, URL 변경, 상태 표시 등의 프리뷰 관련 모든 UI 로직 처리

(function() {
    // VS Code와 통신하기 위한 API 객체 획득
    const vscode = acquireVsCodeApi();

    // DOM 요소들
    const urlInput = document.getElementById('url-input');
    const reloadButton = document.getElementById('reload-button');
    const statusIndicator = document.getElementById('status-indicator');
    const previewFrame = document.getElementById('preview-frame');
    const loadingOverlay = document.getElementById('loading-overlay');
    const errorOverlay = document.getElementById('error-overlay');
    const errorUrl = document.getElementById('error-url');
    const retryButton = document.getElementById('retry-button');

    // 현재 상태
    let currentUrl = 'http://localhost:9003';
    let isLoading = false;

    // Phase 3: WebView 준비 완료 알림
    vscode.postMessage({ 
        type: 'preview:ready',
        timestamp: Date.now()
    });

    // Extension으로부터 메시지 수신
    window.addEventListener('message', event => {
        const message = event.data;
        console.log('[PreviewWebView] Received message:', message);
        
        switch (message.type) {
            case 'preview:load':
                if (message.data?.url) {
                    loadPreview(message.data.url);
                }
                break;
                
            case 'preview:reload':
                reloadPreview();
                break;
                
            case 'error':
                handleError(message.data?.message || 'Unknown error');
                break;
        }
    });

    // URL 입력 필드 변경 이벤트
    urlInput.addEventListener('change', () => {
        const newUrl = urlInput.value.trim();
        if (newUrl && newUrl !== currentUrl) {
            vscode.postMessage({
                type: 'preview:changeUrl',
                data: { url: newUrl },
                timestamp: Date.now()
            });
        }
    });

    urlInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const newUrl = urlInput.value.trim();
            if (newUrl && newUrl !== currentUrl) {
                vscode.postMessage({
                    type: 'preview:changeUrl',
                    data: { url: newUrl },
                    timestamp: Date.now()
                });
            }
        }
    });

    // 새로고침 버튼 이벤트
    reloadButton.addEventListener('click', () => {
        vscode.postMessage({
            type: 'preview:reload',
            timestamp: Date.now()
        });
    });

    // 재시도 버튼 이벤트
    retryButton.addEventListener('click', () => {
        loadPreview(currentUrl);
    });

    // 프리뷰 로드 함수
    function loadPreview(url) {
        currentUrl = url;
        urlInput.value = url;
        
        showLoading();
        updateStatus('loading');
        
        console.log(`[PreviewWebView] Loading preview: ${url}`);
        
        // iframe src 설정
        previewFrame.src = url;
        
        // 로드 상태 체크를 위한 타이머 설정
        const timeout = setTimeout(() => {
            if (isLoading) {
                showError(`Failed to load: ${url}`);
                updateStatus('error');
            }
        }, 10000); // 10초 타임아웃

        // iframe 로드 완료 이벤트
        previewFrame.onload = () => {
            clearTimeout(timeout);
            hideLoading();
            hideError();
            updateStatus('success');
            console.log(`[PreviewWebView] Successfully loaded: ${url}`);
        };

        // iframe 에러 이벤트
        previewFrame.onerror = () => {
            clearTimeout(timeout);
            showError(`Failed to load: ${url}`);
            updateStatus('error');
        };
    }

    // 프리뷰 새로고침 함수
    function reloadPreview() {
        if (currentUrl) {
            console.log(`[PreviewWebView] Reloading preview: ${currentUrl}`);
            loadPreview(currentUrl);
        }
    }

    // 로딩 상태 표시
    function showLoading() {
        isLoading = true;
        loadingOverlay.style.display = 'flex';
        hideError();
    }

    function hideLoading() {
        isLoading = false;
        loadingOverlay.style.display = 'none';
    }

    // 에러 상태 표시
    function showError(message) {
        hideLoading();
        errorUrl.textContent = currentUrl;
        errorOverlay.style.display = 'flex';
        console.error('[PreviewWebView] Error:', message);
    }

    function hideError() {
        errorOverlay.style.display = 'none';
    }

    // 상태 표시기 업데이트
    function updateStatus(status) {
        statusIndicator.className = `status-${status}`;
        
        switch (status) {
            case 'success':
                statusIndicator.title = 'Preview loaded successfully';
                break;
            case 'loading':
                statusIndicator.title = 'Loading preview...';
                break;
            case 'error':
                statusIndicator.title = 'Failed to load preview';
                break;
            default:
                statusIndicator.title = 'Preview status unknown';
        }
    }

    // 에러 처리
    function handleError(message) {
        showError(message);
        updateStatus('error');
    }

    // 초기 상태 설정
    updateStatus('unknown');
    
    console.log('[PreviewWebView] Phase 3 Preview WebView initialized');
}());