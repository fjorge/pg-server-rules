---
title: Phune Gaming server-side rules
---

# Phune Gaming Server-Side Game Component

Phune Gaming requires games to have a server-side component that manages the game state changes and validates the moves. It must provide the following functionalities:

* Create the initial game state for a new match
* Evaluate moves
* Generate moves for the bot
* Evaluate game specific messages
* Retrieve information from the state

This component can be built using either JavaScript, Java or Drools, and it must implement the interface specified for each one:

* [JavaScript](http://example.com)
* [Java](http://example.com)
* [Drools](http://example.com)

# Functionalities to provide

## Create the game state

When a new match is created, a representation of that game initial state must be defined. It must contain all the information that needs to be stored for that specific match.

### JavaScript

The createStateForNewMatch function will be called to return the game state as a string. It should contain: the players information, the id of the next player to play, the id of the next move and any other information relevant to the game. The players attribute is an array containing the players information, each one is an array containing the player id in the first position and a boolean indicating if the player is a bot in the second position.

```js
var createStateForNewMatch = function(players, nextPlayerId) {
    return JSON.stringify({
        players: players,
        nextPlayerId: nextPlayerId,
        nextMoveId: 1
    });
};
```

### Java

The createStateForNewMatch is the method responsible by initializing and returning a new game state that will be used through a match that is about to start.
This method receives a list of ids that represents the ids of the players that will be participating in the match and that must often needs to be saved by match state for later use by the rules implementation.
```java
@Override
public void createStateForNewMatch(List<Long> players) {
gameState = newState(Board.Origin.TOP_LEFT, 3, 3)
      .withPlayers(players)
                              .build();
}
``` 

The game state is game specific and you may design it in the way that best fits your game. In games TicTacToe and Connect 4 implementations we use similar states definitions that look like:

```java
public final class BoardGameState {
private SequencesBoard board;

private Long nextPlayerToPlay;

private Integer nextMoveId;

private List<Long> players;

// ...
}
``` 
One important aspect to keep in mind about game states is that they are persisted in the server as strings. This means that you will need to convert your game state from/to a string every time the server invokes the methods getState and restoreState. However you can delegate this work to the provided SPI by extending your rules implementation from the abstract class JavaGameRulesBase<T>, where <T> if the class of your game state, e.g:
```java
public class GameRules extends JavaGameRulesBase<BoardGameState>{
    
    public GameRules(){
        super(BoardGameState.class);
    }

    // …
}
``` 

### Drools

Create a rule to setup de match. The current match status must be  Status.CREATED and after all the necessary setup it should be change to Status.PLAYING. The lastMoveDate in the Match Object should be null.

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

## Evaluate moves

Every time a client sends a move, it must be validated and the necessary changes should be applied to the game state.

### JavaScript

The evaluateMove function will be called to return a object containing: the move result (possible values: 'valid', 'invalid', 'draw' or 'winner'), the content of the move that was evaluated and the new state of the game as a string.

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

### Java

The method responsible for evaluating and executing (if applicable) a move sent by a client is named evaluateMove. It receives a Move entity and must return an EvaluationResult object instantiated with info based on the move evaluation result.


```java
@Override
public EvaluationResult evaluateMove(Move move) {

EvaluationResult result = new EvaluationResult();

// Evaluate the move and execute/update state it if valid …

result.setEvaluationContent(“{Some result that the client understands}”);
result.setEvaluationResultType(EvaluationResult.Type.SUCCESS);
return result;
}
```
The received Move entity contains the id of the player that executed the move, the id of the move and the move content. This content is custom for each game, this means that just like with the game state, you’re also free to design and use a move definition that best fits your game. The move content of the games TicTacToe and Connect 4 are very simple representing the board coordinates where the player placed its piece, e.g:
```java
public class MoveContent {

private int posX;

private int posY;

// Getters and Setters ...
} 
```

This move content is sent from the client as a string and you can interpret it as such or map it to your defined object and use this instead. You can achieve this by using the method mapContentTo offered by the class Move.



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

// …
}
```

### Drools

The moves are sent to the server in the JSON format. To be interpreted in Drools it must be converted to an object defined inside in Drools as for exemple in the TicTacToe game:

```
 declare Move
    posX : int
    posY : int
end
```

The class name, in this example “Move”, should be always sent by the clients in the JSON in a variable with the name “className” so Drools could instantiate to the correct object. This approach removes the need to create and compile Java Pojos for the moves.

Below are three rules representing a valid/invalid move and a move with a winner. 

```
rule "invalid move"
//it should execute first
salience 10
    when
        $match : Match(status == Status.PLAYING);
        $pm : PlayerMoveDTO(evaluationResultType==null);
        [other game related facts to fire this rule ]
    then
        // error
        $pm.setEvaluationResultType(EvaluationResultType.FAILED_VALIDATION);
        $pm.setEvaluationContent([A string to inform the failed reason]);
        //drop the invalid facts from working memory
        retract([Some invalid fact]);
        ...
     end


rule "valid move"
when
        $match : Match(status == Status.PLAYING);
        $pm : PlayerMoveDTO(evaluationResultType==null);
        [other game related facts to fire this rule ]
    then
        modify($pm){
            setEvaluationResultType(EvaluationResultType.SUCCESS);
        }
        [modify or insert new facts in a valid move]
     end

rule "winner move"
//execute first
when
        $match : Match(status == Status.PLAYING);
        $pm : PlayerMoveDTO(evaluationResultType==null);
        [other game related facts to fire this rule ]
    then
        $pm.setWinnerPlayerId($playerId);
        $pm.setEvaluationContent([String of the result of winning]);
        $pm.setEvaluationResultType(EvaluationResultType.MATCH_END_WINNER);
     end
```

## Generate a move for the bot

If one of the players is a bot, moves must be generated for him and applied to the game state.

### JavaScript

The createAndExecuteBotMove will be called to generate a move. It must return the same result that evaluateMove returns plus a content attribute containing the move details.

```js
var createAndExecuteBotMove = function(state, playerId, moveId, content) {
    // generates a new move and apply the changes to the game state
    // ...
    var move = evaluateMove(state, playerId, moveId, {
        pos: 0 // any move details can be passed here
    });
    move.content = {
        pos: 0 // any move details can be passed here
    };
    return move;
};
```

### Java

If you’re developing a game that allows players to play against bots, you’ll have to implement the java interface JavaRulesBot. 
This interface only defines one method that must be implemented with the name createAndExecuteBotMove. It receives a pre-filled move with some info like the move id and the bot id and must return an instantiated EvaluationResult.
It’s important to notice that on return from this method, the provided move must have been set with the generated content from the bot move.

```java
@Override
public EvaluationResult createAndExecuteBotMove(Move prefilledMove) {

            EvaluationResult evaluationResult = new EvaluationResult();

    // Generate a bot move based on game specific logic
    // …

    // Make sure that the generated content is placed inside the pre-filled move 
prefilledMove.setContent(botMove);
    
    // Evaluate the move and update the state 
// …

return evaluationResult;
}
```

### Drools

Not implemented in Drools

## Evaluate messages

Games can send messages that are evaluated on the server and could change to the game state but that don’t go through the usual moves generic validation like if the move id is the expected one or if it’s really the current player turn. This type of messages are used for example on the Battleship game when the client asks the server to generate a new set of ships random positions for a player.

### JavaScript

The evaluateServerMessage function will be called each time a message is sent by the game, and it must return a object containing the message result and the new game state. It can also return null if it does not wants a response to be sent to the game.

```js
function evaluateServerMessage(state, playerId, content) {
    return {
        result: 'message', // any message details can be passed here
        state: JSON.stringify(state)
    };
}
```

### Java

The method that allows a game to trade messages that aren’t validated as if they were normal moves is named evaluateServerMessage. It’s very similar to the evaluateMove method except for the reasons already explained. It receives a Message entity and must return a EvaluationResult. 

```java
@Override
public EvaluationResult evaluateMessage(Message message) {
            EvaluationResult evaluationResult = new EvaluationResult();

    // Evaluate the message and set the evaluation result and content
    // …

    return evaluationResult;
}
```

### Drools

Not implemented in Droold

## Retrieve information from the state

As only this component can interpret the game state, it should provide the Phune Gaming platform with some information that it requires, for example the id of the next player and the next expected move id. 

### JavaScript

The functions getNextPlayerId and getNextMoveId must be implemented to extract the id of the next player to play and the id of the next move from the game state.

```js
var getNextPlayerId = function(state) {
    return state.nextPlayerId;
};
var getNextMoveId = function(state) {
    return state.nextMoveId;
};
```

### Java

The required methods to be implemented are getNextPlayerId that must return the id of the next player to play and getNextMoveId that must return the next expected move id.

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


### Drools

It must be created Drools querys to obtain the nextPlayerId and the nextMoveId. The vars $lastPlayerMoveDTO and $nextPlayer are read in the bridge Java to Drools so it must be used the same naming.

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

# Examples

The following examples consist of a implementation of this component for the Tic-Tac-Toe game:

* [JavaScript](http://example.com)
* [Java](http://example.com)
* [Drools](http://example.com)

---

This site is licensed under the Creative Commons Attribution 3.0 Unported License.
