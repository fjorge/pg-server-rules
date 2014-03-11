---
layout: default
title: JavaScript interface - Phune Gaming server-side rules
---

# JavaScriptRules.js

```js
/**
 * Create a game state representation and return it as a string, that should contain: the players information, the id of
 * the next player to play, the id of the next move and any other information relevant to the game. The players
 * attribute is an array containing the players information, each one is an array containing the player id in the first
 * position and a boolean indicating if the player is a bot in the second position.
 *
 * @param {array} players array containing the id of the player and if it is a bot or not.
 * @param {number} nextPlayerId The id of the next player to play.
 * @returns {string} The state of the match.
 */
var createStateForNewMatch = function(players, nextPlayerId) {
    // ...
};

/**
 * Move must be validated and do the necessary changes should be applied to the game state. It must return a object
 * containing: the move result (possible values: 'valid', 'invalid', 'draw' or 'winner'), the content of the move that
 * was evaluated and the new state of the game.
 *
 * @abstract
 * @param {Object} state The state of the match.
 * @param {number} playerId The id of the player that wants to perform this move.
 * @param {number} moveId The id of move.
 * @param {Object} content The move details.
 * @returns {Object} The move result, content and game state.
 */
var evaluateMove = function(state, playerId, moveId, content) {
    // ...
};

/**
 * Generates a new move for the bot. It must return a object containing the content of the move that
 * was created and the state of the game.
 *
 * @abstract
 * @param {Object} state The state of the match.
 * @param {number} playerId The id of the bot that will perform this move.
 * @returns {Object} The move content and game state.
 */
var createBotMove = function(state, playerId) {
    // ...
};

/**
 * Messages sent by the game are evaluated by this function which may change to the game state. It must return a object
 * containing the message result and the new game state. It can also return null if it does not wants to a response to
 * be sent to the game.
 *
 * @abstract
 * @param {Object} state The state of the match.
 * @param {number} playerId The id of the player that sent this message.
 * @param {Object} content The message details.
 * @returns {Object} A object containing the message response and new game state or null.
 */
var evaluateServerMessage = function(state, playerId, content) {
    // ...
};

/**
 * Get the id of the next player to play the game and return it.
 *
 * @abstract
 * @param {Object} state The state of the match.
 * @returns {number} The id of the next player to play the game.
 */
var getNextPlayerId = function(state) {
    // ...
};

/**
 * Get the id of the next move and return it.
 *
 * @abstract
 * @param {Object} state The state of the match.
 * @returns {number} The id of the next move.
 */
var getNextMoveId = function(state) {
    // ...
};
```
