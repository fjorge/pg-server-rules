---
layout: default
title: Phune Gaming server-side rules
---

# Phune Gaming server-side rules

Phune Gaming requires the games to have a server-side component (aka server-side rules) which manages the game state changes and validates the moves. This component must provide the following functionality:

* Create the initial game state
* Evaluate moves
* Generate bots move <sup>optional</sup>
* Evaluate game-specific messages <sup>optional</sup>
* Get info about the ongoing match

The server-side rules can be written in JavaScript, Java or Drools, and must implement the interface specified for the particular (programming) language:

* JavaScript: [JavaScriptRules](code/JavaScriptRules.html)
* Java: [JavaGameRules](code/JavaGameRules.html), [JavaRulesBot](code/JavaRulesBot.html)
* Drools: [DroolsRules](code/DroolsRules.html)

## SPI documentation

> Service Provider Interface (SPI) is an API intended to be implemented or extended by a third party. It can be used to enable framework extension and replaceable components.  
> -- *http://en.wikipedia.org/wiki/Service_provider_interface*

### Create the initial game state

When a new match is created, a representation of the game initial state must be defined. It must contain all the information that needs to be stored for that concrete match.

#### JavaScript

The `createStateForNewMatch` function will be called to return the game state as a string. It should contain the players information, the id of the next player to play, the id of the next move and any other information relevant to the game. The players parameter is an array, which contains information about the players. Each element in the players array is an array for a single player, such as the first position holds the player's id and the second position holds a boolean value indicating whether the player is a bot or not.

```js
var createStateForNewMatch = function(players, nextPlayerId) {
    return JSON.stringify({
        players: players,
        nextPlayerId: nextPlayerId,
        nextMoveId: 1
    });
};
```

#### Java

The `createStateForNewMatch` is the method responsible for initializing and returning a new game state, which will be used in the match that is about to start.
This method receives a list of ids of the players who will take part in the match and that most often needs to be saved on the match state for later usage by the server-side rules implementation.

```java
@Override
public void createStateForNewMatch(List<Long> players) {
    gameState = newState(Board.Origin.TOP_LEFT, 3, 3)
            .withPlayers(players)
            .build();
}
```

The game state is game-specific and you may design it in the way that best fits your game. As an example the game state may look like the following:

```java
public final class GameState {
    private Long nextPlayerToPlay;

    private Integer nextMoveId;

    private List<Long> players;

    // ...
}
```

One important aspect to keep in mind about the game states is that they are persisted on the server as strings. This means that you will need to convert your game state from/to a string every time the server invokes the methods `getState` and `restoreState`. However you can delegate this work to the provided SPI by extending your server-side rules implementation from the abstract class `JavaGameRulesBase<T>`, where `<T>` is the class type of your game state, e.g:

```java
public class GameRules extends JavaGameRulesBase<BoardGameState> {
    public GameRules(){
        super(BoardGameState.class);
    }

    // ...
}
```

#### Drools

Using Drools a rule to setup the match must be created. The initial match status must be `Status.CREATED` and after all the necessary setup is performed it should be changed to `Status.PLAYING`. The `lastMoveDate` in the match object should be set to `null`.

```
rule "match setup"
    when 
        $m : Match(game.id == [The game id of the match], status == Status.CREATED, lastMoveDate == null);
    then
        $m.setStatus(Status.PLAYING);
        update($m);
        // setup other rules
        [other facts related to the game]
end
```

### Evaluate moves

Every time a client sends a move, the move must be validated and the necessary changes should be applied to the game state.

#### JavaScript

The `evaluateMove` function will be called to return an object containing the move result (possible values are `valid`, `invalid`, `draw` or `winner`), the content of the move that was evaluated and the new state of the game as a string.

```js
var evaluateMove = function(state, playerId, moveId, content) {
    // validate the move, and apply the required changes to the game state
    // ...
    return {
        result: 'valid',
        evaluationContent: {
            pos: 0 // any move details can be passed here
        },
        state: JSON.stringify(state)
    };
};
```

**Note:** The parameters `playerId` and `moveId` are automatically validated by the server before calling this function.

#### Java

The method responsible for evaluating and executing (if applicable) a move sent by a client is named `evaluateMove`. It receives a `Move` entity and must return an `EvaluationResult` object instantiated with info based on the result from the move evaluation.

```java
@Override
public EvaluationResult evaluateMove(Move move) {
    EvaluationResult result = new EvaluationResult();

    // Evaluate the move and if valid update the state...
    result.setEvaluationContent("Some result that the client understands");
    result.setEvaluationResultType(EvaluationResult.Type.SUCCESS);

    return result;
}
```

The received `Move` entity contains the id of the player who performed the move, the id of the move and the move representation. This representation is specific for each game, which means that just like with the game state, you are free to design and use a move definition that best fits your game. As an example the move representation may look like the following:

```java
public class MoveContent {
    private int posX;

    private int posY;

    // Getters and Setters ...
} 
```

The move is sent by the client as a string and you can interpret it as such or map it to the object defined by you and use it instead. This can be achieved by using the `mapContentTo` method available in the class `Move`.

```java
MoveContent content = null;

try {
    content = move.mapContentTo(MoveContent.class);
} catch (PhuneMappingException e) {
    result.setEvaluationResultType(EvaluationResult.Type.INTERNAL_ERROR);
    return result;
}

int line = content.getPosY();
int column = content.getPosX();

// ...
}
```

#### Drools

The moves are sent to the server in JSON format. In order to be interpreted by Drools they must be converted to an object defined inside Drools. For instance:

```
declare Move
    posX : int
    posY : int
end
```

The class name, `Move` in this example, should always be sent by the clients in the `className` variable so Drools can instantiate the correct object. This approach removes the need to create and compile Java POJOs for each move.

The code snippet below demonstrates a possible implementation of the rules for: a valid move, an invalid move, and an ending move containing the winner info.

```
rule "invalid move"
// execute first
salience 10
    when
        $match : Match(status == Status.PLAYING);
        $pm : PlayerMoveDTO(evaluationResultType==null);
        [other game-related facts to fire this rule]
    then
        // error
        $pm.setEvaluationResultType(EvaluationResultType.FAILED_VALIDATION);
        $pm.setEvaluationContent("A string to inform the failed reason");
        // drop the invalid facts from working memory
        retract([Some invalid fact]);
        ...
     end

rule "valid move"
when
        $match : Match(status == Status.PLAYING);
        $pm : PlayerMoveDTO(evaluationResultType==null);
        // other game-related facts to fire this rule
    then
        modify($pm){
            setEvaluationResultType(EvaluationResultType.SUCCESS);
        }
        // modify or insert new facts in a valid move
     end

rule "winner move"
// execute first
when
        $match : Match(status == Status.PLAYING);
        $pm : PlayerMoveDTO(evaluationResultType==null);
        // other game-related facts to fire this rule
    then
        $pm.setWinnerPlayerId($playerId);
        $pm.setEvaluationContent("String of the result of winning");
        $pm.setEvaluationResultType(EvaluationResultType.MATCH_END_WINNER);
     end
```

### Generate bots move

If bots are supported by a game, their moves must be generated.

#### JavaScript

The `createBotMove` function will be called to generate a valid move for the bot. It returns an object containing the content of the move and the state of the game as strings. The `evaluateMove` function will be called automatically with the generated bot move, as such, unlike the Java implementation, this move does not need to be applied to the game state.

```js
var createBotMove = function(state, playerId) {
    return {
        state: JSON.stringify(state),
        content: JSON.stringify({
            pos: 0 // any move details can be passed here
        })
    };
};
```

#### Java

In Java this is achieved by implementing the interface `JavaRulesBot`.
This interface only defines one method named `createAndExecuteBotMove`. It receives a pre-filled move with some info like the move id and the bot id and must return an instantiated `EvaluationResult`. Since the `evaluateMove` function is not automatically called, the generated move must be added programmatically to the game state.

```java
@Override
public EvaluationResult createAndExecuteBotMove(Move prefilledMove) {

    EvaluationResult evaluationResult = new EvaluationResult();

    // Generate a bot move based on game-specific logic
    // ...

    // Make sure that the generated content is placed inside the pre-filled move 
    prefilledMove.setContent(botMove);
    
    // Evaluate the move and update the state 
    // ...

    return evaluationResult;
}
```

**Note:** `prefilledMove.setContent` must be called passing the move representation created for the bot as an argument.

#### Drools

_N/A_

### Evaluate game-specific messages

Games can send messages that are evaluated on the server and may change the game state.
This type of messages may be used for game configuration.
For instance, on a game like Battleship, the client can use these messages to ask the server to generate a new set of ships in random positions.
The evaluation of these messages is very similar to the evaluation of the moves except for the move validations already described in the section "Evaluate moves".

#### JavaScript

The `evaluateServerMessage` function will be called each time a message is sent by the game. It must return an object containing the message result and the new game state. It can also return `null` if it does not want a response to be sent to the game.

```js
function evaluateServerMessage(state, playerId, content) {
    return {
        result: 'message', // any message details can be passed here
        state: JSON.stringify(state)
    };
}
```

#### Java

The method `evaluateMessage` receives a `Message` entity and must return a `EvaluationResult` instance. 

```java
@Override
public EvaluationResult evaluateMessage(Message message) {
    EvaluationResult evaluationResult = new EvaluationResult();

    // Evaluate the message and set the evaluation result and content
    // ...

    return evaluationResult;
}
```

#### Drools

_N/A_

### Get info about the ongoing match

The game state kept on the game rules objects, should provide the Phune Gaming platform with the information it requires (i.e. the id of the next player to play and the id of the next expected move).

#### JavaScript

The functions `getNextPlayerId` and `getNextMoveId` must be implemented.

```js
var getNextPlayerId = function(state) {
    return state.nextPlayerId;
};
var getNextMoveId = function(state) {
    return state.nextMoveId;
};
```

#### Java

The getters `getNextPlayerId` and `getNextMoveId` must be implemented.

```java
@Override
public Long getIdOfNextPlayer() {
    return gameState.getNextPlayerToPlay();
}

@Override
public Integer getIdOfNextMove() {
    return gameState.getNextMoveId();
}
```

#### Drools

In Drools, new queries to obtain the `nextPlayerId` and `nextMoveId` must be created. The platform bridge between Java and Drools expect vars `$lastPlayerMoveDTO` and `$nextPlayer` to exist, please do not change their names.

```
query "findLastPlayerMoveDTO"
   $lastPlayerMoveDTO : PlayerMoveDTO($lowMoveId : moveId); 
   not PlayerMoveDTO(moveId > $lowMoveId);
end

query "findNextPlayer"
   Match($players : players);
   PlayerMoveDTO($playerId : playerId, $lowMoveId : moveId); 
   not PlayerMoveDTO(moveId > $lowMoveId);
   $nextPlayer : Player(id!=$playerId) from $players; 
end
```

## Example

For a complete example, please find below the server-side rules needed for the implementation of the game Tic-Tac-Toe:

* [JavaScript](code/tictactoe-rules.js)
* [Java](code/tictactoe-rules-src.zip)
* [Drools](code/tictactoe-rules.drl)
