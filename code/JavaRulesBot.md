---
layout: default
title: Java bot rules interface - Phune Gaming server-side rules
---

# JavaBotRules.java

```java
package com.presenttechnologies.phunegaming.worker.rules.java.spi;

import com.presenttechnologies.phunegaming.worker.rules.java.spi.entities.EvaluationResult;
import com.presenttechnologies.phunegaming.worker.rules.java.spi.entities.Move;

/**
 * Interface to be used by Java rules that support bot players.
 */
public interface JavaBotRules {

    /**
     * Must create a bot move and update the match state as if the play was actually made. This move won't be passed for
     * evaluation.
     *
     * @param prefilledMove the bot move with some pre-filled info
     * @return a new bot move
     */
    EvaluationResult createAndExecuteBotMove(Move prefilledMove);
}
```
