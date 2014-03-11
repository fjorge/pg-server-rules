---
layout: default
title: Java game rules interface - Phune Gaming server-side rules
---

# JavaGameRules.java

```java
package com.presenttechnologies.phunegaming.worker.rules.java.spi;

import java.util.List;

import com.presenttechnologies.phunegaming.worker.rules.java.spi.entities.EvaluationResult;
import com.presenttechnologies.phunegaming.worker.rules.java.spi.entities.Message;
import com.presenttechnologies.phunegaming.worker.rules.java.spi.entities.Move;
import com.presenttechnologies.phunegaming.worker.rules.java.spi.exceptions.PhuneMappingException;

/**
 * Interface to be implemented by rules created in Java.
 */
public interface JavaGameRules {

    /**
     * Must create a new clean state for a new match.
     *
     * @param players the id of the player that will play the match
     */
    void createStateForNewMatch(List<Long> players);

    /**
     * Used by the worker to provide an Java rules implementation with a previous match state.
     *
     * @param oldState the match state that is to be restores
     * @return <b>true</b> if the operation completes successfully, <b>false</b> otherwise
     * @throws PhuneMappingException when mapping of the old game state fails
     * @see JavaGameRules#getState()
     */
    void restoreState(String oldState) throws PhuneMappingException;

    /**
     * Used by the worker to fetch a game match current state to be persisted. This state will be the one provided on
     * the restore method.
     *
     * @return the current game match state serialized as a string
     * @throws PhuneMappingException when serialization of the current game fails
     * @see JavaGameRules#restore(String)
     */
    String getState() throws PhuneMappingException;

    /**
     * This method is responsible for receiving and evaluating a move received from a player. When the method returns
     * the match state must be already updated.
     *
     * @param move the move to be evaluated by the rules
     * @return the evaluated move
     */
    EvaluationResult evaluateMove(Move move);

    /**
     * This method is responsible for receiving and evaluating a generic message received from a player. When the method
     * returns the match state must be already updated.<br />
     * <strong>Note:</strong> this type of messages are not validated by the server. e.g: players and moves ordering
     *
     * @param message the message
     * @return the result of the message evaluation
     */
    EvaluationResult evaluateMessage(Message message);

    /**
     * Must return the id of the next player to play.
     *
     * @return the id of the next player to play
     */
    Long getIdOfNextPlayer();

    /**
     * Must return the id of the next move expected by the rules.
     *
     * @return the id of the next move expected by the rules
     */
    Integer getIdOfNextMove();
}
```
