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
};
