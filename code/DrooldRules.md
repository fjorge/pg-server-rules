---
layout: default
title: Drools game rules interface - Phune Gaming server-side rules
---

```
package com.presenttechnologies.phunegaming.games.example

//list any import classes here.
import com.presenttechnologies.phunegaming.core.entities.Match;
import com.presenttechnologies.phunegaming.core.entities.Match.Status;
import com.presenttechnologies.phunegaming.core.entities.Player;
import com.presenttechnologies.phunegaming.core.entities.dto.PlayerMoveDTO;
import com.presenttechnologies.phunegaming.core.entities.dto.PlayerMoveDTO.EvaluationResultType;
import com.presenttechnologies.phunegaming.core.entities.events.EventTypePK.Action;
import com.presenttechnologies.phunegaming.core.entities.events.AccomplishmentEvent;;


//declare any global variables here
/*The moves are sent to the server in JSON format. In order to be interpreted by
Drools they must be converted to an object defined inside Drools. For instance:*/

declare Move
    posX : int
    posY : int
end

/*
Using Drools a rule to setup the match must be created. The initial match status
must be Status.CREATED and after all the necessary setup is performed it should
be changed to Status.PLAYING. The lastMoveDate in the match object should be
set to null.
*/
rule "match setup"
    when 
        $m : Match(game.id == [The game id of the match], status == Status.CREATED, lastMoveDate == null);
    then
        $m.setStatus(Status.PLAYING);
        update($m);
        // setup other rules
        //[other facts related to the game]
end

/*In Drools, new queries to obtain the nextPlayerId and nextMoveId must be 
created. The platform bridge between Java and Drools expect vars 
$lastPlayerMoveDTO and $nextPlayer to exist, please do not change their names.*/

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


/*The class name, Move in this example, should always be sent by the clients in 
the className variable so Drools can instantiate the correct object. This 
approach removes the need to create and compile Java POJOs for each move.

The code snippet below demonstrates a possible implementation of the rules for: 
a valid move, an invalid move, and an ending move containing the winner info.*/

rule "invalid move"
// execute first
salience 10
    when
        $match : Match(status == Status.PLAYING);
        $pm : PlayerMoveDTO(evaluationResultType==null);
        //[other game-related facts to fire this rule]
    then
        // error
        $pm.setEvaluationResultType(EvaluationResultType.FAILED_VALIDATION);
        $pm.setEvaluationContent("A string to inform the failed reason");
        // drop the invalid facts from working memory
        retract(/*[Some invalid fact]*/);
        //...
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
