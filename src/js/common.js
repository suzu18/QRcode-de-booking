// 共通関数

// 認証状態をチェック
function isAuthenticated() {
    const accounts = msalInstance.getAllAccounts();
    return accounts.length > 0;
}

// 認証が必要なページでのガード
function requireAuth() {
    if (!isAuthenticated()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// アクセストークンを取得
async function getAccessToken() {
    try {
        const accounts = msalInstance.getAllAccounts();
        if (accounts.length === 0) {
            throw new Error('認証されていません');
        }

        const request = {
            ...graphScopes,
            account: accounts[0]
        };

        const response = await msalInstance.acquireTokenSilent(request);
        return response.accessToken;
    } catch (error) {
        console.error('トークン取得エラー:', error);
        // サイレント取得に失敗した場合はリダイレクトで再認証
        if (error instanceof msal.InteractionRequiredAuthError) {
            msalInstance.acquireTokenRedirect(graphScopes);
        }
        throw error;
    }
}

// ログアウト
function logout() {
    const logoutRequest = {
        account: msalInstance.getAllAccounts()[0],
        postLogoutRedirectUri: window.location.origin + '/index.html'
    };
    msalInstance.logoutRedirect(logoutRequest);
}

// 現在のユーザー情報を取得
async function getCurrentUser() {
    try {
        const token = await getAccessToken();
        const response = await fetch('https://graph.microsoft.com/v1.0/me', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('ユーザー情報取得エラー:', error);
        throw error;
    }
}

// 時間をフォーマット（ISO 8601形式）
function formatDateTime(date) {
    return date.toISOString();
}

// 会議の開始時間と終了時間を計算
function calculateMeetingTimes(durationMinutes) {
    const now = new Date();
    const startTime = new Date(now.getTime() + (5 * 60 * 1000)); // 5分後から開始
    const endTime = new Date(startTime.getTime() + (durationMinutes * 60 * 1000));
    
    return {
        start: formatDateTime(startTime),
        end: formatDateTime(endTime)
    };
}

// エラーメッセージを表示
function showError(message) {
    const errorDiv = document.getElementById('error-message');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert(message);
    }
}

// 成功メッセージを表示
function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    } else {
        alert(message);
    }
}