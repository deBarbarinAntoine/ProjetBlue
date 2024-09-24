
// setting the game variables
let board = [];
let width = 8;
let height = 8;
let boardLength = width * height;
let mineNb = 12;
let mine = 'M';


function randomIntFromInterval(min, max) { // min and max included
    return Math.floor(Math.random() * (max - min + 1) + min);
}

function getNeighborIndices(index) {
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
    boardElem.style.width = (width * (cellWidth + 1) - 2) + 'px';
    boardElem.style.height = 'fit-content';
    for (let i = 0; i < boardLength; i++) {
        const cellElem = document.createElement('div');
        cellElem.classList.add('cell');
        cellElem.setAttribute('data-id', `${i}`);
        boardElem.appendChild(cellElem);
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
    cells.forEach(cell => {
        cell.addEventListener('click', () => {
            // DEBUG
            console.log('click');

            // cloning the cell to remove the eventListeners
            const cellClone = cell.cloneNode(true);
            cell.parentNode.replaceChild(cellClone, cell);
            cell = cellClone;

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
                    break;
                default:
            }
        })
    });
}

const startBtn = document.querySelector('#start-btn');
startBtn.addEventListener('click', play)


// for mouse events ⤵
// let button = document.querySelector("#button");
// button.addEventListener("mouseup", (e) => {
//     let log = document.querySelector("#log");
//     switch (e.button) {
//         case 0:
//             log.textContent = "Left button clicked.";
//             break;
//         case 1:
//             log.textContent = "Middle button clicked.";
//             break;
//         case 2:
//             log.textContent = "Right button clicked.";
//             break;
//         default:
//             log.textContent = `Unknown button code: ${e.button}`;
//     }
// });