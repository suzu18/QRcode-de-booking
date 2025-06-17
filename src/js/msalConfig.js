// MSAL設定
const msalConfig = {
    auth: {
        clientId: process.env.AZURE_CLIENT_ID || 'YOUR_CLIENT_ID_HERE', // Azure Portalから取得
        authority: `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID || 'YOUR_TENANT_ID_HERE'}`,
        redirectUri: process.env.AZURE_REDIRECT_URI || window.location.origin + '/index.html',
        navigateToLoginRequestUrl: true
    },
    cache: {
        cacheLocation: "sessionStorage",
        storeAuthStateInCookie: false
    },
    system: {
        loggerOptions: {
            loggerCallback: (level, message, containsPii) => {
                if (containsPii) {
                    return;
                }
                switch (level) {
                    case msal.LogLevel.Error:
                        console.error(message);
                        return;
                    case msal.LogLevel.Info:
                        console.info(message);
                        return;
                    case msal.LogLevel.Verbose:
                        console.debug(message);
                        return;
                    case msal.LogLevel.Warning:
                        console.warn(message);
                        return;
                }
            }
        }
    }
};

// MSALインスタンスの作成
const msalInstance = new msal.PublicClientApplication(msalConfig);

// リダイレクト後の処理
msalInstance.handleRedirectPromise().then((response) => {
    if (response) {
        console.log('ログイン成功:', response);
        // ログイン後、会議室ページにリダイレクト
        if (window.location.pathname === '/index.html' || window.location.pathname === '/') {
            window.location.href = 'meetingroom101.html';
        }
    }
}).catch((error) => {
    console.error('リダイレクト処理エラー:', error);
});

// Graph APIリクエスト用のスコープ
const graphScopes = {
    scopes: ['User.Read', 'Calendars.ReadWrite']
};