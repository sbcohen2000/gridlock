/**
 * @type {Record<string, string>}
 */
export const EXAMPLES = {
    "Programming": "Programming",
    "string literal":
    ("ACAAIAA2AAIANgBMAAUATABXAAIAVwBtAAMAbQCDAAYAgwCHABEAAAAAIACHAIsAVgARAAAgAIsAlQBkAAAAAiAAlQCfAAMAZAACIACfAKMAZwAAAAcgAKMAqQAFAAAACSAAqQCvAGIABQAJIACvALsARAAAAAwgALsAxwAjAEQADCAACgARAA4AHwATAAwAYwAqABcAAAAAAAEAAQABABAACQACAAIAAgBKAFEARQAAAAwAQwArACoAFwAAAAAAAQABAAEAAQ==\n" +
     "# Example:       string literal                                                                        \n" +
     "# Example from: \"Leaves of Grass,\" Walt Whitmann                                                       \n" +
     "// Without newline:                                                                                    \n" +
     "const poem =                                                                                           \n" +
     "    \"Stranger, if you passing meet me and desire to speak to me, why should you not speak to me?\\n\" +  \n" +
     "    \"And why should I not speak to you?\\n\"                                                          +  \n" +
     "    \" --Walt Whitman\\n\"                                                                             ;  \n" +
     "// With newline:                                                                                       \n" +
     "// Steps:                                                                                              \n" +
     "//   1. Insert newline after ',' (note that the column of the + doesn't change)                        \n" +
     "//   2. Indent, add extra syntax. (note again that the column of the + doesn't change)                 \n" +
     "//   3. Drag the guide in order to correct the column of the '+'s and ';'.                             \n" +
     "                                                                                                       \n" +
     "const poem =                                                                                           \n" +
     "    \"Stranger, if you passing meet me and desire to speak to me,\\n\" +                                  \n" +
     "    \"    why should you not speak to me?\\n\"                         +                                  \n" +
     "    \"And why should I not speak to you?\\n\"                          +                                  \n" +
     "    \" --Walt Whitman\\n\"                                             ;                                  \n"),
    "for_each_cpu":
    ("ABQAFAAqAAMAKgBAAAYAQABLAAYASwBRABAAAAAAIABRAFcANAAQAAAgAFcAYwA6AAAAAyAAYwBvAAoAOgADIABvAH8ARAAAAAkgAAgADwABAAwAIAAAAAAAHwAyADkAFgAAAAAAAQABAAEAAAAAAAMAQgAaACIAAgBBAAoAAg==\n" +
     "# Title:        for_each_cpu                                        \n" +
     "# Example from: linux/kernel/workqueue.c:552-555                    \n" +
     "#                                                                   \n" +
     "                                                                    \n" +
     "#define for_each_cpu(pool, cpu)                           \\         \n"+
     "        for ((pool) = &per_cpu(cpu_pools, cpu)[0];        \\         \n"+
     "             (pool) < &per_cpu(cpu_pools, cpu)[NR_POOLS]; \\         \n"+
     "             (pool)++)                                              \n" +
     "                                                                    \n" +
     "/**                                                                 \n" +
     " * for_each_pool -- iterate through all worker_pools in the system  \n" +
     " * @pool: iteration cursor                                          \n" +
     " * @pi: integer used for iteration                                  \n" +
     " *                                                                  \n" +
     " * This must be called either with wq_pool_mutex held or RCU read   \n" +
     " * locked.                                                          \n" +
     " *                                                                  \n"),
    "fovfl_ovfl_on":
    ("ABoAGgAwAAQAMAA7AAMAOwBcAAkAXABnAAsAZwBvABAAAAAAIABvAHcANAAQAAAgAHcAfQBEAAAABCAAfQCPAA8AAAAHIACPAKEAGAAPAAcgAKEAswAdADAAByAAswDJAEQAAAAQIAAIAA8AAQABAA0AMQAAACQALgAtAB4ADgALAAAACQAAAAsACwAKAAAAAAARAAAAFQAAABUAIQAWAAAAAAAaAAAAEQAAABEAEwAVAAAAEwAAAA4AQQAAADgAAAA4AEQARAAA\n" +
     "# Title:        fovfl_ovfl_on                                                \n" +
     "# Example from: linux/linux-master/arch/m68k/ifpsp060/src/pfpsp.S            \n" +
     "#                                                                            \n" +
     "#               Demonstrates occlusion of long line.                         \n" +
     "# overflow is enabled AND overflow, of course,                               \n" +
     "# occurred. so, we have the EXOP in fp1. now,                                \n" +
     "# simply jump to _real_ovfl()!                                               \n" +
     "fovfl_ovfl_on:                                                               \n" +
     "    fmovm.x    &0x40,FP_SRC(%a6)                # save EXOP (fp1) to stack   \n" +
     "                                                                             \n" +
     "    mov.w      &0xe005,2+FP_SRC(%a6)            # save exc status            \n" +
     "                                                                             \n" +
     "    fmovm.x    EXC_FPREGS(%a6),&0xc0            # restore fp0-fp1            \n" +
     "    fmovm.l    USER_FPCR(%a6),%fpcr,%fpsr,%fpiar# restore ctrl regs          \n" +
     "    movm.l     EXC_DREGS(%a6),&0x0303           # restore d0-d1/a0-a1        \n" +
     "                                                                             \n" +
     "# Original Program:                                                          \n" +
     "                                                                             \n" +
     "fovfl_ovfl_on:                                                               \n" +
     "    fmovm.x    &0x40,FP_SRC(%a6)       # save EXOP (fp1) to stack            \n" +
     "                                                                             \n" +
     "    mov.w      &0xe005,2+FP_SRC(%a6)   # save exc status                     \n" +
     "                                                                             \n" +
     "    fmovm.x    EXC_FPREGS(%a6),&0xc0   # restore fp0-fp1                     \n" +
     "    fmovm.l    USER_FPCR(%a6),%fpcr,%fpsr,%fpiar # restore ctrl regs         \n" +
     "    movm.l     EXC_DREGS(%a6),&0x0303          # restore d0-d1/a0-a1         \n" +
     "                                                                             \n"),
    "scc_clr":
    ("AA4ADgAkAAMAJABFAAgARQBLABAAAAAAIABLAFEAHgAQAAAgAFEAYQAKAAAAAyAAYQBxABcACgADIABxAIEADQAjAAMgAAcADwABAAcAHwAKAAgABgAGAAcACQAHAAYABQAAAAMACAAXAAAAGQANAAAAAAAMAAAADAAAAAkACQAA\n" +
     "# Tile:         scc_clr                         \n" +
     "# Example from: linux/arch/m68k/fpsp040/round.S \n" +
     "#               (Line 199)                      \n" +
     "scc_clr:                                        \n" +
     "  tstl    %d0                      |test rs = 0 \n" +
     "  bnes    sgl_done                              \n" +
     "  andiw   #0xfe00,LOCAL_HI+2(%a0)  |clear l-bit \n" +
     "sgl_done:                                       \n" +
     "  andil   #0xffffff00,LOCAL_HI(%a0)|truncate    \n" +
     "  clrl    LOCAL_LO(%a0)            |clear d2    \n" +
     "  rts                                           \n"),
    "ASCII Diagrams": "ASCII Diagrams",
    "MXCSR":
    ("AEQARABaAAUAWgBlAAEAZQB7AAEAewCcAAEAnADIAAEAyAEKAAEBCgErAAEBKwFMAAEBTAFtAAEBbQGDAAEBgwGZAAEBmQGjABEAAAAAIAGjAa0AIgARAAAgAa0BrwAzAAAABSABrwGxAB8AAAAGIAGxAbMAFAAfAAYgAbMBtQATAAAAByABtQG3AAwAEwAHIAG3AbkAFAAfAAcgAbkBuwATAAAACCABuwG9AAcAEwAIIAG9Ab8ABQAaAAggAb8BwQAUAB8ACCABwQHDABAAAAAJIAHDAcUAAwAQAAkgAcUBxwAFABMACSABxwHJAAIAGAAJIAHJAcsABQAaAAkgAcsBzQAUAB8ACSABzQHPABAAAAAKIAHPAdEABwAQAAogAdEB0wAcABcACiAB0wHVABEAAAALIAHVAdcACAARAAsgAdcB2QAaABkACyAB2QHbABEAAAAMIAHbAd0ACAARAAwgAd0B3wAaABkADCAB3wHhABEAAAANIAHhAeMAIgARAA0gAeMB5QARAAAADiAB5QHnACIAEQAOIAAIABEAAQABAAEABQAgAB0AAAAIAAAAFAATAAAAAQABABEABgAFAAEAAAABAAEAAQABAAEAAAAHAAkAAAACAAEAAAACABYAAAABAAAAEQ==\n"+
     "# Title:         MXCSR                             \n"+
     "# Example from: \"Taking ASCII Drawings Seriously:  \n"+
     "#                How Programmers Diagram Code\"     \n"+
     "#                                                  \n"+
     "#                Figure 6                          \n"+
     "                                                   \n"+
     " Exception Masks---+           +---Exception Flags \n"+
     "                   |           |                   \n"+
     "Flush-to-zero---+  +----+ +----+                   \n"+
     "                |  |    | |    |                   \n"+
     "                FRRMMMMMMDEEEEEE                   \n"+
     "                 ||      |                         \n"+
     "                 ++      +---Denormals-are-zero    \n"+
     "                 |                                 \n"+
     "                 +---Rounding Mode                 \n"),
    "Speech Recognizer":
    ("ACYAJgA8AAQAPABHAAEARwBzAAoAcwCfAAEAnwDLAAEAywDWAAIA1gDeABEAAAAAIADeAOYAIgARAAAgAOYA6AAzAAAABCAA6AD8AAUAAAAFIAD8ARAAFQAFAAUgARABJAAVABoABSABJAE4AAQALwAFIAE4AToABQAAAA8gAToBPAASAAUADyABPAE+ABgAFwAPIAE+AUAABAAvAA8gAUABQgAFAAAAECABQgFEABUABQAQIAFEAUYAFQAaABAgAUYBSAAEAC8AECABSAFMADMAAAARIAAIABEAAQABABEAIAAdAAAAMwAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAFQABAAEAAQABABUAAQABABUAAQABABUAAQAVAAEAAQABABUAAQABAAEAAQABAAEAAQABAAEAAQABAAAAAQAIAAEAAAABAAEAAQArAAA=\n"+
     "# Title:         Speech Recognizer                 \n"+
     "# Example from: \"Taking ASCII Drawings Seriously:  \n"+
     "#                How Programmers Diagram Code\"     \n"+
     "#                                                  \n"+
     "VR UI Thread       Browser Thread         IO Thread\n"+
     "     |                    |                    |   \n"+
     "     |----ActivateVS----->|                    |   \n"+
     "     |                    |-------Start------->|   \n"+
     "     |                    |                    |   \n"+
     "     |                    |<-NotifyStateChange-|   \n"+
     "     |                    |                    |   \n"+
     "     |<--OnSRStateChanged-|                    |   \n"+
     "     |                    |                    |   \n"+
     "     |                    |<--OnSpeechResult---|   \n"+
     "     |<--OnSRStateChanged-|                    |   \n"+
     "     |                 navigate                |   \n"+
     "     |                    |                    |   \n"+
     " VS = voice search, SR = speech recognition        \n"+
     "                                                   \n"),
    "Tea Ceremony":
    ("ABQAFAAqAAIAKgA1AAEANQCCAA0AggCGAAkAAAAAIACGAIoAGwAJAAAgAIoAjAAkAAAAAiAAjACmAAgAAAADIACmAMAAAQAIAAN8AMAA2gAIAAkAAyAA2gD0AAEAEQADfAD0AQ4ABwASAAMgAQ4BKAABABkAA3wBKAFCAAoAGgADIAAIAAIADAAAABsAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAYACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABQAGAAcAAAAFAAcAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAJAAAAAAAAAAAAAAAAAAAAAAAAAAAACA==\n" +
     "# Title: Tea Ceremony               \n" +
     "#                                   \n" +
     "     kettle     cup     pot         \n" +
     "                                    \n" +
     "water ->                  <- leaves \n" +
     "          boiling                   \n" +
     "          water                     \n" +
     "         ------->                   \n" +
     "                   cool             \n" +
     "                   water            \n" +
     "                  ------>           \n" +
     "                                    \n" +
     "                    tea             \n" +
     "                  <------           \n" +
     "                                    \n" +
     "                          -> waste  \n"),
    "Data": "Data",
    "LaTeX Table":
    ("ACwALAA3AAIANwBCAAEAQgB5AAIAeQCwAAEAsADnAAEA5wEeAAMBHgEpAAEBKQEtAC8AAAAAIAEtAS8ALwAAAAIgAS8BMwALAAAAAyABMwE3AA4ACwADIAE3ATsADQAZAAMgATsBPwAHACYAAyABPwFDAAIALQADIAFDAUUACwAAAAUgAUUBRwAOAAsABSABRwFJAA0AGQAFIAFJAUsABwAmAAUgAUsBTQACAC0ABSABTQFPAAsAAAAGIAFPAVEADgALAAYgAVEBUwANABkABiABUwFVAAcAJgAGIAFVAVcAAgAtAAYgAVcBXQALAAAAByABXQFjAA4AFwAHIAFjAWkADQAlAAcgAWkBbwAHADIAByABbwF1AAIAOQAHIAF1AXcALwAAAAogABQAAQAYAAgABgANAAAADAAAAAYAAAACAAAABQAIAAUABAACAAoACQAEAAQAAgAHABcAEAAIAAAAAAAFAAAAAAAFAAAAAAACAAAAAAAN\n" +
     "# Title: LaTeX Table                                       \n" +
     "#                                                          \n" +
     "\\begin{tabular}{l|l|l|l}                                   \n"+
     "Language   & Type System & Functional & Pure \\\\            \n"+
     "\\hline                                                     \n"+
     "OCaml      & Static      & Yes        & No   \\\\            \n"+
     "JavaScript & Dynamic     & No         & No   \\\\            \n"+
     "Haskell                & Static      & Yes        & Yes  \\\\\n"+
     "% Remove \"Pure\" column.                                    \n"+
     "% Haskell first?                                           \n"+
     "\\end{tabular}                                              \n"),
    "Other": "Other",
  "UIST Presentation":
  ("AMgAyADTAAkA0wD0AAIA9AEVAAoBFQEgAAEBIAE2AAkBNgFMAAEBTAGOAAEBjgHFAAYBxQH8AAEB/AIHAAkCBwJJAAECSQKAABMCgAK3AAECtwLCAAkCwgM7AAEDOwOeAAoDngQBAAEEAQQXAAEEFwQiAAcEIgQtAAEELQRDAAkEQwROAAsETgRkAAEEZARvAAEEbwR6AAoEegSQAAEEkASbAAEEmwSmAAoEpgS8AAEEvATHAAEExwTSAAoE0gTdAAEE3QTzAAoE8wUFAFYAAAAAIAUFBQkAGAAAAAkgBQkFDQAgABgACT0FDQURAB4AOAAJIAURBSUAGAAAAAsgBSUFOQAYABgACyAFOQVNACYAMAALIAVNBU8AVgAAABU9BU8FYQANAAAAFiAFYQVzAEkADQAWIAVzBXUADQAAAB8gBXUFgQBJAA0AHyAFgQWDAAsAAAAlIAWDBYUAAQALACUgBYUFhwAaAAwAJS0FhwWJAB8AJgAlLQWJBYsAAQBFACUgBYsFjQAQAEYAJSAFjQWZAAsAAAAmIAWZBaUAAQALACZ8BaUFuQA5AAwAJiAFuQXFAAEAUwAmfAXFBdEAEABUACYgBdEF0wALAAAAMCAF0wXVAAEACwAwIAXVBdcAOQAMADAtBdcF2QABAEUAMCAF2QXbABAARgAwIAXbBe0AVgAAADEgBe0F7wAMAAAAOiAF7wXxAAEADAA6IAXxBfMAEwANADotBfMF9QAjACAAOi0F9QX3AAEAQwA6IAX3BfkAEgBEADogBfkGHwAMAAAAOyAGHwZFAAEADAA7fAZFBmsANgANADsgBmsGkQABAEMAO3wGkQa3ABIARAA7IAa3BrkADAAAAE4gBrkGuwABAAwATiAGuwa9ADYADQBOLQa9Br8AAQBDAE4gBr8GwQASAEQATiAGwQbTAFYAAABPIAbTBtUAAwAAAFggBtUG1wABAAMAWCAG1wbZAAsABABYLQbZBtsAFQAPAFgtBtsG3QABACQAWCAG3QbfAAcAJQBYIAbfBuEAAQAsAFggBuEG4wAPAC0AWC0G4wblABUAPABYLQblBucAAQBRAFggBucG6QAEAFIAWCAG6Qb9AAMAAABZIAb9BxEAAQADAFl8BxEHJQAgAAQAWSAHJQc5AAEAJABZfAc5B00ABwAlAFkgB00HYQABACwAWXwHYQd1ACQALQBZIAd1B4kAAQBRAFl8B4kHnQAEAFIAWSAHnQefAAMAAABjIAefB6EAAQADAGMgB6EHowAgAAQAYy0HowelAAEAJABjIAelB6cABwAlAGMgB6cHqQABACwAYyAHqQerACQALQBjLQerB60AAQBRAGMgB60HrwAEAFIAYyAHrwexABkAAABkIAexB7kAPQAZAGQgB7kHxwBWAAAAaCAHxwfJAFYAAABvPQfJB9sAGQAAAHAgB9sH7QA9ABkAcCAH7QgDAFYAAAB5IAgDCAUAEQAAAIQtCAUIBwBFABEAhC0IBwgRAFYAAACFIAgRCCUAVgAAAIogCCUIJwAcAAAAlC0IJwgpADoAHACULQgpCDsAVgAAAJUgCDsITwBWAAAAniAITwhRABoAAACoLQhRCFMAPAAaAKgtCFMIbQBWAAAAqSAIbQiBAFYAAAC2IAiBCIMAVgAAAMA9CIMIlwAdAAAAwSAIlwirADkAHQDBIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAIAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYAAAAAAAAAAAAAAAAAAAAAAAAACAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANgAAAAAAAAAAAAAAAAAAAAAAAwAvACIAAAAsACsAAAABAAAABgABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA4ADgARwAWAAAADgAOAA4AFAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAEAABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAANQAyADIAMgAyADIAMgAyADIAMgAyADIAMgAtAAAAKgAnAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAAAAEAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAKAAEAAAABAAAABwABAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAGQAZABkAGQAZAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAQAA0AGQAjABwAHAAcABAADAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABAAAAAQAAAAEAAAABAAAAAAADADAAMgAhAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAABYAHgAAAAAAAAAAAAAAAAAAAEMAKgBBAAAAAAAAAAAAAAAAAAAAAAA0AAAAOAA4ADgAFgAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFwAAABoAAAAOAEEAOAA4AEQARAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAHAAAADIASAAAABAADQAZACMAHAAcABwAEAAMAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAFQAAAAAAAAAAAAAAAAAAAAA=\n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                        Gridlock: Plain Text with Guides                                            \n" +
   "                                                                                                    \n" +
   "                        Sam Cohen & Ravi Chugh  UIST '26                                            \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "             Part 1: Examples of Formatting in Plain Text Documents                                 \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "             ...                                                                                    \n" +
   "               - Sam's defn.: secondary information conveyed                                        \n" +
   "                 through extra-syntactic means.                                                     \n" +
   "                                                                                                    \n" +
   "               - Typically used to draw attention to some                                           \n" +
   "                 aspect of the code, or aid readability.                                            \n" +
   "           +                           Code                          +                              \n" +
   "                                                                                                    \n" +
   "            #define for_each_cpu(pool, cpu)                       \\\\                                \n" +
   "                    for ((pool) = &per_cpu(pools, cpu)[0];        \\\\                                \n" +
   "                         (pool) < &per_cpu(pools, cpu)[NR_POOLS]; \\\\ <-- formatting                 \n" +
   "                         (pool)++)                                                                  \n" +
   "                                                                                                    \n" +
   "                         ^                                                                          \n" +
   "                         |                                                                          \n" +
   "                         |                                                                          \n" +
   "                      formatting                                                                    \n" +
   "           +                                                         +                              \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "            +                    ASCII Diagrams                    +                                \n" +
   "                                                                                                    \n" +
   "               VR UI Thread       Browser Thread         IO Thread                                  \n" +
   "                    |                    |                    |                                     \n" +
   "                    |----ActivateVS----->|                    |                                     \n" +
   "                    |                    |-------Start------->|                                     \n" +
   "                    |                    |                    |                                     \n" +
   "                    |                    |<-NotifyStateChange-|                                     \n" +
   "                    |                    |                    |                                     \n" +
   "                    |<--OnSRStateChanged-|                    |                                     \n" +
   "                    |                    |                    |                                     \n" +
   "                    |                    |<--OnSpeechResult---|                                     \n" +
   "                    |<--OnSRStateChanged-|                    |                                     \n" +
   "                    |                 navigate                |                                     \n" +
   "                    |                    |                    |                                     \n" +
   "                VS = voice search, SR = speech recognition                                          \n" +
   "                                                                                                    \n" +
   "              // From \"Taking ASCII Drawings Seriously:                                             \n" +
   "              //       How Programmers Diagram Code\"                                                \n" +
   "                                                                                                    \n" +
   "            +                                                      +                                \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "   +            Markdown            +       +                LaTeX               +                  \n" +
   "                                                                                                    \n" +
   "     | Language   | Types   |                 \\begin{table}[]                                       \n" +
   "     |------------|---------|                   \\centering                                          \n" +
   "     | Python     | Sort-of |                   \\begin{tabular}{|l|l|}                              \n" +
   "     | JavaScript | No      |                     Language   & Types   \\\\ \\hline                    \n" +
   "     | Haskell    | Yes     |                     Python     & Sort-of \\\\                           \n" +
   "                                                  JavaScript & No      \\\\                           \n" +
   "                                                  Haskell    & Yes     \\\\                           \n" +
   "                                                \\end{tabular}                                       \n" +
   "                                              \\end{table}                                           \n" +
   "   +                                +       +                                    +                  \n" +
   "                         ...                                                                        \n" +
   "                         In both cases, there is no syntactic requirement                           \n" +
   "                         to align the columns, but we might choose to do so                         \n" +
   "                         in order to increase readability.                                          \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                               Part 2: Gridlock                                                     \n" +
   "                         How can we support these uses?                                             \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   " - Main idea: permit the document to be split into re-sizable cells                                 \n" +
   "    - We name the cell boundaries 'guides'                                                          \n" +
   "    - Behavior: Text on one side of a guide generally stays there                                   \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                 Example: Rename for_each_cpu -> for_each_cpu_in_pool                               \n" +
   "                                                                                                    \n" +
   "#define for_each_cpu(pool, cpu)                       \\\\                                            \n" +
   "        for ((pool) = &per_cpu(pools, cpu)[0];        \\\\                                            \n" +
   "             (pool) < &per_cpu(pools, cpu)[NR_POOLS]; \\\\                                            \n" +
   "             (pool)++)                                                                              \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                            Example: Disable Guides                                                 \n" +
   "                                                                                                    \n" +
   "# Task: align the comments                                                                          \n" +
   "                                                                                                    \n" +
   "fovfl_ovfl_on:                                                                                      \n" +
   "    fmovm.x    &0x40,FP_SRC(%a6)       # save EXOP (fp1) to stack                                   \n" +
   "    mov.w      &0xe005,2+FP_SRC(%a6)   # save exc status                                            \n" +
   "    fmovm.x    EXC_FPREGS(%a6),&0xc0   # restore fp0-fp1                                            \n" +
   "    fmovm.l    USER_FPCR(%a6),%fpcr,%fpsr,%fpiar # restore ctrl regs                                \n" +
   "    movm.l     EXC_DREGS(%a6),&0x0303          # restore d0-d1/a0-a1                                \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                          Example: Manipulating Tables                                              \n" +
   "                                                                                                    \n" +
   "% Task 1: Add a column for whitespace sensitivity.                                                  \n" +
   "% Task 2: Add a new row for Rust (using fill-characters for delimiters).                            \n" +
   "                                                                                                    \n" +
   " \\begin{table}[]                                                                                    \n" +
   "   \\centering                                                                                       \n" +
   "   \\begin{tabular}{|l|l|}                                                                           \n" +
   "     Language   & Types   \\\\ \\hline                                                                 \n" +
   "     Python     & Sort-of \\\\                                                                        \n" +
   "     JavaScript & No      \\\\                                                                        \n" +
   "     Haskell    & Yes     \\\\                                                                        \n" +
   "   \\end{tabular}                                                                                    \n" +
   " \\end{table}                                                                                        \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                             Thank you! Questions?                                                  \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" +
   "                                                                                                    \n" )
};
