var createStateForNewMatch = function(players, nextPlayerId) {
    'use strict';
    return '{ \"board\": [[0,0,0],[0,0,0],[0,0,0]], \"playerIds\": [' + players[0][0] + ',' + players[1][0] +
        '], \"nextPlayerId\": ' + nextPlayerId + ', \"nextMoveId\": 1, \"running\": true }';
};

var validate = function(state, playerId, moveId, content) {
    'use strict';
    if (moveId !== state.nextMoveId) {
        return 'Wrong id of the move.';
    }
    if (playerId !== state.nextPlayerId) {
        return 'Incorrect player turn.';
    }
    if (content.posX < 0 || content.posX > 2 || content.posY < 0 || content.posY > 2) {
        return 'Position out of board.';
    }
    if (state.board[content.posX][content.posY] !== 0) {
        return 'Position already filled.';
    }
    if (!state.running) {
        return 'Match ended.';
    }
    return null;
};

var verifyBoard = function(board) {
    'use strict';
    for (var i = 0; i < 3; i++) {
        // vertical
        if (board[i][0] !== 0 && board[i][0] === board[i][1] && board[i][0] === board[i][2]) {
            return i;
        }
        // horizontal
        if (board[0][i] !== 0 && board[0][i] === board[1][i] && board[0][i] === board[2][i]) {
            return i + 3;
        }
    }
    if (board[1][1] !== 0) {
        // diagonal1
        if (board[0][0] === board[1][1] && board[0][0] === board[2][2]) {
            return 6;
        }
        // diagonal2
        if (board[2][0] === board[1][1] && board[2][0] === board[0][2]) {
            return 7;
        }
    }
    for (i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            if (board[i][j] === 0) {
                return 9; // board is not full
            }
        }
    }
    return 8; // board is full
};

var evaluateMove = function(state, playerId, moveId, content) {
    'use strict';
    var validationResult, moveResult;

    validationResult = validate(state, playerId, moveId, content);
    if (validationResult !== null) {
        return {
            result: 'invalid',
            evaluationContent: validationResult,
            state: JSON.stringify(state)
        };
    }

    state.board[content.posX][content.posY] = playerId;

    state.nextMoveId++;

    if (state.nextPlayerId === state.playerIds[0]) {
        state.nextPlayerId = state.playerIds[1];
    } else {
        state.nextPlayerId = state.playerIds[0];
    }

    moveResult = verifyBoard(state.board);
    if (moveResult < 9) {
        state.running = false;

        if (moveResult === 8) {
            return {
                result: 'draw',
                winnerPlayerId: 0,
                evaluationContent: moveResult,
                state: JSON.stringify(state)
            };
        } else {
            return {
                result: 'winner',
                winnerPlayerId: state.nextPlayerId,
                evaluationContent: moveResult,
                state: JSON.stringify(state)
            };
        }
    } else {
        return {
            result: 'valid',
            state: JSON.stringify(state)
        };
    }

};

var minimax = function(board, depth, alpha, beta, playerId, opponentId, maxDepth) {
    'use strict';
    var newBoard, result;

    result = verifyBoard(board);
    if (result < 8) {
        return depth % 2 ? 10 - depth : (10 - depth) * -1;
    }
    if (depth > maxDepth || result === 8) {
        return 0;
    }

    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            if (board[i][j] === 0) {
                newBoard = [board[0].slice(), board[1].slice(), board[2].slice()];
                if (depth % 2) {
                    newBoard[i][j] = opponentId;
                    beta = Math.min(beta, minimax(newBoard, depth + 1, alpha, beta, playerId, opponentId, maxDepth));
                    if (beta <= alpha) {
                        return beta;
                    }
                } else {
                    newBoard[i][j] = playerId;
                    alpha = Math.max(alpha, minimax(newBoard, depth + 1, alpha, beta, playerId, opponentId, maxDepth));
                    if (beta <= alpha) {
                        return alpha;
                    }
                }
            }
        }
    }
    return depth % 2 ? beta : alpha;
};

var createBotMove = function(state, playerId) {
    'use strict';
    var board = state.board,
        opponentId = state.playerIds[0] === playerId ? state.playerIds[1] : state.playerIds[0],
        max = -Infinity,
        newBoard, posX, posY, current;

    for (var i = 0; i < 3; i++) {
        for (var j = 0; j < 3; j++) {
            if (board[i][j] === 0) {
                newBoard = [board[0].slice(), board[1].slice(), board[2].slice()];
                newBoard[i][j] = playerId;
                current = minimax(newBoard, 1, -Infinity, Infinity, playerId, opponentId, 10);
                if (current > max) {
                    posX = i;
                    posY = j;
                    max = current;
                }
            }
        }
    }

    return {
        state: JSON.stringify(state),
        content: JSON.stringify({
            className: 'Move',
            posX: posX,
            posY: posY
        })
    };
};

var getNextMoveId = function(state) {
    'use strict';
    return state.nextMoveId;
};

var getNextPlayerId = function(state) {
    'use strict';
    return state.nextPlayerId;
};
