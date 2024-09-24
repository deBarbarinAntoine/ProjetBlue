
// setting the game variables
let board = [];
let width = 14;
let height = 14;
let boardLength = width * height;
let mineNb = 32;
let mine = 'M';


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
}

function printBoardDebug(board) {
    for (let i = 0; i < board.length; i += width) {
        const row = board.slice(i, i + width);
        const concatenatedRow = row.join(' '); // Join elements with a space
        console.log(concatenatedRow);
    }
}

// game and style variables
const cellWidth = 32;
const boardElem = document.querySelector('#game-board');

function timer() {

}

function displayBlankBoard() {
    boardElem.innerHTML = '';
    boardElem.style.gridTemplateColumns = `repeat(${width}, ${cellWidth}px)`;
    boardElem.style.width = 'fit-content';
    boardElem.style.height = 'fit-content';
    for (let i = 0; i < boardLength; i++) {
        const cellElem = document.createElement('div');
        cellElem.classList.add('cell');
        cellElem.setAttribute('data-id', `${i}`);
        boardElem.appendChild(cellElem);
    }
}

function clearEventListeners(elem) {

    // cloning the cell to remove the eventListeners
    const elemClone = elem.cloneNode(true);
    elem.parentNode.replaceChild(elemClone, elem);
    return  elemClone;
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
            cell.innerHTML = '<img class="mine-image" src="/static/flag.png" alt="flag image">';
        }
        cell.classList.toggle('flagged');
    });
    cell.addEventListener('click', () => {

        if (!cell.classList.contains('flagged')) {
            revealCell(cell);
        }
    });
}

function revealCell(cell) {
    cell = clearEventListeners(cell);

    cell.classList.add('revealed');
    const value = board[cell.dataset.id];
    switch (value) {

        case 1: case 2: case 3: case 4: case 5: case 6: case 7: case 8:
            cell.innerText = value;
            cell.dataset.mineNb = `${value}`;
            break;

        case 'M':
            cell.innerHTML = '<img class="mine-image" src="/static/mine.svg" alt="mine image">';
            cell.classList.add('mine');
            revealAll();
            return;

        default:
            const neighbors = getNeighborIndices(cell.dataset.id);

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
            let cell = document.querySelector(`.cell[data-id='${i}'`);
            cell = clearEventListeners(cell);
            cell.classList.add('revealed');
            cell.innerHTML = '<img class="mine-image" src="/static/mine.svg" alt="mine image">';
            cell.classList.add('mine');
            cell.addEventListener('contextmenu', (e) => e.preventDefault());
        } else {
            let cell = document.querySelector(`.cell[data-id='${i}'`);
            cell = clearEventListeners(cell);
            cell.addEventListener('contextmenu', (e) => e.preventDefault());
        }
    }
}

function play() {
    initBoard();

    // DEBUG
    printBoardDebug(board);

    displayBlankBoard();

    // getting all cells
    const cells = document.querySelectorAll('.cell');

    // add event listener for every cell
    cells.forEach(cell => clickEvents(cell));
}

const startBtn = document.querySelector('#start-btn');
startBtn.addEventListener('click', play);