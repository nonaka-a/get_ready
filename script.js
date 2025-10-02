document.addEventListener('DOMContentLoaded', () => {
    // --- DOM要素の取得 ---
    const gridContainer = document.getElementById('grid-container');
    const stampButton = document.getElementById('stamp-button');
    const undoButton = document.getElementById('undo-button');
    const switchPageButton = document.getElementById('switch-page-button');
    const nameInput = document.getElementById('name-input');
    const rewardInputs = { 20: document.getElementById('reward-20'), 50: document.getElementById('reward-50'), 100: document.getElementById('reward-100') };
    const stampAnimationElement = document.getElementById('stamp-animation-img');
    const stampSoundElement = document.getElementById('stamp-sound');
    const effectsContainer = document.getElementById('effects-container');
    const milestoneModal = document.getElementById('milestone-modal');
    const milestoneText = document.getElementById('milestone-text');
    const milestoneCloseButton = document.getElementById('milestone-close-button');
    const milestoneSound = document.getElementById('milestone-sound');
    // ▼▼▼ ここから追加 ▼▼▼
    const stampChangeModal = document.getElementById('stamp-change-modal');
    const stampOptionsContainer = document.getElementById('stamp-options-container');
    const stampChangeCloseButton = document.getElementById('stamp-change-close-button');
    // ▲▲▲ ここまで追加 ▲▲▲

    // --- 変数定義 ---
    const TOTAL_CELLS = 100;
    const STAMP_COLORS = ['default', 'green', 'lightblue', 'purple', 'yellow', 'orange', 'blue', 'pink'];
    const FONT_SIZE_THRESHOLD = 30;
    
    let currentPageIndex = 0;
    let allPagesData = [];
    let isAnimating = false;
    let targetChangeCellNumber = null; // ★変更対象のマス番号を保持

    // --- データ構造のテンプレート ---
    const createNewPageData = () => ({
        userName: '',
        stampCount: 0,
        stampData: new Array(TOTAL_CELLS + 1).fill(null),
        rewards: { 20: '', 50: '', 100: '' }
    });
    
    // --- 関数定義 ---
    function updateGrid() {
        const currentStampData = allPagesData[currentPageIndex].stampData;
        for (let i = 1; i <= TOTAL_CELLS; i++) {
            const cell = gridContainer.querySelector(`[data-number='${i}']`);
            if (cell) {
                const color = currentStampData[i];
                if (color) {
                    cell.classList.add('stamped');
                    cell.style.backgroundImage = `url('images/stamp_mark_${color}.png')`;
                } else {
                    cell.classList.remove('stamped');
                    cell.style.backgroundImage = 'none';
                }
            }
        }
    }

    function renderPage() {
        const currentPageData = allPagesData[currentPageIndex];
        nameInput.value = currentPageData.userName;
        rewardInputs[20].value = currentPageData.rewards[20];
        rewardInputs[50].value = currentPageData.rewards[50];
        rewardInputs[100].value = currentPageData.rewards[100];
        Object.values(rewardInputs).forEach(adjustTextareaFontSize);
        updateSwitchButtonText();
        updateGrid();
    }

    function adjustTextareaFontSize(textarea) {
        if (textarea.value.length > FONT_SIZE_THRESHOLD) {
            textarea.classList.add('small-font');
        } else {
            textarea.classList.remove('small-font');
        }
    }

    function updateSwitchButtonText() {
        const nextPageName = allPagesData[(currentPageIndex + 1) % 2].userName || '2人目';
        switchPageButton.textContent = `${nextPageName}にきりかえ`;
    }

    function saveData() {
        const currentPageData = allPagesData[currentPageIndex];
        currentPageData.userName = nameInput.value;
        currentPageData.rewards[20] = rewardInputs[20].value;
        currentPageData.rewards[50] = rewardInputs[50].value;
        currentPageData.rewards[100] = rewardInputs[100].value;
        localStorage.setItem('appData', JSON.stringify(allPagesData));
        localStorage.setItem('lastPageIndex', currentPageIndex);
    }

    function loadData() {
        const savedData = localStorage.getItem('appData');
        if (savedData) {
            allPagesData = JSON.parse(savedData);
            if (!allPagesData[0] || !allPagesData[0].rewards) allPagesData[0] = createNewPageData();
            if (!allPagesData[1] || !allPagesData[1].rewards) allPagesData[1] = createNewPageData();
        } else {
            allPagesData = [createNewPageData(), createNewPageData()];
        }
        currentPageIndex = parseInt(localStorage.getItem('lastPageIndex')) || 0;
    }

    function initialize() {
        for (let i = 1; i <= TOTAL_CELLS; i++) {
            const cell = document.createElement('div');
            cell.classList.add('grid-cell');
            cell.textContent = i;
            cell.dataset.number = i;
            
            if (i <= 20) cell.classList.add('color-blue');
            else if (i <= 50) cell.classList.add('color-pink');

            if (i === 20) cell.classList.add('milestone-20');
            if (i === 50) cell.classList.add('milestone-50');
            if (i === 100) cell.classList.add('milestone-100');
            
            // ★各マスにクリックイベントを追加
            cell.addEventListener('click', onCellClick);

            gridContainer.appendChild(cell);
        }
        loadData();
        renderPage();
    }
    
    function chooseWeightedRandomColor() {
        const usageCounts = STAMP_COLORS.reduce((acc, color) => ({ ...acc, [color]: 0 }), {});
        allPagesData[currentPageIndex].stampData.forEach(color => {
            if (color && usageCounts.hasOwnProperty(color)) { usageCounts[color]++; }
        });
        const maxCount = Math.max(...Object.values(usageCounts));
        const weights = STAMP_COLORS.map(color => ({ color: color, weight: maxCount - usageCounts[color] + 1 }));
        const totalWeight = weights.reduce((sum, item) => sum + item.weight, 0);
        const randomThreshold = Math.random() * totalWeight;
        let cumulativeWeight = 0;
        for (const item of weights) {
            cumulativeWeight += item.weight;
            if (randomThreshold < cumulativeWeight) { return item.color; }
        }
        return STAMP_COLORS[Math.floor(Math.random() * STAMP_COLORS.length)];
    }

    function playStampAnimation() {
        const currentPageData = allPagesData[currentPageIndex];
        if (isAnimating || currentPageData.stampCount >= TOTAL_CELLS) return;
        if (!stampAnimationElement) { console.error("アニメーション用の画像要素が見つかりません。"); return; }
        isAnimating = true;
        stampButton.disabled = true;
        undoButton.disabled = true;
        const nextCellNumber = currentPageData.stampCount + 1;
        const targetCell = gridContainer.querySelector(`[data-number='${nextCellNumber}']`);
        if (!targetCell) { isAnimating = false; stampButton.disabled = false; undoButton.disabled = false; return; }
        const cellRect = targetCell.getBoundingClientRect();
        stampAnimationElement.style.top = `${cellRect.top + (cellRect.height / 2)}px`;
        stampAnimationElement.style.left = `${cellRect.left + (cellRect.width / 2)}px`;
        stampAnimationElement.classList.add('is-animating');
        stampAnimationElement.addEventListener('animationend', () => {
            currentPageData.stampCount++;
            const randomColor = chooseWeightedRandomColor();
            currentPageData.stampData[currentPageData.stampCount] = randomColor;
            stampSoundElement.currentTime = 0;
            stampSoundElement.play();
            updateGrid();
            saveData();
            const rect = targetCell.getBoundingClientRect();
            triggerSpecialEffects(rect.left + rect.width / 2, rect.top + rect.height / 2);
            if ([20, 50, 100].includes(currentPageData.stampCount)) {
                setTimeout(() => { showMilestonePopup(currentPageData.stampCount); }, 500);
            }
            stampAnimationElement.classList.remove('is-animating');
            isAnimating = false;
            stampButton.disabled = false;
            undoButton.disabled = false;
        }, { once: true });
    }

    // ▼▼▼ ここからスタンプ変更関連の関数を追加 ▼▼▼
    function onCellClick(event) {
        const cellNumber = parseInt(event.currentTarget.dataset.number);
        const stampColor = allPagesData[currentPageIndex].stampData[cellNumber];
        // スタンプが押されているマスをクリックした場合のみモーダルを開く
        if (stampColor) {
            openStampChangeModal(cellNumber);
        }
    }

    function openStampChangeModal(number) {
        targetChangeCellNumber = number;
        stampOptionsContainer.innerHTML = ''; // 中身を一度空にする

        const currentColor = allPagesData[currentPageIndex].stampData[number];

        STAMP_COLORS.forEach(color => {
            const option = document.createElement('div');
            option.classList.add('stamp-option');
            option.style.backgroundImage = `url('images/stamp_mark_${color}.png')`;
            
            if (color === currentColor) {
                option.classList.add('selected'); // 現在のスタンプに印をつける
            }

            option.addEventListener('click', () => {
                changeStamp(color);
            });
            stampOptionsContainer.appendChild(option);
        });

        stampChangeModal.classList.add('is-visible');
    }

    function closeStampChangeModal() {
        stampChangeModal.classList.remove('is-visible');
    }

    function changeStamp(newColor) {
        if (targetChangeCellNumber) {
            allPagesData[currentPageIndex].stampData[targetChangeCellNumber] = newColor;
            updateGrid();
            saveData();
            closeStampChangeModal();
        }
    }
    // ▲▲▲ ここまでスタンプ変更関連の関数 ▲▲▲

    function triggerSpecialEffects(x, y) {
        document.body.classList.add('is-shaking');
        setTimeout(() => { document.body.classList.remove('is-shaking'); }, 400);
        createConfetti();
    }
    function createConfetti() {
        const confettiCount = 50;
        const colors = ['#f44336', '#e91e63', '#9c27b0', '#2196f3', '#4caf50', '#ffeb3b', '#ff9800'];
        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.classList.add('confetti');
            confetti.style.left = `${Math.random() * 100}vw`;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = `${Math.random() * 2}s`;
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            effectsContainer.appendChild(confetti);
            confetti.addEventListener('animationend', () => confetti.remove());
        }
    }

    function showMilestonePopup(number) {
        milestoneText.innerHTML = `${number}こ たっせい！<br>おめでとう！`;
        milestoneModal.classList.add('is-visible');
        milestoneSound.currentTime = 0;
        milestoneSound.play();
    }
    function hideMilestonePopup() {
        milestoneModal.classList.remove('is-visible');
    }

    // --- イベントリスナー ---
    stampButton.addEventListener('click', playStampAnimation);
    undoButton.addEventListener('click', () => {
        const currentPageData = allPagesData[currentPageIndex];
        if (isAnimating || currentPageData.stampCount <= 0) return;
        currentPageData.stampData[currentPageData.stampCount] = null;
        currentPageData.stampCount--;
        updateGrid();
        saveData();
    });

    switchPageButton.addEventListener('click', () => {
        currentPageIndex = (currentPageIndex + 1) % 2;
        localStorage.setItem('lastPageIndex', currentPageIndex);
        renderPage();
    });

    nameInput.addEventListener('input', () => {
        allPagesData[currentPageIndex].userName = nameInput.value;
        updateSwitchButtonText();
        saveData();
    });

    Object.values(rewardInputs).forEach(textarea => {
        textarea.addEventListener('input', () => {
            adjustTextareaFontSize(textarea);
            saveData();
        });
    });
    
    milestoneCloseButton.addEventListener('click', hideMilestonePopup);
    
    // ▼▼▼ ここから追加 ▼▼▼
    stampChangeCloseButton.addEventListener('click', closeStampChangeModal);
    stampChangeModal.addEventListener('click', (event) => {
        // 背景の黒い部分をクリックした時だけ閉じる
        if (event.target === stampChangeModal) {
            closeStampChangeModal();
        }
    });
    // ▲▲▲ ここまで追加 ▲▲▲

    // --- 初期化処理の実行 ---
    initialize();
});