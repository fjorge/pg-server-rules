---
layout: default
title: Phune Gaming server-side rules
---

# Phune Gaming server-side rules

Phune Gaming requires games to have a server-side component (aka server-side rules) that manages the game state changes and validates the moves. This component must provide the following functionalities:

* Create the initial game state for a new match
* Evaluate moves
* Generate moves for the bot <sup>optional</sup>
* Evaluate game specific messages
* Retrieve information from the state

And can be built using either JavaScript, Java or Drools, which must implement the interface specified for each one:

| TODO | Fix URLs bellow |

* [JavaScript](http://example.com)
* [Java](http://example.com)
* [Drools](http://example.com)

## SPI documentation

| TODO | Explain why we consider it a SPI and its main goal |

### Create the game state

When a new match is created, a representation of the game initial state must be defined. It must contain all the information that needs to be stored for that specific match.

#### JavaScript

The `createStateForNewMatch` function will be called to return the game state as a string. It should contain the players information, the id of the next player to play, the id of the next move and any other information relevant to the game. The players attribute is an array containing the players information, each one is an array containing the player id in the first position and a boolean indicating if the player is a bot or not in the second position.

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

The `createStateForNewMatch` is the method responsible by initializing and returning a new game state that will be used through a match that is about to start.
This method receives a list of ids that represents the players identifiers that will be participating in the match and that most often needs to be saved on the match state for later usage by the rules implementation.

```java
@Override
public void createStateForNewMatch(List<Long> players) {
    gameState = newState(Board.Origin.TOP_LEFT, 3, 3)
            .withPlayers(players)
            .build();
}
```

The game state is game specific and you may design it in the way that best fits your game. As an example the game state may look like the following:

```java
public final class GameState {
    private Long nextPlayerToPlay;

    private Integer nextMoveId;

    private List<Long> players;

    // ...
}
```

One important aspect to keep in mind about game states is that they are persisted in the server as strings. This means that you will need to convert your game state from/to a string every time the server invokes the methods `getState` and `restoreState`. However you can delegate this work to the provided SPI by extending your rules implementation from the abstract class `JavaGameRulesBase<T>`, where `<T>` is the class type of your game state, e.g:

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

Every time a client sends a move, it must be validated and the necessary changes should be applied to the game state.

| TODO | Explain that moves are automatically validated by the server |

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

#### Java

The method responsible for evaluating and executing (if applicable) a move sent by a client is named `evaluateMove`. It receives a `Move` entity and must return a `EvaluationResult` object instantiated with info based on the move evaluation result.

```java
@Override
public EvaluationResult evaluateMove(Move move) {
    EvaluationResult result = new EvaluationResult();

    // Evaluate the move and execute/update state it if valid ...
    result.setEvaluationContent("Some result that the client understands");
    result.setEvaluationResultType(EvaluationResult.Type.SUCCESS);

    return result;
}
```

The received `Move` entity contains the id of the player that executed the move, the id of the move and the move representation. This representation is specific for each game, which means that just like with the game state, you're also free to design and use a move definition that best fits your game. As an example the move representation may look like the following:

```java
public class MoveContent {
    private int posX;

    private int posY;

    // Getters and Setters ...
} 
```

This move is sent from the client as a string and you can interpret it as such or map it to your defined object and use it instead. You can achieve this by using the method `mapContentTo` offered by the class `Move`.

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

The moves are sent to the server in JSON format. To be interpreted by Drools they must be converted to an object defined inside Drools. For instance:

```
declare Move
    posX : int
    posY : int
end
```

The class name, `Move` in this example, should always be sent by the clients in the `className` variable so Drools can instantiate the correct object. This approach removes the need to create and compile Java pojos for each move.

Below are three rules representing a valid/invalid move and a move with a winner.

```
rule "invalid move"
// execute first
salience 10
    when
        $match : Match(status == Status.PLAYING);
        $pm : PlayerMoveDTO(evaluationResultType==null);
        [other game related facts to fire this rule]
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
        // other game related facts to fire this rule
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
        // other game related facts to fire this rule
    then
        $pm.setWinnerPlayerId($playerId);
        $pm.setEvaluationContent("String of the result of winning");
        $pm.setEvaluationResultType(EvaluationResultType.MATCH_END_WINNER);
     end
```

### Generate a move for the bot

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

    // Generate a bot move based on game specific logic
    // ...

    // Make sure that the generated content is placed inside the pre-filled move 
    prefilledMove.setContent(botMove);
    
    // Evaluate the move and update the state 
    // ...

    return evaluationResult;
}
```

**Note:** `prefilledMove.setContent` must be called passing the move representation created for the bot as an argument before the return statement.

#### Drools

_N/A_

### Evaluate messages

Games can send messages that are evaluated on the server and may change the game state.
This type of messages may be used for games configuration.
For instance, on a game like Battleship, the client can use these messages to ask the server to generate a new set of ships in random positions.
The evaluation of these messages are very similar to the evaluation of moves except for the move validations already in its section.

#### JavaScript

The `evaluateServerMessage` function will be called each time a message is sent by the game. It must return a object containing the message result and the new game state. It can also return `null` if it does not want a response to be sent to the game.

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

### Retrieve information from the state

As only this component can interpret the game state, it should provide the Phune Gaming platform with the information it requires (i.e. the id of the next player to play and the id of the next expected move).

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

| TODO | Fix URLs bellow |

* [JavaScript](http://example.com)
* [Java](http://example.com)
* [Drools](http://example.com)
