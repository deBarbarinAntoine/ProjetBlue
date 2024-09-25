// setting the game variables
let board = [];
let width = 14;
let height = 14;
const cellWidth = 48;
let boardLength = width * height;
let mineNb = 30;
const mine = 'M';
const tiles = ['clay.png', 'forest.png', 'grass.png', 'mountain.png', 'sand.png'];
const boardElem = document.querySelector('#game-board');
let revealedCount = 0;
let totalPlayerStrength = 1_000;
let playerStrength = 1_000;
let opponentStrength = 700;
const recapInfo = document.querySelector('.recap-info');
const maxTime = Math.floor(boardLength / 2);
let time = maxTime;
const timer = document.querySelector('#timer');
let isPaused = true;

function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getNeighborIndices(index) {

    index = Number(index);

    const neighbors = [];

    // Get row and column indices
    const row = Math.floor(index / width);
    const col = index % width;

    // Calculate indices of neighboring cells, considering edge cases
    if (row > 0) {
        neighbors.push(index - width); // Top
        if (col > 0) {
            neighbors.push(index - width - 1); // Top-left
        }
        if (col < width - 1) {
            neighbors.push(index - width + 1); // Top-right
        }
    }
    if (row < height - 1) {
        neighbors.push(index + width); // Bottom
        if (col > 0) {
            neighbors.push(index + width - 1); // Bottom-left
        }
        if (col < width - 1) {
            neighbors.push(index + width + 1); // Bottom-right
        }
    }
    if (col > 0) {
        neighbors.push(index - 1); // Left
    }
    if (col < width - 1) {
        neighbors.push(index + 1); // Right
    }

    return neighbors;
}


function calcMine(index) {
    const neighbors = getNeighborIndices(index);
    for (let i = 0; i < neighbors.length; i++) {
        if (board[neighbors[i]] !== mine) {
            board[neighbors[i]] += 1;
        }
    }
}

function initBoard() {
    board = new Array(boardLength);
    for (let i = 0; i < boardLength; i++) {
        board[i] = 0;
    }
    for (let i = 0; i < mineNb; i++) {
        let random = randomIntFromInterval(0, boardLength - 1);
        if (board[random] !== mine) {
            board[random] = mine;
            calcMine(random);
            continue;
        }
        --i;
    }
    revealedCount = 0;
}

function printBoardDebug(board) {
    for (let i = 0; i < board.length; i += width) {
        const row = board.slice(i, i + width);
        const concatenatedRow = row.join(' '); // Join elements with a space
        console.log(concatenatedRow);
    }
}

function clearEventListeners(elem) {
    console.log(`clear events for cell ${elem.dataset.id}`);
    // cloning the cell to remove the eventListeners
    const elemClone = elem.cloneNode(true);
    elem.parentNode.replaceChild(elemClone, elem);
    return  elemClone;
}

function endGame() {
    for (let i = 0; i < board.length; i++) {
        const cell = document.querySelector(`.cell[data-id='${i}']`);
        clearEventListeners(cell).addEventListener('contextmenu', (e) => e.preventDefault());
    }
    console.log('Game Over');
}

function updateTimer() {
    timer.innerText = `Time: ${time}s`;
}

function startTimer() {
    isPaused = false;
    const interval = setInterval(function() {
        if(!isPaused) {
            --time;
            updateTimer();
        }
        if (time <= 0) {
            clearInterval(interval);
            endGame();
        }
    }, 1000);
}

function addTileImg(cell) {
    const tile = tiles[randomIntFromInterval(0, tiles.length - 1)];
    cell.innerHTML = `<img class="cell-image" src="/static/minesweeper/${tile}" alt="tile image">`;
}

function revealBlankCell() {
    const cells = document.querySelectorAll('.cell');
    let isFound = false;
    while (!isFound) {
        const i = randomIntFromInterval(0, cells.length - 1);
        const value = board[cells[i].dataset.id];
        if (!isNaN(value) && value === 0) {
            revealCell(cells[i]);
            isFound = true;
        }
    }
}

function displayBlankBoard() {
    boardElem.innerHTML = '';
    boardElem.style.gridTemplateColumns = `repeat(${width}, ${cellWidth}px)`;
    boardElem.style.width = 'fit-content';
    boardElem.style.height = 'fit-content';
    for (let i = 0; i < boardLength; i++) {
        const cellElem = document.createElement('div');
        cellElem.classList.add('cell');
        addTileImg(cellElem);
        cellElem.setAttribute('data-id', `${i}`);
        boardElem.appendChild(cellElem);
    }
}

function revealedCellClickEvent(cell) {
    cell.addEventListener('dblclick', () => {

        const neighbors = getNeighborIndices(cell.dataset.id);
        let freeCells = [];
        let flaggedCellsNb = 0;
        for (let i = 0; i < neighbors.length; i++) {
            const neighbor = document.querySelector(`.cell[data-id='${neighbors[i]}']`);
            if (!neighbor.classList.contains('revealed') && !neighbor.classList.contains('flagged')) {
                freeCells.push(neighbor);
            } else if (neighbor.classList.contains('flagged')) {
                ++flaggedCellsNb;
            }
        }
        if (freeCells.length === 0) {
            return;
        }
        if (flaggedCellsNb === Number(cell.dataset.mineNb)) {
            freeCells.forEach(cell => revealCell(cell));
        }
    });
    cell.addEventListener('contextmenu', (e) => e.preventDefault());
}

function clickEvents(cell) {
    cell.addEventListener('contextmenu', (e) => {
        e.preventDefault();

        if (cell.classList.contains('flagged')) {
            cell.innerHTML = '';
        } else {
            cell.innerHTML = '<img class="cell-image" src="/static/minesweeper/flag.png" alt="flag image">';
        }
        cell.classList.toggle('flagged');
    });
    cell.addEventListener('click', () => {

        if (!cell.classList.contains('flagged')) {
            revealCell(cell);
        }
    });
}

// completion percentage
function updateCompletion(){
    let val = 100 - Math.floor(100 * revealedCount / ((width * height) - mineNb));
    const circle = document.querySelector('#svg #bar');

    const r = parseInt(circle.getAttribute('r'));
    const c = Math.PI*(r*2);

    if (val < 0) { val = 0;}
    if (val > 100) { val = 100;}

    const pct = ((val)/100)*c;
    playerStrength = totalPlayerStrength * (1 - (val / 100));

    circle.style = `stroke-dashoffset: ${pct}`;

    document.querySelector('#cont').setAttribute('data-pct', `${Math.floor(playerStrength)}`);
}

function revealCell(cell) {
    cell = clearEventListeners(cell);

    cell.classList.add('revealed');
    const value = board[cell.dataset.id];
    switch (value) {

        case 1: case 2: case 3: case 4: case 5: case 6: case 7: case 8:
            cell.innerHTML = '';
            cell.innerText = value;
            cell.dataset.mineNb = `${value}`;
            ++revealedCount;
            updateCompletion();
            break;

        case 'M':
            cell.innerHTML = '<img class="cell-image" src="/static/minesweeper/mine.svg" alt="mine image">';
            cell.classList.add('mine');
            revealAll();
            isPaused = true;
            return;

        default:
            cell.innerHTML = '';
            const neighbors = getNeighborIndices(cell.dataset.id);
            ++revealedCount;
            updateCompletion();

            for (let i = 0; i < neighbors.length; i++) {
                const neighbor = document.querySelector(`.cell[data-id='${neighbors[i]}']`);

                if (!neighbor.classList.contains('revealed')) {
                    revealCell(neighbor);
                }
            }
    }
    revealedCellClickEvent(cell);
}

function revealAll() {
    for (let i = 0; i < boardLength; i++) {
        if (board[i] === mine) {
            let cell = document.querySelector(`.cell[data-id='${i}']`);
            cell = clearEventListeners(cell);
            cell.classList.add('revealed');
            cell.innerHTML = '<img class="cell-image" src="/static/minesweeper/mine.svg" alt="mine image">';
            cell.addEventListener('contextmenu', (e) => e.preventDefault());
        } else {
            let cell = document.querySelector(`.cell[data-id='${i}']`);
            cell = clearEventListeners(cell);
            cell.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    }
}

function initPlayers() {
    totalPlayerStrength = playerStrength = 1_000;
    opponentStrength = 700;
    const opponent = document.querySelector('.opponent .strength');
    opponent.innerText = `${opponentStrength}`;
}

function play() {
    initBoard();
    initPlayers();
    updateCompletion();
    recapInfo.style.display = 'flex';

    // DEBUG
    printBoardDebug(board);

    displayBlankBoard();

    // getting all cells
    const cells = document.querySelectorAll('.cell');

    // add event listener for every cell
    cells.forEach(cell => clickEvents(cell));

    startTimer();
    revealBlankCell();
}

const startBtn = document.querySelector('#start-btn');
startBtn.addEventListener('click', play);