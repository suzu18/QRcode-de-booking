// メインロジック - 会議予約処理

// 会議室情報の定義
const MEETING_ROOMS = {
    'meetingroom101': {
        name: '101会議室',
        email: '101@example.com'
    },
    'meetingroom102': {
        name: '102会議室',
        email: '102@example.com'
    }
    // 他の会議室もここに追加
};

// 現在のページから会議室情報を取得
function getCurrentRoomInfo() {
    const pathname = window.location.pathname;
    const filename = pathname.split('/').pop().replace('.html', '');
    return MEETING_ROOMS[filename];
}

// 会議を予約する
async function bookMeeting(durationMinutes, roomEmail) {
    try {
        // ローディング表示
        showLoading(true);
        
        const token = await getAccessToken();
        const times = calculateMeetingTimes(durationMinutes);
        const roomInfo = getCurrentRoomInfo();
        
        // 会議のペイロード作成
        const meetingPayload = {
            subject: `${roomInfo.name} - ${durationMinutes}分会議`,
            start: {
                dateTime: times.start,
                timeZone: 'Asia/Tokyo'
            },
            end: {
                dateTime: times.end,
                timeZone: 'Asia/Tokyo'
            },
            location: {
                displayName: roomInfo.name
            },
            attendees: [
                {
                    emailAddress: {
                        address: roomEmail,
                        name: roomInfo.name
                    },
                    type: 'resource'
                }
            ],
            body: {
                contentType: 'text',
                content: `${roomInfo.name}での${durationMinutes}分会議です。`
            },
            isOnlineMeeting: false
        };

        // Microsoft Graph APIで会議を作成
        const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(meetingPayload)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`会議の作成に失敗しました: ${errorData.error?.message || response.statusText}`);
        }

        const createdEvent = await response.json();
        
        showSuccess(`会議が正常に予約されました！\n会議ID: ${createdEvent.id}`);
        
        // しばらくしてから予約状況を更新
        setTimeout(() => {
            updateRoomStatus();
        }, 2000);
        
    } catch (error) {
        console.error('会議予約エラー:', error);
        showError(`会議の予約に失敗しました: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// 会議室の現在の状況を取得
async function updateRoomStatus() {
    try {
        const token = await getAccessToken();
        const roomInfo = getCurrentRoomInfo();
        
        // 現在時刻から2時間後までの予定を取得
        const now = new Date();
        const endTime = new Date(now.getTime() + (2 * 60 * 60 * 1000));
        
        const startTimeStr = formatDateTime(now);
        const endTimeStr = formatDateTime(endTime);
        
        // 会議室の空き状況を取得
        const response = await fetch(`https://graph.microsoft.com/v1.0/me/calendar/getSchedule`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                schedules: [roomInfo.email],
                startTime: {
                    dateTime: startTimeStr,
                    timeZone: 'Asia/Tokyo'
                },
                endTime: {
                    dateTime: endTimeStr,
                    timeZone: 'Asia/Tokyo'
                },
                availabilityViewInterval: 30
            })
        });

        if (response.ok) {
            const scheduleData = await response.json();
            displayRoomStatus(scheduleData);
        }
    } catch (error) {
        console.error('会議室状況取得エラー:', error);
    }
}

// 画面に会議室の状況を表示
function displayRoomStatus(scheduleData) {
    const statusDiv = document.getElementById('room-status');
    if (!statusDiv || !scheduleData.value || scheduleData.value.length === 0) {
        return;
    }
    
    const schedule = scheduleData.value[0];
    const busyTimes = schedule.busyViewTimes;
    
    let statusText = '現在この会議室は空いています';
    let statusClass = 'available';
    
    if (busyTimes && busyTimes.length > 0) {
        const now = new Date();
        const currentBusy = busyTimes.find(busy => {
            const start = new Date(busy.start.dateTime);
            const end = new Date(busy.end.dateTime);
            return now >= start && now <= end;
        });
        
        if (currentBusy) {
            const endTime = new Date(currentBusy.end.dateTime);
            statusText = `現在使用中です（${endTime.toLocaleTimeString('ja-JP', {hour: '2-digit', minute: '2-digit'})}まで）`;
            statusClass = 'busy';
        }
    }
    
    statusDiv.innerHTML = `<span class="status ${statusClass}">${statusText}</span>`;
}

// ローディング表示制御
function showLoading(show) {
    const loadingElements = document.querySelectorAll('.loading');
    const buttons = document.querySelectorAll('button:not(#logoutBtn)');
    
    loadingElements.forEach(el => {
        if (show) {
            el.classList.remove('hidden');
        } else {
            el.classList.add('hidden');
        }
    });
    
    buttons.forEach(btn => {
        btn.disabled = show;
    });
}

// ページ読み込み時の初期化
document.addEventListener('DOMContentLoaded', function() {
    // 認証チェック
    if (!requireAuth()) {
        return;
    }
    
    // 会議室情報の表示
    const roomInfo = getCurrentRoomInfo();
    if (roomInfo) {
        const roomNameElement = document.getElementById('room-name');
        if (roomNameElement) {
            roomNameElement.textContent = roomInfo.name;
        }
    }
    
    // 予約ボタンのイベントリスナー設定
    const book30MinBtn = document.getElementById('book30min');
    const book60MinBtn = document.getElementById('book60min');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (book30MinBtn) {
        book30MinBtn.addEventListener('click', () => {
            bookMeeting(30, roomInfo.email);
        });
    }
    
    if (book60MinBtn) {
        book60MinBtn.addEventListener('click', () => {
            bookMeeting(60, roomInfo.email);
        });
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
    
    // 初期状態で会議室の状況を取得
    updateRoomStatus();
    
    // 5分ごとに会議室の状況を更新
    setInterval(updateRoomStatus, 5 * 60 * 1000);
});